import { detectAgent, type AgentMeta } from "./agents";

export type SheetRef = { spreadsheetId: string; gid?: string };

export type LinkRef = { url: string; agent: AgentMeta };

export type ParsedItem = {
  name: string;
  imageUrl?: string;
  prices?: string;
  review?: string;
  notes?: string;
  links: LinkRef[];
};

export type ParsedSheet = {
  title: string;
  sheetTitle: string;
  items: ParsedItem[];
};

const SHEET_ID_RE = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/;
const GID_RE = /[?#&]gid=(\d+)/;

export function parseSheetUrl(input: string): SheetRef | null {
  const trimmed = input.trim();
  const idMatch = trimmed.match(SHEET_ID_RE);
  if (!idMatch) return null;
  const gidMatch = trimmed.match(GID_RE);
  return { spreadsheetId: idMatch[1], gid: gidMatch?.[1] };
}

type SheetsApiCell = {
  formattedValue?: string;
  hyperlink?: string;
  effectiveValue?: { stringValue?: string };
};

type SheetsApiResponse = {
  properties?: { title?: string };
  sheets?: Array<{
    properties?: { sheetId?: number; title?: string };
    data?: Array<{ rowData?: Array<{ values?: SheetsApiCell[] }> }>;
  }>;
  error?: { message?: string };
};

export async function fetchSheet(ref: SheetRef): Promise<ParsedSheet> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GOOGLE_API_KEY is not set on the server. Add it in your Vercel project's environment variables."
    );
  }

  const url = new URL(`https://sheets.googleapis.com/v4/spreadsheets/${ref.spreadsheetId}`);
  url.searchParams.set("includeGridData", "true");
  url.searchParams.set(
    "fields",
    "properties.title,sheets.properties,sheets.data.rowData.values.formattedValue,sheets.data.rowData.values.hyperlink,sheets.data.rowData.values.effectiveValue"
  );
  url.searchParams.set("key", apiKey);

  const res = await fetch(url.toString(), { cache: "no-store" });
  const json = (await res.json()) as SheetsApiResponse;
  if (!res.ok) {
    const msg = json?.error?.message ?? `Sheets API error (${res.status})`;
    if (/permission|caller does not have permission/i.test(msg)) {
      throw new Error(
        "We couldn't read that sheet. Open it in Google Sheets → Share → set access to \"Anyone with the link can view\", then try again."
      );
    }
    if (/api key not valid|api_key/i.test(msg)) {
      throw new Error("Server's Google API key is invalid or doesn't have the Sheets API enabled.");
    }
    throw new Error(msg);
  }

  const sheet = pickSheet(json, ref.gid);
  if (!sheet) throw new Error("Could not find that tab in the spreadsheet.");

  const grid: SheetsApiCell[][] = (sheet.data?.[0]?.rowData ?? []).map((r) => r.values ?? []);
  const items = extractItems(grid);

  return {
    title: json.properties?.title ?? "Untitled spreadsheet",
    sheetTitle: sheet.properties?.title ?? "Sheet",
    items,
  };
}

function pickSheet(json: SheetsApiResponse, gid?: string) {
  const sheets = json.sheets ?? [];
  if (gid) {
    const found = sheets.find((s) => String(s.properties?.sheetId ?? "") === gid);
    if (found) return found;
  }
  return sheets[0];
}

// ─────────────────────────────────────────────────────────────────────────────
// Extraction
// ─────────────────────────────────────────────────────────────────────────────

type ColMap = {
  name?: number;
  image?: number;
  link?: number[];
  price?: number;
  review?: number;
  notes?: number;
};

const HEADER_PATTERNS: Array<{ re: RegExp; key: keyof ColMap }> = [
  { re: /^(item|product|brand|name|title)s?$/i, key: "name" },
  { re: /^(photo|image|pic(ture)?)s?$/i, key: "image" },
  { re: /(link|url|agent|joya|sugar|cssbuy|panda|super|wegobuy|kakobuy|hoobuy|ootd|weidian|taobao|1688)/i, key: "link" },
  { re: /^(price|prices|cost|usd|cny)$/i, key: "price" },
  { re: /^(review|quality|rating|qc|score)/i, key: "review" },
  { re: /^(note|notes|comment|description|info)s?$/i, key: "notes" },
];

function findHeader(grid: SheetsApiCell[][]): { rowIdx: number; map: ColMap } | null {
  // scan first 20 rows for the row that looks most like a header
  let best: { rowIdx: number; map: ColMap; score: number } | null = null;
  const limit = Math.min(grid.length, 20);
  for (let i = 0; i < limit; i++) {
    const row = grid[i];
    if (!row) continue;
    const map: ColMap = {};
    let score = 0;
    for (let c = 0; c < row.length; c++) {
      const text = (row[c]?.formattedValue ?? "").trim();
      if (!text) continue;
      // headers are short labels, no embedded newlines, no URLs
      if (text.length > 30 || /\n/.test(text) || /^https?:/i.test(text)) continue;
      for (const { re, key } of HEADER_PATTERNS) {
        if (!re.test(text)) continue;
        if (key === "link") {
          (map.link ??= []).push(c);
        } else if (map[key] === undefined) {
          // safe: key here is one of the non-"link" keys (name | image | price | review | notes)
          (map as Record<Exclude<keyof ColMap, "link">, number>)[
            key as Exclude<keyof ColMap, "link">
          ] = c;
        }
        score += 1;
        break;
      }
    }
    if (score >= 2 && (!best || score > best.score)) {
      best = { rowIdx: i, map, score };
    }
  }
  return best ? { rowIdx: best.rowIdx, map: best.map } : null;
}

function extractItems(grid: SheetsApiCell[][]): ParsedItem[] {
  const header = findHeader(grid);
  const items: ParsedItem[] = [];
  const startRow = header ? header.rowIdx + 1 : 0;

  for (let r = startRow; r < grid.length; r++) {
    const row = grid[r];
    if (!row || row.length === 0) continue;

    const item = header ? extractWithHeader(row, header.map) : extractHeuristic(row);
    if (item) items.push(item);
  }

  return items;
}

function extractWithHeader(row: SheetsApiCell[], map: ColMap): ParsedItem | null {
  const links: LinkRef[] = [];
  const seen = new Set<string>();

  // links: prefer mapped link columns, but also accept any hyperlinked cell
  // (some sheets put the agent link in an unlabeled column)
  const linkCols = new Set(map.link ?? []);
  for (let c = 0; c < row.length; c++) {
    const href = row[c]?.hyperlink;
    if (!href) continue;
    if (!isHttp(href)) continue;
    if (isImageUrl(href)) continue;
    // de-prioritize cells that are clearly the wrong column (e.g., a name column with a URL)
    if (map.name !== undefined && c === map.name && !linkCols.has(c)) continue;
    if (seen.has(href)) continue;
    seen.add(href);
    links.push({ url: href, agent: detectAgent(href) });
  }

  if (links.length === 0) return null;

  const cellText = (i?: number) => (i === undefined ? "" : (row[i]?.formattedValue ?? "").trim());

  let name = cellText(map.name);
  // if name col is blank or just "LINK", fall back to first non-link non-numeric cell
  if (!name || name.toUpperCase() === "LINK") {
    const fallback = row.find((c, i) => {
      if (linkCols.has(i)) return false;
      const t = (c?.formattedValue ?? "").trim();
      return !!t && t.toUpperCase() !== "LINK" && !/^https?:/i.test(t) && !/^\d+(\.\d+)?$/.test(t);
    });
    name = (fallback?.formattedValue ?? "").trim();
  }
  if (!isLikelyItemName(name)) return null;

  // image: first image-y hyperlink anywhere in the row
  let imageUrl: string | undefined;
  for (const c of row) {
    const h = c?.hyperlink;
    if (h && isImageUrl(h)) { imageUrl = h; break; }
  }

  const prices = cellText(map.price) || pickByKeyword(row, /(usd|cny|￥|\$|€|£)/i, [map.name]);
  const review = cellText(map.review) || pickByKeyword(row, /(quality|accuracy|\d\s*\/\s*10)/i, [map.name, map.price]);
  const notes = cellText(map.notes) || undefined;

  // Drop rows that look like nav/tutorial entries: no price, no review,
  // and no link to a known shopping agent or marketplace.
  const hasShoppingLink = links.some(
    (l) => l.agent.kind === "agent" || l.agent.kind === "marketplace"
  );
  if (!prices && !review && !hasShoppingLink) return null;

  return {
    name: cleanName(name),
    imageUrl,
    prices: prices || undefined,
    review: review || undefined,
    notes,
    links,
  };
}

function extractHeuristic(row: SheetsApiCell[]): ParsedItem | null {
  const links: LinkRef[] = [];
  const seen = new Set<string>();
  let imageUrl: string | undefined;

  for (const cell of row) {
    const href = cell?.hyperlink;
    if (!href) continue;
    if (isImageUrl(href)) {
      if (!imageUrl) imageUrl = href;
      continue;
    }
    if (!isHttp(href)) continue;
    if (seen.has(href)) continue;
    seen.add(href);
    links.push({ url: href, agent: detectAgent(href) });
  }

  if (links.length === 0) return null;

  // Drop "navigation" rows: only links present are social/non-shopping
  const shoppingLinks = links.filter((l) => l.agent.kind !== "social" && l.agent.kind !== "other");
  if (shoppingLinks.length === 0) return null;

  const texts = row.map((c) => (c?.formattedValue ?? "").trim());
  const name = pickName(texts);
  if (!isLikelyItemName(name)) return null;

  const prices = pickByKeyword(row, /(usd|cny|￥|\$|€|£)/i);
  const review = pickByKeyword(row, /(quality|accuracy|\d\s*\/\s*10)/i, []);
  const notes = pickLongest(texts, [name, prices, review]);

  return { name: cleanName(name), imageUrl, prices, review, notes, links };
}

function isHttp(s: string) {
  return /^https?:\/\//i.test(s);
}

function isImageUrl(s: string) {
  return (
    /\.(png|jpe?g|webp|gif|avif)(\?|$)/i.test(s) ||
    /(googleusercontent|imgur|imgbb|ibb\.co|i\.redd|cloudinary|gstatic\.com\/.+\/img)/i.test(s)
  );
}

const BANNER_RE = /^(quick find|tutorial|hall of finds|table of contents|how to|step \d|legend|key|index|category|categories|navigation|menu|contents|new items|coming soon|sale|giveaway|discord|telegram|join|follow|subscribe|read me|important|notice|warning|disclaimer|free \$|click here|to (remove|use|find|disable|enable|search|access|view|see|open|get)\b|inspect element|press ctrl|right click|copy and paste)/i;

function isLikelyItemName(name: string): boolean {
  if (!name) return false;
  const trimmed = name.trim();
  if (trimmed.length < 3) return false;
  if (trimmed.length > 120) return false;
  if (BANNER_RE.test(trimmed)) return false;
  // pure numbers, or single-character labels
  if (/^\d+(\.\d+)?$/.test(trimmed)) return false;
  // looks like a section divider: only one "word", all caps, very short, e.g. "TUTORIAL"
  if (trimmed === trimmed.toUpperCase() && trimmed.length < 12 && !/\d/.test(trimmed)) return false;
  // Looks like a URL
  if (/^https?:\/\//i.test(trimmed)) return false;
  // Has price keywords as primary content (e.g. "USD 11.80, CNY 72")
  if (/^(usd|cny|￥|\$|€|£)\s*\d/i.test(trimmed)) return false;
  return true;
}

function cleanName(name: string): string {
  return name
    .replace(/\s+/g, " ")
    .replace(/^[-•·*]+\s*/, "")
    .trim();
}

function pickName(texts: string[]): string {
  const candidates = texts
    .map((t, i) => ({ t, i }))
    .filter(({ t }) => Boolean(t))
    .filter(({ t }) => t.toUpperCase() !== "LINK")
    .filter(({ t }) => !/^https?:\/\//i.test(t))
    .map(({ t, i }) => ({ t, i, score: scoreName(t, i) }))
    .sort((a, b) => b.score - a.score);
  return candidates[0]?.t ?? "";
}

function scoreName(t: string, idx: number): number {
  let s = 0;
  if (idx === 0) s += 3; // first column wins ties
  if (/[a-z]/.test(t)) s += 1;
  if (/[A-Z]/.test(t)) s += 1;
  if (t.length >= 4 && t.length <= 60) s += 2;
  if (/\n/.test(t)) s += 1; // multi-line names common in product sheets
  if (/(usd|cny|￥|\$|quality|accuracy|\d\s*\/\s*10)/i.test(t)) s -= 4;
  if (/^\d+(\.\d+)?$/.test(t)) s -= 5;
  if (BANNER_RE.test(t)) s -= 6;
  return s;
}

function pickByKeyword(
  row: SheetsApiCell[],
  re: RegExp,
  excludeIdx: Array<number | undefined> = []
): string | undefined {
  const ex = new Set(excludeIdx.filter((x): x is number => typeof x === "number"));
  for (let i = 0; i < row.length; i++) {
    if (ex.has(i)) continue;
    const t = (row[i]?.formattedValue ?? "").trim();
    if (t && re.test(t)) return t;
  }
  return undefined;
}

function pickLongest(texts: string[], exclude: Array<string | undefined>): string | undefined {
  const ex = new Set(exclude.filter(Boolean) as string[]);
  const left = texts.filter(
    (t) => t && !ex.has(t) && t.toUpperCase() !== "LINK" && !/^https?:\/\//i.test(t)
  );
  if (left.length === 0) return undefined;
  left.sort((a, b) => b.length - a.length);
  return left[0];
}

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
  userEnteredFormat?: { backgroundColor?: { red?: number; green?: number; blue?: number } };
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
    throw new Error("GOOGLE_API_KEY is not set on the server.");
  }

  const url = new URL(`https://sheets.googleapis.com/v4/spreadsheets/${ref.spreadsheetId}`);
  url.searchParams.set("includeGridData", "true");
  url.searchParams.set("fields", "properties.title,sheets.properties,sheets.data.rowData.values.formattedValue,sheets.data.rowData.values.hyperlink,sheets.data.rowData.values.effectiveValue");
  url.searchParams.set("key", apiKey);

  const res = await fetch(url.toString(), { cache: "no-store" });
  const json = (await res.json()) as SheetsApiResponse;
  if (!res.ok) {
    throw new Error(json?.error?.message || `Sheets API error (${res.status})`);
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

function extractItems(grid: SheetsApiCell[][]): ParsedItem[] {
  const items: ParsedItem[] = [];

  for (const row of grid) {
    if (!row || row.length === 0) continue;

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

    if (links.length === 0) continue;

    const texts = row.map((c) => (c?.formattedValue ?? "").trim());
    const name = pickName(texts);
    if (!name) continue;

    const prices = pickByKeyword(texts, /(usd|cny|￥|\$|€|£|price)/i);
    const review = pickByKeyword(texts, /(quality|accuracy|review|rating|\d\s*\/\s*10)/i);
    const notes = pickLongest(texts, [name, prices, review]);

    items.push({ name, imageUrl, prices, review, notes, links });
  }

  return items;
}

function isHttp(s: string) {
  return /^https?:\/\//i.test(s);
}

function isImageUrl(s: string) {
  return /\.(png|jpe?g|webp|gif|avif)(\?|$)/i.test(s) || /(googleusercontent|imgur|imgbb|ibb\.co|i\.redd|cloudinary)/i.test(s);
}

function pickName(texts: string[]): string {
  const candidates = texts
    .filter(Boolean)
    .filter((t) => t.toUpperCase() !== "LINK")
    .filter((t) => !/^https?:\/\//i.test(t));
  if (candidates.length === 0) return "";
  candidates.sort((a, b) => scoreName(b) - scoreName(a));
  return candidates[0];
}

function scoreName(t: string): number {
  let s = 0;
  if (/[a-z]/i.test(t)) s += 1;
  if (t.length > 3 && t.length < 60) s += 2;
  if (/(usd|cny|￥|\$|quality|accuracy|\d\s*\/\s*10)/i.test(t)) s -= 4;
  if (/^\d+(\.\d+)?$/.test(t)) s -= 3;
  return s;
}

function pickByKeyword(texts: string[], re: RegExp): string | undefined {
  return texts.find((t) => t && re.test(t));
}

function pickLongest(texts: string[], exclude: Array<string | undefined>): string | undefined {
  const ex = new Set(exclude.filter(Boolean) as string[]);
  const left = texts.filter((t) => t && !ex.has(t) && t.toUpperCase() !== "LINK" && !/^https?:\/\//i.test(t));
  if (left.length === 0) return undefined;
  left.sort((a, b) => b.length - a.length);
  return left[0];
}

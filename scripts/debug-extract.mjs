// Debug a sheet's extraction. Usage:
//   set -a; source .env.local; set +a
//   npx tsx scripts/debug-extract.mjs '<sheet-url>'
//
// Prints item count, agent breakdown, and sampled rows.

import { fetchSheet, parseSheetUrl } from "../lib/sheets.ts";

const url = process.argv[2];
if (!url) {
  console.error("usage: npx tsx scripts/debug-extract.mjs <sheet-url>");
  process.exit(1);
}

const ref = parseSheetUrl(url);
if (!ref) {
  console.error("not a valid Google Sheets URL");
  process.exit(1);
}

const data = await fetchSheet(ref);
console.log(`Title:  ${data.title}  /  ${data.sheetTitle}`);
console.log(`Items:  ${data.items.length}`);
const totalLinks = data.items.reduce((n, it) => n + it.links.length, 0);
console.log(`Links:  ${totalLinks}`);

const agentCounts = new Map();
for (const it of data.items) for (const l of it.links) {
  agentCounts.set(l.agent.label, (agentCounts.get(l.agent.label) ?? 0) + 1);
}
console.log("\nAgents:");
for (const [k, v] of [...agentCounts.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k.padEnd(14)} ${v}`);
}

const sample = (n) => {
  const idx = [
    ...Array.from({ length: 5 }, (_, i) => i),
    Math.floor(data.items.length / 2),
    data.items.length - 3,
    data.items.length - 2,
    data.items.length - 1,
  ].filter((i) => i < data.items.length);
  return [...new Set(idx)];
};

console.log("\nSamples:");
for (const i of sample()) {
  const it = data.items[i];
  if (!it) continue;
  console.log(
    `[${String(i).padStart(4)}] ${(it.name ?? "").replace(/\n/g, " / ").slice(0, 60)}`
      + ` | $: ${(it.prices ?? "—").slice(0, 25)}`
      + ` | rev: ${(it.review ?? "—").replace(/\n/g, " / ").slice(0, 25)}`
      + ` | [${it.links.map((l) => l.agent.label).join(", ")}]`
  );
}

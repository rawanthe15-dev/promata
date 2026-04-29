export type AgentKey =
  | "joyagoo"
  | "joyabuy"
  | "mulebuy"
  | "oopbuy"
  | "litbuy"
  | "cnfans"
  | "itaobuy"
  | "sugargoo"
  | "cssbuy"
  | "superbuy"
  | "pandabuy"
  | "wegobuy"
  | "hagobuy"
  | "kakobuy"
  | "hoobuy"
  | "ootdbuy"
  | "basetao"
  | "allchinabuy"
  | "lovegobuy"
  | "ezbuycn"
  | "weidian"
  | "taobao"
  | "tmall"
  | "1688"
  | "alibaba"
  | "dewu"
  | "poizon"
  | "jd"
  | "pinduoduo"
  | "xianyu"
  | "yupoo"
  | "other";

export type AgentMeta = {
  key: AgentKey;
  label: string;
  kind: "agent" | "marketplace" | "social" | "other";
  color: string;
};

const AGENTS: Record<AgentKey, AgentMeta> = {
  joyagoo:     { key: "joyagoo",     label: "Joyagoo",     kind: "agent",       color: "#ff7a59" },
  joyabuy:     { key: "joyabuy",     label: "Joyabuy",     kind: "agent",       color: "#ff5722" },
  mulebuy:     { key: "mulebuy",     label: "Mulebuy",     kind: "agent",       color: "#8b5cf6" },
  oopbuy:      { key: "oopbuy",      label: "Oopbuy",      kind: "agent",       color: "#3b82f6" },
  litbuy:      { key: "litbuy",      label: "Litbuy",      kind: "agent",       color: "#14b8a6" },
  cnfans:      { key: "cnfans",      label: "CNFans",      kind: "agent",       color: "#0f172a" },
  itaobuy:     { key: "itaobuy",     label: "ITaobuy",     kind: "agent",       color: "#84cc16" },
  sugargoo:    { key: "sugargoo",    label: "Sugargoo",    kind: "agent",       color: "#f5b342" },
  cssbuy:      { key: "cssbuy",      label: "CSSBuy",      kind: "agent",       color: "#1f2937" },
  superbuy:    { key: "superbuy",    label: "Superbuy",    kind: "agent",       color: "#e11d48" },
  pandabuy:    { key: "pandabuy",    label: "Pandabuy",    kind: "agent",       color: "#0ea5e9" },
  wegobuy:     { key: "wegobuy",     label: "Wegobuy",     kind: "agent",       color: "#2563eb" },
  hagobuy:     { key: "hagobuy",     label: "Hagobuy",     kind: "agent",       color: "#7c3aed" },
  kakobuy:     { key: "kakobuy",     label: "Kakobuy",     kind: "agent",       color: "#10b981" },
  hoobuy:      { key: "hoobuy",      label: "Hoobuy",      kind: "agent",       color: "#06b6d4" },
  ootdbuy:     { key: "ootdbuy",     label: "OOTDbuy",     kind: "agent",       color: "#a855f7" },
  basetao:     { key: "basetao",     label: "BaseTao",     kind: "agent",       color: "#ef4444" },
  allchinabuy: { key: "allchinabuy", label: "AllChinaBuy", kind: "agent",       color: "#f97316" },
  lovegobuy:   { key: "lovegobuy",   label: "LoveGoBuy",   kind: "agent",       color: "#ec4899" },
  ezbuycn:     { key: "ezbuycn",     label: "EZBuyCN",     kind: "agent",       color: "#22c55e" },
  weidian:     { key: "weidian",     label: "Weidian",     kind: "marketplace", color: "#dc2626" },
  taobao:      { key: "taobao",      label: "Taobao",      kind: "marketplace", color: "#ff4400" },
  tmall:       { key: "tmall",       label: "Tmall",       kind: "marketplace", color: "#dc2626" },
  "1688":      { key: "1688",        label: "1688",        kind: "marketplace", color: "#ff7300" },
  alibaba:     { key: "alibaba",     label: "Alibaba",     kind: "marketplace", color: "#ff6a00" },
  dewu:        { key: "dewu",        label: "Dewu",        kind: "marketplace", color: "#000000" },
  poizon:      { key: "poizon",      label: "Poizon",      kind: "marketplace", color: "#000000" },
  jd:          { key: "jd",          label: "JD.com",      kind: "marketplace", color: "#e1251b" },
  pinduoduo:   { key: "pinduoduo",   label: "Pinduoduo",   kind: "marketplace", color: "#e02020" },
  xianyu:      { key: "xianyu",      label: "Xianyu",      kind: "marketplace", color: "#fcd34d" },
  yupoo:       { key: "yupoo",       label: "Yupoo",       kind: "social",      color: "#1f2937" },
  other:       { key: "other",       label: "Link",        kind: "other",       color: "#6b7280" },
};

const HOST_RULES: Array<[RegExp, AgentKey]> = [
  [/(^|\.)joyagoo\./i, "joyagoo"],
  [/(^|\.)joyabuy\./i, "joyabuy"],
  [/(^|\.)mulebuy\./i, "mulebuy"],
  [/(^|\.)oopbuy\./i, "oopbuy"],
  [/(^|\.)litbuy\./i, "litbuy"],
  [/(^|\.)cnfans\./i, "cnfans"],
  [/(^|\.)itaobuy\./i, "itaobuy"],
  [/(^|\.)sugargoo\./i, "sugargoo"],
  [/(^|\.)cssbuy\./i, "cssbuy"],
  [/(^|\.)superbuy\./i, "superbuy"],
  [/(^|\.)pandabuy\./i, "pandabuy"],
  [/(^|\.)wegobuy\./i, "wegobuy"],
  [/(^|\.)hagobuy\./i, "hagobuy"],
  [/(^|\.)kakobuy\./i, "kakobuy"],
  [/(^|\.)hoobuy\./i, "hoobuy"],
  [/(^|\.)ootdbuy\./i, "ootdbuy"],
  [/(^|\.)basetao\./i, "basetao"],
  [/(^|\.)allchinabuy\./i, "allchinabuy"],
  [/(^|\.)lovegobuy\./i, "lovegobuy"],
  [/(^|\.)ezbuycn\./i, "ezbuycn"],
  [/(^|\.)weidian\.com/i, "weidian"],
  [/(^|\.)taobao\.com/i, "taobao"],
  [/(^|\.)tmall\.com/i, "tmall"],
  [/(^|\.)1688\.com/i, "1688"],
  [/(^|\.)alibaba\.com/i, "alibaba"],
  [/(^|\.)dewu\.com/i, "dewu"],
  [/(^|\.)poizon\./i, "poizon"],
  [/(^|\.)jd\.com/i, "jd"],
  [/(^|\.)pinduoduo\./i, "pinduoduo"],
  [/(^|\.)goofish\.com/i, "xianyu"],
  [/(^|\.)xianyu\./i, "xianyu"],
  [/(^|\.)yupoo\./i, "yupoo"],
];

export function detectAgent(url: string): AgentMeta {
  let host = "";
  try { host = new URL(url).hostname; } catch { return AGENTS.other; }
  for (const [re, key] of HOST_RULES) if (re.test(host)) return AGENTS[key];
  return AGENTS.other;
}

export function getAgentMeta(key: AgentKey): AgentMeta {
  return AGENTS[key] ?? AGENTS.other;
}

export const ALL_AGENTS = AGENTS;

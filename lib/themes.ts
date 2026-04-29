export type Theme = {
  name: string;
  label: string;
  bg: string;
  fg: string;
  muted: string;
  card: string;
  border: string;
  accent: string;
  gradientFrom: string;
  gradientVia: string;
  gradientTo: string;
};

export const THEMES: Record<string, Theme> = {
  default: {
    name: "default",
    label: "Default",
    bg: "#fafaf9",
    fg: "#0a0a0a",
    muted: "#6b7280",
    card: "#ffffff",
    border: "#e7e5e4",
    accent: "#ec4899",
    gradientFrom: "#f9a8d4", // pink-300
    gradientVia: "#fb7185",  // rose-400
    gradientTo: "#fdba74",   // orange-300
  },
  midnight: {
    name: "midnight",
    label: "Midnight",
    bg: "#0b1220",
    fg: "#f5f7fb",
    muted: "#94a3b8",
    card: "#111a2e",
    border: "#1e293b",
    accent: "#22d3ee",
    gradientFrom: "#0ea5e9",
    gradientVia: "#22d3ee",
    gradientTo: "#67e8f9",
  },
  sunset: {
    name: "sunset",
    label: "Sunset",
    bg: "#fdf6ec",
    fg: "#3b2412",
    muted: "#8a6a4f",
    card: "#fffaf2",
    border: "#ecdcc4",
    accent: "#dc2626",
    gradientFrom: "#fdba74",
    gradientVia: "#fb923c",
    gradientTo: "#dc2626",
  },
  mono: {
    name: "mono",
    label: "Mono",
    bg: "#ffffff",
    fg: "#0a0a0a",
    muted: "#737373",
    card: "#ffffff",
    border: "#e5e5e5",
    accent: "#404040",
    gradientFrom: "#e5e5e5",
    gradientVia: "#a3a3a3",
    gradientTo: "#404040",
  },
};

export function getTheme(name: string | null | undefined): Theme {
  if (!name) return THEMES.default;
  return THEMES[name] ?? THEMES.default;
}

export const THEME_LIST: Theme[] = [
  THEMES.default,
  THEMES.midnight,
  THEMES.sunset,
  THEMES.mono,
];

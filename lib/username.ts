const RESERVED = new Set([
  "api", "claim", "preview", "edit", "admin", "settings", "login", "signup",
  "signin", "logout", "auth", "about", "terms", "privacy", "help", "support",
  "dashboard", "home", "index", "static", "public", "assets", "_next", "favicon",
  "robots", "sitemap", "vercel", "promata",
]);

export function normalizeUsername(input: string): string {
  return input.trim().toLowerCase().replace(/^@/, "");
}

export function validateUsername(input: string): { ok: true; value: string } | { ok: false; reason: string } {
  const value = normalizeUsername(input);
  if (!value) return { ok: false, reason: "Pick a username." };
  if (value.length < 3) return { ok: false, reason: "Too short — at least 3 characters." };
  if (value.length > 24) return { ok: false, reason: "Too long — keep it under 24 characters." };
  if (!/^[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?$/.test(value)) {
    return { ok: false, reason: "Letters, numbers, _ and - only. Must start and end with a letter or number." };
  }
  if (RESERVED.has(value)) return { ok: false, reason: "That username is reserved." };
  return { ok: true, value };
}

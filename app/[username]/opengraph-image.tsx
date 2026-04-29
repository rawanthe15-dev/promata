import { ImageResponse } from "next/og";
import { loadPageByUsername } from "./_load";
import { getTheme } from "@/lib/themes";

export const runtime = "nodejs";
export const alt = "promata profile";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage({
  params,
}: {
  params: { username: string };
}) {
  const { username } = params;
  const page = await loadPageByUsername(username).catch(() => null);
  const theme = getTheme(page?.theme ?? null);

  const displayName = page?.displayName ?? `@${username}`;
  const bio = page?.bio ?? "";
  const items = page?.data?.items ?? [];
  const hidden = new Set((page?.hiddenItems ?? []) as number[]);
  const visibleItems = items.filter((_, i) => !hidden.has(i));
  const itemCount = visibleItems.length;
  const linkCount = visibleItems.reduce((n, it) => n + it.links.length, 0);

  // Top 3 most-frequent agents
  const agentCounts = new Map<string, { count: number; color: string; label: string }>();
  for (const it of visibleItems) {
    for (const l of it.links) {
      const prev = agentCounts.get(l.agent.label);
      if (prev) prev.count += 1;
      else agentCounts.set(l.agent.label, { count: 1, color: l.agent.color, label: l.agent.label });
    }
  }
  const topAgents = [...agentCounts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: 80,
          fontFamily: "system-ui",
          backgroundColor: theme.bg,
          color: theme.fg,
          backgroundImage: `linear-gradient(135deg, ${theme.gradientFrom}, ${theme.gradientVia}, ${theme.gradientTo})`,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            background: theme.card,
            borderRadius: 48,
            padding: 64,
            boxShadow: "0 30px 80px rgba(0,0,0,0.12)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 999,
                  backgroundImage: `linear-gradient(135deg, ${theme.gradientFrom}, ${theme.gradientVia}, ${theme.gradientTo})`,
                }}
              />
              <div style={{ fontSize: 28, fontWeight: 600, color: theme.muted, display: "flex" }}>
                promata<span style={{ color: theme.accent }}>.</span>
              </div>
            </div>
            <div style={{ fontSize: 24, color: theme.muted, display: "flex" }}>@{username}</div>
          </div>

          <div
            style={{
              marginTop: 56,
              fontSize: 96,
              fontWeight: 700,
              letterSpacing: "-0.04em",
              lineHeight: 1.05,
              color: theme.fg,
              display: "flex",
            }}
          >
            {truncate(displayName, 30)}
          </div>

          {bio ? (
            <div
              style={{
                marginTop: 20,
                fontSize: 32,
                color: theme.muted,
                lineHeight: 1.3,
                display: "flex",
              }}
            >
              {truncate(bio, 120)}
            </div>
          ) : null}

          <div style={{ flex: 1 }} />

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              {topAgents.map((a) => (
                <div
                  key={a.label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    background: a.color,
                    color: "#fff",
                    padding: "12px 22px",
                    borderRadius: 999,
                    fontSize: 26,
                    fontWeight: 600,
                  }}
                >
                  {a.label}
                  <span style={{ opacity: 0.75, fontWeight: 500 }}>·{a.count}</span>
                </div>
              ))}
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 16,
                fontSize: 28,
                color: theme.muted,
              }}
            >
              <span style={{ fontSize: 44, fontWeight: 700, color: theme.fg }}>{itemCount}</span>
              <span>items</span>
              <span style={{ opacity: 0.5 }}>·</span>
              <span style={{ fontSize: 44, fontWeight: 700, color: theme.fg }}>{linkCount}</span>
              <span>links</span>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1).trimEnd() + "…";
}

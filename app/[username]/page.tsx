import { notFound } from "next/navigation";
import Link from "next/link";
import { sql } from "drizzle-orm";
import type { Metadata } from "next";
import { headers, cookies } from "next/headers";
import { getDb, schema } from "@/lib/db";
import { fetchSheet, parseSheetUrl } from "@/lib/sheets";
import { loadPageByUsername } from "./_load";
import { getTheme } from "@/lib/themes";
import { generateQrSvg } from "@/lib/qr";
import { ShareButton } from "./share-button";
import { ThemeSwitcher } from "./theme-switcher";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const page = await loadPageByUsername(username).catch(() => null);
  if (!page) return { title: `@${username} — promata` };
  const title = `${page.displayName ?? `@${page.username}`} — promata`;
  const visibleCount =
    page.data.items.length -
    (((page.hiddenItems ?? []) as number[]).filter(
      (i) => i >= 0 && i < page.data.items.length
    ).length);
  return {
    title,
    description: page.bio ?? `${visibleCount} finds curated by @${page.username}`,
    openGraph: { title, description: page.bio ?? undefined, type: "profile" },
  };
}

async function refreshAction(formData: FormData) {
  "use server";
  const username = String(formData.get("username") ?? "");
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.pages)
    .where(sql`lower(${schema.pages.username}) = ${username.toLowerCase()}`)
    .limit(1);
  const page = rows[0];
  if (!page) return;

  const jar = await cookies();
  const ownerCookie = jar.get(`promata_owner_${page.username}`)?.value;
  if (ownerCookie !== page.ownerToken) return;

  const ref = parseSheetUrl(page.sheetUrl);
  if (!ref) return;
  const data = await fetchSheet(ref);
  await db
    .update(schema.pages)
    .set({ data, updatedAt: new Date() })
    .where(sql`${schema.pages.id} = ${page.id}`);
}

function buildPublicUrl(username: string, host: string | null, proto: string | null) {
  const scheme = proto ?? "https";
  const h = host ?? "promata.app";
  return `${scheme}://${h}/${username}`;
}

export default async function UserPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const page = await loadPageByUsername(username).catch(() => null);
  if (!page) notFound();

  const jar = await cookies();
  const isOwner = jar.get(`promata_owner_${page.username}`)?.value === page.ownerToken;

  const allItems = page.data.items;
  const hiddenSet = new Set<number>(((page.hiddenItems ?? []) as number[]));
  const items = allItems.filter((_, i) => !hiddenSet.has(i));
  const totalLinks = items.reduce((n, it) => n + it.links.length, 0);

  const theme = getTheme(page.theme ?? null);

  // Build public URL from request headers (works in dev + prod)
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  const publicUrl = buildPublicUrl(page.username, host, proto);

  const qrSvg = await generateQrSvg(publicUrl);

  const themeStyle = {
    "--bg": theme.bg,
    "--fg": theme.fg,
    "--muted": theme.muted,
    "--card": theme.card,
    "--border": theme.border,
    "--accent": theme.accent,
    background: theme.bg,
    color: theme.fg,
  } as React.CSSProperties;

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-5 pb-24" style={themeStyle}>
      <header className="flex items-center justify-between py-6">
        <Link
          href="/"
          className="text-sm font-semibold tracking-tight transition hover:opacity-80"
          style={{ color: "var(--muted)" }}
        >
          promata<span style={{ color: theme.accent }}>.</span>
        </Link>
        <div className="flex items-center gap-2">
          {isOwner ? (
            <>
              <ThemeSwitcher username={page.username} current={theme.name} />
              <Link href={`/${page.username}/edit`} className="btn btn-ghost text-xs">
                edit
              </Link>
              <form action={refreshAction}>
                <input type="hidden" name="username" value={page.username} />
                <button type="submit" className="btn btn-ghost text-xs">↻ refresh</button>
              </form>
            </>
          ) : null}
        </div>
      </header>

      <section className="text-center">
        <div className="mx-auto flex w-fit items-center gap-3">
          <div
            aria-hidden
            className="h-20 w-20 rounded-full border shadow-sm"
            style={{
              borderColor: theme.border,
              backgroundImage: `linear-gradient(135deg, ${theme.gradientFrom}, ${theme.gradientVia}, ${theme.gradientTo})`,
            }}
          />
          <ShareButton url={publicUrl} qrSvg={qrSvg} />
        </div>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">
          {page.displayName ?? `@${page.username}`}
        </h1>
        <p className="text-sm" style={{ color: "var(--muted)" }}>@{page.username}</p>
        {page.bio ? (
          <p className="mx-auto mt-3 max-w-md text-balance text-sm" style={{ color: "var(--muted)" }}>
            {page.bio}
          </p>
        ) : null}
        <p className="mt-3 text-xs" style={{ color: "var(--muted)", opacity: 0.7 }}>
          {items.length} items · {totalLinks} links
        </p>
      </section>

      <section className="mt-10 space-y-3">
        {items.length === 0 ? (
          <p className="card p-6 text-center text-sm" style={{ color: "var(--muted)" }}>
            No links found in that sheet yet.
          </p>
        ) : null}
        {items.map((it, i) => (
          <article key={i} className="card overflow-hidden">
            <div className="flex items-start gap-4 p-4">
              {it.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={it.imageUrl}
                  alt=""
                  className="h-20 w-20 shrink-0 rounded-2xl border object-cover"
                  style={{ borderColor: "var(--border)" }}
                />
              ) : (
                <div
                  className="h-20 w-20 shrink-0 rounded-2xl border"
                  style={{
                    borderColor: "var(--border)",
                    backgroundImage: `linear-gradient(135deg, ${theme.gradientFrom}33, ${theme.gradientTo}33)`,
                  }}
                />
              )}
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-semibold leading-tight">{it.name}</h3>
                {it.prices ? (
                  <p className="mt-0.5 text-xs" style={{ color: "var(--muted)" }}>
                    {it.prices.replace(/\s+/g, " ")}
                  </p>
                ) : null}
                {it.review ? (
                  <p className="mt-1 line-clamp-2 text-xs" style={{ color: "var(--muted)" }}>
                    {it.review}
                  </p>
                ) : null}
                {it.notes && it.notes !== it.review ? (
                  <p className="mt-1 line-clamp-2 text-xs" style={{ color: "var(--muted)", opacity: 0.7 }}>
                    {it.notes}
                  </p>
                ) : null}
              </div>
            </div>
            <div
              className="flex flex-wrap gap-2 border-t px-4 py-3"
              style={{ borderColor: "var(--border)" }}
            >
              {it.links.map((l, j) => (
                <a
                  key={j}
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-white transition hover:brightness-110 active:scale-95"
                  style={{ background: l.agent.color }}
                >
                  {l.agent.label}
                  <span aria-hidden>↗</span>
                </a>
              ))}
            </div>
          </article>
        ))}
      </section>

      <footer className="mt-16 text-center text-xs" style={{ color: "var(--muted)", opacity: 0.7 }}>
        made on <Link href="/" className="underline-offset-2 hover:underline">promata</Link>
      </footer>
    </main>
  );
}

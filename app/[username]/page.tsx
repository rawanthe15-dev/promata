import { notFound } from "next/navigation";
import Link from "next/link";
import { sql } from "drizzle-orm";
import type { Metadata } from "next";
import { getDb, schema } from "@/lib/db";
import { fetchSheet, parseSheetUrl } from "@/lib/sheets";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

async function loadPage(username: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.pages)
    .where(sql`lower(${schema.pages.username}) = ${username.toLowerCase()}`)
    .limit(1);
  return rows[0] ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const page = await loadPage(username).catch(() => null);
  if (!page) return { title: `@${username} — promata` };
  const title = `${page.displayName ?? `@${page.username}`} — promata`;
  return {
    title,
    description: page.bio ?? `${page.data.items.length} finds curated by @${page.username}`,
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

export default async function UserPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const page = await loadPage(username).catch(() => null);
  if (!page) notFound();

  const jar = await cookies();
  const isOwner = jar.get(`promata_owner_${page.username}`)?.value === page.ownerToken;
  const items = page.data.items;

  const totalLinks = items.reduce((n, it) => n + it.links.length, 0);

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-5 pb-24">
      <header className="flex items-center justify-between py-6">
        <Link href="/" className="text-sm font-semibold tracking-tight text-neutral-500 hover:text-neutral-900 dark:hover:text-white">
          promata<span className="text-pink-500">.</span>
        </Link>
        {isOwner ? (
          <form action={refreshAction}>
            <input type="hidden" name="username" value={page.username} />
            <button type="submit" className="btn btn-ghost text-xs">↻ refresh from sheet</button>
          </form>
        ) : null}
      </header>

      <section className="text-center">
        <div
          aria-hidden
          className="mx-auto h-20 w-20 rounded-full border bg-gradient-to-br from-pink-400 via-rose-400 to-orange-300 shadow-sm"
        />
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">
          {page.displayName ?? `@${page.username}`}
        </h1>
        <p className="text-sm text-neutral-500">@{page.username}</p>
        {page.bio ? <p className="mx-auto mt-3 max-w-md text-balance text-sm text-neutral-500">{page.bio}</p> : null}
        <p className="mt-3 text-xs text-neutral-400">
          {items.length} items · {totalLinks} links
        </p>
      </section>

      <section className="mt-10 space-y-3">
        {items.length === 0 ? (
          <p className="card p-6 text-center text-sm text-neutral-500">
            No links found in that sheet yet.
          </p>
        ) : null}
        {items.map((it, i) => (
          <article key={i} className="card overflow-hidden">
            <div className="flex items-start gap-4 p-4">
              {it.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={it.imageUrl} alt="" className="h-20 w-20 shrink-0 rounded-2xl border object-cover" />
              ) : (
                <div className="h-20 w-20 shrink-0 rounded-2xl border bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-900 dark:to-neutral-800" />
              )}
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-semibold leading-tight">{it.name}</h3>
                {it.prices ? (
                  <p className="mt-0.5 text-xs text-neutral-500">{it.prices.replace(/\s+/g, " ")}</p>
                ) : null}
                {it.review ? (
                  <p className="mt-1 line-clamp-2 text-xs text-neutral-500">{it.review}</p>
                ) : null}
                {it.notes && it.notes !== it.review ? (
                  <p className="mt-1 line-clamp-2 text-xs text-neutral-400">{it.notes}</p>
                ) : null}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 border-t px-4 py-3" style={{ borderColor: "var(--border)" }}>
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

      <footer className="mt-16 text-center text-xs text-neutral-400">
        made on <Link href="/" className="underline-offset-2 hover:underline">promata</Link>
      </footer>
    </main>
  );
}

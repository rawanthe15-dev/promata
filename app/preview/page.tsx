import Link from "next/link";
import { redirect } from "next/navigation";
import { parseSheetUrl, fetchSheet } from "@/lib/sheets";
import { getDb, schema } from "@/lib/db";
import { sql } from "drizzle-orm";
import { validateUsername } from "@/lib/username";
import { detectAgent } from "@/lib/agents";
import crypto from "node:crypto";
import { cookies } from "next/headers";

async function claimAction(formData: FormData) {
  "use server";
  const sheetUrl = String(formData.get("sheetUrl") ?? "");
  const usernameInput = String(formData.get("username") ?? "");
  const displayName = String(formData.get("displayName") ?? "").trim() || null;
  const bio = String(formData.get("bio") ?? "").trim() || null;

  const ref = parseSheetUrl(sheetUrl);
  if (!ref) {
    redirect(`/?error=${encodeURIComponent("Bad Sheets URL.")}`);
  }
  const v = validateUsername(usernameInput);
  if (!v.ok) {
    const params = new URLSearchParams({ url: sheetUrl, error: v.reason, username: usernameInput });
    redirect(`/preview?${params.toString()}`);
  }

  const data = await fetchSheet(ref!);

  const db = getDb();
  const taken = await db
    .select({ id: schema.pages.id })
    .from(schema.pages)
    .where(sql`lower(${schema.pages.username}) = ${v.value}`)
    .limit(1);
  if (taken.length > 0) {
    const params = new URLSearchParams({
      url: sheetUrl,
      error: `@${v.value} is already taken — try another.`,
      username: usernameInput,
    });
    redirect(`/preview?${params.toString()}`);
  }

  const ownerToken = crypto.randomBytes(24).toString("base64url");

  await db.insert(schema.pages).values({
    username: v.value,
    sheetUrl,
    spreadsheetId: ref!.spreadsheetId,
    gid: ref!.gid ?? null,
    ownerToken,
    displayName,
    bio,
    data,
  });

  const jar = await cookies();
  jar.set(`promata_owner_${v.value}`, ownerToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  redirect(`/${v.value}`);
}

export default async function Preview({
  searchParams,
}: {
  searchParams: Promise<{ url?: string; error?: string; username?: string }>;
}) {
  const sp = await searchParams;
  if (!sp.url) redirect("/");

  const ref = parseSheetUrl(sp.url!);
  if (!ref) {
    redirect(`/?error=${encodeURIComponent("Bad Sheets URL.")}`);
  }

  let data;
  let fetchError: string | null = null;
  try {
    data = await fetchSheet(ref!);
  } catch (err) {
    fetchError = err instanceof Error ? err.message : "Could not read that sheet.";
  }

  if (fetchError) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-20">
        <Link href="/" className="text-sm text-neutral-500 hover:underline">← back</Link>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight">Couldn&apos;t read that sheet</h1>
        <p className="mt-3 text-neutral-500">{fetchError}</p>
        <ul className="mt-6 space-y-2 text-sm text-neutral-500">
          <li>• Make sure sharing is set to <em>Anyone with the link can view</em>.</li>
          <li>• Confirm the URL is the full <code>docs.google.com/spreadsheets/d/...</code> link.</li>
          <li>• If you self-host, check <code>GOOGLE_API_KEY</code> is set with Sheets API enabled.</li>
        </ul>
      </main>
    );
  }

  const totalLinks = data!.items.reduce((n, it) => n + it.links.length, 0);
  const agentBreakdown = new Map<string, number>();
  for (const it of data!.items) for (const l of it.links) {
    agentBreakdown.set(l.agent.label, (agentBreakdown.get(l.agent.label) ?? 0) + 1);
  }

  return (
    <main className="mx-auto max-w-3xl px-6 pb-20">
      <header className="flex items-center justify-between py-8">
        <Link href="/" className="text-lg font-semibold tracking-tight">promata<span className="text-pink-500">.</span></Link>
        <span className="text-sm text-neutral-500">step 2 of 2</span>
      </header>

      <section className="card p-6">
        <p className="text-xs uppercase tracking-widest text-neutral-400">Found in your sheet</p>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-6 gap-y-1">
          <p className="text-3xl font-semibold tracking-tight">{data!.items.length} items</p>
          <p className="text-neutral-500">{totalLinks} total links</p>
        </div>
        <p className="mt-1 text-sm text-neutral-500">
          {data!.title} <span className="text-neutral-400">/ {data!.sheetTitle}</span>
        </p>

        {agentBreakdown.size > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {[...agentBreakdown.entries()].sort((a, b) => b[1] - a[1]).map(([label, n]) => (
              <span key={label} className="rounded-full border px-3 py-1 text-xs">
                {label} <span className="text-neutral-400">{n}</span>
              </span>
            ))}
          </div>
        ) : null}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 px-1 text-sm font-semibold uppercase tracking-widest text-neutral-400">
          Preview
        </h2>
        <ul className="space-y-2">
          {data!.items.slice(0, 8).map((it, i) => (
            <li key={i} className="card flex items-start gap-3 p-3">
              {it.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={it.imageUrl} alt="" className="h-14 w-14 shrink-0 rounded-xl border object-cover" />
              ) : (
                <div className="h-14 w-14 shrink-0 rounded-xl border bg-neutral-50 dark:bg-neutral-900" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{it.name}</p>
                {it.prices ? <p className="text-xs text-neutral-500">{it.prices.replace(/\s+/g, " ")}</p> : null}
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {it.links.map((l, j) => (
                    <span
                      key={j}
                      className="rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
                      style={{ background: l.agent.color }}
                    >
                      {l.agent.label}
                    </span>
                  ))}
                </div>
              </div>
            </li>
          ))}
          {data!.items.length > 8 ? (
            <li className="px-1 pt-1 text-xs text-neutral-400">+ {data!.items.length - 8} more</li>
          ) : null}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-2xl font-semibold tracking-tight">Claim your URL</h2>
        <form action={claimAction} className="card space-y-4 p-6">
          <input type="hidden" name="sheetUrl" value={sp.url} />

          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-widest text-neutral-400">Username</span>
            <div className="flex items-center gap-2 rounded-2xl border bg-white/70 px-4 py-3 dark:bg-neutral-900/70" style={{ borderColor: "var(--border)" }}>
              <span className="text-sm text-neutral-400">promata.app/</span>
              <input
                name="username"
                required
                defaultValue={sp.username ?? ""}
                placeholder="yourname"
                className="flex-1 bg-transparent text-sm outline-none"
                autoComplete="off"
                spellCheck={false}
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-widest text-neutral-400">Display name (optional)</span>
            <input name="displayName" placeholder="What should we call you?" className="input" />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-widest text-neutral-400">Bio (optional)</span>
            <textarea name="bio" rows={2} placeholder="One-liner for your page" className="input resize-none" />
          </label>

          {sp.error ? <p className="text-sm text-rose-500">{sp.error}</p> : null}

          <button type="submit" className="btn btn-primary w-full justify-center">
            Create my page
          </button>
        </form>
      </section>
    </main>
  );
}

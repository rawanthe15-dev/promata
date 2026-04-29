import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { loadPageByUsername } from "../_load";
import { saveProfileAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function EditPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const page = await loadPageByUsername(username).catch(() => null);
  if (!page) notFound();

  const jar = await cookies();
  const isOwner = jar.get(`promata_owner_${page.username}`)?.value === page.ownerToken;
  if (!isOwner) {
    redirect(`/${page.username}`);
  }

  const items = page.data.items;
  const hidden = new Set<number>(((page.hiddenItems ?? []) as number[]));

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-5 pb-24">
      <header className="flex items-center justify-between py-6">
        <Link
          href="/"
          className="text-sm font-semibold tracking-tight text-neutral-500 hover:text-neutral-900"
        >
          promata<span className="text-pink-500">.</span>
        </Link>
        <Link href={`/${page.username}`} className="btn btn-ghost text-xs">
          ← back to page
        </Link>
      </header>

      <section>
        <p className="text-xs uppercase tracking-widest text-neutral-400">Editing</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          @{page.username}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Tweak your profile and toggle which items are visible on your public page.
        </p>
      </section>

      <form action={saveProfileAction} className="mt-8 space-y-6">
        <input type="hidden" name="username" value={page.username} />

        <div className="card space-y-4 p-6">
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-widest text-neutral-400">
              Display name
            </span>
            <input
              name="displayName"
              defaultValue={page.displayName ?? ""}
              placeholder="What should we call you?"
              className="input"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-widest text-neutral-400">
              Bio
            </span>
            <textarea
              name="bio"
              rows={3}
              defaultValue={page.bio ?? ""}
              placeholder="One-liner for your page"
              className="input resize-none"
            />
          </label>
        </div>

        <div>
          <h2 className="mb-3 px-1 text-sm font-semibold uppercase tracking-widest text-neutral-400">
            Items ({items.length})
          </h2>
          {items.length === 0 ? (
            <p className="card p-6 text-center text-sm text-neutral-500">
              No items in this sheet yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {items.map((it, i) => {
                const isHidden = hidden.has(i);
                return (
                  <li key={i} className="card flex items-start gap-3 p-3">
                    <label className="mt-1 flex shrink-0 cursor-pointer items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        name="hidden"
                        value={i}
                        defaultChecked={isHidden}
                        className="h-4 w-4 cursor-pointer rounded border-neutral-300 accent-rose-500"
                      />
                      <span className="text-neutral-500">hide</span>
                    </label>
                    {it.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={it.imageUrl}
                        alt=""
                        className="h-14 w-14 shrink-0 rounded-xl border object-cover"
                      />
                    ) : (
                      <div className="h-14 w-14 shrink-0 rounded-xl border bg-neutral-50" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{it.name}</p>
                      {it.prices ? (
                        <p className="text-xs text-neutral-500">
                          {it.prices.replace(/\s+/g, " ")}
                        </p>
                      ) : null}
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
                );
              })}
            </ul>
          )}
        </div>

        <div className="sticky bottom-4 z-10 flex justify-end">
          <button type="submit" className="btn btn-primary shadow-lg">
            Save changes
          </button>
        </div>
      </form>
    </main>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { parseSheetUrl } from "@/lib/sheets";

async function startAction(formData: FormData) {
  "use server";
  const url = String(formData.get("sheetUrl") ?? "");
  const ref = parseSheetUrl(url);
  if (!ref) {
    redirect(`/?error=${encodeURIComponent("That doesn't look like a Google Sheets URL.")}`);
  }
  const params = new URLSearchParams({ url });
  redirect(`/preview?${params.toString()}`);
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col px-6">
      <header className="flex items-center justify-between py-8">
        <Link href="/" className="text-lg font-semibold tracking-tight">promata<span className="text-pink-500">.</span></Link>
        <a
          href="https://github.com"
          target="_blank"
          rel="noreferrer"
          className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
        >
          github
        </a>
      </header>

      <section className="flex flex-1 flex-col items-center justify-center py-12 text-center">
        <h1 className="text-balance text-5xl font-semibold tracking-tight sm:text-6xl">
          Your spreadsheet, <span className="bg-gradient-to-r from-pink-500 via-rose-500 to-orange-400 bg-clip-text text-transparent">as a website</span>.
        </h1>
        <p className="mt-5 max-w-xl text-balance text-base text-neutral-500 sm:text-lg">
          Paste a Google Sheets link of your finds. We extract every Weidian, Taobao, and shipping-agent
          link, you pick a username, and your page goes live at <span className="font-mono text-neutral-700 dark:text-neutral-300">promata.app/you</span>.
        </p>

        <form action={startAction} className="mt-10 w-full max-w-xl">
          <div className="card flex items-center gap-2 p-2 pl-4 shadow-sm">
            <input
              name="sheetUrl"
              required
              type="url"
              placeholder="https://docs.google.com/spreadsheets/d/..."
              className="flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-neutral-400"
            />
            <button type="submit" className="btn btn-primary">
              Extract <span aria-hidden>→</span>
            </button>
          </div>
          {sp.error ? <p className="mt-3 text-sm text-rose-500">{sp.error}</p> : null}
          <p className="mt-3 text-xs text-neutral-500">
            Sheet must be set to <em>Anyone with the link can view</em>.
          </p>
        </form>

        <ul className="mt-12 grid w-full max-w-xl grid-cols-1 gap-3 text-left text-sm text-neutral-500 sm:grid-cols-3">
          <li className="card px-4 py-3">
            <span className="font-mono text-xs text-neutral-400">01</span><br />
            Paste your sheet
          </li>
          <li className="card px-4 py-3">
            <span className="font-mono text-xs text-neutral-400">02</span><br />
            We grab every link
          </li>
          <li className="card px-4 py-3">
            <span className="font-mono text-xs text-neutral-400">03</span><br />
            Pick a username — done
          </li>
        </ul>
      </section>

      <footer className="py-8 text-center text-xs text-neutral-400">
        not affiliated with any agent. links go straight to the source.
      </footer>
    </main>
  );
}

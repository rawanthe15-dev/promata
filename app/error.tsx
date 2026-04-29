"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const message = error.message || "An unexpected error happened.";
  const isMissingEnv = /not set on the server|DATABASE_URL|GOOGLE_API_KEY/i.test(message);
  const isMissingTable = /relation .* does not exist|pages.*does not exist/i.test(message);

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-6 text-center">
      <div className="card w-full p-8">
        <p className="text-xs uppercase tracking-widest text-rose-500">Something broke</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{prettyTitle(error)}</h1>
        <p className="mt-3 text-sm text-neutral-500">{message}</p>

        {isMissingEnv ? (
          <div className="mt-6 rounded-2xl bg-amber-50 p-4 text-left text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            <p className="font-semibold">Likely fix:</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              <li>Open the Vercel project → <em>Settings</em> → <em>Environment Variables</em>.</li>
              <li>
                Make sure <code>DATABASE_URL</code> and <code>GOOGLE_API_KEY</code> are set for{" "}
                <em>Production</em>, <em>Preview</em>, and <em>Development</em>.
              </li>
              <li>Redeploy.</li>
            </ol>
          </div>
        ) : null}

        {isMissingTable ? (
          <div className="mt-6 rounded-2xl bg-amber-50 p-4 text-left text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            <p className="font-semibold">Database table missing.</p>
            <p className="mt-1">
              Run <code className="rounded bg-black/10 px-1.5 py-0.5">npm run db:push</code> locally
              with your production <code>DATABASE_URL</code> in <code>.env.local</code>, then redeploy.
            </p>
          </div>
        ) : null}

        {error.digest ? (
          <p className="mt-4 font-mono text-xs text-neutral-400">digest: {error.digest}</p>
        ) : null}

        <div className="mt-6 flex justify-center gap-2">
          <button onClick={reset} className="btn btn-primary">Try again</button>
          <Link href="/" className="btn btn-ghost">Home</Link>
        </div>
      </div>
    </main>
  );
}

function prettyTitle(error: Error & { digest?: string }): string {
  const m = error.message || "";
  if (/DATABASE_URL/i.test(m)) return "Database isn't configured";
  if (/GOOGLE_API_KEY/i.test(m)) return "Google Sheets API key is missing";
  if (/relation .* does not exist|pages.*does not exist/i.test(m)) return "Database table missing";
  if (/permission|caller does not have permission/i.test(m)) return "We can't read that sheet";
  return "Something went wrong";
}

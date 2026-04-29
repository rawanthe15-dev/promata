export default function Loading() {
  return (
    <main className="mx-auto max-w-3xl px-6 pb-20">
      <header className="flex items-center justify-between py-8">
        <span className="text-lg font-semibold tracking-tight">
          promata<span className="text-pink-500">.</span>
        </span>
        <span className="text-sm text-neutral-500">step 2 of 2</span>
      </header>

      <section className="card animate-pulse p-6">
        <div className="h-3 w-32 rounded-full bg-neutral-200 dark:bg-neutral-800" />
        <div className="mt-3 h-8 w-40 rounded-md bg-neutral-200 dark:bg-neutral-800" />
        <div className="mt-2 h-3 w-48 rounded-full bg-neutral-200 dark:bg-neutral-800" />
        <div className="mt-4 flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-6 w-20 rounded-full bg-neutral-200 dark:bg-neutral-800" />
          ))}
        </div>
      </section>

      <p className="mt-6 px-1 text-center text-sm text-neutral-500">
        Reading your sheet…
      </p>
    </main>
  );
}

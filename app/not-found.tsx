import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
      <p className="text-7xl font-semibold tracking-tight text-neutral-300 dark:text-neutral-700">404</p>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">Nothing here</h1>
      <p className="mt-2 text-sm text-neutral-500">
        That username doesn&apos;t exist on promata yet.
      </p>
      <Link href="/" className="btn btn-primary mt-6">Go home</Link>
    </main>
  );
}

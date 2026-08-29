import Link from "next/link";

import { ScreenTitle } from "@/components/ScreenTitle";

/**
 * Dark 404.
 *
 * Next.js ships a built-in not-found page whose inline styles are white on a
 * device set to Light mode. That would undo the dark treatment for anyone who
 * mistypes an address or follows a stale link, so REIGN provides its own.
 */
export default function NotFound() {
  return (
    <main className="px-gutter pt-safe flex-1">
      <ScreenTitle>Not found</ScreenTitle>

      <section className="mt-3">
        <h2 className="text-hero text-ink">Nothing here</h2>
        <p className="text-body text-muted mt-2">
          That page does not exist.
        </p>
      </section>

      <Link
        href="/"
        className="text-button bg-surface text-ink border-border mt-8 flex h-14 w-full items-center justify-center rounded-md border uppercase"
      >
        Back to Today
      </Link>
    </main>
  );
}

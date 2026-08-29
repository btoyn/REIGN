"use client";

import { useEffect } from "react";

import { ScreenTitle } from "@/components/ScreenTitle";

/**
 * Dark error screen for anything that fails while rendering a page.
 *
 * CLAUDE.md requires every screen to handle the error case, and an unstyled
 * crash would show white. This keeps a failure inside the REIGN surface and
 * offers a way out.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <>
      <ScreenTitle>Something broke</ScreenTitle>

      <section className="mt-3">
        <h2 className="text-hero text-ink">That did not load</h2>
        <p className="text-body text-muted mt-2">
          Nothing was lost. Try again.
        </p>
      </section>

      <button
        type="button"
        onClick={reset}
        className="text-button bg-surface text-ink border-border mt-8 h-14 w-full rounded-md border uppercase"
      >
        Try again
      </button>
    </>
  );
}

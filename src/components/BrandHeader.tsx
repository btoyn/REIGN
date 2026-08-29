"use client";

import { useSyncExternalStore } from "react";

/**
 * The Today screen's top area: a restrained REIGN treatment over today's date.
 *
 * The wordmark is text. The supplied wordmark PNGs are opaque with a baked-in
 * near-black background and cannot sit on the app background, so CLAUDE.md
 * calls for a text wordmark until clean exports arrive. This is not an attempt
 * to reproduce the graphic mark.
 *
 * The date is read in the browser rather than on the server. These pages are
 * prerendered when the site deploys, so a server-rendered date would freeze at
 * deploy time and be wrong the next day. useSyncExternalStore gives the server
 * null and the browser the real date, which avoids a hydration mismatch. The
 * line keeps its height while it resolves so nothing shifts underneath it.
 */

/** The date never changes while the screen is open, so there is nothing to subscribe to. */
function subscribe() {
  return () => {};
}

function getSnapshot() {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function getServerSnapshot() {
  return null;
}

export function BrandHeader() {
  const today = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <header className="pt-6">
      <p className="text-ink text-xl leading-6 font-bold tracking-[0.3em]">
        REIGN
      </p>
      <p className="text-body text-muted mt-2 h-5">{today}</p>
    </header>
  );
}

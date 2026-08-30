"use client";

import { useSyncExternalStore } from "react";

import { Wordmark } from "@/components/Wordmark";

/**
 * The Today screen's top area: the REIGN wordmark over today's date.
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
    <header className="flex flex-col gap-4">
      <Wordmark />
      <p className="text-body text-muted h-5">{today}</p>
    </header>
  );
}

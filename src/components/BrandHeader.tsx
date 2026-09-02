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
    /*
      Centred, at the owner's request, having seen the left-aligned version on
      the phone.

      The mark and the date centre TOGETHER, as one masthead. Centring the mark
      and leaving the date on the left gutter reads as a mistake rather than a
      choice — two things stacked to two different rules with nothing between
      them to explain why.

      Everything below this stays on the gutter: the screen title, the split
      name, the counts, every list. This is a masthead over left-aligned
      content, which is its own convention. The rule that content is read from
      one left edge is untouched.
    */
    <header className="flex flex-col items-center gap-4">
      <Wordmark />
      <p className="text-body text-muted h-5">{today}</p>
    </header>
  );
}

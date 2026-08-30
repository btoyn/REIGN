"use client";

import { useEffect, useState } from "react";

import { elapsedSeconds, formatRest, isLongRest } from "@/lib/rest";
import { holdScreenAwake } from "@/lib/wakeLock";

/**
 * Time since the last set.
 *
 * Starts itself when a set is logged and needs no button, because starting a
 * rest is not a decision anyone makes: it begins the moment the set ends. It
 * counts up rather than down, since nothing here prescribes how long to rest.
 *
 * The screen is held awake while it runs, so the next set does not begin with
 * unlocking a phone.
 */
export function RestTimer({ since }: { since: number }) {
  const [seconds, setSeconds] = useState(() =>
    elapsedSeconds(since, Date.now()),
  );

  useEffect(() => {
    // Read from the clock rather than counting ticks, so a backgrounded tab or
    // a locked phone does not lose time.
    const tick = () => setSeconds(elapsedSeconds(since, Date.now()));
    tick();
    const timer = setInterval(tick, 1000);
    const onVisible = () => tick();
    document.addEventListener("visibilitychange", onVisible);

    const release = holdScreenAwake();

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      release();
    };
  }, [since]);

  const long = isLongRest(seconds);

  return (
    <p className="flex items-baseline gap-2">
      <span className="text-label text-muted uppercase">Rest</span>
      {/*
        Tabular figures, so the number does not jitter as the seconds tick.
        A long rest is said in words rather than signalled by a colour.
      */}
      <span className="text-lead text-ink tabular-nums">
        {formatRest(seconds)}
      </span>
      {long ? <span className="text-body text-muted">· a long one</span> : null}
    </p>
  );
}

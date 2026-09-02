"use client";

import { useEffect, useState } from "react";

import {
  describeTarget,
  elapsedSeconds,
  formatRest,
  isLongRest,
  restIsUp,
} from "@/lib/rest";
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
 *
 * When the followed program prescribes a rest for this exercise, the target is
 * shown beside the count and the timer says "ready" once it is served. It still
 * counts up past it: ninety seconds is a floor rather than a deadline, and a
 * countdown that hits zero has nothing left to say about the rest actually
 * being taken.
 *
 * With no program, or no rest prescribed for this lift, target is null and the
 * timer reads exactly as it always did.
 */
export function RestTimer({
  since,
  target = null,
}: {
  since: number;
  target?: number | null;
}) {
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
  const targetLine = describeTarget(seconds, target);
  const ready = restIsUp(seconds, target);

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

      {/*
        The prescribed rest, when the program has one. "ready" is carried by
        the word and by its weight, never by the gold alone: the rule is that
        no state is signalled by hue by itself, and this is read at a glance
        between two heavy sets.
      */}
      {targetLine ? (
        <span
          className={
            ready
              ? "text-body text-accent font-bold uppercase"
              : "text-body text-muted tabular-nums"
          }
        >
          {targetLine}
        </span>
      ) : null}

      {/*
        A long rest is worth saying when nothing was prescribed. With a target
        on screen it is noise: the target already says whether the rest has run
        past what it should be.
      */}
      {long && target === null ? (
        <span className="text-body text-muted">· a long one</span>
      ) : null}
    </p>
  );
}

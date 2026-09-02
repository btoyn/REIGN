/**
 * The rest timer.
 *
 * Counts up from the moment a set is logged. That was originally because no
 * program prescribed rest and a countdown would have invented a number nobody
 * chose. A program can now prescribe it, and the timer still counts up: what is
 * added is the target beside the count and a word when it is reached, not a
 * second kind of timer.
 *
 * Counting up rather than down is also the honest reading of what a rest is.
 * Ninety seconds is a floor, not a deadline — going over it is fine and going
 * under it is the thing worth noticing — and a countdown that hits zero and
 * stops has nothing left to say about the rest you are actually taking.
 *
 * The elapsed time is worked out from a timestamp rather than counted by
 * ticks, so it stays right when the phone locks, the tab is backgrounded, or a
 * frame is dropped.
 */

/** Seconds since a set was logged. */
export function elapsedSeconds(since: number, now: number): number {
  return Math.max(0, Math.floor((now - since) / 1000));
}

/** "1:30", and "12:05" past ten minutes. Never a bare count of seconds. */
export function formatRest(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

/**
 * Rests worth noticing.
 *
 * Long enough that the set is a separate effort rather than a continuation.
 * Below this the timer is just a number; past it, it is worth saying the rest
 * has been long, which the screen does in words rather than by turning a
 * colour.
 */
export const LONG_REST_SECONDS = 5 * 60;

export function isLongRest(seconds: number): boolean {
  return seconds >= LONG_REST_SECONDS;
}

/**
 * Whether a prescribed rest has been served.
 *
 * The moment the next set is allowed to start, which is the only thing the
 * prescription is actually for.
 */
export function restIsUp(elapsed: number, target: number | null): boolean {
  return target !== null && elapsed >= target;
}

/**
 * What the timer says about a prescribed rest, in words.
 *
 * Words rather than a colour, because CLAUDE.md's rule is that no state is
 * signalled by hue alone, and a rest timer glanced at between sets is exactly
 * where a colour-only signal would fail. "of 3:00" while it runs, "ready" when
 * it is served.
 *
 * Null when nothing is prescribed, which is most exercises in most programs and
 * every exercise when no program is being followed. The timer then reads
 * exactly as it always did.
 */
export function describeTarget(
  elapsed: number,
  target: number | null,
): string | null {
  if (target === null) return null;
  return restIsUp(elapsed, target) ? "ready" : `of ${formatRest(target)}`;
}

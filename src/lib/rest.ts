/**
 * The rest timer.
 *
 * Counts up from the moment a set is logged rather than down from a target,
 * because the owner's programme does not prescribe rest and a countdown would
 * invent a number nobody chose. What matters between sets is how long it has
 * been, not how long is left.
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

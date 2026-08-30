import type { LoggedSet } from "@/lib/sets";

/**
 * Double progression.
 *
 * Each exercise has a target rep range. You keep the weight and add reps until
 * you reach the top of the range on every working set; then the weight goes up
 * and the reps reset to the bottom. That is the whole method, and it is the
 * rule CLAUDE.md specifies.
 *
 * Every suggestion is pre-filled and editable. Nothing here writes anything.
 */

export type RepRange = { min: number; max: number };

export type Suggestion = {
  weight: number;
  reps: number;
  /** Said on screen, so the number is never unexplained. */
  because: string;
};

/**
 * The smallest jump worth making.
 *
 * Five pounds is the smallest increment most commercial gym equipment supports:
 * the smallest common plate pair is 2.5 each side, and dumbbells step in fives.
 * Plate math, which would work out whether a given weight is loadable at all,
 * is deliberately not here; it is queued in the build plan.
 */
export const INCREMENT_LB = 5;

/** Falling short twice running is the signal to back off, not once. */
export const BACK_OFF_AFTER = 2;

/** How far back to drop when it is time to back off. */
export const BACK_OFF_FRACTION = 0.9;

/** Weights are rounded to something loadable rather than 121.5 pounds. */
function toLoadable(weight: number): number {
  return Math.max(0, Math.round(weight / INCREMENT_LB) * INCREMENT_LB);
}

/** Working sets only. Warm-ups say nothing about progression. */
export function workingSets(sets: LoggedSet[]): LoggedSet[] {
  return sets.filter(
    (s) => !s.is_warmup && s.weight !== null && s.reps !== null,
  );
}

/**
 * What a session says about the range.
 *
 * Judged on the worst working set, because double progression only advances
 * when every set clears the bar, not when the first one does.
 */
export type Verdict = "at the top" | "inside" | "short";

export function judge(sets: LoggedSet[], range: RepRange): Verdict | null {
  const working = workingSets(sets);
  if (working.length === 0) return null;

  const worst = Math.min(...working.map((s) => s.reps as number));
  if (worst >= range.max) return "at the top";
  if (worst >= range.min) return "inside";
  return "short";
}

/** The weight a session was performed at, taken from its heaviest working set. */
export function sessionWeight(sets: LoggedSet[]): number | null {
  const working = workingSets(sets);
  if (working.length === 0) return null;
  return Math.max(...working.map((s) => s.weight as number));
}

/**
 * What to put in the fields.
 *
 * `sessions` is this exercise's history, most recent first, each one the sets
 * of a single workout. Only the last two matter: the last decides the move, and
 * the one before it decides whether falling short is a pattern or a bad day.
 */
export function suggest(
  sessions: LoggedSet[][],
  range: RepRange,
): Suggestion | null {
  const last = sessions[0];
  if (!last) return null;

  const verdict = judge(last, range);
  const weight = sessionWeight(last);
  if (verdict === null || weight === null) return null;

  if (verdict === "at the top") {
    return {
      weight: toLoadable(weight + INCREMENT_LB),
      reps: range.min,
      because: "so the weight goes up",
    };
  }

  if (verdict === "inside") {
    const worst = Math.min(...workingSets(last).map((s) => s.reps as number));
    return {
      weight,
      // One more rep than the worst set, never past the top of the range.
      reps: Math.min(range.max, worst + 1),
      because: "so one more rep",
    };
  }

  // Short. Only back off if it has happened twice running.
  const shortRuns = countShortRuns(sessions, range);
  if (shortRuns >= BACK_OFF_AFTER) {
    return {
      weight: toLoadable(weight * BACK_OFF_FRACTION),
      reps: range.min,
      because: "backing off after two short sessions",
    };
  }

  return {
    weight,
    reps: range.min,
    because: "the same again",
  };
}

/** How many of the most recent sessions in a row fell short of the range. */
export function countShortRuns(
  sessions: LoggedSet[][],
  range: RepRange,
): number {
  let run = 0;
  for (const session of sessions) {
    if (judge(session, range) !== "short") break;
    run += 1;
  }
  return run;
}

/**
 * Is this set a personal record?
 *
 * A set is a record when no earlier set of the same exercise was both as heavy
 * and for as many reps. That covers the two things anyone means by a record —
 * a heavier weight, or more reps at a weight — without inventing a formula or
 * a one-rep-max estimate, and it is calculated every time rather than stored.
 */
export function isRecord(
  set: { weight: number | null; reps: number | null },
  earlier: LoggedSet[],
): boolean {
  if (set.weight === null || set.reps === null) return false;
  return !earlier.some(
    (e) =>
      e.weight !== null &&
      e.reps !== null &&
      e.weight >= set.weight! &&
      e.reps >= set.reps!,
  );
}

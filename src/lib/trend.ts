import { fetchExercisesByIds } from "@/lib/exercises";
import { fetchExerciseSessions, type Session } from "@/lib/exerciseHistory";
import { shortDate } from "@/lib/progress";
import { sessionWeight, workingSets } from "@/lib/progression";
import { best, type Attempt } from "@/lib/records";

/**
 * One lift over time.
 *
 * The third thing Progress does. Records say what the best ever was; this says
 * what has been happening since, which is the question the specification calls
 * the strength trend.
 *
 * There is no chart. CLAUDE.md bans decorative charts and the specification
 * prefers large numbers with restrained labels, and a column of working weights
 * in tabular figures already reads as a trend — which is the strip test
 * answered honestly: take a line graph away and nothing is lost, so the line
 * graph was never carrying it.
 */

export type Trend = {
  exerciseId: string;
  name: string;
  /** Every session containing this exercise, newest first. */
  sessions: Session[];
  /** The heaviest working set of the most recent session. */
  current: number | null;
  record: Attempt | null;
};

export type Change = {
  /** Positive when heavier now than at the start. Can be negative. */
  lb: number;
  /** The date of the first session, which is what the change is measured from. */
  since: string;
};

/**
 * How the working weight has moved, from the first session to the last.
 *
 * Two points, not a fitted line, and the wording says so: "since 12 March" is
 * exactly what is being claimed. Anything cleverer would be arithmetic
 * presented as insight.
 *
 * Null with fewer than two sessions carrying a weight, because there is nothing
 * to compare to yet.
 */
export function change(sessions: Session[]): Change | null {
  const weighed = sessions.filter(
    (s) => sessionWeight(workingSets(s.sets)) !== null,
  );
  if (weighed.length < 2) return null;

  const newest = sessionWeight(workingSets(weighed[0].sets));
  const oldest = weighed[weighed.length - 1];
  const first = sessionWeight(workingSets(oldest.sets));
  if (newest === null || first === null) return null;

  return { lb: newest - first, since: oldest.date };
}

/**
 * The change in words.
 *
 * A weight that has come down says so plainly rather than being hidden or
 * coloured red. A deload is a decision, not a failure, and the number is the
 * number.
 */
export function describeChange(c: Change | null): string | null {
  if (c === null) return null;
  const when = shortDate(c.since);
  if (c.lb > 0) return `Up ${c.lb} lb since ${when}`;
  if (c.lb < 0) return `Down ${-c.lb} lb since ${when}`;
  return `Same weight as ${when}`;
}

/**
 * What a single session did, for the list.
 *
 * Working sets only. A warm-up is part of the day on the workout screen, but it
 * says nothing about the trend and would break the column of weights that makes
 * the trend readable.
 */
export function sessionSets(session: Session) {
  return workingSets(session.sets);
}

export async function fetchExerciseTrend(exerciseId: string): Promise<Trend> {
  const sessions = await fetchExerciseSessions(exerciseId, "", {
    // All of it, and today's workout counts, which is the rule records use.
    // Reading the whole history is the point of this screen.
    limit: null,
    countInProgress: true,
  });

  const library = await fetchExercisesByIds([exerciseId]);

  const attempts: Attempt[] = [];
  for (const session of sessions) {
    for (const set of workingSets(session.sets)) {
      if (set.weight === null || set.reps === null || set.reps < 1) continue;
      attempts.push({
        weight: set.weight,
        reps: set.reps,
        date: session.date,
      });
    }
  }

  return {
    exerciseId,
    // An exercise deleted from the library still has sets pointing at it, and a
    // screen with no name on it is worse than one naming the id.
    name: library.get(exerciseId)?.name ?? exerciseId,
    sessions,
    current:
      sessions.length > 0
        ? sessionWeight(workingSets(sessions[0].sets))
        : null,
    record: best(attempts),
  };
}

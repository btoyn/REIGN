import { fetchExercisesByIds } from "@/lib/exercises";
import { getSupabase } from "@/lib/supabase";
import { hasBeenPerformed, todayDate } from "@/lib/workouts";

/**
 * Personal records.
 *
 * Calculated every time, never stored, per CLAUDE.md. There is no records
 * table and no column anywhere holding a best: the sets are the truth and this
 * reads them.
 *
 * The exercise screen already marks a record as it is set, using the same idea
 * from progression.ts. This is the other half of it: the standing best on every
 * exercise, gathered in one place.
 */

/** One set worth considering, with the day it happened. */
export type Attempt = {
  weight: number;
  reps: number;
  /** YYYY-MM-DD. */
  date: string;
};

export type PersonalRecord = Attempt & {
  exerciseId: string;
  /** The library's name for it, filled in by the read. */
  name: string;
};

/**
 * The best of a set of attempts.
 *
 * Heaviest first, because that is what anyone means by their best on a lift.
 * Ties on weight go to the most reps, which is the harder set of the two.
 *
 * Ties beyond that go to the *earliest* date, and that is the part worth
 * stating. A record is set the first time it is achieved. Hitting the same
 * weight and reps again in September did not set anything; it repeated
 * something set in June. Without this the list would keep re-dating old bests
 * and every repeat would look like a new achievement.
 *
 * Where every attempt is at nought pounds, which is how a bodyweight movement
 * gets logged, the weights all tie and this falls through to the most reps on
 * its own. That is the right answer there without needing a separate rule.
 */
export function best(attempts: Attempt[]): Attempt | null {
  let winner: Attempt | null = null;
  for (const attempt of attempts) {
    if (winner === null || beats(attempt, winner)) winner = attempt;
  }
  return winner;
}

function beats(candidate: Attempt, holder: Attempt): boolean {
  if (candidate.weight !== holder.weight)
    return candidate.weight > holder.weight;
  if (candidate.reps !== holder.reps) return candidate.reps > holder.reps;
  return candidate.date < holder.date;
}

/**
 * A record in words: "225 lb × 3".
 *
 * A movement logged at nought pounds is carrying nothing but the body, so the
 * weight is not the achievement and printing "0 lb" would say the opposite of
 * what happened. It reads as reps alone.
 */
export function describeRecord(record: Attempt): string {
  if (record.weight === 0) return `${record.reps} reps`;
  return `${record.weight} lb × ${record.reps}`;
}

/**
 * Records in the order they are worth reading: most recently set first.
 *
 * What was just achieved rises to the top, and a lift whose best has stood
 * untouched for a year sinks. That is the same instinct behind variety, and it
 * means the list says something rather than being an index.
 *
 * Equal dates go to the heavier lift, then to the name, so the order never
 * depends on what the database happened to return.
 */
export function byMostRecent(records: PersonalRecord[]): PersonalRecord[] {
  return [...records].sort(
    (a, b) =>
      b.date.localeCompare(a.date) ||
      b.weight - a.weight ||
      a.name.localeCompare(b.name),
  );
}

/**
 * How many records the front of Progress shows before it stops.
 *
 * The same shape as Recent and Frequent in the picker: a few of the most
 * useful, with the rest one tap away. A screen that opens with forty rows of
 * records before the history is the analytics overload the spec warns about.
 */
export const RECORDS_ON_PROGRESS = 5;

export async function fetchRecords(): Promise<PersonalRecord[]> {
  const supabase = getSupabase();

  const [
    { data: workouts, error: workoutError },
    { data: entries, error: entryError },
    { data: sets, error: setError },
  ] = await Promise.all([
    supabase.from("workouts").select("id, date, finished_at"),
    supabase.from("workout_exercises").select("id, workout_id, exercise_id"),
    supabase.from("sets").select("workout_exercise_id, weight, reps, is_warmup"),
  ]);

  if (workoutError) throw new Error(workoutError.message);
  if (entryError) throw new Error(entryError.message);
  if (setError) throw new Error(setError.message);
  if (!sets || sets.length === 0) return [];

  const today = todayDate();
  const dateOf = new Map<string, string>();
  for (const workout of workouts ?? []) {
    if (hasBeenPerformed(workout, today)) dateOf.set(workout.id, workout.date);
  }

  /* Which exercise each set belongs to, and on what day. */
  const entryOf = new Map<string, { exerciseId: string; date: string }>();
  for (const entry of entries ?? []) {
    const date = dateOf.get(entry.workout_id);
    if (date !== undefined)
      entryOf.set(entry.id, { exerciseId: entry.exercise_id, date });
  }

  const attempts = new Map<string, Attempt[]>();
  for (const set of sets) {
    const entry = entryOf.get(set.workout_exercise_id);
    if (!entry) continue;
    /*
      Warm-ups are not records, the same rule progression follows, and a set
      with no numbers on it is not an attempt at anything. Nought reps is a set
      that was written down and never done.
    */
    if (set.is_warmup) continue;
    if (set.weight === null || set.reps === null || set.reps < 1) continue;

    const list = attempts.get(entry.exerciseId) ?? [];
    list.push({ weight: set.weight, reps: set.reps, date: entry.date });
    attempts.set(entry.exerciseId, list);
  }

  if (attempts.size === 0) return [];

  const library = await fetchExercisesByIds([...attempts.keys()]);

  const records: PersonalRecord[] = [];
  for (const [exerciseId, list] of attempts) {
    const winner = best(list);
    if (!winner) continue;
    records.push({
      ...winner,
      exerciseId,
      // An exercise deleted from the library still has sets pointing at it, and
      // a record with no name is worse than no record.
      name: library.get(exerciseId)?.name ?? exerciseId,
    });
  }

  return byMostRecent(records);
}

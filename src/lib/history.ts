import { fetchExercisesByIds, type Exercise } from "@/lib/exercises";
import { getSupabase } from "@/lib/supabase";
import { todayDate } from "@/lib/workouts";

/**
 * What the owner has actually done, read once.
 *
 * Recent, Frequent and how long since each exercise was last performed all come
 * from the same two tables, so they are read together rather than three times
 * over. The picker asks for all of it at once.
 *
 * None of this is touched by the trim that browse applies: an exercise that has
 * been logged belongs here whatever its category.
 */

/** How many workouts back Recent looks. Ten distinct exercises is three or four. */
const RECENT_WORKOUTS = 12;

export const RECENT_LIMIT = 10;
export const FREQUENT_LIMIT = 10;

export type TrainingHistory = {
  /** The last ten distinct exercises, most recently used first. */
  recent: Exercise[];
  /** The most logged, by how many workouts contain them. */
  frequent: Exercise[];
  /** Exercise id to the date it was last performed, as YYYY-MM-DD. */
  lastPerformed: Map<string, string>;
};

const EMPTY: TrainingHistory = {
  recent: [],
  frequent: [],
  lastPerformed: new Map(),
};

export async function fetchTrainingHistory(): Promise<TrainingHistory> {
  const supabase = getSupabase();

  const [
    { data: entries, error: entryError },
    { data: workouts, error: workoutError },
  ] = await Promise.all([
    supabase
      .from("workout_exercises")
      .select("workout_id, exercise_id, position"),
    supabase.from("workouts").select("id, date, started_at, finished_at"),
  ]);

  if (entryError) throw new Error(entryError.message);
  if (workoutError) throw new Error(workoutError.message);
  if (!entries || entries.length === 0) return EMPTY;

  /*
    A workout counts once it is finished, and today's counts while it is still
    being done.

    Both halves matter. Without the first, a workout walked out of half way
    through would make an exercise look performed when it may never have been,
    which is exactly the lie variety must not tell. Without the second, nothing
    added in the last hour would appear in Recent, and Recent is what the owner
    reaches for while standing in the gym.

    An abandoned workout is indistinguishable from one in progress until the day
    is over, so the date is what separates them.
  */
  const today = todayDate();
  const byId = new Map(
    (workouts ?? [])
      .filter((w) => w.finished_at !== null || w.date === today)
      .map((w) => [w.id, w]),
  );

  // Newest first, by when the workout started. Two workouts on one day share a
  // date, so ordering on the date alone ties and the order is then whatever the
  // database returned.
  const order = [...byId.values()]
    .sort((a, b) =>
      (b.started_at ?? b.date).localeCompare(a.started_at ?? a.date),
    )
    .map((w) => w.id);
  const rank = new Map(order.map((id, index) => [id, index]));

  const lastPerformed = new Map<string, string>();
  const counts = new Map<string, number>();

  for (const entry of entries) {
    const workout = byId.get(entry.workout_id);
    if (!workout) continue;

    counts.set(entry.exercise_id, (counts.get(entry.exercise_id) ?? 0) + 1);

    const known = lastPerformed.get(entry.exercise_id);
    if (known === undefined || workout.date > known) {
      lastPerformed.set(entry.exercise_id, workout.date);
    }
  }

  const recentIds = pickRecent(entries, rank);
  const frequentIds = [...counts.entries()]
    // Most logged first, then by id so the order is stable rather than
    // depending on what the database happened to return.
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, FREQUENT_LIMIT)
    .map(([id]) => id);

  const library = await fetchExercisesByIds([
    ...new Set([...recentIds, ...frequentIds]),
  ]);

  return {
    recent: inOrder(recentIds, library),
    frequent: inOrder(frequentIds, library),
    lastPerformed,
  };
}

/** Distinct exercises from the most recent workouts, in the order performed. */
function pickRecent(
  entries: { workout_id: string; exercise_id: string; position: number }[],
  rank: Map<string, number>,
): string[] {
  const sorted = entries
    .filter(
      (e) =>
        rank.has(e.workout_id) && rank.get(e.workout_id)! < RECENT_WORKOUTS,
    )
    .sort((a, b) => {
      const byWorkout = rank.get(a.workout_id)! - rank.get(b.workout_id)!;
      return byWorkout !== 0 ? byWorkout : a.position - b.position;
    });

  const seen: string[] = [];
  for (const entry of sorted) {
    if (!seen.includes(entry.exercise_id)) seen.push(entry.exercise_id);
    if (seen.length === RECENT_LIMIT) break;
  }
  return seen;
}

/** fetchExercisesByIds returns a map; the caller's order is the one that matters. */
function inOrder(ids: string[], library: Map<string, Exercise>): Exercise[] {
  return ids
    .map((id) => library.get(id))
    .filter((e): e is Exercise => e !== undefined);
}

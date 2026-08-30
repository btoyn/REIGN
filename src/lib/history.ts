import { fetchExercisesByIds, type Exercise } from "@/lib/exercises";
import { getSupabase } from "@/lib/supabase";

/**
 * Recent and Frequent.
 *
 * Both are read from what the owner has actually done, not from the library, so
 * neither is touched by the trim that browse applies. An exercise that has been
 * logged belongs in these lists whatever its category.
 *
 * Both are empty until there is history, and an empty list is worse than no
 * list, so the screen leaves them out entirely until they have something.
 */

/** How many workouts back Recent looks. Ten distinct exercises is three or four. */
const RECENT_WORKOUTS = 12;

export const RECENT_LIMIT = 10;
export const FREQUENT_LIMIT = 10;

/**
 * The last ten distinct exercises, most recently used first.
 *
 * Read as two queries rather than one join: the recent workouts, then what was
 * in them. workout_exercises carries no time of its own, so the order has to
 * come from the workout it belongs to.
 */
export async function fetchRecentExercises(): Promise<Exercise[]> {
  const supabase = getSupabase();

  const { data: workouts, error: workoutError } = await supabase
    .from("workouts")
    .select("id, started_at")
    .order("started_at", { ascending: false })
    .limit(RECENT_WORKOUTS);

  if (workoutError) throw new Error(workoutError.message);
  if (!workouts || workouts.length === 0) return [];

  const order = new Map(workouts.map((w, i) => [w.id, i]));

  const { data: entries, error: entryError } = await supabase
    .from("workout_exercises")
    .select("workout_id, exercise_id, position")
    .in(
      "workout_id",
      workouts.map((w) => w.id),
    );

  if (entryError) throw new Error(entryError.message);

  // Newest workout first, and within a workout the order it was performed in.
  const sorted = [...(entries ?? [])].sort((a, b) => {
    const byWorkout =
      (order.get(a.workout_id) ?? 0) - (order.get(b.workout_id) ?? 0);
    return byWorkout !== 0 ? byWorkout : a.position - b.position;
  });

  const seen: string[] = [];
  for (const e of sorted) {
    if (!seen.includes(e.exercise_id)) seen.push(e.exercise_id);
    if (seen.length === RECENT_LIMIT) break;
  }

  return inOrder(seen, await fetchExercisesByIds(seen));
}

/**
 * The most logged exercises.
 *
 * Counted here rather than in the database, because PostgREST has no group by.
 * This reads one short column across every workout ever logged: five workouts a
 * week of six exercises is about 1,500 rows a year, which is small enough that
 * counting them is cheaper than the alternatives.
 */
export async function fetchFrequentExercises(): Promise<Exercise[]> {
  const { data, error } = await getSupabase()
    .from("workout_exercises")
    .select("exercise_id");

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) return [];

  const counts = new Map<string, number>();
  for (const row of data) {
    counts.set(row.exercise_id, (counts.get(row.exercise_id) ?? 0) + 1);
  }

  const ids = [...counts.entries()]
    // Most logged first, then alphabetically by id so the order is stable
    // rather than depending on what the database happened to return.
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, FREQUENT_LIMIT)
    .map(([id]) => id);

  return inOrder(ids, await fetchExercisesByIds(ids));
}

/** fetchExercisesByIds returns a map, and the caller's order is the one that matters. */
function inOrder(ids: string[], library: Map<string, Exercise>): Exercise[] {
  return ids
    .map((id) => library.get(id))
    .filter((e): e is Exercise => e !== undefined);
}

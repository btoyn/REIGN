import { getSupabase } from "@/lib/supabase";

/**
 * Sets. The actual record — everything else exists to give these context.
 *
 * Weight and reps are stored as numbers, never as a formatted string. "135 × 8"
 * is assembled when rendering.
 *
 * set_number is the number the set was given when it was logged, and it is not
 * renumbered when a set is deleted. The screen shows position instead, so a
 * deleted second set leaves the list reading 1, 2, 3 while the rows keep the
 * numbers they were written with. The next set takes the highest number plus
 * one, which keeps it clear of the table's one-number-per-exercise constraint.
 */

export type LoggedSet = {
  id: string;
  set_number: number;
  weight: number | null;
  reps: number | null;
  is_warmup: boolean;
  completed_at: string | null;
};

const COLUMNS = "id, set_number, weight, reps, is_warmup, completed_at";

export async function fetchSets(
  workoutExerciseId: string,
): Promise<LoggedSet[]> {
  const { data, error } = await getSupabase()
    .from("sets")
    .select(COLUMNS)
    .eq("workout_exercise_id", workoutExerciseId)
    .order("set_number");

  if (error) throw new Error(error.message);
  return data ?? [];
}

/** The number the next set gets: past the highest already used, not the count. */
export function nextSetNumber(sets: LoggedSet[]): number {
  return sets.reduce((highest, s) => Math.max(highest, s.set_number), 0) + 1;
}

export async function logSet(
  workoutExerciseId: string,
  setNumber: number,
  weight: number,
  reps: number,
): Promise<LoggedSet> {
  const { data, error } = await getSupabase()
    .from("sets")
    .insert({
      workout_exercise_id: workoutExerciseId,
      set_number: setNumber,
      weight,
      reps,
      completed_at: new Date().toISOString(),
    })
    .select(COLUMNS)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateSet(
  id: string,
  weight: number,
  reps: number,
): Promise<LoggedSet> {
  const { data, error } = await getSupabase()
    .from("sets")
    .update({ weight, reps })
    .eq("id", id)
    .select(COLUMNS)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteSet(id: string): Promise<void> {
  const { error } = await getSupabase().from("sets").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/**
 * Every set in a workout, keyed by the exercise entry it belongs to.
 *
 * One read for the whole workout, so the list screen does not fire a request
 * per exercise.
 */
export async function fetchSetsForEntries(
  entryIds: string[],
): Promise<Map<string, LoggedSet[]>> {
  const byEntry = new Map<string, LoggedSet[]>();
  if (entryIds.length === 0) return byEntry;

  const { data, error } = await getSupabase()
    .from("sets")
    .select(`workout_exercise_id, ${COLUMNS}`)
    .in("workout_exercise_id", entryIds)
    .order("set_number");

  if (error) throw new Error(error.message);

  for (const row of (data ?? []) as (LoggedSet & {
    workout_exercise_id: string;
  })[]) {
    const list = byEntry.get(row.workout_exercise_id) ?? [];
    list.push(row);
    byEntry.set(row.workout_exercise_id, list);
  }
  return byEntry;
}

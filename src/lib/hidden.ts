import { getSupabase } from "@/lib/supabase";

/**
 * Hidden exercises.
 *
 * Browse already trims the library to what a commercial gym holds, but no rule
 * guessed in advance is right about everything. Hiding is the owner's own
 * judgment, applied to whatever the trim got wrong.
 *
 * Nothing is deleted. A hidden exercise is a row saying so, and unhiding it
 * removes that row.
 */

/**
 * Every hidden exercise id.
 *
 * Returns an empty set rather than throwing if the read fails. Hiding is a
 * preference layered on top of the library, so a picker that cannot read it
 * should show everything rather than show nothing: the worst case is seeing an
 * exercise you meant to hide, which is better than an empty picker mid-workout.
 * The failure still reaches the console.
 */
export async function fetchHiddenExerciseIds(): Promise<Set<string>> {
  const { data, error } = await getSupabase()
    .from("hidden_exercises")
    .select("exercise_id");

  if (error) {
    console.error("could not read hidden exercises", error.message);
    return new Set();
  }
  return new Set((data ?? []).map((row) => row.exercise_id));
}

export async function hideExercise(exerciseId: string): Promise<void> {
  const { error } = await getSupabase()
    .from("hidden_exercises")
    .insert({ exercise_id: exerciseId });

  if (error) throw new Error(error.message);
}

export async function unhideExercise(exerciseId: string): Promise<void> {
  const { error } = await getSupabase()
    .from("hidden_exercises")
    .delete()
    .eq("exercise_id", exerciseId);

  if (error) throw new Error(error.message);
}

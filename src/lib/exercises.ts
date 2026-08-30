import { getSupabase } from "@/lib/supabase";

/**
 * Reads of the exercise library.
 *
 * The library is public-domain reference data and is readable without signing
 * in, so these need no session. Everything that is actually training history
 * does, and none of it is read here.
 */

export type Exercise = {
  id: string;
  name: string;
  primary_muscle: string;
  equipment: string | null;
};

/**
 * The muscle groups actually present in the library, in alphabetical order.
 *
 * Derived from the data rather than written down here, so the list cannot
 * drift from what the library holds. PostgREST has no DISTINCT, so this reads
 * one short column across the library and reduces it — around 876 small
 * strings, which is cheaper than it sounds and happens once per visit.
 */
export async function fetchMuscleGroups(): Promise<string[]> {
  const { data, error } = await getSupabase()
    .from("exercises")
    .select("primary_muscle");

  if (error) throw new Error(error.message);

  const seen = new Set<string>();
  for (const row of data ?? []) seen.add(row.primary_muscle);
  return [...seen].sort();
}

/** Every exercise for one muscle group, by name. */
export async function fetchExercisesByMuscle(
  muscle: string,
): Promise<Exercise[]> {
  const { data, error } = await getSupabase()
    .from("exercises")
    .select("id, name, primary_muscle, equipment")
    .eq("primary_muscle", muscle)
    .order("name");

  if (error) throw new Error(error.message);
  return data ?? [];
}

/**
 * Several exercises by id, for showing what is in a workout.
 *
 * Returned keyed by id rather than as a list, because the caller already knows
 * the order it wants: the order they were added to the workout.
 */
export async function fetchExercisesByIds(
  ids: string[],
): Promise<Map<string, Exercise>> {
  if (ids.length === 0) return new Map();

  const { data, error } = await getSupabase()
    .from("exercises")
    .select("id, name, primary_muscle, equipment")
    .in("id", ids);

  if (error) throw new Error(error.message);
  return new Map((data ?? []).map((e) => [e.id, e]));
}

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
  /**
   * What else the movement works. Read for substitutes: two lifts sharing
   * secondary muscles are closer to each other than two that do not.
   */
  secondary_muscles: string[];
  /** Needed by the browse trim; see src/lib/library.ts. */
  category: string | null;
};

/** Every column the app reads about an exercise. */
export const EXERCISE_COLUMNS =
  "id, name, primary_muscle, secondary_muscles, equipment, category";

/**
 * The whole library, in one read.
 *
 * Around 876 rows of five short columns, which is roughly 90KB and arrives in
 * one request. Holding it makes search and browse instant and costs no further
 * requests as the owner moves between them, which matters more than the first
 * load does when the alternative is a round trip per tap in a gym.
 */
export async function fetchLibrary(): Promise<Exercise[]> {
  const { data, error } = await getSupabase()
    .from("exercises")
    .select(EXERCISE_COLUMNS)
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
    .select(EXERCISE_COLUMNS)
    .in("id", ids);

  if (error) throw new Error(error.message);
  return new Map((data ?? []).map((e) => [e.id, e]));
}

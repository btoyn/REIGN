import { getSupabase } from "@/lib/supabase";

/**
 * The weekday split.
 *
 * The owner trains the same thing every Monday, so Today reads what to train
 * from the day of the week rather than asking. The split assembles itself: the
 * first time a given weekday comes around the app asks once, records the
 * answer, and never asks about that day again. There is no setup form, and it
 * never asks about a day that has not been reached.
 *
 * Postgres and JavaScript agree that 0 is Sunday, so the day number needs no
 * translation between them.
 */

export type Split = {
  id: string;
  day_of_week: number;
  name: string;
  target_muscles: string[];
};

/** A rest day is a split with a name and no muscles, not a missing row. */
export const REST_DAY_NAME = "Rest day";

export function isRestDay(split: Split): boolean {
  return split.target_muscles.length === 0;
}

export function todayDayOfWeek(): number {
  return new Date().getDay();
}

/** The split for a weekday, or null if that day has never been answered. */
export async function fetchSplitForDay(
  dayOfWeek: number,
): Promise<Split | null> {
  const { data, error } = await getSupabase()
    .from("splits")
    .select("id, day_of_week, name, target_muscles")
    .eq("day_of_week", dayOfWeek)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Record what this weekday is.
 *
 * Upserts on the day so answering twice corrects the day rather than failing
 * against the table's one-split-per-weekday constraint.
 */
export async function saveSplitForDay(
  dayOfWeek: number,
  name: string,
  targetMuscles: string[],
): Promise<Split> {
  const { data, error } = await getSupabase()
    .from("splits")
    .upsert(
      { day_of_week: dayOfWeek, name, target_muscles: targetMuscles },
      { onConflict: "day_of_week" },
    )
    .select("id, day_of_week, name, target_muscles")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

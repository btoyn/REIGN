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

/** Indexed by the database's own day numbering, so WEEKDAYS[0] is Sunday. */
export const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/**
 * The week as it is read, Monday first.
 *
 * The database counts from Sunday because Postgres does. A training week starts
 * on Monday, so the schedule is shown in that order and the two are kept apart
 * here rather than in every screen that displays a week.
 */
export const WEEK_IN_READING_ORDER = [1, 2, 3, 4, 5, 6, 0];

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
 * Every weekday that has been answered.
 *
 * Returns only the rows that exist. Days that have never been reached have no
 * row, and the screen showing them is what decides how an unanswered day reads.
 */
export async function fetchAllSplits(): Promise<Split[]> {
  const { data, error } = await getSupabase()
    .from("splits")
    .select("id, day_of_week, name, target_muscles");

  if (error) throw new Error(error.message);
  return data ?? [];
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

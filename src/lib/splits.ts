import { REGIONS } from "@/lib/regions";
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

/**
 * A day made of more than one region.
 *
 * A program's day is not always one body part. Push is chest, shoulders and
 * triceps; Pull is back and biceps. The six regions describe what to train on
 * an improvised day and they do not describe a program's days, so forcing them
 * to would misdescribe the training.
 *
 * This needs no change to the data model: target_muscles is already a list.
 * What changes is the control that fills it.
 */

/**
 * Every muscle the chosen regions cover, in the regions' own order.
 *
 * Deduplicated, though the six regions do not overlap today. That is a fact
 * about the current REGIONS table rather than a guarantee, and a split naming
 * the same muscle twice would be a lie about what it trains.
 */
export function combinedMuscles(regionNames: string[]): string[] {
  const chosen = new Set(regionNames);
  const muscles: string[] = [];
  for (const region of REGIONS) {
    if (!chosen.has(region.name)) continue;
    for (const muscle of region.muscles) {
      if (!muscles.includes(muscle)) muscles.push(muscle);
    }
  }
  return muscles;
}

/**
 * What to call a combined day before the owner names it.
 *
 * The regions joined, which is a description rather than an invention: calling
 * chest, shoulders and triceps "Push" is the owner's word for it, and guessing
 * it would be REIGN deciding what programme they follow. The field is prefilled
 * with this and is theirs to replace.
 */
export function defaultDayName(regionNames: string[]): string {
  const inOrder = REGIONS.filter((r) => regionNames.includes(r.name)).map(
    (r) => r.name,
  );
  if (inOrder.length === 0) return "";
  if (inOrder.length === 1) return inOrder[0];
  return `${inOrder.slice(0, -1).join(", ")} & ${inOrder[inOrder.length - 1]}`;
}

/**
 * Whether a combined day can be saved.
 *
 * A day with no regions is a rest day, which has its own answer, and a day with
 * no name could not be shown on Today.
 */
export function canSaveCombined(
  regionNames: string[],
  name: string,
): boolean {
  return regionNames.length > 0 && name.trim() !== "";
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

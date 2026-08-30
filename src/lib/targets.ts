import { getSupabase } from "@/lib/supabase";
import type { RepRange } from "@/lib/progression";

/**
 * The rep range and working weight for one exercise.
 *
 * One row per exercise, which is what the locked schema holds and what the
 * progression rule reads. A program day may seed this the first time an
 * exercise is used, but after that this row is the truth.
 */

export type Target = {
  exercise_id: string;
  target_rep_min: number;
  target_rep_max: number;
  current_weight: number | null;
};

const COLUMNS = "exercise_id, target_rep_min, target_rep_max, current_weight";

/**
 * The rep ranges offered when an exercise is logged for the first time.
 *
 * Presets rather than a free entry, because these are the ranges anyone
 * actually trains in and typing two numbers on a phone between sets is worse
 * than picking one. The range is changeable afterwards.
 */
export const RANGE_PRESETS: { label: string; range: RepRange }[] = [
  { label: "4–6", range: { min: 4, max: 6 } },
  { label: "6–8", range: { min: 6, max: 8 } },
  { label: "8–12", range: { min: 8, max: 12 } },
  { label: "12–15", range: { min: 12, max: 15 } },
];

export async function fetchTarget(exerciseId: string): Promise<Target | null> {
  const { data, error } = await getSupabase()
    .from("exercise_targets")
    .select(COLUMNS)
    .eq("exercise_id", exerciseId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

/** Upserts on the exercise, so setting a range twice corrects it. */
export async function saveTarget(
  exerciseId: string,
  range: RepRange,
  currentWeight: number | null,
): Promise<Target> {
  const { data, error } = await getSupabase()
    .from("exercise_targets")
    .upsert(
      {
        exercise_id: exerciseId,
        target_rep_min: range.min,
        target_rep_max: range.max,
        current_weight: currentWeight,
      },
      { onConflict: "exercise_id" },
    )
    .select(COLUMNS)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export function rangeOf(target: Target): RepRange {
  return { min: target.target_rep_min, max: target.target_rep_max };
}

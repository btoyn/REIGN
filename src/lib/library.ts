import type { Exercise } from "@/lib/exercises";

/**
 * What a commercial gym actually holds.
 *
 * The library is 876 exercises and most of them are not what the owner does:
 * 123 stretches, 61 plyometrics, a 122-item "other" bucket of Atlas Stones,
 * sled drags and foam rolling. This rule cuts it to 462.
 *
 * Nothing is deleted and nothing becomes unreachable. Browse shows only these;
 * search reaches everything and merely ranks these first, so a stretch is still
 * one query away.
 *
 * Verified against the real data rather than assumed: 462 of 876, chest 84 to
 * 55, legs 298 to 93.
 */

const KEEP_CATEGORIES = new Set(["strength", "powerlifting"]);

const DROP_EQUIPMENT = new Set([
  "kettlebells",
  "bands",
  "medicine ball",
  "exercise ball",
  "foam roll",
  "other",
]);

/**
 * Bar-and-chain work, which needs equipment a commercial gym does not have.
 * Caught by name because the library files it under ordinary barbell equipment.
 */
const GEAR_IN_NAME = /\b(chain|chains|band|bands)\b/i;

export function isInGym(exercise: {
  category?: string | null;
  equipment: string | null;
  name: string;
}): boolean {
  if (!exercise.category || !KEEP_CATEGORIES.has(exercise.category))
    return false;
  if (!exercise.equipment || DROP_EQUIPMENT.has(exercise.equipment))
    return false;
  return !GEAR_IN_NAME.test(exercise.name);
}

export function inGymOnly(exercises: Exercise[]): Exercise[] {
  return exercises.filter(isInGym);
}

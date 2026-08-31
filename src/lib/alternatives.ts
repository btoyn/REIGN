import type { Exercise } from "@/lib/exercises";
import { daysSince } from "@/lib/variety";

/**
 * Substitutes for an exercise.
 *
 * The machine is taken, or the rack is busy, and the question is what else
 * trains the same thing. That is a decision made standing in a gym with a
 * stranger on the bench you wanted, so the list has to be ordered by how
 * useful it is right now rather than alphabetically.
 *
 * Everything here reads tags the library already carries. There is no stored
 * table of substitutes, and there is no algorithm learning anything: it is the
 * exercise's own primary muscle, its secondary muscles and its equipment.
 *
 * ONE THING IS MISSING, and it is worth stating rather than papering over. The
 * owner asked for substitutes matched on primary muscle AND MECHANIC —
 * compound against isolation — on the understanding that both were already
 * tagged. Primary muscle, secondary muscles and equipment are in the table;
 * mechanic never was. The source data has it for 789 of the 876 exercises, so
 * it is a column and a backfill away, and until that runs a bench press can
 * suggest a fly. Migration 0005 adds it.
 */

export type Alternative = {
  exercise: Exercise;
  /** How many secondary muscles it shares. Higher is a closer substitute. */
  overlap: number;
  /** Whether it needs different equipment, which is usually the whole point. */
  differentEquipment: boolean;
  /** Days since it was last performed, or null if it never has been. */
  days: number | null;
};

/** How many secondary muscles two exercises have in common. */
export function overlapWith(a: Exercise, b: Exercise): number {
  const mine = new Set(a.secondary_muscles ?? []);
  return (b.secondary_muscles ?? []).filter((m) => mine.has(m)).length;
}

/**
 * Substitutes for one exercise, best first.
 *
 * The order, and why each step is where it is:
 *
 * 1. **Different equipment first.** The reason for asking is almost always that
 *    the thing you wanted is occupied, so an answer needing the same machine is
 *    not an answer. Same-equipment substitutes still appear, below.
 * 2. **Then the closest match**, by how many secondary muscles it shares. A
 *    dumbbell bench press works the triceps and shoulders the way a barbell one
 *    does; a cable crossover does not.
 * 3. **Then longest since last performed**, which is the variety rule already
 *    used in browse. Between two equally good substitutes, the one neglected
 *    for a month is the better answer.
 * 4. **Then the name**, so the order never depends on what the database
 *    happened to return.
 *
 * Excluded: the exercise itself, anything already in this workout, and anything
 * outside the gym trim. Suggesting a lift already on today's list, or one
 * needing a kettlebell the gym does not have, wastes the tap that finds it.
 */
export function alternativesFor(
  exercise: Exercise,
  library: Exercise[],
  lastPerformed: Map<string, string>,
  today: string,
  exclude: Set<string> = new Set(),
): Alternative[] {
  return library
    .filter(
      (candidate) =>
        candidate.id !== exercise.id &&
        !exclude.has(candidate.id) &&
        candidate.primary_muscle === exercise.primary_muscle,
    )
    .map((candidate) => ({
      exercise: candidate,
      overlap: overlapWith(exercise, candidate),
      differentEquipment: candidate.equipment !== exercise.equipment,
      days: daysSince(candidate.id, lastPerformed, today),
    }))
    .sort(
      (a, b) =>
        Number(b.differentEquipment) - Number(a.differentEquipment) ||
        b.overlap - a.overlap ||
        staleness(b.days) - staleness(a.days) ||
        a.exercise.name.localeCompare(b.exercise.name),
    );
}

/**
 * How neglected something is, as one comparable number.
 *
 * Never done sorts above everything done, because a substitute you have never
 * tried is the most different thing you could do. Infinity rather than a large
 * constant, so no real gap can ever climb past it.
 */
function staleness(days: number | null): number {
  return days === null ? Number.POSITIVE_INFINITY : days;
}

/**
 * Why this one is being offered, in a few words.
 *
 * The list is a judgement and the owner should be able to see the judgement
 * rather than trust it. Equipment leads because equipment is usually the reason
 * for asking.
 */
export function describeAlternative(alternative: Alternative): string {
  const parts: string[] = [];
  parts.push(alternative.exercise.equipment ?? "Other");

  if (alternative.overlap > 0) {
    parts.push(
      `${alternative.overlap} shared ${alternative.overlap === 1 ? "muscle" : "muscles"}`,
    );
  }

  if (alternative.days === null) parts.push("not done");
  else if (alternative.days === 0) parts.push("done today");
  else if (alternative.days === 1) parts.push("done yesterday");
  else parts.push(`${alternative.days} days ago`);

  return parts.join(" · ");
}

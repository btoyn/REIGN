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
 * Two things order it. Most of it reads tags the library already carries —
 * primary muscle, mechanic, secondary muscles, equipment — and nothing is
 * learned or inferred. Above all of that sits the owner's own pinning, because
 * a rule read off tags is right on average and wrong in particular, and when
 * it is wrong the owner is the one who can say so.
 */

export type Alternative = {
  exercise: Exercise;
  /** Pinned by the owner as a stand-in for this exercise. Beats every tag. */
  pinned: boolean;
  /**
   * Whether it is the same kind of movement: a press for a press rather than a
   * fly for a press. See mechanicScore for what the three values mean.
   */
  mechanic: MechanicMatch;
  /** How many secondary muscles it shares. Higher is a closer substitute. */
  overlap: number;
  /** Whether it needs different equipment, which is usually the whole point. */
  differentEquipment: boolean;
  /** Days since it was last performed, or null if it never has been. */
  days: number | null;
};

/** Same movement kind, unknown on either side, or a different kind. */
export type MechanicMatch = "same" | "unknown" | "different";

/** How many secondary muscles two exercises have in common. */
export function overlapWith(a: Exercise, b: Exercise): number {
  const mine = new Set(a.secondary_muscles ?? []);
  return (b.secondary_muscles ?? []).filter((m) => mine.has(m)).length;
}

/**
 * Whether two exercises are the same kind of movement.
 *
 * 87 of the library's 876 records carry no mechanic. Those are UNKNOWN and
 * never a third kind of exercise: an untagged movement sorts between a match
 * and a mismatch, so a missing tag costs it its place at the top without
 * pretending it is a fly.
 */
export function mechanicMatch(a: Exercise, b: Exercise): MechanicMatch {
  // Falsy rather than strictly null: an absent column and an empty string are
  // the same absence of an answer, and neither is a kind of movement.
  if (!a.mechanic || !b.mechanic) return "unknown";
  return a.mechanic === b.mechanic ? "same" : "different";
}

function mechanicScore(match: MechanicMatch): number {
  return match === "same" ? 2 : match === "unknown" ? 1 : 0;
}

/**
 * Substitutes for one exercise, best first.
 *
 * The order, and why each step is where it is:
 *
 * 1. **Pinned first.** The owner said these two are interchangeable. That is a
 *    judgement made in the gym about their own body, and nothing read off a
 *    tag outranks it. Unpinned substitutes still appear, below.
 * 2. **Then the same kind of movement.** A bench press is replaced by another
 *    press, not by a fly. This sits above equipment because a substitute has
 *    to be the same sort of work first: a dumbbell fly is no answer to a busy
 *    bench however different its equipment is. An untagged movement sorts
 *    between the two, never as a third kind.
 * 3. **Then different equipment.** The reason for asking is almost always that
 *    the thing you wanted is occupied, so an answer needing the same machine
 *    is not an answer. Same-equipment substitutes still appear, below.
 * 4. **Then the closest match**, by how many secondary muscles it shares. A
 *    dumbbell bench press works the triceps and shoulders the way a barbell one
 *    does; a cable crossover does not.
 * 5. **Then longest since last performed**, which is the variety rule already
 *    used in browse. Between two equally good substitutes, the one neglected
 *    for a month is the better answer.
 * 6. **Then the name**, so the order never depends on what the database
 *    happened to return.
 *
 * Excluded: the exercise itself, anything already in this workout, and anything
 * outside the gym trim. Suggesting a lift already on today's list, or one
 * needing a kettlebell the gym does not have, wastes the tap that finds it.
 *
 * ONE EXCEPTION TO THE MUSCLE FILTER: a pinned exercise is offered whatever it
 * trains. The owner pinned it knowing what it is, and a pin that the primary
 * muscle filter then throws away is a setting that silently does nothing.
 */
export function alternativesFor(
  exercise: Exercise,
  library: Exercise[],
  lastPerformed: Map<string, string>,
  today: string,
  exclude: Set<string> = new Set(),
  pinned: Set<string> = new Set(),
): Alternative[] {
  return library
    .filter(
      (candidate) =>
        candidate.id !== exercise.id &&
        !exclude.has(candidate.id) &&
        (pinned.has(candidate.id) ||
          candidate.primary_muscle === exercise.primary_muscle),
    )
    .map((candidate) => ({
      exercise: candidate,
      pinned: pinned.has(candidate.id),
      mechanic: mechanicMatch(exercise, candidate),
      overlap: overlapWith(exercise, candidate),
      differentEquipment: candidate.equipment !== exercise.equipment,
      days: daysSince(candidate.id, lastPerformed, today),
    }))
    .sort(
      (a, b) =>
        Number(b.pinned) - Number(a.pinned) ||
        mechanicScore(b.mechanic) - mechanicScore(a.mechanic) ||
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
 * rather than trust it. Pinned leads when it applies, because it is the reason
 * that overrode everything else; otherwise equipment leads, because equipment
 * is usually the reason for asking.
 *
 * A different mechanic is named and a matching one is not. Everything near the
 * top of the list matches, so saying so on all of them is noise; saying it on
 * the ones that do not is the warning that a fly is not a press.
 */
export function describeAlternative(alternative: Alternative): string {
  const parts: string[] = [];
  if (alternative.pinned) parts.push("Pinned");
  parts.push(alternative.exercise.equipment ?? "Other");

  if (alternative.mechanic === "different") {
    parts.push(alternative.exercise.mechanic ?? "different movement");
  }

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

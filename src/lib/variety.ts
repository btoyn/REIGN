import type { Exercise } from "@/lib/exercises";

/**
 * Variety.
 *
 * The third thing REIGN does, per CLAUDE.md: show every exercise for a muscle,
 * sorted by how long since it was last done, so the ones being neglected rise
 * to the top.
 *
 * This is what turns browse from a catalogue into a suggestion. The owner does
 * not need a list of 50 quad exercises; they need to notice that they have not
 * done a front squat since March.
 */

/** Whole days between two calendar dates, both as YYYY-MM-DD. */
export function daysBetween(earlier: string, later: string): number {
  const a = Date.parse(`${earlier}T00:00:00Z`);
  const b = Date.parse(`${later}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.max(0, Math.round((b - a) / 86_400_000));
}

/**
 * How long ago, in words.
 *
 * Days up to a fortnight, then weeks, then months, because "63 days ago" is a
 * number to decode and "9 weeks" is a fact. Never a date: the question is how
 * long it has been, not when it was.
 */
export function stalenessLabel(days: number | null): string {
  if (days === null) return "Not done";
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `${Math.round(days / 7)} weeks ago`;
  return `${Math.round(days / 30)} months ago`;
}

/** "Barbell · 3 weeks ago", and just the equipment when it has never been done. */
export function describeRow(exercise: Exercise, days: number | null): string {
  const equipment = exercise.equipment ?? exercise.primary_muscle;
  return days === null ? equipment : `${equipment} · ${stalenessLabel(days)}`;
}

/**
 * Sorted so the neglected rise to the top.
 *
 * Two groups, and the order between them is the whole design decision.
 * Exercises done before come first, longest ago at the top, because those are
 * the ones the owner has a relationship with and has let slide. Exercises never
 * done follow, alphabetically.
 *
 * The other way round would bury the useful signal under four hundred
 * movements that have never been touched, which is a catalogue rather than a
 * suggestion.
 */
export function byStaleness(
  exercises: Exercise[],
  lastPerformed: Map<string, string>,
  today: string,
): Exercise[] {
  const done: { exercise: Exercise; days: number }[] = [];
  const never: Exercise[] = [];

  for (const exercise of exercises) {
    const last = lastPerformed.get(exercise.id);
    if (last === undefined) never.push(exercise);
    else done.push({ exercise, days: daysBetween(last, today) });
  }

  done.sort(
    (a, b) => b.days - a.days || a.exercise.name.localeCompare(b.exercise.name),
  );
  never.sort((a, b) => a.name.localeCompare(b.name));

  return [...done.map((d) => d.exercise), ...never];
}

/** Days since an exercise was last done, or null if it never has been. */
export function daysSince(
  exerciseId: string,
  lastPerformed: Map<string, string>,
  today: string,
): number | null {
  const last = lastPerformed.get(exerciseId);
  return last === undefined ? null : daysBetween(last, today);
}

/**
 * How long since anything in a sub-muscle was trained.
 *
 * The most recent of its exercises, not the least: the question at this level
 * is when lats were last worked at all, and one lat pulldown last Monday
 * answers it whatever else in the bucket has sat untouched for a year.
 *
 * Null when nothing in the bucket has ever been done.
 */
export function bucketStaleness(
  exercises: Exercise[],
  lastPerformed: Map<string, string>,
  today: string,
): number | null {
  let fewest: number | null = null;
  for (const exercise of exercises) {
    const days = daysSince(exercise.id, lastPerformed, today);
    if (days !== null && (fewest === null || days < fewest)) fewest = days;
  }
  return fewest;
}

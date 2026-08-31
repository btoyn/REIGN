import { getSupabase } from "@/lib/supabase";

/**
 * What has been done, read back.
 *
 * The first thing CLAUDE.md says REIGN does is remember. Today shows the day
 * you are in; this is everything before it, so a workout is not gone the moment
 * it is finished.
 *
 * Only finished workouts appear. The one in progress belongs on Today, and a
 * workout walked out of is not a record of anything.
 */

export type PastWorkout = {
  id: string;
  /** YYYY-MM-DD. */
  date: string;
  /** The split it was, if the day had one. */
  splitName: string | null;
  exercises: number;
  /** Null when the workout has no start time to measure from. */
  minutes: number | null;
};

export async function fetchWorkoutHistory(): Promise<PastWorkout[]> {
  const supabase = getSupabase();

  const [
    { data: workouts, error: workoutError },
    { data: entries, error: entryError },
  ] = await Promise.all([
    supabase.from("workouts").select("id, date, split_name, started_at, finished_at"),
    supabase.from("workout_exercises").select("workout_id"),
  ]);

  if (workoutError) throw new Error(workoutError.message);
  if (entryError) throw new Error(entryError.message);

  const counts = new Map<string, number>();
  for (const entry of entries ?? []) {
    counts.set(entry.workout_id, (counts.get(entry.workout_id) ?? 0) + 1);
  }

  return (workouts ?? [])
    .filter((w) => w.finished_at !== null)
    .sort((a, b) =>
      (b.started_at ?? b.date).localeCompare(a.started_at ?? a.date),
    )
    .map((w) => ({
      id: w.id,
      date: w.date,
      splitName: w.split_name,
      exercises: counts.get(w.id) ?? 0,
      minutes: elapsedMinutes(w.started_at, w.finished_at),
    }));
}

/**
 * How long a workout took.
 *
 * Null rather than nought when there is nothing to measure from, so the line
 * can leave the duration out entirely rather than claiming it took no time.
 */
export function elapsedMinutes(
  startedAt: string | null,
  finishedAt: string | null,
): number | null {
  if (!startedAt || !finishedAt) return null;
  const start = Date.parse(startedAt);
  const end = Date.parse(finishedAt);
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return null;
  return Math.round((end - start) / 60_000);
}

/**
 * A workout in one line: "5 exercises · 52 min".
 *
 * Assembled here rather than stored, per CLAUDE.md. What was never measured is
 * left out rather than shown as a dash or a nought, the same rule cardio
 * follows.
 */
export function describeWorkout(workout: PastWorkout): string {
  const parts: string[] = [];

  parts.push(
    workout.exercises === 0
      ? "Nothing logged"
      : `${workout.exercises} ${workout.exercises === 1 ? "exercise" : "exercises"}`,
  );

  if (workout.minutes !== null) parts.push(`${workout.minutes} min`);

  return parts.join(" · ");
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/**
 * Dates are read as calendar dates, never as instants.
 *
 * A YYYY-MM-DD string parsed by the Date constructor is treated as UTC, so west
 * of Greenwich it renders as the day before. Splitting the string avoids the
 * whole question: these are dates on a wall calendar, not moments in time.
 */
function parts(date: string): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return null;
  return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) };
}

/** "August 2026", the heading a run of workouts sits under. */
export function monthLabel(date: string): string {
  const p = parts(date);
  if (!p || p.m < 1 || p.m > 12) return date;
  return `${MONTHS[p.m - 1]} ${p.y}`;
}

/** "Saturday 30", which is how a day is picked out within its month. */
export function dayLabel(date: string): string {
  const p = parts(date);
  if (!p) return date;
  const weekday = new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay();
  return `${WEEKDAYS[weekday]} ${p.d}`;
}

/**
 * "12 August 2026", for a date that stands on its own.
 *
 * The history list does not need this: its month heading already carries the
 * month and the year, so its rows say only the weekday and the day. A record
 * has no heading above it and could be from any month of any year, so it says
 * the whole thing. The weekday is left out because on a date two years back it
 * is decoration.
 */
export function shortDate(date: string): string {
  const p = parts(date);
  if (!p || p.m < 1 || p.m > 12) return date;
  return `${p.d} ${MONTHS[p.m - 1]} ${p.y}`;
}

export type Month = { label: string; workouts: PastWorkout[] };

/**
 * The history, under month headings.
 *
 * A year of training is a long list of dates, and a date on its own does not
 * say how long ago it was. The headings give the list a spine without adding a
 * control or another tap.
 *
 * The input is already newest first, so this preserves that order rather than
 * sorting again.
 */
export function byMonth(workouts: PastWorkout[]): Month[] {
  const months: Month[] = [];
  for (const workout of workouts) {
    const label = monthLabel(workout.date);
    const current = months[months.length - 1];
    if (current && current.label === label) current.workouts.push(workout);
    else months.push({ label, workouts: [workout] });
  }
  return months;
}

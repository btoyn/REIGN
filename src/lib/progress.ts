import { getSupabase } from "@/lib/supabase";
import { daysBetween } from "@/lib/variety";

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
  /**
   * Whether the owner has said this reached Apple Health.
   *
   * Kept in the history because the export can fail without saying so: iOS
   * reports nothing back from a shortcuts:// link, so the only way to see which
   * sessions actually made it is to look at the list of them.
   */
  sentToHealth: boolean;
};

export async function fetchWorkoutHistory(): Promise<PastWorkout[]> {
  const supabase = getSupabase();

  const [
    { data: workouts, error: workoutError },
    { data: entries, error: entryError },
  ] = await Promise.all([
    supabase
      .from("workouts")
      // prettier-ignore
      .select("id, date, split_name, started_at, finished_at, sent_to_health"),
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
      sentToHealth: w.sent_to_health,
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

  /*
    The ones that HAVE reached Health are marked, not the ones that have not,
    and the difference matters on the day this ships. Every workout already in
    the history was recorded before the export existed, so marking the unsent
    would put "not in Health" on months of sessions the owner is never going to
    go back and enter — a line on every row, saying nothing, that cannot be
    acted on.

    Marking the sent starts silent and fills in as they are exported, which
    also makes the mark mean something: it is the only evidence the export
    worked, since iOS reports nothing back from a shortcuts:// link.

    A word rather than a colour or a dot. REIGN never signals a state by hue
    alone.
  */
  if (workout.sentToHealth) parts.push("in Health");

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

/**
 * How much training there has actually been lately.
 *
 * A count over a window, never a streak. CLAUDE.md puts streaks out of scope,
 * and rightly: a streak turns one missed Tuesday into a punishment, and this
 * has to survive a week off with a cold.
 *
 * The window before it is shown alongside, because a number on its own says
 * nothing. Fourteen is good or bad depending on what the month before was.
 */
export const CONSISTENCY_DAYS = 28;

export type Consistency = {
  recent: number;
  /** The same window immediately before, or null when there is no history there. */
  previous: number | null;
};

export function consistency(
  workouts: PastWorkout[],
  today: string,
  days: number = CONSISTENCY_DAYS,
): Consistency {
  let recent = 0;
  let previous = 0;
  let anyOlder = false;

  for (const workout of workouts) {
    const ago = daysBetween(workout.date, today);
    if (ago < days) recent += 1;
    else if (ago < days * 2) previous += 1;
    if (ago >= days) anyOlder = true;
  }

  return { recent, previous: anyOlder ? previous : null };
}

/** "14 workouts in the last 4 weeks", with the number given separately. */
export function consistencyLabel(days: number = CONSISTENCY_DAYS): string {
  const weeks = Math.round(days / 7);
  return `workouts in the last ${weeks} weeks`;
}

/** The window before, when there is one to compare against. */
export function describePrevious(c: Consistency): string | null {
  if (c.previous === null) return null;
  return `${c.previous} in the ${Math.round(CONSISTENCY_DAYS / 7)} weeks before that`;
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

import type { CardioSession } from "@/lib/cardio";
import { describeCardio } from "@/lib/cardio";
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
  /**
   * When it started, which orders two things done on the same day.
   *
   * Null for a workout with no start time. The history places those below the
   * ones that have one rather than guessing at an hour.
   */
  startedAt: string | null;
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

  /*
    Unordered. These are merged with the cardio history and ordered alongside
    it by mergeHistory; sorting them here as well would mean the list on screen
    was ordered by two rules and nobody could say which one won.
  */
  return (workouts ?? [])
    .filter((w) => w.finished_at !== null)
    .map((w) => ({
      id: w.id,
      date: w.date,
      splitName: w.split_name,
      exercises: counts.get(w.id) ?? 0,
      startedAt: w.started_at,
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
  done: { date: string }[],
  today: string,
  days: number = CONSISTENCY_DAYS,
): Consistency {
  let recent = 0;
  let previous = 0;
  let anyOlder = false;

  for (const workout of done) {
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

/**
 * One thing that was done, whichever kind it was.
 *
 * The history is one list. A weekday split holds lifting days and riding days
 * and the owner does both in the same week, so "what have I done lately" is
 * one question with one answer. Two lists would mean scrolling to two places
 * and adding them up by eye, and the count above them would agree with neither.
 *
 * A strength row opens the workout, because that screen already shows a
 * finished workout correctly. A ride does not open anything: everything
 * recorded about it is on its one line, and a screen that only repeats the
 * line it was reached from is a tap that gives nothing back.
 */
export type HistoryEntry =
  | { kind: "workout"; id: string; date: string; workout: PastWorkout }
  | { kind: "cardio"; id: string; date: string; cardio: CardioSession };

/** The name of the thing, which is the split for a lift and the machine for a ride. */
export function entryTitle(entry: HistoryEntry): string {
  return entry.kind === "workout"
    ? (entry.workout.splitName ?? "Workout")
    : entry.cardio.type;
}

/**
 * The line under it.
 *
 * A ride's type is already the title, so it is dropped from the description
 * rather than printed twice — "Cycling / Cycling · 55 min" reads as a mistake.
 * If the machine reported nothing but the type, the line says so rather than
 * sitting empty.
 */
export function entryDescription(entry: HistoryEntry): string {
  if (entry.kind === "workout") return describeWorkout(entry.workout);

  const parts = describeCardio(entry.cardio)
    .split(" · ")
    .filter((part) => part !== entry.cardio.type);

  if (parts.length === 0) parts.push("Nothing recorded");
  // Same rule as a workout: the ones that reached Health are marked, in a
  // word rather than a colour, and the ones that have not say nothing.
  if (entry.cardio.sent_to_health) parts.push("in Health");
  return parts.join(" · ");
}

/**
 * The strength history and the cardio history as one list, newest first.
 *
 * Ordered by the calendar date first and only then by the instant, which is
 * the rule the rest of REIGN uses: the date is the day a thing belongs to, and
 * the instant merely separates two things within it. On rows REIGN wrote
 * itself the two agree, because both are stamped at the same moment. They stop
 * agreeing as soon as a UTC instant sits beside a local date that was not
 * written with it, and then the date has to win — it is the day the owner
 * remembers doing the thing on, and it is the day the month heading above the
 * row was chosen from.
 *
 * Anything with no instant sorts below the things on its day that have one: a
 * row that cannot say when it happened should not be placed as though it
 * could.
 *
 * With nothing left, the id decides. Not because an id means anything, but so
 * the order is stated rather than inherited from which of the two lists was
 * concatenated first.
 */
export function mergeHistory(
  workouts: PastWorkout[],
  cardio: CardioSession[],
): HistoryEntry[] {
  const entries: HistoryEntry[] = [
    ...workouts.map(
      (workout): HistoryEntry => ({
        kind: "workout",
        id: workout.id,
        date: workout.date,
        workout,
      }),
    ),
    ...cardio.map(
      (session): HistoryEntry => ({
        kind: "cardio",
        id: session.id,
        date: session.date,
        cardio: session,
      }),
    ),
  ];

  return entries.sort(
    (a, b) =>
      b.date.localeCompare(a.date) ||
      instant(b).localeCompare(instant(a)) ||
      a.id.localeCompare(b.id),
  );
}

/**
 * When within its day, as one comparable string.
 *
 * The empty string for anything that has none, which sorts below every real
 * instant in a newest-first list. That is the honest place for it: a row that
 * cannot say when it happened should not be placed as though it could.
 */
function instant(entry: HistoryEntry): string {
  const at =
    entry.kind === "workout"
      ? entry.workout.startedAt
      : entry.cardio.started_at;
  return at ?? "";
}

export type Month = { label: string; entries: HistoryEntry[] };

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
export function byMonth(entries: HistoryEntry[]): Month[] {
  const months: Month[] = [];
  for (const entry of entries) {
    const label = monthLabel(entry.date);
    const current = months[months.length - 1];
    if (current && current.label === label) current.entries.push(entry);
    else months.push({ label, entries: [entry] });
  }
  return months;
}

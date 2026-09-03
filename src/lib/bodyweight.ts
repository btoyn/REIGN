import { shortDate } from "@/lib/progress";
import { fail } from "@/lib/schema";
import { getSupabase } from "@/lib/supabase";

/**
 * Bodyweight.
 *
 * The one weight REIGN did not hold. Every other number here is a weight on a
 * bar; this is the weight of the person lifting it, and several things are
 * measured against it — not least the Longevity 6 benchmark of "a farmer carry
 * at bodyweight total, half in each hand", which the app could not previously
 * tell the owner the value of.
 *
 * ONE READING PER DAY, enforced by the schema. Stepping on the scales twice on
 * a Tuesday is one weigh-in that got corrected, not two readings to average, so
 * writing again on the same day replaces.
 *
 * NO GOAL WEIGHT, no BMI, no body fat estimate, no prediction. Those are the
 * body-diagram and readiness-score territory CLAUDE.md puts out of scope, and
 * none of them help with a decision made during a workout. What is here is the
 * number, which way it has gone, and by how much.
 *
 * Pounds. There is no unit setting and inventing one before it is asked for
 * would be a feature nobody requested.
 */

export type Weighin = {
  id: string;
  /** YYYY-MM-DD. A weigh-in is a day's reading, not an instant. */
  date: string;
  weight: number;
};

const COLUMNS = "id, date, weight";

/** Every weigh-in, newest first. The current weight heads the block. */
export async function fetchWeighins(): Promise<Weighin[]> {
  const { data, error } = await getSupabase()
    .from("bodyweight")
    .select(COLUMNS)
    .order("date", { ascending: false });

  if (error) fail(error, "bodyweight");
  return data ?? [];
}

/**
 * Record a weigh-in, or correct the one already recorded for that day.
 *
 * Upsert on the date rather than insert, because the schema allows one reading
 * per day and a second attempt is a correction. Without this, mistyping the
 * number would mean deleting a row before fixing it.
 */
export async function logWeight(
  date: string,
  weight: number,
): Promise<Weighin> {
  const { data, error } = await getSupabase()
    .from("bodyweight")
    .upsert({ date, weight }, { onConflict: "date" })
    .select(COLUMNS)
    .single();

  if (error) fail(error, "bodyweight");
  return data;
}

export async function deleteWeighin(id: string): Promise<void> {
  const { error } = await getSupabase()
    .from("bodyweight")
    .delete()
    .eq("id", id);
  if (error) fail(error, "bodyweight");
}

/** The most recent reading, or null before there is one. */
export function latest(weighins: Weighin[]): Weighin | null {
  return weighins.length === 0 ? null : weighins[0];
}

/**
 * "185.4 lb". One decimal only when the scales reported one.
 *
 * Assembled at render, never stored. 185 reads better than 185.0, and 185.4 is
 * the whole point of storing a decimal rather than rounding it away.
 */
export function describeWeight(weight: number): string {
  const rounded = Math.round(weight * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)} lb`;
}

export type Change = {
  /** Pounds moved. Negative is down. */
  delta: number;
  /** The reading it is measured from. */
  from: Weighin;
  to: Weighin;
};

/**
 * How the weight has moved, measured from the oldest reading held.
 *
 * The whole record rather than a fixed window, because the owner weighs in
 * weekly: a "last 30 days" window would hold four points at best and none at
 * all after a fortnight away, and a trend that vanishes when you stop looking
 * is worse than no trend.
 *
 * Null with fewer than two readings. One weigh-in is a number, not a direction,
 * and inventing a change from it would be inventing data.
 */
export function change(weighins: Weighin[]): Change | null {
  if (weighins.length < 2) return null;
  const to = weighins[0];
  const from = weighins[weighins.length - 1];
  return { delta: to.weight - from.weight, from, to };
}

/**
 * "Down 4.2 lb since 17 June 2026", in words.
 *
 * The direction is said rather than shown by a colour or an arrow, because no
 * state in REIGN is signalled by hue alone and a bodyweight line is exactly
 * where a red-versus-green would be both meaningless and presumptuous: down is
 * not automatically good and up is not automatically bad.
 *
 * A move under a tenth of a pound reads as no change rather than as "up 0.0",
 * which is a number that says nothing.
 */
export function describeChange(c: Change | null): string | null {
  if (c === null) return null;
  const since = shortDate(c.from.date);
  const moved = Math.abs(Math.round(c.delta * 10) / 10);
  if (moved < 0.1) return `Same as ${since}`;
  const word = c.delta < 0 ? "Down" : "Up";
  const amount = Number.isInteger(moved) ? moved : moved.toFixed(1);
  return `${word} ${amount} lb since ${since}`;
}

/**
 * The readings as points on a line, oldest first, normalised to 0-1.
 *
 * Returned as numbers rather than as an SVG path so the shape can be tested
 * without a browser, and so the component that draws it holds no arithmetic.
 *
 * x is the position in TIME, not the position in the list. Plotting weekly
 * readings evenly spaced would draw a steady line through a month nothing was
 * recorded in, which is the chart claiming data it does not have.
 *
 * y is inverted so 0 is the bottom of the drawing, which is what an SVG wants.
 *
 * A flat record — every reading identical — sits on the middle line rather than
 * dividing by a zero range.
 */
export type Point = { x: number; y: number; weighin: Weighin };

export function points(weighins: Weighin[]): Point[] {
  if (weighins.length === 0) return [];

  const ordered = [...weighins].reverse();
  const days = ordered.map((w) => dayNumber(w.date));
  const weights = ordered.map((w) => w.weight);

  const spanDays = days[days.length - 1] - days[0];
  const low = Math.min(...weights);
  const high = Math.max(...weights);
  const spanWeight = high - low;

  return ordered.map((weighin, i) => ({
    x: spanDays === 0 ? 0 : (days[i] - days[0]) / spanDays,
    y: spanWeight === 0 ? 0.5 : (weighin.weight - low) / spanWeight,
    weighin,
  }));
}

/**
 * A date as a count of days, for measuring gaps.
 *
 * Built from the parts of the string rather than by parsing it, which is the
 * same rule the rest of REIGN follows: new Date("2026-09-02") is read as UTC
 * midnight and lands on the first of September for anyone west of London.
 */
function dayNumber(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

/** Whether there are enough readings to draw a line between. */
export function canDraw(weighins: Weighin[]): boolean {
  return weighins.length >= 2;
}

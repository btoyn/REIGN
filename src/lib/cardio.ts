import { getSupabase } from "@/lib/supabase";

/**
 * Cardio, entered by hand.
 *
 * There is no Apple Health on the web, so nothing arrives on its own. What is
 * recorded is what the machine's display says at the end, which is why the
 * fields are exactly the ones a cardio machine shows.
 *
 * Only the type and the date are required by the schema. Everything else is
 * whatever the machine happened to report: a bike gives distance, a stair
 * climber does not, and neither gives heart rate without a strap.
 */

export type CardioSession = {
  id: string;
  date: string;
  type: string;
  duration_min: number | null;
  avg_hr: number | null;
  max_hr: number | null;
  calories: number | null;
  distance: number | null;
  /**
   * When the session ran, for Apple Health.
   *
   * A workout knows these because it is a row from the moment it starts. A
   * cardio session is typed in from the machine's display afterwards, so the
   * end is recorded at the moment it is logged and the start is the entered
   * duration before it.
   *
   * Null for anything recorded before the export existed. Inventing instants
   * for those would be worse than admitting there are none.
   */
  started_at: string | null;
  finished_at: string | null;
  /** Whether this reached Health, as stated by the owner. Never set by the app. */
  sent_to_health: boolean;
};

// One string literal, never a concatenation: supabase-js reads it at the type
// level to work out the shape of a row.
// prettier-ignore
const COLUMNS = "id, date, type, duration_min, avg_hr, max_hr, calories, distance, started_at, finished_at, sent_to_health";

/**
 * What can be recorded.
 *
 * Presets rather than a text field, so the same machine is never called two
 * things. Indoor cycling is the owner's main use, and the rest are what a
 * commercial gym floor holds.
 */
export const CARDIO_TYPES = [
  "Cycling",
  "Running",
  "Rowing",
  "Stair climber",
  "Walking",
] as const;

/**
 * Every cardio session, in whatever order the database returns them.
 *
 * Deliberately unordered here. These are merged with the strength history and
 * ordered alongside it, and a list sorted twice by two different rules is a
 * list whose order nobody can account for.
 */
export async function fetchCardioHistory(): Promise<CardioSession[]> {
  const { data, error } = await getSupabase()
    .from("cardio_sessions")
    .select(COLUMNS);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchCardioForDate(
  date: string,
): Promise<CardioSession[]> {
  const { data, error } = await getSupabase()
    .from("cardio_sessions")
    .select(COLUMNS)
    .eq("date", date);

  if (error) throw new Error(error.message);
  return data ?? [];
}

/**
 * Record a cardio session.
 *
 * The two instants are stamped here rather than worked out when the session is
 * read. "The entered duration before now" would give a different answer every
 * time the screen was opened, and the whole point of them is to name the
 * instants the ride actually occupied.
 *
 * They are an honest approximation and the export screen says so: log a ride an
 * hour after getting off the bike and the times will be an hour late. That is
 * visible in the fallback block before anything is sent, which is the moment it
 * can still be corrected by typing the real times into Health.
 */
export async function logCardio(
  session: Omit<
    CardioSession,
    "id" | "started_at" | "finished_at" | "sent_to_health"
  >,
): Promise<CardioSession> {
  const finished = new Date();
  const started =
    session.duration_min === null
      ? null
      : new Date(finished.getTime() - session.duration_min * 60_000);

  const { data, error } = await getSupabase()
    .from("cardio_sessions")
    .insert({
      ...session,
      started_at: started?.toISOString() ?? null,
      finished_at: started === null ? null : finished.toISOString(),
    })
    .select(COLUMNS)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Record that a cardio session reached Apple Health, or that it did not.
 *
 * Set by the owner after they have seen it land. iOS reports nothing back from
 * a shortcuts:// link, so this is the only source for it that is not a guess.
 */
export async function markCardioSentToHealth(
  id: string,
  sent: boolean,
): Promise<void> {
  const { error } = await getSupabase()
    .from("cardio_sessions")
    .update({ sent_to_health: sent })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

export async function deleteCardio(id: string): Promise<void> {
  const { error } = await getSupabase()
    .from("cardio_sessions")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
}

/**
 * "Cycling · 32 min · 148 bpm · 210 cal".
 *
 * Only what was actually recorded. A missing field is left out rather than
 * shown as a dash, because a dash is a number that failed rather than a metric
 * the machine never reported. Assembled here; the database holds numbers.
 */
export function describeCardio(session: CardioSession): string {
  const parts = [session.type];
  if (session.duration_min !== null) parts.push(`${session.duration_min} min`);
  if (session.distance !== null) parts.push(`${session.distance} mi`);
  if (session.avg_hr !== null) parts.push(`${session.avg_hr} bpm`);
  if (session.max_hr !== null) parts.push(`${session.max_hr} max`);
  if (session.calories !== null) parts.push(`${session.calories} cal`);
  return parts.join(" · ");
}

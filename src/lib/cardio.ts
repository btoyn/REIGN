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
};

const COLUMNS =
  "id, date, type, duration_min, avg_hr, max_hr, calories, distance";

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

export async function logCardio(
  session: Omit<CardioSession, "id">,
): Promise<CardioSession> {
  const { data, error } = await getSupabase()
    .from("cardio_sessions")
    .insert(session)
    .select(COLUMNS)
    .single();

  if (error) throw new Error(error.message);
  return data;
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

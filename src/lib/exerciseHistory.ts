import { getSupabase } from "@/lib/supabase";
import type { LoggedSet } from "@/lib/sets";

/**
 * What has been done with one exercise before, grouped by workout.
 *
 * The progression rule reads sessions, not sets: it asks what happened last
 * time and, if that went badly, the time before. So this returns the sets of
 * each past workout containing the exercise, most recent workout first.
 *
 * The workout in progress is excluded. Progression looks at what is finished,
 * not at what is being done right now.
 */

export type Session = {
  workoutId: string;
  date: string;
  /** When the workout began. This is what orders sessions, not the date. */
  startedAt: string | null;
  sets: LoggedSet[];
};

/** Enough history for the rule, which never looks past the last two. */
const SESSIONS = 5;

export async function fetchExerciseSessions(
  exerciseId: string,
  excludeWorkoutId: string,
): Promise<Session[]> {
  const supabase = getSupabase();

  const { data: entries, error: entryError } = await supabase
    .from("workout_exercises")
    .select("id, workout_id")
    .eq("exercise_id", exerciseId);

  if (entryError) throw new Error(entryError.message);

  const past = (entries ?? []).filter((e) => e.workout_id !== excludeWorkoutId);
  if (past.length === 0) return [];

  const [
    { data: workouts, error: workoutError },
    { data: sets, error: setError },
  ] = await Promise.all([
    supabase
      .from("workouts")
      .select("id, date, started_at, finished_at")
      .in(
        "id",
        past.map((e) => e.workout_id),
      ),
    supabase
      .from("sets")
      .select(
        "workout_exercise_id, id, set_number, weight, reps, is_warmup, completed_at",
      )
      .in(
        "workout_exercise_id",
        past.map((e) => e.id),
      )
      .order("set_number"),
  ]);

  if (workoutError) throw new Error(workoutError.message);
  if (setError) throw new Error(setError.message);

  const byWorkout = new Map(
    (workouts ?? [])
      // Only finished workouts. An abandoned one says nothing about what to do
      // next, and half of it may never have been performed.
      .filter((w) => w.finished_at !== null)
      .map((w) => [w.id, w]),
  );

  const sessions: Session[] = [];
  for (const entry of past) {
    const workout = byWorkout.get(entry.workout_id);
    if (!workout) continue;

    const mine = (
      (sets ?? []) as (LoggedSet & {
        workout_exercise_id: string;
      })[]
    ).filter((s) => s.workout_exercise_id === entry.id);

    if (mine.length > 0) {
      sessions.push({
        workoutId: workout.id,
        date: workout.date,
        startedAt: workout.started_at,
        sets: mine,
      });
    }
  }

  /*
    Ordered by when the workout began, not by its date.

    Two workouts on one day share a date, so sorting on the date alone ties and
    the order becomes whatever the database happened to return. That put the
    wrong session first, and the suggestion was then computed from the session
    before last. Found by logging three sessions in one day.
  */
  return sessions
    .sort((a, b) =>
      (b.startedAt ?? b.date).localeCompare(a.startedAt ?? a.date),
    )
    .slice(0, SESSIONS);
}

/** Every set ever logged for this exercise, for judging a record. */
export function allSets(sessions: Session[]): LoggedSet[] {
  return sessions.flatMap((s) => s.sets);
}

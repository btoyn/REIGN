import { getSupabase } from "@/lib/supabase";

/**
 * Workouts.
 *
 * A workout is one training session on one date. It is created the moment
 * START WORKOUT is tapped, so an interrupted session is still there when the
 * app is reopened, and it is finished explicitly rather than by closing the app.
 *
 * split_name is copied onto the workout rather than referenced, so renaming or
 * deleting a split later does not rewrite what was actually trained. It is also
 * what records a one-off `Change today`: the split row still says Chest while
 * the workout says Back.
 */

// One string literal, never a concatenation: supabase-js reads it at the type
// level to work out the shape of a row, and a joined string collapses that to
// a plain string.
// prettier-ignore
const WORKOUT_COLUMNS = "id, date, split_name, started_at, finished_at, sent_to_health";

export type Workout = {
  id: string;
  date: string;
  split_name: string | null;
  started_at: string | null;
  finished_at: string | null;
  /**
   * Whether this has been sent to Apple Health, as stated by the owner.
   *
   * Never set by the app. iOS tells a web page nothing about what happened
   * after it opens a Shortcut, so tapping the button is not evidence the
   * session arrived, and a flag set optimistically would turn "I sent this"
   * into "I pressed a button once".
   */
  sent_to_health: boolean;
};

export type WorkoutExercise = {
  id: string;
  exercise_id: string;
  position: number;
};

/** How much is in a workout. Assembled for display, never stored. */
export type WorkoutCounts = { exercises: number; sets: number };

/**
 * Today's date as the database stores it.
 *
 * Built from the local calendar rather than toISOString, which converts to UTC
 * first and would file an evening workout under tomorrow.
 */
export function todayDate(): string {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

/**
 * The workout for a date, if there is one.
 *
 * Most recent first, so a finished workout followed by nothing reads as done
 * rather than the app losing track. The spec forbids offering to start a second
 * workout while one is unfinished, and this is what that check reads.
 */
export async function fetchWorkoutForDate(
  date: string,
): Promise<Workout | null> {
  const { data, error } = await getSupabase()
    .from("workouts")
    .select(WORKOUT_COLUMNS)
    .eq("date", date)
    .order("started_at", { ascending: false })
    .limit(1);

  if (error) throw new Error(error.message);
  return data?.[0] ?? null;
}

/** One workout by id, or null if it is not there any more. */
export async function fetchWorkoutById(id: string): Promise<Workout | null> {
  const { data, error } = await getSupabase()
    .from("workouts")
    .select(WORKOUT_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export function isInProgress(workout: Workout): boolean {
  return workout.finished_at === null;
}

/**
 * Whether a workout counts as training that actually happened.
 *
 * Finished, or today's while it is still being done. Both halves matter.
 * Without the first, a workout walked out of half way through would make an
 * exercise look performed when it may never have been. Without the second,
 * nothing done in the last hour would count, and the set just logged would be
 * missing from Recent and from records until the workout was closed.
 *
 * An abandoned workout and one in progress are indistinguishable until the day
 * is over, so the date is what separates them.
 *
 * The history list on Progress deliberately does not use this: a workout still
 * in progress belongs on Today, not in the record of what is done.
 */
export function hasBeenPerformed(
  workout: { date: string; finished_at: string | null },
  today: string,
): boolean {
  return workout.finished_at !== null || workout.date === today;
}

/** Minutes between starting and finishing, or null if either is missing. */
export function durationMinutes(workout: Workout): number | null {
  if (!workout.started_at || !workout.finished_at) return null;
  const ms =
    new Date(workout.finished_at).getTime() -
    new Date(workout.started_at).getTime();
  return Math.max(0, Math.round(ms / 60000));
}

export async function startWorkout(
  date: string,
  splitName: string,
): Promise<Workout> {
  const { data, error } = await getSupabase()
    .from("workouts")
    .insert({
      date,
      split_name: splitName,
      started_at: new Date().toISOString(),
    })
    .select(WORKOUT_COLUMNS)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function finishWorkout(id: string): Promise<Workout> {
  const { data, error } = await getSupabase()
    .from("workouts")
    .update({ finished_at: new Date().toISOString() })
    .eq("id", id)
    .select(WORKOUT_COLUMNS)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Delete a workout and everything in it.
 *
 * The exercises and sets go with it through the schema's cascade, so there is
 * nothing orphaned to clean up. This is destructive and unrecoverable, which is
 * why the screen puts a confirmation in front of it.
 */
export async function discardWorkout(id: string): Promise<void> {
  const { error } = await getSupabase().from("workouts").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function fetchWorkoutExercises(
  workoutId: string,
): Promise<WorkoutExercise[]> {
  const { data, error } = await getSupabase()
    .from("workout_exercises")
    .select("id, exercise_id, position")
    .eq("workout_id", workoutId)
    .order("position");

  if (error) throw new Error(error.message);
  return data ?? [];
}

/**
 * What a workout contains, for the one line Today shows about it.
 *
 * Read as two small queries rather than one nested read. The numbers are
 * counted here and the sentence is assembled when rendering; neither is stored.
 */
export async function fetchWorkoutCounts(
  workoutId: string,
): Promise<WorkoutCounts> {
  const exercises = await fetchWorkoutExercises(workoutId);
  if (exercises.length === 0) return { exercises: 0, sets: 0 };

  const { count, error } = await getSupabase()
    .from("sets")
    .select("id", { count: "exact", head: true })
    .in(
      "workout_exercise_id",
      exercises.map((e) => e.id),
    );

  if (error) throw new Error(error.message);
  return { exercises: exercises.length, sets: count ?? 0 };
}

/**
 * Swap one exercise in a workout for another, keeping its place in the order.
 *
 * Only ever offered while nothing has been logged against it. Once a set
 * exists, that exercise was performed, and changing the name over it would
 * rewrite what happened rather than change what is about to. The screen
 * enforces that by hiding the way in; this enforces it by refusing.
 */
export async function swapExercise(
  entryId: string,
  exerciseId: string,
): Promise<void> {
  const { count, error: countError } = await getSupabase()
    .from("sets")
    .select("id", { count: "exact", head: true })
    .eq("workout_exercise_id", entryId);

  if (countError) throw new Error(countError.message);
  if ((count ?? 0) > 0) {
    throw new Error("that exercise has sets logged against it");
  }

  const { error } = await getSupabase()
    .from("workout_exercises")
    .update({ exercise_id: exerciseId })
    .eq("id", entryId);

  if (error) throw new Error(error.message);
}

/** Append an exercise to a workout, after whatever is already in it. */
export async function addExerciseToWorkout(
  workoutId: string,
  exerciseId: string,
): Promise<WorkoutExercise> {
  const existing = await fetchWorkoutExercises(workoutId);
  const position = existing.length;

  const { data, error } = await getSupabase()
    .from("workout_exercises")
    .insert({ workout_id: workoutId, exercise_id: exerciseId, position })
    .select("id, exercise_id, position")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Record that a finished workout reached Apple Health, or that it did not.
 *
 * Set by the owner, by hand, after they have seen it land. This is the only
 * honest source for it: the export leaves through a shortcuts:// link and iOS
 * reports nothing back, so nothing the app can observe distinguishes a Shortcut
 * that wrote the session from one that does not exist.
 *
 * Reversible, because the owner can be wrong about it too.
 */
export async function markWorkoutSentToHealth(
  id: string,
  sent: boolean,
): Promise<void> {
  const { error } = await getSupabase()
    .from("workouts")
    .update({ sent_to_health: sent })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

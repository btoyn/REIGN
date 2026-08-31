import { getSupabase } from "@/lib/supabase";

/**
 * Programs.
 *
 * The weekday split answers "what do I train on a Monday". A program answers
 * something else: a named plan with its own days, each holding chosen exercises
 * with a prescribed number of sets and a rep range.
 *
 * Following one is optional and always has been. With no program active, Today
 * reads the weekday split exactly as it always did, and nothing here is in the
 * way.
 *
 * No program is shipped with REIGN and none ever will be. This reads and writes
 * the owner's own, entered through the picker like anything else, so the stored
 * reference is an ordinary exercises.id.
 */

export type Program = {
  id: string;
  name: string;
  is_active: boolean;
};

export type ProgramDay = {
  id: string;
  program_id: string;
  name: string;
  target_muscles: string[];
  /** The weekday it is assigned to, or null while it is unplaced. */
  day_of_week: number | null;
  /** Storage order for the list. Never shown as a number. */
  position: number;
};

export type ProgramExercise = {
  id: string;
  program_day_id: string;
  exercise_id: string;
  position: number;
  set_count: number;
  target_rep_min: number;
  target_rep_max: number;
};

const PROGRAM_COLUMNS = "id, name, is_active";
const DAY_COLUMNS =
  "id, program_id, name, target_muscles, day_of_week, position";
const EXERCISE_COLUMNS =
  "id, program_day_id, exercise_id, position, set_count, target_rep_min, target_rep_max";

/** "3 × 8-10", assembled when rendering. The database holds three numbers. */
export function describePrescription(exercise: ProgramExercise): string {
  const reps =
    exercise.target_rep_min === exercise.target_rep_max
      ? `${exercise.target_rep_min}`
      : `${exercise.target_rep_min}–${exercise.target_rep_max}`;
  return `${exercise.set_count} × ${reps}`;
}

/** How many days and exercises a program holds, for its one line. */
export function describeProgram(days: number, exercises: number): string {
  const d = `${days} ${days === 1 ? "day" : "days"}`;
  if (exercises === 0) return `${d} · nothing added yet`;
  return `${d} · ${exercises} ${exercises === 1 ? "exercise" : "exercises"}`;
}

export async function fetchPrograms(): Promise<Program[]> {
  const { data, error } = await getSupabase()
    .from("programs")
    .select(PROGRAM_COLUMNS)
    .order("name");

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchProgram(id: string): Promise<Program | null> {
  const { data, error } = await getSupabase()
    .from("programs")
    .select(PROGRAM_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function fetchProgramDays(
  programId: string,
): Promise<ProgramDay[]> {
  const { data, error } = await getSupabase()
    .from("program_days")
    .select(DAY_COLUMNS)
    .eq("program_id", programId)
    .order("position");

  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Every day's exercises, keyed by day, so a program reads in one request. */
export async function fetchProgramExercises(
  dayIds: string[],
): Promise<Map<string, ProgramExercise[]>> {
  const byDay = new Map<string, ProgramExercise[]>();
  if (dayIds.length === 0) return byDay;

  const { data, error } = await getSupabase()
    .from("program_exercises")
    .select(EXERCISE_COLUMNS)
    .in("program_day_id", dayIds)
    .order("position");

  if (error) throw new Error(error.message);

  for (const row of data ?? []) {
    const list = byDay.get(row.program_day_id) ?? [];
    list.push(row);
    byDay.set(row.program_day_id, list);
  }
  return byDay;
}

export async function createProgram(name: string): Promise<Program> {
  const { data, error } = await getSupabase()
    .from("programs")
    .insert({ name, is_active: false })
    .select(PROGRAM_COLUMNS)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

/** The days and their exercises go with it, through the schema's cascade. */
export async function deleteProgram(id: string): Promise<void> {
  const { error } = await getSupabase().from("programs").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/**
 * Follow one program, or none.
 *
 * Two writes rather than one, because the schema allows only one active row and
 * PostgREST has no transaction to do both inside. Clearing first is the safe
 * order: a failure between them leaves nothing active, and with nothing active
 * Today falls back to the weekday split, which is a working state. Doing it the
 * other way round would hit the unique index and fail outright.
 */
export async function followProgram(id: string | null): Promise<void> {
  const supabase = getSupabase();

  const { error: clearError } = await supabase
    .from("programs")
    .update({ is_active: false })
    .eq("is_active", true);

  if (clearError) throw new Error(clearError.message);
  if (id === null) return;

  const { error } = await supabase
    .from("programs")
    .update({ is_active: true })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

export async function addProgramDay(
  programId: string,
  name: string,
  targetMuscles: string[],
  dayOfWeek: number | null,
  position: number,
): Promise<ProgramDay> {
  const { data, error } = await getSupabase()
    .from("program_days")
    .insert({
      program_id: programId,
      name,
      target_muscles: targetMuscles,
      day_of_week: dayOfWeek,
      position,
    })
    .select(DAY_COLUMNS)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function assignDayToWeekday(
  dayId: string,
  dayOfWeek: number | null,
): Promise<void> {
  const { error } = await getSupabase()
    .from("program_days")
    .update({ day_of_week: dayOfWeek })
    .eq("id", dayId);

  if (error) throw new Error(error.message);
}

export async function deleteProgramDay(id: string): Promise<void> {
  const { error } = await getSupabase()
    .from("program_days")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function addProgramExercise(
  dayId: string,
  exerciseId: string,
  position: number,
  setCount: number,
  repMin: number,
  repMax: number,
): Promise<ProgramExercise> {
  const { data, error } = await getSupabase()
    .from("program_exercises")
    .insert({
      program_day_id: dayId,
      exercise_id: exerciseId,
      position,
      set_count: setCount,
      target_rep_min: repMin,
      target_rep_max: repMax,
    })
    .select(EXERCISE_COLUMNS)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteProgramExercise(id: string): Promise<void> {
  const { error } = await getSupabase()
    .from("program_exercises")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
}

/** What is being followed, or null. */
export async function fetchActiveProgram(): Promise<Program | null> {
  const { data, error } = await getSupabase()
    .from("programs")
    .select(PROGRAM_COLUMNS)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export type TodaysProgram = {
  program: Program;
  day: ProgramDay;
};

/**
 * What the active program says about a weekday, if it says anything.
 *
 * Null covers three different situations and deliberately treats them the same,
 * because Today's answer is the same in all of them: no program is being
 * followed, the program has nothing on this weekday, or the read failed. In
 * every case Today falls back to the weekday split, which is what it did before
 * programs existed and is never wrong, only less specific.
 *
 * That is why this returns null rather than throwing. A program is an addition
 * to Today; it must not be able to break it.
 */
export async function fetchTodaysProgram(
  dayOfWeek: number,
): Promise<TodaysProgram | null> {
  try {
    const program = await fetchActiveProgram();
    if (!program) return null;

    const { data, error } = await getSupabase()
      .from("program_days")
      .select(DAY_COLUMNS)
      .eq("program_id", program.id)
      .eq("day_of_week", dayOfWeek)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data ? { program, day: data } : null;
  } catch (e) {
    console.error("could not read the active program", e);
    return null;
  }
}

/**
 * Start a workout from a program day: its exercises, in order, ready to log.
 *
 * This is what following a program actually buys. Without it, following changes
 * a label on Today and nothing else, and the owner still adds five exercises by
 * hand every session.
 *
 * Three requests rather than one per exercise. The ordinary add-one-exercise
 * path re-reads the workout each time to work out the next position, which is
 * two requests per lift and ten for a push day, paid while standing in the gym
 * with the workout not yet on screen. Here the positions are already known.
 */
export async function applyProgramDay(
  workoutId: string,
  dayId: string,
): Promise<number> {
  const supabase = getSupabase();

  const byDay = await fetchProgramExercises([dayId]);
  const prescribed = byDay.get(dayId) ?? [];
  if (prescribed.length === 0) return 0;

  const { error } = await supabase.from("workout_exercises").insert(
    prescribed.map((p, index) => ({
      workout_id: workoutId,
      exercise_id: p.exercise_id,
      position: index,
    })),
  );
  if (error) throw new Error(error.message);

  await seedTargets(prescribed);
  return prescribed.length;
}

/**
 * A program day's rep ranges seed exercise_targets, they do not override it.
 *
 * exercise_targets holds one range per exercise for the whole app, which is the
 * statement that a lift has a rep range. A program day prescribing its own is a
 * different statement, and keeping both would leave double progression reading
 * a row that means different things depending on which day wrote it.
 *
 * So the program's range fills the row in only when there is no row yet. After
 * that the per-exercise row is the truth, which is also how the owner actually
 * progresses: per lift, not per day.
 *
 * A failure here is not worth stopping the workout for. The exercise screen
 * asks for a range when it finds none, which is exactly what it did before
 * programs existed.
 */
async function seedTargets(prescribed: ProgramExercise[]): Promise<void> {
  try {
    const supabase = getSupabase();
    const ids = [...new Set(prescribed.map((p) => p.exercise_id))];

    const { data: existing, error } = await supabase
      .from("exercise_targets")
      .select("exercise_id")
      .in("exercise_id", ids);
    if (error) throw new Error(error.message);

    const known = new Set((existing ?? []).map((row) => row.exercise_id));
    const missing = prescribed.filter((p) => !known.has(p.exercise_id));
    if (missing.length === 0) return;

    // One row per exercise even if two days prescribe it, since the table holds
    // one per exercise and a duplicate insert would fail the whole batch.
    const seen = new Set<string>();
    const rows = missing
      .filter((p) => !seen.has(p.exercise_id) && seen.add(p.exercise_id))
      .map((p) => ({
        exercise_id: p.exercise_id,
        target_rep_min: p.target_rep_min,
        target_rep_max: p.target_rep_max,
        current_weight: null,
      }));

    const { error: writeError } = await supabase
      .from("exercise_targets")
      .insert(rows);
    if (writeError) throw new Error(writeError.message);
  } catch (e) {
    console.error("could not seed the rep ranges from the program", e);
  }
}

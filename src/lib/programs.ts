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
 * No program is shipped inside the app, and none ever will be. What the owner
 * follows lives in their database: entered through the picker, or loaded once
 * by a script they run themselves, which is how both of the programs they
 * follow got there. The stored reference is an ordinary exercises.id either
 * way.
 *
 * A program used to be a name and a list of lifting days, because the plan it
 * was built for was all barbells. It can now also say what KIND each day is —
 * strength, zone 2, VO2 max, rest — carry a cardio prescription instead of
 * exercises, prescribe in seconds rather than reps, prescribe rest, and open
 * every day with a stability block that is not sets at all.
 */

/**
 * What kind of training a day is.
 *
 * Everything REIGN could describe before was strength, because the plan it was
 * built for was all barbells. A plan built around several kinds of training
 * needs to say which kind a day is, or Today has to guess from whether the day
 * happens to have exercises in it.
 */
export type DayKind = "strength" | "zone2" | "vo2max" | "rest";

export type Program = {
  id: string;
  name: string;
  is_active: boolean;
  /** A sentence about what the plan is for, or null. */
  description: string | null;
  /** Standing notes for the whole plan. Empty rather than null when there are none. */
  notes: string[];
};

export type ProgramDay = {
  id: string;
  program_id: string;
  name: string;
  kind: DayKind;
  target_muscles: string[];
  /** The weekday it is assigned to, or null while it is unplaced. */
  day_of_week: number | null;
  /** Storage order for the list. Never shown as a number. */
  position: number;
  /** What governs the whole session, or null. */
  notes: string | null;
};

export type ProgramExercise = {
  id: string;
  program_day_id: string;
  exercise_id: string;
  position: number;
  set_count: number;
  /** Null when the target is failure rather than a number. */
  target_rep_min: number | null;
  target_rep_max: number | null;
  /** Whether those numbers are reps or seconds. A carry is prescribed in time. */
  unit: "reps" | "seconds";
  /** Whether the prescription is per side, which is twice the work. */
  per_side: boolean;
  /** For the prescriptions whose target is failure. */
  to_failure: boolean;
  /** How long to rest after each set, or null when it is not prescribed. */
  rest_seconds: number | null;
  /** A tempo, an accepted substitution, which set to slow down. */
  notes: string | null;
};

/**
 * A day that is a machine and a length of time.
 *
 * One row per cardio day rather than nine columns on every day that are empty
 * for all the lifting ones. A day may have this AND exercises: forty-five
 * minutes on the bike followed by three sets of carries is one day, not two.
 */
export type DayCardio = {
  program_day_id: string;
  machine: string;
  /** The steady portion, as the range it was written as. */
  steady_min_low: number | null;
  steady_min_high: number | null;
  /** The interval structure, all five together or none of them. */
  warmup_min: number | null;
  work_min: number | null;
  easy_min: number | null;
  rounds: number | null;
  cooldown_min: number | null;
};

/**
 * One line of the block that opens every day.
 *
 * Held against the program rather than copied onto each of its days, because it
 * is the same block every day and seven copies would mean seven edits.
 *
 * The prescription is words rather than numbers, which is the one place in
 * REIGN that happens. It is not a display string assembled from stored numbers
 * — there are no numbers underneath it. "Two minutes of breathing" is not sets
 * and reps and forcing it into them would invent precision that is not there.
 */
export type StabilityItem = {
  id: string;
  program_id: string;
  position: number;
  name: string;
  prescription: string;
  /** Band work belongs to a lifting day, not to a bike ride. */
  strength_only: boolean;
};

const PROGRAM_COLUMNS = "id, name, is_active, description, notes";
const DAY_COLUMNS =
  "id, program_id, name, kind, target_muscles, day_of_week, position, notes";
// One string literal each, never a concatenation. supabase-js reads these at
// the type level to work out the shape of what comes back, and it can only do
// that with a literal: joining two halves with + turns the result into a plain
// string and every row arrives as an error type instead of a row.
// prettier-ignore
const EXERCISE_COLUMNS = "id, program_day_id, exercise_id, position, set_count, target_rep_min, target_rep_max, unit, per_side, to_failure, rest_seconds, notes";
// prettier-ignore
const CARDIO_COLUMNS = "program_day_id, machine, steady_min_low, steady_min_high, warmup_min, work_min, easy_min, rounds, cooldown_min";
const STABILITY_COLUMNS =
  "id, program_id, position, name, prescription, strength_only";

/**
 * "3 × 8–10", "3 × 45s per side", "2 × to failure".
 *
 * Assembled when rendering. The database holds numbers and three facts about
 * them: whether they are reps or seconds, whether they are per side, and
 * whether there is a target at all.
 */
export function describePrescription(exercise: ProgramExercise): string {
  const amount = prescribedAmount(exercise);
  const side = exercise.per_side ? " per side" : "";
  return `${exercise.set_count} × ${amount}${side}`;
}

/** The middle of a prescription: the number and what it counts. */
function prescribedAmount(exercise: ProgramExercise): string {
  // No target, because the target is failure. Said in words rather than as a
  // number, since there is no number.
  if (exercise.to_failure) return "to failure";

  const { target_rep_min: min, target_rep_max: max } = exercise;
  if (min === null || max === null) return "as prescribed";

  const range = min === max ? `${min}` : `${min}–${max}`;
  // Seconds carry their unit; reps are the default and do not need saying,
  // which is how every rep range in REIGN has always read.
  return exercise.unit === "seconds" ? `${range}s` : range;
}

/**
 * A cardio day, in one line.
 *
 * "45–55 min steady" or "10 min easy · 4 × 4 min hard / 4 min easy · 10 min
 * easy". Both are assembled from stored numbers, never stored as text.
 *
 * A range stays a range. "45 to 55 minutes" means the session can be either,
 * and showing its midpoint would be a number nobody chose.
 */
export function describeCardioPlan(cardio: DayCardio): string {
  const parts: string[] = [];

  if (cardio.steady_min_low !== null) {
    const span =
      cardio.steady_min_high === null ||
      cardio.steady_min_high === cardio.steady_min_low
        ? `${cardio.steady_min_low}`
        : `${cardio.steady_min_low}–${cardio.steady_min_high}`;
    parts.push(`${span} min steady`);
  }

  if (cardio.warmup_min !== null) {
    parts.push(`${cardio.warmup_min} min easy`);
    parts.push(
      `${cardio.rounds} × ${cardio.work_min} min hard / ${cardio.easy_min} min easy`,
    );
    parts.push(`${cardio.cooldown_min} min easy`);
  }

  return parts.join(" · ");
}

/**
 * How long a cardio day takes, end to end.
 *
 * The interval days need this because their length is the sum of their parts
 * and nobody should have to add it up while deciding whether they have time.
 * A range gives its longest, since that is the one that has to fit.
 */
export function cardioMinutes(cardio: DayCardio): number | null {
  if (cardio.warmup_min !== null) {
    return (
      cardio.warmup_min +
      (cardio.rounds ?? 0) * ((cardio.work_min ?? 0) + (cardio.easy_min ?? 0)) +
      (cardio.cooldown_min ?? 0)
    );
  }
  return cardio.steady_min_high ?? cardio.steady_min_low;
}

/** Whether a day is done on a machine rather than under a bar. */
export function isCardioDay(kind: DayKind): boolean {
  return kind === "zone2" || kind === "vo2max";
}

/**
 * What a day is called when it is not called by its name.
 *
 * Used where the kind matters more than the label, and never as the day's own
 * heading: the day is called Zone 2 because the owner called it that.
 */
export function describeKind(kind: DayKind): string {
  if (kind === "zone2") return "Zone 2";
  if (kind === "vo2max") return "VO2 max";
  if (kind === "rest") return "Rest";
  return "Strength";
}

/**
 * The stability block as it applies to one kind of day.
 *
 * The band work at the end prepares a shoulder for pressing and pulling, so it
 * appears on lifting days and not on a bike ride. Everything else is every day.
 */
export function stabilityFor(
  items: StabilityItem[],
  kind: DayKind,
): StabilityItem[] {
  return items.filter((item) => !item.strength_only || kind === "strength");
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

/**
 * The cardio prescriptions for a set of days, keyed by day.
 *
 * Read in one request beside the exercises, because a day may hold both and two
 * round trips to draw one screen is two round trips paid standing in a gym.
 */
export async function fetchDayCardio(
  dayIds: string[],
): Promise<Map<string, DayCardio>> {
  const byDay = new Map<string, DayCardio>();
  if (dayIds.length === 0) return byDay;

  const { data, error } = await getSupabase()
    .from("program_day_cardio")
    .select(CARDIO_COLUMNS)
    .in("program_day_id", dayIds);

  if (error) throw new Error(error.message);
  for (const row of data ?? []) byDay.set(row.program_day_id, row);
  return byDay;
}

/** The block that opens every day of a program, in order. */
export async function fetchStabilityItems(
  programId: string,
): Promise<StabilityItem[]> {
  const { data, error } = await getSupabase()
    .from("program_stability_items")
    .select(STABILITY_COLUMNS)
    .eq("program_id", programId)
    .order("position");

  if (error) throw new Error(error.message);
  return data ?? [];
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
  /** The machine and the minutes, when today is a cardio day. */
  cardio: DayCardio | null;
  /** The block that opens the day, already filtered to this day's kind. */
  stability: StabilityItem[];
  /** How many exercises the day prescribes, which decides Today's one action. */
  exerciseCount: number;
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
    if (!data) return null;

    /*
      Everything Today needs about the day, read together. Which action Today
      offers depends on whether the day has exercises — a bike day with none
      cannot be started as a workout — so the count is part of the answer
      rather than something the screen goes back for.
    */
    const [cardioByDay, stability, exercisesByDay] = await Promise.all([
      fetchDayCardio([data.id]),
      fetchStabilityItems(program.id),
      fetchProgramExercises([data.id]),
    ]);

    return {
      program,
      day: data,
      cardio: cardioByDay.get(data.id) ?? null,
      stability: stabilityFor(stability, data.kind),
      exerciseCount: (exercisesByDay.get(data.id) ?? []).length,
    };
  } catch (e) {
    console.error("could not read the active program", e);
    return null;
  }
}

/**
 * How long the active program says to rest after a set of this exercise.
 *
 * Read by the exercise screen so the rest timer can say what it is counting
 * towards. Null covers every reason there is no answer — no program, the
 * exercise is not in it, the read failed — because the timer behaves the same
 * way in all of them: it counts, and says nothing about a target it does not
 * have.
 *
 * Never throws, for the same reason fetchTodaysProgram does not. A rest target
 * is an addition to the logging screen and must not be able to break it.
 *
 * An exercise can appear on more than one day with different rests, so the day
 * matching today's weekday wins. Failing that, the first is used: two rests for
 * the same lift is a near-tie, and guessing wrong costs the owner nothing but a
 * number they can ignore.
 */
export async function fetchPrescribedRest(
  exerciseId: string,
  dayOfWeek: number,
): Promise<number | null> {
  try {
    const program = await fetchActiveProgram();
    if (!program) return null;

    const days = await fetchProgramDays(program.id);
    if (days.length === 0) return null;

    const byDay = await fetchProgramExercises(days.map((d) => d.id));
    const today = days.find((d) => d.day_of_week === dayOfWeek);

    const search = today
      ? [today, ...days.filter((d) => d.id !== today.id)]
      : days;

    for (const day of search) {
      const match = (byDay.get(day.id) ?? []).find(
        (p) => p.exercise_id === exerciseId,
      );
      if (match?.rest_seconds != null) return match.rest_seconds;
    }
    return null;
  } catch (e) {
    console.error("could not read the prescribed rest", e);
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
/**
 * Whether a prescription can become a rep range, which not all of them can.
 *
 * exercise_targets holds a REP range, and double progression reads it as one.
 * Two of the shapes a program can now prescribe are not rep ranges and would
 * be a lie stored in that column:
 *
 *   * A carry is prescribed in seconds. Copying "45" into target_rep_min would
 *     mean the app suggesting 45 reps of a suitcase carry for ever after.
 *   * A dead hang has no target at all, and the column cannot hold that.
 *
 * Both are left without a row, which is a state the app already handles: the
 * exercise screen asks for a range the first time it finds none. That is the
 * right question for a carry, and the answer the owner gives is a real one.
 */
function seedable(prescribed: ProgramExercise): boolean {
  return (
    prescribed.unit === "reps" &&
    !prescribed.to_failure &&
    prescribed.target_rep_min !== null &&
    prescribed.target_rep_max !== null
  );
}

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
    const missing = prescribed.filter(
      (p) => !known.has(p.exercise_id) && seedable(p),
    );
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

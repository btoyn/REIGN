"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";

import { CardioPlan } from "@/components/CardioPlan";
import { ExercisePicker } from "@/components/ExercisePicker";
import { StabilityBlock } from "@/components/StabilityBlock";
import { ScreenTitle } from "@/components/ScreenTitle";
import { Skeleton } from "@/components/Skeleton";
import {
  choice,
  primaryAction,
  quiet,
  secondaryAction,
} from "@/components/controls";
import { Exercise, fetchExercisesByIds } from "@/lib/exercises";
import {
  DayCardio,
  ProgramDay,
  ProgramExercise,
  StabilityItem,
  addProgramExercise,
  assignDayToWeekday,
  deleteProgramDay,
  deleteProgramExercise,
  describeKind,
  describePrescription,
  fetchDayCardio,
  fetchProgramDays,
  fetchProgramExercises,
  fetchStabilityItems,
  stabilityFor,
} from "@/lib/programs";
import { WEEKDAYS, WEEK_IN_READING_ORDER } from "@/lib/splits";
import { RANGE_PRESETS } from "@/lib/targets";

/**
 * One day of a program: what it prescribes, and which weekday it falls on.
 *
 * The prescription is a number of sets and a rep range. It is what the program
 * asks for, not what gets logged, which is why the column behind it is
 * set_count rather than sets.
 *
 * The rep range uses the same four presets the exercise screen offers when a
 * lift is logged for the first time. One list of ranges in the app rather than
 * two that could drift apart, and it means a program's range and a lift's range
 * are the same kind of thing — which they are, because the program's seeds it.
 */

/** How many sets a program day usually asks for. */
const SET_COUNTS = [2, 3, 4, 5];

type State =
  | { status: "loading" }
  | { status: "error" }
  | { status: "missing" }
  | {
      status: "ready";
      day: ProgramDay;
      exercises: ProgramExercise[];
      library: Map<string, Exercise>;
      /** The machine and the minutes, when the day is one. */
      cardio: DayCardio | null;
      /** The block that opens the day, already filtered to this day's kind. */
      stability: StabilityItem[];
    };

export default function ProgramDayPage({
  params,
}: PageProps<"/program/[id]/day/[dayId]">) {
  const { id, dayId } = use(params);
  const router = useRouter();
  const [state, setState] = useState<State>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  /** The exercise chosen from the picker, waiting for its prescription. */
  const [pending, setPending] = useState<Exercise | null>(null);
  const [picking, setPicking] = useState(false);
  const [placing, setPlacing] = useState(false);
  /*
    How many sets, chosen before the rep range. Three is the default because it
    is what most programs ask for, and a default that is usually right beats an
    empty choice that always costs a tap.
  */
  const [sets, setSets] = useState(3);

  useEffect(() => {
    let active = true;

    fetchProgramDays(id)
      .then(async (days) => {
        const day = days.find((d) => d.id === dayId);
        if (!day) {
          if (active) setState({ status: "missing" });
          return;
        }
        const [byDay, cardioByDay, stability] = await Promise.all([
          fetchProgramExercises([day.id]),
          fetchDayCardio([day.id]),
          fetchStabilityItems(id),
        ]);
        const exercises = byDay.get(day.id) ?? [];
        const library = await fetchExercisesByIds(
          exercises.map((e) => e.exercise_id),
        );
        if (active)
          setState({
            status: "ready",
            day,
            exercises,
            library,
            cardio: cardioByDay.get(day.id) ?? null,
            stability: stabilityFor(stability, day.kind),
          });
      })
      .catch((e: Error) => {
        if (!active) return;
        console.error("the program day failed to load", e);
        setState({ status: "error" });
      });

    return () => {
      active = false;
    };
  }, [id, dayId, attempt]);

  function reload() {
    setState({ status: "loading" });
    setAttempt((n) => n + 1);
  }

  async function prescribe(setCount: number, min: number, max: number) {
    if (state.status !== "ready" || !pending) return;
    setBusy("prescribe");
    try {
      await addProgramExercise(
        state.day.id,
        pending.id,
        state.exercises.length,
        setCount,
        min,
        max,
      );
      setPending(null);
      reload();
    } catch (e) {
      console.error("could not add the exercise", e);
      setState({ status: "error" });
    } finally {
      setBusy(null);
    }
  }

  async function place(dayOfWeek: number | null) {
    if (state.status !== "ready") return;
    setBusy("place");
    try {
      await assignDayToWeekday(state.day.id, dayOfWeek);
      setPlacing(false);
      reload();
    } catch (e) {
      /*
        The schema allows one day of a program per weekday. Another day already
        holding this one is the likely cause, and it is worth saying so rather
        than blaming the connection.
      */
      console.error("could not place the day", e);
      setState({ status: "error" });
    } finally {
      setBusy(null);
    }
  }

  async function removeExercise(exerciseId: string) {
    setBusy(exerciseId);
    try {
      await deleteProgramExercise(exerciseId);
      reload();
    } catch (e) {
      console.error("could not remove the exercise", e);
      setState({ status: "error" });
    } finally {
      setBusy(null);
    }
  }

  async function removeDay() {
    setBusy("delete");
    try {
      await deleteProgramDay(dayId);
      router.push(`/program/${id}`);
    } catch (e) {
      console.error("could not delete the day", e);
      setState({ status: "error" });
      setBusy(null);
    }
  }

  if (state.status === "loading") {
    return (
      <div
        className="flex flex-col gap-3"
        aria-busy="true"
        aria-label="Loading"
      >
        <ScreenTitle>Program</ScreenTitle>
        <Skeleton className="mt-4 h-[42px] w-2/3" />
        <Skeleton className="mt-4 h-6 w-full" />
        <Skeleton className="h-6 w-4/5" />
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="flex flex-col gap-5">
        <ScreenTitle>Program</ScreenTitle>
        <div className="flex flex-col gap-2">
          <p role="alert" className="text-lead text-ink">
            Could not load this day.
          </p>
          <p className="text-body text-muted">
            Check your connection and try again. Nothing has been lost.
          </p>
        </div>
        <button type="button" onClick={reload} className={secondaryAction}>
          Try again
        </button>
      </div>
    );
  }

  if (state.status === "missing") {
    return (
      <div className="flex flex-col gap-5">
        <ScreenTitle>Program</ScreenTitle>
        <p className="text-lead text-ink">This day is gone.</p>
        <Link href={`/program/${id}`} className={secondaryAction}>
          Back to the program
        </Link>
      </div>
    );
  }

  const { day, exercises, library, cardio, stability } = state;

  /* Picking an exercise, then saying what the day asks of it. */
  if (pending) {
    return (
      <div className="flex flex-col gap-5">
        <ScreenTitle>Program</ScreenTitle>
        <div className="flex flex-col gap-2">
          <p className="text-lead text-ink">{pending.name}</p>
          <p className="text-body text-muted">
            How many sets, and the rep range this day asks for.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-label text-muted uppercase">Sets</p>
          <div className="grid grid-cols-4 gap-3">
            {SET_COUNTS.map((n) => (
              <button
                key={n}
                type="button"
                disabled={busy !== null}
                onClick={() => setSets(n)}
                className={
                  sets === n
                    ? `${choice} border-accent text-accent justify-center font-bold`
                    : `${choice} justify-center`
                }
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-label text-muted uppercase">Reps</p>
          <div className="grid grid-cols-2 gap-3">
            {RANGE_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                disabled={busy !== null}
                onClick={() =>
                  prescribe(sets, preset.range.min, preset.range.max)
                }
                className={`${choice} justify-center`}
              >
                {busy === "prescribe" ? "Saving" : preset.label}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setPending(null)}
          className={`${quiet} self-start`}
        >
          Cancel
        </button>
      </div>
    );
  }

  if (picking) {
    return (
      <div className="flex flex-col gap-5">
        <ScreenTitle>Program</ScreenTitle>
        <ExercisePicker
          picking={null}
          onPick={(exercise) => {
            setPicking(false);
            setPending(exercise);
          }}
        />
        <button
          type="button"
          onClick={() => setPicking(false)}
          className={`${quiet} self-start`}
        >
          Cancel
        </button>
      </div>
    );
  }

  if (placing) {
    return (
      <div className="flex flex-col gap-5">
        <ScreenTitle>Program</ScreenTitle>
        <div className="flex flex-col gap-2">
          <p className="text-lead text-ink">Which weekday is {day.name}?</p>
          <p className="text-body text-muted">
            Only one day of a program can hold a weekday. Leave it unplaced if
            you have not decided.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {WEEK_IN_READING_ORDER.map((n) => (
            <button
              key={n}
              type="button"
              disabled={busy !== null}
              onClick={() => place(n)}
              className={
                day.day_of_week === n
                  ? `${choice} border-accent text-accent font-bold`
                  : choice
              }
            >
              {WEEKDAYS[n]}
            </button>
          ))}
        </div>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => place(null)}
          className={`${choice} text-body text-muted`}
        >
          Leave it unplaced
        </button>
        <button
          type="button"
          onClick={() => setPlacing(false)}
          className={`${quiet} self-start`}
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <ScreenTitle>Program</ScreenTitle>

      <Link
        href={`/program/${id}`}
        className="text-label text-muted self-start uppercase underline underline-offset-4"
      >
        ← Back to the program
      </Link>

      <div className="mt-2 flex flex-col gap-1">
        <p className="text-display text-ink font-condensed uppercase">
          {day.name}
        </p>
        <button
          type="button"
          onClick={() => setPlacing(true)}
          className="text-body text-muted self-start underline underline-offset-4"
        >
          {/*
            What kind of training the day is, beside where it falls. A day
            called Zone 2 says it in its name; a day called Strength A does
            not say whether it is lifting or riding, and now it can be either.
          */}
          {describeKind(day.kind)} ·{" "}
          {day.day_of_week === null
            ? "not placed in the week"
            : `every ${WEEKDAYS[day.day_of_week]}`}
        </button>
      </div>

      {/* What governs the whole session, when the program says so. */}
      {day.notes ? (
        <p className="text-body text-muted mt-2">{day.notes}</p>
      ) : null}

      {/*
        The bike ride, when there is one. A zone 2 day rendered as an empty
        exercise list before this: a day that looked like it had nothing in it.
      */}
      {cardio ? (
        <div className="mt-6">
          <CardioPlan cardio={cardio} />
        </div>
      ) : null}

      {/*
        The block that opens the day, collapsed to one line. Seven items
        expanded at the top of every day would push the training below the fold
        and make six different days look alike.
      */}
      {stability.length > 0 ? (
        <div className="mt-6">
          <StabilityBlock items={stability} />
        </div>
      ) : null}

      <div className="mt-6 flex flex-col gap-2">
        <p className="text-label text-muted uppercase">
          {cardio && exercises.length === 0 ? "Lifting" : "What it asks for"}
        </p>

        {exercises.length === 0 ? (
          /*
            Two different empty lists. A strength day with no exercises is
            unfinished; a bike day with none is complete, because the ride
            above IS the day. Saying "nothing yet" on a zone 2 day would be the
            screen calling a finished day a mistake.
          */
          <p className="text-body text-muted">
            {cardio
              ? "Nothing to lift on this day."
              : "Nothing yet. Add the exercises this day is made of."}
          </p>
        ) : (
          <ul>
            {exercises.map((exercise, index) => (
              <li
                key={exercise.id}
                className="border-border flex items-baseline justify-between gap-4 border-b py-4 last:border-b-0"
              >
                <span className="flex items-baseline gap-4">
                  <span className="text-body text-muted w-5 shrink-0">
                    {index + 1}
                  </span>
                  <span className="flex flex-col gap-1">
                    <span className="text-lead text-ink">
                      {library.get(exercise.exercise_id)?.name ??
                        exercise.exercise_id}
                    </span>
                    <span className="text-body text-muted">
                      {/*
                        Sets, the amount, and how long to rest. The rest is
                        part of the prescription rather than a separate line:
                        90 seconds and 180 seconds are different programs, and
                        they are read together or not at all.
                      */}
                      {describePrescription(exercise)}
                      {exercise.rest_seconds !== null
                        ? ` · ${describeRest(exercise.rest_seconds)} rest`
                        : ""}
                    </span>
                    {/*
                      A tempo, an accepted substitution, which set to slow
                      down. Kept under the prescription because it modifies it.
                    */}
                    {exercise.notes ? (
                      <span className="text-body text-muted">
                        {exercise.notes}
                      </span>
                    ) : null}
                  </span>
                </span>
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => removeExercise(exercise.id)}
                  className={`${quiet} shrink-0`}
                >
                  {busy === exercise.id ? "Removing" : "Remove"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        type="button"
        onClick={() => setPicking(true)}
        className={`${primaryAction} mt-4`}
      >
        Add Exercise
      </button>

      <button
        type="button"
        disabled={busy !== null}
        onClick={removeDay}
        className={`${quiet} mt-2 self-start`}
      >
        {busy === "delete" ? "Deleting" : "Delete this day"}
      </button>
    </div>
  );
}

/**
 * A prescribed rest, in the units it was written in.
 *
 * "90s" under two minutes and "3 min" at or above it, because 180s is read as a
 * number to convert and three minutes is read as a length of time. The database
 * holds seconds either way; this is assembled at render, like every other
 * duration in REIGN.
 */
function describeRest(seconds: number): string {
  if (seconds < 120) return `${seconds}s`;
  const minutes = seconds / 60;
  return `${Number.isInteger(minutes) ? minutes : minutes.toFixed(1)} min`;
}

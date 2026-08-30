"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";

import { ScreenTitle } from "@/components/ScreenTitle";
import { Skeleton } from "@/components/Skeleton";
import { primaryAction, quiet, secondaryAction } from "@/components/controls";
import { Exercise, fetchExercisesByIds } from "@/lib/exercises";
import {
  dayLabel,
  elapsedMinutes,
  monthLabel,
} from "@/lib/progress";
import { LoggedSet, fetchSetsForEntries } from "@/lib/sets";
import {
  Workout,
  WorkoutExercise,
  fetchWorkoutById,
  fetchWorkoutExercises,
  finishWorkout,
  isInProgress,
} from "@/lib/workouts";

/**
 * The workout in progress.
 *
 * Reached from START WORKOUT and from RESUME WORKOUT, which are the same
 * screen: a workout is a row in the database from the moment it starts, so
 * closing the app mid-session loses nothing.
 *
 * A finished workout is the same screen with its controls gone, which is why
 * Progress links straight here rather than to a second read-only view of the
 * same rows.
 */

type Data =
  | { status: "loading" }
  | { status: "error" }
  | { status: "missing" }
  | {
      status: "ready";
      workout: Workout;
      exercises: WorkoutExercise[];
      library: Map<string, Exercise>;
      setsByEntry: Map<string, LoggedSet[]>;
    };

export default function WorkoutPage({ params }: PageProps<"/workout/[id]">) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<Data>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;

    fetchWorkoutById(id)
      .then(async (workout) => {
        if (!workout) {
          if (active) setData({ status: "missing" });
          return;
        }
        const exercises = await fetchWorkoutExercises(workout.id);
        const [library, setsByEntry] = await Promise.all([
          fetchExercisesByIds(exercises.map((e) => e.exercise_id)),
          fetchSetsForEntries(exercises.map((e) => e.id)),
        ]);
        if (active)
          setData({
            status: "ready",
            workout,
            exercises,
            library,
            setsByEntry,
          });
      })
      .catch((e: Error) => {
        /*
          Nothing is reported once the screen has gone. A request abandoned by
          navigating away rejects like any other failure, but there is nobody
          left to tell and no state left to set, so saying so in the console
          only buries the failures that do matter.
        */
        if (!active) return;
        console.error("workout failed to load", e);
        setData({ status: "error" });
      });

    return () => {
      active = false;
    };
  }, [id, attempt]);

  function retry() {
    setData({ status: "loading" });
    setAttempt((n) => n + 1);
  }

  async function finish() {
    if (data.status !== "ready") return;
    setBusy(true);
    try {
      await finishWorkout(data.workout.id);
      router.push("/");
    } catch (e) {
      console.error("finishWorkout failed", e);
      setData({ status: "error" });
      setBusy(false);
    }
  }

  if (data.status === "loading") {
    return (
      <div
        className="flex flex-col gap-3"
        aria-busy="true"
        aria-label="Loading"
      >
        <ScreenTitle>Workout</ScreenTitle>
        <Skeleton className="h-[42px] w-2/3" />
        <Skeleton className="mt-5 h-6 w-full" />
        <Skeleton className="h-6 w-4/5" />
      </div>
    );
  }

  if (data.status === "error") {
    return (
      <div className="flex flex-col gap-5">
        <ScreenTitle>Workout</ScreenTitle>
        <div className="flex flex-col gap-2">
          <p role="alert" className="text-lead text-ink">
            Could not load this workout.
          </p>
          <p className="text-body text-muted">
            Check your connection and try again. Nothing has been lost.
          </p>
        </div>
        <button type="button" onClick={retry} className={secondaryAction}>
          Try again
        </button>
      </div>
    );
  }

  /*
    A workout that is not there. Reached by an old link, or by discarding one
    from Today and then going back. It says which rather than pretending to
    load forever.
  */
  if (data.status === "missing") {
    return (
      <div className="flex flex-col gap-5">
        <ScreenTitle>Workout</ScreenTitle>
        <div className="flex flex-col gap-2">
          <p className="text-lead text-ink">This workout is gone.</p>
          <p className="text-body text-muted">
            It was discarded, or the link is old.
          </p>
        </div>
        <Link href="/" className={secondaryAction}>
          Back to Today
        </Link>
      </div>
    );
  }

  const { workout, exercises, library, setsByEntry } = data;
  const finished = !isInProgress(workout);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <ScreenTitle>Workout</ScreenTitle>
        <div className="flex flex-col gap-1">
          <p className="text-display text-ink font-condensed uppercase">
            {workout.split_name ?? "Workout"}
          </p>
          {/*
            A finished workout says when it was and how long it took, because
            it is now reachable from Progress and "Finished" on its own does
            not say which day you are looking at. The one in progress is
            today's by definition, so it only says that.
          */}
          <p className="text-body text-muted">
            {finished ? describeWhen(workout) : "In progress"}
          </p>
        </div>
      </div>

      {exercises.length === 0 ? (
        <p className="text-body text-muted">
          Nothing added yet. Add the first exercise to begin.
        </p>
      ) : (
        <ul>
          {exercises.map((entry, index) => {
            const exercise = library.get(entry.exercise_id);
            const sets = setsByEntry.get(entry.id) ?? [];
            return (
              <li
                key={entry.id}
                className="border-border border-b last:border-b-0"
              >
                <Link
                  href={`/workout/${workout.id}/exercise/${entry.id}`}
                  className="flex items-baseline gap-4 py-4"
                >
                  {/*
                    The position, so the order of the workout is legible at a
                    glance. Tabular figures keep the column straight.
                  */}
                  <span className="text-body text-muted w-5 shrink-0">
                    {index + 1}
                  </span>
                  <span className="flex flex-col gap-1">
                    <span className="text-lead text-ink">
                      {exercise?.name ?? "Unknown exercise"}
                    </span>
                    <span className="text-body text-muted">
                      {describeSets(sets)}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {finished ? null : (
        <div className="flex flex-col gap-5">
          <Link href={`/workout/${workout.id}/add`} className={primaryAction}>
            Add Exercise
          </Link>
          <button
            type="button"
            disabled={busy}
            onClick={finish}
            className={`${quiet} self-start`}
          >
            {busy ? "Finishing" : "Finish workout"}
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * When a finished workout was, and how long it took.
 *
 * "Sunday 30 August 2026 · 52 min". The duration is left out rather than shown
 * as a nought when there is nothing to measure it from, which is the same rule
 * cardio and the history list follow.
 */
function describeWhen(workout: Workout): string {
  const when = `${dayLabel(workout.date)} ${monthLabel(workout.date)}`;
  const minutes = elapsedMinutes(workout.started_at, workout.finished_at);
  return minutes === null ? when : `${when} · ${minutes} min`;
}

/**
 * What has been logged for one exercise, in one line.
 *
 * Every set when they differ, and "3 × 135 lb × 8" when they do not, because a
 * straight-set exercise repeating itself three times is noise rather than
 * information. Assembled here; the database holds numbers.
 */
function describeSets(sets: LoggedSet[]): string {
  if (sets.length === 0) return "No sets yet";

  const written = sets.map((s) => `${s.weight} lb × ${s.reps}`);
  const allSame = written.every((w) => w === written[0]);
  if (allSame && sets.length > 1) return `${sets.length} × ${written[0]}`;
  return written.join("   ");
}

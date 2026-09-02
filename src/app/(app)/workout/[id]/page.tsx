"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";

import { HealthCard } from "@/components/HealthCard";
import { ScreenTitle } from "@/components/ScreenTitle";
import { Skeleton } from "@/components/Skeleton";
import { primaryAction, quiet, secondaryAction } from "@/components/controls";
import { Exercise, fetchExercisesByIds } from "@/lib/exercises";
import { HealthSession } from "@/lib/health";
import { dayLabel, elapsedMinutes, monthLabel } from "@/lib/progress";
import { LoggedSet, describeSets, fetchSetsForEntries } from "@/lib/sets";
import {
  Workout,
  WorkoutExercise,
  fetchWorkoutById,
  discardWorkout,
  fetchWorkoutExercises,
  finishWorkout,
  isInProgress,
  markWorkoutSentToHealth,
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
  const [confirmingDelete, setConfirmingDelete] = useState(false);

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

  async function remove() {
    if (data.status !== "ready") return;
    setBusy(true);
    try {
      await discardWorkout(data.workout.id);
      // Back to where a stored workout is looked at from, which is Progress.
      // Today only ever shows today, so it is the wrong place to land after
      // deleting one from three weeks ago.
      router.push("/progress");
    } catch (e) {
      console.error("discardWorkout failed", e);
      setData({ status: "error" });
      setBusy(false);
    }
  }

  /**
   * Finish, and stay here.
   *
   * This used to return to Today, which was right when finishing was the last
   * thing that happened to a workout. It is not any more: the session still has
   * to be handed to Apple Health, and bouncing to Today would mean finding the
   * workout again from Progress to do it.
   *
   * The screen is already the right one to stay on — a finished workout is this
   * same screen with its controls gone — so finishing now swaps the controls
   * for the export card in place.
   */
  async function finish() {
    if (data.status !== "ready") return;
    setBusy(true);
    try {
      const workout = await finishWorkout(data.workout.id);
      setData({ ...data, workout });
    } catch (e) {
      console.error("finishWorkout failed", e);
      setData({ status: "error" });
    } finally {
      setBusy(false);
    }
  }

  /** Whether it reached Health, as stated by the owner. The app cannot know. */
  async function markSent(sent: boolean) {
    if (data.status !== "ready") return;
    try {
      await markWorkoutSentToHealth(data.workout.id, sent);
      setData({ ...data, workout: { ...data.workout, sent_to_health: sent } });
    } catch (e) {
      console.error("could not record whether it was sent", e);
      setData({ status: "error" });
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
  const setCount = [...setsByEntry.values()].reduce(
    (total, sets) => total + sets.length,
    0,
  );

  /*
    Deleting names what is lost before it does it, the same way Today's discard
    does. One mis-tap must not remove a training record, and "5 exercises, 18
    sets" is what makes the warning mean something rather than being a shrug.
  */
  if (confirmingDelete) {
    return (
      <div className="flex flex-col gap-5">
        <ScreenTitle>Workout</ScreenTitle>
        <div className="flex flex-col gap-1">
          <p className="text-display text-ink font-condensed uppercase">
            {workout.split_name ?? "Workout"}
          </p>
          <p className="text-body text-muted">
            {finished ? describeWhen(workout) : "In progress"}
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-lead text-ink">Delete this workout?</p>
          <p className="text-body text-muted">
            {describeContents(exercises.length, setCount)} will be deleted. This
            cannot be undone.
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={remove}
          className={secondaryAction}
        >
          {busy ? "Deleting" : "Delete workout"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => setConfirmingDelete(false)}
          className={`${quiet} self-start`}
        >
          Keep it
        </button>
      </div>
    );
  }

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

      {/*
        Handing the session to Apple Health, once there is a finished session to
        hand over. Only on a finished workout: an export of something still in
        progress would be an export of a length of time that is still growing.

        Nothing here writes to Health. It opens a Shortcut the owner built, and
        iOS never reports back, which is why the card stays put and why whether
        it arrived is the owner's statement rather than the app's.
      */}
      {finished ? (
        <HealthCard
          session={healthSession(workout)}
          sent={workout.sent_to_health}
          onMarkSent={markSent}
        />
      ) : null}

      {/*
        Deleting a stored workout, which had no way to happen anywhere before.

        Today can discard the session you are in the middle of, but only that
        one: it looks at today and nothing else. A workout you finished, or one
        you walked out of on a Tuesday three weeks ago, could be read from
        Progress and never removed.

        Delete rather than discard. Discarding is abandoning something you are
        in the middle of; this removes a record that has been kept. Different
        actions, so different words.
      */}
      <button
        type="button"
        onClick={() => setConfirmingDelete(true)}
        className={`${quiet} self-start`}
      >
        Delete workout
      </button>
    </div>
  );
}

/**
 * What is about to be deleted, in one line.
 *
 * Assembled here rather than stored, like every other count in REIGN. A
 * workout holding nothing says so, because "0 exercises, 0 sets will be
 * deleted" reads like a bug rather than a warning.
 */
function describeContents(exercises: number, sets: number): string {
  if (exercises === 0) return "Nothing in it";
  const e = `${exercises} ${exercises === 1 ? "exercise" : "exercises"}`;
  const s = `${sets} ${sets === 1 ? "set" : "sets"}`;
  return `${e}, ${s}`;
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
 * A finished workout as the two instants Health wants, or null.
 *
 * Null when either instant is missing, which is true of workouts recorded
 * before REIGN stamped a start time. The card says so rather than inventing
 * one: a made-up start would put a session in Health at a time it did not
 * happen, and nothing downstream could tell.
 *
 * The type is always strength, whatever kind of day the workout was started
 * from. What decides it is what was recorded — a workout holds sets, and sets
 * are strength training — not what the program called the day. A bike day that
 * also had carries in it produces a strength workout and a cycling ride, which
 * is exactly what the two of them were.
 */
function healthSession(workout: Workout): HealthSession | null {
  if (!workout.started_at || !workout.finished_at) return null;
  return {
    type: "strength",
    start: new Date(workout.started_at),
    end: new Date(workout.finished_at),
  };
}

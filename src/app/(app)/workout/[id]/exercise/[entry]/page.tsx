"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";

import { ExerciseImages } from "@/components/ExerciseImages";
import { NumberPad, PadKey } from "@/components/NumberPad";
import { ScreenTitle } from "@/components/ScreenTitle";
import { Skeleton } from "@/components/Skeleton";
import { primaryAction, quiet, secondaryAction } from "@/components/controls";
import { Exercise, fetchExercisesByIds } from "@/lib/exercises";
import { Field, applyKey, displayValue, isLoggable } from "@/lib/entry";
import {
  LoggedSet,
  deleteSet,
  fetchSets,
  logSet,
  nextSetNumber,
  updateSet,
} from "@/lib/sets";
import { fetchWorkoutExercises } from "@/lib/workouts";

/**
 * Logging one exercise.
 *
 * Sets of the same exercise happen back to back, so this screen is entered once
 * per exercise rather than once per set. The weight and reps carry over from the
 * last set, which makes a repeat set a single tap on LOG SET. Changing a number
 * costs a few more, which is the two to three taps CLAUDE.md asks for.
 *
 * Weights are in pounds. There is no unit setting yet, and inventing one before
 * it is asked for would be a feature nobody requested.
 */

type Data =
  | { status: "loading" }
  | { status: "error" }
  | { status: "missing" }
  | { status: "ready"; exercise: Exercise | null; sets: LoggedSet[] };

export default function LogExercisePage({
  params,
}: PageProps<"/workout/[id]/exercise/[entry]">) {
  const { id, entry } = use(params);

  const [data, setData] = useState<Data>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [field, setField] = useState<Field>("weight");
  const [editingId, setEditingId] = useState<string | null>(null);
  /**
   * The photographs are asked for, never pushed.
   *
   * Most exercises are familiar. Showing them by default spends bandwidth on
   * gym wifi for a picture nobody needed, and measurably pushed LOG SET 48
   * points behind the tab bar. Asked for, they get the whole screen.
   */
  const [showingMovement, setShowingMovement] = useState(false);
  const [busy, setBusy] = useState(false);
  const [writeFailed, setWriteFailed] = useState(false);

  useEffect(() => {
    let active = true;

    Promise.all([fetchWorkoutExercises(id), fetchSets(entry)])
      .then(async ([entries, sets]) => {
        const mine = entries.find((e) => e.id === entry);
        if (!mine) {
          if (active) setData({ status: "missing" });
          return;
        }
        const library = await fetchExercisesByIds([mine.exercise_id]);
        if (!active) return;

        setData({
          status: "ready",
          exercise: library.get(mine.exercise_id) ?? null,
          sets,
        });

        // Carry the last set forward, so repeating it is one tap.
        const last = sets[sets.length - 1];
        if (last) {
          setWeight(last.weight === null ? "" : String(last.weight));
          setReps(last.reps === null ? "" : String(last.reps));
        }
      })
      .catch((e: Error) => {
        console.error("exercise failed to load", e);
        if (active) setData({ status: "error" });
      });

    return () => {
      active = false;
    };
  }, [id, entry, attempt]);

  function press(key: PadKey) {
    setWriteFailed(false);
    if (field === "weight") setWeight((v) => applyKey(v, key, "weight"));
    else setReps((v) => applyKey(v, key, "reps"));
  }

  function startEditing(set: LoggedSet) {
    setEditingId(set.id);
    setWeight(set.weight === null ? "" : String(set.weight));
    setReps(set.reps === null ? "" : String(set.reps));
    setField("weight");
    setWriteFailed(false);
  }

  function stopEditing(sets: LoggedSet[]) {
    setEditingId(null);
    const last = sets[sets.length - 1];
    setWeight(last?.weight === null || !last ? "" : String(last.weight));
    setReps(last?.reps === null || !last ? "" : String(last.reps));
    setField("weight");
  }

  async function commit() {
    if (data.status !== "ready" || !isLoggable(weight, reps)) return;
    setBusy(true);
    setWriteFailed(false);
    try {
      if (editingId) {
        const saved = await updateSet(editingId, Number(weight), Number(reps));
        const sets = data.sets.map((s) => (s.id === saved.id ? saved : s));
        setData({ ...data, sets });
        setEditingId(null);
        setField("weight");
      } else {
        const saved = await logSet(
          entry,
          nextSetNumber(data.sets),
          Number(weight),
          Number(reps),
        );
        // The values stay put, so the next set of the same weight is one tap.
        setData({ ...data, sets: [...data.sets, saved] });
      }
    } catch (e) {
      console.error("writing the set failed", e);
      setWriteFailed(true);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (data.status !== "ready" || !editingId) return;
    setBusy(true);
    setWriteFailed(false);
    try {
      await deleteSet(editingId);
      const sets = data.sets.filter((s) => s.id !== editingId);
      setData({ ...data, sets });
      stopEditing(sets);
    } catch (e) {
      console.error("deleting the set failed", e);
      setWriteFailed(true);
    } finally {
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
        <Skeleton className="h-9 w-4/5" />
        <Skeleton className="mt-5 h-6 w-1/2" />
        <Skeleton className="mt-5 h-64 w-full rounded-md" />
      </div>
    );
  }

  if (data.status === "error" || data.status === "missing") {
    const gone = data.status === "missing";
    return (
      <div className="flex flex-col gap-5">
        <ScreenTitle>Workout</ScreenTitle>
        <div className="flex flex-col gap-2">
          <p role="alert" className="text-lead text-ink">
            {gone ? "This exercise is gone." : "Could not load this exercise."}
          </p>
          <p className="text-body text-muted">
            {gone
              ? "It was removed from the workout, or the link is old."
              : "Check your connection and try again. Nothing has been lost."}
          </p>
        </div>
        {gone ? (
          <Link href={`/workout/${id}`} className={secondaryAction}>
            Back to the workout
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => {
              setData({ status: "loading" });
              setAttempt((n) => n + 1);
            }}
            className={secondaryAction}
          >
            Try again
          </button>
        )}
      </div>
    );
  }

  const { exercise, sets } = data;
  const canLog = isLoggable(weight, reps);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <ScreenTitle>Workout</ScreenTitle>
        <h1 className="text-hero text-ink font-condensed">
          {exercise?.name ?? "Unknown exercise"}
        </h1>
      </div>

      {/*
        The history scrolls inside itself rather than pushing the pad down the
        page. By the fourth set the pad would otherwise be off screen, which is
        exactly when it is needed most.
      */}
      <button
        type="button"
        onClick={() => setShowingMovement((v) => !v)}
        className={`${quiet} self-start`}
      >
        {showingMovement ? "Hide movement" : "Show movement"}
      </button>

      {/*
        Looking and logging are different things, so they do not share the
        screen. While the movement is shown it gets the whole of it, and the pad
        comes back when it is dismissed. Trying to fit both put the primary
        action behind the tab bar.
      */}
      {showingMovement && exercise ? (
        <ExerciseImages
          key={exercise.id}
          exerciseId={exercise.id}
          exerciseName={exercise.name}
        />
      ) : sets.length === 0 ? (
        <p className="text-body text-muted">No sets yet.</p>
      ) : (
        <ul className="max-h-36 overflow-y-auto">
          {sets.map((set, index) => {
            const editing = set.id === editingId;
            return (
              <li
                key={set.id}
                className="border-border border-b last:border-b-0"
              >
                <button
                  type="button"
                  onClick={() =>
                    editing ? stopEditing(sets) : startEditing(set)
                  }
                  className="flex w-full items-baseline gap-4 py-2.5 text-left"
                >
                  <span className="text-body text-muted w-5 shrink-0">
                    {index + 1}
                  </span>
                  {/*
                    Editing is marked by the word as well as the weight, so the
                    state does not rest on the gold alone.
                  */}
                  <span
                    className={`text-lead ${editing ? "text-accent font-bold" : "text-ink"}`}
                  >
                    {set.weight} lb × {set.reps}
                  </span>
                  {editing ? (
                    <span className="text-label text-accent ml-auto uppercase">
                      Editing
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {showingMovement ? null : (
        <>
          <div className="flex gap-3">
            <ValueField
              label="Weight"
              suffix="lb"
              value={weight}
              active={field === "weight"}
              onSelect={() => setField("weight")}
            />
            <ValueField
              label="Reps"
              value={reps}
              active={field === "reps"}
              onSelect={() => setField("reps")}
            />
          </div>

          <NumberPad onKey={press} decimalDisabled={field === "reps"} />

          {writeFailed ? (
            <p role="alert" className="text-body text-ink">
              That did not save. Check your connection and try again.
            </p>
          ) : null}

          <button
            type="button"
            disabled={!canLog || busy}
            onClick={commit}
            className={primaryAction}
          >
            {busy ? "Saving" : editingId ? "Save set" : "Log set"}
          </button>
        </>
      )}

      {editingId ? (
        <div className="flex items-baseline justify-between">
          <button
            type="button"
            disabled={busy}
            onClick={() => stopEditing(sets)}
            className={quiet}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={remove}
            className={quiet}
          >
            Delete set
          </button>
        </div>
      ) : (
        <Link href={`/workout/${id}`} className={`${quiet} self-start`}>
          Back to the workout
        </Link>
      )}
    </div>
  );
}

/**
 * One of the two numbers being entered.
 *
 * The active field is marked by a gold rule under it and a heavier number, not
 * by the gold alone.
 */
function ValueField({
  label,
  value,
  suffix,
  active,
  onSelect,
}: {
  label: string;
  value: string;
  suffix?: string;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onSelect}
      className={`flex flex-1 flex-col gap-1 border-b-2 pb-2 text-left ${
        active ? "border-accent" : "border-border"
      }`}
    >
      <span className="text-label text-muted uppercase">{label}</span>
      <span className="flex items-baseline gap-1.5">
        {/*
          Weight as well as gold. Under the strip test the rule disappears and
          the two fields were then separated by hue alone, which CLAUDE.md
          forbids. At this size 400 against 700 is unmistakable.
        */}
        <span
          className={`text-display font-condensed ${
            active ? "text-ink" : "text-muted font-normal"
          }`}
        >
          {displayValue(value)}
        </span>
        {suffix ? <span className="text-body text-muted">{suffix}</span> : null}
      </span>
    </button>
  );
}

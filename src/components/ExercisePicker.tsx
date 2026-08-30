"use client";

import { useEffect, useState } from "react";

import { Skeleton } from "@/components/Skeleton";
import {
  Exercise,
  fetchExercisesByMuscle,
  fetchMuscleGroups,
} from "@/lib/exercises";

/**
 * Choose an exercise.
 *
 * Still the browse-by-muscle version. The spec calls for this to be rebuilt
 * search first, with Recent and Frequent above the six regions, and that is a
 * later slice. It is left alone here so adding an exercise to a workout is the
 * only thing that changes.
 *
 * Both loads carry their own loading, empty and error states, per CLAUDE.md.
 */

type Load<T> =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; value: T };

export function ExercisePicker({
  onPick,
  picking,
}: {
  onPick: (exercise: Exercise) => void;
  /** The id currently being added, so the row says so rather than sitting inert. */
  picking: string | null;
}) {
  const [muscles, setMuscles] = useState<Load<string[]>>({ status: "loading" });
  const [selected, setSelected] = useState<string | null>(null);
  const [exercises, setExercises] = useState<Load<Exercise[]> | null>(null);

  useEffect(() => {
    let active = true;
    fetchMuscleGroups()
      .then((value) => active && setMuscles({ status: "ready", value }))
      .catch((e: Error) => {
        console.error("fetchMuscleGroups failed", e);
        if (active) setMuscles({ status: "error", message: e.message });
      });
    return () => {
      active = false;
    };
  }, []);

  // The switch to loading happens in the click handler rather than here.
  // Setting state synchronously inside an effect causes a cascading render, and
  // the transition genuinely belongs to the tap that caused it.
  useEffect(() => {
    if (!selected) return;
    let active = true;
    fetchExercisesByMuscle(selected)
      .then((value) => active && setExercises({ status: "ready", value }))
      .catch((e: Error) => {
        console.error("fetchExercisesByMuscle failed", e);
        if (active) setExercises({ status: "error", message: e.message });
      });
    return () => {
      active = false;
    };
  }, [selected]);

  function selectMuscle(muscle: string) {
    const next = muscle === selected ? null : muscle;
    setSelected(next);
    setExercises(next ? { status: "loading" } : null);
  }

  return (
    <div className="flex flex-col gap-6">
      {muscles.status === "loading" ? (
        <div
          className="flex flex-wrap gap-2"
          aria-busy="true"
          aria-label="Loading"
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-24" />
          ))}
        </div>
      ) : null}

      {/*
        The underlying message is technical ("TypeError: Failed to fetch") and
        means nothing to whoever is reading it, so it goes to the console for
        debugging and the screen says what actually happened.
      */}
      {muscles.status === "error" ? (
        <p role="alert" className="text-body text-ink">
          Could not reach the exercise library. Check your connection and try
          again.
        </p>
      ) : null}

      {muscles.status === "ready" && muscles.value.length === 0 ? (
        <p className="text-body text-muted">The exercise library is empty.</p>
      ) : null}

      {muscles.status === "ready" && muscles.value.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {muscles.value.map((muscle) => {
            const isSelected = muscle === selected;
            return (
              <li key={muscle}>
                <button
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => selectMuscle(muscle)}
                  // Selection carries weight as well as gold. Hue alone is not
                  // a state signal, per CLAUDE.md.
                  className={`text-label h-10 rounded-sm border px-3 uppercase ${
                    isSelected
                      ? "border-accent text-accent font-bold"
                      : "border-border text-muted"
                  }`}
                >
                  {muscle}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {muscles.status === "ready" && !selected ? (
        <p className="text-body text-muted">
          Pick a muscle group to see its exercises.
        </p>
      ) : null}

      {exercises?.status === "loading" ? (
        <div
          className="flex flex-col gap-4"
          aria-busy="true"
          aria-label="Loading"
        >
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-3/4" />
          ))}
        </div>
      ) : null}

      {exercises?.status === "error" ? (
        <p role="alert" className="text-body text-ink">
          Could not load those exercises. Check your connection and try again.
        </p>
      ) : null}

      {exercises?.status === "ready" && exercises.value.length === 0 ? (
        <p className="text-body text-muted">
          No exercises for that muscle group.
        </p>
      ) : null}

      {exercises?.status === "ready" && exercises.value.length > 0 ? (
        <div className="flex flex-col gap-2">
          <p className="text-label text-muted uppercase">
            {exercises.value.length} exercises
          </p>
          <ul>
            {exercises.value.map((exercise) => (
              <li
                key={exercise.id}
                className="border-border border-b last:border-b-0"
              >
                <button
                  type="button"
                  disabled={picking !== null}
                  onClick={() => onPick(exercise)}
                  className="w-full py-4 text-left disabled:opacity-60"
                >
                  <span className="text-lead text-ink block">
                    {exercise.name}
                  </span>
                  <span className="text-body text-muted mt-1 block">
                    {picking === exercise.id
                      ? "Adding"
                      : (exercise.equipment ?? "")}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

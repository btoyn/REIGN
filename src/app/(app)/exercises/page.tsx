"use client";

import { useEffect, useState } from "react";

import { ScreenTitle } from "@/components/ScreenTitle";
import {
  Exercise,
  fetchExercisesByMuscle,
  fetchMuscleGroups,
} from "@/lib/exercises";

type Load<T> =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; value: T };

/**
 * Choose an exercise.
 *
 * The first screen that reads real data. Reached from START WORKOUT on Today.
 *
 * Nothing is recorded here yet: no workout row is created and the exercises
 * are not selectable, because the logging engine does not exist. The screen
 * says so rather than implying otherwise.
 *
 * Both loads carry their own loading, empty and error states, per CLAUDE.md.
 */
export default function ExercisesPage() {
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
  // Setting state synchronously inside an effect causes a cascading render,
  // and the transition genuinely belongs to the tap that caused it.
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
    <>
      <ScreenTitle>Choose an exercise</ScreenTitle>
      <p className="text-body text-muted mt-3">
        Nothing is recorded yet. Logging arrives next.
      </p>

      {muscles.status === "loading" ? (
        <p className="text-body text-muted mt-6">Loading muscle groups…</p>
      ) : null}

      {/*
        The underlying message is technical ("TypeError: Failed to fetch") and
        means nothing to the person reading it, so it goes to the console for
        debugging and the screen says what actually happened.
      */}
      {muscles.status === "error" ? (
        <p role="alert" className="text-body text-ink mt-6">
          Could not reach the exercise library. Check your connection and try
          again.
        </p>
      ) : null}

      {muscles.status === "ready" && muscles.value.length === 0 ? (
        <p className="text-body text-muted mt-6">
          The exercise library is empty.
        </p>
      ) : null}

      {muscles.status === "ready" && muscles.value.length > 0 ? (
        <ul className="mt-6 flex flex-wrap gap-2">
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
        <p className="text-body text-muted mt-6">
          Pick a muscle group to see its exercises.
        </p>
      ) : null}

      {exercises?.status === "loading" ? (
        <p className="text-body text-muted mt-6">Loading exercises…</p>
      ) : null}

      {exercises?.status === "error" ? (
        <p role="alert" className="text-body text-ink mt-6">
          Could not load those exercises. Check your connection and try again.
        </p>
      ) : null}

      {exercises?.status === "ready" && exercises.value.length === 0 ? (
        <p className="text-body text-muted mt-6">
          No exercises for that muscle group.
        </p>
      ) : null}

      {exercises?.status === "ready" && exercises.value.length > 0 ? (
        <>
          <p className="text-label text-muted mt-8 uppercase">
            {exercises.value.length} exercises
          </p>
          <ul className="mt-2 pb-6">
            {exercises.value.map((exercise) => (
              <li
                key={exercise.id}
                className="border-border border-b py-4 last:border-b-0"
              >
                <p className="text-lead text-ink">{exercise.name}</p>
                {exercise.equipment ? (
                  <p className="text-body text-muted mt-1">
                    {exercise.equipment}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </>
  );
}

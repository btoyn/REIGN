"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";

import { ScreenTitle } from "@/components/ScreenTitle";
import { Skeleton } from "@/components/Skeleton";
import { secondaryAction } from "@/components/controls";
import {
  Alternative,
  alternativesFor,
  describeAlternative,
} from "@/lib/alternatives";
import { Exercise, fetchLibrary } from "@/lib/exercises";
import { fetchHiddenExerciseIds } from "@/lib/hidden";
import { fetchTrainingHistory } from "@/lib/history";
import { inGymOnly } from "@/lib/library";
import {
  fetchWorkoutExercises,
  swapExercise,
  todayDate,
} from "@/lib/workouts";

/**
 * Something else that trains the same thing.
 *
 * The machine is taken. This is the answer, ordered so the most useful is
 * first: different equipment leads, because equipment is why you are asking.
 *
 * Nothing here is stored or learned. It is the exercise's own tags — its
 * primary muscle, its secondary muscles, its equipment — read from the library
 * that is already loaded for the picker.
 *
 * Each row says why it is being offered. The order is a judgement, and a
 * judgement the owner can see is one they can overrule.
 */

type State =
  | { status: "loading" }
  | { status: "error" }
  | { status: "missing" }
  | { status: "ready"; current: Exercise; alternatives: Alternative[] };

export default function SwapPage({
  params,
}: PageProps<"/workout/[id]/exercise/[entry]/swap">) {
  const { id, entry } = use(params);
  const router = useRouter();
  const [state, setState] = useState<State>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [picking, setPicking] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    Promise.all([
      fetchWorkoutExercises(id),
      fetchLibrary(),
      // The owner's own history, which orders equally close substitutes.
      fetchTrainingHistory(),
      fetchHiddenExerciseIds(),
    ])
      .then(([entries, library, history, hidden]) => {
        if (!active) return;

        const mine = entries.find((e) => e.id === entry);
        const byId = new Map(library.map((e) => [e.id, e]));
        const current = mine ? byId.get(mine.exercise_id) : undefined;
        if (!mine || !current) {
          setState({ status: "missing" });
          return;
        }

        /*
          Everything already in this workout is excluded, along with anything
          hidden. Offering a lift that is on today's list, or one needing
          equipment the gym does not have, wastes the tap that finds it.
        */
        const exclude = new Set([
          ...entries.map((e) => e.exercise_id),
          ...hidden,
        ]);

        setState({
          status: "ready",
          current,
          alternatives: alternativesFor(
            current,
            inGymOnly(library),
            history.lastPerformed,
            todayDate(),
            exclude,
          ),
        });
      })
      .catch((e: Error) => {
        if (!active) return;
        console.error("could not work out the alternatives", e);
        setState({ status: "error" });
      });

    return () => {
      active = false;
    };
  }, [id, entry, attempt]);

  async function choose(exerciseId: string) {
    setPicking(exerciseId);
    try {
      await swapExercise(entry, exerciseId);
      router.push(`/workout/${id}/exercise/${entry}`);
    } catch (e) {
      console.error("could not swap the exercise", e);
      setState({ status: "error" });
      setPicking(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <ScreenTitle>Swap</ScreenTitle>

      <Link
        href={`/workout/${id}/exercise/${entry}`}
        className="text-label text-muted self-start uppercase underline underline-offset-4"
      >
        ← Back
      </Link>

      {state.status === "loading" ? <LoadingRows /> : null}

      {state.status === "error" ? (
        <div className="mt-5 flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <p role="alert" className="text-lead text-ink">
              Could not work out what else to do.
            </p>
            <p className="text-body text-muted">
              Check your connection and try again. Nothing has been changed.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setState({ status: "loading" });
              setAttempt((n) => n + 1);
            }}
            className={secondaryAction}
          >
            Try again
          </button>
        </div>
      ) : null}

      {state.status === "missing" ? (
        <div className="mt-5 flex flex-col gap-2">
          <p className="text-lead text-ink">This exercise is gone.</p>
          <p className="text-body text-muted">
            It was removed from the workout, or the link is old.
          </p>
        </div>
      ) : null}

      {state.status === "ready" ? (
        <>
          <div className="mt-2 flex flex-col gap-1">
            <p className="text-display text-ink font-condensed uppercase">
              {state.current.name}
            </p>
            <p className="text-body text-muted">
              Something else for {state.current.primary_muscle}. Different
              equipment first.
            </p>
          </div>

          {/*
            A muscle with only one movement in the gym, or a workout that
            already holds every alternative. It says which rather than showing
            an empty list.
          */}
          {state.alternatives.length === 0 ? (
            <div className="mt-6 flex flex-col gap-2">
              <p className="text-lead text-ink">Nothing else to offer.</p>
              <p className="text-body text-muted">
                Everything that trains {state.current.primary_muscle} is either
                already in this workout or hidden.
              </p>
            </div>
          ) : (
            <ul className="mt-6">
              {state.alternatives.map((alternative) => (
                <li
                  key={alternative.exercise.id}
                  className="border-border border-b last:border-b-0"
                >
                  <button
                    type="button"
                    disabled={picking !== null}
                    onClick={() => choose(alternative.exercise.id)}
                    className="w-full py-4 text-left disabled:opacity-60"
                  >
                    <span className="text-lead text-ink block">
                      {alternative.exercise.name}
                    </span>
                    {/*
                      Why it is here: what it needs, how close it is, and how
                      long since you did it. The order is a judgement, and one
                      that can be read is one that can be overruled.
                    */}
                    <span className="text-body text-muted mt-1 block">
                      {picking === alternative.exercise.id
                        ? "Swapping"
                        : describeAlternative(alternative)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : null}
    </div>
  );
}

function LoadingRows() {
  return (
    <div className="mt-4 flex flex-col gap-6" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-[42px] w-2/3" />
      <div className="flex flex-col">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="border-border border-b py-4 last:border-b-0">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="mt-2 h-4 w-40" />
          </div>
        ))}
      </div>
    </div>
  );
}

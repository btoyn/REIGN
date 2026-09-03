"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";

import { ScreenTitle } from "@/components/ScreenTitle";
import { Skeleton } from "@/components/Skeleton";
import { secondaryAction } from "@/components/controls";
import {
  fetchAlternates,
  pinAlternate,
  unpinAlternate,
} from "@/lib/alternates";
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
 * first: the owner's own pins, then the same kind of movement, then different
 * equipment.
 *
 * Most of it is not stored or learned. It is the exercise's own tags — its
 * primary muscle, its mechanic, its secondary muscles, its equipment — read
 * from the library that is already loaded for the picker.
 *
 * The pins are the exception, and they exist because the tags are sometimes
 * wrong in a way no ordering fixes. Each row says why it is being offered, so
 * the judgement can be read; Pin is how it gets overruled for good rather than
 * scrolled past every time.
 *
 * Pinning is deliberately not the screen's action. Swapping is: the owner came
 * here mid-workout with a bench to get on. Pin sits at the end of the row in
 * label type, close enough to tap and quiet enough to ignore.
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
  const [pinning, setPinning] = useState<string | null>(null);
  const [pinFailed, setPinFailed] = useState(false);

  useEffect(() => {
    let active = true;

    Promise.all([
      fetchWorkoutExercises(id),
      fetchLibrary(),
      // The owner's own history, which orders equally close substitutes.
      fetchTrainingHistory(),
      fetchHiddenExerciseIds(),
      // The owner's own pins, which outrank every tag below them.
      fetchAlternates(),
    ])
      .then(([entries, library, history, hidden, pins]) => {
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
            pins.get(current.id) ?? new Set(),
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

  /*
    Pinning marks the row and leaves it where it is. The new pin only reaches
    the top of the list next time the screen is opened.

    That is on purpose. Re-sorting on the tap would slide the row up under a
    thumb that is still on the screen, and the next tap — on a list that has
    moved — swaps the exercise. Mid-workout that is a real mistake to make. The
    row saying Pinned is the confirmation; the order is next time's business.
  */
  async function togglePin(exerciseId: string, pinned: boolean) {
    if (state.status !== "ready") return;
    const current = state.current;

    setPinning(exerciseId);
    setPinFailed(false);
    try {
      if (pinned) await unpinAlternate(current.id, exerciseId);
      else await pinAlternate(current.id, exerciseId);

      setState((previous) =>
        previous.status === "ready"
          ? {
              ...previous,
              alternatives: previous.alternatives.map((alternative) =>
                alternative.exercise.id === exerciseId
                  ? { ...alternative, pinned: !pinned }
                  : alternative,
              ),
            }
          : previous,
      );
    } catch (e) {
      /*
        A pin that would not save leaves the row as it was and says so. It does
        not take the screen down: the list is still correct and still swappable,
        which is what the owner came here for.
      */
      console.error("could not change the pin", e);
      setPinFailed(true);
    } finally {
      setPinning(null);
    }
  }

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
              Something else for {state.current.primary_muscle}. Your pins
              first, then the same kind of movement.
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
                  className="border-border flex items-center gap-2 border-b last:border-b-0"
                >
                  <button
                    type="button"
                    disabled={picking !== null}
                    onClick={() => choose(alternative.exercise.id)}
                    className="flex-1 py-4 text-left disabled:opacity-60"
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
                  {/*
                    The override. Not gold and not a box: swapping is this
                    screen's action and this is a preference set on the way
                    past.

                    Pinned is never carried by colour: the word itself changes,
                    it gains a rule under it, and the line above starts saying
                    Pinned. The label type is already semibold, so weight is
                    not available here as the marker — hence the underline.

                    Stretched to the full height of the row and padded to 44px
                    wide, because it is tapped between sets with one hand.
                  */}
                  <button
                    type="button"
                    disabled={pinning !== null || picking !== null}
                    aria-pressed={alternative.pinned}
                    onClick={() =>
                      togglePin(alternative.exercise.id, alternative.pinned)
                    }
                    className={`text-label min-w-11 shrink-0 self-stretch px-3 uppercase disabled:opacity-60 ${
                      alternative.pinned
                        ? "text-ink underline underline-offset-4"
                        : "text-muted"
                    }`}
                  >
                    {pinning === alternative.exercise.id
                      ? "···"
                      : alternative.pinned
                        ? "Pinned"
                        : "Pin"}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {pinFailed ? (
            <p role="alert" className="text-body text-muted mt-4">
              Could not save that pin. The list is still correct — swapping
              works.
            </p>
          ) : null}
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

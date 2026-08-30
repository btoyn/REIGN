"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ScreenTitle } from "@/components/ScreenTitle";
import { Skeleton } from "@/components/Skeleton";
import { secondaryAction } from "@/components/controls";
import {
  PastWorkout,
  byMonth,
  dayLabel,
  describeWorkout,
  fetchWorkoutHistory,
} from "@/lib/progress";

/**
 * Progress — history first.
 *
 * The first thing CLAUDE.md says REIGN does is remember, and until now a
 * finished workout left the screen and could not be reached again. This is
 * every one of them, newest first.
 *
 * Records and the strength trend are the next slices. They are calculated from
 * this same data, so nothing here needs a column added later.
 *
 * There is no primary action, the way Program has none. This is a screen for
 * reading, and promoting one row would be a lie about which workout matters.
 *
 * A row opens the workout itself rather than a second detail screen: that
 * screen already shows a finished workout correctly, with its exercises, its
 * sets and no controls.
 */

type State =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; workouts: PastWorkout[] };

export default function ProgressPage() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;

    fetchWorkoutHistory()
      .then((workouts) => active && setState({ status: "ready", workouts }))
      .catch((e: Error) => {
        /*
          Nothing is reported once the screen has gone. A request abandoned by
          navigating away rejects like any other failure, but there is nobody
          left to tell and no state left to set, so saying so in the console
          only buries the failures that do matter.

          When there is somebody to tell, the technical wording goes to the
          console and the screen says what happened in words.
        */
        if (!active) return;
        console.error("fetchWorkoutHistory failed", e);
        setState({ status: "error" });
      });

    return () => {
      active = false;
    };
  }, [attempt]);

  return (
    <div className="flex flex-col gap-3">
      <ScreenTitle>Progress</ScreenTitle>
      <p className="text-body text-muted">Every workout you have finished.</p>

      {state.status === "loading" ? <LoadingRows /> : null}

      {state.status === "error" ? (
        <div className="mt-5 flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <p role="alert" className="text-lead text-ink">
              Could not load your history.
            </p>
            <p className="text-body text-muted">
              Check your connection and try again. Nothing has been lost.
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

      {/*
        Day one. It says what will fill the screen rather than only that it is
        empty, and it does not offer to start a workout: that action lives on
        Today, and repeating it here would put two primary actions in the app
        for the same thing.
      */}
      {state.status === "ready" && state.workouts.length === 0 ? (
        <div className="mt-5 flex flex-col gap-2">
          <p className="text-lead text-ink">No finished workouts yet.</p>
          <p className="text-body text-muted">
            Every workout you finish is listed here, newest first, with what you
            lifted in it.
          </p>
        </div>
      ) : null}

      {state.status === "ready" && state.workouts.length > 0 ? (
        <div className="mt-4 flex flex-col gap-8">
          {byMonth(state.workouts).map((month) => (
            <div key={month.label} className="flex flex-col gap-2">
              {/*
                A spine for a long list. A year of training is a lot of dates,
                and a date on its own does not say how long ago it was.
              */}
              <p className="text-label text-muted uppercase">{month.label}</p>
              <ul>
                {month.workouts.map((workout) => (
                  <li
                    key={workout.id}
                    className="border-border border-b last:border-b-0"
                  >
                    <Link
                      href={`/workout/${workout.id}`}
                      className="flex items-baseline justify-between gap-4 py-4"
                    >
                      <span className="flex flex-col gap-1">
                        {/*
                          The split is the name of the day, because that is how
                          the owner thinks about it. A workout started outside
                          the schedule has no split, so the date carries it.
                        */}
                        <span className="text-lead text-ink">
                          {workout.splitName ?? "Workout"}
                        </span>
                        <span className="text-body text-muted">
                          {describeWorkout(workout)}
                        </span>
                      </span>
                      <span className="text-body text-muted shrink-0">
                        {dayLabel(workout.date)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function LoadingRows() {
  return (
    <div className="mt-6 flex flex-col gap-2" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-4 w-28" />
      <div className="flex flex-col">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="border-border flex items-center justify-between border-b py-4 last:border-b-0"
          >
            <div className="flex flex-col gap-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-40" />
            </div>
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

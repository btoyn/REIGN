"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { RecordRows } from "@/components/RecordRows";
import { ScreenTitle } from "@/components/ScreenTitle";
import { Skeleton } from "@/components/Skeleton";
import { quiet, secondaryAction } from "@/components/controls";
import {
  PastWorkout,
  byMonth,
  consistency,
  consistencyLabel,
  dayLabel,
  describePrevious,
  describeWorkout,
  fetchWorkoutHistory,
} from "@/lib/progress";
import {
  PersonalRecord,
  RECORDS_ON_PROGRESS,
  fetchRecords,
} from "@/lib/records";
import { todayDate } from "@/lib/workouts";

/**
 * Progress — history first.
 *
 * The first thing CLAUDE.md says REIGN does is remember, and until now a
 * finished workout left the screen and could not be reached again. This is
 * every one of them, newest first.
 *
 * Records sit above it, the few most recently set, with the rest one tap away.
 * That is the shape the picker already uses for Recent and Frequent: a handful
 * of the most useful, and the full list behind them. Opening on forty rows of
 * records before the history would be the analytics overload the spec warns
 * about.
 *
 * Above both, how much training there has actually been: a count over the last
 * four weeks with the four before it beside it, which is the large number with
 * a restrained label the specification asks for. A count, never a streak — a
 * streak turns one missed Tuesday into a punishment.
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
  | { status: "ready"; workouts: PastWorkout[]; records: PersonalRecord[] };

export default function ProgressPage() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;

    // Two reads, run together. Records need the sets and the history does not,
    // so neither waits on the other's rows.
    Promise.all([fetchWorkoutHistory(), fetchRecords()])
      .then(
        ([workouts, records]) =>
          active && setState({ status: "ready", workouts, records }),
      )
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
        console.error("Progress failed to load", e);
        setState({ status: "error" });
      });

    return () => {
      active = false;
    };
  }, [attempt]);

  return (
    <div className="flex flex-col gap-3">
      <ScreenTitle>Progress</ScreenTitle>

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

      {/*
        How much training there has been lately, and what it was before that.
        A number on its own says nothing: fourteen is good or bad depending on
        what the month before held.
      */}
      {state.status === "ready" && state.workouts.length > 0 ? (
        <Consistency workouts={state.workouts} />
      ) : null}

      {/*
        Absent until there is one, the same rule Recent and Frequent follow in
        the picker. An empty list is worse than no list.
      */}
      {state.status === "ready" && state.records.length > 0 ? (
        <div className="mt-4 flex flex-col gap-2">
          <p className="text-label text-muted uppercase">Records</p>
          <RecordRows records={state.records.slice(0, RECORDS_ON_PROGRESS)} />
          {state.records.length > RECORDS_ON_PROGRESS ? (
            <Link
              href="/progress/records"
              className={`${quiet} mt-2 self-start`}
            >
              All {state.records.length} records
            </Link>
          ) : null}
        </div>
      ) : null}

      {state.status === "ready" && state.workouts.length > 0 ? (
        <div className="mt-10 flex flex-col">
          {/*
            Two headings at one type size, so the spacing has to say which is
            which. A label sits tight against the rows it names and far from
            whatever came before, which is what separates the section from the
            months inside it. Nothing here is a border or a box, so it survives
            the strip test.
          */}
          <p className="text-label text-muted uppercase">History</p>
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
        </div>
      ) : null}
    </div>
  );
}

function Consistency({ workouts }: { workouts: PastWorkout[] }) {
  const count = consistency(workouts, todayDate());
  const before = describePrevious(count);

  return (
    <div className="mt-4 flex flex-col gap-1">
      <p className="text-display text-ink font-condensed">{count.recent}</p>
      <p className="text-body text-muted">{consistencyLabel()}</p>
      {/*
        Absent on day one rather than reading "0 in the 4 weeks before that",
        which would be a nought about a period the owner had not started
        training in.
      */}
      {before ? <p className="text-body text-muted">{before}</p> : null}
    </div>
  );
}

function LoadingRows() {
  return (
    <div
      className="mt-6 flex flex-col gap-2"
      aria-busy="true"
      aria-label="Loading"
    >
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

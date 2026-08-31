"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";

import { ScreenTitle } from "@/components/ScreenTitle";
import { Skeleton } from "@/components/Skeleton";
import { secondaryAction } from "@/components/controls";
import { shortDate } from "@/lib/progress";
import { describeRecord } from "@/lib/records";
import { describeSets } from "@/lib/sets";
import {
  Trend,
  change,
  describeChange,
  fetchExerciseTrend,
  sessionSets,
} from "@/lib/trend";

/**
 * One lift over time.
 *
 * Reached from a record. Records say what the best ever was; this says what has
 * been happening, which is what the specification calls the strength trend.
 *
 * There is no chart. A column of working weights in tabular figures already
 * reads as a trend, and that is the strip test answered honestly: take a line
 * graph away and nothing is lost, so it was never carrying anything. What is
 * here instead is the number being lifted now, how it has moved, and every
 * session under it.
 */

type State =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; trend: Trend };

export default function ExerciseTrendPage({
  params,
}: PageProps<"/progress/exercise/[id]">) {
  const { id } = use(params);
  const [state, setState] = useState<State>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;

    fetchExerciseTrend(decodeURIComponent(id))
      .then((trend) => active && setState({ status: "ready", trend }))
      .catch((e: Error) => {
        /*
          Nothing is reported once the screen has gone. A request abandoned by
          navigating away rejects like any other failure, but there is nobody
          left to tell and no state left to set.
        */
        if (!active) return;
        console.error("fetchExerciseTrend failed", e);
        setState({ status: "error" });
      });

    return () => {
      active = false;
    };
  }, [id, attempt]);

  return (
    <div className="flex flex-col gap-3">
      <ScreenTitle>Progress</ScreenTitle>

      <Link
        href="/progress/records"
        className="text-label text-muted self-start uppercase underline underline-offset-4"
      >
        ← Records
      </Link>

      {state.status === "loading" ? <LoadingRows /> : null}

      {state.status === "error" ? (
        <div className="mt-5 flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <p role="alert" className="text-lead text-ink">
              Could not load this lift.
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

      {state.status === "ready" ? <Ready trend={state.trend} /> : null}
    </div>
  );
}

function Ready({ trend }: { trend: Trend }) {
  const moved = describeChange(change(trend.sessions));

  return (
    <div className="mt-2 flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <p className="text-lead text-ink">{trend.name}</p>

        {/*
          The large number the specification asks for: what is being lifted
          now, not a best from a year ago. Condensed and in tabular figures,
          like every other large number in REIGN.
        */}
        {trend.current !== null ? (
          <p className="text-display text-ink font-condensed">
            {trend.current} lb
          </p>
        ) : null}

        {/*
          Two points, and the wording says so. A weight that has come down says
          so plainly rather than being hidden or coloured red: a deload is a
          decision, not a failure.
        */}
        {moved ? <p className="text-body text-muted">{moved}</p> : null}

        {trend.record ? (
          <p className="text-body text-muted">
            Best {describeRecord(trend.record)}
          </p>
        ) : null}
      </div>

      {/*
        Reachable for an exercise that has never been done, because the address
        exists whether or not anything links to it.
      */}
      {trend.sessions.length === 0 ? (
        <div className="flex flex-col gap-2">
          <p className="text-lead text-ink">Not done yet.</p>
          <p className="text-body text-muted">
            Once this has been logged, every session shows up here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-label text-muted uppercase">Every session</p>
          <ul>
            {trend.sessions.map((session) => (
              <li
                key={session.workoutId}
                className="border-border border-b last:border-b-0"
              >
                <Link
                  href={`/workout/${session.workoutId}`}
                  className="flex items-baseline justify-between gap-4 py-4"
                >
                  {/*
                    The weights are the trend. Read down this column and the
                    shape is there without a graph drawing it.
                  */}
                  <span className="text-lead text-ink">
                    {describeSets(sessionSets(session))}
                  </span>
                  <span className="text-body text-muted shrink-0">
                    {shortDate(session.date)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function LoadingRows() {
  return (
    <div
      className="mt-4 flex flex-col gap-8"
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="flex flex-col gap-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-[42px] w-32" />
        <Skeleton className="h-4 w-56" />
      </div>
      <div className="flex flex-col">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="border-border flex items-center justify-between border-b py-4 last:border-b-0"
          >
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-28" />
          </div>
        ))}
      </div>
    </div>
  );
}

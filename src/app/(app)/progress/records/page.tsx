"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { RecordRows } from "@/components/RecordRows";
import { ScreenTitle } from "@/components/ScreenTitle";
import { Skeleton } from "@/components/Skeleton";
import { secondaryAction } from "@/components/controls";
import { PersonalRecord, fetchRecords } from "@/lib/records";

/**
 * Every personal record.
 *
 * Progress shows the few most recent; this is all of them, and it is the only
 * reason this screen exists. One line per exercise, most recently set first, so
 * what was just achieved is at the top and a best that has stood for a year
 * sinks.
 *
 * Nothing here is stored. Every one of these is worked out from the sets each
 * time the screen opens, per CLAUDE.md.
 */

type State =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; records: PersonalRecord[] };

export default function RecordsPage() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;

    fetchRecords()
      .then((records) => active && setState({ status: "ready", records }))
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
        console.error("fetchRecords failed", e);
        setState({ status: "error" });
      });

    return () => {
      active = false;
    };
  }, [attempt]);

  return (
    <div className="flex flex-col gap-3">
      <ScreenTitle>Records</ScreenTitle>

      {/* Where you are and the way back, the same one control the picker uses. */}
      <Link
        href="/progress"
        className="text-label text-muted self-start uppercase underline underline-offset-4"
      >
        ← Progress
      </Link>

      <p className="text-body text-muted mt-2">
        Your best set on every lift, worked out from what you logged.
      </p>

      {state.status === "loading" ? <LoadingRows /> : null}

      {state.status === "error" ? (
        <div className="mt-5 flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <p role="alert" className="text-lead text-ink">
              Could not work out your records.
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
        Reachable before there is anything in it, because the link to it can
        only be hidden on Progress, not the address itself.
      */}
      {state.status === "ready" && state.records.length === 0 ? (
        <div className="mt-5 flex flex-col gap-2">
          <p className="text-lead text-ink">No records yet.</p>
          <p className="text-body text-muted">
            The first working set you log on an exercise becomes its record.
          </p>
        </div>
      ) : null}

      {state.status === "ready" && state.records.length > 0 ? (
        <div className="mt-4">
          <RecordRows records={state.records} />
        </div>
      ) : null}
    </div>
  );
}

function LoadingRows() {
  return (
    <div className="mt-4 flex flex-col" aria-busy="true" aria-label="Loading">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="border-border border-b py-4 last:border-b-0">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="mt-2 h-4 w-40" />
        </div>
      ))}
    </div>
  );
}

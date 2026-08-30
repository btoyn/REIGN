"use client";

import { useEffect, useState } from "react";

import { RegionChoice } from "@/components/RegionChoice";
import { ScreenTitle } from "@/components/ScreenTitle";
import { Skeleton } from "@/components/Skeleton";
import { quiet, secondaryAction } from "@/components/controls";
import {
  Split,
  WEEKDAYS,
  WEEK_IN_READING_ORDER,
  fetchAllSplits,
  saveSplitForDay,
} from "@/lib/splits";

/**
 * Program — the weekday schedule.
 *
 * The first real content in this tab. Browsable programs are a later milestone;
 * this is the split, which is what Today actually reads.
 *
 * It exists now because Today writes the split and could not edit it. A value
 * the app can write but not correct is a broken feature, not a lean one:
 * reaching the choice again meant deleting a row in the database.
 *
 * Changing a day here is permanent. Changing only today is a different action
 * and lives on Today, where the wrong answer is visible.
 *
 * There is no primary action. Seven weekdays are equal, and promoting one of
 * them would be a lie about which day matters.
 */

type State =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; splits: Split[] };

export default function ProgramPage() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  /** The weekday being changed, or null when the schedule is being read. */
  const [editing, setEditing] = useState<number | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    fetchAllSplits()
      .then((splits) => active && setState({ status: "ready", splits }))
      .catch((e: Error) => {
        // Technical wording is no use to the person reading it, so it goes to
        // the console and the screen says what happened.
        console.error("fetchAllSplits failed", e);
        if (active) setState({ status: "error" });
      });

    return () => {
      active = false;
    };
  }, [attempt]);

  function retry() {
    setState({ status: "loading" });
    setAttempt((n) => n + 1);
  }

  async function choose(name: string, muscles: string[]) {
    if (editing === null) return;
    setSaving(name);
    try {
      const saved = await saveSplitForDay(editing, name, muscles);
      setState((current) =>
        current.status === "ready"
          ? {
              status: "ready",
              splits: [
                ...current.splits.filter(
                  (s) => s.day_of_week !== saved.day_of_week,
                ),
                saved,
              ],
            }
          : current,
      );
      setEditing(null);
    } catch (e) {
      console.error("saveSplitForDay failed", e);
      setState({ status: "error" });
    } finally {
      setSaving(null);
    }
  }

  if (editing !== null) {
    const current =
      state.status === "ready"
        ? state.splits.find((s) => s.day_of_week === editing)
        : undefined;

    return (
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-3">
          <ScreenTitle>Program</ScreenTitle>
          <div className="flex flex-col gap-1">
            <p className="text-display text-ink font-condensed uppercase">
              {WEEKDAYS[editing]}
            </p>
            {/*
              A day that already has an answer says what it is, so it is clear
              what is being changed and from what. Plural throughout, because
              this changes every one of them rather than only today.
            */}
            <p className="text-body text-muted">
              {current
                ? `Currently ${current.name}. Pick another to change it.`
                : `What do you train on ${WEEKDAYS[editing]}s?`}
            </p>
          </div>
        </div>

        <RegionChoice saving={saving} onChoose={choose} />

        <button
          type="button"
          disabled={saving !== null}
          onClick={() => setEditing(null)}
          className={`${quiet} self-start`}
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <ScreenTitle>Program</ScreenTitle>
      <p className="text-body text-muted">
        Your weekday split. This is what Today reads.
      </p>

      {state.status === "loading" ? <LoadingRows /> : null}

      {state.status === "error" ? (
        <div className="mt-5 flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <p role="alert" className="text-lead text-ink">
              Could not load your schedule.
            </p>
            <p className="text-body text-muted">
              Check your connection and try again. Nothing has been lost.
            </p>
          </div>
          <button type="button" onClick={retry} className={secondaryAction}>
            Try again
          </button>
        </div>
      ) : null}

      {/*
        Seven rows, always. There is no empty state beyond every day reading
        Not set, because the weekdays exist whether or not they are answered.

        Hairline dividers rather than seven bordered boxes, per the spec's
        preference for thin lines over containers. Under the strip test the
        rows still read as a schedule, because the alignment does the work.
      */}
      {state.status === "ready" ? (
        <ul className="mt-2">
          {WEEK_IN_READING_ORDER.map((day) => {
            const split = state.splits.find((s) => s.day_of_week === day);
            return (
              <li key={day} className="border-border border-b last:border-b-0">
                <button
                  type="button"
                  onClick={() => setEditing(day)}
                  className="flex w-full items-baseline justify-between gap-4 py-4 text-left"
                >
                  <span className="text-body text-muted">{WEEKDAYS[day]}</span>
                  {/*
                    An unanswered day says so in words. Leaving it blank, or
                    marking it by colour alone, would read as a failed load.
                  */}
                  <span
                    className={
                      split ? "text-lead text-ink" : "text-body text-muted"
                    }
                  >
                    {split ? split.name : "Not set"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

function LoadingRows() {
  return (
    <div className="mt-2 flex flex-col" aria-busy="true" aria-label="Loading">
      {WEEK_IN_READING_ORDER.map((day) => (
        <div
          key={day}
          className="border-border flex items-center justify-between border-b py-4 last:border-b-0"
        >
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-6 w-20" />
        </div>
      ))}
    </div>
  );
}

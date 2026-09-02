"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";

import { RegionChoice } from "@/components/RegionChoice";
import { ScreenTitle } from "@/components/ScreenTitle";
import { Skeleton } from "@/components/Skeleton";
import { primaryAction, quiet, secondaryAction } from "@/components/controls";
import {
  DayKind,
  Program,
  ProgramDay,
  ProgramExercise,
  addProgramDay,
  deleteProgram,
  describeKind,
  fetchProgram,
  fetchProgramDays,
  fetchProgramExercises,
  followProgram,
  isCardioDay,
} from "@/lib/programs";
import { WEEKDAYS } from "@/lib/splits";

/**
 * One program: its days, and whether it is the one being followed.
 *
 * A day is added with the same control the weekday split uses, because it is
 * the same question — what does this day train — and a program's day is exactly
 * the multi-region day that control now makes. Push is chest, shoulders and
 * triceps whether a program says so or the owner does.
 *
 * A day carries no number. "Day 1" is the counter CLAUDE.md forbids: the
 * weekday already separates Monday's Push from Thursday's Push.
 */

type State =
  | { status: "loading" }
  | { status: "error" }
  | { status: "missing" }
  | {
      status: "ready";
      program: Program;
      days: ProgramDay[];
      exercises: Map<string, ProgramExercise[]>;
    };

export default function ProgramPage({ params }: PageProps<"/program/[id]">) {
  const { id } = use(params);
  const router = useRouter();
  const [state, setState] = useState<State>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    let active = true;

    fetchProgram(id)
      .then(async (program) => {
        if (!program) {
          if (active) setState({ status: "missing" });
          return;
        }
        const days = await fetchProgramDays(program.id);
        const exercises = await fetchProgramExercises(days.map((d) => d.id));
        if (active) setState({ status: "ready", program, days, exercises });
      })
      .catch((e: Error) => {
        if (!active) return;
        console.error("the program failed to load", e);
        setState({ status: "error" });
      });

    return () => {
      active = false;
    };
  }, [id, attempt]);

  function reload() {
    setState({ status: "loading" });
    setAttempt((n) => n + 1);
  }

  async function addDay(name: string, muscles: string[]) {
    if (state.status !== "ready") return;
    setBusy(name);
    try {
      // Appended after whatever is already there. Position is storage order for
      // the list and is never shown.
      await addProgramDay(
        state.program.id,
        name,
        muscles,
        null,
        state.days.length,
      );
      setAdding(false);
      reload();
    } catch (e) {
      console.error("could not add the day", e);
      setState({ status: "error" });
    } finally {
      setBusy(null);
    }
  }

  async function toggleFollow() {
    if (state.status !== "ready") return;
    setBusy("follow");
    try {
      await followProgram(state.program.is_active ? null : state.program.id);
      reload();
    } catch (e) {
      console.error("could not change which program is followed", e);
      setState({ status: "error" });
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (state.status !== "ready") return;
    setBusy("delete");
    try {
      await deleteProgram(state.program.id);
      router.push("/program");
    } catch (e) {
      console.error("could not delete the program", e);
      setState({ status: "error" });
      setBusy(null);
    }
  }

  if (state.status === "loading") {
    return (
      <div
        className="flex flex-col gap-3"
        aria-busy="true"
        aria-label="Loading"
      >
        <ScreenTitle>Program</ScreenTitle>
        <Skeleton className="mt-4 h-[42px] w-2/3" />
        <Skeleton className="mt-4 h-6 w-full" />
        <Skeleton className="h-6 w-4/5" />
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="flex flex-col gap-5">
        <ScreenTitle>Program</ScreenTitle>
        <div className="flex flex-col gap-2">
          <p role="alert" className="text-lead text-ink">
            Could not load this program.
          </p>
          <p className="text-body text-muted">
            Check your connection and try again. Nothing has been lost.
          </p>
        </div>
        <button type="button" onClick={reload} className={secondaryAction}>
          Try again
        </button>
      </div>
    );
  }

  if (state.status === "missing") {
    return (
      <div className="flex flex-col gap-5">
        <ScreenTitle>Program</ScreenTitle>
        <p className="text-lead text-ink">This program is gone.</p>
        <Link href="/program" className={secondaryAction}>
          Back to Program
        </Link>
      </div>
    );
  }

  const { program, days, exercises } = state;

  if (adding) {
    return (
      <div className="flex flex-col gap-5">
        <ScreenTitle>Program</ScreenTitle>
        <div className="flex flex-col gap-2">
          <p className="text-display text-ink font-condensed uppercase">
            Add a day
          </p>
          <p className="text-body text-muted">
            What this day trains. Assign it to a weekday afterwards.
          </p>
        </div>
        <RegionChoice saving={busy} onChoose={addDay} />
        <button
          type="button"
          onClick={() => setAdding(false)}
          className={`${quiet} self-start`}
        >
          Cancel
        </button>
      </div>
    );
  }

  if (confirmDelete) {
    return (
      <div className="flex flex-col gap-5">
        <ScreenTitle>Program</ScreenTitle>
        <div className="flex flex-col gap-2">
          <p className="text-lead text-ink">Delete {program.name}?</p>
          <p className="text-body text-muted">
            Its days and everything in them go too. This cannot be undone.
            Workouts you have already done are not touched.
          </p>
        </div>
        <button
          type="button"
          disabled={busy !== null}
          onClick={remove}
          className={secondaryAction}
        >
          {busy === "delete" ? "Deleting" : "Delete program"}
        </button>
        <button
          type="button"
          onClick={() => setConfirmDelete(false)}
          className={`${quiet} self-start`}
        >
          Keep it
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <ScreenTitle>Program</ScreenTitle>

      <Link
        href="/program"
        className="text-label text-muted self-start uppercase underline underline-offset-4"
      >
        ← All programs
      </Link>

      <div className="mt-2 flex flex-col gap-1">
        <p className="text-display text-ink font-condensed uppercase">
          {program.name}
        </p>
        {/*
          Whether it is being followed, in words. Not a switch marked only by
          colour: this decides what Today reads and has to be unmistakable.
        */}
        <p className="text-body text-muted">
          {program.is_active
            ? "Today reads this program."
            : "Not being followed. Today reads your weekday split."}
        </p>
      </div>

      {/* What the plan is for, when it says. */}
      {program.description ? (
        <p className="text-body text-ink mt-2">{program.description}</p>
      ) : null}

      <button
        type="button"
        disabled={busy !== null}
        onClick={toggleFollow}
        className={program.is_active ? secondaryAction : primaryAction}
      >
        {busy === "follow"
          ? "Saving"
          : program.is_active
            ? "Stop following"
            : "Follow this program"}
      </button>

      {/*
        Standing notes for the whole plan: what is deliberately left out, what
        to test occasionally. These are the things that get forgotten and then
        quietly undone six weeks later, which is the argument for putting them
        where the program is read rather than in a note somewhere else.
      */}
      {program.notes.length > 0 ? (
        <div className="mt-6 flex flex-col gap-2">
          <p className="text-label text-muted uppercase">Standing notes</p>
          <ul className="flex flex-col gap-2">
            {program.notes.map((note) => (
              <li key={note} className="text-body text-ink">
                {note}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-6 flex flex-col gap-2">
        <p className="text-label text-muted uppercase">Days</p>

        {days.length === 0 ? (
          <p className="text-body text-muted">
            No days yet. A day is what you train and, once you place it, which
            weekday you train it on.
          </p>
        ) : (
          <ul>
            {days.map((day) => {
              const mine = exercises.get(day.id) ?? [];
              return (
                <li
                  key={day.id}
                  className="border-border border-b last:border-b-0"
                >
                  <Link
                    href={`/program/${program.id}/day/${day.id}`}
                    className="flex items-baseline justify-between gap-4 py-4"
                  >
                    <span className="flex flex-col gap-1">
                      <span className="text-lead text-ink">{day.name}</span>
                      {/*
                        What the day is and what is in it. A count of exercises
                        alone described every day identically once days stopped
                        all being lifting: a bike day and an unfinished
                        strength day both read "nothing added yet".
                      */}
                      <span className="text-body text-muted">
                        {describeDayContents(day, mine.length)}
                      </span>
                    </span>
                    {/*
                      The weekday, or that it has none. An unplaced day reads in
                      words rather than being left blank, which would look like
                      a failed load.
                    */}
                    <span className="text-body text-muted shrink-0">
                      {day.day_of_week === null
                        ? "Unplaced"
                        : WEEKDAYS[day.day_of_week]}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <button
        type="button"
        onClick={() => setAdding(true)}
        className={`${quiet} mt-4 self-start`}
      >
        Add a day
      </button>

      <button
        type="button"
        onClick={() => setConfirmDelete(true)}
        className={`${quiet} mt-2 self-start`}
      >
        Delete this program
      </button>
    </div>
  );
}

/**
 * A day's one line in the list.
 *
 * "Strength · 6 exercises". "Zone 2". "Rest".
 *
 * A count on its own stopped describing a day once days stopped all being
 * lifting: a bike day and an unfinished strength day both read "nothing added
 * yet", which called one of them a mistake.
 */
function describeDayContents(
  day: { kind: DayKind },
  exercises: number,
): string {
  const kind = describeKind(day.kind);
  if (day.kind === "rest") return kind;

  if (exercises === 0) {
    // A cardio day with no lifting is finished, not empty. The ride is on the
    // day's own screen; here the kind is the whole answer.
    return isCardioDay(day.kind) ? kind : `${kind} · nothing added yet`;
  }
  return `${kind} · ${exercises} ${exercises === 1 ? "exercise" : "exercises"}`;
}

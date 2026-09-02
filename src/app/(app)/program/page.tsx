"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import Link from "next/link";

import { RegionChoice } from "@/components/RegionChoice";
import { ScreenTitle } from "@/components/ScreenTitle";
import { Skeleton } from "@/components/Skeleton";
import { choice, quiet, secondaryAction } from "@/components/controls";
import {
  Program,
  ProgramDay,
  ProgramExercise,
  createProgram,
  describeProgram,
  fetchProgramDays,
  fetchProgramExercises,
  fetchPrograms,
} from "@/lib/programs";
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
 * Programs sit beneath it. A program is a named plan with its own days, and
 * following one is optional: with none active this screen and Today behave
 * exactly as they did before programs existed.
 *
 * There is no primary action. Seven weekdays are equal, and promoting one of
 * them would be a lie about which day matters.
 */

type State =
  | { status: "loading" }
  | { status: "error" }
  | {
      status: "ready";
      splits: Split[];
      programs: Program[];
      /** Days and exercises per program, for the one line each row shows. */
      days: Map<string, ProgramDay[]>;
      exercises: Map<string, ProgramExercise[]>;
    };

export default function ProgramPage() {
  const router = useRouter();
  const [state, setState] = useState<State>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  /** The weekday being changed, or null when the schedule is being read. */
  const [editing, setEditing] = useState<number | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  /** Naming a new program. Null when not creating one. */
  const [newName, setNewName] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let active = true;

    Promise.all([fetchAllSplits(), fetchPrograms()])
      .then(async ([splits, programs]) => {
        // Each program's days, so a row can say how much is in it. Read
        // together rather than one request per program.
        const days = new Map<string, ProgramDay[]>();
        const exercises = new Map<string, ProgramExercise[]>();
        for (const program of programs) {
          const mine = await fetchProgramDays(program.id);
          days.set(program.id, mine);
          const byDay = await fetchProgramExercises(mine.map((d) => d.id));
          exercises.set(program.id, [...byDay.values()].flat());
        }
        if (active)
          setState({ status: "ready", splits, programs, days, exercises });
      })
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
        console.error("Program failed to load", e);
        setState({ status: "error" });
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
              ...current,
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

  async function create() {
    if (newName === null || newName.trim() === "") return;
    setCreating(true);
    try {
      const program = await createProgram(newName.trim());
      router.push(`/program/${program.id}`);
    } catch (e) {
      console.error("could not create the program", e);
      setState({ status: "error" });
      setCreating(false);
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

      {/*
        Programs. Beneath the weekdays because the split is what Today reads
        unless a program says otherwise, and because following one is optional.
      */}
      {state.status === "ready" ? (
        <div className="mt-10 flex flex-col gap-2">
          <p className="text-label text-muted uppercase">Programs</p>

          {state.programs.length === 0 ? (
            <p className="text-body text-muted">
              None yet. A program is a named plan with its own days, which you
              can follow instead of the weekday split above.
            </p>
          ) : (
            <ul>
              {state.programs.map((program) => (
                <li
                  key={program.id}
                  className="border-border border-b last:border-b-0"
                >
                  <Link
                    href={`/program/${program.id}`}
                    className="flex items-baseline justify-between gap-4 py-4"
                  >
                    <span className="flex flex-col gap-1">
                      <span className="text-lead text-ink">{program.name}</span>
                      <span className="text-body text-muted">
                        {describeProgram(
                          (state.days.get(program.id) ?? []).length,
                          (state.exercises.get(program.id) ?? []).length,
                        )}
                      </span>
                      {/*
                        What the plan is for. With one program the name said
                        enough; with two, "5 days" and "7 days" is not a reason
                        to pick either.
                      */}
                      {program.description ? (
                        <span className="text-body text-muted">
                          {program.description}
                        </span>
                      ) : null}
                    </span>
                    {/*
                      Which one is being followed, in a word. Not a colour and
                      not an icon: this decides what Today reads.
                    */}
                    {program.is_active ? (
                      <span className="text-body text-accent shrink-0 font-bold">
                        Following
                      </span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {newName === null ? (
            <button
              type="button"
              onClick={() => setNewName("")}
              className={`${quiet} mt-4 self-start`}
            >
              New program
            </button>
          ) : (
            <div className="mt-4 flex flex-col gap-3">
              <label
                htmlFor="program-name"
                className="text-label text-muted uppercase"
              >
                What is it called
              </label>
              <input
                id="program-name"
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Bigger Leaner Stronger"
                autoCapitalize="words"
                autoCorrect="off"
                spellCheck={false}
                disabled={creating}
                className="bg-surface text-ink border-border placeholder:text-muted focus:border-muted h-12 w-full rounded-md border px-4 text-base outline-none"
              />
              <button
                type="button"
                disabled={creating || newName.trim() === ""}
                onClick={create}
                className={`${choice} justify-center`}
              >
                {creating ? "Creating" : "Create it"}
              </button>
              <button
                type="button"
                onClick={() => setNewName(null)}
                className={`${quiet} self-start`}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
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

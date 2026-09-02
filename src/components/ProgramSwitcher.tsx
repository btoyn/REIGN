"use client";

import { useEffect, useState } from "react";

import { Skeleton } from "@/components/Skeleton";
import { choice, quiet, secondaryAction } from "@/components/controls";
import { Program, fetchPrograms, followProgram } from "@/lib/programs";

/**
 * Which program Today reads.
 *
 * There are two programs now, and before this the only way to change which one
 * was being followed was to open it and press Follow — which means knowing
 * which one you are on before you can leave it. Switching is a thing the owner
 * does between training blocks, so it belongs on the screen where settings
 * live rather than three taps into the one you want to leave.
 *
 * This is a switch, not a browser. It lists what exists, marks the one in use,
 * and changes it. What a program contains is still read on the Program tab,
 * because that is a different question and this screen is not the place to
 * answer it.
 *
 * Following nothing is a first-class choice rather than an omission: with no
 * program active Today reads the weekday split, which is what it did before
 * programs existed and is never wrong, only less specific.
 */

type State =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; programs: Program[] };

export function ProgramSwitcher() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    fetchPrograms()
      .then((programs) => {
        if (active) setState({ status: "ready", programs });
      })
      .catch((e: Error) => {
        if (!active) return;
        console.error("could not read the programs", e);
        setState({ status: "error" });
      });

    return () => {
      active = false;
    };
  }, [attempt]);

  /**
   * Follow one, or none.
   *
   * The list is re-read rather than patched in place. followProgram clears
   * every active row before setting one, so the state afterwards is a fact
   * about the database rather than something this screen can work out, and
   * guessing it would be how two programs come to look active at once.
   */
  async function choose(id: string | null) {
    setBusy(id ?? "none");
    try {
      await followProgram(id);
      setState({ status: "loading" });
      setAttempt((n) => n + 1);
    } catch (e) {
      console.error("could not change the followed program", e);
      setState({ status: "error" });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-label text-muted uppercase">Program</p>

      {state.status === "loading" ? (
        <div
          className="flex flex-col gap-2"
          aria-busy="true"
          aria-label="Loading"
        >
          <Skeleton className="h-14 w-full rounded-md" />
          <Skeleton className="h-14 w-full rounded-md" />
        </div>
      ) : null}

      {state.status === "error" ? (
        <div className="flex flex-col gap-3">
          <p role="alert" className="text-body text-ink">
            Could not read your programs.
          </p>
          <p className="text-body text-muted">
            Today still works. It falls back to your weekday split.
          </p>
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

      {state.status === "ready" ? (
        state.programs.length === 0 ? (
          <p className="text-body text-muted">
            No programs yet. Today reads your weekday split.
          </p>
        ) : (
          <>
            <ul className="flex flex-col gap-2">
              {state.programs.map((program) => (
                <li key={program.id}>
                  <button
                    type="button"
                    disabled={busy !== null || program.is_active}
                    onClick={() => choose(program.id)}
                    className={`${choice} justify-between gap-4`}
                    aria-current={program.is_active ? "true" : undefined}
                  >
                    <span className="truncate">{program.name}</span>
                    {/*
                      Which one is in use, in a word and in weight. Never the
                      gold alone: the rule is that no state is signalled by hue
                      by itself, and this one decides what Today reads.
                    */}
                    {program.is_active ? (
                      <span className="text-body text-accent shrink-0 font-bold uppercase">
                        Following
                      </span>
                    ) : (
                      <span className="text-body text-muted shrink-0">
                        {busy === program.id ? "Switching" : "Follow"}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>

            {/*
              Following nothing, which is a real answer rather than the absence
              of one. Quiet, because it is an escape hatch and not what this
              part of the screen is for.
            */}
            {state.programs.some((p) => p.is_active) ? (
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => choose(null)}
                className={`${quiet} self-start`}
              >
                {busy === "none" ? "Stopping" : "Follow none, use my split"}
              </button>
            ) : (
              <p className="text-body text-muted">
                Following none. Today reads your weekday split.
              </p>
            )}
          </>
        )
      ) : null}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  Weighin,
  describeWeight,
  fetchWeighins,
  latest,
} from "@/lib/bodyweight";
import { isTableNotThere } from "@/lib/schema";

/**
 * Bodyweight on the You tab: the current figure, and the way in to record one.
 *
 * A row rather than an input. Entering a weight wants the number pad and a
 * record of every reading, which is a screen, and You is a list of settings
 * rather than a place to type. So this states the number and gets out of the
 * way.
 *
 * It never breaks the screen. A failed read shows the row with no figure and
 * still links onward, because the way to record a weigh-in must not depend on
 * being able to read the old ones.
 *
 * ONE FAILURE IS NOT TREATED THAT WAY. A read that fails because the table is
 * not in the database at all says so, because "Not recorded" would be a lie
 * with consequences: it reads as a normal empty row, so the owner taps through
 * expecting the number pad and meets a screen that cannot take a number. The
 * one state they have to act on would be the one the row disguised.
 *
 * A read that merely failed still says "Not recorded", and that stays a
 * deliberate choice: it might genuinely be empty, the next tap probably works,
 * and there is nothing for the owner to do about it from here.
 */

type State =
  | { status: "loading" }
  | { status: "not set up" }
  | { status: "ready"; current: Weighin | null };

export function BodyweightRow() {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let active = true;

    fetchWeighins()
      .then((weighins) => {
        if (active) setState({ status: "ready", current: latest(weighins) });
      })
      .catch((e: Error) => {
        if (!active) return;
        console.error("could not read the bodyweight", e);
        // Ready with nothing, not an error state. The link still has to work.
        setState(
          isTableNotThere(e)
            ? { status: "not set up" }
            : { status: "ready", current: null },
        );
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-label text-muted uppercase">Bodyweight</p>

      <Link
        href="/bodyweight"
        className="border-border flex items-baseline justify-between gap-4 border-y py-4"
      >
        <span className="text-lead text-ink">
          {state.status === "loading"
            ? "Reading…"
            : state.status === "not set up"
              ? "Not set up"
              : state.current
                ? describeWeight(state.current.weight)
                : "Not recorded"}
        </span>
        {/*
          The word on the right says what the tap does, so it changes with the
          state rather than promising to add a number the app has nowhere to
          put. Never a colour: the state is in both words or it is not stated.
        */}
        <span className="text-body text-muted shrink-0">
          {state.status === "not set up"
            ? "What to do"
            : state.status === "ready" && state.current
              ? "Weigh in"
              : "Add"}
        </span>
      </Link>
    </div>
  );
}

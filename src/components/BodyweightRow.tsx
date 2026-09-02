"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  Weighin,
  describeWeight,
  fetchWeighins,
  latest,
} from "@/lib/bodyweight";

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
 */

type State =
  | { status: "loading" }
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
        setState({ status: "ready", current: null });
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
            : state.status === "ready" && state.current
              ? describeWeight(state.current.weight)
              : "Not recorded"}
        </span>
        <span className="text-body text-muted shrink-0">
          {state.status === "ready" && state.current ? "Weigh in" : "Add"}
        </span>
      </Link>
    </div>
  );
}

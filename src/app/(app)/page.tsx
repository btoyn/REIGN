"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { BrandHeader } from "@/components/BrandHeader";
import { ScreenTitle } from "@/components/ScreenTitle";
import { Skeleton } from "@/components/Skeleton";
import {
  choice,
  primaryAction,
  quiet,
  secondaryAction,
} from "@/components/controls";
import { REGIONS } from "@/lib/regions";
import {
  REST_DAY_NAME,
  Split,
  fetchSplitForDay,
  isRestDay,
  saveSplitForDay,
  todayDayOfWeek,
} from "@/lib/splits";

/**
 * Today.
 *
 * The screen answers one question: what am I doing today?
 *
 * It reads the answer from the weekday split rather than asking every time,
 * because the owner trains the same thing every Monday and starting training
 * should not require a decision. The split assembles itself: the first time a
 * weekday comes around the screen asks once, records the answer, and never
 * asks about that day again. There is no setup wizard.
 *
 * Two of the spec's five states are missing here on purpose. `In progress` and
 * `Done today` both describe a workout, and nothing creates a workout yet, so
 * building them now would mean building states no data can ever reach. They
 * arrive with the logging engine.
 */

type State =
  | { status: "loading" }
  | { status: "error" }
  /** This weekday has never been answered. */
  | { status: "asking"; saving: string | null }
  | { status: "known"; split: Split };

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export default function TodayPage() {
  const [state, setState] = useState<State>({ status: "loading" });
  // Read once and held, so the screen cannot answer for one day and save
  // against another if it is left open across midnight.
  const [dayOfWeek] = useState(todayDayOfWeek);

  // Bumped by Try again. Changing it re-runs the read below; the screen is
  // already in its loading state before the effect runs, so the effect body
  // never sets state synchronously.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;

    fetchSplitForDay(dayOfWeek)
      .then((split) => {
        if (!active) return;
        setState(
          split
            ? { status: "known", split }
            : { status: "asking", saving: null },
        );
      })
      .catch((e: Error) => {
        // The underlying message is technical and means nothing to the person
        // reading it, so it goes to the console and the screen says what
        // actually happened.
        console.error("fetchSplitForDay failed", e);
        if (active) setState({ status: "error" });
      });

    return () => {
      active = false;
    };
  }, [dayOfWeek, attempt]);

  function retry() {
    setState({ status: "loading" });
    setAttempt((n) => n + 1);
  }

  async function answer(name: string, muscles: string[]) {
    setState({ status: "asking", saving: name });
    try {
      const split = await saveSplitForDay(dayOfWeek, name, muscles);
      setState({ status: "known", split });
    } catch (e) {
      console.error("saveSplitForDay failed", e);
      setState({ status: "error" });
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <BrandHeader />

      <div className="flex flex-col gap-3">
        <ScreenTitle>Today</ScreenTitle>

        {state.status === "loading" ? <LoadingBlock /> : null}
        {state.status === "error" ? <ErrorBlock onRetry={retry} /> : null}
        {state.status === "asking" ? (
          <AskBlock
            weekday={WEEKDAYS[dayOfWeek]}
            saving={state.saving}
            onAnswer={answer}
          />
        ) : null}
        {state.status === "known" ? (
          <KnownBlock split={state.split} weekday={WEEKDAYS[dayOfWeek]} />
        ) : null}
      </div>
    </div>
  );
}

/**
 * Loading.
 *
 * Shaped like the answer it is waiting for, so the screen does not jump when
 * the real content lands. "Loading…" as text would be a smaller lie in the
 * same place.
 */
function LoadingBlock() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-[42px] w-2/3" />
      <Skeleton className="h-5 w-1/2" />
      <Skeleton className="mt-5 h-14 w-full rounded-lg" />
    </div>
  );
}

function ErrorBlock({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <p role="alert" className="text-lead text-ink">
          Could not load your split.
        </p>
        <p className="text-body text-muted">
          Check your connection and try again. Nothing has been lost.
        </p>
      </div>
      <button type="button" onClick={onRetry} className={secondaryAction}>
        Try again
      </button>
    </div>
  );
}

/** Split unknown: the one question this weekday will ever be asked. */
function AskBlock({
  weekday,
  saving,
  onAnswer,
}: {
  weekday: string;
  saving: string | null;
  onAnswer: (name: string, muscles: string[]) => void;
}) {
  const busy = saving !== null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <h2 className="text-hero text-ink font-condensed">
          What are you training today?
        </h2>
        <p className="text-body text-muted">
          Asked once. Every {weekday} after this one is answered for you.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {REGIONS.map((region) => (
          <button
            key={region.name}
            type="button"
            disabled={busy}
            onClick={() => onAnswer(region.name, region.muscles)}
            className={
              saving === region.name
                ? `${choice} border-accent text-accent`
                : choice
            }
          >
            {saving === region.name ? "Saving" : region.name}
          </button>
        ))}
      </div>

      {/*
        A rest day is a recorded answer, not a missing one: a split with a name
        and no muscles. Quieter than the six, because it is the less common
        answer, but it is a real choice and not a way out of the question.
      */}
      <button
        type="button"
        disabled={busy}
        onClick={() => onAnswer(REST_DAY_NAME, [])}
        className={`${choice} text-body text-muted`}
      >
        {saving === REST_DAY_NAME ? "Saving" : REST_DAY_NAME}
      </button>
    </div>
  );
}

/** Ready, or a rest day. Both are a known split; only one has a workout in it. */
function KnownBlock({ split, weekday }: { split: Split; weekday: string }) {
  const resting = isRestDay(split);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <p className="text-display text-ink font-condensed uppercase">
          {split.name}
        </p>
        {/*
          Where this came from, not what it is. Naming the split again under
          itself would be decoration. Programs will replace this line when they
          take precedence, which is a later milestone.

          A rest day has no source worth naming — calling it a split under the
          words REST DAY is noise — so its sentence below carries the whole
          explanation instead.
        */}
        {resting ? null : (
          <p className="text-body text-muted">Weekday split · {weekday}</p>
        )}
      </div>

      {resting ? (
        <div className="flex flex-col gap-5">
          <p className="text-body text-muted">
            Nothing scheduled for {weekday}s. Training anyway is one tap away.
          </p>
          <Link href="/exercises" className={quiet}>
            Something else
          </Link>
        </div>
      ) : (
        /*
          One primary action, no pair. `Something else` belongs beside this
          button in the spec, but until workouts exist it would go to the same
          screen START WORKOUT goes to, and two controls that do the identical
          thing are worse than one. It returns when the two differ.
        */
        <Link href="/exercises" className={primaryAction}>
          Start Workout
        </Link>
      )}
    </div>
  );
}

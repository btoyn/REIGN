"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { NumberPad, PadKey } from "@/components/NumberPad";
import { ScreenTitle } from "@/components/ScreenTitle";
import { Skeleton } from "@/components/Skeleton";
import { primaryAction, quiet, secondaryAction } from "@/components/controls";
import {
  Weighin,
  describeWeight,
  deleteWeighin,
  fetchWeighins,
  latest,
  logWeight,
} from "@/lib/bodyweight";
import { applyKey, displayValue } from "@/lib/entry";
import { shortDate } from "@/lib/progress";
import { todayDate } from "@/lib/workouts";

/**
 * Recording a weigh-in.
 *
 * The same number pad as sets and cardio, for the same reason: this is typed
 * standing on a scale, and the iOS keyboard is wrong for numbers.
 *
 * ONE READING PER DAY. Weighing again on the same day is a correction, not a
 * second reading, so today's figure is pre-filled and saving replaces it. That
 * is also why the screen says whether today has already been recorded: without
 * it, the owner cannot tell whether they are adding or overwriting.
 *
 * The trend lives on Progress. This screen is for putting the number in.
 */

type State =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; weighins: Weighin[] };

export default function BodyweightPage() {
  const router = useRouter();
  const [state, setState] = useState<State>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);

  const [date] = useState(todayDate);

  useEffect(() => {
    let active = true;

    fetchWeighins()
      .then((weighins) => {
        if (!active) return;
        setState({ status: "ready", weighins });
        /*
          Today's reading, if there is one, so a correction starts from what is
          already stored rather than from an empty box. Anything else would make
          fixing a typo mean retyping the whole figure.
        */
        const today = weighins.find((w) => w.date === date);
        if (today) setTyped(String(today.weight));
      })
      .catch((e: Error) => {
        if (!active) return;
        console.error("could not read the weigh-ins", e);
        setState({ status: "error" });
      });

    return () => {
      active = false;
    };
  }, [attempt, date]);

  function press(key: PadKey) {
    setFailed(false);
    setTyped((current) => applyKey(current, key, "bodyweight"));
  }

  const value = typed === "" ? null : Number(typed);
  const canSave = value !== null && value > 0;

  async function save() {
    if (!canSave) return;
    setBusy(true);
    setFailed(false);
    try {
      await logWeight(date, value);
      router.push("/progress");
    } catch (e) {
      console.error("could not save the weigh-in", e);
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    try {
      await deleteWeighin(id);
      setConfirmingDelete(null);
      setTyped("");
      setState({ status: "loading" });
      setAttempt((n) => n + 1);
    } catch (e) {
      console.error("could not delete the weigh-in", e);
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  if (state.status === "loading") {
    return (
      <div
        className="flex flex-col gap-3"
        aria-busy="true"
        aria-label="Loading"
      >
        <ScreenTitle>Bodyweight</ScreenTitle>
        <Skeleton className="h-[42px] w-1/2" />
        <Skeleton className="mt-4 h-64 w-full rounded-lg" />
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="flex flex-col gap-5">
        <ScreenTitle>Bodyweight</ScreenTitle>
        <div className="flex flex-col gap-2">
          <p role="alert" className="text-lead text-ink">
            Could not read your weigh-ins.
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
    );
  }

  const { weighins } = state;
  const today = weighins.find((w) => w.date === date) ?? null;
  const previous = latest(weighins.filter((w) => w.date !== date));

  if (confirmingDelete) {
    const doomed = weighins.find((w) => w.id === confirmingDelete);
    return (
      <div className="flex flex-col gap-5">
        <ScreenTitle>Bodyweight</ScreenTitle>
        <div className="flex flex-col gap-2">
          <p className="text-lead text-ink">Delete this weigh-in?</p>
          <p className="text-body text-muted">
            {doomed
              ? `${describeWeight(doomed.weight)} on ${shortDate(doomed.date)} will be removed.`
              : "It will be removed."}{" "}
            This cannot be undone.
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => remove(confirmingDelete)}
          className={secondaryAction}
        >
          {busy ? "Deleting" : "Delete weigh-in"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => setConfirmingDelete(null)}
          className={`${quiet} self-start`}
        >
          Keep it
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <ScreenTitle>Bodyweight</ScreenTitle>

      <div className="flex flex-col gap-1">
        {/*
          The figure being typed, large, in tabular figures so it does not
          shuffle as digits land. "lb" is stated because REIGN has no unit
          setting and silence would leave it to be guessed.
        */}
        <p className="text-display text-ink font-condensed tabular-nums">
          {typed === "" ? "—" : displayValue(typed)}
          <span className="text-lead text-muted font-sans"> lb</span>
        </p>
        <p className="text-body text-muted">
          {today
            ? `Recorded today. Saving replaces it.`
            : previous
              ? `Last weighed ${describeWeight(previous.weight)} on ${shortDate(previous.date)}.`
              : "Your first weigh-in."}
        </p>
      </div>

      <NumberPad onKey={press} decimalDisabled={false} />

      {failed ? (
        <p role="alert" className="text-body text-ink">
          Could not save that. Check your connection and try again.
        </p>
      ) : null}

      <button
        type="button"
        disabled={!canSave || busy}
        onClick={save}
        className={primaryAction}
      >
        {busy ? "Saving" : today ? "Replace Today" : "Save Weigh-in"}
      </button>

      {/*
        The record itself. Every reading in words, which is what a chart's
        tooltip would have shown and is more legible on a phone. Newest first,
        because a correction is nearly always to the most recent one.
      */}
      {weighins.length === 0 ? (
        <p className="text-body text-muted">
          Nothing recorded yet. The trend appears on Progress once there are two
          readings.
        </p>
      ) : (
        <div className="mt-2 flex flex-col gap-2">
          <p className="text-label text-muted uppercase">Every weigh-in</p>
          <ul>
            {weighins.map((weighin) => (
              <li
                key={weighin.id}
                className="border-border flex items-baseline justify-between gap-4 border-b py-3 last:border-b-0"
              >
                <span className="text-body text-muted">
                  {shortDate(weighin.date)}
                </span>
                <span className="flex items-baseline gap-4">
                  <span className="text-lead text-ink tabular-nums">
                    {describeWeight(weighin.weight)}
                  </span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setConfirmingDelete(weighin.id)}
                    className={`${quiet} shrink-0`}
                  >
                    Remove
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Link href="/you" className={`${quiet} self-start`}>
        Back to You
      </Link>
    </div>
  );
}

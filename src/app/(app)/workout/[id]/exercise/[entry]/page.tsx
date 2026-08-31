"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";

import { ExerciseImages } from "@/components/ExerciseImages";
import { NumberPad, PadKey } from "@/components/NumberPad";
import { RestTimer } from "@/components/RestTimer";
import { ScreenTitle } from "@/components/ScreenTitle";
import { Skeleton } from "@/components/Skeleton";
import { primaryAction, quiet, secondaryAction } from "@/components/controls";
import { Exercise, fetchExercisesByIds } from "@/lib/exercises";
import { Field, applyKey, displayValue, isLoggable } from "@/lib/entry";
import { Session, allSets, fetchExerciseSessions } from "@/lib/exerciseHistory";
import { isRecord, suggest } from "@/lib/progression";
import {
  RANGE_PRESETS,
  Target,
  fetchTarget,
  rangeOf,
  saveTarget,
} from "@/lib/targets";
import {
  LoggedSet,
  deleteSet,
  fetchSets,
  logSet,
  nextSetNumber,
  updateSet,
} from "@/lib/sets";
import { fetchWorkoutExercises } from "@/lib/workouts";

/**
 * Logging one exercise.
 *
 * Sets of the same exercise happen back to back, so this screen is entered once
 * per exercise rather than once per set. The weight and reps carry over from the
 * last set, which makes a repeat set a single tap on LOG SET. Changing a number
 * costs a few more, which is the two to three taps CLAUDE.md asks for.
 *
 * Weights are in pounds. There is no unit setting yet, and inventing one before
 * it is asked for would be a feature nobody requested.
 */

type Data =
  | { status: "loading" }
  | { status: "error" }
  | { status: "missing" }
  | {
      status: "ready";
      exercise: Exercise | null;
      sets: LoggedSet[];
      /** Null until this exercise has been given a rep range. */
      target: Target | null;
      /** Past workouts containing this exercise, most recent first. */
      sessions: Session[];
    };

export default function LogExercisePage({
  params,
}: PageProps<"/workout/[id]/exercise/[entry]">) {
  const { id, entry } = use(params);

  const [data, setData] = useState<Data>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [field, setField] = useState<Field>("weight");
  const [editingId, setEditingId] = useState<string | null>(null);
  /**
   * The photographs are asked for, never pushed.
   *
   * Most exercises are familiar. Showing them by default spends bandwidth on
   * gym wifi for a picture nobody needed, and measurably pushed LOG SET 48
   * points behind the tab bar. Asked for, they get the whole screen.
   */
  const [showingMovement, setShowingMovement] = useState(false);
  /** Which rep range is chosen while answering the first-time question. */
  const [pickedRange, setPickedRange] = useState(2);
  /**
   * When the last set was logged, in this screen's own time.
   *
   * Not read from completed_at: that is the database's clock, and a rest timer
   * that disagrees with the phone by a few seconds looks broken. It starts at
   * null so no timer runs before the first set of the visit.
   */
  const [lastLoggedAt, setLastLoggedAt] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [writeFailed, setWriteFailed] = useState(false);

  useEffect(() => {
    let active = true;

    Promise.all([fetchWorkoutExercises(id), fetchSets(entry)])
      .then(async ([entries, sets]) => {
        const mine = entries.find((e) => e.id === entry);
        if (!mine) {
          if (active) setData({ status: "missing" });
          return;
        }
        const [library, target, sessions] = await Promise.all([
          fetchExercisesByIds([mine.exercise_id]),
          fetchTarget(mine.exercise_id),
          fetchExerciseSessions(mine.exercise_id, id),
        ]);
        if (!active) return;

        setData({
          status: "ready",
          exercise: library.get(mine.exercise_id) ?? null,
          sets,
          target,
          sessions,
        });

        // Within a workout, carry the last set forward so repeating it is one
        // tap. Starting fresh, take what double progression suggests, and fall
        // back to the recorded working weight when there is no history yet.
        const last = sets[sets.length - 1];
        if (last) {
          setWeight(last.weight === null ? "" : String(last.weight));
          setReps(last.reps === null ? "" : String(last.reps));
          return;
        }
        if (!target) return;

        const range = rangeOf(target);
        const proposed = suggest(
          sessions.map((session) => session.sets),
          range,
        );
        if (proposed) {
          setWeight(String(proposed.weight));
          setReps(String(proposed.reps));
        } else if (target.current_weight !== null) {
          setWeight(String(target.current_weight));
          setReps(String(range.min));
        }
      })
      .catch((e: Error) => {
        /*
          Nothing is reported once the screen has gone. A request abandoned by
          navigating away rejects like any other failure, but there is nobody
          left to tell and no state left to set, so saying so in the console
          only buries the failures that do matter.
        */
        if (!active) return;
        console.error("exercise failed to load", e);
        setData({ status: "error" });
      });

    return () => {
      active = false;
    };
  }, [id, entry, attempt]);

  function press(key: PadKey) {
    setWriteFailed(false);
    if (field === "weight") setWeight((v) => applyKey(v, key, "weight"));
    else setReps((v) => applyKey(v, key, "reps"));
  }

  function startEditing(set: LoggedSet) {
    setEditingId(set.id);
    setWeight(set.weight === null ? "" : String(set.weight));
    setReps(set.reps === null ? "" : String(set.reps));
    setField("weight");
    setWriteFailed(false);
  }

  function stopEditing(sets: LoggedSet[]) {
    setEditingId(null);
    const last = sets[sets.length - 1];
    setWeight(last?.weight === null || !last ? "" : String(last.weight));
    setReps(last?.reps === null || !last ? "" : String(last.reps));
    setField("weight");
  }

  /**
   * The first time an exercise is logged.
   *
   * Asked inline, on the screen where it is needed, because CLAUDE.md forbids a
   * separate setup wizard. Two answers: the weight usually lifted, and the rep
   * range being trained. After this the app suggests and never asks again.
   */
  async function answerFirstTime() {
    if (data.status !== "ready" || !data.exercise) return;
    if (weight === "") return;
    setBusy(true);
    setWriteFailed(false);
    try {
      const range = RANGE_PRESETS[pickedRange].range;
      const target = await saveTarget(data.exercise.id, range, Number(weight));
      setData({ ...data, target });
      setReps(String(range.min));
      setField("weight");
    } catch (e) {
      console.error("could not save the target", e);
      setWriteFailed(true);
    } finally {
      setBusy(false);
    }
  }

  async function commit() {
    if (data.status !== "ready" || !isLoggable(weight, reps)) return;
    setBusy(true);
    setWriteFailed(false);
    try {
      if (editingId) {
        const saved = await updateSet(editingId, Number(weight), Number(reps));
        const sets = data.sets.map((s) => (s.id === saved.id ? saved : s));
        setData({ ...data, sets });
        setEditingId(null);
        setField("weight");
      } else {
        const saved = await logSet(
          entry,
          nextSetNumber(data.sets),
          Number(weight),
          Number(reps),
        );
        // The values stay put, so the next set of the same weight is one tap.
        setData({ ...data, sets: [...data.sets, saved] });
        // The rest begins the moment the set ends. No button.
        setLastLoggedAt(Date.now());
      }
    } catch (e) {
      console.error("writing the set failed", e);
      setWriteFailed(true);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (data.status !== "ready" || !editingId) return;
    setBusy(true);
    setWriteFailed(false);
    try {
      await deleteSet(editingId);
      const sets = data.sets.filter((s) => s.id !== editingId);
      setData({ ...data, sets });
      stopEditing(sets);
    } catch (e) {
      console.error("deleting the set failed", e);
      setWriteFailed(true);
    } finally {
      setBusy(false);
    }
  }

  if (data.status === "loading") {
    return (
      <div
        className="flex flex-col gap-3"
        aria-busy="true"
        aria-label="Loading"
      >
        <ScreenTitle>Workout</ScreenTitle>
        <Skeleton className="h-9 w-4/5" />
        <Skeleton className="mt-5 h-6 w-1/2" />
        <Skeleton className="mt-5 h-64 w-full rounded-md" />
      </div>
    );
  }

  if (data.status === "error" || data.status === "missing") {
    const gone = data.status === "missing";
    return (
      <div className="flex flex-col gap-5">
        <ScreenTitle>Workout</ScreenTitle>
        <div className="flex flex-col gap-2">
          <p role="alert" className="text-lead text-ink">
            {gone ? "This exercise is gone." : "Could not load this exercise."}
          </p>
          <p className="text-body text-muted">
            {gone
              ? "It was removed from the workout, or the link is old."
              : "Check your connection and try again. Nothing has been lost."}
          </p>
        </div>
        {gone ? (
          <Link href={`/workout/${id}`} className={secondaryAction}>
            Back to the workout
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => {
              setData({ status: "loading" });
              setAttempt((n) => n + 1);
            }}
            className={secondaryAction}
          >
            Try again
          </button>
        )}
      </div>
    );
  }

  const { exercise, sets, target, sessions } = data;
  const canLog = isLoggable(weight, reps);

  // No rep range yet means this exercise has never been logged. Ask, once.
  const asking = target === null;

  const range = target ? rangeOf(target) : null;
  const proposal =
    range && sets.length === 0
      ? suggest(
          sessions.map((session) => session.sets),
          range,
        )
      : null;

  const earlier = allSets(sessions);
  const lastTime = sessions[0];

  return (
    /*
      Sixteen rather than twenty between the parts of this screen. It carries
      more than any other — name, movement, history, the rest, two fields, a
      twelve key pad and the action — and at twenty the rest timer pushed it
      thirteen points past the fold. Still on the four point scale.
    */
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <ScreenTitle>Workout</ScreenTitle>
        <h1 className="text-hero text-ink font-condensed">
          {exercise?.name ?? "Unknown exercise"}
        </h1>
      </div>

      {/*
        The history scrolls inside itself rather than pushing the pad down the
        page. By the fourth set the pad would otherwise be off screen, which is
        exactly when it is needed most.
      */}
      <button
        type="button"
        onClick={() => setShowingMovement((v) => !v)}
        className={`${quiet} self-start`}
      >
        {showingMovement ? "Hide movement" : "Show movement"}
      </button>

      {/*
        Swapping, for when the machine is taken.

        Offered only while nothing has been logged against this exercise. Once a
        set exists, that exercise was performed, and changing the name over it
        would rewrite what happened rather than change what is about to. The
        link simply goes, which reads as "too late for that" without a sentence
        explaining a control that is no longer relevant.
      */}
      {sets.length === 0 ? (
        <Link
          href={`/workout/${id}/exercise/${entry}/swap`}
          className={`${quiet} self-start`}
        >
          Swap this exercise
        </Link>
      ) : null}

      {/*
        Looking and logging are different things, so they do not share the
        screen. While the movement is shown it gets the whole of it, and the pad
        comes back when it is dismissed. Trying to fit both put the primary
        action behind the tab bar.
      */}
      {showingMovement && exercise ? (
        <ExerciseImages
          key={exercise.id}
          exerciseId={exercise.id}
          exerciseName={exercise.name}
        />
      ) : sets.length === 0 ? (
        /*
          One line where the set list will go, so nothing is added to the
          height. It says what happened last time and why the fields hold what
          they hold, because a number that changed itself and did not say why is
          worse than no number.
        */
        <p className="text-body text-muted">
          {lastTime
            ? `Last time · ${describeSession(lastTime.sets)}${proposal ? ` · ${proposal.because}` : ""}`
            : asking
              ? "First time. Nothing to go on yet."
              : "No sets yet."}
        </p>
      ) : (
        <ul className="max-h-36 overflow-y-auto">
          {sets.map((set, index) => {
            const editing = set.id === editingId;
            return (
              <li
                key={set.id}
                className="border-border border-b last:border-b-0"
              >
                <button
                  type="button"
                  onClick={() =>
                    editing ? stopEditing(sets) : startEditing(set)
                  }
                  className="flex w-full items-baseline gap-4 py-2.5 text-left"
                >
                  <span className="text-body text-muted w-5 shrink-0">
                    {index + 1}
                  </span>
                  {/*
                    Editing is marked by the word as well as the weight, so the
                    state does not rest on the gold alone.
                  */}
                  <span
                    className={`text-lead ${editing ? "text-accent font-bold" : "text-ink"}`}
                  >
                    {set.weight} lb × {set.reps}
                  </span>
                  {/*
                    A record is marked by the letters PR. The gold is on top of
                    the word, never instead of it. Records are worked out every
                    time from what came before, and never stored.
                  */}
                  {!editing && isRecord(set, earlier) ? (
                    <span className="text-label text-accent ml-auto font-bold uppercase">
                      PR
                    </span>
                  ) : null}
                  {editing ? (
                    <span className="text-label text-accent ml-auto uppercase">
                      Editing
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/*
        The first time an exercise is logged there is nothing to suggest from,
        so the app asks rather than guesses: the weight usually lifted, and the
        range being trained. Inline, on this screen, never a setup wizard.
      */}
      {asking && !showingMovement ? (
        <>
          <div className="flex gap-3">
            <ValueField
              label="Usual weight"
              suffix="lb"
              value={weight}
              active
              onSelect={() => setField("weight")}
            />
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-label text-muted uppercase">Rep range</p>
            <div className="grid grid-cols-4 gap-2">
              {RANGE_PRESETS.map((preset, index) => (
                <button
                  key={preset.label}
                  type="button"
                  aria-pressed={index === pickedRange}
                  onClick={() => setPickedRange(index)}
                  // Chosen carries weight as well as gold.
                  className={`text-lead h-12 rounded-sm border ${
                    index === pickedRange
                      ? "border-accent text-accent font-bold"
                      : "border-border text-muted"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <NumberPad onKey={press} decimalDisabled={false} />

          <button
            type="button"
            disabled={weight === "" || busy}
            onClick={answerFirstTime}
            className={primaryAction}
          >
            {busy ? "Saving" : "Start logging"}
          </button>
        </>
      ) : null}

      {/*
        The rest starts itself when a set is logged, so there is no button and
        no decision. It appears only after a set has been logged on this visit,
        because there is nothing to time before that.
      */}
      {lastLoggedAt !== null && !showingMovement && !asking && !editingId ? (
        <RestTimer since={lastLoggedAt} />
      ) : null}

      {showingMovement || asking ? null : (
        <>
          <div className="flex gap-3">
            <ValueField
              label="Weight"
              suffix="lb"
              value={weight}
              active={field === "weight"}
              onSelect={() => setField("weight")}
            />
            <ValueField
              label="Reps"
              value={reps}
              active={field === "reps"}
              onSelect={() => setField("reps")}
            />
          </div>

          <NumberPad onKey={press} decimalDisabled={field === "reps"} />

          {writeFailed ? (
            <p role="alert" className="text-body text-ink">
              That did not save. Check your connection and try again.
            </p>
          ) : null}

          <button
            type="button"
            disabled={!canLog || busy}
            onClick={commit}
            className={primaryAction}
          >
            {busy ? "Saving" : editingId ? "Save set" : "Log set"}
          </button>
        </>
      )}

      {editingId ? (
        <div className="flex items-baseline justify-between">
          <button
            type="button"
            disabled={busy}
            onClick={() => stopEditing(sets)}
            className={quiet}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={remove}
            className={quiet}
          >
            Delete set
          </button>
        </div>
      ) : (
        <Link href={`/workout/${id}`} className={`${quiet} self-start`}>
          Back to the workout
        </Link>
      )}
    </div>
  );
}

/**
 * One of the two numbers being entered.
 *
 * The active field is marked by a gold rule under it and a heavier number, not
 * by the gold alone.
 */
function ValueField({
  label,
  value,
  suffix,
  active,
  onSelect,
}: {
  label: string;
  value: string;
  suffix?: string;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onSelect}
      className={`flex flex-1 flex-col gap-1 border-b-2 pb-2 text-left ${
        active ? "border-accent" : "border-border"
      }`}
    >
      <span className="text-label text-muted uppercase">{label}</span>
      <span className="flex items-baseline gap-1.5">
        {/*
          Weight as well as gold. Under the strip test the rule disappears and
          the two fields were then separated by hue alone, which CLAUDE.md
          forbids. At this size 400 against 700 is unmistakable.
        */}
        <span
          className={`text-display font-condensed ${
            active ? "text-ink" : "text-muted font-normal"
          }`}
        >
          {displayValue(value)}
        </span>
        {suffix ? <span className="text-body text-muted">{suffix}</span> : null}
      </span>
    </button>
  );
}

/** "135 lb × 8, 8, 7". Assembled here; the database holds numbers. */
function describeSession(sets: LoggedSet[]): string {
  const working = sets.filter((s) => !s.is_warmup && s.weight !== null);
  if (working.length === 0) return "nothing recorded";

  const weights = [...new Set(working.map((s) => s.weight))];
  const reps = working.map((s) => s.reps).join(", ");

  // One weight is the normal case and reads as one number. Several means the
  // weight moved during the session, so each set is spelled out.
  return weights.length === 1
    ? `${weights[0]} lb × ${reps}`
    : working.map((s) => `${s.weight}×${s.reps}`).join(", ");
}

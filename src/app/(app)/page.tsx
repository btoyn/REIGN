"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { BrandHeader } from "@/components/BrandHeader";
import { RegionChoice } from "@/components/RegionChoice";
import { ScreenTitle } from "@/components/ScreenTitle";
import { Skeleton } from "@/components/Skeleton";
import { primaryAction, quiet, secondaryAction } from "@/components/controls";
import {
  CardioSession,
  describeCardio,
  fetchCardioForDate,
} from "@/lib/cardio";
import { CardioPlan } from "@/components/CardioPlan";
import { StabilityBlock } from "@/components/StabilityBlock";
import {
  TodaysProgram,
  applyProgramDay,
  fetchTodaysProgram,
  isCardioDay,
} from "@/lib/programs";
import {
  Split,
  WEEKDAYS,
  fetchSplitForDay,
  isRestDay,
  saveSplitForDay,
  todayDayOfWeek,
} from "@/lib/splits";
import {
  Workout,
  WorkoutCounts,
  discardWorkout,
  fetchWorkoutCounts,
  fetchWorkoutForDate,
  durationMinutes,
  isInProgress,
  startWorkout,
  todayDate,
} from "@/lib/workouts";

/**
 * Today.
 *
 * The screen answers one question: what am I doing today?
 *
 * It reads the answer from the weekday split rather than asking every time,
 * because the owner trains the same thing every Monday and starting training
 * should not require a decision. The split assembles itself: the first time a
 * weekday comes around the screen asks once, records the answer, and never asks
 * about that day again.
 *
 * All five of the spec's states are here now that workouts exist.
 */

type Data =
  | { status: "loading" }
  | { status: "error" }
  | {
      status: "loaded";
      /** Null when this weekday has never been answered. */
      split: Split | null;
      /** The most recent workout dated today, if there is one. */
      workout: Workout | null;
      counts: WorkoutCounts;
      /** Cardio recorded today. Part of the same training day as the lifting. */
      cardio: CardioSession[];
      /**
       * What the followed program says about today, if a program is being
       * followed and has anything to say. Null falls back to the split, which
       * is what Today did before programs existed.
       */
      todaysProgram: TodaysProgram | null;
    };

/** A one-off deviation. Deliberately not stored — see the spec. */
type Override = { name: string; muscles: string[] };

/**
 * Whether logging cardio is this day's one dominant action.
 *
 * True only on a followed cardio day that has nothing to lift, and only while
 * the day is still the program's own: an override replaces the day, and a
 * workout that already exists outranks any plan, so in both cases the screen
 * is about the workout and cardio goes back to being the quiet link at the
 * foot.
 *
 * Asked in two places — by the button and by that link — which is why it is
 * one function rather than the same condition written twice and drifting.
 */
function cardioIsTheAction(
  data: Extract<Data, { status: "loaded" }>,
  override: Override | null,
): boolean {
  if (override !== null) return false;
  if (data.workout) return false;
  const plan = data.todaysProgram;
  if (!plan) return false;
  return isCardioDay(plan.day.kind) && plan.exerciseCount === 0;
}

export default function TodayPage() {
  const router = useRouter();
  const [data, setData] = useState<Data>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  // Read once and held, so the screen cannot answer for one day and write
  // against another if it is left open across midnight.
  const [dayOfWeek] = useState(todayDayOfWeek);
  const [date] = useState(todayDate);

  // Screen state rather than stored state.
  const [override, setOverride] = useState<Override | null>(null);
  const [changing, setChanging] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;

    Promise.all([
      fetchSplitForDay(dayOfWeek),
      fetchWorkoutForDate(date),
      fetchCardioForDate(date),
      // Never throws: a program is an addition to Today and must not be able
      // to break it. A failure here reads as no program, and the split answers.
      fetchTodaysProgram(dayOfWeek),
    ])
      .then(async ([split, workout, cardio, todaysProgram]) => {
        const counts = workout
          ? await fetchWorkoutCounts(workout.id)
          : { exercises: 0, sets: 0 };
        if (active)
          setData({
            status: "loaded",
            split,
            workout,
            counts,
            cardio,
            todaysProgram,
          });
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
        console.error("Today failed to load", e);
        setData({ status: "error" });
      });

    return () => {
      active = false;
    };
  }, [dayOfWeek, date, attempt]);

  function reload() {
    setData({ status: "loading" });
    setAttempt((n) => n + 1);
  }

  function retry() {
    setConfirmingDiscard(false);
    setChanging(false);
    reload();
  }

  /** Answering the weekday question. This one is permanent. */
  async function answerWeekday(name: string, muscles: string[]) {
    setSaving(name);
    try {
      const split = await saveSplitForDay(dayOfWeek, name, muscles);
      setData((current) =>
        current.status === "loaded" ? { ...current, split } : current,
      );
    } catch (e) {
      console.error("saveSplitForDay failed", e);
      setData({ status: "error" });
    } finally {
      setSaving(null);
    }
  }

  /**
   * Change today.
   *
   * Nothing is written. The deviation is recorded by the workout it produces,
   * through the copied split_name, so before a workout exists there is nothing
   * to remember and this does not survive a reload. That is documented in the
   * spec and the build plan rather than left to be discovered.
   */
  function changeToday(name: string, muscles: string[]) {
    setOverride({ name, muscles });
    setChanging(false);
  }

  async function start(splitName: string) {
    setBusy(true);
    try {
      const workout = await startWorkout(date, splitName);

      /*
        A followed program fills the workout in. This is what following one
        actually buys: without it, following changes a label on Today and the
        owner still adds five exercises by hand every session.

        Not when the day has been overridden. "Change today" means training
        something else, and pre-loading the program's push day into an arms
        workout would be the opposite of what was asked.
      */
      const plan =
        data.status === "loaded" && override === null
          ? data.todaysProgram
          : null;
      if (plan) await applyProgramDay(workout.id, plan.day.id);

      router.push(`/workout/${workout.id}`);
    } catch (e) {
      console.error("startWorkout failed", e);
      setData({ status: "error" });
      setBusy(false);
    }
  }

  async function discard(id: string) {
    setBusy(true);
    try {
      await discardWorkout(id);
      setConfirmingDiscard(false);
      setOverride(null);
      reload();
    } catch (e) {
      console.error("discardWorkout failed", e);
      setData({ status: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <BrandHeader />

      <div className="flex flex-col gap-3">
        <ScreenTitle>Today</ScreenTitle>

        {data.status === "loading" ? <LoadingBlock /> : null}
        {data.status === "error" ? <ErrorBlock onRetry={retry} /> : null}

        {data.status === "loaded"
          ? renderLoaded({
              data,
              weekday: WEEKDAYS[dayOfWeek],
              override,
              changing,
              saving,
              confirmingDiscard,
              busy,
              onAnswerWeekday: answerWeekday,
              onChangeToday: changeToday,
              onOpenChange: () => setChanging(true),
              onCancelChange: () => setChanging(false),
              onStart: start,
              onResume: (id: string) => router.push(`/workout/${id}`),
              onAskDiscard: () => setConfirmingDiscard(true),
              onCancelDiscard: () => setConfirmingDiscard(false),
              onDiscard: discard,
            })
          : null}
      </div>

      {/*
        Cardio sits beneath everything, per the specification's hierarchy, and
        is part of the same training day as the lifting rather than a separate
        record. Adding it is a quiet link: Today's one dominant action is
        starting or resuming a workout, and this must never compete with it.
      */}
      {data.status === "loaded" ? (
        <div className="flex flex-col gap-3">
          {data.cardio.length > 0 ? (
            <>
              <p className="text-label text-muted uppercase">Cardio</p>
              <ul className="flex flex-col gap-2">
                {data.cardio.map((session) => (
                  <li key={session.id} className="text-body text-ink">
                    {describeCardio(session)}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          {/*
            Not on a day whose one action already IS logging cardio. The gold
            button and this link go to the same screen, and offering the same
            destination twice on one screen reads as two choices rather than
            one.
          */}
          {cardioIsTheAction(data, override) ? null : (
            <Link href="/cardio" className={`${quiet} self-start`}>
              Add cardio
            </Link>
          )}
        </div>
      ) : null}
    </div>
  );
}

type LoadedProps = {
  data: Extract<Data, { status: "loaded" }>;
  weekday: string;
  override: Override | null;
  changing: boolean;
  saving: string | null;
  confirmingDiscard: boolean;
  busy: boolean;
  onAnswerWeekday: (name: string, muscles: string[]) => void;
  onChangeToday: (name: string, muscles: string[]) => void;
  onOpenChange: () => void;
  onCancelChange: () => void;
  onStart: (splitName: string) => void;
  onResume: (id: string) => void;
  onAskDiscard: () => void;
  onCancelDiscard: () => void;
  onDiscard: (id: string) => void;
};

/** Which of the five states this is. Order matters: a workout outranks a plan. */
function renderLoaded(p: LoadedProps) {
  const { data } = p;

  if (data.workout && isInProgress(data.workout)) {
    return <InProgressBlock {...p} workout={data.workout} />;
  }

  if (data.workout) {
    return <DoneBlock {...p} workout={data.workout} />;
  }

  /*
    A followed program answers the day before the split does, and before the
    weekday question is asked at all: if the program says today is Push, there
    is nothing to ask.

    The program day is passed as a split because that is exactly what it is at
    this point — a name and the muscles it covers. Only the line underneath
    changes, to say which program it came from.
  */
  if (data.todaysProgram) {
    const { program, day } = data.todaysProgram;
    return (
      <PlannedBlock
        {...p}
        programName={program.name}
        plan={data.todaysProgram}
        split={{
          id: day.id,
          day_of_week: day.day_of_week ?? 0,
          name: day.name,
          target_muscles: day.target_muscles,
        }}
      />
    );
  }

  if (!data.split) {
    return (
      <AskBlock
        weekday={p.weekday}
        saving={p.saving}
        onAnswer={p.onAnswerWeekday}
      />
    );
  }

  return <PlannedBlock {...p} split={data.split} />;
}

/**
 * Loading.
 *
 * Shaped like the answer it is waiting for, so the screen does not jump when
 * the real content lands.
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
          Could not load today.
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

      <RegionChoice saving={saving} onChoose={onAnswer} />
    </div>
  );
}

/** The display name over its source line. Every state that has a plan shows it. */
function Headline({ name, source }: { name: string; source: string | null }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-display text-ink font-condensed uppercase">{name}</p>
      {source ? <p className="text-body text-muted">{source}</p> : null}
    </div>
  );
}

/**
 * Ready, resting, or riding a bike.
 *
 * A plan used to mean one thing: a set of muscles and a Start Workout button.
 * A program can now say the day is forty-five minutes on a bike, or an interval
 * session, or nothing at all, and each of those wants a different screen.
 *
 * ONE DOMINANT ACTION still holds, which is what decides between them:
 *
 *   * a day with exercises is started as a workout, gold, as it always was —
 *     including a bike day that also has carries in it, because the carries are
 *     sets and sets are what a workout holds;
 *   * a cardio day with no exercises offers Log Cardio instead, because there
 *     is nothing to log sets against and a Start Workout button would open an
 *     empty workout;
 *   * a rest day offers neither.
 *
 * Never both. The bike ride on a day that also lifts is reached through the
 * quiet Add cardio link at the foot of the screen, which is where it has always
 * been.
 */
function PlannedBlock({
  data,
  split,
  weekday,
  override,
  changing,
  busy,
  onChangeToday,
  onOpenChange,
  onCancelChange,
  onStart,
  programName,
  plan,
}: LoadedProps & {
  split: Split;
  programName?: string;
  plan?: TodaysProgram;
}) {
  const name = override?.name ?? split.name;

  /*
    An override replaces the day entirely, so a program's bike ride stops
    applying the moment the owner says they are training something else. Every
    question below is asked only when the day is still the program's own.
  */
  const following = override === null ? plan : undefined;
  const kind = following?.day.kind;
  const resting =
    override === null && (kind === "rest" || (!kind && isRestDay(split)));

  // A cardio day with nothing to log sets against. A day that has both, like
  // the bike ride followed by carries, is started as a workout. Asked through
  // the same function the quiet Add cardio link asks, so the two can never
  // disagree about which day this is.
  const cardioOnly = cardioIsTheAction(data, override);

  if (changing) {
    return (
      <ChangingBlock
        heading="What are you training today?"
        note="Just today. Every other {weekday} stays as it is."
        weekday={weekday}
        onChoose={onChangeToday}
        onCancel={onCancelChange}
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <Headline
        name={name}
        source={
          override
            ? `Instead of ${split.name} · just today`
            : programName
              ? // The program and the weekday, never a day number. "Day 1"
                // is the counter CLAUDE.md forbids, and the weekday already
                // separates Monday's Push from Thursday's.
                `${programName} · ${weekday}`
              : resting
                ? null
                : `Weekday split · ${weekday}`
        }
      />

      {/*
        What the day actually asks for, when it is a machine and a length of
        time. Without this a zone 2 day rendered as a name and an empty list:
        a day that looked like it had nothing in it rather than a bike ride.
      */}
      {following?.cardio ? <CardioPlan cardio={following.cardio} /> : null}

      {/*
        What governs the whole session, when the program says so. A rest day
        with nothing written against it still has to say something, or the
        screen is a name over an empty space.
      */}
      {following?.day.notes ? (
        <p className="text-body text-muted">{following.day.notes}</p>
      ) : resting && following ? (
        <p className="text-body text-muted">Nothing scheduled.</p>
      ) : null}

      {/*
        The block that opens the day, collapsed. It is the first thing done and
        the last thing that should be allowed to push the training off screen,
        so it is one line until it is wanted.
      */}
      {following && following.stability.length > 0 ? (
        <StabilityBlock items={following.stability} />
      ) : null}

      {resting ? (
        /*
          A rest day from a program has already said whatever it has to say in
          its own note above, so this does not repeat it. A weekday split has
          no note, and its rest day would otherwise render as a name with
          nothing under it.
        */
        following ? null : (
          <p className="text-body text-muted">
            Nothing scheduled for {weekday}s.
          </p>
        )
      ) : cardioOnly ? (
        /*
          The one action on a bike day. A link rather than a button because it
          goes to the cardio screen, and gold because on this day it is what
          the screen exists for.
        */
        <Link href="/cardio" className={primaryAction}>
          Log Cardio
        </Link>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => onStart(name)}
          className={primaryAction}
        >
          {busy ? "Starting" : "Start Workout"}
        </button>
      )}

      <button
        type="button"
        onClick={onOpenChange}
        className={`${quiet} self-start`}
      >
        Change today
      </button>
    </div>
  );
}

/**
 * In progress.
 *
 * A workout exists with no finish time, so there is no offer to start a second
 * one. Discard is quiet and behind a confirmation: one mis-tap mid-session must
 * not destroy a workout.
 */
function InProgressBlock({
  workout,
  data,
  confirmingDiscard,
  busy,
  onResume,
  onAskDiscard,
  onCancelDiscard,
  onDiscard,
}: LoadedProps & { workout: Workout }) {
  if (confirmingDiscard) {
    return (
      <div className="flex flex-col gap-5">
        <Headline name={workout.split_name ?? "Workout"} source={null} />
        <div className="flex flex-col gap-2">
          <p className="text-lead text-ink">Discard this workout?</p>
          <p className="text-body text-muted">
            {describe(data.counts)} will be deleted. This cannot be undone.
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => onDiscard(workout.id)}
          className={secondaryAction}
        >
          {busy ? "Discarding" : "Discard workout"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onCancelDiscard}
          className={`${quiet} self-start`}
        >
          Keep it
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <Headline
        name={workout.split_name ?? "Workout"}
        source={`In progress · ${describe(data.counts)}`}
      />
      <button
        type="button"
        onClick={() => onResume(workout.id)}
        className={primaryAction}
      >
        Resume Workout
      </button>
      <button
        type="button"
        onClick={onAskDiscard}
        className={`${quiet} self-start`}
      >
        Discard workout
      </button>
    </div>
  );
}

/**
 * Done today.
 *
 * No primary button: the day's training is recorded. `Change today` is the only
 * action, and after a finished workout the only thing it can mean is training
 * something else now, so choosing a region starts a second workout.
 */
function DoneBlock({
  workout,
  data,
  changing,
  weekday,
  busy,
  onChangeToday,
  onOpenChange,
  onCancelChange,
  onStart,
}: LoadedProps & { workout: Workout }) {
  if (changing) {
    return (
      <ChangingBlock
        heading="Train something else?"
        note="Today is already recorded. This starts a second workout."
        weekday={weekday}
        onChoose={(name, muscles) => {
          onChangeToday(name, muscles);
          onStart(name);
        }}
        onCancel={onCancelChange}
      />
    );
  }

  const minutes = durationLine(workout);

  return (
    <div className="flex flex-col gap-5">
      <Headline
        name={workout.split_name ?? "Workout"}
        source={`Finished${minutes} · ${describe(data.counts)}`}
      />
      <button
        type="button"
        disabled={busy}
        onClick={onOpenChange}
        className={`${quiet} self-start`}
      >
        Change today
      </button>
    </div>
  );
}

/** The six regions again, with wording that says what changing means here. */
function ChangingBlock({
  heading,
  note,
  weekday,
  onChoose,
  onCancel,
}: {
  heading: string;
  note: string;
  weekday: string;
  onChoose: (name: string, muscles: string[]) => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <h2 className="text-hero text-ink font-condensed">{heading}</h2>
        <p className="text-body text-muted">
          {note.replace("{weekday}", weekday)}
        </p>
      </div>

      <RegionChoice saving={null} onChoose={onChoose} />

      <button
        type="button"
        onClick={onCancel}
        className={`${quiet} self-start`}
      >
        Cancel
      </button>
    </div>
  );
}

/** "2 exercises · 5 sets". Assembled here, never a database column. */
function describe(counts: WorkoutCounts): string {
  const exercises = `${counts.exercises} ${counts.exercises === 1 ? "exercise" : "exercises"}`;
  const sets = `${counts.sets} ${counts.sets === 1 ? "set" : "sets"}`;
  return `${exercises} · ${sets}`;
}

function durationLine(workout: Workout): string {
  const minutes = durationMinutes(workout);
  return minutes === null ? "" : ` · ${minutes} min`;
}

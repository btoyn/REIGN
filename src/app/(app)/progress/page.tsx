"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { RecordRows } from "@/components/RecordRows";
import type { CardioSession } from "@/lib/cardio";
import { fetchCardioHistory } from "@/lib/cardio";
import { WeightLine } from "@/components/WeightLine";
import {
  Weighin,
  canDraw,
  change,
  describeChange,
  describeWeight,
  fetchWeighins,
  latest,
  points,
} from "@/lib/bodyweight";
import { ScreenTitle } from "@/components/ScreenTitle";
import { Skeleton } from "@/components/Skeleton";
import { quiet, secondaryAction } from "@/components/controls";
import type { HistoryEntry, PastWorkout } from "@/lib/progress";
import {
  byMonth,
  consistency,
  consistencyLabel,
  dayLabel,
  describePrevious,
  entryDescription,
  entryTitle,
  fetchWorkoutHistory,
  mergeHistory,
  shortDate,
} from "@/lib/progress";
import {
  PersonalRecord,
  RECORDS_ON_PROGRESS,
  fetchRecords,
} from "@/lib/records";
import { todayDate } from "@/lib/workouts";

/**
 * Progress — history first.
 *
 * The first thing CLAUDE.md says REIGN does is remember, and until now a
 * finished workout left the screen and could not be reached again. This is
 * every one of them, newest first.
 *
 * Rides are in the same list rather than in a section of their own. A weekday
 * split holds lifting days and riding days and the owner does both in the same
 * week, so "what have I done lately" is one question. Two lists would mean
 * looking in two places and adding them up by eye, and the count at the top
 * would agree with neither of them.
 *
 * Records sit above it, the few most recently set, with the rest one tap away.
 * That is the shape the picker already uses for Recent and Frequent: a handful
 * of the most useful, and the full list behind them. Opening on forty rows of
 * records before the history would be the analytics overload the spec warns
 * about.
 *
 * Above both, how much training there has actually been: a count over the last
 * four weeks with the four before it beside it, which is the large number with
 * a restrained label the specification asks for. A count, never a streak — a
 * streak turns one missed Tuesday into a punishment.
 *
 * There is no primary action, the way Program has none. This is a screen for
 * reading, and promoting one row would be a lie about which workout matters.
 *
 * A row opens the workout itself rather than a second detail screen: that
 * screen already shows a finished workout correctly, with its exercises, its
 * sets and no controls.
 */

type State =
  | { status: "loading" }
  | { status: "error" }
  | {
      status: "ready";
      workouts: PastWorkout[];
      cardio: CardioSession[];
      records: PersonalRecord[];
      /** Weigh-ins, newest first. Empty until there are any. */
      weighins: Weighin[];
    };

export default function ProgressPage() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;

    /*
      Four reads, run together. Records need the sets, the history does not,
      cardio touches neither, and bodyweight touches none of them, so nothing
      waits on another's rows.

      Bodyweight is caught rather than allowed to reject: a failed weigh-in
      read must not take the history down with it. Progress exists to remember
      what was lifted, and losing that because a scale reading would not load
      is the wrong trade.

      Cardio is NOT caught. It is part of the history now — half the training
      week on a weekday split can be riding — so a screen that quietly dropped
      the rides and showed the lifts would be lying about what was done. If it
      cannot be read, the screen says the history would not load.
    */
    Promise.all([
      fetchWorkoutHistory(),
      fetchCardioHistory(),
      fetchRecords(),
      fetchWeighins().catch((e: Error) => {
        console.error("could not read the weigh-ins", e);
        return [] as Weighin[];
      }),
    ])
      .then(
        ([workouts, cardio, records, weighins]) =>
          active &&
          setState({ status: "ready", workouts, cardio, records, weighins }),
      )
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
        console.error("Progress failed to load", e);
        setState({ status: "error" });
      });

    return () => {
      active = false;
    };
  }, [attempt]);

  /*
    One list, assembled once. Both the count and the history read from it, so
    the number at the top can never disagree with the rows under it.
  */
  const history =
    state.status === "ready" ? mergeHistory(state.workouts, state.cardio) : [];

  return (
    <div className="flex flex-col gap-3">
      <ScreenTitle>Progress</ScreenTitle>

      {state.status === "loading" ? <LoadingRows /> : null}

      {state.status === "error" ? (
        <div className="mt-5 flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <p role="alert" className="text-lead text-ink">
              Could not load your history.
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
      ) : null}

      {/*
        Day one. It says what will fill the screen rather than only that it is
        empty, and it does not offer to start a workout: that action lives on
        Today, and repeating it here would put two primary actions in the app
        for the same thing.
      */}
      {state.status === "ready" && history.length === 0 ? (
        <div className="mt-5 flex flex-col gap-2">
          <p className="text-lead text-ink">Nothing recorded yet.</p>
          <p className="text-body text-muted">
            Every workout you finish and every ride you enter is listed here,
            newest first, with what was in it.
          </p>
        </div>
      ) : null}

      {/*
        Bodyweight, when there is any. Above consistency because it is a fact
        about the owner rather than about their training, and absent entirely
        until a reading exists — an empty chart is worse than no chart.
      */}
      {state.status === "ready" && state.weighins.length > 0 ? (
        <Bodyweight weighins={state.weighins} />
      ) : null}

      {/*
        How much training there has been lately, and what it was before that.
        A number on its own says nothing: fourteen is good or bad depending on
        what the month before held.
      */}
      {state.status === "ready" && history.length > 0 ? (
        <Consistency history={history} />
      ) : null}

      {/*
        Absent until there is one, the same rule Recent and Frequent follow in
        the picker. An empty list is worse than no list.
      */}
      {state.status === "ready" && state.records.length > 0 ? (
        <div className="mt-4 flex flex-col gap-2">
          <p className="text-label text-muted uppercase">Records</p>
          <RecordRows records={state.records.slice(0, RECORDS_ON_PROGRESS)} />
          {state.records.length > RECORDS_ON_PROGRESS ? (
            <Link
              href="/progress/records"
              className={`${quiet} mt-2 self-start`}
            >
              All {state.records.length} records
            </Link>
          ) : null}
        </div>
      ) : null}

      {state.status === "ready" && history.length > 0 ? (
        <div className="mt-10 flex flex-col">
          {/*
            Two headings at one type size, so the spacing has to say which is
            which. A label sits tight against the rows it names and far from
            whatever came before, which is what separates the section from the
            months inside it. Nothing here is a border or a box, so it survives
            the strip test.
          */}
          <p className="text-label text-muted uppercase">History</p>
          <div className="mt-4 flex flex-col gap-8">
            {byMonth(history).map((month) => (
              <div key={month.label} className="flex flex-col gap-2">
                {/*
                A spine for a long list. A year of training is a lot of dates,
                and a date on its own does not say how long ago it was.
              */}
                <p className="text-label text-muted uppercase">{month.label}</p>
                <ul>
                  {month.entries.map((entry) => (
                    <li
                      key={`${entry.kind}-${entry.id}`}
                      className="border-border border-b last:border-b-0"
                    >
                      <Row entry={entry} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/**
 * One row of the history, whichever kind it is.
 *
 * A lifted workout opens: that screen already shows a finished workout
 * correctly, with its exercises, its sets and no controls. A ride does not,
 * because everything recorded about it is already on this line and a screen
 * that only repeats the line it was reached from is a tap that gives nothing
 * back.
 *
 * So the two rows are laid out identically and one of them happens to be a
 * link. Nothing marks which: the difference is not a state the owner needs to
 * read, and a marker on every lifting row to say "this one opens" would be
 * decoration on the whole list to describe a tap.
 *
 * What DOES distinguish them is the only thing that should — what they say.
 * "Back / 5 exercises · 52 min" against "Cycling / 55 min · 12.4 mi".
 */
function Row({ entry }: { entry: HistoryEntry }) {
  const inside = (
    <>
      <span className="flex flex-col gap-1">
        {/*
          The split is the name of the day, because that is how the owner
          thinks about it. A workout started outside the schedule has no split,
          so the date carries it. A ride is named by its machine.
        */}
        <span className="text-lead text-ink">{entryTitle(entry)}</span>
        <span className="text-body text-muted">{entryDescription(entry)}</span>
      </span>
      <span className="text-body text-muted shrink-0">
        {dayLabel(entry.date)}
      </span>
    </>
  );

  const layout = "flex items-baseline justify-between gap-4 py-4";

  return entry.kind === "workout" ? (
    <Link href={`/workout/${entry.id}`} className={layout}>
      {inside}
    </Link>
  ) : (
    <div className={layout}>{inside}</div>
  );
}

/**
 * How much training there has been lately.
 *
 * Counts rides as well as lifts, because on a weekday split half the week can
 * be riding and a figure that counted only the lifting would report a six-day
 * week as three. The label still says workouts: a ride is a workout, and
 * CLAUDE.md rules out calling either of them a session.
 */
function Consistency({ history }: { history: HistoryEntry[] }) {
  const count = consistency(history, todayDate());
  const before = describePrevious(count);

  return (
    <div className="mt-4 flex flex-col gap-1">
      <p className="text-display text-ink font-condensed">{count.recent}</p>
      <p className="text-body text-muted">{consistencyLabel()}</p>
      {/*
        Absent on day one rather than reading "0 in the 4 weeks before that",
        which would be a nought about a period the owner had not started
        training in.
      */}
      {before ? <p className="text-body text-muted">{before}</p> : null}
    </div>
  );
}

function LoadingRows() {
  return (
    <div
      className="mt-6 flex flex-col gap-2"
      aria-busy="true"
      aria-label="Loading"
    >
      <Skeleton className="h-4 w-28" />
      <div className="flex flex-col">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="border-border flex items-center justify-between border-b py-4 last:border-b-0"
          >
            <div className="flex flex-col gap-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-40" />
            </div>
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Bodyweight: the figure, which way it has gone, and the shape of it.
 *
 * The number leads and the movement is stated in words, so the line is never
 * the only thing carrying the answer. That order matters: a chart nobody has to
 * read to get the point is a chart that has earned its place instead of
 * demanding attention.
 *
 * The line appears only from the second reading. One weigh-in is a number, not
 * a trend, and drawing a single dot and calling it a line would be the chart
 * claiming something it does not have.
 */
function Bodyweight({ weighins }: { weighins: Weighin[] }) {
  const current = latest(weighins);
  if (!current) return null;

  const moved = describeChange(change(weighins));

  return (
    <div className="mt-4 flex flex-col gap-2">
      <p className="text-label text-muted uppercase">Bodyweight</p>

      <div className="flex flex-col gap-1">
        <p className="text-display text-ink font-condensed tabular-nums">
          {describeWeight(current.weight)}
        </p>
        {/*
          The direction in words. Never an arrow and never a colour: down is
          not automatically good and up is not automatically bad, and no state
          in REIGN is signalled by hue alone.
        */}
        <p className="text-body text-muted">
          {moved ?? `Recorded ${shortDate(current.date)}. One reading so far.`}
        </p>
      </div>

      {canDraw(weighins) ? (
        <div className="mt-2">
          <WeightLine points={points(weighins)} />
          {/*
            The two ends of the line, so its width means something. No axis:
            there is nothing here to measure a value off, and the readings
            themselves are listed on the bodyweight screen.
          */}
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-body text-muted">
              {shortDate(weighins[weighins.length - 1].date)}
            </span>
            <span className="text-body text-muted">
              {shortDate(current.date)}
            </span>
          </div>
        </div>
      ) : null}

      <Link href="/bodyweight" className={`${quiet} mt-2 self-start`}>
        Weigh in
      </Link>
    </div>
  );
}

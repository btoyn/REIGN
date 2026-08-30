"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { Skeleton } from "@/components/Skeleton";
import { quiet, secondaryAction } from "@/components/controls";
import { Exercise, fetchLibrary } from "@/lib/exercises";
import { fetchTrainingHistory } from "@/lib/history";
import {
  fetchHiddenExerciseIds,
  hideExercise,
  unhideExercise,
} from "@/lib/hidden";
import { inGymOnly } from "@/lib/library";
import {
  Bucket,
  REGIONS,
  Region,
  bucketsFor,
  groupByEquipment,
  wantsEquipmentHeadings,
} from "@/lib/regions";
import { search } from "@/lib/search";
import {
  bucketStaleness,
  byStaleness,
  daysSince,
  describeRow,
  stalenessLabel,
} from "@/lib/variety";
import { todayDate } from "@/lib/workouts";

/**
 * Choose an exercise.
 *
 * Search first, because most of the time the name is already known and typing
 * three letters beats any hierarchy. Then Recent and Frequent, which carry most
 * of the traffic once there is history. Browse is last and is the fallback.
 *
 * The whole library is read once and held, so moving between search, Recent and
 * browse costs no further requests. In a gym that matters more than the first
 * load does.
 */

type Data =
  | { status: "loading" }
  | { status: "error" }
  | {
      status: "ready";
      library: Exercise[];
      recent: Exercise[];
      frequent: Exercise[];
      hidden: Set<string>;
      /** Exercise id to the date it was last performed. Drives variety. */
      lastPerformed: Map<string, string>;
    };

/**
 * When each exercise was last performed, available to every row.
 *
 * Carried in context rather than threaded through Browse, its buckets, its
 * headed groups and every list: that is seven hand-offs of the same value, and
 * an easy place to drop it in one branch and not notice.
 */
const LastPerformed = createContext<Map<string, string>>(new Map());

/** Where in browse the owner is. Search replaces all of it while there is a query. */
type View =
  | { at: "regions" }
  | { at: "region"; region: Region }
  | { at: "bucket"; region: Region; bucket: Bucket };

export function ExercisePicker({
  onPick,
  picking,
}: {
  onPick: (exercise: Exercise) => void;
  /** The id currently being added, so the row says so rather than sitting inert. */
  picking: string | null;
}) {
  const [data, setData] = useState<Data>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<View>({ at: "regions" });
  /**
   * Curating: the list stops adding exercises and starts hiding them.
   *
   * A mode rather than a control on every row. There are 462 rows and hiding is
   * rare, so a per-row control would be furniture on all of them to serve one.
   * While curating, hidden exercises are shown as well, which is what makes
   * them reachable again.
   */
  const [curating, setCurating] = useState(false);
  const [pendingHide, setPendingHide] = useState<string | null>(null);
  const [hideFailed, setHideFailed] = useState(false);

  useEffect(() => {
    let active = true;

    Promise.all([
      fetchLibrary(),
      // History is the owner's own, and is allowed to be empty.
      fetchTrainingHistory(),
      fetchHiddenExerciseIds(),
    ])
      .then(([library, history, hidden]) => {
        if (active)
          setData({
            status: "ready",
            library,
            recent: history.recent,
            frequent: history.frequent,
            lastPerformed: history.lastPerformed,
            hidden,
          });
      })
      .catch((e: Error) => {
        console.error("the exercise library failed to load", e);
        if (active) setData({ status: "error" });
      });

    return () => {
      active = false;
    };
  }, [attempt]);

  const hidden = data.status === "ready" ? data.hidden : new Set<string>();

  // Hidden exercises drop out of browse and search, and come back while
  // curating so they can be brought back.
  const visible = (list: Exercise[]) =>
    curating ? list : list.filter((e) => !hidden.has(e.id));

  const gym = useMemo(
    () => (data.status === "ready" ? inGymOnly(data.library) : []),
    [data],
  );

  const results = useMemo(
    () => (data.status === "ready" ? search(data.library, query) : []),
    [data, query],
  );

  async function toggleHidden(exercise: Exercise) {
    if (data.status !== "ready") return;
    setPendingHide(exercise.id);
    setHideFailed(false);
    const wasHidden = data.hidden.has(exercise.id);
    try {
      if (wasHidden) await unhideExercise(exercise.id);
      else await hideExercise(exercise.id);

      const next = new Set(data.hidden);
      if (wasHidden) next.delete(exercise.id);
      else next.add(exercise.id);
      setData({ ...data, hidden: next });
    } catch (e) {
      // A tap that does nothing and says nothing is the worst outcome. This is
      // most likely the migration not having been run yet, so the message says
      // so rather than blaming the connection.
      console.error("could not change what is hidden", e);
      setHideFailed(true);
    } finally {
      setPendingHide(null);
    }
  }

  if (data.status === "loading") {
    return (
      <div
        className="flex flex-col gap-6"
        aria-busy="true"
        aria-label="Loading"
      >
        <Skeleton className="h-12 w-full rounded-md" />
        <div className="flex flex-col gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-3/4" />
          ))}
        </div>
      </div>
    );
  }

  if (data.status === "error") {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <p role="alert" className="text-lead text-ink">
            Could not reach the exercise library.
          </p>
          <p className="text-body text-muted">
            Check your connection and try again.
          </p>
        </div>
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
      </div>
    );
  }

  const searching = query.trim() !== "";

  return (
    <LastPerformed.Provider value={data.lastPerformed}>
      <div className="flex flex-col gap-6">
        {/*
        A real text field, and the only one in the app. The custom pad exists
        because numbers between sets need speed and the iOS keyboard is wrong
        for them; typing a name is exactly what a keyboard is for.
      */}
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search exercises"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          aria-label="Search exercises"
          className="bg-surface text-ink border-border placeholder:text-muted focus:border-muted h-12 w-full rounded-md border px-4 text-base outline-none"
        />

        {/*
        Curating is a mode with one switch, not a control on 462 rows. While it
        is on the screen says so plainly, because a list where tapping deletes
        instead of adds must never be mistaken for the normal one.
      */}
        {curating ? (
          <div className="flex flex-col gap-3">
            <p className="text-lead text-ink">Hiding exercises</p>
            <p className="text-body text-muted">
              Tap any exercise to hide it, or to bring back one you hid. Hidden
              exercises stay out of browse and search. Nothing is deleted.
            </p>
            {hideFailed ? (
              <p role="alert" className="text-body text-ink">
                Could not change that. Hiding needs a database update that has
                not been applied yet.
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => {
                setHideFailed(false);
                setCurating(false);
              }}
              className={`${quiet} self-start`}
            >
              Done
            </button>
          </div>
        ) : null}

        {searching ? (
          visible(results).length === 0 ? (
            <p className="text-body text-muted">
              Nothing matches “{query.trim()}”.
            </p>
          ) : (
            <ExerciseList
              exercises={visible(results)}
              onPick={curating ? toggleHidden : onPick}
              picking={curating ? pendingHide : picking}
              hidden={hidden}
              curating={curating}
              caption={`${visible(results).length} ${visible(results).length === 1 ? "result" : "results"}`}
            />
          )
        ) : (
          <Browse
            gym={visible(gym)}
            recent={visible(data.recent)}
            frequent={visible(data.frequent)}
            view={view}
            setView={setView}
            onPick={curating ? toggleHidden : onPick}
            picking={curating ? pendingHide : picking}
            hidden={hidden}
            curating={curating}
          />
        )}

        {/*
        The way in, once, below whatever is on screen. It lives here rather than
        inside browse so it is reachable while searching too: an exercise you
        hid is most likely to be found again by searching for it, and it would
        otherwise have no way back.
      */}
        {curating ? null : (
          <button
            type="button"
            onClick={() => setCurating(true)}
            className={`${quiet} self-start`}
          >
            Hide exercises I never do
          </button>
        )}
      </div>
    </LastPerformed.Provider>
  );
}

function Browse({
  gym,
  recent,
  frequent,
  view,
  setView,
  onPick,
  picking,
  hidden,
  curating,
}: {
  gym: Exercise[];
  recent: Exercise[];
  frequent: Exercise[];
  view: View;
  setView: (v: View) => void;
  onPick: (exercise: Exercise) => void;
  picking: string | null;
  hidden: Set<string>;
  curating: boolean;
}) {
  const lastPerformed = useContext(LastPerformed);
  const today = todayDate();

  if (view.at === "bucket") {
    const { region, bucket } = view;
    const headed = wantsEquipmentHeadings(region, bucket);
    return (
      <div className="flex flex-col gap-5">
        <Crumb
          label={`${region.name} · ${bucket.label}`}
          onBack={() => setView({ at: "region", region })}
        />
        {headed ? (
          <div className="flex flex-col gap-6">
            {groupByEquipment(bucket.exercises).map((group) => (
              <ExerciseList
                key={group.key}
                caption={group.label}
                exercises={byStaleness(group.exercises, lastPerformed, today)}
                onPick={onPick}
                picking={picking}
                hidden={hidden}
                curating={curating}
              />
            ))}
          </div>
        ) : (
          <ExerciseList
            /*
              Sorted by how long since each was last done, which is the point of
              browsing rather than searching: what is being neglected rises to
              the top, and what has never been done follows.
            */
            exercises={byStaleness(bucket.exercises, lastPerformed, today)}
            onPick={onPick}
            picking={picking}
            hidden={hidden}
            curating={curating}
          />
        )}
      </div>
    );
  }

  if (view.at === "region") {
    const { region } = view;
    const mine = gym.filter((e) => region.muscles.includes(e.primary_muscle));
    const buckets = bucketsFor(region, mine);

    // Core divides into nothing worth dividing, so its list is flat.
    if (buckets.length === 0) {
      return (
        <div className="flex flex-col gap-5">
          <Crumb
            label={region.name}
            onBack={() => setView({ at: "regions" })}
          />
          <ExerciseList
            exercises={byStaleness(mine, lastPerformed, today)}
            onPick={onPick}
            picking={picking}
            hidden={hidden}
            curating={curating}
          />
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-5">
        <Crumb label={region.name} onBack={() => setView({ at: "regions" })} />
        <ul>
          {buckets.map((bucket) => (
            <li
              key={bucket.key}
              className="border-border border-b last:border-b-0"
            >
              <button
                type="button"
                onClick={() => setView({ at: "bucket", region, bucket })}
                className="flex w-full items-baseline justify-between gap-4 py-4 text-left"
              >
                <span className="text-lead text-ink">{bucket.label}</span>
                {/*
                  How long since this part was trained, rather than how many
                  exercises are filed under it. The region row above already
                  gave the size of what you were entering; having chosen the
                  region, the question is which part has been left alone.
                */}
                <span className="text-body text-muted">
                  {stalenessLabel(
                    bucketStaleness(bucket.exercises, lastPerformed, today),
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/*
        Recent and Frequent are absent until they have something. An empty list
        is worse than no list, and on day one both would be empty.
      */}
      {recent.length > 0 ? (
        <ExerciseList
          caption="Recent"
          exercises={recent}
          onPick={onPick}
          picking={picking}
          hidden={hidden}
          curating={curating}
        />
      ) : null}

      {frequent.length > 0 ? (
        <ExerciseList
          caption="Frequent"
          exercises={frequent}
          onPick={onPick}
          picking={picking}
          hidden={hidden}
          curating={curating}
        />
      ) : null}

      <div className="flex flex-col gap-2">
        <p className="text-label text-muted uppercase">Browse</p>
        <ul>
          {REGIONS.map((region) => (
            <li
              key={region.name}
              className="border-border border-b last:border-b-0"
            >
              <button
                type="button"
                onClick={() => setView({ at: "region", region })}
                className="flex w-full items-baseline justify-between gap-4 py-4 text-left"
              >
                <span className="text-lead text-ink">{region.name}</span>
                <span className="text-body text-muted">
                  {
                    gym.filter((e) => region.muscles.includes(e.primary_muscle))
                      .length
                  }
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** Where you are, and the way back. One control, not a bar of them. */
function Crumb({ label, onBack }: { label: string; onBack: () => void }) {
  return (
    <button
      type="button"
      onClick={onBack}
      className="text-label text-muted self-start uppercase underline underline-offset-4"
    >
      ← {label}
    </button>
  );
}

function ExerciseList({
  exercises,
  onPick,
  picking,
  caption,
  hidden,
  curating,
}: {
  exercises: Exercise[];
  onPick: (exercise: Exercise) => void;
  picking: string | null;
  caption?: string;
  hidden: Set<string>;
  /** While curating, a tap hides or unhides rather than adds. */
  curating: boolean;
}) {
  const lastPerformed = useContext(LastPerformed);
  const today = todayDate();

  return (
    <div className="flex flex-col gap-2">
      {caption ? (
        <p className="text-label text-muted uppercase">{caption}</p>
      ) : null}
      <ul>
        {exercises.map((exercise) => {
          const isHidden = hidden.has(exercise.id);
          const busy = picking === exercise.id;
          return (
            <li
              key={exercise.id}
              className="border-border border-b last:border-b-0"
            >
              <button
                type="button"
                disabled={picking !== null}
                onClick={() => onPick(exercise)}
                className="w-full py-4 text-left disabled:opacity-60"
              >
                {/*
                  A hidden row is struck through and says so. Neither the line
                  nor the word depends on the other, and neither is a colour.
                */}
                <span
                  className={`text-lead block ${
                    isHidden ? "text-muted line-through" : "text-ink"
                  }`}
                >
                  {exercise.name}
                </span>
                <span className="text-body text-muted mt-1 block">
                  {busy
                    ? curating
                      ? isHidden
                        ? "Bringing back"
                        : "Hiding"
                      : "Adding"
                    : isHidden
                      ? "Hidden · tap to bring back"
                      : curating
                        ? "Tap to hide"
                        : describeRow(
                            exercise,
                            daysSince(exercise.id, lastPerformed, today),
                          )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

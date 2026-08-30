"use client";

import { useEffect, useMemo, useState } from "react";

import { Skeleton } from "@/components/Skeleton";
import { secondaryAction } from "@/components/controls";
import { Exercise, fetchLibrary } from "@/lib/exercises";
import { fetchFrequentExercises, fetchRecentExercises } from "@/lib/history";
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
    };

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

  useEffect(() => {
    let active = true;

    Promise.all([
      fetchLibrary(),
      // History is the owner's own, and is allowed to be empty.
      fetchRecentExercises(),
      fetchFrequentExercises(),
    ])
      .then(([library, recent, frequent]) => {
        if (active) setData({ status: "ready", library, recent, frequent });
      })
      .catch((e: Error) => {
        console.error("the exercise library failed to load", e);
        if (active) setData({ status: "error" });
      });

    return () => {
      active = false;
    };
  }, [attempt]);

  const gym = useMemo(
    () => (data.status === "ready" ? inGymOnly(data.library) : []),
    [data],
  );

  const results = useMemo(
    () => (data.status === "ready" ? search(data.library, query) : []),
    [data, query],
  );

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

      {searching ? (
        results.length === 0 ? (
          <p className="text-body text-muted">
            Nothing matches “{query.trim()}”.
          </p>
        ) : (
          <ExerciseList
            exercises={results}
            onPick={onPick}
            picking={picking}
            caption={`${results.length} ${results.length === 1 ? "result" : "results"}`}
          />
        )
      ) : (
        <Browse
          gym={gym}
          recent={data.recent}
          frequent={data.frequent}
          view={view}
          setView={setView}
          onPick={onPick}
          picking={picking}
        />
      )}
    </div>
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
}: {
  gym: Exercise[];
  recent: Exercise[];
  frequent: Exercise[];
  view: View;
  setView: (v: View) => void;
  onPick: (exercise: Exercise) => void;
  picking: string | null;
}) {
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
                exercises={group.exercises}
                onPick={onPick}
                picking={picking}
              />
            ))}
          </div>
        ) : (
          <ExerciseList
            exercises={[...bucket.exercises].sort((a, b) =>
              a.name.localeCompare(b.name),
            )}
            onPick={onPick}
            picking={picking}
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
            exercises={[...mine].sort((a, b) => a.name.localeCompare(b.name))}
            onPick={onPick}
            picking={picking}
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
                <span className="text-body text-muted">
                  {bucket.exercises.length}
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
        />
      ) : null}

      {frequent.length > 0 ? (
        <ExerciseList
          caption="Frequent"
          exercises={frequent}
          onPick={onPick}
          picking={picking}
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
}: {
  exercises: Exercise[];
  onPick: (exercise: Exercise) => void;
  picking: string | null;
  caption?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      {caption ? (
        <p className="text-label text-muted uppercase">{caption}</p>
      ) : null}
      <ul>
        {exercises.map((exercise) => (
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
              <span className="text-lead text-ink block">{exercise.name}</span>
              <span className="text-body text-muted mt-1 block">
                {picking === exercise.id
                  ? "Adding"
                  : (exercise.equipment ?? exercise.primary_muscle)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

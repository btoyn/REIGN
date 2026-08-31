"use client";

import { useState } from "react";

import { choice, primaryAction, quiet } from "@/components/controls";
import { REGIONS } from "@/lib/regions";
import {
  REST_DAY_NAME,
  canSaveCombined,
  combinedMuscles,
  defaultDayName,
} from "@/lib/splits";

/**
 * The six regions, plus Rest day, plus a way to make a day out of several.
 *
 * Shared by Today, which asks once when a weekday is new, and by Program, where
 * a weekday is changed permanently. Both are the same question about the same
 * answers, so they are the same control; only the wording above it differs.
 *
 * Rest day is a real answer, not a way out of the question: a split with a name
 * and no muscles. A weekday split has rest days in it and the schedule cannot
 * be honest without them.
 *
 * One region stays one tap. The owner trains a weekday split — Monday is back
 * — so the common answer must not get slower to serve the uncommon one.
 * Combining is a second path behind a quiet line, the same shape the picker
 * uses for hiding an exercise.
 */
export function RegionChoice({
  saving,
  onChoose,
}: {
  /** The name currently being written, or null. Disables the set while saving. */
  saving: string | null;
  onChoose: (name: string, muscles: string[]) => void;
}) {
  const [combining, setCombining] = useState(false);

  if (combining) {
    return (
      <Combine
        saving={saving}
        onChoose={onChoose}
        onCancel={() => setCombining(false)}
      />
    );
  }

  const busy = saving !== null;

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        {REGIONS.map((region) => (
          <button
            key={region.name}
            type="button"
            disabled={busy}
            onClick={() => onChoose(region.name, region.muscles)}
            // The label changes to Saving, so the state is not carried by the
            // gold alone.
            className={
              saving === region.name
                ? `${choice} border-accent text-accent font-bold`
                : choice
            }
          >
            {saving === region.name ? "Saving" : region.name}
          </button>
        ))}
      </div>

      <button
        type="button"
        disabled={busy}
        onClick={() => onChoose(REST_DAY_NAME, [])}
        className={
          saving === REST_DAY_NAME
            ? `${choice} border-accent text-accent font-bold`
            : `${choice} text-body text-muted`
        }
      >
        {saving === REST_DAY_NAME ? "Saving" : REST_DAY_NAME}
      </button>

      <button
        type="button"
        disabled={busy}
        onClick={() => setCombining(true)}
        className={`${quiet} mt-2 self-start`}
      >
        Combine regions into one day
      </button>
    </div>
  );
}

/**
 * A day made of several regions, with a name.
 *
 * Push is chest, shoulders and triceps. The six regions describe an improvised
 * day and do not describe a program's day, so this exists to say what a day
 * actually is rather than forcing it into one body part.
 *
 * Selecting is a toggle and nothing is written until Save, because this is a
 * sentence being composed rather than a single answer being given. That is why
 * it has a primary action and the six-region list does not.
 */
function Combine({
  saving,
  onChoose,
  onCancel,
}: {
  saving: string | null;
  onChoose: (name: string, muscles: string[]) => void;
  onCancel: () => void;
}) {
  const [chosen, setChosen] = useState<string[]>([]);
  /*
    Null until the owner types. The field shows the regions joined until then,
    and typing takes it over: prefilling the state itself would fight every
    subsequent toggle, and clearing what they typed when they change their mind
    about a region would be worse.
  */
  const [typed, setTyped] = useState<string | null>(null);

  const suggested = defaultDayName(chosen);
  const name = typed ?? suggested;
  const busy = saving !== null;
  const ready = canSaveCombined(chosen, name);

  function toggle(region: string) {
    setChosen((current) =>
      current.includes(region)
        ? current.filter((r) => r !== region)
        : [...current, region],
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3">
        {REGIONS.map((region) => {
          const on = chosen.includes(region.name);
          return (
            <button
              key={region.name}
              type="button"
              disabled={busy}
              aria-pressed={on}
              onClick={() => toggle(region.name)}
              /*
                A chosen region is marked by weight and by a check, not by the
                gold alone. Colour never carries a state on its own.
              */
              className={
                on
                  ? `${choice} border-accent text-accent justify-between font-bold`
                  : `${choice} justify-between`
              }
            >
              {region.name}
              {on ? <span aria-hidden="true">✓</span> : null}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="day-name" className="text-label text-muted uppercase">
          What this day is called
        </label>
        {/*
          The second text field in REIGN, and for the same reason as the first:
          naming a day means typing letters, which is exactly what a keyboard is
          for. The number pad exists because numbers between sets need speed.
        */}
        <input
          id="day-name"
          type="text"
          value={name}
          onChange={(e) => setTyped(e.target.value)}
          placeholder="Push"
          autoCapitalize="words"
          autoCorrect="off"
          spellCheck={false}
          disabled={busy}
          className="bg-surface text-ink border-border placeholder:text-muted focus:border-muted h-12 w-full rounded-md border px-4 text-base outline-none"
        />
        <p className="text-body text-muted">
          The regions you pick fill this in. Replace it with whatever you call
          the day.
        </p>
      </div>

      <button
        type="button"
        disabled={busy || !ready}
        onClick={() => onChoose(name.trim(), combinedMuscles(chosen))}
        className={primaryAction}
      >
        {busy ? "Saving" : "Save this day"}
      </button>

      <button
        type="button"
        disabled={busy}
        onClick={onCancel}
        className={`${quiet} self-start`}
      >
        Back to one region
      </button>
    </div>
  );
}

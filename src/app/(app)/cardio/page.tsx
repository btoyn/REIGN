"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { HealthCard } from "@/components/HealthCard";
import { NumberPad, PadKey } from "@/components/NumberPad";
import { ScreenTitle } from "@/components/ScreenTitle";
import { primaryAction, choice, quiet } from "@/components/controls";
import {
  CARDIO_TYPES,
  CardioSession,
  describeCardio,
  logCardio,
  markCardioSentToHealth,
} from "@/lib/cardio";
import { HealthSession } from "@/lib/health";
import { Field, applyKey, displayValue } from "@/lib/entry";
import { todayDate } from "@/lib/workouts";

/**
 * Recording a cardio session.
 *
 * Entered by hand, because there is no Apple Health on the web. The fields are
 * exactly what a cardio machine shows at the end, and all but the type and the
 * time are optional: a bike reports distance, a stair climber does not, and
 * neither reports heart rate without a strap.
 *
 * The same number pad as sets, for the same reason: this is done standing at a
 * machine, and the iOS keyboard is wrong for numbers.
 */

/** The fields, in the order a machine's display reads. */
const FIELDS: { key: Field; label: string; suffix?: string }[] = [
  { key: "minutes", label: "Minutes" },
  { key: "distance", label: "Distance", suffix: "mi" },
  { key: "heartRate", label: "Avg HR", suffix: "bpm" },
  { key: "calories", label: "Calories" },
];

export default function CardioPage() {
  const router = useRouter();
  const [type, setType] = useState(0);
  const [values, setValues] = useState<Record<string, string>>({});
  const [active, setActive] = useState<Field>("minutes");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  /*
    The session once it is recorded. Saving used to return to Today, which was
    right when logging was the last thing that happened to a ride. It is not
    any more: a ride is the session Peloton wants out of Health, so this screen
    now stays put and offers the hand-over.
  */
  const [saved, setSaved] = useState<CardioSession | null>(null);

  function press(key: PadKey) {
    setFailed(false);
    setValues((current) => ({
      ...current,
      [active]: applyKey(current[active] ?? "", key, active),
    }));
  }

  /** Empty means the machine never reported it, which is not the same as zero. */
  const number = (key: Field) =>
    values[key] === undefined || values[key] === ""
      ? null
      : Number(values[key]);

  // Time is the one measure every machine gives, so it is the one thing asked for.
  const canSave = number("minutes") !== null;

  async function save() {
    setBusy(true);
    setFailed(false);
    try {
      const session = await logCardio({
        date: todayDate(),
        type: CARDIO_TYPES[type],
        duration_min: number("minutes"),
        distance: number("distance"),
        avg_hr: number("heartRate"),
        max_hr: null,
        calories: number("calories"),
      });
      setSaved(session);
    } catch (e) {
      console.error("could not save the cardio session", e);
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  /** Whether it reached Health, as stated by the owner. The app cannot know. */
  async function markSent(sent: boolean) {
    if (!saved) return;
    try {
      await markCardioSentToHealth(saved.id, sent);
      setSaved({ ...saved, sent_to_health: sent });
    } catch (e) {
      console.error("could not record whether it was sent", e);
    }
  }

  /*
    The recorded session, and what is left to do with it.

    Its own screen rather than a card bolted under the number pad: the entry is
    finished, so keeping the pad and the fields on screen would offer editing a
    session that has already been written.
  */
  if (saved) {
    return (
      <div className="flex flex-col gap-6">
        <ScreenTitle>Cardio</ScreenTitle>

        <div className="flex flex-col gap-1">
          <p className="text-display text-ink font-condensed uppercase">
            Recorded
          </p>
          <p className="text-body text-muted">{describeCardio(saved)}</p>
        </div>

        <HealthCard
          session={healthSession(saved)}
          sent={saved.sent_to_health}
          onMarkSent={markSent}
          unavailable={
            saved.type === "Cycling"
              ? "This one was recorded before REIGN tracked start and finish times, so there is nothing to send."
              : `The shortcut knows strength training and cycling. Sending ${saved.type.toLowerCase()} as a ride would put the wrong thing in Health, so it is left for you to enter by hand.`
          }
        />

        <button
          type="button"
          onClick={() => router.push("/")}
          className={`${quiet} self-start`}
        >
          Back to Today
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ScreenTitle>Add cardio</ScreenTitle>

      <div className="grid grid-cols-3 gap-2">
        {CARDIO_TYPES.map((name, index) => (
          <button
            key={name}
            type="button"
            aria-pressed={index === type}
            onClick={() => setType(index)}
            // Chosen carries weight as well as gold.
            className={`${choice} h-12 justify-center px-2 text-center ${
              index === type
                ? "border-accent text-accent text-body font-bold"
                : "text-body text-muted"
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-2">
        {FIELDS.map((field) => (
          <button
            key={field.key}
            type="button"
            aria-pressed={active === field.key}
            onClick={() => setActive(field.key)}
            className={`flex flex-col gap-0.5 border-b-2 pb-1 text-left ${
              active === field.key ? "border-accent" : "border-border"
            }`}
          >
            <span className="text-label text-muted uppercase">
              {field.label}
            </span>
            <span className="flex items-baseline gap-1.5">
              {/*
                The active field carries weight as well as gold, so the two are
                never told apart by hue alone.
              */}
              <span
                className={`text-hero font-condensed ${
                  active === field.key ? "text-ink" : "text-muted font-normal"
                }`}
              >
                {displayValue(values[field.key] ?? "")}
              </span>
              {field.suffix ? (
                <span className="text-body text-muted">{field.suffix}</span>
              ) : null}
            </span>
          </button>
        ))}
      </div>

      <NumberPad
        onKey={press}
        decimalDisabled={active !== "distance" && active !== "weight"}
      />

      {failed ? (
        <p role="alert" className="text-body text-ink">
          That did not save. Check your connection and try again.
        </p>
      ) : null}

      <button
        type="button"
        disabled={!canSave || busy}
        onClick={save}
        className={primaryAction}
      >
        {busy ? "Saving" : "Save cardio"}
      </button>

      <Link href="/" className={`${quiet} self-start`}>
        Cancel
      </Link>
    </div>
  );
}

/**
 * A recorded ride as the two instants Health wants, or null.
 *
 * Cycling for a ride. Anything else — a run, a row, a walk — returns null and
 * the card says there is nothing to send, because the Shortcut speaks two words
 * and calling a run a ride would put a wrong session in Health. That is the
 * same rule as not writing calories: a plausible wrong number is worse than
 * none, since nothing downstream can tell it was invented.
 *
 * Null also when the instants are missing, which is true of every session
 * recorded before REIGN stamped them.
 */
function healthSession(session: CardioSession): HealthSession | null {
  if (session.type !== "Cycling") return null;
  if (!session.started_at || !session.finished_at) return null;
  return {
    type: "cycling",
    start: new Date(session.started_at),
    end: new Date(session.finished_at),
  };
}

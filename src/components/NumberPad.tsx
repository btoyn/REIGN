"use client";

import { Delete } from "lucide-react";

/**
 * The number pad.
 *
 * Not the iOS keyboard. That keyboard covers half the screen, takes a moment to
 * animate in, and offers punctuation nobody needs between sets. This is twelve
 * fixed targets that are always in the same place, so entering a weight is
 * muscle memory rather than aiming.
 *
 * Targets are 64px tall, which is comfortably past the 44px Apple asks for and
 * usable with one hand and chalk on it.
 */

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

export type PadKey = string | "." | "backspace";

export function NumberPad({
  onKey,
  decimalDisabled,
}: {
  onKey: (key: PadKey) => void;
  /** Reps are whole numbers, so the point is disabled rather than hidden. */
  decimalDisabled: boolean;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {KEYS.map((key) => (
        <PadButton key={key} onPress={() => onKey(key)}>
          {key}
        </PadButton>
      ))}

      <PadButton disabled={decimalDisabled} onPress={() => onKey(".")}>
        .
      </PadButton>

      <PadButton onPress={() => onKey("0")}>0</PadButton>

      <PadButton label="Backspace" onPress={() => onKey("backspace")}>
        <Delete size={22} aria-hidden />
      </PadButton>
    </div>
  );
}

function PadButton({
  children,
  onPress,
  disabled,
  label,
}: {
  children: React.ReactNode;
  onPress: () => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={label}
      onClick={onPress}
      className="text-hero bg-surface text-ink active:bg-raised flex h-16 items-center justify-center rounded-md disabled:opacity-40"
    >
      {children}
    </button>
  );
}

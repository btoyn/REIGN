/**
 * Typing a number on the pad.
 *
 * The value being edited is held as the string that was typed rather than a
 * parsed number, so a half-entered "22." survives until the next key. It is
 * parsed once, when the set is written.
 *
 * Limits come from the column: weight is numeric(6, 2), so four digits before
 * the point and two after. Reps are a plain integer and three digits is already
 * more than anyone will do.
 */

export type Field = "weight" | "reps";

const LIMITS = {
  weight: { allowDecimal: true, maxWhole: 4, maxDecimals: 2 },
  reps: { allowDecimal: false, maxWhole: 3, maxDecimals: 0 },
} as const;

export function applyKey(current: string, key: string, field: Field): string {
  const limit = LIMITS[field];

  if (key === "backspace") return current.slice(0, -1);

  if (key === ".") {
    if (!limit.allowDecimal || current.includes(".")) return current;
    // A point typed first means "nought point", which is what was meant.
    return current === "" ? "0." : `${current}.`;
  }

  const [whole = "", decimals] = current.split(".");

  if (current.includes(".")) {
    if ((decimals ?? "").length >= limit.maxDecimals) return current;
    return current + key;
  }

  if (whole.length >= limit.maxWhole) return current;
  // A single leading zero is replaced rather than grown into "05".
  if (whole === "0") return key;
  return current + key;
}

/** What the field shows when nothing has been typed. */
export function displayValue(value: string): string {
  return value === "" ? "0" : value;
}

/**
 * Whether this pair can be written.
 *
 * A set with no weight or no reps is not a set. Zero reps is not either: it
 * would record having attempted nothing. Zero weight is allowed, since
 * bodyweight exercises are real.
 */
export function isLoggable(weight: string, reps: string): boolean {
  const w = Number(weight);
  const r = Number(reps);
  return (
    weight !== "" &&
    reps !== "" &&
    Number.isFinite(w) &&
    Number.isFinite(r) &&
    w >= 0 &&
    r >= 1
  );
}

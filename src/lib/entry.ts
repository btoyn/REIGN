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

export type Field =
  | "weight"
  | "bodyweight"
  | "reps"
  | "minutes"
  | "heartRate"
  | "calories"
  | "distance";

/*
  Every limit comes from the column the value lands in, not from a guess.

  weight    numeric(6, 2)  four whole digits and two decimals
  bodyweight numeric(5, 2) three whole digits and two decimals. Its own field
                           rather than reusing weight, whose column is wider:
                           sharing it would let a four-digit bodyweight be
                           typed and then refused by the database
  reps      integer        three digits is already more than anyone will do
  minutes   integer        999 minutes is over sixteen hours
  heartRate integer        three digits covers every human heart
  calories  integer        four digits covers any single session
  distance  numeric(8, 2)  three whole digits and two decimals is plenty for
                           miles or kilometres in one session
*/
const LIMITS = {
  weight: { allowDecimal: true, maxWhole: 4, maxDecimals: 2 },
  bodyweight: { allowDecimal: true, maxWhole: 3, maxDecimals: 2 },
  reps: { allowDecimal: false, maxWhole: 3, maxDecimals: 0 },
  minutes: { allowDecimal: false, maxWhole: 3, maxDecimals: 0 },
  heartRate: { allowDecimal: false, maxWhole: 3, maxDecimals: 0 },
  calories: { allowDecimal: false, maxWhole: 4, maxDecimals: 0 },
  distance: { allowDecimal: true, maxWhole: 3, maxDecimals: 2 },
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

/**
 * The shapes controls come in.
 *
 * Kept in one place so a button on Today and a button on sign-in are the same
 * object, and so the radii mean something rather than being whatever was
 * typed that day:
 *
 *   sm  8px — chips and small inline choices
 *   md 12px — controls the thumb aims at: inputs, choice buttons
 *   lg 16px — large surfaces, and the one primary action per screen
 *
 * The primary action is the only gold control on a screen. Gold marks the
 * thing the screen exists for; everything else is quieter than it.
 */

const ACTION_BASE =
  "text-button flex h-14 w-full items-center justify-center rounded-lg uppercase disabled:opacity-60";

/** The one thing this screen is for. Gold. */
export const primaryAction = `${ACTION_BASE} bg-accent text-bg active:bg-accent-pressed`;

/** A real action that is not what the screen is for. */
export const secondaryAction = `${ACTION_BASE} bg-surface text-ink border-border border`;

/** A choice among several. Sized for a thumb, not a cursor. */
export const choice =
  "text-lead border-border text-ink flex h-14 w-full items-center justify-center rounded-md border px-3 disabled:opacity-60";

/** An escape hatch. Reads as a link, not a button, so it never competes. */
export const quiet = "text-body text-muted underline underline-offset-4";

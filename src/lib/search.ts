import type { Exercise } from "@/lib/exercises";
import { isInGym } from "@/lib/library";

/**
 * Searching the library by the names the owner uses.
 *
 * The library's names are not the ones anyone says out loud. It calls the
 * overhead press "Standing Military Press" and the bench press "Barbell Bench
 * Press - Medium Grip". Typing what you call a lift and getting nothing is a
 * broken search, so three things happen, in this order.
 */

/**
 * Fold case, drop punctuation, collapse whitespace.
 *
 * This alone fixes two of the failures found in the real data: "skullcrusher"
 * finds "Skull Crusher", and "bench press" finds "Bench Press - Powerlifting".
 */
export function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * What the owner types, mapped to what the library says.
 *
 * Hand written, and meant to be edited. These are the terms that return nothing
 * at all without help, not a general synonym engine. Keys are already
 * normalised; each maps to phrases that are searched instead of the query.
 */
export const ALIASES: Record<string, string[]> = {
  "overhead press": ["military press", "shoulder press"],
  ohp: ["military press", "shoulder press"],
  rdl: ["romanian deadlift", "stiff legged deadlift"],
  "romanian deadlift": ["romanian deadlift", "stiff legged deadlift"],
  skullcrusher: ["skull crusher", "lying triceps"],
  skullcrushers: ["skull crusher", "lying triceps"],
  "leg raise": ["leg raise", "leg lift"],
  "lat pulldown": ["lat pulldown", "pulldown"],
  chinup: ["chin up"],
  chinups: ["chin up"],
  pullup: ["pull up", "pullups"],
  pullups: ["pull up", "pullups"],
  pushup: ["push up", "pushups"],
  pushups: ["push up", "pushups"],
  "calf raise": ["calf raise", "calf press"],
  "hip thrust": ["hip thrust", "glute bridge"],
  "tricep extension": ["triceps extension"],
  "bicep curl": ["biceps curl", "curl"],
  "front raise": ["front raise"],
  "rear delt": ["rear delt", "reverse fly"],
  shrug: ["shrug"],
};

/** The phrases a query is actually matched against: itself, plus any aliases. */
export function expand(query: string): string[] {
  const q = normalise(query);
  if (q === "") return [];
  return [q, ...(ALIASES[q] ?? [])];
}

/**
 * Does this name match the phrase?
 *
 * Every word of the phrase must appear in the name as the start of a word, so
 * "bench press" matches "Barbell Bench Press" but not "Benchmark". Word starts
 * rather than anywhere, because matching mid-word turns short queries into
 * noise.
 */
function matchesPhrase(haystack: string, phrase: string): boolean {
  const words = haystack.split(" ");
  return phrase
    .split(" ")
    .every((token) => words.some((word) => word.startsWith(token)));
}

/**
 * Search, ranked simply and on purpose.
 *
 * What the gym has comes first, then an exact name, then names that begin with
 * what was typed, then the shortest.
 *
 * The gym check leads for a reason found by running this against the real data:
 * ranking on name length alone put "Bench Press with Chains" above the actual
 * bench press, and "Rowing, Stationary" above every barbell row, because junk
 * often has a shorter name. Search still reaches everything, so nothing is
 * unreachable; it just stops leading with equipment the owner does not have.
 *
 * Beyond that it is deliberately not clever. "curl" matches 70 exercises and no
 * ranking turns 70 into an answer. Recent solves that once a few curl
 * variations are logged.
 */
export function search(exercises: Exercise[], query: string): Exercise[] {
  const phrases = expand(query);
  if (phrases.length === 0) return [];

  const scored: { exercise: Exercise; gym: number; rank: number }[] = [];

  for (const exercise of exercises) {
    const name = normalise(exercise.name);
    if (!phrases.some((p) => matchesPhrase(name, p))) continue;

    const rank = phrases.some((p) => name === p)
      ? 0
      : phrases.some((p) => name.startsWith(p))
        ? 1
        : 2;

    scored.push({ exercise, gym: isInGym(exercise) ? 0 : 1, rank });
  }

  return scored
    .sort(
      (a, b) =>
        a.gym - b.gym ||
        a.rank - b.rank ||
        a.exercise.name.length - b.exercise.name.length ||
        a.exercise.name.localeCompare(b.exercise.name),
    )
    .map((s) => s.exercise);
}

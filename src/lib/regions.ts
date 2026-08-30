/**
 * The six body regions, with the library's muscles nested underneath.
 *
 * Source of truth: docs/design/REIGN_UI_SPEC.md, "Exercise Picker".
 *
 * Lats and traps sit under Back rather than beside it. Neck, abductors and
 * adductors are nested and never top level. Between them the six regions cover
 * all seventeen muscles the exercise library tags, so nothing is unreachable.
 */

export type Region = {
  /** Shown to the owner, and stored as the split's name. */
  name: string;
  /** The library's own muscle values, which is what exercises are tagged with. */
  muscles: string[];
};

export const REGIONS: Region[] = [
  { name: "Chest", muscles: ["chest"] },
  { name: "Back", muscles: ["lats", "middle back", "lower back", "traps"] },
  { name: "Shoulders", muscles: ["shoulders", "neck"] },
  { name: "Arms", muscles: ["biceps", "triceps", "forearms"] },
  {
    name: "Legs",
    muscles: [
      "quadriceps",
      "hamstrings",
      "glutes",
      "calves",
      "abductors",
      "adductors",
    ],
  },
  { name: "Core", muscles: ["abdominals"] },
];

/** Every muscle the six regions account for. Used to prove none is orphaned. */
export const COVERED_MUSCLES = REGIONS.flatMap((r) => r.muscles);

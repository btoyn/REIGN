import type { Exercise } from "@/lib/exercises";

/**
 * The six body regions, and how each one divides.
 *
 * Source of truth: docs/design/REIGN_UI_SPEC.md, "Exercise Picker".
 *
 * Lats and traps sit under Back rather than beside it. Neck, abductors and
 * adductors are nested and never top level. Between them the six regions cover
 * all seventeen muscles the exercise library tags, so nothing is unreachable.
 *
 * The second level differs by region, because the regions differ. It is chosen
 * from what makes each one scannable after the trim, not from one rule applied
 * six times. The counts behind each choice are in the specification.
 */

export type SecondLevel = "equipment" | "muscle" | "none";

export type Region = {
  /** Shown to the owner, and stored as the split's name. */
  name: string;
  /** The library's own muscle values, which is what exercises are tagged with. */
  muscles: string[];
  /** How this region divides. */
  divideBy: SecondLevel;
};

export const REGIONS: Region[] = [
  // One muscle, so sub-muscle does not exist. Five even equipment buckets.
  { name: "Chest", muscles: ["chest"], divideBy: "equipment" },

  // lats 20, middle back 19, traps 10, lower back 6. This is the variety the
  // owner asked for, and it separates a lat day from a trap day.
  {
    name: "Back",
    muscles: ["lats", "middle back", "lower back", "traps"],
    divideBy: "muscle",
  },

  // Sub-muscle is useless here: shoulders 72, neck 2.
  { name: "Shoulders", muscles: ["shoulders", "neck"], divideBy: "equipment" },

  // triceps 57, biceps 48, forearms 17. By equipment the largest bucket would
  // be 49 and mixed.
  {
    name: "Arms",
    muscles: ["biceps", "triceps", "forearms"],
    divideBy: "muscle",
  },

  // quadriceps 50, hamstrings 18, calves 12, glutes 11. By equipment, barbell
  // alone is 39.
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
    divideBy: "muscle",
  },

  // By equipment it is body only 38 and four scraps; by muscle it is one bucket
  // of 63. A second level would be a pile and some crumbs, so the list is flat.
  { name: "Core", muscles: ["abdominals"], divideBy: "none" },
];

/** Every muscle the six regions account for. Used to prove none is orphaned. */
export const COVERED_MUSCLES = REGIONS.flatMap((r) => r.muscles);

/**
 * A bucket becomes long enough to want headings inside it at this size.
 *
 * Quadriceps is 50 after the split and triceps 57. A sorted list of fifty is
 * still a list of fifty, so those get equipment headings within the one list.
 * Below this, headings would be more structure than the content needs.
 */
export const LONG_BUCKET = 30;

/**
 * Equipment as it is grouped, which is not quite as the library tags it.
 *
 * An EZ curl bar lives in the barbell rack, so it is grouped with barbells
 * rather than sitting alone: chest holds exactly one of them, and a bucket of
 * one is a row that wastes a tap. The library's own value is untouched; this is
 * only how it is filed on screen.
 */
export function equipmentGroup(equipment: string | null): string {
  if (equipment === "e-z curl bar") return "barbell";
  return equipment ?? "";
}

/** How equipment is written on screen. The library's own values are lowercase. */
export function equipmentLabel(equipment: string | null): string {
  if (!equipment) return "Other";
  if (equipment === "body only") return "Bodyweight";
  return equipment.charAt(0).toUpperCase() + equipment.slice(1);
}

/**
 * Equipment in the order it is worth scanning, heaviest first, rather than
 * alphabetically or by however many the library happens to hold.
 */
const EQUIPMENT_ORDER = [
  "barbell",
  "dumbbell",
  "cable",
  "machine",
  "body only",
];

export function sortEquipment(values: string[]): string[] {
  return [...values].sort((a, b) => {
    const ai = EQUIPMENT_ORDER.indexOf(a);
    const bi = EQUIPMENT_ORDER.indexOf(b);
    return (
      (ai === -1 ? EQUIPMENT_ORDER.length : ai) -
        (bi === -1 ? EQUIPMENT_ORDER.length : bi) || a.localeCompare(b)
    );
  });
}

export type Bucket = { key: string; label: string; exercises: Exercise[] };

/** The second level of a region: its buckets, in the order they are shown. */
export function bucketsFor(region: Region, exercises: Exercise[]): Bucket[] {
  if (region.divideBy === "none") return [];

  if (region.divideBy === "muscle") {
    return region.muscles
      .map((muscle) => ({
        key: muscle,
        label: muscle.charAt(0).toUpperCase() + muscle.slice(1),
        exercises: exercises.filter((e) => e.primary_muscle === muscle),
      }))
      .filter((b) => b.exercises.length > 0)
      .sort((a, b) => b.exercises.length - a.exercises.length)
      .reduce(mergeTinyBuckets, [] as Bucket[]);
  }

  return equipmentBuckets(exercises, false);
}

/**
 * Buckets holding almost nothing are folded into one.
 *
 * Legs by muscle gives abductors 1 and adductors 1. Two rows that each open a
 * list of one are worse than one row that opens a list of two, and dropping
 * them outright would put those exercises behind search only.
 */
const TINY_BUCKET = 3;

function mergeTinyBuckets(kept: Bucket[], bucket: Bucket): Bucket[] {
  if (bucket.exercises.length >= TINY_BUCKET) return [...kept, bucket];

  const existing = kept.find((b) => b.key === "other");
  if (existing) {
    existing.exercises = [...existing.exercises, ...bucket.exercises];
    return kept;
  }
  return [
    ...kept,
    { key: "other", label: "Other", exercises: bucket.exercises },
  ];
}

/**
 * Whether a bucket wants equipment headings inside it.
 *
 * Only worth it when the bucket holds a mix. A region already divided by
 * equipment produces single-equipment buckets, where headings would be one
 * heading over the whole list, which says nothing.
 */
export function wantsEquipmentHeadings(
  region: Region,
  bucket: Bucket,
): boolean {
  return region.divideBy === "muscle" && bucket.exercises.length > LONG_BUCKET;
}

/**
 * A long list, grouped under equipment headings.
 *
 * Structure inside the one list rather than another tap: the owner already
 * knows whether they are on a barbell or a dumbbell, so this lets them jump to
 * the section instead of reading every row.
 */
export function groupByEquipment(exercises: Exercise[]): Bucket[] {
  return equipmentBuckets(exercises, true);
}

function equipmentBuckets(
  exercises: Exercise[],
  sortByName: boolean,
): Bucket[] {
  const values = sortEquipment([
    ...new Set(exercises.map((e) => equipmentGroup(e.equipment))),
  ]);

  return values
    .map((equipment) => {
      const mine = exercises.filter(
        (e) => equipmentGroup(e.equipment) === equipment,
      );
      return {
        key: equipment,
        label: equipmentLabel(equipment || null),
        exercises: sortByName
          ? [...mine].sort((a, b) => a.name.localeCompare(b.name))
          : mine,
      };
    })
    .filter((b) => b.exercises.length > 0);
}

import { getSupabase } from "@/lib/supabase";

/**
 * Pinned alternatives — the owner's own judgement about what swaps for what.
 *
 * Every other part of the swap list is a rule read off the library's tags, and
 * a rule is right on average and wrong in particular. The Free Exercise DB
 * tags a bent-arm dumbbell pullover as a compound chest movement, so it is
 * offered second for a bench press however the ranking is arranged, because by
 * the data it genuinely is a close match. It is not the answer when the bench
 * is taken.
 *
 * Nothing here learns anything and nothing overwrites a tag. A pin is a row
 * saying these two are interchangeable, and it sorts above every rule.
 *
 * Pins are read in BOTH DIRECTIONS. Pinning a dumbbell press as the stand-in
 * for a barbell press also answers the reverse, because that is how a lifter
 * holds it — the two are interchangeable, not one subordinate to the other —
 * and it means the pair is pinned once rather than twice.
 */

/**
 * Every pin as one lookup: exercise id to the ids pinned to it.
 *
 * Returns an empty map rather than throwing if the read fails. Pins are a
 * preference layered on top of the tag rules, so a swap screen that cannot
 * read them should fall back to the rules rather than break: the worst case is
 * a list ordered the way it was ordered before pinning existed, which is a
 * worse list rather than no list. The failure still reaches the console.
 */
export async function fetchAlternates(): Promise<Map<string, Set<string>>> {
  const { data, error } = await getSupabase()
    .from("exercise_alternates")
    .select("exercise_id, alternate_id");

  const pins = new Map<string, Set<string>>();
  if (error) {
    console.error("could not read pinned alternatives", error.message);
    return pins;
  }

  for (const row of data ?? []) {
    add(pins, row.exercise_id, row.alternate_id);
    add(pins, row.alternate_id, row.exercise_id);
  }
  return pins;
}

function add(pins: Map<string, Set<string>>, from: string, to: string): void {
  const existing = pins.get(from);
  if (existing) existing.add(to);
  else pins.set(from, new Set([to]));
}

/**
 * Pin a pair.
 *
 * The row is written one way round only, because the table's primary key is
 * the pair and reading it in both directions is what makes it symmetric. It is
 * skipped if the reverse already exists, so the same pair pinned from either
 * side is one row rather than two.
 *
 * A duplicate is treated as success rather than as an error. The only way to
 * reach it is a pin that is already there, which is the state the caller was
 * asking for, and failing on it would put an error on the screen for a button
 * that did exactly what it said.
 */
export async function pinAlternate(
  exerciseId: string,
  alternateId: string,
): Promise<void> {
  const supabase = getSupabase();

  const { data: reverse, error: lookupError } = await supabase
    .from("exercise_alternates")
    .select("exercise_id")
    .eq("exercise_id", alternateId)
    .eq("alternate_id", exerciseId)
    .maybeSingle();

  if (lookupError) throw new Error(lookupError.message);
  if (reverse) return;

  const { error } = await supabase
    .from("exercise_alternates")
    .insert({ exercise_id: exerciseId, alternate_id: alternateId });

  // 23505 is Postgres' unique violation: the pin is already there.
  if (error && error.code !== "23505") throw new Error(error.message);
}

/**
 * Unpin a pair.
 *
 * Both directions are deleted, because the pin could have been written either
 * way round and the caller only knows which exercise they were looking at.
 * Two plain deletes rather than one filter expression: the ids would otherwise
 * have to be spliced into PostgREST's filter grammar as text, and a delete
 * whose reach depends on string assembly is not one to be casual about.
 *
 * A delete that matches nothing is not an error, so unpinning something that
 * was never pinned is quietly fine.
 */
export async function unpinAlternate(
  exerciseId: string,
  alternateId: string,
): Promise<void> {
  for (const [from, to] of [
    [exerciseId, alternateId],
    [alternateId, exerciseId],
  ]) {
    const { error } = await getSupabase()
      .from("exercise_alternates")
      .delete()
      .eq("exercise_id", from)
      .eq("alternate_id", to);

    if (error) throw new Error(error.message);
  }
}

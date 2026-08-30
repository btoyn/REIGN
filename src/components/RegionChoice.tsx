"use client";

import { choice } from "@/components/controls";
import { REGIONS } from "@/lib/regions";
import { REST_DAY_NAME } from "@/lib/splits";

/**
 * The six regions, plus Rest day.
 *
 * Shared by Today, which asks once when a weekday is new, and by Program, where
 * a weekday is changed permanently. Both are the same question about the same
 * seven answers, so they are the same control; only the wording above it
 * differs.
 *
 * Rest day is a real answer, not a way out of the question: a split with a name
 * and no muscles. A weekday split has rest days in it and the schedule cannot
 * be honest without them.
 */
export function RegionChoice({
  saving,
  onChoose,
}: {
  /** The name currently being written, or null. Disables the set while saving. */
  saving: string | null;
  onChoose: (name: string, muscles: string[]) => void;
}) {
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
    </div>
  );
}

import { StabilityItem } from "@/lib/programs";

/**
 * The block that opens every day of a program.
 *
 * Collapsed by default, and the reason is the one CLAUDE.md gives for the whole
 * app: a day's list should say what you are training. Seven lines of breathing
 * and balance work at the top of every screen would push the lifting below the
 * fold on a phone and make six identical days look different from each other.
 *
 * So it is one line that says what it is and how many parts it has, and it
 * opens when you are doing it.
 *
 * Built on <details>, which is the browser's own disclosure: it opens without
 * JavaScript, it is reachable from a keyboard, it announces its state to a
 * screen reader, and it survives the strip test because a summary is still a
 * line of text with a list under it when every border is gone.
 *
 * Not gold. This is never the dominant action on any screen it appears on —
 * the screen exists for the training underneath it.
 */
export function StabilityBlock({
  items,
  minutes,
}: {
  items: StabilityItem[];
  /** What the block is meant to take, when the program says. */
  minutes?: string;
}) {
  if (items.length === 0) return null;

  return (
    <details className="border-border border-y">
      <summary className="flex cursor-pointer items-baseline gap-3 py-4">
        <span className="text-label text-muted uppercase">Stability</span>
        {/*
          The count, so the line says what opening it costs. Assembled here
          from the items themselves, never stored.
        */}
        <span className="text-body text-muted">
          {items.length} {items.length === 1 ? "part" : "parts"}
          {minutes ? ` · ${minutes}` : ""}
        </span>
      </summary>

      <ul className="pb-4">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-baseline justify-between gap-4 py-2"
          >
            <span className="text-body text-ink">{item.name}</span>
            {/*
              The prescription in the owner's own words. This is the one place
              in REIGN where a prescription is stored as text rather than
              assembled from numbers, because there are no numbers underneath
              it: two minutes of breathing is not sets and reps.
            */}
            <span className="text-body text-muted shrink-0 tabular-nums">
              {item.prescription}
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}

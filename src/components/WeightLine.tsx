import { Point } from "@/lib/bodyweight";

/**
 * The bodyweight trend, as a line.
 *
 * THIS IS THE ONE CHART IN REIGN, and it needs a defence, because the strength
 * trend was deliberately given no chart at all: take a line away from a column
 * of working weights in tabular figures and nothing is lost, which means the
 * line was never carrying anything.
 *
 * Bodyweight is the opposite case. A weekly reading moves for reasons that have
 * nothing to do with training — water, salt, what you ate on Tuesday — and the
 * question is never "what was the figure on 19 August", it is "which way is
 * this going". A column of four numbers hides that inside the noise. A line
 * answers it before you have read a single digit. That is a chart earning its
 * place rather than decorating a screen.
 *
 * WHAT IT DELIBERATELY HAS NOT GOT:
 *
 *   * No axes and no gridlines. The current weight is stated above it as the
 *     large number and the movement is stated in words, so nothing here has to
 *     be measured off a scale.
 *   * No number on any point. The endpoint is the hero figure above; putting a
 *     value beside every dot is chaos that goes unread.
 *   * No fill under the line. A filled area implies the space beneath means
 *     something, and here it means nothing: the baseline is not zero.
 *   * No colour. The line is ink, not gold. Gold marks the primary action, the
 *     active tab, completed sets and PRs, and a bodyweight line is none of
 *     those. It is also not red-for-up or green-for-down: down is not
 *     automatically good, and no state in REIGN is signalled by hue alone.
 *   * No tooltip. Standard chart guidance is to ship a hover layer, and this
 *     skips it on purpose: it is a phone screen read between sets, and every
 *     exact reading is listed underneath as text. The list IS the table view,
 *     and it is more legible than a tooltip a thumb has to chase.
 *
 * The line is drawn in a stretched SVG so it spans whatever width it is given,
 * with a non-scaling stroke so it stays a hairline rather than being smeared
 * wide. The dots are positioned as a percentage instead of being SVG circles,
 * because a circle inside a stretched viewBox comes out an ellipse.
 */

/** Room for the stroke, so the first and last points are not half-clipped. */
const INSET = 3;

export function WeightLine({ points }: { points: Point[] }) {
  if (points.length < 2) return null;

  const span = 100 - INSET * 2;
  const at = (p: Point) => ({
    // x runs left to right through time; y is inverted because 0 is the top of
    // a drawing and the lightest weight belongs at the bottom.
    left: INSET + p.x * span,
    top: INSET + (1 - p.y) * span,
  });

  const path = points
    .map((p) => {
      const { left, top } = at(p);
      return `${left},${top}`;
    })
    .join(" ");

  return (
    <div className="relative h-16 w-full" aria-hidden="true">
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
      >
        <polyline
          points={path}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          /* Keeps the stroke a hairline while the geometry stretches. */
          vectorEffect="non-scaling-stroke"
          className="text-ink"
        />
      </svg>

      {/*
        A dot per reading, so the line reads as weekly measurements rather than
        as something continuously recorded. Six pixels: standard guidance asks
        for eight or more, which is a rule about hit targets, and nothing here
        is tappable.
      */}
      {points.map((p) => {
        const { left, top } = at(p);
        return (
          <span
            key={p.weighin.id}
            className="bg-ink absolute h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ left: `${left}%`, top: `${top}%` }}
          />
        );
      })}
    </div>
  );
}

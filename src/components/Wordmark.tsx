import Image from "next/image";

import wordmark from "../../assets/brand/reign-wordmark-transparent.png";

/**
 * The REIGN wordmark.
 *
 * This is the supplied mark, not a typeset stand-in. It uses the transparent
 * version derived from reign-wordmark-approved.png: the original is opaque and
 * would show its own near-black rectangle against the app background. The
 * original file is untouched and still in assets/brand/.
 *
 * The derived file is also trimmed of its empty margin. The supplied art puts
 * the mark in the middle of a canvas half again its size, which both shrank the
 * mark and pushed phantom space into the header. No ink was touched: coverage
 * before and after the trim is identical to the pixel.
 *
 * Shown at 112px against a 242px source, so roughly twice the detail of the
 * displayed size. Smaller was sharper but read as a smudge rather than a mark.
 *
 * It is served unoptimised on purpose. The optimiser only offers up to twice
 * the display width, which would hand a 3x screen a 256px image and soften the
 * mark. The original file is 11KB, so re-encoding it saves nothing and costs
 * sharpness.
 */

const DISPLAY_WIDTH = 112;

export function Wordmark() {
  return (
    <Image
      src={wordmark}
      alt="REIGN"
      width={DISPLAY_WIDTH}
      // The height follows the source's own proportions.
      height={Math.round((DISPLAY_WIDTH * wordmark.height) / wordmark.width)}
      priority
      unoptimized
      className="h-auto w-28"
    />
  );
}

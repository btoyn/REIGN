import Image from "next/image";

import lockup from "../../assets/brand/reign-logo-transparent.png";

/**
 * The full lion lockup.
 *
 * This is the supplied artwork, not a drawing of it. It uses the transparent
 * version derived from reign-logo-approved.png: the original is opaque and
 * would show its own near-black rectangle sitting on the app background. The
 * supplied file is untouched and still in assets/brand/.
 *
 * The transparency was cut by flooding in from the edges rather than by keying
 * out the background colour, which matters here in a way it did not for the
 * wordmark. The lion's own facets reach pure black — darker than the
 * near-black behind it — and 4,283 pixels inside the mark match the background
 * exactly. Keying on colour would have punched holes through the mane. The
 * derived file was checked afterwards: no colour altered, no holes, and ink
 * coverage identical to the pixel.
 *
 * Shown at 160px against 536px of source, so more than three times the detail
 * a 3x screen asks for. The lockup carries fine work in the mane and a line of
 * small type under it, and both go to mush when the source is close to the
 * display size.
 *
 * It is served unoptimised for the same reason the wordmark is: the optimiser
 * caps at twice the display width, which would hand a phone 320px of a mark
 * that has 536px available and soften it for no saving worth having.
 */

const DISPLAY_WIDTH = 160;

export function Lockup() {
  return (
    <Image
      src={lockup}
      alt="REIGN"
      width={DISPLAY_WIDTH}
      // The height follows the artwork's own proportions.
      height={Math.round((DISPLAY_WIDTH * lockup.height) / lockup.width)}
      unoptimized
      className="h-auto w-40"
    />
  );
}

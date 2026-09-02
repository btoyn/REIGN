import Image from "next/image";

import lion from "../../assets/brand/reign-lion-transparent.png";

/**
 * The lion, alone, heading Today.
 *
 * This replaced the wordmark at the owner's request: "the lion is badass and I
 * fear we don't use it like we should". They are right that it was doing almost
 * no work — it was the app icon and a mark at the foot of a screen nobody opens
 * mid-workout, and the screen seen every single day carried four letters
 * instead.
 *
 * NOT DRAWN, NOT RECREATED, NOT REGENERATED. It is a crop of the supplied
 * lockup, taken above the row where the REIGN lettering begins and trimmed to
 * the lion's own edges. Verified rather than assumed: zero pixels differ from
 * the pixels they came from, and ink coverage is identical to the region that
 * was cut. CLAUDE.md forbids recreating the lion in CSS, SVG, text or generated
 * graphics, and cropping supplied art is the same operation the app icon was
 * derived by.
 *
 * The lockup was the right source rather than reign-lion-approved.png, which is
 * only 240 wide and opaque. The lockup's own lion is 497 wide and was already
 * cut out, so this needed no new background removal and no upscaling.
 *
 * Shown at 112px wide against 497px of source — more than four times what a 3x
 * screen asks for. The mane is dense faceted work and it is the first thing
 * seen every day, so it gets the headroom.
 *
 * Served unoptimised, like the wordmark and the lockup before it: Next's
 * optimiser offers at most twice the display width, which would hand a phone
 * 224px of a mark that has 497px available.
 */

const DISPLAY_WIDTH = 112;

export function LionMark() {
  return (
    <Image
      src={lion}
      alt="REIGN"
      width={DISPLAY_WIDTH}
      // The height follows the artwork's own proportions.
      height={Math.round((DISPLAY_WIDTH * lion.height) / lion.width)}
      priority
      unoptimized
      className="h-auto w-28"
    />
  );
}

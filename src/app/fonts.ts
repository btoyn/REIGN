import { Archivo } from "next/font/google";

/**
 * Archivo, in two widths from one family.
 *
 * The wdth axis is requested so headings and large numbers can be condensed
 * while body text stays at regular width, without loading a second family.
 *
 * Self-hosted by next/font at build time, so no request leaves the device to a
 * font CDN and there is no flash of a fallback face.
 */
export const archivo = Archivo({
  subsets: ["latin"],
  // No weight list: naming axes requires the variable font, which carries the
  // whole weight range as well as the width axis.
  axes: ["wdth"],
  display: "swap",
  variable: "--font-archivo",
});

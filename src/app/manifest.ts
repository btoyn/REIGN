import type { MetadataRoute } from "next";

/**
 * Web app manifest.
 *
 * This is what makes the home screen behaviour deliberate rather than
 * incidental: the name shown under the icon, launching without browser
 * chrome, and the colours iOS uses while the app is starting.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "REIGN",
    short_name: "REIGN",
    description: "Personal training log.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0A0A0A",
    theme_color: "#0A0A0A",
    /*
      The lion, from assets/brand/reign-lion-approved.png. iOS reads
      apple-icon.png rather than this, but Android and the browser's install
      prompt read the manifest, so it is stated here too.

      There is no 512 pixel size. The supplied art is 240x230, so 512 would mean
      upscaling it, and CLAUDE.md forbids that.
    */
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}

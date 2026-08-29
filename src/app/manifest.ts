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
  };
}

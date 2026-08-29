import { ImageResponse } from "next/og";

/**
 * The iPhone home screen icon.
 *
 * A placeholder, as required by CLAUDE.md: the supplied brand icon is 255x230
 * and a real icon must be square at 1024x1024, and the supplied files must not
 * be upscaled or altered. This is a plain letterform, not the lion.
 */

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0A0A0A",
          color: "#C6A15B",
          fontSize: 104,
          fontWeight: 700,
        }}
      >
        R
      </div>
    ),
    size,
  );
}

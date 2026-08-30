import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    /*
      Exercise photographs come from the Free Exercise DB on GitHub, which is
      public domain. They are not linked from the phone directly: next/image
      fetches them server side and serves them from our own origin, so the
      phone talks to one host on gym wifi instead of two, the images arrive
      resized for the screen rather than at 850 pixels wide, and they are
      cached at the edge after the first request.
    */
    remotePatterns: [
      {
        protocol: "https",
        hostname: "raw.githubusercontent.com",
        pathname: "/yuhonas/free-exercise-db/**",
      },
    ],
  },
};

export default nextConfig;

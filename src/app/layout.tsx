import type { Metadata, Viewport } from "next";

import { archivo } from "./fonts";

import "./globals.css";

export const metadata: Metadata = {
  title: "REIGN",
  description: "Personal training log.",
  applicationName: "REIGN",
  // Controls the name and behaviour when added to the iPhone home screen.
  appleWebApp: {
    capable: true,
    title: "REIGN",
    // The app background runs under the status bar rather than stopping below
    // it, so the dark surface is unbroken. Safe-area padding keeps content clear.
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#0A0A0A",
  width: "device-width",
  initialScale: 1,
  // Lets the page fill the display including the area around the notch.
  viewportFit: "cover",
};

/**
 * The document.
 *
 * The tab bar and the sign-in gate live in the (app) group rather than here,
 * so the sign-in screen renders without either.
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${archivo.variable} h-full antialiased`}>
      <head>
        {/*
          The launch screen, for the second between tapping the home screen
          icon and the app being ready to draw.

          That second is currently blank. iOS fills it with the manifest's
          background colour, which is the right colour and nothing else. This
          puts the lockup there instead, which is the one place in an app where
          a full logo belongs: it is gone before it can be in the way.

          One image per device size, because iOS matches on exact dimensions
          rather than scaling. A device matching none of these gets the blank
          background it gets today, so an unlisted size is never worse than
          having no launch image at all.

          Next has no metadata field for these, so they are plain link elements.
        */}
        <link
          rel="apple-touch-startup-image"
          href="/splash/splash-1179x2556.png"
          media="(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/splash-1206x2622.png"
          media="(device-width: 402px) and (device-height: 874px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/splash-1290x2796.png"
          media="(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/splash-1320x2868.png"
          media="(device-width: 440px) and (device-height: 956px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/splash-1170x2532.png"
          media="(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/splash-1284x2778.png"
          media="(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/splash-1125x2436.png"
          media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/splash-1242x2688.png"
          media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/splash-828x1792.png"
          media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/splash-750x1334.png"
          media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
        />
      </head>
      <body className="bg-bg text-ink font-sans flex min-h-dvh flex-col">
        {children}
      </body>
    </html>
  );
}

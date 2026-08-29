import type { Metadata, Viewport } from "next";

import { TabBar } from "@/components/TabBar";

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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="bg-bg text-ink font-sans flex min-h-dvh flex-col">
        <main className="px-gutter pt-safe flex-1">{children}</main>
        <TabBar />
      </body>
    </html>
  );
}

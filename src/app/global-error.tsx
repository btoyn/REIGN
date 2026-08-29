"use client";

import { useEffect } from "react";

/**
 * Last-resort error screen.
 *
 * If the root layout itself fails, Next.js replaces the whole document — the
 * app's stylesheet included — so this is the one remaining path that could
 * show white. It renders its own document with the REIGN colours inlined,
 * since it cannot rely on globals.css being applied.
 *
 * Colours are the spec tokens: bg #0A0A0A, textPrimary #F4F1EA,
 * textSecondary #A7A39A, surface #141414, border #292929.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          background: "#0A0A0A",
          color: "#F4F1EA",
          colorScheme: "dark",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          padding: "20px",
        }}
      >
        <p
          style={{
            fontSize: 13,
            lineHeight: "16px",
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "#A7A39A",
            paddingTop: 24,
          }}
        >
          Something broke
        </p>
        <h2
          style={{
            fontSize: 28,
            lineHeight: "34px",
            fontWeight: 700,
            margin: "12px 0 0",
          }}
        >
          REIGN could not start
        </h2>
        <p
          style={{
            fontSize: 15,
            lineHeight: "20px",
            color: "#A7A39A",
            margin: "8px 0 0",
          }}
        >
          Nothing was lost. Try again.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            marginTop: 32,
            height: 56,
            width: "100%",
            borderRadius: 12,
            border: "1px solid #292929",
            background: "#141414",
            color: "#F4F1EA",
            fontSize: 15,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}

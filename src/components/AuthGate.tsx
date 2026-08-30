"use client";

import { useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";

import { Wordmark } from "@/components/Wordmark";
import { getSupabase } from "@/lib/supabase";

/**
 * Keeps the signed-in screens behind an account.
 *
 * There are three states here, all of them real, per CLAUDE.md's rule that
 * every screen handles loading, empty and error:
 *
 *   checking  — the stored session is being read. Brief, but it exists, and
 *               showing the app during it would flash content at a signed-out
 *               visitor.
 *   signed in — render the screen.
 *   signed out — send them to sign in.
 *
 * The database enforces this too. This gate is about not showing an empty
 * shell to someone who cannot load anything into it; it is not the security
 * boundary. Row level security is.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<"checking" | "in" | "out">("checking");

  useEffect(() => {
    let active = true;

    const client = getSupabase();

    client.auth.getSession().then(({ data }) => {
      if (!active) return;
      setState(data.session ? "in" : "out");
    });

    // Keeps the app honest if the session ends in another tab, or expires.
    const { data: listener } = client.auth.onAuthStateChange(
      (_event, session) => {
        if (!active) return;
        setState(session ? "in" : "out");
      },
    );

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (state === "out") router.replace("/sign-in");
  }, [state, router]);

  if (state !== "in") {
    /*
      Opening, not broken.

      This used to be an empty page, which on a slow connection is
      indistinguishable from an app that failed. The wordmark is the one thing
      that is true before anything has loaded, and it is centred rather than in
      the corner so this reads as the app opening rather than a screen that
      lost its content. No spinner: it would flash for a few milliseconds and
      read as jitter.
    */
    return (
      <main
        className="px-gutter pt-safe flex flex-1 items-center justify-center"
        aria-busy="true"
        aria-label="Opening REIGN"
      >
        <Wordmark />
      </main>
    );
  }

  return <>{children}</>;
}

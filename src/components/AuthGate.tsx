"use client";

import { useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

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

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setState(data.session ? "in" : "out");
    });

    // Keeps the app honest if the session ends in another tab, or expires.
    const { data: listener } = supabase.auth.onAuthStateChange(
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
    // Deliberately bare. A spinner here would flash for a few milliseconds and
    // read as jitter rather than progress.
    return <main className="px-gutter pt-safe flex-1" aria-busy="true" />;
  }

  return <>{children}</>;
}

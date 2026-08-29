"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { supabase } from "@/lib/supabase";

/**
 * Sign out.
 *
 * Not gold: gold marks the action a screen exists for, and this screen does
 * not exist to sign you out.
 */
export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onClick() {
    setBusy(true);
    await supabase.auth.signOut();
    router.replace("/sign-in");
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="text-button bg-surface text-ink border-border mt-8 h-14 w-full rounded-md border uppercase disabled:opacity-60"
    >
      {busy ? "Signing out" : "Sign out"}
    </button>
  );
}

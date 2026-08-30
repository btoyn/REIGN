"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { secondaryAction } from "@/components/controls";
import { getSupabase } from "@/lib/supabase";

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
    await getSupabase().auth.signOut();
    router.replace("/sign-in");
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={secondaryAction}
    >
      {busy ? "Signing out" : "Sign out"}
    </button>
  );
}

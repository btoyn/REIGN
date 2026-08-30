"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { Wordmark } from "@/components/Wordmark";
import { primaryAction } from "@/components/controls";
import { getSupabase } from "@/lib/supabase";

/**
 * Sign in.
 *
 * One account, the owner's. Public sign-ups are turned off in Supabase, so
 * there is no "create account" path here by design, and no password reset
 * either until it is asked for.
 */
export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Someone already signed in has no business on this screen.
  useEffect(() => {
    getSupabase()
      .auth.getSession()
      .then(({ data }) => {
        if (data.session) router.replace("/");
      });
  }, [router]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const { error: signInError } = await getSupabase().auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      // Supabase's own wording is vague on purpose, so it is not repeated.
      setError("That email and password did not match.");
      setBusy(false);
      return;
    }

    router.replace("/");
  }

  return (
    <main className="px-gutter pt-safe flex flex-1 flex-col">
      <header className="pt-6">
        <Wordmark />
      </header>

      <h1 className="text-title text-muted pt-6 uppercase">Sign in</h1>

      <form onSubmit={onSubmit} className="mt-3">
        <label
          htmlFor="email"
          className="text-label text-muted block uppercase"
        >
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          inputMode="email"
          autoCapitalize="none"
          required
          className="bg-surface text-ink border-border mt-2 h-14 w-full rounded-md border px-4 text-base outline-none focus:border-muted"
        />

        <label
          htmlFor="password"
          className="text-label text-muted mt-5 block uppercase"
        >
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
          className="bg-surface text-ink border-border mt-2 h-14 w-full rounded-md border px-4 text-base outline-none focus:border-muted"
        />

        {/*
          The spec defines no error colour, and CLAUDE.md forbids inventing one,
          so the message uses warm white against the muted labels around it.
        */}
        {error ? (
          <p role="alert" className="text-body text-ink mt-5">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={busy}
          className={`${primaryAction} mt-8`}
        >
          {busy ? "Signing in" : "Sign in"}
        </button>
      </form>
    </main>
  );
}

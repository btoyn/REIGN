import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * The Supabase connection.
 *
 * Both values below are public by design. They are sent to every browser that
 * opens REIGN, so they are not secrets. What protects the data is row level
 * security in the database, not the secrecy of this key: the exercise library
 * is readable by anyone, and everything that is actually a training record
 * requires a signed-in account.
 *
 * The service role key and the database password must never appear in this
 * repository. They bypass row level security entirely.
 *
 * The client is created on first use rather than when this file is imported.
 * That matters: importing it is not the same as needing it. Next.js evaluates
 * these modules while prerendering pages at build time, so a version that
 * checked its configuration at import time turned a missing setting into a
 * failed build with no preview to look at, rather than a clear message on the
 * one screen that needed the connection.
 */

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    // Still deliberate, but now it happens where the connection is actually
    // wanted, so the error boundary can show it instead of the build dying.
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and " +
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. See .env.example.",
    );
  }

  client = createClient(url, publishableKey);
  return client;
}

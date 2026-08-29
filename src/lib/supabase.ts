import { createClient } from "@supabase/supabase-js";

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
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !publishableKey) {
  // Failing here is deliberate. A missing value would otherwise surface much
  // later as a confusing network error against an undefined address.
  throw new Error(
    "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and " +
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. See .env.example.",
  );
}

export const supabase = createClient(url, publishableKey);

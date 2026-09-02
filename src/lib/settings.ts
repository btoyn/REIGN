import { DEFAULT_SHORTCUT_NAME } from "@/lib/health";
import { getSupabase } from "@/lib/supabase";

/**
 * The one row of settings there is.
 *
 * There is one owner, so there is one set of settings, and the schema enforces
 * that rather than trusting it: the primary key is a boolean that must be true,
 * which makes a second row impossible.
 *
 * Held in Supabase rather than in the browser. localStorage would be per device
 * and would vanish with the site data, and CLAUDE.md's rule is direct reads and
 * writes with no offline layer.
 */

export type Settings = {
  /** What the Apple Health Shortcut is called on the owner's phone. */
  health_shortcut_name: string;
};

const COLUMNS = "health_shortcut_name";

/**
 * The settings, or the defaults.
 *
 * Never throws. Every caller of this is a screen that works without it: the
 * export card falls back to the default Shortcut name, which is the name the
 * owner will have used unless they deliberately chose another. Failing the
 * whole card because a settings read timed out would be losing the session
 * over the label on a button.
 */
export async function fetchSettings(): Promise<Settings> {
  try {
    const { data, error } = await getSupabase()
      .from("app_settings")
      .select(COLUMNS)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data ?? { health_shortcut_name: DEFAULT_SHORTCUT_NAME };
  } catch (e) {
    console.error("could not read the settings", e);
    return { health_shortcut_name: DEFAULT_SHORTCUT_NAME };
  }
}

/**
 * Rename the Shortcut this app calls.
 *
 * Upsert rather than update, because the row is created by the migration but a
 * database restored from before it would have none, and a setting that silently
 * fails to save is worse than one that was never offered.
 */
export async function saveShortcutName(name: string): Promise<void> {
  const trimmed = name.trim();
  if (trimmed.length === 0) throw new Error("The Shortcut needs a name.");

  const { error } = await getSupabase()
    .from("app_settings")
    .upsert({ id: true, health_shortcut_name: trimmed });

  if (error) throw new Error(error.message);
}

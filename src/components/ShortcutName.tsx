"use client";

import { useEffect, useState } from "react";

import { quiet, secondaryAction } from "@/components/controls";
import { DEFAULT_SHORTCUT_NAME } from "@/lib/health";
import { fetchSettings, saveShortcutName } from "@/lib/settings";

/**
 * What the Apple Health Shortcut is called.
 *
 * REIGN opens the Shortcut by name, because that is the only handle iOS gives.
 * Get the name wrong and the link does nothing at all — and it does nothing
 * silently, since iOS reports nothing back to a web page. So the one thing that
 * can break the export is a name only the owner knows, which is why it is
 * settable.
 *
 * It defaults to LogREIGN and almost certainly never changes. It is a line of
 * text and a Save, not a settings screen.
 */

type State =
  | { status: "loading" }
  | { status: "ready"; name: string }
  | { status: "editing"; name: string; saving: boolean; failed: boolean };

export function ShortcutName() {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let active = true;
    // Never throws: falls back to the default, which is the name the owner will
    // have used unless they deliberately chose another.
    fetchSettings().then((settings) => {
      if (active)
        setState({ status: "ready", name: settings.health_shortcut_name });
    });
    return () => {
      active = false;
    };
  }, []);

  async function save(name: string) {
    setState({ status: "editing", name, saving: true, failed: false });
    try {
      await saveShortcutName(name);
      setState({ status: "ready", name: name.trim() });
    } catch (e) {
      console.error("could not save the shortcut name", e);
      setState({ status: "editing", name, saving: false, failed: true });
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-label text-muted uppercase">Apple Health shortcut</p>

      {state.status === "loading" ? (
        <p className="text-body text-muted" aria-busy="true">
          Reading…
        </p>
      ) : state.status === "ready" ? (
        <>
          <p className="text-lead text-ink">{state.name}</p>
          <p className="text-body text-muted">
            The name of the shortcut on your phone. REIGN opens it by name, so
            if you called it something else, say so here.
          </p>
          <button
            type="button"
            onClick={() =>
              setState({
                status: "editing",
                name: state.name,
                saving: false,
                failed: false,
              })
            }
            className={`${quiet} self-start`}
          >
            Change the name
          </button>
        </>
      ) : (
        <>
          <input
            type="text"
            value={state.name}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            onChange={(e) =>
              setState({ ...state, name: e.target.value, failed: false })
            }
            aria-label="Shortcut name"
            className="text-lead text-ink border-border bg-surface h-14 w-full rounded-md border px-4"
          />
          {state.failed ? (
            <p role="alert" className="text-body text-ink">
              Could not save that. Check your connection and try again.
            </p>
          ) : null}
          <button
            type="button"
            disabled={state.saving || state.name.trim().length === 0}
            onClick={() => save(state.name)}
            className={secondaryAction}
          >
            {state.saving ? "Saving" : "Save"}
          </button>
          <button
            type="button"
            disabled={state.saving}
            onClick={() => save(DEFAULT_SHORTCUT_NAME)}
            className={`${quiet} self-start`}
          >
            Use the default, {DEFAULT_SHORTCUT_NAME}
          </button>
        </>
      )}
    </div>
  );
}

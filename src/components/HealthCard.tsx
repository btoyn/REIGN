"use client";

import { useEffect, useState } from "react";

import { primaryAction, quiet } from "@/components/controls";
import {
  HealthSession,
  isTooShort,
  readableLines,
  readableText,
  shortcutLink,
} from "@/lib/health";
import { fetchSettings } from "@/lib/settings";

/**
 * Sending a finished session to Apple Health.
 *
 * REIGN cannot write to Health. HealthKit is native and no browser API reaches
 * it. What it can do is open a Shortcut the owner built on their own phone, and
 * that Shortcut writes the session.
 *
 * WHICH MEANS THE APP NEVER LEARNS WHETHER IT WORKED. iOS opens the link and
 * says nothing afterwards — no callback, no error. A Shortcut that does not
 * exist fails exactly as silently as one that succeeded. Every decision in this
 * component follows from that:
 *
 *   * The card does not go away when the button is tapped. There is no "done"
 *     to move on from, and a card that dismissed itself would be claiming
 *     something it cannot know.
 *   * The same details sit underneath in words, always, never behind a toggle.
 *     The moment they are needed is the moment the button appeared to do
 *     nothing, and a fallback hidden behind "show details" is not there then.
 *   * Whether it arrived is recorded only when the owner says so.
 *
 * The card is not the screen's dominant action. Finishing the workout was. So
 * the button here is gold only where nothing else competes — which on both
 * screens that use it is true, because both are screens whose work is done.
 */

export function HealthCard({
  session,
  sent,
  onMarkSent,
  unavailable = "This one was recorded before REIGN tracked start and finish times, so there is nothing to send.",
}: {
  session: HealthSession | null;
  /** Whether the owner has said this reached Health. */
  sent: boolean;
  onMarkSent: (sent: boolean) => void | Promise<void>;
  /**
   * Why there is nothing to send, when session is null.
   *
   * The caller knows and the card does not. A ride from before the export
   * existed and a run that the Shortcut has no word for are both unsendable
   * for completely different reasons, and one message covering both would be
   * wrong about one of them.
   */
  unavailable?: string;
}) {
  const [shortcut, setShortcut] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    // Never throws; falls back to the default name, which is the one the owner
    // will have used unless they deliberately chose another.
    fetchSettings().then((settings) => {
      if (active) setShortcut(settings.health_shortcut_name);
    });
    return () => {
      active = false;
    };
  }, []);

  /*
    A session with no recorded instants, which is every workout and every ride
    from before this existed. There is nothing truthful to send, and the honest
    thing is to say so rather than to invent a start time.
  */
  if (session === null) {
    return (
      <Frame>
        <p className="text-body text-muted">{unavailable}</p>
      </Frame>
    );
  }

  // A workout started and finished by mistake. A nought-minute entry in Health
  // is a wrong record to find and delete later rather than a record of
  // anything, which is the same argument as not writing calories.
  if (isTooShort(session)) {
    return (
      <Frame>
        <p className="text-body text-muted">
          Under a minute long. There is nothing here worth sending to Health.
        </p>
      </Frame>
    );
  }

  const lines = readableLines(session);

  async function toggle() {
    setBusy(true);
    try {
      await onMarkSent(!sent);
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(readableText(session!));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      // A clipboard that refuses is not a failure worth a screen state: the
      // text is already on screen to be read from.
      console.error("could not copy the session", e);
    }
  }

  return (
    <Frame>
      {/*
        An anchor, not a button with a handler. shortcuts:// is not a page and
        not something fetch can follow; a link is what hands a scheme to iOS,
        and it is also what lets the owner tell nothing happened, because a
        link that opens nothing leaves the screen exactly as it was.

        Held back until the Shortcut's name has been read, so the first tap
        cannot call the wrong one.
      */}
      {shortcut === null ? (
        <span className={`${primaryAction} opacity-60`} aria-busy="true">
          Send to Apple Health
        </span>
      ) : (
        <a href={shortcutLink(session, shortcut)} className={primaryAction}>
          Send to Apple Health
        </a>
      )}

      <p className="text-body text-muted">
        Opens the {shortcut ?? "Health"} shortcut. Then open the Peloton app:
        Peloton only imports from Apple Health while its app is open.
      </p>

      {/*
        The fallback. Always here, never behind a toggle, because the tap that
        needs it is the tap that appeared to do nothing.
      */}
      <div className="border-border flex flex-col gap-2 border-t pt-4">
        <p className="text-label text-muted uppercase">Or enter it by hand</p>
        <dl className="flex flex-col gap-1">
          {lines.map(([label, value]) => (
            <div
              key={label}
              className="flex items-baseline justify-between gap-4"
            >
              <dt className="text-body text-muted shrink-0">{label}</dt>
              <dd className="text-body text-ink text-right tabular-nums">
                {value}
              </dd>
            </div>
          ))}
        </dl>
        <button
          type="button"
          onClick={copy}
          className={`${quiet} self-start`}
          aria-live="polite"
        >
          {copied ? "Copied" : "Copy these details"}
        </button>
      </div>

      {/*
        Whether it arrived, said by the owner. The app cannot know, so it does
        not guess. Stated in words and by which word is shown, never by colour
        alone.
      */}
      <div className="border-border flex flex-col gap-2 border-t pt-4">
        <p className="text-body text-ink">
          {sent ? "Marked as sent to Health." : "Not marked as sent yet."}
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={toggle}
          className={`${quiet} self-start`}
        >
          {busy
            ? "Saving"
            : sent
              ? "Mark as not sent"
              : "Mark as sent to Health"}
        </button>
      </div>
    </Frame>
  );
}

/**
 * The card's outline.
 *
 * One of the few places in REIGN with a border round it, and it earns it: this
 * is a block about somewhere else. Everything above it on the screen is the
 * session; this is what happens to the session after REIGN is finished with it,
 * and under the strip test it still reads as its own thing because it opens
 * with a label that names it.
 */
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <section className="border-border flex flex-col gap-4 rounded-lg border p-4">
      <p className="text-label text-muted uppercase">Apple Health</p>
      {children}
    </section>
  );
}

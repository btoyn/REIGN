/**
 * Keeping the screen awake during a rest.
 *
 * A phone that sleeps between sets means unlocking it with chalk on your hands
 * to log the next one. The Screen Wake Lock API stops that.
 *
 * It is not available everywhere: Safari has supported it since iOS 16.4, and
 * the lock is dropped whenever the page is hidden, so it has to be re-taken
 * when the app comes back. Everything here degrades to doing nothing, because a
 * rest timer that refuses to run without it would be worse than a sleeping
 * screen.
 */

type Sentinel = { release: () => Promise<void>; released: boolean };

export function wakeLockSupported(): boolean {
  return typeof navigator !== "undefined" && "wakeLock" in navigator;
}

/**
 * Hold the screen awake until the returned function is called.
 *
 * Re-takes the lock when the page becomes visible again, because iOS drops it
 * on every switch away and does not give it back.
 */
export function holdScreenAwake(): () => void {
  if (!wakeLockSupported()) return () => {};

  let sentinel: Sentinel | null = null;
  let stopped = false;

  const take = async () => {
    if (stopped || document.visibilityState !== "visible") return;
    try {
      sentinel = await (
        navigator as Navigator & {
          wakeLock: { request: (t: "screen") => Promise<Sentinel> };
        }
      ).wakeLock.request("screen");
    } catch {
      // Denied, or the battery is too low. Nothing to do and nothing to say:
      // the timer still runs, the screen just sleeps as it normally would.
      sentinel = null;
    }
  };

  const onVisible = () => {
    if (document.visibilityState === "visible") void take();
  };

  void take();
  document.addEventListener("visibilitychange", onVisible);

  return () => {
    stopped = true;
    document.removeEventListener("visibilitychange", onVisible);
    void sentinel?.release().catch(() => {});
    sentinel = null;
  };
}

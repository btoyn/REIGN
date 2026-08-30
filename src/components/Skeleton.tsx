/**
 * A placeholder in the shape of what is coming.
 *
 * Replaces lines like "Loading..." — the shape of these screens is known
 * before the data arrives, so showing it is both faster to read and less
 * jarring than text that is replaced by something of a different size.
 *
 * The pulse is suppressed for anyone who has asked for reduced motion.
 */
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`bg-surface motion-safe:animate-pulse rounded-sm ${className}`}
    />
  );
}

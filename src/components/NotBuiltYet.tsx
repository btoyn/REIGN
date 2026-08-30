import { ScreenTitle } from "@/components/ScreenTitle";

/**
 * A screen that does not exist yet.
 *
 * Program, Progress and You are real tabs with nothing behind them, and an
 * empty screen is indistinguishable from a screen that failed to load. This
 * says which one it is, and what will be here, so the tab reads as deliberate
 * rather than broken.
 */
export function NotBuiltYet({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <ScreenTitle>{title}</ScreenTitle>
      <p className="text-lead text-ink">Not built yet.</p>
      <p className="text-body text-muted">{children}</p>
    </div>
  );
}

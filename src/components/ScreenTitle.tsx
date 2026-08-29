/**
 * The screen title shown at the top of each tab: TODAY, PROGRAM, PROGRESS, YOU.
 *
 * Deliberately restrained per docs/design/REIGN_UI_SPEC.md — strong hierarchy
 * without an oversized decorative heading.
 */
export function ScreenTitle({ children }: { children: string }) {
  return (
    <h1 className="text-title text-muted pt-6 uppercase">{children}</h1>
  );
}

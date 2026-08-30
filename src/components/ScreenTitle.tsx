/**
 * The screen title shown at the top of each tab: TODAY, PROGRAM, PROGRESS, YOU.
 *
 * Deliberately restrained per docs/design/REIGN_UI_SPEC.md — strong hierarchy
 * without an oversized decorative heading.
 *
 * It carries no spacing of its own. The screen around it decides how its parts
 * are grouped, which is the only way the gaps stay meaningful.
 */
export function ScreenTitle({ children }: { children: string }) {
  return <h1 className="text-title text-muted uppercase">{children}</h1>;
}

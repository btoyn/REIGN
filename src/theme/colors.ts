/**
 * REIGN color tokens.
 *
 * Source of truth: docs/design/REIGN_UI_SPEC.md ("Color System").
 * REIGN is dark-only in V1 — there is no light palette and no color-scheme
 * switching. Do not add colors without approval.
 */
export const colors = {
  /** App background. */
  bg: '#0A0A0A',
  /** Charcoal surface for grouped content. */
  surface: '#141414',
  /** Slightly lifted surface. */
  surfaceRaised: '#1C1C1C',
  /** Warm white, primary text. */
  textPrimary: '#F4F1EA',
  /** Muted warm grey, secondary text that should visually recede. */
  textSecondary: '#A7A39A',
  /** Hairline dividers and card borders. */
  border: '#292929',
  /** Muted gold. Accent only — never a large background treatment. */
  accent: '#C6A15B',
  /** Pressed state for gold surfaces. */
  accentPressed: '#AE8948',
} as const;

export type ColorToken = keyof typeof colors;

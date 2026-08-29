/**
 * 4-point spacing scale.
 *
 * Source of truth: docs/design/REIGN_UI_SPEC.md ("Spacing").
 */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
} as const;

/** Default horizontal screen gutter (spec: approximately 20-24pt). */
export const screenGutter = spacing.lg;

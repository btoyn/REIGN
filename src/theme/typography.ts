import { TextStyle } from 'react-native';

import { colors } from './colors';

/**
 * Type scale.
 *
 * Source of truth: docs/design/REIGN_UI_SPEC.md ("Typography").
 * Native iOS system font for V1 — no custom font, no expo-font loading.
 * Leaving `fontFamily` unset lets React Native use the platform system face.
 */
export const typography = {
  /** Large metrics. Used sparingly. */
  display: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  /** Screen titles: TODAY, PROGRAM, PROGRESS, YOU. */
  screenTitle: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '600',
    letterSpacing: 1.6,
    color: colors.textSecondary,
  },
  /** Small uppercase section labels above a block of content. */
  sectionLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    letterSpacing: 1.4,
    color: colors.textSecondary,
  },
  /** Primary content: PUSH A, Bigger Leaner Stronger. */
  primary: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  /** A step below primary — named content that is not the hero. */
  primarySmall: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  /** Secondary content: Week 6 · Day 4, Yesterday · 49 min. Recedes. */
  secondary: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '400',
    color: colors.textSecondary,
  },
  /** Primary CTA label. Uppercase is acceptable here per spec. */
  button: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
} satisfies Record<string, TextStyle>;

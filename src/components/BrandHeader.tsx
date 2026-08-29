import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '@/theme';

/**
 * Formats the live device date for display, e.g. "Friday, August 29".
 *
 * Display-only. Nothing downstream reads this value — all workout, program
 * and cardio content is static mock data.
 */
function formatToday(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Today screen top area: restrained REIGN wordmark treatment over the date.
 *
 * The approved graphic wordmark under assets/brand/ is opaque with a baked-in
 * near-black background, so it cannot sit cleanly on the app background yet.
 * This is a text stand-in pending a transparent export — it is deliberately
 * not an attempt to reproduce the graphic mark.
 */
export function BrandHeader() {
  return (
    <View style={styles.root}>
      <Text style={styles.wordmark}>REIGN</Text>
      <Text style={styles.date}>{formatToday(new Date())}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  wordmark: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '700',
    letterSpacing: 6,
    color: colors.textPrimary,
  },
  date: {
    ...typography.secondary,
    marginTop: spacing.sm,
  },
});

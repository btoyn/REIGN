import { StyleSheet, Text, View } from 'react-native';

import { BrandHeader } from '@/components/BrandHeader';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenContainer } from '@/components/ScreenContainer';
import { SectionLabel } from '@/components/SectionLabel';
import { cardio, lastWorkout, todayWorkout } from '@/data/today';
import { colors, radius, spacing, typography } from '@/theme';

/**
 * Today.
 *
 * Answers one question: what am I doing today? Hierarchy and copy follow
 * docs/design/REIGN_UI_SPEC.md ("Today Screen") exactly — the primary workout
 * sits in a single surface card, and the secondary sections stay flat and
 * divided by hairlines rather than becoming cards of their own.
 */
export function TodayScreen() {
  return (
    <ScreenContainer>
      <BrandHeader />

      <SectionLabel>Today</SectionLabel>
      <View style={styles.hero}>
        <Text style={styles.workoutName}>{todayWorkout.name}</Text>
        <Text style={styles.program}>{todayWorkout.program}</Text>
        <Text style={styles.meta}>{todayWorkout.schedule}</Text>
        <Text style={styles.meta}>{todayWorkout.summary}</Text>
      </View>

      <View style={styles.cta}>
        <PrimaryButton label="START WORKOUT" />
      </View>

      <View style={styles.divider} />

      <View style={styles.section}>
        <SectionLabel>Last Workout</SectionLabel>
        <Text style={styles.rowTitle}>{lastWorkout.name}</Text>
        <Text style={styles.meta}>{lastWorkout.detail}</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.section}>
        <SectionLabel>Cardio</SectionLabel>
        <Text style={styles.rowTitle}>{cardio.source}</Text>
        <Text style={styles.meta}>{cardio.detail}</Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hero: {
    marginTop: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  workoutName: {
    ...typography.primary,
  },
  program: {
    ...typography.primarySmall,
    marginTop: spacing.xs,
  },
  meta: {
    ...typography.secondary,
    marginTop: spacing.xs,
  },
  cta: {
    marginTop: spacing.lg,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginTop: spacing.xl,
  },
  section: {
    marginTop: spacing.xl,
  },
  rowTitle: {
    ...typography.primarySmall,
    marginTop: spacing.sm,
  },
});

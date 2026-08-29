import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, radius, typography } from '@/theme';

type Props = {
  label: string;
  onPress?: () => void;
};

/**
 * Full-width gold CTA. Large tap target for use mid-workout.
 *
 * Milestone 1 has no workout state, so `onPress` is optional and unwired.
 */
export function PrimaryButton({ label, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: pressed ? colors.accentPressed : colors.accent },
      ]}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 54,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...typography.button,
    color: colors.bg,
  },
});

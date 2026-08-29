import { StyleSheet, Text, View } from 'react-native';

import { spacing, typography } from '@/theme';

import { ScreenContainer } from './ScreenContainer';

type Props = {
  title: string;
};

/**
 * Titled empty screen for the tabs that are not part of Milestone 1.
 *
 * Intentionally carries no content — Program, Progress and You are specified
 * but not yet built.
 */
export function PlaceholderScreen({ title }: Props) {
  return (
    <ScreenContainer>
      <View style={styles.root}>
        <Text style={styles.title}>{title.toUpperCase()}</Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingTop: spacing.base,
  },
  title: typography.screenTitle,
});

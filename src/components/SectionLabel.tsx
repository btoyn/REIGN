import { StyleSheet, Text } from 'react-native';

import { typography } from '@/theme';

type Props = {
  children: string;
};

/** Small uppercase label introducing a section: TODAY, LAST WORKOUT, CARDIO. */
export function SectionLabel({ children }: Props) {
  return <Text style={styles.label}>{children.toUpperCase()}</Text>;
}

const styles = StyleSheet.create({
  label: typography.sectionLabel,
});

import { StyleSheet, Text } from 'react-native';

import { colors, fonts } from '@dead-lines-inc/frontend';

import { Screen, UNDER_HEADER } from '../layout/Screen';
import { useTexts } from '../localization/texts';

interface PlaceholderScreenProps {
  title: string;
  description: string;
}

export function PlaceholderScreen({ title, description }: PlaceholderScreenProps) {
  return (
    <Screen style={styles.container} safeArea={UNDER_HEADER}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </Screen>
  );
}

// Binds a MobileTexts.screens entry into a zero-prop component so it can be
// handed straight to Stack.Screen's `component` without an inline arrow
// function.
export function createPlaceholderScreen(screen: 'archive' | 'dailyTasks') {
  return function BoundPlaceholderScreen() {
    const { title, description } = useTexts('screens')[screen];
    return <PlaceholderScreen title={title} description={description} />;
  };
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  title: {
    fontFamily: fonts.headingBold,
    fontSize: 18,
    color: colors.textPrimary,
  },
  description: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

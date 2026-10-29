import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import { fonts } from '@dead-lines-inc/frontend';

import { Screen } from '../layout/Screen';

interface LoadingScreenProps {
  error?: string | null;
}

export function LoadingScreen({ error }: LoadingScreenProps) {
  return (
    <Screen style={styles.container}>
      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <ActivityIndicator size="large" style={styles.spinner} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  spinner: {
    marginTop: 24,
  },
  error: {
    fontFamily: fonts.regular,
    marginTop: 24,
    fontSize: 16,
    color: '#c00',
    textAlign: 'center',
  },
});

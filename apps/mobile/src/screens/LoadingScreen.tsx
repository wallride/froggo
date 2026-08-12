import { ActivityIndicator, SafeAreaView, StyleSheet, Text } from 'react-native';

interface LoadingScreenProps {
  error?: string | null;
}

export function LoadingScreen({ error }: LoadingScreenProps) {
  return (
    <SafeAreaView style={styles.container}>
      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <ActivityIndicator size="large" style={styles.spinner} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  spinner: {
    marginTop: 24,
  },
  error: {
    marginTop: 24,
    fontSize: 16,
    color: '#c00',
    textAlign: 'center',
  },
});

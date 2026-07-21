import { SafeAreaView, StyleSheet, Text } from 'react-native';

export function HomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>🐸 Froggo</Text>
      <Text style={styles.subtitle}>
        Workspace is ready.
      </Text>
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
  title: {
    fontSize: 36,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 16,
    fontSize: 18,
  },
});

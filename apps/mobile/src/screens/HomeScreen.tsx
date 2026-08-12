import { SafeAreaView, StyleSheet, Text } from 'react-native';

import { usePlayer } from '../identity/player-context';

export function HomeScreen() {
  const { player } = usePlayer();

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>🐸 Froggo</Text>
      {player && <Text style={styles.subtitle}>Welcome, {player.name}, {player.id}!</Text>}
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

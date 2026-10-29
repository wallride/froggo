import { useEffect, useState } from 'react';
import { usePreventRemove } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '@dead-lines-inc/frontend';

import type { RootStackParamList } from '../app/Navigation';
import { showPenaltyAd } from '../ads/penaltyAd';
import { useConfiguration } from '../configuration/configuration-context';
import { Screen } from '../layout/Screen';
import { useTexts } from '../localization/texts';

type Props = NativeStackScreenProps<RootStackParamList, 'Penalty'>;

// The price of a play with mistakes: an ad to sit through, then on to the
// leaderboard as usual. There's no leaving it before the ad is over.
export function PenaltyScreen({ navigation, route }: Props) {
  const texts = useTexts('penalty');
  const { ads } = useConfiguration();
  const [isOver, setIsOver] = useState(false);

  // Hardware back, header back and the like are all held off until then.
  usePreventRemove(!isOver, () => {});

  useEffect(() => {
    let cancelled = false;
    showPenaltyAd(ads).finally(() => {
      if (!cancelled) setIsOver(true);
    });
    return () => {
      cancelled = true;
    };
    // Shown once, on arrival — a configuration reload mustn't show another.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Only once the screen may be left — replacing it is a removal too.
  useEffect(() => {
    if (isOver) navigation.replace('Leaderboard', route.params);
  }, [isOver, navigation, route.params]);

  return (
    <Screen style={styles.container}>
      <Image
        source={require('../../assets/images/death.png')}
        style={styles.death}
        resizeMode="contain"
      />
      <Text style={styles.title}>{texts.title}</Text>
      <Text style={styles.description}>{texts.description}</Text>
      <ActivityIndicator color={colors.textSecondary} style={styles.spinner} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  death: {
    width: 90,
    height: 90 * (1277 / 840),
    marginBottom: 12,
  },
  title: {
    fontFamily: fonts.headingBold,
    fontSize: 20,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  description: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  spinner: {
    marginTop: 16,
  },
});

import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '@dead-lines-inc/frontend';

import { useLanguage } from '../configuration/configuration-context';
import { Screen, UNDER_HEADER } from '../layout/Screen';
import { useTexts } from '../localization/texts';

export function SettingsScreen() {
  const texts = useTexts('screens').settings;
  const errorTexts = useTexts('errors');
  const { language, languages, changeLanguage } = useLanguage();
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  const select = async (code: string) => {
    if (pending || code === language) return;
    setPending(true);
    setFailed(false);
    try {
      await changeLanguage(code);
    } catch {
      setFailed(true);
    } finally {
      setPending(false);
    }
  };

  return (
    <Screen style={styles.container} safeArea={UNDER_HEADER}>
      <Text style={styles.heading}>{texts.languageHeading}</Text>
      <View style={styles.options}>
        {languages.map((option) => {
          const selected = option.code === language;
          return (
            <Pressable
              key={option.code}
              style={[styles.option, selected && styles.optionSelected]}
              disabled={pending}
              onPress={() => select(option.code)}
            >
              <Text style={styles.optionName}>{option.name}</Text>
              {selected && (
                <Ionicons name="checkmark" size={18} color={colors.accentQuota} />
              )}
            </Pressable>
          );
        })}
      </View>
      {failed && <Text style={styles.error}>{errorTexts.changeLanguage}</Text>}
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  heading: {
    fontFamily: fonts.headingBold,
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 10,
  },
  options: {
    gap: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  optionSelected: {
    borderColor: colors.accentQuota,
  },
  optionName: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.textPrimary,
  },
  error: {
    fontFamily: fonts.regular,
    marginTop: 12,
    fontSize: 13,
    color: '#c00',
  },
});

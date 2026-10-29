import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { colors, fonts } from '@dead-lines-inc/frontend';

interface OnboardingButtonProps {
  title: string;
  onPress: () => void;
  // Disabled, with a spinner in place of the title.
  pending?: boolean;
  // Filled for the main step forward; outlined (green on the screens' dark
  // background colour) for a lesser one, like going through the tutorial's
  // steps. The same size.
  variant?: 'filled' | 'outline';
}

export function OnboardingButton({
  title,
  onPress,
  pending = false,
  variant = 'filled',
}: OnboardingButtonProps) {
  const outline = variant === 'outline';
  return (
    <Pressable
      style={[styles.button, outline && styles.buttonOutline]}
      disabled={pending}
      onPress={onPress}
    >
      {pending ? (
        <ActivityIndicator color={outline ? colors.accentQuota : colors.background} />
      ) : (
        <Text style={[styles.title, outline && styles.titleOutline]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: 'stretch',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 52,
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: colors.accentQuota,
  },
  buttonOutline: {
    // The thicker border takes the padding's place, so the height stays.
    paddingVertical: 13,
    borderWidth: 2,
    borderColor: colors.accentQuota,
    backgroundColor: colors.background,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 25,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.background,
  },
  titleOutline: {
    color: colors.accentQuota,
  },
});

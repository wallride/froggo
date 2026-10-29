import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { Image } from 'expo-image';

import { colors, fonts } from '@dead-lines-inc/frontend';

import { useAvatarUrl } from '../assets/avatars';

interface PlayerAvatarProps {
  avatarId: string;
  name: string;
  size: number;
  style?: StyleProp<ViewStyle>;
}

// The avatar image, downloaded from the API once and then taken from the
// disk cache. The name's first letter stands in until it's there — and for
// good if it can't be loaded or the avatar is unknown.
export function PlayerAvatar({ avatarId, name, size, style }: PlayerAvatarProps) {
  const url = useAvatarUrl(avatarId);
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);

  return (
    <View
      style={[
        styles.frame,
        { width: size, height: size, borderRadius: size * 0.28 },
        style,
      ]}
    >
      {loadedUrl !== url && (
        <Text style={[styles.initial, { fontSize: size * 0.42 }]}>
          {name.charAt(0).toUpperCase()}
        </Text>
      )}
      {url && (
        <Image
          source={url}
          style={styles.image}
          contentFit="cover"
          cachePolicy="disk"
          transition={150}
          onLoad={() => setLoadedUrl(url)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: 'hidden',
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  initial: {
    fontFamily: fonts.bold,
    color: colors.textPrimary,
  },
});

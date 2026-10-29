import { useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AvatarRarityEnum, PLAYER_NAME_MAX_LENGTH, playerNameSchema } from '@dead-lines-inc/common.models';
import { colors, fonts } from '@dead-lines-inc/frontend';

import { PlayerAvatar } from '../components/PlayerAvatar';
import { useConfiguration } from '../configuration/configuration-context';
import { usePlayer } from '../identity/player-context';
import { Screen, UNDER_HEADER } from '../layout/Screen';
import { useTexts } from '../localization/texts';

const CURRENT_AVATAR_SIZE = 72;
const AVATAR_SIZE = 64;
const UNAVAILABLE_AVATAR_OPACITY = 0.3;

// The player's own settings: their name and avatar. The player stays on top
// while the avatars, grouped by rarity, scroll beneath. Avatars the player
// hasn't unlocked are shown dimmed and can't be selected.
export function ProfileScreen() {
  const { player, avatars, setAvatar, setName } = usePlayer();
  const { avatars: allAvatars } = useConfiguration();
  const texts = useTexts('screens').profile;
  const errorTexts = useTexts('errors');

  const [nameDraft, setNameDraft] = useState(player?.name ?? '');
  const [pending, setPending] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (player) setNameDraft(player.name);
  }, [player?.name]);

  const groups = useMemo(
    () =>
      Object.values(AvatarRarityEnum)
        .map((rarity) => ({
          rarity,
          avatars: allAvatars.filter((avatar) => avatar.rarity === rarity),
        }))
        .filter((group) => group.avatars.length > 0),
    [allAvatars],
  );

  if (!player) return null;

  const availableIds = new Set(avatars?.avatarIds ?? []);

  // The name to save, or null while the draft is invalid or unchanged.
  const parsedName = playerNameSchema.safeParse(nameDraft);
  const newName =
    parsedName.success && parsedName.data !== player.name ? parsedName.data : null;
  const canSaveName = newName !== null && !savingName;

  const saveName = async () => {
    if (!canSaveName) return;
    setSavingName(true);
    setError(null);
    try {
      await setName(newName);
    } catch {
      setError(errorTexts.setPlayerName);
    } finally {
      setSavingName(false);
    }
  };

  const selectAvatar = async (avatarId: string) => {
    if (pending || avatarId === player.avatarId) return;
    setPending(true);
    setError(null);
    try {
      await setAvatar(avatarId);
    } catch {
      setError(errorTexts.setPlayerAvatar);
    } finally {
      setPending(false);
    }
  };

  return (
    <Screen safeArea={UNDER_HEADER}>
      <View style={styles.header}>
        <View style={styles.identity}>
          <PlayerAvatar
            avatarId={player.avatarId}
            name={player.name}
            size={CURRENT_AVATAR_SIZE}
            style={styles.currentAvatar}
          />
          <TextInput
            style={styles.nameInput}
            value={nameDraft}
            onChangeText={setNameDraft}
            onSubmitEditing={saveName}
            placeholder={texts.namePlaceholder}
            placeholderTextColor={colors.textMuted}
            maxLength={PLAYER_NAME_MAX_LENGTH}
            autoCorrect={false}
            returnKeyType="done"
          />
          <Pressable
            style={[styles.saveName, !canSaveName && styles.saveNameDisabled]}
            disabled={!canSaveName}
            onPress={saveName}
          >
            <Ionicons
              name="checkmark"
              size={24}
              color={canSaveName ? colors.background : colors.textMuted}
            />
          </Pressable>
        </View>
        {error && <Text style={styles.error}>{error}</Text>}
        <Text style={styles.heading}>{texts.avatarsHeading}</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {groups.map((group) => (
          <View key={group.rarity} style={styles.group}>
            <Text style={styles.rarity}>{texts.rarity[group.rarity]}</Text>
            <View style={styles.avatars}>
              {group.avatars.map((avatar) => {
                const available = availableIds.has(avatar.id);
                return (
                  <Pressable
                    key={avatar.id}
                    disabled={!available || pending}
                    onPress={() => selectAvatar(avatar.id)}
                    style={!available && styles.avatarUnavailable}
                  >
                    <PlayerAvatar
                      avatarId={avatar.id}
                      name={player.name}
                      size={AVATAR_SIZE}
                      style={[
                        styles.avatar,
                        avatar.id === player.avatarId && styles.avatarSelected,
                      ]}
                    />
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  currentAvatar: {
    borderWidth: 2,
    borderColor: colors.accentQuota,
  },
  nameInput: {
    flex: 1,
    // Otherwise the input keeps its intrinsic width (on web) and pushes the
    // row past the screen edge.
    minWidth: 0,
    fontFamily: fonts.headingBold,
    fontSize: 22,
    color: colors.textPrimary,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  saveName: {
    width: 48,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentQuota,
  },
  saveNameDisabled: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  error: {
    fontFamily: fonts.regular,
    marginTop: 12,
    fontSize: 13,
    color: '#c00',
  },
  heading: {
    fontFamily: fonts.headingBold,
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 24,
    marginBottom: 10,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 24,
  },
  group: {
    gap: 10,
  },
  rarity: {
    fontFamily: fonts.headingMedium,
    fontSize: 15,
    color: colors.textPrimary,
  },
  avatars: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  avatar: {
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  avatarSelected: {
    borderWidth: 2,
    borderColor: colors.accentQuota,
  },
  avatarUnavailable: {
    opacity: UNAVAILABLE_AVATAR_OPACITY,
  },
});

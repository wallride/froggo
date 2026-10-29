import { useCallback, useEffect, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Animated,
  AppState,
  Easing,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { GetActiveChallengesResponse, JoinChallengeResponse } from '@dead-lines-inc/common.api.mobile';
import { challenges, PlayTypeEnum } from '@dead-lines-inc/common.models';
import { colors, fonts } from '@dead-lines-inc/frontend';

import type { RootStackParamList } from '../app/Navigation';
import { useApis } from '../api/use-apis';
import { formatText, useTexts } from '../localization/texts';
import { ChallengeResultPopup } from '../components/ChallengeResultPopup';
import { isChallengeOver } from '../components/isChallengeOver';
import { ModeCard } from '../components/ModeCard';
import { PlayerAvatar } from '../components/PlayerAvatar';
import { usePlayer } from '../identity/player-context';
import { useFrameDimensions } from '../layout/app-frame';
import { Screen } from '../layout/Screen';
import { screenBackgrounds } from '../layout/screen-backgrounds';
import { useStartupProgress, useStartupStage } from '../startup/startup-progress';
import { LoadingScreen } from './LoadingScreen';

// Event progress/rank aren't backed by a real API yet — static placeholder
// matching the reference layout until board-event tracking exists.
const PLACEHOLDER_RANK = '#10';

// Proportions to the frame's width, so the screen looks the same on every
// phone: the mode cards start this far from the top of the frame (it's
// phone-shaped, so this never pushes them off-screen), and Death is this
// wide, standing on the cards' top edge and reaching DEATH_OVERLAP under
// them.
const CARDS_TOP_TO_WIDTH = 0.8;
const DEATH_WIDTH_TO_WIDTH = 0.3;
const DEATH_ASPECT = 1277 / 840;
const DEATH_OVERLAP = 20;
// Where Death's skull is in death.png, as shares of its width and height —
// Death's bubble grows out of it.
const DEATH_HEAD_X = 0.56;
const DEATH_HEAD_Y = 0.25;
// deathRow's gap between Death's place and the bubble.
const DEATH_BUBBLE_GAP = 10;
// The bubble appears whenever the screen is opened, this long after it —
// which, the first time, is also after the startup screen has faded away.
const BUBBLE_DELAY_MS = 1000;
const BUBBLE_APPEAR_MS = 800;
// fixedTop's padding at the sides and at the bottom.
const SCREEN_PADDING = 20;
const HERO_BOTTOM_PADDING = 12;

export function HomeScreen() {
  const { player } = usePlayer();
  const { playApi } = useApis();
  const texts = useTexts('home');
  const commonTexts = useTexts('common');
  const deathTexts = useTexts('death');
  const errorTexts = useTexts('errors');
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList, 'Home'>>();

  // Loading procedure, run once the player is identified and again every
  // time the player comes back to the screen (see reloadKey). Currently a
  // single step (load active challenges), structured as a list so more
  // steps can be added later without reshaping this.
  const [activeChallenges, setActiveChallenges] = useState<
    GetActiveChallengesResponse[] | null
  >(null);
  const [loadFailed, setLoadFailed] = useState(false);
  // Bumped whenever the screen is shown again — on focus (including the
  // first one) and when the app returns from the background while it's
  // focused — and the data is loaded anew.
  const [reloadKey, setReloadKey] = useState(0);
  // The finished challenge whose result popup is open.
  const [resultChallenge, setResultChallenge] =
    useState<GetActiveChallengesResponse | null>(null);
  const frame = useFrameDimensions();
  const insets = useSafeAreaInsets();
  // The content starts below the top inset, while the cards' place is
  // counted from the top of the frame.
  const heroHeight = frame.width * CARDS_TOP_TO_WIDTH - insets.top;
  const deathImageWidth = frame.width * DEATH_WIDTH_TO_WIDTH;
  const deathImageHeight = deathImageWidth * DEATH_ASPECT;
  const deathImageTop = heroHeight + DEATH_OVERLAP - deathImageHeight;
  // Death's skull as seen from the bubble's top left corner (the bubble
  // starts at the top of Death's place, past the gap).
  const bubbleOrigin = {
    x: deathImageWidth * DEATH_HEAD_X - deathImageWidth - DEATH_BUBBLE_GAP,
    y: deathImageHeight * DEATH_HEAD_Y,
  };


  useFocusEffect(
    useCallback(() => {
      setReloadKey((key) => key + 1);
      const subscription = AppState.addEventListener('change', (nextAppState) => {
        if (nextAppState === 'active') setReloadKey((key) => key + 1);
      });
      return () => subscription.remove();
    }, []),
  );

  // 0 → 1: the bubble growing out of Death's head and fading in. Played on
  // every opening of the screen, once the app has started (it's under the
  // startup screen till then).
  const { done: started } = useStartupProgress();
  const bubbleAppearance = useRef(new Animated.Value(0)).current;
  useFocusEffect(
    useCallback(() => {
      if (!started) return;
      bubbleAppearance.setValue(0);
      const animation = Animated.timing(bubbleAppearance, {
        toValue: 1,
        duration: BUBBLE_APPEAR_MS,
        delay: BUBBLE_DELAY_MS,
        // A slight overshoot, so the bubble pops into place.
        easing: Easing.out(Easing.back(1.4)),
        useNativeDriver: true,
      });
      animation.start();
      return () => animation.stop();
    }, [started, bubbleAppearance]),
  );

  useEffect(() => {
    // Nothing until the first focus.
    if (!player || reloadKey === 0) return;
    // A newer reload drops the results of the one still in flight.
    let cancelled = false;

    const steps: Array<() => Promise<void>> = [
      async () => {
        const loaded = await playApi.getActiveChallenges();
        if (!cancelled) {
          setActiveChallenges(loaded);
          setLoadFailed(false);
        }
      },
    ];

    (async () => {
      try {
        for (const step of steps) {
          await step();
        }
      } catch {
        if (!cancelled) {
          setLoadFailed(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [player, playApi, reloadKey]);

  const retryLoad = useCallback(() => {
    setLoadFailed(false);
    setReloadKey((key) => key + 1);
  }, []);

  // The first load is the last stage of the app's start.
  useStartupStage(
    'home',
    activeChallenges !== null,
    loadFailed && activeChallenges === null ? errorTexts.loadHome : null,
    retryLoad,
  );

  if (!player || activeChallenges === null) {
    return <LoadingScreen error={loadFailed ? errorTexts.loadHome : null} />;
  }

  // Over: show the result. All boards played: nothing to play until it's
  // over, so the leaderboard it is. Otherwise play on.
  const openChallenge = (challenge: GetActiveChallengesResponse) => {
    if (isChallengeOver(challenge)) {
      setResultChallenge(challenge);
    } else if (challenge.participation?.state === challenges.ParticipationStateEnum.completed) {
      navigation.navigate('Leaderboard', {
        challenge,
        challengeParticipation: challenge.participation,
        fromHome: true,
      });
    } else {
      navigation.navigate('Play', {
        playType: challenge.type,
        challenge,
        challengeParticipation: challenge.participation,
      });
    }
  };

  // The new challenge takes the finished one's place.
  const onChallengeJoined = (joined: JoinChallengeResponse) => {
    setActiveChallenges((current) =>
      current && current.map((challenge) => (challenge.type === joined.type ? joined : challenge)),
    );
    setResultChallenge(null);
  };

  return (
    <Screen
      background={screenBackgrounds.home}
      overlay={
        resultChallenge && (
          <ChallengeResultPopup
            playerId={player.id}
            challenge={resultChallenge}
            onJoined={onChallengeJoined}
            onClose={() => setResultChallenge(null)}
          />
        )
      }
    >
      {/* Before the cards, so they go over Death's feet. */}
      <Image
        source={require('../../assets/images/death.png')}
        style={[
          styles.death,
          { top: deathImageTop, width: deathImageWidth, height: deathImageHeight },
        ]}
        resizeMode="contain"
      />
      <View style={[styles.fixedTop, { height: heroHeight }]}>
        <View>
          <View style={styles.topBar}>
            <Pressable
              style={styles.profile}
              disabled={!player}
              onPress={() => navigation.navigate('Profile')}
            >
              {player ? (
                <PlayerAvatar
                  avatarId={player.avatarId}
                  name={player.name}
                  size={50}
                  style={styles.avatar}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons
                    name="person-outline"
                    size={18}
                    color={colors.textSecondary}
                  />
                </View>
              )}
              <View>
                <Text style={styles.profileName}>{player?.name ?? commonTexts.loading}</Text>
              </View>
            </Pressable>
            <View style={styles.topBarActions}>
              <Pressable style={styles.iconButton}>
                <Ionicons
                  name="ribbon-outline"
                  size={18}
                  color={colors.textSecondary}
                />
              </Pressable>
              <Pressable
                style={styles.iconButton}
                onPress={() => navigation.navigate('Settings')}
              >
                <Ionicons
                  name="settings-outline"
                  size={18}
                  color={colors.textSecondary}
                />
              </Pressable>
            </View>
          </View>

          <View style={styles.header}>
            <Image
              source={require('../../assets/images/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
        </View>

        <View style={styles.deathRow}>
          {/* Death's place, from its top down to the bottom of the row —
              Death itself is drawn under the cards, see above. */}
          <View
            style={{
              width: deathImageWidth,
              height: deathImageHeight - DEATH_OVERLAP - HERO_BOTTOM_PADDING,
            }}
          />
          <Animated.View
            style={[
              styles.deathBubble,
              {
                transformOrigin: `${bubbleOrigin.x}px ${bubbleOrigin.y}px`,
                opacity: bubbleAppearance.interpolate({
                  inputRange: [0, 0.6],
                  outputRange: [0, 1],
                  extrapolate: 'clamp',
                }),
                transform: [
                  {
                    scale: bubbleAppearance.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.1, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={styles.deathLine}>{deathTexts.welcome}</Text>
            <Text style={styles.deathTag}>{deathTexts.tag}</Text>
          </Animated.View>
        </View>
      </View>

      <ScrollView
        style={[styles.scrollArea]}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.modes}>
          {activeChallenges.map((challenge) => (
            <ModeCard
              key={challenge.type}
              playType={challenge.type}
              challenge={challenge}
              challengeParticipation={challenge.participation}
              onPress={() => openChallenge(challenge)}
              onLeaderboardPress={() =>
                navigation.navigate('Leaderboard', {
                  challenge,
                  challengeParticipation: challenge.participation,
                  fromHome: true,
                })
              }
            />
          ))}
          <ModeCard
            playType={PlayTypeEnum.freePlay}
            onPress={() =>
              navigation.navigate('Play', { playType: PlayTypeEnum.freePlay })
            }
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fixedTop: {
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: 20,
    paddingBottom: HERO_BOTTOM_PADDING,
    justifyContent: 'space-between'
  },
  scrollArea: {
    flex: 1
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5
  },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  avatar: {
    borderWidth: 1,
    borderColor: colors.accentQuota
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.accentQuota,
    alignItems: 'center',
    justifyContent: 'center'
  },
  profileName: {
    fontFamily: fonts.bold,
    fontSize: 19,
    color: colors.textPrimary,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4
  },
  profileRank: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4
  },
  topBarActions: {
    flexDirection: 'row',
    gap: 8
  },
  iconButton: {
    width: 50,
    height: 50,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center'
  },
  header: {
    alignItems: 'center',
    marginBottom: 0
  },
  logo: {
    width: '85%',
    aspectRatio: 1010 / 225,
    height: 80,
    marginLeft: 5
  },
  tagline: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4
  },
  death: {
    position: 'absolute',
    left: SCREEN_PADDING,
  },
  deathRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: DEATH_BUBBLE_GAP
  },
  deathBubble: {
    flex: 1,
    backgroundColor: colors.bubbleBackground,
    borderRadius: 14,
    borderBottomLeftRadius: 2,
    padding: 12
  },
  deathLine: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.bubbleText,
    lineHeight: 18
  },
  deathTag: {
    fontFamily: fonts.regular,
    textTransform: 'uppercase',
    textAlign: 'right',
    fontSize: 13,
    color: colors.bubbleTextMuted,
    marginTop: 6,
    letterSpacing: 0.5
  },
  modes: {
    gap: 14
  }
});

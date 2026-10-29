import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { challenges, PlayTypeEnum } from '@dead-lines-inc/common.models';
import { colors, fonts } from '@dead-lines-inc/frontend';

import { useTexts } from '../localization/texts';
import { HomeScreen } from '../screens/HomeScreen';
import { LeaderboardScreen } from '../screens/Leaderboard';
import { PenaltyScreen } from '../screens/PenaltyScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { PlayGate } from '../screens/PlayGate';
import { createPlaceholderScreen } from '../screens/PlaceholderScreen';

export type RootStackParamList = {
  Home: undefined;
  Play: {
    playType: PlayTypeEnum;
    challenge?: challenges.Challenge;
    challengeParticipation?: challenges.ChallengeParticipation;
  };
  // After a play with mistakes: an ad, then on to the Leaderboard.
  Penalty: RootStackParamList['Leaderboard'];
  Leaderboard: {
    challenge: challenges.Challenge;
    // Absent when opened from the home screen before the player has joined.
    challengeParticipation?: challenges.ChallengeParticipation;
    // The ranks before the play just finished, to animate what it changed.
    // Absent when not coming from a play (home screen), or if the pre-play
    // snapshot fetch failed — the screen then just shows current ranks.
    previousLeaderboard?: challenges.ChallengeLeaderboard;
    // Opened from the home screen rather than after a play.
    fromHome?: boolean;
  };
  Archive: undefined;
  DailyTasks: undefined;
  Settings: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const ArchiveScreen = createPlaceholderScreen('archive');
const DailyTasksScreen = createPlaceholderScreen('dailyTasks');

const secondaryScreenOptions = {
  headerStyle: { backgroundColor: colors.background },
  headerTintColor: colors.textPrimary,
  headerTitleStyle: { fontFamily: fonts.headingBold },
};

export function Navigation() {
  const screenTexts = useTexts('screens');
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Play"
          component={PlayGate}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Penalty"
          component={PenaltyScreen}
          // No swiping away from the penalty.
          options={{ headerShown: false, gestureEnabled: false }}
        />
        <Stack.Screen
          name="Leaderboard"
          component={LeaderboardScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Archive"
          component={ArchiveScreen}
          options={{ title: screenTexts.archive.title, ...secondaryScreenOptions }}
        />
        <Stack.Screen
          name="DailyTasks"
          component={DailyTasksScreen}
          options={{ title: screenTexts.dailyTasks.title, ...secondaryScreenOptions }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ title: screenTexts.settings.title, ...secondaryScreenOptions }}
        />
        <Stack.Screen
          name="Profile"
          component={ProfileScreen}
          options={{ title: screenTexts.profile.title, ...secondaryScreenOptions }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

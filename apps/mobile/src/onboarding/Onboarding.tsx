import { useState } from 'react';

import { InvitationScreen } from './InvitationScreen';
import { TutorialScreen } from './TutorialScreen';

type OnboardingStep = 'invitation' | 'tutorial';

// First launch, before the user has a player: the invitation, then the
// tutorial, which registers the player at its end. Shown in place of the
// app's navigation, so it's a plain sequence of steps rather than routes.
export function Onboarding() {
  const [step, setStep] = useState<OnboardingStep>('invitation');

  return step === 'invitation' ? (
    <InvitationScreen onTryIt={() => setStep('tutorial')} />
  ) : (
    <TutorialScreen onBack={() => setStep('invitation')} />
  );
}

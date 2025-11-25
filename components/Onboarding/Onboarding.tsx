import React, { useState, useCallback } from 'react';
import Starfield from './Starfield';
import WelcomeScreen from './screens/WelcomeScreen';
import NameScreen from './screens/NameScreen';
import ColorScreen from './screens/ColorScreen';
import FirstNoteScreen from './screens/FirstNoteScreen';

type OnboardingStep = 'welcome' | 'name' | 'color' | 'firstNote' | 'transitioning' | 'complete';

interface OnboardingData {
  userName: string;
  userColor: string;
  firstNoteText: string;
}

interface OnboardingProps {
  initialUserName: string;
  initialUserColor: string;
  skipOnboarding: boolean;
  onSkipChange: (skip: boolean) => void;
  onComplete: (data: OnboardingData) => void;
}

const Onboarding: React.FC<OnboardingProps> = ({
  initialUserName,
  initialUserColor,
  skipOnboarding,
  onSkipChange,
  onComplete,
}) => {
  const [step, setStep] = useState<OnboardingStep>('welcome');
  const [isWarping, setIsWarping] = useState(false);
  const [userName, setUserName] = useState(initialUserName);
  const [userColor, setUserColor] = useState(initialUserColor);
  const [firstNoteText, setFirstNoteText] = useState('');

  const handleEnter = useCallback(() => {
    setStep('name');
  }, []);

  const handleNameContinue = useCallback((name: string) => {
    setUserName(name);
    setStep('color');
  }, []);

  const handleColorContinue = useCallback((color: string) => {
    setUserColor(color);
    setStep('firstNote');
  }, []);

  const handleCreateNote = useCallback((text: string) => {
    setFirstNoteText(text);
    setIsWarping(true);
    setStep('transitioning');
  }, []);

  const handleWarpComplete = useCallback(() => {
    setStep('complete');
    onComplete({
      userName,
      userColor,
      firstNoteText,
    });
  }, [userName, userColor, firstNoteText, onComplete]);

  if (step === 'complete') {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden">
      {/* Starfield Background */}
      <Starfield isWarping={isWarping} onWarpComplete={handleWarpComplete} />

      {/* Screen Content with Fade Transitions */}
      <div className="relative z-10">
        {step === 'welcome' && (
          <WelcomeScreen
            onEnter={handleEnter}
            skipNextTime={skipOnboarding}
            onSkipChange={onSkipChange}
          />
        )}

        {step === 'name' && (
          <NameScreen
            initialName={userName}
            onContinue={handleNameContinue}
          />
        )}

        {step === 'color' && (
          <ColorScreen
            initialColor={userColor}
            onContinue={handleColorContinue}
          />
        )}

        {step === 'firstNote' && (
          <FirstNoteScreen
            userColor={userColor}
            onCreateNote={handleCreateNote}
          />
        )}

        {step === 'transitioning' && (
          <div className="fixed inset-0 flex items-center justify-center">
            <p className="text-white/50 text-lg font-light tracking-wider animate-pulse">
              Entering the infinite...
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Onboarding;


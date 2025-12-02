import React, { useState, useCallback, useEffect } from 'react';
import Starfield from './Starfield';
import WelcomeScreen from './screens/WelcomeScreen';
import NameScreen from './screens/NameScreen';
import ColorScreen from './screens/ColorScreen';
import FirstNoteScreen from './screens/FirstNoteScreen';
import { formatSectorCoord } from '../../utils/bigCoords';

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
  onComplete: (data: OnboardingData & { startCoordinates: { x: string; y: string } }) => void;
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
  const [showCoordinates, setShowCoordinates] = useState(false);
  const [generatedCoordinates, setGeneratedCoordinates] = useState<{ x: string; y: string } | null>(null);

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
    
    // Generate random start location (same logic as App.tsx)
    const angle = Math.random() * Math.PI * 2;
    const distance = 15000 + Math.random() * 10000;
    const startX = Math.round(Math.cos(angle) * distance);
    const startY = Math.round(Math.sin(angle) * distance);
    
    setGeneratedCoordinates({ x: startX.toString(), y: startY.toString() });
    setIsWarping(true);
    setStep('transitioning');
  }, []);

  const handleWarpComplete = useCallback(() => {
    // Show coordinates after warp completes
    if (generatedCoordinates) {
      setShowCoordinates(true);
      // Hide coordinates after 4 seconds, then complete onboarding
      setTimeout(() => {
        setShowCoordinates(false);
        setStep('complete');
        onComplete({
          userName,
          userColor,
          firstNoteText,
          startCoordinates: generatedCoordinates,
        });
      }, 4000);
    } else {
      setStep('complete');
      // Fallback if coordinates weren't generated
      const fallbackCoords = { x: '0', y: '0' };
      onComplete({
        userName,
        userColor,
        firstNoteText,
        startCoordinates: fallbackCoords,
      });
    }
  }, [userName, userColor, firstNoteText, onComplete, generatedCoordinates]);

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

        {step === 'transitioning' && !showCoordinates && (
          <div className="fixed inset-0 flex items-center justify-center">
            <p className="text-white/50 text-lg font-light tracking-wider animate-pulse">
              Assigning your starting sector...
            </p>
          </div>
        )}

        {step === 'transitioning' && showCoordinates && generatedCoordinates && (
          <div className="fixed inset-0 flex items-center justify-center animate-fade-in">
            <div className="text-center">
              <p className="text-white/70 text-lg font-light tracking-wider mb-2">
                You are now in
              </p>
              <p className="text-white/90 text-xl font-light tracking-wider font-mono">
                Sector X {formatSectorCoord(generatedCoordinates.x)}
              </p>
              <p className="text-white/90 text-xl font-light tracking-wider font-mono">
                Sector Y {formatSectorCoord(generatedCoordinates.y)}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Onboarding;






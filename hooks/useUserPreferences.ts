import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEYS = {
  userName: 'infinity_userName',
  userColor: 'infinity_userColor',
  skipOnboarding: 'infinity_skipOnboarding',
  onboardingComplete: 'infinity_onboardingComplete', // sessionStorage
};

export interface UserPreferences {
  userName: string;
  userColor: string;
  skipOnboarding: boolean;
  onboardingComplete: boolean;
}

export const useUserPreferences = () => {
  const [userName, setUserNameState] = useState<string>('');
  const [userColor, setUserColorState] = useState<string>('bg-note-yellow');
  const [skipOnboarding, setSkipOnboardingState] = useState<boolean>(false);
  const [onboardingComplete, setOnboardingCompleteState] = useState<boolean>(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load preferences on mount
  useEffect(() => {
    const savedName = localStorage.getItem(STORAGE_KEYS.userName) || '';
    const savedColor = localStorage.getItem(STORAGE_KEYS.userColor) || 'bg-note-yellow';
    const savedSkip = localStorage.getItem(STORAGE_KEYS.skipOnboarding) === 'true';
    const sessionComplete = sessionStorage.getItem(STORAGE_KEYS.onboardingComplete) === 'true';

    setUserNameState(savedName);
    setUserColorState(savedColor);
    setSkipOnboardingState(savedSkip);
    setOnboardingCompleteState(sessionComplete);
    setIsLoaded(true);
  }, []);

  const setUserName = useCallback((name: string) => {
    setUserNameState(name);
    localStorage.setItem(STORAGE_KEYS.userName, name);
  }, []);

  const setUserColor = useCallback((color: string) => {
    setUserColorState(color);
    localStorage.setItem(STORAGE_KEYS.userColor, color);
  }, []);

  const setSkipOnboarding = useCallback((skip: boolean) => {
    setSkipOnboardingState(skip);
    localStorage.setItem(STORAGE_KEYS.skipOnboarding, skip.toString());
  }, []);

  const completeOnboarding = useCallback(() => {
    setOnboardingCompleteState(true);
    sessionStorage.setItem(STORAGE_KEYS.onboardingComplete, 'true');
  }, []);

  // Determine if onboarding should show
  const shouldShowOnboarding = isLoaded && !skipOnboarding && !onboardingComplete;

  return {
    userName,
    userColor,
    skipOnboarding,
    onboardingComplete,
    isLoaded,
    shouldShowOnboarding,
    setUserName,
    setUserColor,
    setSkipOnboarding,
    completeOnboarding,
  };
};


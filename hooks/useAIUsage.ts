import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'infinity_board_ai_usage';
const DAILY_LIMIT = 5;

interface AIUsageData {
  date: string;
  count: number;
}

interface UseAIUsageReturn {
  remainingCredits: number;
  checkLimit: () => boolean;
  incrementUsage: () => void;
  isLimitReached: boolean;
}

/**
 * Hook to track and limit AI usage per day.
 * Stores usage count in localStorage, resets daily.
 * 
 * @returns {UseAIUsageReturn} - remainingCredits, checkLimit, incrementUsage, isLimitReached
 */
export function useAIUsage(): UseAIUsageReturn {
  const [usageData, setUsageData] = useState<AIUsageData>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data: AIUsageData = JSON.parse(stored);
        const today = new Date().toDateString();
        
        // Reset if it's a new day
        if (data.date !== today) {
          return { date: today, count: 0 };
        }
        return data;
      }
    } catch (e) {
      // localStorage not available or corrupted
    }
    return { date: new Date().toDateString(), count: 0 };
  });

  // Persist to localStorage whenever usageData changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(usageData));
    } catch (e) {
      // localStorage not available
    }
  }, [usageData]);

  const remainingCredits = Math.max(0, DAILY_LIMIT - usageData.count);
  const isLimitReached = remainingCredits <= 0;

  /**
   * Check if the user can make another AI request.
   * @returns true if allowed, false if limit reached
   */
  const checkLimit = useCallback((): boolean => {
    const today = new Date().toDateString();
    
    // If it's a new day, reset and allow
    if (usageData.date !== today) {
      setUsageData({ date: today, count: 0 });
      return true;
    }
    
    return usageData.count < DAILY_LIMIT;
  }, [usageData]);

  /**
   * Increment the usage count after a successful AI request.
   */
  const incrementUsage = useCallback(() => {
    const today = new Date().toDateString();
    
    setUsageData(prev => {
      // Reset if new day
      if (prev.date !== today) {
        return { date: today, count: 1 };
      }
      return { ...prev, count: prev.count + 1 };
    });
  }, []);

  return {
    remainingCredits,
    checkLimit,
    incrementUsage,
    isLimitReached,
  };
}

export default useAIUsage;



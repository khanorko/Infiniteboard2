import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'infinity_notifications';
const LAST_VISIT_KEY = 'infinity_last_visit';

interface NotificationSettings {
  enabled: boolean;
  permission: NotificationPermission;
  lastReminder: number | null;
  dailyReminderTime: number; // Hour of day (0-23)
}

interface UseNotificationsReturn {
  settings: NotificationSettings;
  isSupported: boolean;
  requestPermission: () => Promise<boolean>;
  enableNotifications: () => Promise<boolean>;
  disableNotifications: () => void;
  scheduleReminder: () => void;
  sendTestNotification: () => void;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: false,
  permission: 'default',
  lastReminder: null,
  dailyReminderTime: 9, // 9 AM default
};

/**
 * Hook to manage browser notifications for user retention.
 * Sends daily reminders to bring users back to the board.
 */
export function useNotifications(): UseNotificationsReturn {
  const [settings, setSettings] = useState<NotificationSettings>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...DEFAULT_SETTINGS,
          ...parsed,
          permission: typeof Notification !== 'undefined' ? Notification.permission : 'denied',
        };
      }
    } catch (e) {
      // localStorage not available
    }
    return {
      ...DEFAULT_SETTINGS,
      permission: typeof Notification !== 'undefined' ? Notification.permission : 'denied',
    };
  });

  const isSupported = typeof Notification !== 'undefined';

  // Persist settings
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
      // localStorage not available
    }
  }, [settings]);

  // Track last visit for "welcome back" logic
  useEffect(() => {
    try {
      localStorage.setItem(LAST_VISIT_KEY, Date.now().toString());
    } catch (e) {
      // Ignore
    }
  }, []);

  // Request notification permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;

    try {
      const permission = await Notification.requestPermission();
      setSettings(prev => ({ ...prev, permission }));
      return permission === 'granted';
    } catch (e) {
      console.error('Failed to request notification permission:', e);
      return false;
    }
  }, [isSupported]);

  // Enable notifications
  const enableNotifications = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;

    let permission = Notification.permission;
    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }

    if (permission === 'granted') {
      setSettings(prev => ({
        ...prev,
        enabled: true,
        permission,
      }));

      // Schedule the first reminder
      scheduleReminderInternal();

      // Show confirmation
      new Notification('Infinity Board', {
        body: "You'll receive gentle reminders to capture your ideas ✨",
        icon: '/favicon.ico',
        tag: 'infinity-welcome',
      });

      return true;
    }

    setSettings(prev => ({ ...prev, permission }));
    return false;
  }, [isSupported]);

  // Disable notifications
  const disableNotifications = useCallback(() => {
    setSettings(prev => ({ ...prev, enabled: false }));
  }, []);

  // Internal scheduling logic
  const scheduleReminderInternal = useCallback(() => {
    if (!isSupported || !settings.enabled) return;

    // Check if we should send a reminder (not sent today)
    const now = new Date();
    const today = now.toDateString();
    const lastReminderDate = settings.lastReminder
      ? new Date(settings.lastReminder).toDateString()
      : null;

    if (lastReminderDate === today) {
      // Already sent today
      return;
    }

    // Check if it's past the reminder time
    if (now.getHours() >= settings.dailyReminderTime) {
      // Check when user last visited
      const lastVisit = localStorage.getItem(LAST_VISIT_KEY);
      const lastVisitTime = lastVisit ? parseInt(lastVisit, 10) : 0;
      const hoursSinceVisit = (Date.now() - lastVisitTime) / (1000 * 60 * 60);

      // Only remind if user hasn't visited in 20+ hours
      if (hoursSinceVisit >= 20) {
        sendReminderNotification();
        setSettings(prev => ({ ...prev, lastReminder: Date.now() }));
      }
    }
  }, [isSupported, settings.enabled, settings.dailyReminderTime, settings.lastReminder]);

  // Send the actual reminder notification
  const sendReminderNotification = useCallback(() => {
    if (!isSupported || Notification.permission !== 'granted') return;

    const messages = [
      "What's on your mind today? 💭",
      "Your canvas awaits new ideas ✨",
      "Time for a quick brainstorm? 🧠",
      "Capture a thought before it fades 📝",
      "The infinite canvas misses you 🌌",
    ];

    const message = messages[Math.floor(Math.random() * messages.length)];

    new Notification('Infinity Board', {
      body: message,
      icon: '/favicon.ico',
      tag: 'infinity-reminder',
      requireInteraction: false,
    });
  }, [isSupported]);

  // Public schedule function
  const scheduleReminder = useCallback(() => {
    scheduleReminderInternal();
  }, [scheduleReminderInternal]);

  // Test notification
  const sendTestNotification = useCallback(() => {
    if (!isSupported || Notification.permission !== 'granted') return;

    new Notification('Infinity Board', {
      body: "Notifications are working! You'll get daily reminders ✨",
      icon: '/favicon.ico',
      tag: 'infinity-test',
    });
  }, [isSupported]);

  // Check for reminder on mount and periodically
  useEffect(() => {
    if (settings.enabled) {
      scheduleReminderInternal();

      // Check every hour
      const interval = setInterval(scheduleReminderInternal, 60 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [settings.enabled, scheduleReminderInternal]);

  return {
    settings,
    isSupported,
    requestPermission,
    enableNotifications,
    disableNotifications,
    scheduleReminder,
    sendTestNotification,
  };
}

export default useNotifications;

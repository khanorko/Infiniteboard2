import React, { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';

interface NotificationPromptProps {
  onEnable: () => Promise<boolean>;
  onDismiss: () => void;
  isSupported: boolean;
  permission: NotificationPermission;
}

const DISMISSED_KEY = 'infinity_notification_prompt_dismissed';

const NotificationPrompt: React.FC<NotificationPromptProps> = ({
  onEnable,
  onDismiss,
  isSupported,
  permission,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Don't show if not supported, already granted, or already dismissed
    if (!isSupported || permission === 'granted' || permission === 'denied') {
      return;
    }

    try {
      const dismissed = localStorage.getItem(DISMISSED_KEY);
      if (dismissed) return;
    } catch (e) {
      // Ignore
    }

    // Show after a short delay
    const timer = setTimeout(() => setIsVisible(true), 500);
    return () => clearTimeout(timer);
  }, [isSupported, permission]);

  const handleEnable = async () => {
    setIsLoading(true);
    const success = await onEnable();
    setIsLoading(false);

    if (success) {
      setIsVisible(false);
    }
  };

  const handleDismiss = () => {
    try {
      localStorage.setItem(DISMISSED_KEY, 'true');
    } catch (e) {
      // Ignore
    }
    setIsVisible(false);
    onDismiss();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 animate-fade-in-up">
      <div className="bg-gray-900/90 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl max-w-sm">
        <button
          onClick={handleDismiss}
          className="absolute -top-2 -right-2 p-1 bg-gray-800 rounded-full border border-white/10
                     text-white/50 hover:text-white hover:bg-gray-700 transition-colors"
        >
          <X size={14} />
        </button>

        <div className="flex items-start gap-3">
          <div className="p-2 bg-purple-500/20 rounded-xl">
            <Bell className="text-purple-400" size={20} />
          </div>

          <div className="flex-1">
            <h3 className="text-white/90 font-medium text-sm mb-1">
              Stay inspired
            </h3>
            <p className="text-white/50 text-xs mb-3 leading-relaxed">
              Get gentle reminders to capture your ideas before they fade away.
            </p>

            <div className="flex gap-2">
              <button
                onClick={handleEnable}
                disabled={isLoading}
                className="px-3 py-1.5 bg-purple-500 hover:bg-purple-600 text-white text-xs font-medium
                           rounded-lg transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Enabling...' : 'Enable'}
              </button>
              <button
                onClick={handleDismiss}
                className="px-3 py-1.5 text-white/50 hover:text-white/70 text-xs transition-colors"
              >
                Maybe later
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationPrompt;

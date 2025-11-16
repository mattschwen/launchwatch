'use client';

import { useState, useEffect } from 'react';
import { requestNotificationPermission } from '@/lib/notifications';

export default function NotificationPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    // Check if notifications are supported
    if (!('Notification' in window)) {
      return;
    }

    setPermission(Notification.permission);

    // Show prompt if permission is default and user hasn't dismissed it
    const dismissed = localStorage.getItem('notification-prompt-dismissed');
    if (Notification.permission === 'default' && !dismissed) {
      // Delay showing the prompt by 5 seconds
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, []);

  const handleEnable = async () => {
    const result = await requestNotificationPermission();
    setPermission(result);
    setShowPrompt(false);

    if (result === 'granted') {
      // Show a test notification
      new Notification('🚀 LaunchWatch Notifications Enabled!', {
        body: "You'll receive alerts for upcoming launches",
        icon: '/icon-192.svg',
      });
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('notification-prompt-dismissed', 'true');
  };

  if (!showPrompt || permission !== 'default') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-xs animate-fade-in">
      <div className="glass border border-[var(--primary)]/50 rounded-xl shadow-lg p-3 animate-glow">
        <div className="flex gap-2">
          <span className="text-2xl flex-shrink-0">🔔</span>
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-bold text-sm mb-1">Launch Alerts</h3>
            <p className="text-[var(--text-secondary)] text-xs mb-2">Get notified before launches</p>
            <div className="flex gap-1.5">
              <button
                onClick={handleEnable}
                className="flex-1 px-3 py-1.5 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-semibold rounded-lg transition-all"
              >
                Enable
              </button>
              <button
                onClick={handleDismiss}
                className="px-3 py-1.5 glass glass-hover text-white text-xs rounded-lg"
              >
                Later
              </button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-[var(--text-muted)] hover:text-white text-xs flex-shrink-0"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

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
    <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-fade-in">
      <div className="bg-gradient-to-r from-blue-900 to-purple-900 border border-blue-500 rounded-lg shadow-lg p-4">
        <div className="flex items-start gap-3">
          <span className="text-3xl">🔔</span>
          <div className="flex-1">
            <h3 className="text-white font-bold mb-1">
              Get Launch Notifications
            </h3>
            <p className="text-gray-300 text-sm mb-3">
              Receive alerts when launches are about to happen
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleEnable}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Enable
              </button>
              <button
                onClick={handleDismiss}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Later
              </button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

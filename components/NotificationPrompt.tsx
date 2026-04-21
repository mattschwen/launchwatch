'use client';

import { useState, useEffect } from 'react';
import { requestNotificationPermission } from '@/lib/notifications';
import { Bell, X } from 'lucide-react';

export default function NotificationPrompt(): React.ReactElement | null {
  const [showPrompt, setShowPrompt] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if (!('Notification' in window)) return;

    const currentPermission = Notification.permission;
    const dismissed = localStorage.getItem('notification-prompt-dismissed');
    if (currentPermission === 'default' && !dismissed) {
      const timer = setTimeout(() => setShowPrompt(true), 5000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleEnable = async (): Promise<void> => {
    const result = await requestNotificationPermission();
    setPermission(result);
    setShowPrompt(false);

    if (result === 'granted') {
      new Notification('LaunchWatch Notifications Enabled!', {
        body: "You'll receive alerts for upcoming launches",
        icon: '/icon-192.svg',
      });
    }
  };

  const handleDismiss = (): void => {
    setShowPrompt(false);
    localStorage.setItem('notification-prompt-dismissed', 'true');
  };

  if (!showPrompt || permission !== 'default') return null;

  return (
    <div className="fixed bottom-20 md:bottom-4 right-4 z-40 max-w-xs animate-fade-in">
      <div className="panel border border-[var(--primary)]/30 rounded-xl shadow-xl p-3">
        <div className="flex gap-2">
          <Bell size={20} className="text-[var(--primary)] flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h3 className="text-[var(--text-primary)] font-bold text-sm mb-1">Launch Alerts</h3>
            <p className="text-[var(--text-muted)] text-xs mb-2">Get notified before launches</p>
            <div className="flex gap-1.5">
              <button
                onClick={handleEnable}
                className="flex-1 px-3 py-1.5 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-semibold rounded-lg transition-all"
              >
                Enable
              </button>
              <button
                onClick={handleDismiss}
                className="px-3 py-1.5 panel-interactive text-[var(--text-secondary)] text-xs rounded-lg"
              >
                Later
              </button>
            </div>
          </div>
          <button onClick={handleDismiss} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] flex-shrink-0">
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect } from 'react';

export default function RegisterServiceWorker() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('ServiceWorker registered:', registration);

            // Check for updates periodically
            setInterval(() => {
              registration.update();
            }, 60 * 60 * 1000); // Check every hour
          })
          .catch((error) => {
            console.log('ServiceWorker registration failed:', error);
          });
      });
    }
  }, []);

  return null;
}

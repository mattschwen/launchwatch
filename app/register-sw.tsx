'use client';

import { useEffect, useState } from 'react';

const UPDATE_INTERVAL_MS = 60 * 60 * 1000;
const UPDATE_APPLY_TIMEOUT_MS = 15 * 1000;
const UPDATE_AVAILABLE_EVENT = 'launchwatch:service-worker-update';
const APPLY_UPDATE_EVENT = 'launchwatch:apply-service-worker-update';

type UpdateState = 'idle' | 'available' | 'applying';

function isUnmodifiedPrimaryClick(event: MouseEvent): boolean {
  return (
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}

export default function RegisterServiceWorker(): React.ReactElement | null {
  const [updateState, setUpdateState] = useState<UpdateState>('idle');

  useEffect(() => {
    if (
      process.env.NODE_ENV !== 'production' ||
      !window.isSecureContext ||
      !('serviceWorker' in navigator)
    ) {
      return;
    }

    let disposed = false;
    let updateInterval: number | undefined;
    let applyTimeout: number | undefined;
    let registration: ServiceWorkerRegistration | undefined;
    let hadController = Boolean(navigator.serviceWorker.controller);

    const announceWaitingUpdate = (): void => {
      setUpdateState((currentState) =>
        currentState === 'applying' ? currentState : 'available'
      );
      window.dispatchEvent(new CustomEvent(UPDATE_AVAILABLE_EVENT));
    };

    const applyWaitingUpdate = (): void => {
      const waitingWorker = registration?.waiting;
      if (!waitingWorker) {
        setUpdateState('available');
        return;
      }

      setUpdateState('applying');
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });

      applyTimeout = window.setTimeout(() => {
        if (!disposed) {
          setUpdateState('available');
        }
      }, UPDATE_APPLY_TIMEOUT_MS);
    };

    const handleControllerChange = (): void => {
      // The first service worker taking control should not reload the page.
      if (!hadController) {
        hadController = true;
        return;
      }

      if (applyTimeout !== undefined) {
        window.clearTimeout(applyTimeout);
      }
      window.location.reload();
    };

    const handleUpdateFound = (): void => {
      const installingWorker = registration?.installing;
      if (!installingWorker) {
        return;
      }

      installingWorker.addEventListener('statechange', () => {
        if (
          !disposed &&
          installingWorker.state === 'installed' &&
          navigator.serviceWorker.controller
        ) {
          announceWaitingUpdate();
        }
      });
    };

    const checkForUpdates = (): void => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        void registration?.update().catch(() => {
          // A failed update check should not interrupt the active application.
        });
      }
    };

    const handleOfflineNavigation = (event: MouseEvent): void => {
      if (
        navigator.onLine ||
        event.defaultPrevented ||
        !isUnmodifiedPrimaryClick(event) ||
        !(event.target instanceof Element)
      ) {
        return;
      }

      const anchor = event.target.closest<HTMLAnchorElement>('a[href]');
      if (
        !anchor ||
        anchor.hasAttribute('download') ||
        (anchor.target && anchor.target !== '_self')
      ) {
        return;
      }

      let destination: URL;
      try {
        destination = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }

      if (
        destination.origin !== window.location.origin ||
        (destination.protocol !== 'http:' && destination.protocol !== 'https:')
      ) {
        return;
      }

      const currentUrl = new URL(window.location.href);
      const isSameDocumentFragment =
        destination.pathname === currentUrl.pathname &&
        destination.search === currentUrl.search &&
        Boolean(destination.hash);

      if (isSameDocumentFragment) {
        return;
      }

      // Force a document navigation so the service worker can return the
      // offline document instead of allowing a Next.js RSC request to fail.
      event.preventDefault();
      window.location.assign(destination.href);
    };

    const register = async (): Promise<void> => {
      try {
        const nextRegistration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none',
        });

        if (disposed) {
          return;
        }

        registration = nextRegistration;
        registration.addEventListener('updatefound', handleUpdateFound);

        if (registration.waiting) {
          announceWaitingUpdate();
        }

        updateInterval = window.setInterval(checkForUpdates, UPDATE_INTERVAL_MS);
        document.addEventListener('visibilitychange', checkForUpdates);
      } catch {
        // The app remains fully usable when service-worker registration fails.
      }
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
    window.addEventListener(APPLY_UPDATE_EVENT, applyWaitingUpdate);
    document.addEventListener('click', handleOfflineNavigation, true);

    if (document.readyState === 'complete') {
      void register();
    } else {
      window.addEventListener('load', register, { once: true });
    }

    return () => {
      disposed = true;
      window.removeEventListener('load', register);
      window.removeEventListener(APPLY_UPDATE_EVENT, applyWaitingUpdate);
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      document.removeEventListener('visibilitychange', checkForUpdates);
      document.removeEventListener('click', handleOfflineNavigation, true);
      registration?.removeEventListener('updatefound', handleUpdateFound);

      if (updateInterval !== undefined) {
        window.clearInterval(updateInterval);
      }
      if (applyTimeout !== undefined) {
        window.clearTimeout(applyTimeout);
      }
    };
  }, []);

  if (updateState === 'idle') {
    return null;
  }

  const applying = updateState === 'applying';

  return (
    <aside
      aria-labelledby="pwa-update-title"
      className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] left-3 right-3 z-[70] mx-auto flex max-w-xl flex-col gap-3 rounded-[var(--radius-md)] border border-[var(--border-accent)] bg-[var(--surface-raised)] p-4 shadow-[var(--shadow-elevated)] sm:left-auto sm:right-4 sm:w-[min(28rem,calc(100vw-2rem))] md:bottom-12"
    >
      <div className="min-w-0">
        <p
          id="pwa-update-title"
          className="font-[family-name:var(--font-geist-mono)] text-xs font-semibold uppercase tracking-[0.14em] text-[var(--console-green)]"
        >
          Mission control update
        </p>
        <p
          aria-live="polite"
          aria-atomic="true"
          className="mt-1 text-sm leading-6 text-[var(--text-secondary)]"
        >
          {applying
            ? 'Applying the update. LaunchWatch will reload when it is ready.'
            : 'A new version is ready. Update now to load the latest fixes.'}
        </p>
      </div>
      <button
        type="button"
        className="action-button action-button-primary w-full sm:w-fit"
        disabled={applying}
        aria-busy={applying}
        onClick={() => {
          window.dispatchEvent(new CustomEvent(APPLY_UPDATE_EVENT));
        }}
      >
        {applying ? 'Updating…' : 'Update now'}
      </button>
    </aside>
  );
}

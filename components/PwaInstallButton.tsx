'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, CircleAlert, Download, LoaderCircle } from 'lucide-react';

type InstallChoice = {
  outcome: 'accepted' | 'dismissed';
  platform: string;
};

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<InstallChoice>;
}

type InstallState =
  | 'unavailable'
  | 'available'
  | 'prompting'
  | 'accepted'
  | 'installed'
  | 'error';

const ACCEPTED_FEEDBACK_MS = 2_500;
const ERROR_FEEDBACK_MS = 3_500;

function isStandalone(): boolean {
  const navigatorWithStandalone = navigator as Navigator & {
    standalone?: boolean;
  };
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    navigatorWithStandalone.standalone === true
  );
}

export default function PwaInstallButton(): React.ReactElement | null {
  const [state, setState] = useState<InstallState>('unavailable');
  const promptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const feedbackTimeoutRef = useRef<number | undefined>(undefined);

  const clearFeedbackTimeout = useCallback((): void => {
    if (feedbackTimeoutRef.current !== undefined) {
      window.clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = undefined;
    }
  }, []);

  const hideAfter = useCallback((delay: number): void => {
    clearFeedbackTimeout();
    feedbackTimeoutRef.current = window.setTimeout(() => {
      feedbackTimeoutRef.current = undefined;
      setState('unavailable');
    }, delay);
  }, [clearFeedbackTimeout]);

  useEffect(() => {
    if (isStandalone()) return;

    const handleInstallPrompt = (event: Event): void => {
      const installPrompt = event as BeforeInstallPromptEvent;
      if (
        typeof installPrompt.prompt !== 'function' ||
        !installPrompt.userChoice
      ) {
        return;
      }

      event.preventDefault();
      clearFeedbackTimeout();
      promptRef.current = installPrompt;
      setState('available');
    };
    const handleInstalled = (): void => {
      promptRef.current = null;
      setState('installed');
      hideAfter(ACCEPTED_FEEDBACK_MS);
    };

    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      clearFeedbackTimeout();
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, [clearFeedbackTimeout, hideAfter]);

  const install = async (): Promise<void> => {
    const installPrompt = promptRef.current;
    if (!installPrompt || state !== 'available') return;

    setState('prompting');
    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      promptRef.current = null;
      if (choice.outcome === 'dismissed') {
        setState('unavailable');
        return;
      }

      setState('accepted');
      hideAfter(ACCEPTED_FEEDBACK_MS);
    } catch {
      promptRef.current = null;
      setState('error');
      hideAfter(ERROR_FEEDBACK_MS);
    }
  };

  if (state === 'unavailable') return null;

  const prompting = state === 'prompting';
  const feedback = state === 'accepted' || state === 'installed' || state === 'error';
  const label = prompting
    ? 'Opening installer'
    : state === 'accepted'
      ? 'Installation accepted'
      : state === 'installed'
        ? 'LaunchWatch installed'
        : state === 'error'
          ? 'Install unavailable'
          : 'Install LaunchWatch';

  return (
    <>
      <button
        type="button"
        onClick={() => void install()}
        aria-disabled={prompting || feedback}
        aria-busy={prompting}
        className={`inline-flex min-h-11 items-center gap-2 whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--console-cyan)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--surface-base)] aria-disabled:cursor-wait ${
          state === 'error'
            ? 'text-[var(--console-amber)]'
            : state === 'accepted' || state === 'installed'
              ? 'text-[var(--console-green)]'
              : 'text-[var(--console-cyan)] hover:text-[var(--text-primary)]'
        }`}
      >
        {prompting ? (
          <LoaderCircle aria-hidden="true" size={15} className="animate-spin" />
        ) : state === 'accepted' || state === 'installed' ? (
          <Check aria-hidden="true" size={15} />
        ) : state === 'error' ? (
          <CircleAlert aria-hidden="true" size={15} />
        ) : (
          <Download aria-hidden="true" size={15} />
        )}
        {label}
      </button>
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {state === 'accepted'
          ? 'LaunchWatch installation accepted by the browser.'
          : state === 'installed'
            ? 'LaunchWatch was installed.'
            : state === 'error'
              ? 'LaunchWatch could not open the browser installer.'
              : ''}
      </span>
    </>
  );
}

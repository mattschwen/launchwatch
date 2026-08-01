'use client';

import { useEffect, useId, useRef, useState } from 'react';
import {
  Bell,
  Calendar,
  CalendarClock,
  Check,
  CircleAlert,
  Copy,
  LoaderCircle,
} from 'lucide-react';
import type { Launch } from '@/lib/types';
import {
  copyToClipboard,
  downloadICS,
  getGoogleCalendarUrl,
} from '@/lib/calendar';
import {
  formatLaunchPrecisionLabel,
  hasCalendarReadyLaunchTime,
} from '@/lib/format';

interface AddToCalendarProps {
  launch: Launch;
  variant?: 'button' | 'icon';
  menuPlacement?: 'top' | 'bottom';
  menuAlign?: 'right' | 'center';
}

type CopyState = 'idle' | 'copying' | 'success' | 'error';
type AlertState =
  | NotificationPermission
  | 'requesting'
  | 'unsupported'
  | 'error';

export default function AddToCalendar({
  launch,
  variant = 'button',
  menuPlacement = 'bottom',
  menuAlign = 'right',
}: AddToCalendarProps): React.ReactElement {
  const [open, setOpen] = useState(false);
  const [copyState, setCopyState] = useState<CopyState>('idle');
  const [alertState, setAlertState] = useState<AlertState>('unsupported');
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstItemRef = useRef<HTMLButtonElement>(null);
  const copyResetTimeoutRef = useRef<number | undefined>(undefined);

  useEffect(
    () => () => {
      if (copyResetTimeoutRef.current !== undefined) {
        window.clearTimeout(copyResetTimeoutRef.current);
      }
    },
    []
  );

  useEffect(() => {
    if (!open) return;

    firstItemRef.current?.focus();

    const closeOnOutsideClick = (event: PointerEvent): void => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape, true);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape, true);
    };
  }, [open]);

  const close = (): void => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const handleCopy = async (): Promise<void> => {
    if (copyState === 'copying') return;

    if (copyResetTimeoutRef.current !== undefined) {
      window.clearTimeout(copyResetTimeoutRef.current);
    }

    setCopyState('copying');
    const success = await copyToClipboard(launch);
    setCopyState(success ? 'success' : 'error');

    if (success) {
      copyResetTimeoutRef.current = window.setTimeout(
        () => setCopyState('idle'),
        2000
      );
    }
  };

  const handleEnableAlerts = async (): Promise<void> => {
    if (alertState !== 'default' && alertState !== 'error') return;

    setAlertState('requesting');
    try {
      setAlertState(await window.Notification.requestPermission());
    } catch {
      setAlertState('error');
    }
  };

  const alertBusy = alertState === 'requesting';
  const alertUnavailable =
    alertState === 'granted' ||
    alertState === 'denied' ||
    alertState === 'unsupported';
  const alertLabel =
    alertState === 'requesting'
      ? 'Enabling browser alerts…'
      : alertState === 'granted'
        ? 'Alerts enabled while app is open'
        : alertState === 'denied'
          ? 'Alerts blocked in browser settings'
          : alertState === 'unsupported'
            ? 'Browser alerts unavailable'
            : alertState === 'error'
              ? 'Could not enable alerts — retry'
              : 'Enable browser launch alerts';
  const calendarReady = hasCalendarReadyLaunchTime(launch.datePrecision);

  if (!calendarReady) {
    const pendingDescriptionId = `${menuId}-pending`;
    const precisionLabel =
      formatLaunchPrecisionLabel(launch.datePrecision) || 'Estimated date';
    const pendingMessage =
      'Calendar export and browser alerts become available after the provider confirms the launch time.';

    return (
      <div className="calendar-pending-control relative">
        <button
          type="button"
          aria-disabled="true"
          title="Calendar available when the provider confirms the launch time"
          aria-label={
            variant === 'icon'
              ? 'Calendar export pending a confirmed launch time'
              : undefined
          }
          aria-describedby={pendingDescriptionId}
          className={`cursor-not-allowed opacity-55 focus-visible:opacity-80 ${
            variant === 'button'
              ? 'action-button action-button-secondary'
              : 'icon-button'
          }`}
        >
          <CalendarClock aria-hidden="true" size={17} />
          {variant === 'button' ? <span>Calendar pending</span> : null}
        </button>
        <span id={pendingDescriptionId} className="sr-only">
          {precisionLabel}. {pendingMessage}
        </span>
        <span
          aria-hidden="true"
          data-calendar-pending-tooltip="true"
          className={`calendar-pending-tooltip pointer-events-none absolute z-[75] rounded-[var(--radius-sm)] border border-[color-mix(in_srgb,var(--console-amber)_32%,var(--border-subtle))] bg-[var(--surface-raised)] px-3 py-2 text-left shadow-[var(--shadow-elevated)] ${
            variant === 'button'
              ? 'left-0 w-[min(16rem,calc(100vw-2rem))]'
              : 'left-1/2 w-[min(10rem,calc(100vw-2rem))] -translate-x-1/2'
          } ${
            menuPlacement === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
          }`}
        >
          <span className="data-label block text-[var(--console-amber)]">
            {precisionLabel}
          </span>
          <span className="mt-1 block text-xs leading-5 text-[var(--text-secondary)]">
            {pendingMessage}
          </span>
        </span>
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      className="relative"
      onClick={(event) => event.stopPropagation()}
      onBlur={(event) => {
        if (
          open &&
          !event.currentTarget.contains(event.relatedTarget as Node | null)
        ) {
          setOpen(false);
        }
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-label={variant === 'icon' ? 'Add launch to calendar' : undefined}
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => {
          if (!open) {
            setCopyState('idle');
            setAlertState(
              typeof window.Notification === 'undefined'
                ? 'unsupported'
                : window.Notification.permission
            );
          }
          setOpen((value) => !value);
        }}
        className={
          variant === 'button'
            ? 'action-button action-button-secondary'
            : 'icon-button'
        }
      >
        <Calendar aria-hidden="true" size={17} />
        {variant === 'button' ? <span>Add to calendar</span> : null}
      </button>

      {open ? (
        <div
          id={menuId}
          role="group"
          aria-label="Calendar options"
          className={`panel absolute z-[70] w-56 rounded-[var(--radius-md)] p-1.5 shadow-[var(--shadow-elevated)] ${
            menuAlign === 'center'
              ? 'left-1/2 -translate-x-1/2'
              : 'right-0'
          } ${
            menuPlacement === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
          }`}
        >
          <button
            ref={firstItemRef}
            type="button"
            onClick={() => {
              window.open(
                getGoogleCalendarUrl(launch),
                '_blank',
                'noopener,noreferrer'
              );
              close();
            }}
            className="menu-item"
          >
            <Calendar aria-hidden="true" size={16} />
            Google Calendar
          </button>
          <button
            type="button"
            onClick={() => {
              downloadICS(launch);
              close();
            }}
            className="menu-item"
          >
            <Calendar aria-hidden="true" size={16} />
            Apple or Outlook
          </button>
          <button
            type="button"
            onClick={() => void handleEnableAlerts()}
            aria-busy={alertBusy}
            aria-disabled={alertBusy || alertUnavailable}
            className={`menu-item aria-disabled:cursor-default aria-disabled:opacity-60 ${
              alertState === 'error' || alertState === 'denied'
                ? 'text-[var(--console-amber)]'
                : ''
            }`}
          >
            {alertBusy ? (
              <LoaderCircle
                aria-hidden="true"
                size={16}
                className="shrink-0 animate-spin"
              />
            ) : alertState === 'granted' ? (
              <Check
                aria-hidden="true"
                size={16}
                className="shrink-0 text-[var(--console-green)]"
              />
            ) : alertState === 'error' ||
              alertState === 'denied' ||
              alertState === 'unsupported' ? (
              <CircleAlert aria-hidden="true" size={16} className="shrink-0" />
            ) : (
              <Bell aria-hidden="true" size={16} className="shrink-0" />
            )}
            {alertLabel}
          </button>
          <button
            type="button"
            onClick={() => void handleCopy()}
            aria-busy={copyState === 'copying'}
            aria-disabled={copyState === 'copying'}
            className={`menu-item ${
              copyState === 'error' ? 'text-[var(--console-red)]' : ''
            }`}
          >
            {copyState === 'copying' ? (
              <LoaderCircle aria-hidden="true" size={16} className="animate-spin" />
            ) : copyState === 'success' ? (
              <Check
                aria-hidden="true"
                size={16}
                className="text-[var(--console-green)]"
              />
            ) : copyState === 'error' ? (
              <CircleAlert aria-hidden="true" size={16} />
            ) : (
              <Copy aria-hidden="true" size={16} />
            )}
            {copyState === 'copying'
              ? 'Copying details…'
              : copyState === 'success'
                ? 'Details copied'
                : copyState === 'error'
                  ? 'Copy failed — try again'
                  : 'Copy launch details'}
          </button>
          <span className="sr-only" aria-live="polite">
            {copyState === 'success'
              ? 'Launch details copied to clipboard'
              : copyState === 'error'
                ? 'Could not copy launch details. Try again or use a calendar option.'
                : alertState === 'granted'
                  ? 'Browser launch alerts enabled while LaunchWatch is open.'
                  : alertState === 'denied'
                    ? 'Browser launch alerts are blocked. Change notification permission in your browser settings to enable them.'
                    : alertState === 'error'
                      ? 'Could not request browser launch alerts. Try again.'
                      : ''}
          </span>
        </div>
      ) : null}
    </div>
  );
}

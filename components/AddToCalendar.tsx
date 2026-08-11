'use client';

import { useEffect, useId, useRef, useState } from 'react';
import {
  Bell,
  Calendar,
  CalendarClock,
  Check,
  CircleAlert,
  Copy,
  ExternalLink,
  LoaderCircle,
} from 'lucide-react';
import type { Launch } from '@/lib/types';
import {
  copyToClipboard,
  downloadICS,
  formatLaunchDetails,
  getGoogleCalendarUrl,
} from '@/lib/calendar';
import {
  formatLaunchPrecisionLabel,
  hasCalendarReadyLaunchTime,
} from '@/lib/format';
import { checkAndNotify } from '@/lib/notifications';
import ExternalLinkHint from '@/components/ui/ExternalLinkHint';

interface AddToCalendarProps {
  launch: Launch;
  variant?: 'button' | 'compact' | 'icon';
  menuPlacement?: 'top' | 'bottom';
  menuAlign?: 'left' | 'right' | 'center';
}

type CopyState = 'idle' | 'copying' | 'success' | 'error';
type MenuAlignment = NonNullable<AddToCalendarProps['menuAlign']>;
type MenuPlacement = NonNullable<AddToCalendarProps['menuPlacement']>;
type AlertState =
  | NotificationPermission
  | 'requesting'
  | 'unsupported'
  | 'error';

function resolveMenuAlignment(
  trigger: DOMRect,
  preferred: MenuAlignment
): MenuAlignment {
  const viewportWidth = window.innerWidth;
  const rootFontSize =
    Number.parseFloat(
      window.getComputedStyle(document.documentElement).fontSize
    ) || 16;
  const menuWidth = Math.min(rootFontSize * 14, viewportWidth - 16);
  const gutter = Math.min(8, Math.max(0, (viewportWidth - menuWidth) / 2));
  const positions: Record<MenuAlignment, number> = {
    left: trigger.left,
    center: trigger.left + trigger.width / 2 - menuWidth / 2,
    right: trigger.right - menuWidth,
  };
  const candidates: MenuAlignment[] = [preferred, 'center', 'right', 'left'];

  return (
    candidates.find((alignment, index) => {
      if (candidates.indexOf(alignment) !== index) return false;
      const left = positions[alignment];
      return (
        left >= gutter - 0.5 &&
        left + menuWidth <= viewportWidth - gutter + 0.5
      );
    }) ?? preferred
  );
}

function visibleChromeEdge(selector: string, edge: 'top' | 'bottom'): number | null {
  const elements = Array.from(document.querySelectorAll<HTMLElement>(selector));
  const visible = elements
    .filter((element) => window.getComputedStyle(element).display !== 'none')
    .map((element) => element.getBoundingClientRect())
    .filter((rect) => rect.width > 0 && rect.height > 0);

  if (visible.length === 0) return null;
  return edge === 'top'
    ? Math.max(...visible.map((rect) => rect.bottom))
    : Math.min(...visible.map((rect) => rect.top));
}

function resolveMenuViewport(
  trigger: DOMRect,
  preferred: MenuPlacement
): { placement: MenuPlacement; maxHeight: number } {
  const gutter = 8;
  if (trigger.width <= 0 || trigger.height <= 0) {
    return {
      placement: preferred,
      maxHeight: Math.max(96, window.innerHeight - gutter * 2),
    };
  }
  const topEdge =
    visibleChromeEdge('.app-shell > header', 'top') ?? gutter;
  const bottomEdge =
    visibleChromeEdge('.mobile-primary-nav, .system-status-bar', 'bottom') ??
    window.innerHeight - gutter;
  const available = {
    top: Math.max(0, trigger.top - topEdge - gutter),
    bottom: Math.max(0, bottomEdge - trigger.bottom - gutter),
  };
  const alternate: MenuPlacement = preferred === 'top' ? 'bottom' : 'top';
  // The menu is scrollable, so preserve the requested side whenever it can
  // retain the same 96px interaction floor used by the rendered max height.
  const minimumUsefulHeight = 96;
  const placement =
    available[preferred] < minimumUsefulHeight &&
    available[alternate] > available[preferred]
      ? alternate
      : preferred;

  return {
    placement,
    maxHeight: Math.max(96, Math.floor(available[placement])),
  };
}

export default function AddToCalendar({
  launch,
  variant = 'button',
  menuPlacement = 'bottom',
  menuAlign = 'right',
}: AddToCalendarProps): React.ReactElement {
  const [open, setOpen] = useState(false);
  const [copyState, setCopyState] = useState<CopyState>('idle');
  const [alertState, setAlertState] = useState<AlertState>('unsupported');
  const [resolvedMenuAlign, setResolvedMenuAlign] =
    useState<MenuAlignment>(menuAlign);
  const [resolvedMenuPlacement, setResolvedMenuPlacement] =
    useState<MenuPlacement>(menuPlacement);
  const [menuMaxHeight, setMenuMaxHeight] = useState<number | undefined>();
  const menuId = useId();
  const copyRecoveryId = useId();
  const copyRecoveryDescriptionId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    if (copyState !== 'error') return;
    const frame = window.requestAnimationFrame(() => {
      if (menuRef.current) {
        menuRef.current.scrollTop = menuRef.current.scrollHeight;
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [copyState]);

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
      const permission = await window.Notification.requestPermission();
      if (permission === 'granted') {
        await checkAndNotify([launch]);
      }
      setAlertState(permission);
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
  const labeled = variant !== 'icon';

  if (!calendarReady) {
    const pendingDescriptionId = `${menuId}-pending`;
    const precisionLabel =
      formatLaunchPrecisionLabel(launch.datePrecision) || 'Estimated date';
    const pendingMessage =
      'Calendar export and browser alerts become available after the provider confirms the launch time.';
    const pendingAlignment =
      variant === 'compact' || variant === 'icon' || menuAlign === 'center'
        ? 'left-1/2 -translate-x-1/2'
        : menuAlign === 'left'
          ? 'left-0'
          : 'right-0';

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
            labeled
              ? 'action-button action-button-secondary'
              : 'icon-button'
          }`}
        >
          <CalendarClock aria-hidden="true" size={17} />
          {variant === 'button' ? <span>Calendar pending</span> : null}
          {variant === 'compact' ? <span>Calendar</span> : null}
        </button>
        <span id={pendingDescriptionId} className="sr-only">
          {precisionLabel}. {pendingMessage}
        </span>
        <span
          aria-hidden="true"
          data-calendar-pending-tooltip="true"
          className={`calendar-pending-tooltip pointer-events-none absolute z-[75] rounded-[var(--radius-sm)] border border-[color-mix(in_srgb,var(--console-amber)_32%,var(--border-subtle))] bg-[var(--surface-raised)] px-3 py-2 text-left shadow-[var(--shadow-elevated)] ${
            labeled
              ? 'w-[min(16rem,calc(100vw-2rem))]'
              : 'w-[min(10rem,calc(100vw-2rem))]'
          } ${pendingAlignment} ${
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
            if (triggerRef.current) {
              const triggerBounds = triggerRef.current.getBoundingClientRect();
              setResolvedMenuAlign(
                resolveMenuAlignment(
                  triggerBounds,
                  variant === 'compact' ? 'center' : menuAlign
                )
              );
              const viewport = resolveMenuViewport(
                triggerBounds,
                menuPlacement
              );
              setResolvedMenuPlacement(viewport.placement);
              setMenuMaxHeight(viewport.maxHeight);
            }
          }
          setOpen((value) => !value);
        }}
        className={
          labeled
            ? 'action-button action-button-secondary'
            : 'icon-button'
        }
      >
        <Calendar aria-hidden="true" size={17} />
        {variant === 'button' ? <span>Add to calendar</span> : null}
        {variant === 'compact' ? <span>Calendar</span> : null}
      </button>

      {open ? (
        <div
          ref={menuRef}
          id={menuId}
          role="group"
          aria-label="Calendar options"
          style={{ maxHeight: menuMaxHeight }}
          className={`panel absolute z-[70] w-[min(14rem,calc(100vw-1rem))] overflow-y-auto overscroll-contain rounded-[var(--radius-md)] p-1.5 shadow-[var(--shadow-elevated)] ${
            resolvedMenuAlign === 'center'
              ? 'left-1/2 -translate-x-1/2'
              : resolvedMenuAlign === 'left'
                ? 'left-0'
              : 'right-0'
          } ${
            resolvedMenuPlacement === 'top'
              ? 'bottom-full mb-2'
              : 'top-full mt-2'
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
            <ExternalLink aria-hidden="true" size={16} />
            Google Calendar
            <ExternalLinkHint />
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
          {copyState === 'error' ? (
            <div
              data-calendar-copy-recovery="true"
              className="mx-1 mt-1 rounded-[var(--radius-sm)] border border-[color-mix(in_srgb,var(--console-amber)_32%,var(--border-subtle))] bg-[var(--surface-accent)] p-2.5"
            >
              <label
                htmlFor={copyRecoveryId}
                className="data-label text-[var(--console-amber)]"
              >
                Manual copy fallback
              </label>
              <p
                id={copyRecoveryDescriptionId}
                className="mt-1 text-[0.68rem] leading-4 text-[var(--text-secondary)]"
              >
                Select the mission brief below if clipboard access stays
                blocked.
              </p>
              <textarea
                id={copyRecoveryId}
                readOnly
                spellCheck={false}
                rows={3}
                value={formatLaunchDetails(launch)}
                aria-describedby={copyRecoveryDescriptionId}
                onFocus={(event) => event.currentTarget.select()}
                onClick={(event) => event.currentTarget.select()}
                className="mt-2 min-h-20 w-full resize-y rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--surface-canvas)] px-2.5 py-2 font-mono text-[0.68rem] leading-4 text-[var(--console-cyan)] outline-none selection:bg-[var(--console-cyan)] selection:text-black focus-visible:border-[var(--console-cyan)] focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--console-cyan)_34%,transparent)]"
              />
            </div>
          ) : null}
          <span className="sr-only" aria-live="polite">
            {copyState === 'success'
              ? 'Launch details copied to clipboard'
              : copyState === 'error'
                ? 'Could not copy launch details. A selectable manual copy fallback is available.'
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

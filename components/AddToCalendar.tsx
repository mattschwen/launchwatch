'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Calendar, Check, Copy } from 'lucide-react';
import type { Launch } from '@/lib/types';
import {
  copyToClipboard,
  downloadICS,
  getGoogleCalendarUrl,
} from '@/lib/calendar';

interface AddToCalendarProps {
  launch: Launch;
  variant?: 'button' | 'icon';
}

export default function AddToCalendar({
  launch,
  variant = 'button',
}: AddToCalendarProps): React.ReactElement {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstItemRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    firstItemRef.current?.focus();

    const closeOnOutsideClick = (event: PointerEvent): void => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  const close = (): void => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const handleCopy = async (): Promise<void> => {
    const success = await copyToClipboard(launch);
    setCopied(success);
    if (success) window.setTimeout(() => setCopied(false), 2000);
  };

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
        onClick={() => setOpen((value) => !value)}
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
          className="panel absolute right-0 top-full z-[70] mt-2 w-56 rounded-[var(--radius-md)] p-1.5 shadow-[var(--shadow-elevated)]"
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
            onClick={() => void handleCopy()}
            className="menu-item"
          >
            {copied ? (
              <Check
                aria-hidden="true"
                size={16}
                className="text-[var(--console-green)]"
              />
            ) : (
              <Copy aria-hidden="true" size={16} />
            )}
            {copied ? 'Details copied' : 'Copy launch details'}
          </button>
          <span className="sr-only" aria-live="polite">
            {copied ? 'Launch details copied to clipboard' : ''}
          </span>
        </div>
      ) : null}
    </div>
  );
}

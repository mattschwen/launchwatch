'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';

const BOOT_KEY = 'launchwatch.boot-sequence.v1';
const BOOT_STEPS = [
  'Syncing launch manifests',
  'Ranking broadcast leads',
  'Polling mission coverage',
  'Bringing telemetry online',
];

function formatCounter(value: number): string {
  return String(value).padStart(2, '0');
}

export default function MissionBootSequence(): React.ReactElement | null {
  const [shouldRender, setShouldRender] = useState(false);
  const [visible, setVisible] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [countdown, setCountdown] = useState(4);
  const [progress, setProgress] = useState(0);

  const stepCount = BOOT_STEPS.length;
  const percentage = useMemo(() => Math.round(progress * 100), [progress]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const hasSeenBoot = window.localStorage.getItem(BOOT_KEY) === 'done';

    if (prefersReducedMotion || hasSeenBoot) {
      return;
    }

    const raf = window.requestAnimationFrame(() => {
      setShouldRender(true);
      setVisible(true);
    });

    return () => window.cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (!shouldRender) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [shouldRender]);

  useEffect(() => {
    if (!shouldRender) {
      return;
    }

    const totalTicks = stepCount * 2 + 1;
    let tick = 0;

    const interval = window.setInterval(() => {
      tick += 1;
      const nextProgress = Math.min(1, tick / totalTicks);
      setProgress(nextProgress);
      setStepIndex(Math.min(stepCount - 1, Math.floor(tick / 2)));
      setCountdown(Math.max(0, 4 - Math.floor(tick / 2)));

      if (tick >= totalTicks) {
        window.clearInterval(interval);
        window.localStorage.setItem(BOOT_KEY, 'done');
        setVisible(false);
        window.setTimeout(() => {
          setShouldRender(false);
        }, 420);
      }
    }, 420);

    return () => window.clearInterval(interval);
  }, [shouldRender, stepCount]);

  if (!shouldRender) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 z-[120] flex items-center justify-center bg-[var(--bg-primary)]/96 px-4 transition-opacity duration-400 [transition-timing-function:var(--ease-out-expo)] ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,212,255,0.12),transparent_28%),radial-gradient(circle_at_18%_18%,rgba(0,255,136,0.12),transparent_18%)]" />
      <div className="absolute inset-0 opacity-50">
        <div className="h-full w-full bg-[linear-gradient(rgba(0,255,136,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,136,0.04)_1px,transparent_1px)] bg-[size:36px_36px]" />
      </div>

      <div className="relative w-full max-w-4xl overflow-hidden border border-[var(--console-green)]/18 bg-[var(--bg-secondary)]/92 shadow-[0_32px_80px_rgba(0,0,0,0.58)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--console-cyan)]/70 to-transparent animate-surface-sweep" />

        <div className="grid gap-8 px-5 py-6 sm:px-8 sm:py-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Image
                src="/newlogo.jpeg"
                alt="LaunchWatch"
                width={72}
                height={72}
                className="h-14 w-14 rounded-full border border-[var(--console-green)]/20 object-cover sm:h-[72px] sm:w-[72px]"
              />
              <div>
                <p className="console-label mb-2 text-[10px]">MISSION CONTROL BOOT</p>
                <h2 className="display-title text-3xl text-[var(--text-primary)] sm:text-[3.2rem]">
                  LaunchWatch
                </h2>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Rocket enthusiast companion feed coming online.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-end">
              <div>
                <p className="console-label mb-2 text-[10px]">COUNTDOWN</p>
                <div className="display-title text-6xl leading-none text-[var(--console-green)] sm:text-[5.5rem]">
                  T-{countdown}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-[10px] font-[family-name:var(--font-geist-mono)] tracking-[0.24em] text-[var(--text-muted)]">
                  <span>SYSTEM READY</span>
                  <span>{formatCounter(percentage)}%</span>
                </div>
                <div className="h-1 overflow-hidden bg-[var(--bg-primary)]">
                  <div
                    className="h-full bg-gradient-to-r from-[var(--console-green)] via-[var(--console-cyan)] to-[var(--console-cyan)] transition-[width] duration-300 [transition-timing-function:var(--ease-out-quart)]"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <p className="text-sm text-[var(--text-secondary)]">
                  {BOOT_STEPS[Math.min(stepIndex, BOOT_STEPS.length - 1)]}
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="border-l-2 border-[var(--console-green)]/35 pl-3">
                <p className="console-label text-[10px]">MODE</p>
                <p className="mt-1 text-sm text-[var(--text-primary)]">Mission control</p>
              </div>
              <div className="border-l-2 border-[var(--console-cyan)]/35 pl-3">
                <p className="console-label text-[10px]">FEEDS</p>
                <p className="mt-1 text-sm text-[var(--text-primary)]">Streams, media, chatter</p>
              </div>
              <div className="border-l-2 border-[var(--console-amber)]/35 pl-3">
                <p className="console-label text-[10px]">AUDIENCE</p>
                <p className="mt-1 text-sm text-[var(--text-primary)]">Rocket enthusiasts</p>
              </div>
            </div>
          </div>

          <div className="border border-[var(--panel-border)] bg-[var(--bg-primary)]/75 p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between">
              <p className="console-label text-[10px]">BOOT LOG</p>
              <button
                onClick={() => {
                  window.localStorage.setItem(BOOT_KEY, 'done');
                  setVisible(false);
                  window.setTimeout(() => setShouldRender(false), 240);
                }}
                className="text-[10px] font-[family-name:var(--font-geist-mono)] tracking-[0.22em] text-[var(--text-muted)] transition-colors hover:text-[var(--console-green)]"
              >
                SKIP
              </button>
            </div>

            <div className="space-y-3">
              {BOOT_STEPS.map((step, index) => {
                const isComplete = index < stepIndex;
                const isActive = index === stepIndex;

                return (
                  <div
                    key={step}
                    className={`flex items-center justify-between gap-3 border px-3 py-3 transition-colors duration-300 ${
                      isActive
                        ? 'border-[var(--console-cyan)]/35 bg-[var(--console-cyan)]/8'
                        : isComplete
                          ? 'border-[var(--console-green)]/25 bg-[var(--console-green)]/6'
                          : 'border-[var(--panel-border)] bg-[var(--bg-secondary)]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`inline-flex h-2.5 w-2.5 rounded-full ${
                          isActive
                            ? 'bg-[var(--console-cyan)] shadow-[0_0_12px_rgba(0,212,255,0.65)]'
                            : isComplete
                              ? 'bg-[var(--console-green)] shadow-[0_0_12px_rgba(0,255,136,0.45)]'
                              : 'bg-[var(--text-muted)]/35'
                        }`}
                      />
                      <div>
                        <p className="text-sm text-[var(--text-primary)]">{step}</p>
                        <p className="mt-1 text-[10px] font-[family-name:var(--font-geist-mono)] tracking-[0.18em] text-[var(--text-muted)]">
                          SYS-{formatCounter(index + 1)}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-[family-name:var(--font-geist-mono)] tracking-[0.22em] ${
                        isActive
                          ? 'text-[var(--console-cyan)]'
                          : isComplete
                            ? 'text-[var(--console-green)]'
                            : 'text-[var(--text-muted)]'
                      }`}
                    >
                      {isActive ? 'ACTIVE' : isComplete ? 'READY' : 'QUEUED'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

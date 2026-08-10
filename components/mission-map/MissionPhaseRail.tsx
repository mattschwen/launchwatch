'use client';

import { ExternalLink, MapPin, Orbit, Route } from 'lucide-react';
import ExternalLinkHint from '@/components/ui/ExternalLinkHint';
import { getLaunchSiteDisplay, isMeaningfulLaunchValue } from '@/lib/format';
import { buildReportedSiteMapUrl } from '@/lib/site-map';
import type { IllustrativeTrajectory } from '@/lib/trajectory';
import type { Launch } from '@/lib/types';
import type { MissionMapSelection } from './MissionMapCanvas';

interface MissionPhaseRailProps {
  activeSelection: MissionMapSelection;
  launch: Launch;
  onSelect: (selection: MissionMapSelection) => void;
  trajectory: IllustrativeTrajectory;
}

interface PhaseItem {
  description: string;
  id: Exclude<MissionMapSelection, null>;
  label: string;
  number: string;
  state: 'modeled' | 'reported';
  tone: 'cyan' | 'green';
}

function formatCoordinate(value: number, positive: string, negative: string): string {
  const direction = value >= 0 ? positive : negative;
  return `${Math.abs(value).toFixed(4)}°${direction}`;
}

export function formatLaunchCoordinates(launch: Launch): string {
  if (!launch.location) return 'Not supplied';

  return `${formatCoordinate(launch.location.lat, 'N', 'S')} · ${formatCoordinate(
    launch.location.lng,
    'E',
    'W'
  )}`;
}

export default function MissionPhaseRail({
  activeSelection,
  launch,
  onSelect,
  trajectory,
}: MissionPhaseRailProps): React.ReactElement {
  const items: PhaseItem[] = [];
  const site = getLaunchSiteDisplay(launch);
  const reportedSiteLabel =
    site.primary === 'Location pending' ? trajectory.siteLabel : site.label;
  const reportedSiteMapUrl = buildReportedSiteMapUrl(launch.location);

  if (trajectory.launchPoint) {
    items.push({
      id: 'reported-site',
      number: 'SITE',
      label: 'Reported launch site',
      description: reportedSiteLabel,
      state: 'reported',
      tone: 'green',
    });
  }

  if (trajectory.availability === 'ready') {
    items.push(
      {
        id: 'ascent-model',
        number: '01',
        label: 'Illustrative ascent',
        description: 'Modeled departure from the reported site',
        state: 'modeled',
        tone: 'green',
      },
      {
        id: 'target-orbit-model',
        number: '02',
        label: 'Reported target orbit',
        description: trajectory.orbitLabel,
        state: 'modeled',
        tone: 'cyan',
      }
    );
  }

  return (
    <div className="mission-phase-rail border-t border-[var(--border-subtle)] bg-[rgba(255,255,255,0.012)]">
      {items.length ? (
        <ol
          aria-label="Mission model phases"
          className={`grid ${
            items.length === 3
              ? 'md:grid-cols-3'
              : items.length === 2
                ? 'sm:grid-cols-2'
                : ''
          }`}
        >
          {items.map((item, index) => {
            const selected = activeSelection === item.id;
            const green = item.tone === 'green';
            const Icon =
              item.id === 'reported-site'
                ? MapPin
                : item.id === 'ascent-model'
                  ? Route
                  : Orbit;

            return (
              <li
                key={item.id}
                className={`${
                  index
                    ? items.length === 3
                      ? 'border-t border-[var(--border-subtle)] md:border-l md:border-t-0'
                      : 'border-t border-[var(--border-subtle)] sm:border-l sm:border-t-0'
                    : ''
                }`}
              >
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onSelect(selected ? null : item.id)}
                  className={`mission-phase-action flex min-h-[6.25rem] w-full items-start gap-3 px-4 py-4 text-left transition-colors sm:px-5 ${
                    selected
                      ? green
                        ? 'bg-[rgba(94,230,168,0.075)]'
                        : 'bg-[rgba(88,200,232,0.075)]'
                      : 'hover:bg-[rgba(255,255,255,0.025)]'
                  }`}
                >
                  <span
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border font-mono text-[10px] font-bold ${
                      green
                        ? 'border-[rgba(94,230,168,0.35)] bg-[rgba(94,230,168,0.08)] text-[var(--console-green)]'
                        : 'border-[rgba(88,200,232,0.35)] bg-[rgba(88,200,232,0.08)] text-[var(--console-cyan)]'
                    }`}
                  >
                    {item.number === 'SITE' ? (
                      <Icon aria-hidden="true" size={15} />
                    ) : (
                      item.number
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-sm font-semibold text-[var(--text-primary)]">
                        {item.label}
                      </span>
                      <span
                        className={`font-mono text-[9px] font-bold uppercase tracking-[0.1em] ${
                          item.state === 'reported'
                            ? 'text-[var(--text-secondary)]'
                            : 'text-[var(--console-cyan)]'
                        }`}
                      >
                        {item.state}
                      </span>
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-[var(--text-muted)]">
                      {item.description}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      ) : (
        <div className="flex min-h-[6.25rem] items-start gap-3 px-4 py-4 sm:px-5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[rgba(244,185,95,0.3)] bg-[rgba(244,185,95,0.08)] text-[var(--console-amber)]">
            <MapPin aria-hidden="true" size={16} />
          </span>
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              Geographic model unavailable
            </p>
            <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
              {isMeaningfulLaunchValue(launch.launchSite)
                ? `${site.label} is reported, but geographic coordinates were not supplied.`
                : 'The launch provider has not supplied a geographic origin.'}
            </p>
          </div>
        </div>
      )}

      <dl className="mission-phase-facts grid grid-cols-2 border-t border-[var(--border-subtle)] md:grid-cols-4">
        {[
          {
            label: 'Reported site',
            value: reportedSiteLabel,
          },
          {
            label: 'Target orbit',
            value: trajectory.orbitAvailable
              ? trajectory.orbitLabel
              : 'Not supplied',
            warning: !trajectory.orbitAvailable,
          },
          {
            label: 'Coordinates',
            value: formatLaunchCoordinates(launch),
            warning: !launch.location,
            href: reportedSiteMapUrl,
          },
          {
            label: 'Data source',
            value:
              launch.source === 'll2' ? 'Launch Library 2' : 'SpaceX',
          },
        ].map((fact, index) => (
          <div
            key={fact.label}
            className={`mission-phase-fact min-w-0 px-4 py-3 sm:px-5 ${
              index % 2 ? 'border-l border-[var(--border-subtle)]' : ''
            } ${index >= 2 ? 'border-t border-[var(--border-subtle)] md:border-t-0' : ''} ${
              index > 0 ? 'md:border-l md:border-[var(--border-subtle)]' : ''
            }`}
          >
            <dt className="font-mono text-[9px] font-bold uppercase tracking-[0.11em] text-[var(--text-muted)]">
              {fact.label}
            </dt>
            <dd
              className={`mt-1 break-words text-xs font-semibold leading-5 ${
                fact.warning
                  ? 'text-[var(--console-amber)]'
                  : 'text-[var(--text-primary)]'
              }`}
            >
              {'href' in fact && fact.href ? (
                <a
                  href={fact.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Open reported launch site in OpenStreetMap"
                  className="-my-2 inline-flex min-h-11 max-w-full items-center gap-1.5 text-[var(--console-cyan)] transition-colors hover:text-[var(--text-primary)]"
                >
                  <span>{fact.value}</span>
                  <ExternalLink aria-hidden="true" className="shrink-0" size={13} />
                  <ExternalLinkHint />
                </a>
              ) : (
                fact.value
              )}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

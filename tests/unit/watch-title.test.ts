import { describe, expect, it } from 'vitest';
import { getWatchDocumentTitle } from '@/lib/watch-title';

describe('getWatchDocumentTitle', () => {
  it('keeps the scheduled mission title stable', () => {
    expect(
      getWatchDocumentTitle(
        { name: 'Orbital Dawn', isLive: false, statusName: 'Go' },
        false,
      ),
    ).toBe('Orbital Dawn | Watch | LaunchWatch');
  });

  it('leads with confirmed coverage state for a background tab', () => {
    expect(
      getWatchDocumentTitle(
        { name: 'Orbital Dawn', isLive: true, statusName: 'Go for Launch' },
        false,
      ),
    ).toBe('COVERAGE LIVE · Orbital Dawn | LaunchWatch');
  });

  it('distinguishes an in-flight mission from prelaunch coverage', () => {
    expect(
      getWatchDocumentTitle(
        { name: 'Orbital Dawn', isLive: true, statusName: 'In Flight' },
        false,
      ),
    ).toBe('IN FLIGHT · Orbital Dawn | LaunchWatch');
  });

  it('does not claim live coverage from a retained signal', () => {
    expect(
      getWatchDocumentTitle(
        { name: 'Orbital Dawn', isLive: true, statusName: 'In Flight' },
        true,
      ),
    ).toBe('LAST KNOWN · Orbital Dawn | Watch | LaunchWatch');
  });
});

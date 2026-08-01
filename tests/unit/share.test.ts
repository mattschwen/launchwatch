import { describe, expect, it, vi } from 'vitest';
import { shareMission } from '@/lib/share';
import { UPCOMING_LAUNCHES } from '../fixtures/launches';

function setShare(value: Navigator['share'] | undefined): void {
  Object.defineProperty(navigator, 'share', {
    configurable: true,
    value,
  });
}

function setClipboard(writeText: (value: string) => Promise<void>): void {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  });
}

describe('shareMission', () => {
  it('uses the native share sheet with the canonical mission URL', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const writeText = vi.fn().mockResolvedValue(undefined);
    setShare(share);
    setClipboard(writeText);

    await expect(
      shareMission(UPCOMING_LAUNCHES[0], 'https://www.launchwatch.io')
    ).resolves.toBe('shared');
    expect(share).toHaveBeenCalledWith({
      title: 'Orbital Dawn | LaunchWatch',
      text: 'Track Orbital Dawn on LaunchWatch.',
      url: 'https://www.launchwatch.io/launch/ll2-demo-orbital-dawn',
    });
    expect(writeText).not.toHaveBeenCalled();
  });

  it('treats a dismissed native share sheet as cancellation', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setShare(
      vi.fn().mockRejectedValue(new DOMException('Dismissed', 'AbortError'))
    );
    setClipboard(writeText);

    await expect(
      shareMission(UPCOMING_LAUNCHES[0], 'https://www.launchwatch.io')
    ).resolves.toBe('cancelled');
    expect(writeText).not.toHaveBeenCalled();
  });

  it('falls back to copying the canonical URL when native sharing fails', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setShare(vi.fn().mockRejectedValue(new Error('Share sheet unavailable')));
    setClipboard(writeText);

    await expect(
      shareMission(UPCOMING_LAUNCHES[0], 'https://www.launchwatch.io')
    ).resolves.toBe('copied');
    expect(writeText).toHaveBeenCalledWith(
      'https://www.launchwatch.io/launch/ll2-demo-orbital-dawn'
    );
  });

  it('reports an error when neither sharing path is available', async () => {
    setShare(undefined);
    setClipboard(vi.fn().mockRejectedValue(new Error('Clipboard blocked')));

    await expect(
      shareMission(UPCOMING_LAUNCHES[0], 'https://www.launchwatch.io')
    ).resolves.toBe('error');
  });
});

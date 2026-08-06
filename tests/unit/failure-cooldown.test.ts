import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FailureCooldown } from '@/lib/failure-cooldown';

describe('FailureCooldown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2035-07-26T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('suppresses repeated failed loads until the recovery window opens', async () => {
    const failure = new Error('Provider request failed with 525');
    const loader = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(failure)
      .mockResolvedValueOnce('recovered');
    const cooldown = new FailureCooldown({ durationMs: 30_000 });

    await expect(cooldown.run('spacex:upcoming', loader)).rejects.toBe(failure);
    await expect(cooldown.run('spacex:upcoming', loader)).rejects.toBe(failure);
    expect(loader).toHaveBeenCalledOnce();

    vi.advanceTimersByTime(30_001);

    await expect(cooldown.run('spacex:upcoming', loader)).resolves.toBe(
      'recovered',
    );
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('keeps independent provider resources recoverable', async () => {
    const cooldown = new FailureCooldown({ durationMs: 30_000 });
    const failingLoader = vi
      .fn<() => Promise<string>>()
      .mockRejectedValue(new Error('SpaceX unavailable'));
    const healthyLoader = vi
      .fn<() => Promise<string>>()
      .mockResolvedValue('Launch Library 2 available');

    await expect(
      cooldown.run('spacex:history:100', failingLoader),
    ).rejects.toThrow('SpaceX unavailable');
    await expect(
      cooldown.run('ll2:history:100', healthyLoader),
    ).resolves.toBe('Launch Library 2 available');

    expect(failingLoader).toHaveBeenCalledOnce();
    expect(healthyLoader).toHaveBeenCalledOnce();
  });
});

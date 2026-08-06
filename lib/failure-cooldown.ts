interface FailureCooldownOptions {
  durationMs: number;
  maxEntries?: number;
}

interface FailureEntry {
  error: unknown;
  retryAt: number;
}

export class FailureCooldown {
  private readonly durationMs: number;
  private readonly maxEntries: number;
  private readonly failures = new Map<string, FailureEntry>();

  constructor({ durationMs, maxEntries = 250 }: FailureCooldownOptions) {
    this.durationMs = durationMs;
    this.maxEntries = maxEntries;
  }

  async run<T>(key: string, loader: () => Promise<T>): Promise<T> {
    const now = Date.now();
    const failure = this.failures.get(key);

    if (failure && now < failure.retryAt) {
      throw failure.error;
    }
    if (failure) {
      this.failures.delete(key);
    }

    try {
      const value = await loader();
      this.failures.delete(key);
      return value;
    } catch (error) {
      this.failures.delete(key);
      this.failures.set(key, {
        error,
        retryAt: Date.now() + this.durationMs,
      });
      this.prune();
      throw error;
    }
  }

  private prune(): void {
    while (this.failures.size > this.maxEntries) {
      const oldestKey = this.failures.keys().next().value as
        | string
        | undefined;
      if (!oldestKey) return;
      this.failures.delete(oldestKey);
    }
  }
}

interface CacheEntry<T> {
  value?: T;
  updatedAt: number;
  inFlight?: Promise<T>;
}

interface CacheOptions {
  freshMs: number;
  staleMs?: number;
  maxEntries?: number;
}

export class TTLCache<T> {
  private readonly store = new Map<string, CacheEntry<T>>();
  private readonly freshMs: number;
  private readonly staleMs: number;
  private readonly maxEntries: number;

  constructor(options: CacheOptions) {
    this.freshMs = options.freshMs;
    this.staleMs = options.staleMs ?? options.freshMs;
    this.maxEntries = options.maxEntries ?? 250;
  }

  async getOrLoad(key: string, loader: () => Promise<T>): Promise<T> {
    const now = Date.now();
    const existing = this.store.get(key);

    if (existing?.value !== undefined && now - existing.updatedAt < this.freshMs) {
      return existing.value;
    }

    if (existing?.inFlight) {
      if (existing.value !== undefined && now - existing.updatedAt < this.staleMs) {
        return existing.value;
      }
      return existing.inFlight;
    }

    const loadPromise = loader()
      .then((value) => {
        this.store.set(key, {
          value,
          updatedAt: Date.now(),
        });
        this.prune();
        return value;
      })
      .catch((error) => {
        const fallback = this.store.get(key);
        if (fallback?.value !== undefined && now - fallback.updatedAt < this.staleMs) {
          this.store.set(key, {
            value: fallback.value,
            updatedAt: fallback.updatedAt,
          });
          return fallback.value;
        }
        this.store.delete(key);
        throw error;
      });

    this.store.set(key, {
      value: existing?.value,
      updatedAt: existing?.updatedAt ?? 0,
      inFlight: loadPromise,
    });

    if (existing?.value !== undefined && now - existing.updatedAt < this.staleMs) {
      void loadPromise;
      return existing.value;
    }

    return loadPromise;
  }

  private prune(): void {
    if (this.store.size <= this.maxEntries) {
      return;
    }

    const oldestEntries = [...this.store.entries()]
      .sort((a, b) => a[1].updatedAt - b[1].updatedAt)
      .slice(0, this.store.size - this.maxEntries);

    oldestEntries.forEach(([key]) => {
      this.store.delete(key);
    });
  }
}

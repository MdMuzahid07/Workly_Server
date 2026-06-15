interface CacheEntry<T> {
  value: T;
  expiry: number;
}

export class TTLCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private defaultTTLMs: number;

  constructor(defaultTTLMs: number) {
    this.defaultTTLMs = defaultTTLMs;
  }

  set(key: string, value: T, ttlMs?: number): void {
    const duration = ttlMs ?? this.defaultTTLMs;
    const expiry = Date.now() + duration;
    this.cache.set(key, { value, expiry });
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }
    return entry.value;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

// 5-minute TTL for user/company entitlements (300,000 ms)
export const entitlementCache = new TTLCache<any>(5 * 60 * 1000);

// 1-hour TTL for subscription plans metadata (3,600,000 ms)
export const planCache = new TTLCache<any>(60 * 60 * 1000);

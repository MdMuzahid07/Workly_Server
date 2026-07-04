/**
 * In-memory singleton for maintenance mode state.
 *
 * Why: avoids a DB round-trip on every single API request.
 * TTL is a 30s safety net for multi-instance deployments.
 * On single-instance (PM2 cluster), the cache is invalidated
 * instantly after every DB write via maintenanceCache.set().
 */

const CACHE_TTL_MS = 30_000;

interface CacheState {
  enabled: boolean;
  message: string;
  setAt: string | null;
  estimatedEnd: string | null;
  syncedAt: number;
}

let _state: CacheState = {
  enabled: false,
  message: "",
  setAt: null,
  estimatedEnd: null,
  syncedAt: 0,
};

export const maintenanceCache = {
  get: (): CacheState => _state,

  set: (
    enabled: boolean,
    message: string,
    setAt?: string | Date | null,
    estimatedEnd?: string | Date | null,
  ): void => {
    _state = {
      enabled,
      message,
      setAt: setAt ? new Date(setAt).toISOString() : null,
      estimatedEnd: estimatedEnd ? new Date(estimatedEnd).toISOString() : null,
      syncedAt: Date.now(),
    };
  },

  isStale: (): boolean => Date.now() - _state.syncedAt > CACHE_TTL_MS,

  /**
   * Force re-fetch on next request.
   * Call BEFORE a DB write if you want the next request to see DB truth.
   * In practice, call AFTER the write so the cache is immediately correct.
   */
  invalidate: (): void => {
    _state = { ..._state, syncedAt: 0 };
  },
};

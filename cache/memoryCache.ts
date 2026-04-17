type CacheItem<T> = {
  value: T;
  expiresAt: number;
};

const store = new Map<string, CacheItem<unknown>>();

export const getCache = <T>(key: string): T | null => {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.value as T;
};

export const setCache = <T>(key: string, value: T, ttlSeconds: number): void => {
  const safeTtl = Math.min(Math.max(ttlSeconds, 15), 30);
  store.set(key, {
    value,
    expiresAt: Date.now() + safeTtl * 1000
  });
};

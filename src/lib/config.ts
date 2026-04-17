const toNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const appConfig = {
  arubaBaseUrl: process.env.ARUBA_BASE_URL ?? "",
  arubaApiKey: process.env.ARUBA_API_KEY ?? "",
  pollingIntervalMs: toNumber(process.env.POLLING_INTERVAL, 20000),
  cacheTtlSeconds: toNumber(process.env.CACHE_TTL, 20),
  sqlitePath: process.env.SQLITE_DB_PATH ?? "./data/dashboard.sqlite"
};

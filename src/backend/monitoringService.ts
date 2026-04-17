import { memoryCache } from "@/cache/memoryCache";
import { getClientTrendLast24Hours, saveAlerts, saveMetricsSnapshot } from "@/db/repository";
import { arubaClient } from "@/lib/arubaClient";
import { appConfig } from "@/lib/config";
import {
  computeHealthScore,
  toAlertItems,
  toApSummary,
  toClientSummary,
  toGatewaySummary,
  toSwitchSummary
} from "@/lib/transformers";
import type { DashboardSummary } from "@/types/dashboard";

const withCache = async <T>(key: string, loader: () => Promise<T>): Promise<T> => {
  const cached = memoryCache.get<T>(key);
  if (cached) {
    return cached;
  }
  const fresh = await loader();
  memoryCache.set(key, fresh, appConfig.cacheTtlSeconds);
  return fresh;
};

export const getApData = () =>
  withCache("aps", async () => {
    const aps = await arubaClient.getAccessPoints();
    return toApSummary(aps);
  });

export const getSwitchData = () =>
  withCache("switches", async () => {
    const switches = await arubaClient.getSwitches();
    const portResponses = await Promise.all(
      switches.slice(0, 10).map((sw) => arubaClient.getSwitchPorts(String(sw.serial ?? "")))
    );
    return toSwitchSummary(switches, portResponses.flat());
  });

export const getGatewayData = () =>
  withCache("gateways", async () => {
    const gateways = await arubaClient.getGateways();
    return toGatewaySummary(gateways);
  });

export const getClientData = () =>
  withCache("clients", async () => {
    const clients = await arubaClient.getClients();
    const trend = getClientTrendLast24Hours();
    return toClientSummary(clients, trend);
  });

export const getAlertData = () =>
  withCache("alerts", async () => {
    const events = await arubaClient.getEvents();
    const alerts = toAlertItems(events);
    saveAlerts(alerts);
    return alerts;
  });

export const getDashboardSummary = () =>
  withCache<DashboardSummary>("summary", async () => {
    const [aps, switches, gateways, clients, latestAlerts] = await Promise.all([
      getApData(),
      getSwitchData(),
      getGatewayData(),
      getClientData(),
      getAlertData()
    ]);

    const health = computeHealthScore({
      apUp: aps.up,
      apTotal: aps.total,
      swUp: switches.up,
      swTotal: switches.total,
      gatewayOnline: gateways.online,
      gatewayTotal: gateways.online + gateways.offline
    });

    saveMetricsSnapshot({
      timestamp: new Date().toISOString(),
      ap_up: aps.up,
      ap_down: aps.down,
      clients: clients.total,
      switch_up: switches.up,
      switch_down: switches.down
    });

    return {
      healthScore: health.score,
      healthLevel: health.level,
      aps,
      switches,
      gateways,
      clients: {
        total: clients.total,
        connected: clients.connected,
        disconnected: clients.disconnected
      },
      latestAlerts
    };
  });

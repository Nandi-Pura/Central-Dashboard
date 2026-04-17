import { getCache, setCache } from "../cache/memoryCache";
import { arubaConfigState, arubaGet } from "./arubaClient";
import { getClientTrend, saveAlerts, saveMetricsSnapshot } from "../db/db";
import { DeviceHealthItem, TopUsageItem } from "../components/types";

type RawObj = Record<string, unknown>;

const CACHE_TTL_SECONDS = 30;

const statusStr = (v: unknown) => String(v ?? "").toLowerCase();

const arrayFromPayload = (payload: unknown): RawObj[] => {
  if (!payload || typeof payload !== "object") return [];
  const obj = payload as Record<string, unknown>;
  const candidate = obj.devices ?? obj.clients ?? obj.events ?? obj.data ?? obj.aps ?? obj.switches ?? obj.gateways ?? [];
  return Array.isArray(candidate) ? (candidate as RawObj[]) : [];
};

const mock = {
  aps: { total: 0, up: 0, down: 0, uplinkDown: 0, items: [], rawData: [] },
  switches: { total: 0, up: 0, down: 0, ports: { active: 0, error: 0, unused: 0 }, rawData: [] },
  clients: { total: 0, connected: 0, disconnected: 0, trend: [], networkCounts: {}, wirelessRaw: [] },
  gateways: { online: 0, offline: 0, tunnelHealthy: 0, tunnelIssue: 0, rawData: [] },
  alerts: [],
  topAps: [],
  topClients: []
};

const fromCache = async <T>(key: string, loader: () => Promise<T>): Promise<T> => {
  const cached = getCache<T>(key);
  if (cached) return cached;
  const fresh = await loader();
  setCache(key, fresh, CACHE_TTL_SECONDS);
  return fresh;
};

export const getApSummary = async () =>
  fromCache("api_aps", async () => {
    if (!arubaConfigState.hasAuth) return mock.aps;
    const payload = await arubaGet<unknown>("/monitoring/v2/aps?show_resource_details=true");
    const aps = arrayFromPayload(payload);
    const up = aps.filter((x) => statusStr(x.status) === "up" || statusStr(x.status) === "online").length;
    const down = aps.length - up;
    const uplinkDown = aps.filter((x) => statusStr(x.uplink_status) !== "up").length;
    const items = aps.slice(0, 30).map((ap, i) => {
      const rawStatus = statusStr(ap.status);
      const clients = Number(ap.client_count ?? ap.clients ?? 0);
      const qualityScore = Number(ap.health ?? ap.quality ?? 0);
      const health = qualityScore >= 80 ? "excellent" : qualityScore >= 60 ? "good" : qualityScore > 0 ? "fair" : rawStatus === "down" ? "offline" : "good";
      return {
        id: String(ap.serial ?? ap.macaddr ?? `ap-${i}`),
        name: String(ap.name ?? ap.hostname ?? `Access Point ${i + 1}`),
        location: String(ap.site ?? ap.group_name ?? "Unknown location"),
        clients,
        health,
        status: rawStatus === "up" ? "online" : rawStatus === "down" ? "offline" : "warning"
      };
    });
    return { total: aps.length, up, down, uplinkDown, items, rawData: aps };
  });

export const getSwitchSummary = async () =>
  fromCache("api_switches", async () => {
    if (!arubaConfigState.hasAuth) return mock.switches;
    const switchPayload = await arubaGet<unknown>("/monitoring/v1/switches");
    const switches = arrayFromPayload(switchPayload);
    const up = switches.filter((x) => statusStr(x.status) === "up").length;
    const down = switches.length - up;
    return {
      total: switches.length,
      up,
      down,
      ports: { active: 0, error: 0, unused: 0 }, // Reduced complexity on fetching loop for speed
      rawData: switches
    };
  });

export const getGatewaySummary = async () =>
  fromCache("api_gateways", async () => {
    if (!arubaConfigState.hasAuth) return mock.gateways;
    const payload = await arubaGet<unknown>("/monitoring/v1/gateways");
    const gateways = arrayFromPayload(payload);
    const online = gateways.filter((x) => statusStr(x.status) === "up").length;
    const offline = gateways.length - online;
    // Tunnel specific loop not implemented to ensure fast response, standard aggregate only
    return { online, offline, tunnelHealthy: online, tunnelIssue: offline, rawData: gateways };
  });

export const getClientSummary = async () =>
  fromCache("api_clients", async () => {
    if (!arubaConfigState.hasAuth) return mock.clients;
    const payloadWireless = await arubaGet<unknown>("/monitoring/v1/clients/wireless");
    const payloadWired = await arubaGet<unknown>("/monitoring/v1/clients/wired");
    
    const wClients = arrayFromPayload(payloadWireless);
    const wiredClients = arrayFromPayload(payloadWired);
    const clients = [...wClients, ...wiredClients];
    const connected = clients.length;
    
    const networkCounts: Record<string, number> = {};
    wClients.forEach(c => {
      const net = String(c.network ?? "Unknown SSID");
      networkCounts[net] = (networkCounts[net] || 0) + 1;
    });

    return {
      total: clients.length,
      connected,
      disconnected: 0,
      trend: await getClientTrend(),
      networkCounts,
      wirelessRaw: wClients,
      wiredRaw: wiredClients
    };
  });

export const getAlertsSummary = async () =>
  fromCache("api_alerts", async () => {
    if (!arubaConfigState.hasAuth) return mock.alerts;
    const payload = await arubaGet<unknown>("/monitoring/v2/events?sort=-timestamp");
    const events = arrayFromPayload(payload).slice(0, 12);
    const alerts = events.map((e, i) => {
      const severity = statusStr(e.level) === "critical" ? "high" : statusStr(e.level) === "warning" ? "medium" : "low";
      return {
        id: String(e.id ?? e.event_uuid ?? `event-${i}`),
        message: String(e.description ?? "Network alert"),
        severity,
        timestamp: String(e.timestamp ?? new Date().toISOString())
      };
    });
    await saveAlerts(alerts.map((a) => ({ message: a.message, severity: a.severity, timestamp: a.timestamp })));
    return alerts;
  });

export const getTopUsages = async () => 
  fromCache("api_top_usage", async () => {
    if (!arubaConfigState.hasAuth) return { topAps: mock.topAps, topClients: mock.topClients };
    
    const mapUsage = (data: unknown): TopUsageItem[] => {
      const arr = arrayFromPayload(data);
      return arr.slice(0, 5).map((x, i) => {
        const rx = Number(x.rx_data_bytes ?? 0);
        const tx = Number(x.tx_data_bytes ?? 0);
        return {
          id: String(x.serial ?? x.macaddr ?? `top-${i}`),
          name: String(x.name ?? `Unknown ${i}`),
          rxBytes: rx,
          txBytes: tx,
          totalBytes: rx + tx
        };
      }).sort((a,b) => b.totalBytes - a.totalBytes);
    };

    const [apUsage, clientUsage] = await Promise.all([
      arubaGet<unknown>("/monitoring/v2/aps/bandwidth_usage/topn"),
      arubaGet<unknown>("/monitoring/v1/clients/bandwidth_usage/topn")
    ]);

    return {
      topAps: mapUsage(apUsage),
      topClients: mapUsage(clientUsage)
    };
  });

export const getSummary = async () =>
  fromCache("api_summary", async () => {
    const [aps, switches, gateways, clients, alerts, topUsages] = await Promise.all([
      getApSummary(),
      getSwitchSummary(),
      getGatewaySummary(),
      getClientSummary(),
      getAlertsSummary(),
      getTopUsages()
    ]);

    await saveMetricsSnapshot({
      timestamp: new Date().toISOString(),
      ap_up: aps.up,
      ap_down: aps.down,
      clients: clients.total,
      switch_up: switches.up,
      switch_down: switches.down
    });

    const ratio = (good: number, total: number) => (total > 0 ? good / total : 1);
    const healthScore = Math.round(
      (ratio(aps.up, aps.total) * 0.4 +
        ratio(switches.up, switches.total) * 0.4 +
        ratio(gateways.online, gateways.online + gateways.offline) * 0.2) *
        100
    );

    const ssidDistribution = Object.entries(clients.networkCounts)
      .map(([ssid, count]) => ({ ssid, count }))
      .sort((a, b) => b.count - a.count);

    const getPtpnCount = (search: string) => 
      ssidDistribution.find(x => x.ssid.toUpperCase().includes(search.toUpperCase()))?.count ?? 0;

    const ptpnNetworks = {
      guest: getPtpnCount("PTPN-GUEST") + getPtpnCount("PTPN3-GUEST"),
      it: getPtpnCount("PTPN3-IT"),
      holding: getPtpnCount("PTPN3-HOLDING"),
      executive: getPtpnCount("PTPN3-EXECUTIVE")
    };

    // Calculate memory percentage safely
    const getMem = (free: unknown, total: unknown): number | "N/A" => {
      const f = Number(free);
      const t = Number(total);
      if (t > 0 && !isNaN(f)) return Math.round(((t - f) / t) * 100);
      return "N/A";
    };

    const deviceHealthList: DeviceHealthItem[] = [];

    // Push Gateways
    gateways.rawData.forEach(gw => {
      deviceHealthList.push({
        id: String(gw.serial ?? gw.macaddr),
        type: "Gateway",
        name: String(gw.name ?? gw.ip_address ?? "Gateway"),
        status: statusStr(gw.status) === "up" ? "UP" : "DOWN",
        uptime: gw.uptime ? `${Math.floor(Number(gw.uptime) / (3600*24))} days` : "N/A",
        cpu: typeof gw.cpu_utilization === 'number' ? gw.cpu_utilization : "N/A",
        memory: getMem(gw.mem_free, gw.mem_total)
      });
    });

    // Push Switches
    switches.rawData.forEach(sw => {
      deviceHealthList.push({
        id: String(sw.serial ?? sw.macaddr),
        type: "Switch",
        name: String(sw.name ?? sw.ip_address ?? "Switch"),
        status: statusStr(sw.status) === "up" ? "UP" : "DOWN",
        uptime: sw.uptime ? `${Math.floor(Number(sw.uptime) / (3600*24))} days` : "N/A",
        cpu: typeof sw.cpu_utilization === 'number' ? sw.cpu_utilization : "N/A",
        memory: getMem(sw.mem_free, sw.mem_total)
      });
    });

    // Push APs – v2 API with show_resource_details exposes cpu_utilization, mem_free, mem_total
    aps.rawData.slice(0, 15).forEach(ap => {
      const cpuVal = typeof ap.cpu_utilization === 'number' ? ap.cpu_utilization : (typeof ap.cpu_utilization === 'string' ? Number(ap.cpu_utilization) : null);
      const memPct = getMem(ap.mem_free, ap.mem_total);
      deviceHealthList.push({
        id: String(ap.serial ?? ap.macaddr),
        type: "Access Point",
        name: String(ap.name ?? "AP"),
        status: statusStr(ap.status) === "up" ? "UP" : "DOWN",
        uptime: ap.uptime ? `${Math.floor(Number(ap.uptime) / (3600*24))} days` : "N/A",
        cpu: cpuVal !== null ? cpuVal : "N/A",
        memory: memPct
      });
    });

    return {
      healthScore,
      healthLabel: healthScore >= 85 ? "green" : healthScore >= 60 ? "yellow" : "red",
      ptpnNetworks,
      ssidDistribution,
      topAps: topUsages.topAps,
      topClients: topUsages.topClients,
      deviceHealth: deviceHealthList,
      aps: { items: aps.items, total: aps.total, up: aps.up, down: aps.down, uplinkDown: aps.uplinkDown },
      switches: { total: switches.total, up: switches.up, down: switches.down, ports: switches.ports },
      gateways: { online: gateways.online, offline: gateways.offline, tunnelHealthy: gateways.tunnelHealthy, tunnelIssue: gateways.tunnelIssue },
      clients: { total: clients.total, connected: clients.connected, disconnected: clients.disconnected, trend: clients.trend },
      alerts: alerts
    };
  });

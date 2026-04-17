/* eslint-disable @typescript-eslint/no-explicit-any */
export type DeviceHealthItem = {
  id: string;
  type: "Gateway" | "Switch" | "Access Point";
  name: string;
  status: string;
  uptime: string | number;
  cpu: number | "N/A";
  memory: number | "N/A";
};

export type TopUsageItem = {
  id: string;
  name: string;
  rxBytes: number;
  txBytes: number;
  totalBytes: number;
};

export type SsidCount = {
  ssid: string;
  count: number;
};

export type DataState = {
  summary: {
    healthScore: number;
    healthLabel: string;
    ptpnNetworks: {
      guest: number;
      it: number;
      holding: number;
      executive: number;
    };
    ssidDistribution: SsidCount[];
    topAps: TopUsageItem[];
    topClients: TopUsageItem[];
    deviceHealth: DeviceHealthItem[];
  } | null;
  aps: {
    total: number;
    up: number;
    down: number;
    uplinkDown: number;
    items: { id: string; name: string; location: string; clients: number; health: string; status: string }[];
  } | null;
  switches: {
    total: number;
    up: number;
    down: number;
    ports: { active: number; error: number; unused: number };
  } | null;
  gateways: {
    online: number;
    offline: number;
    tunnelHealthy: number;
    tunnelIssue: number;
  } | null;
  clients: {
    total: number;
    connected: number;
    disconnected: number;
    trend: { timestamp: string; clients: number }[];
    wirelessRaw?: any[];
    wiredRaw?: any[];
  } | null;
  alerts: { id: string; message: string; severity: string; timestamp: string }[];
};

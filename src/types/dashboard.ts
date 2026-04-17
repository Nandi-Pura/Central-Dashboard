export type StatusLevel = "good" | "warning" | "critical" | "unknown";

export type StatusBreakdown = {
  total: number;
  up: number;
  down: number;
};

export type ApSummary = StatusBreakdown & {
  uplinkDown: number;
};

export type PortSummary = {
  active: number;
  error: number;
  unused: number;
};

export type SwitchSummary = StatusBreakdown & {
  ports: PortSummary;
};

export type GatewaySummary = {
  online: number;
  offline: number;
  tunnelHealthy: number;
  tunnelIssue: number;
};

export type ClientTrendPoint = {
  timestamp: string;
  value: number;
};

export type ClientSummary = {
  total: number;
  connected: number;
  disconnected: number;
  trend: ClientTrendPoint[];
};

export type AlertItem = {
  id: string;
  message: string;
  severity: "low" | "medium" | "high";
  timestamp: string;
};

export type DashboardSummary = {
  healthScore: number;
  healthLevel: StatusLevel;
  aps: ApSummary;
  switches: SwitchSummary;
  gateways: GatewaySummary;
  clients: Omit<ClientSummary, "trend">;
  latestAlerts: AlertItem[];
};

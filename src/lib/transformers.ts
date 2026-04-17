import type {
  AlertItem,
  ApSummary,
  ClientSummary,
  GatewaySummary,
  StatusLevel,
  SwitchSummary
} from "@/types/dashboard";

const normalizeStatus = (value: unknown): string => String(value ?? "").toLowerCase();

export const toApSummary = (aps: Record<string, unknown>[]): ApSummary => {
  const up = aps.filter((ap) => normalizeStatus(ap.status) === "up").length;
  const down = aps.length - up;
  const uplinkDown = aps.filter((ap) => normalizeStatus(ap.uplink_status) !== "up").length;
  return { total: aps.length, up, down, uplinkDown };
};

export const toSwitchSummary = (
  switches: Record<string, unknown>[],
  allPorts: Record<string, unknown>[]
): SwitchSummary => {
  const up = switches.filter((item) => normalizeStatus(item.status) === "up").length;
  const down = switches.length - up;
  const active = allPorts.filter((port) => normalizeStatus(port.status) === "up").length;
  const error = allPorts.filter((port) => normalizeStatus(port.status).includes("err")).length;
  const unused = Math.max(allPorts.length - active - error, 0);
  return {
    total: switches.length,
    up,
    down,
    ports: { active, error, unused }
  };
};

export const toGatewaySummary = (gateways: Record<string, unknown>[]): GatewaySummary => {
  const online = gateways.filter((item) => normalizeStatus(item.status) === "up").length;
  const offline = gateways.length - online;
  const tunnelHealthy = gateways.filter((item) => normalizeStatus(item.tunnel_status) === "up").length;
  const tunnelIssue = gateways.length - tunnelHealthy;
  return { online, offline, tunnelHealthy, tunnelIssue };
};

export const toClientSummary = (
  clients: Record<string, unknown>[],
  trend: { timestamp: string; value: number }[]
): ClientSummary => {
  const connected = clients.filter((item) => normalizeStatus(item.status) === "connected").length;
  const disconnected = clients.length - connected;
  return {
    total: clients.length,
    connected,
    disconnected,
    trend
  };
};

export const toAlertItems = (events: Record<string, unknown>[]): AlertItem[] => {
  return events.slice(0, 10).map((event, index) => {
    const severityRaw = normalizeStatus(event.severity);
    const severity = severityRaw === "critical" ? "high" : severityRaw === "warning" ? "medium" : "low";
    const description = String(event.description ?? event.event_description ?? "Network event detected");
    return {
      id: String(event.id ?? `event-${index}`),
      message: description,
      severity,
      timestamp: String(event.timestamp ?? new Date().toISOString())
    };
  });
};

export const computeHealthScore = (args: {
  apUp: number;
  apTotal: number;
  swUp: number;
  swTotal: number;
  gatewayOnline: number;
  gatewayTotal: number;
}): { score: number; level: StatusLevel } => {
  const ratio = (good: number, total: number) => (total === 0 ? 1 : good / total);
  const score = Math.round(
    (ratio(args.apUp, args.apTotal) * 0.4 +
      ratio(args.swUp, args.swTotal) * 0.4 +
      ratio(args.gatewayOnline, args.gatewayTotal) * 0.2) *
      100
  );
  const level: StatusLevel = score >= 85 ? "good" : score >= 60 ? "warning" : "critical";
  return { score, level };
};

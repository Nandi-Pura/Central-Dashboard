import { db, initDb } from "@/db/sqlite";
import type { AlertItem } from "@/types/dashboard";

initDb();

const insertMetricStmt = db.prepare(`
  INSERT INTO metrics_history (timestamp, ap_up, ap_down, clients, switch_up, switch_down)
  VALUES (@timestamp, @ap_up, @ap_down, @clients, @switch_up, @switch_down)
`);

const insertAlertStmt = db.prepare(`
  INSERT INTO alerts_log (message, severity, timestamp)
  VALUES (@message, @severity, @timestamp)
`);

export const saveMetricsSnapshot = (row: {
  timestamp: string;
  ap_up: number;
  ap_down: number;
  clients: number;
  switch_up: number;
  switch_down: number;
}): void => {
  insertMetricStmt.run(row);
};

export const getClientTrendLast24Hours = (): { timestamp: string; value: number }[] => {
  const stmt = db.prepare(`
    SELECT timestamp, clients as value
    FROM metrics_history
    WHERE timestamp >= datetime('now', '-1 day')
    ORDER BY timestamp ASC
  `);
  return stmt.all() as { timestamp: string; value: number }[];
};

export const saveAlerts = (alerts: AlertItem[]): void => {
  const tx = db.transaction((items: AlertItem[]) => {
    for (const alert of items) {
      insertAlertStmt.run({
        message: alert.message,
        severity: alert.severity,
        timestamp: alert.timestamp
      });
    }
  });
  tx(alerts);
};

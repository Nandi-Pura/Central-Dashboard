import fs from "node:fs";
import path from "node:path";
import initSqlJs, { type Database as SqlJsDatabase } from "sql.js";

const dataDir = path.join(process.cwd(), "data");
const dbPath = path.join(dataDir, "dashboard.sqlite");
const schemaPath = path.join(process.cwd(), "db", "schema.sql");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

type MetricsSnapshot = {
  timestamp: string;
  ap_up: number;
  ap_down: number;
  clients: number;
  switch_up: number;
  switch_down: number;
};

type AlertRow = { message: string; severity: string; timestamp: string };

let db: SqlJsDatabase | null = null;
let dbInitPromise: Promise<void> | null = null;
const memorySnapshots: MetricsSnapshot[] = [];
const memoryAlerts: AlertRow[] = [];

const persistDb = (): void => {
  if (!db) return;
  const data = Buffer.from(db.export());
  fs.writeFileSync(dbPath, data);
};

export const initDb = async (): Promise<void> => {
  if (db) return;
  if (dbInitPromise) return dbInitPromise;

  dbInitPromise = (async () => {
    try {
      const SQL = await initSqlJs();
      if (fs.existsSync(dbPath)) {
        const fileBuffer = fs.readFileSync(dbPath);
        db = new SQL.Database(fileBuffer);
      } else {
        db = new SQL.Database();
      }

      const schemaSql = fs.readFileSync(schemaPath, "utf8");
      db.exec(schemaSql);
      persistDb();
    } catch (error) {
      db = null;
      console.warn("[DB] SQL.js failed to initialize. Running with in-memory fallback.", error);
    }
  })();

  try {
    await dbInitPromise;
  } finally {
    dbInitPromise = null;
  }
};

void initDb();

export const saveMetricsSnapshot = async (snapshot: MetricsSnapshot): Promise<void> => {
  await initDb();
  if (!db) {
    memorySnapshots.push(snapshot);
    return;
  }
  db.run(
    "INSERT INTO metrics_history (timestamp, ap_up, ap_down, clients, switch_up, switch_down) VALUES (?, ?, ?, ?, ?, ?)",
    [snapshot.timestamp, snapshot.ap_up, snapshot.ap_down, snapshot.clients, snapshot.switch_up, snapshot.switch_down]
  );
  persistDb();
};

export const saveAlerts = async (alerts: AlertRow[]): Promise<void> => {
  await initDb();
  if (alerts.length === 0) return;
  if (!db) {
    memoryAlerts.push(...alerts);
    return;
  }
  db.exec("BEGIN TRANSACTION;");
  try {
    const stmt = db.prepare("INSERT INTO alerts_log (message, severity, timestamp) VALUES (?, ?, ?)");
    for (const alert of alerts) {
      stmt.run([alert.message, alert.severity, alert.timestamp]);
    }
    stmt.free();
    db.exec("COMMIT;");
    persistDb();
  } catch (error) {
    db.exec("ROLLBACK;");
    console.error("[DB] Failed inserting alerts", error);
  }
};

export const getClientTrend = async (): Promise<{ timestamp: string; clients: number }[]> => {
  await initDb();
  if (!db) {
    const from = Date.now() - 24 * 60 * 60 * 1000;
    return memorySnapshots
      .filter((row) => new Date(row.timestamp).getTime() >= from)
      .map((row) => ({ timestamp: row.timestamp, clients: row.clients }));
  }
  const query = db.exec(
    "SELECT timestamp, clients FROM metrics_history WHERE timestamp >= datetime('now', '-1 day') ORDER BY timestamp ASC"
  );
  if (query.length === 0) return [];
  const result = query[0];
  const timestampIdx = result.columns.indexOf("timestamp");
  const clientsIdx = result.columns.indexOf("clients");
  return result.values.map((row) => ({
    timestamp: String(row[timestampIdx] ?? ""),
    clients: Number(row[clientsIdx] ?? 0)
  }));
};

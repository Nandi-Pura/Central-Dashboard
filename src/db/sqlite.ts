import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { appConfig } from "@/lib/config";

const dbDirectory = path.dirname(appConfig.sqlitePath);
if (!fs.existsSync(dbDirectory)) {
  fs.mkdirSync(dbDirectory, { recursive: true });
}

export const db = new Database(appConfig.sqlitePath);

export const initDb = (): void => {
  const schemaPath = path.join(process.cwd(), "src/db/schema.sql");
  const schemaSql = fs.readFileSync(schemaPath, "utf8");
  db.exec(schemaSql);
};

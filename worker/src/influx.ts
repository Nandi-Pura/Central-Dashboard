import { InfluxDB, Point } from "@influxdata/influxdb-client";
import "dotenv/config";

const url = process.env.INFLUX_URL || "http://localhost:8086";
const token = process.env.INFLUX_TOKEN || "admin-token-123";
export const org = process.env.INFLUX_ORG || "central";
export const bucket = process.env.INFLUX_BUCKET || "dashboard";

export const influxDB = new InfluxDB({ url, token });
export const writeApi = influxDB.getWriteApi(org, bucket, "ns");

export { Point };

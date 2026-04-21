import type { NextApiRequest, NextApiResponse } from "next";
import { Redis } from "ioredis";

// Try to import influx, fallback gracefully
let queryApi: any = null;
let bucket = "dashboard";
try {
  const influx = require("../../src/db/influx");
  queryApi = influx.queryApi;
  bucket = influx.bucket;
} catch {}

// Rich fallback data for when InfluxDB has no data yet
function generateMockData() {
  const now = Date.now();
  return {
    healthScore: 100, healthLevel: "excellent", lastPollTime: new Date(now).toISOString(),
    dataAge: 0, summary: "Initializing dashboard telemetry...",
    aps: { up: 0, down: 0, total: 0, uplinkDown: 0 },
    switches: { up: 0, down: 0, total: 0 },
    gateways: { online: 0, offline: 0, total: 0 },
    clients: { connected: 0, wireless: 0, wired: 0, trend: [] },
    traffic: { rxGbps: 0, txGbps: 0, totalGbps: 0, trend: [] },
    kpis: { uptime: 100 }, alerts: [],
    aiInsights: [{ type: "info", message: "Waiting for Worker to populate cache..." }],
    ssidDistribution: [], rfHealth: { channelUtil24: 0, channelUtil5: 0, interference: 0, noiseFloor: 0, retryRate: 0 },
    topApps: [], topAps: [], topClients: [], networkDevices: []
  };
}

const redis = new Redis(process.env.REDIS_URL || "redis://redis:6379");
const CACHE_KEY = "aruba_summary_cache";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    let data: any;
    const cachedData = await redis.get(CACHE_KEY);
    if (cachedData) {
      data = JSON.parse(cachedData);
    } else {
      data = generateMockData();
    }

    // Check for stale data and trigger Influx fallback if needed
    const now = Date.now();
    const pollTime = data.lastPollTime ? new Date(data.lastPollTime).getTime() : 0;
    const dataAge = Math.floor((now - pollTime) / 1000);
    data.dataAge = dataAge;

    // FORCE REFRESH HANDLING
    const isForce = req.query.force === "true";
    if (isForce) {
      const cooldownKey = "aruba_force_refresh_cooldown";
      const onCooldown = await redis.get(cooldownKey);
      if (!onCooldown) {
          console.log("[Summary API] Manual Force Refresh Triggered. Signaling Worker...");
          await redis.set("aruba_force_refresh", "true", "EX", 30);
          await redis.set(cooldownKey, "active", "EX", 300); // 5 min cooldown for API safety
      }
    }

    if (queryApi && (dataAge > 2100 || !cachedData)) {
      console.log(`[Summary API] Triggering InfluxDB Fallback (Age: ${dataAge}s)`);
      data.isFallback = true;
      data.summary = "Displaying historical data from InfluxDB (Worker offline)";

      try {
        // Query Latest Network Health
        const healthQuery = `from(bucket: "${bucket}") 
          |> range(start: -1h) 
          |> filter(fn: (r) => r._measurement == "network_health")
          |> last()`;
        
        await new Promise((resolve) => {
          queryApi.queryRows(healthQuery, {
            next(row: any, tableMeta: any) {
              const r = tableMeta.toObject(row);
              if (r._field === "ap_up") data.aps.up = r._value;
              if (r._field === "ap_down") data.aps.down = r._value;
              if (r._field === "sw_up") data.switches.up = r._value;
              if (r._field === "sw_down") data.switches.down = r._value;
              if (r._field === "gateway_count") data.gateways.total = r._value;
            },
            error(err: any) { console.error("Health fallback failed", err); resolve(false); },
            complete() { resolve(true); }
          });
        });
        
        data.aps.total = data.aps.up + (data.aps.down || 0);
        data.switches.total = data.switches.up + (data.switches.down || 0);
        data.gateways.online = data.gateways.total; 

        // Query Latest Client Stats
        const clientStatQuery = `from(bucket: "${bucket}") 
          |> range(start: -1h) 
          |> filter(fn: (r) => r._measurement == "client_stats")
          |> last()`;
        
        await new Promise((resolve) => {
          queryApi.queryRows(clientStatQuery, {
            next(row: any, tableMeta: any) {
              const r = tableMeta.toObject(row);
              if (r._field === "connected_count") data.clients.connected = r._value;
            },
            error(err: any) { resolve(false); },
            complete() { resolve(true); }
          });
        });

      } catch (fallbackErr) {
        console.error("[Summary API] Critical Fallback Failure:", fallbackErr);
      }
    }

    // Hydrate Trends from InfluxDB if missing
    if (queryApi && (!data.clients?.trend?.length || !data.clients.trend[0]?.wireless)) {
      try {
        // Client Trend (Last 24h)
        const clientQuery = `from(bucket: "${bucket}") 
          |> range(start: -24h) 
          |> filter(fn: (r) => r._measurement == "client_stats")
          |> filter(fn: (r) => r._field == "connected_count")
          |> aggregateWindow(every: 1h, fn: max, createEmpty: false)
          |> yield(name: "max")`;
        
        const clientRows: any[] = [];
        await new Promise((resolve, reject) => {
          queryApi.queryRows(clientQuery, {
            next(row: any, tableMeta: any) { clientRows.push(tableMeta.toObject(row)); },
            error(err: any) { reject(err); },
            complete() { resolve(true); }
          });
        });

        if (clientRows.length > 0 && data.clients) {
            data.clients.trend = clientRows.map(r => ({
              time: r._time,
              count: r._value,
              wireless: Math.round(r._value * 0.8),
              wired: Math.round(r._value * 0.2)
            }));
        }

        // Traffic Trend (Last 24h)
        const trafficQuery = `from(bucket: "${bucket}") 
          |> range(start: -24h) 
          |> filter(fn: (r) => r._measurement == "client_stats")
          |> filter(fn: (r) => r._field == "traffic_rx" or r._field == "traffic_tx")
          |> aggregateWindow(every: 1h, fn: spread, createEmpty: false)
          |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")`;
        
        const trafficRows: any[] = [];
        await new Promise((resolve, reject) => {
          queryApi.queryRows(trafficQuery, {
            next(row: any, tableMeta: any) { trafficRows.push(tableMeta.toObject(row)); },
            error(err: any) { reject(err); },
            complete() { resolve(true); }
          });
        });

        if (trafficRows.length > 0 && data.traffic) {
          data.traffic.trend = trafficRows.map(r => {
            const rxGbps = ((r.traffic_rx || 0) / 1000000000) / 3600 * 8;
            const txGbps = ((r.traffic_tx || 0) / 1000000000) / 3600 * 8;
            return {
              time: r._time,
              rxGbps: Number(rxGbps.toFixed(3)),
              txGbps: Number(txGbps.toFixed(3))
            };
          });
          
          // Update aggregates in data object
          const last = data.traffic.trend[data.traffic.trend.length - 1];
          if (last) {
            data.traffic.rxGbps = last.rxGbps;
            data.traffic.txGbps = last.txGbps;
            data.traffic.totalGbps = Number((last.rxGbps + last.txGbps).toFixed(3));
          }
        }
      } catch (influxErr) {
        console.error("[Summary API] InfluxDB Query failed:", influxErr);
      }
    }

    res.setHeader("Cache-Control", "no-store");
    res.status(200).json(data);
  } catch (error: any) {
    console.error("[Summary API] Critical Failure:", error);
    res.status(200).json(generateMockData());
  }
}

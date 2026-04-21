import type { NextApiRequest, NextApiResponse } from "next";
import aruba from "../../src/lib/aruba";
import { Redis } from "ioredis";

const redis = new Redis(process.env.REDIS_URL || "redis://redis:6379");
const CACHE_KEY = "aruba_rf_health_cache";
const CACHE_TTL = 1800; // 30 minutes in seconds

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // 1. Try to get from cache first
    const cachedData = await redis.get(CACHE_KEY);
    if (cachedData) {
      return res.status(200).json(JSON.parse(cachedData));
    }

    // 2. Discovery: Get all APs and BSSIDs
    const [aps, bssids] = await Promise.all([
      aruba.client.get("/monitoring/v2/aps").then(r => r.data.devices || []),
      aruba.getBssids()
    ]);

    const activeAPs = aps.filter((a: any) => a.status === "Up" || a.status === "online");
    
    // 3. Aggregate: Fetch RF Summary for each active AP (limited to first 10 for performance/rate-limit)
    const rfSummaries = await Promise.all(
      activeAPs.slice(0, 10).map(async (ap: any) => {
        try {
          const [rf24, rf5] = await Promise.all([
            aruba.getApRfSummary(ap.serial, "2.4"),
            aruba.getApRfSummary(ap.serial, "5")
          ]);
          return {
            serial: ap.serial,
            name: ap.name,
            rf24,
            rf5
          };
        } catch (e) {
          return { serial: ap.serial, name: ap.name, error: "Failed to fetch RF stats" };
        }
      })
    );

    const result = {
      bssids,
      rfSummaries,
      lastUpdated: new Date().toISOString(),
      expiresAt: new Date(Date.now() + CACHE_TTL * 1000).toISOString()
    };

    // 4. Cache the result
    await redis.set(CACHE_KEY, JSON.stringify(result), "EX", CACHE_TTL);

    res.status(200).json(result);
  } catch (error: any) {
    console.error("[RF Health API] Error:", error);
    res.status(500).json({ error: "Failed to fetch RF health data" });
  }
}

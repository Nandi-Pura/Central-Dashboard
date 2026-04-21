import type { NextApiRequest, NextApiResponse } from "next";
import { Redis } from "ioredis";

const redis = new Redis(process.env.REDIS_URL || "redis://redis:6379");

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const [accessToken, ttl, expiresAt, refreshToken] = await Promise.all([
      redis.get("aruba_access_token"),
      redis.ttl("aruba_access_token"),
      redis.get("aruba_token_expires_at"),
      redis.get("aruba_refresh_token")
    ]);

    const status = {
      timestamp: new Date().toISOString(),
      token_status: accessToken ? "ACTIVE" : "MISSING",
      time_left_seconds: ttl > 0 ? ttl : 0,
      expires_at_epoch: expiresAt ? parseInt(expiresAt) : null,
      expires_at_human: expiresAt ? new Date(parseInt(expiresAt) * 1000).toISOString() : null,
      refresh_token_available: !!refreshToken,
      system_health: (accessToken && ttl > 600) ? "HEALTHY" : (accessToken) ? "PROACTIVE_REFRESH_REQUIRED" : "CRITICAL"
    };

    res.status(200).json(status);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

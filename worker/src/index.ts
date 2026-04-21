import { Redis } from "ioredis";
import "dotenv/config";
import { TokenManager } from "./TokenManager";
import { ArubaClient } from "./arubaClient";
import { RateLimiter } from "./RateLimiter";
import { Scheduler } from "./Scheduler";

async function main() {
  console.log("Starting Worker Service...");

  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
  const redis = new Redis(redisUrl);

  redis.on("error", (err) => console.error("Redis Client Error", err));
  
  const rateLimiter = new RateLimiter(redis, 5000);
  const tokenManager = new TokenManager(redis);
  
  // Seed Token early if possible
  await tokenManager.getValidToken();

  const client = new ArubaClient(tokenManager);
  
  const scheduler = new Scheduler(client, rateLimiter, redis);
  scheduler.start();
}

main().catch(console.error);

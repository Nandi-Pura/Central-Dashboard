import { Redis } from "ioredis";

export class RateLimiter {
  constructor(private redis: Redis, private maxReqs = 5000) {}

  async acquire(priority: number): Promise<boolean> {
    const key = `aruba_api_requests:${new Date().toISOString().split("T")[0]}`;
    const count = await this.redis.incr(key);

    if (count === 1) {
      // Set to expire in 24 hours plus a bit just in case
      await this.redis.expire(key, 86400 + 3600); 
    }

    // Hard stop
    if (count > this.maxReqs) {
      console.warn(`[RateLimiter] Max budget exceeded ${count}/${this.maxReqs}`);
      return false;
    }

    // Protect last 500 requests for priority 1 (Critical)
    if (priority > 1 && count > (this.maxReqs - 500)) {
      console.warn(`[RateLimiter] Reserving remaining budget for critical tasks ${count}/${this.maxReqs}`);
      return false;
    }

    return true;
  }
}

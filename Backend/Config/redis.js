import Redis from "ioredis";
import dotenv from "dotenv";
dotenv.config();

const redisClient = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
  retryStrategy: (times) => Math.min(times * 50, 2000),
  maxRetriesPerRequest: 3,
});

redisClient.on("connect", () => {
  console.log("Redis connected successfully");
});

redisClient.on("error", (err) => {
  console.error("Redis connection error:", err);
});

// Graceful shutdown
process.on("SIGINT", async () => {
  await redisClient.quit();
  process.exit(0);
});

export default redisClient;

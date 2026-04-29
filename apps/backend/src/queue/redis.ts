import IORedis from "ioredis";
import { env } from "../env.js";

export const redisConnection = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

redisConnection.on("error", (err) => {
  console.error("[redis] connection error", err.message);
});

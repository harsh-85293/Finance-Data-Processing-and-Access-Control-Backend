"use strict";

const Redis = require("ioredis");

let client = null;

function redisUrlConfigured() {
  const u = process.env.REDIS_URL;
  return typeof u === "string" && u.trim().length > 0;
}

/**
 * Shared ioredis client when REDIS_URL is set. Returns null otherwise (memory fallbacks).
 */
function getRedisClient() {
  if (!redisUrlConfigured()) {
    return null;
  }
  if (!client) {
    client = new Redis(process.env.REDIS_URL.trim(), {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        return Math.min(times * 50, 2000);
      },
    });
    client.on("error", (err) => {
      console.warn("[redis]", err.message);
    });
  }
  return client;
}

async function closeRedisClient() {
  if (client) {
    const c = client;
    client = null;
    await c.quit();
  }
}

module.exports = {
  getRedisClient,
  closeRedisClient,
  redisUrlConfigured,
};

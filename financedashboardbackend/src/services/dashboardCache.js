"use strict";

const crypto = require("crypto");
const { getRedisClient } = require("../config/redisClient");

const GEN_KEY = "financedash:cacheGen";
const KEY_PREFIX = "financedash:sum";

function parseTtlSec() {
  const raw = process.env.DASHBOARD_CACHE_TTL_SECONDS;
  const n = Number.parseInt(String(raw || ""), 10);
  if (Number.isFinite(n) && n > 0 && n <= 86400) {
    return n;
  }
  return 60;
}

function stableQueryKey(from, to, trend) {
  return JSON.stringify({
    from: from ? from.toISOString() : null,
    to: to ? to.toISOString() : null,
    trend,
  });
}

function hashQuery(stable) {
  return crypto.createHash("sha256").update(stable).digest("hex");
}

async function getCacheGen(redis) {
  const v = await redis.get(GEN_KEY);
  return v !== null && v !== undefined ? String(v) : "0";
}

/**
 * After any finance record create/update/soft-delete, bump generation so cached dashboard rows expire logically.
 */
async function bumpDashboardCacheGeneration() {
  const redis = getRedisClient();
  if (!redis) {
    return;
  }
  try {
    await redis.incr(GEN_KEY);
  } catch (err) {
    console.warn("[redis] dashboard cache bump failed:", err.message);
  }
}

/**
 * @returns {Promise<object|null>} parsed payload or null
 */
async function getCachedSummaryPayload(from, to, trend) {
  const redis = getRedisClient();
  if (!redis) {
    return null;
  }
  try {
    const gen = await getCacheGen(redis);
    const h = hashQuery(stableQueryKey(from, to, trend));
    const key = `${KEY_PREFIX}:${gen}:${h}`;
    const raw = await redis.get(key);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.warn("[redis] dashboard cache get failed:", err.message);
    return null;
  }
}

async function setCachedSummaryPayload(from, to, trend, payload) {
  const redis = getRedisClient();
  if (!redis) {
    return;
  }
  try {
    const gen = await getCacheGen(redis);
    const h = hashQuery(stableQueryKey(from, to, trend));
    const key = `${KEY_PREFIX}:${gen}:${h}`;
    const ttl = parseTtlSec();
    await redis.setex(key, ttl, JSON.stringify(payload));
  } catch (err) {
    console.warn("[redis] dashboard cache set failed:", err.message);
  }
}

module.exports = {
  bumpDashboardCacheGeneration,
  getCachedSummaryPayload,
  setCachedSummaryPayload,
};

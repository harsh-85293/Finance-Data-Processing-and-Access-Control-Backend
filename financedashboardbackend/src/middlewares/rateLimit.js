"use strict";

const rateLimit = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const { getRedisClient } = require("../config/redisClient");

const windowMs = 15 * 60 * 1000;

const skipInTest = () => process.env.NODE_ENV === "test";

function parseMax(env, fallback) {
  const n = parseInt(env || "", 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function buildSendCommand() {
  const redis = getRedisClient();
  if (!redis) {
    return null;
  }
  return (command, ...args) => redis.call(command, ...args);
}

/** Stricter limit for /api/auth (login, register, etc.) to slow brute-force attempts. */
const authLimiter = (() => {
  const sendCommand = buildSendCommand();
  const store = sendCommand
    ? new RedisStore({
        sendCommand: (command, ...args) => sendCommand(command, ...args),
        prefix: "rl_auth:",
      })
    : undefined;

  return rateLimit({
    windowMs,
    max: parseMax(process.env.RATE_LIMIT_AUTH_MAX, 60),
    standardHeaders: true,
    legacyHeaders: false,
    skip: skipInTest,
    message: { message: "Too many requests, please try again later." },
    ...(store ? { store } : {}),
  });
})();

/** General limit for authenticated API usage (users, finance, dashboard). */
const apiLimiter = (() => {
  const sendCommand = buildSendCommand();
  const store = sendCommand
    ? new RedisStore({
        sendCommand: (command, ...args) => sendCommand(command, ...args),
        prefix: "rl_api:",
      })
    : undefined;

  return rateLimit({
    windowMs,
    max: parseMax(process.env.RATE_LIMIT_API_MAX, 300),
    standardHeaders: true,
    legacyHeaders: false,
    skip: skipInTest,
    message: { message: "Too many requests, please try again later." },
    ...(store ? { store } : {}),
  });
})();

module.exports = { authLimiter, apiLimiter };

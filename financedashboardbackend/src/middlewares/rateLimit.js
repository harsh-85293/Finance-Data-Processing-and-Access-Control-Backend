const rateLimit = require("express-rate-limit");

const windowMs = 15 * 60 * 1000;

const skipInTest = () => process.env.NODE_ENV === "test";

function parseMax(env, fallback) {
  const n = parseInt(env || "", 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** Stricter limit for /api/auth (login, register, etc.) to slow brute-force attempts. */
const authLimiter = rateLimit({
  windowMs,
  max: parseMax(process.env.RATE_LIMIT_AUTH_MAX, 60),
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
  message: { message: "Too many requests, please try again later." },
});

/** General limit for authenticated API usage (users, finance, dashboard). */
const apiLimiter = rateLimit({
  windowMs,
  max: parseMax(process.env.RATE_LIMIT_API_MAX, 300),
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
  message: { message: "Too many requests, please try again later." },
});

module.exports = { authLimiter, apiLimiter };

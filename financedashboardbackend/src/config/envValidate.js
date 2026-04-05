"use strict";

function assertProductionEnv() {
  if (process.env.NODE_ENV !== "production") {
    return;
  }
  const secret = process.env.JWT_SECRET || "";
  const minLen = Number.parseInt(process.env.JWT_SECRET_MIN_LENGTH || "32", 10);
  const required = Number.isFinite(minLen) && minLen > 0 ? minLen : 32;
  if (secret.length < required) {
    throw new Error(
      `JWT_SECRET must be at least ${required} characters in production (set JWT_SECRET_MIN_LENGTH to override).`
    );
  }
}

module.exports = { assertProductionEnv };

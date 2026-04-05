"use strict";

const mongoose = require("mongoose");

function parsePositiveInt(value, fallback) {
  const n = Number.parseInt(String(value), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function parseNonNegativeInt(value, fallback) {
  const n = Number.parseInt(String(value), 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

async function connectDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set");
  }
  if (mongoose.connection.readyState === 1) {
    return;
  }
  mongoose.set("strictQuery", true);

  const maxPoolSize = parsePositiveInt(process.env.MONGODB_MAX_POOL_SIZE, 10);
  const minPoolSize = parseNonNegativeInt(process.env.MONGODB_MIN_POOL_SIZE, 0);
  const serverSelectionTimeoutMS = parsePositiveInt(
    process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS,
    10000
  );

  await mongoose.connect(uri, {
    maxPoolSize,
    minPoolSize,
    serverSelectionTimeoutMS,
  });
  // eslint-disable-next-line no-console -- startup confirmation
  console.log("MongoDB connected");
}

function isMongoConnected() {
  return mongoose.connection.readyState === 1;
}

async function disconnectDb() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
}

module.exports = { connectDb, isMongoConnected, disconnectDb };

const mongoose = require("mongoose");

async function connectDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set");
  }
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }
  mongoose.set("strictQuery", true);
  return mongoose.connect(uri);
}

module.exports = { connectDb };

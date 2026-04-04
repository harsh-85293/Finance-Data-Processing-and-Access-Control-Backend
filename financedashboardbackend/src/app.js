const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const { connectDb } = require("./config/db");
const authRoutes = require("./routes/auth");
const usersRoutes = require("./routes/users");
const financeRoutes = require("./routes/finance");
const dashboardRoutes = require("./routes/dashboard");

const app = express();

const allowedOrigins = new Set([
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);
if (process.env.CLIENT_ORIGIN) {
  allowedOrigins.add(process.env.CLIENT_ORIGIN.trim());
}
if (process.env.VERCEL_URL) {
  allowedOrigins.add(`https://${process.env.VERCEL_URL}`);
}

app.use(
  cors({
    origin(origin, cb) {
      if (!origin) {
        return cb(null, true);
      }
      if (allowedOrigins.has(origin)) {
        return cb(null, true);
      }
      return cb(null, false);
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

app.get("/", (req, res) => {
  res.json({ ok: true, health: "/api/health" });
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.use(async (req, res, next) => {
  try {
    await connectDb();
    next();
  } catch (err) {
    next(err);
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/finance/records", financeRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.use((req, res) => {
  res.status(404).json({ message: "Not found" });
});

app.use((err, req, res, _next) => {
  if (err && err.code === 11000) {
    const field = err.keyPattern ? Object.keys(err.keyPattern)[0] : "field";
    return res.status(409).json({ message: `Duplicate ${field}` });
  }
  if (err && err.name === "ValidationError") {
    const details = Object.values(err.errors || {}).map((e) => e.message);
    return res.status(400).json({ message: "Validation failed", details });
  }
  if (err && err.name === "CastError") {
    return res.status(400).json({ message: "Invalid id or value" });
  }
  console.error(err);
  return res.status(500).json({ message: "Internal server error" });
});

module.exports = app;

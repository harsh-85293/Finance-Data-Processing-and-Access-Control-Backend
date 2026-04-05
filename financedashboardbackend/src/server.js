require("dotenv").config();
const http = require("http");
const app = require("./app");
const { connectDb, disconnectDb } = require("./config/db");
const { closeRedisClient } = require("./config/redisClient");

const port = Number(process.env.PORT) || 4000;

async function main() {
  await connectDb();
  const server = http.createServer(app);
  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(
        `Port ${port} is already in use. Stop the other server (Ctrl+C in that terminal) or set PORT to another value in .env.`
      );
    } else {
      console.error(err);
    }
    process.exit(1);
  });
  server.listen(port, () => {
    // eslint-disable-next-line no-console -- startup confirmation
    console.log(`Listening on ${port}`);
  });

  const shutdown = (signal) => {
    // eslint-disable-next-line no-console -- ops signal
    console.log(`${signal}: closing HTTP server…`);
    server.close(async (closeErr) => {
      if (closeErr) {
        console.error(closeErr);
        process.exit(1);
      }
      await closeRedisClient().catch(() => {});
      await disconnectDb();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.once("SIGTERM", () => shutdown("SIGTERM"));
  process.once("SIGINT", () => shutdown("SIGINT"));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

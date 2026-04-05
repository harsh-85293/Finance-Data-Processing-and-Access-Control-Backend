require("dotenv").config();
const http = require("http");
const app = require("./app");
const { connectDb } = require("./config/db");

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
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

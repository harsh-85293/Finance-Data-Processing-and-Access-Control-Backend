require("dotenv").config();
const http = require("http");
const app = require("./app");
const { connectDb } = require("./config/db");

const port = Number(process.env.PORT) || 4000;

async function main() {
  await connectDb();
  const server = http.createServer(app);
  server.listen(port, () => {
    console.log(`Listening on ${port}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

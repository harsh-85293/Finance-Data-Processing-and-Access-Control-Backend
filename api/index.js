const path = require("path");
const backend = path.join(__dirname, "..", "financedashboardbackend");
const serverless = require(require.resolve("serverless-http", { paths: [backend] }));
const app = require(path.join(backend, "src", "app"));

module.exports = serverless(app);

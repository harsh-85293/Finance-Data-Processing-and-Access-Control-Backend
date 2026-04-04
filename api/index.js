const serverless = require("serverless-http");
const app = require("../financedashboardbackend/src/app");

module.exports = serverless(app);

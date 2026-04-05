const { test } = require("node:test");
const assert = require("node:assert");
const request = require("supertest");

test("health", async () => {
  const app = require("../src/app");
  const res = await request(app).get("/api/health");
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.ok, true);
});

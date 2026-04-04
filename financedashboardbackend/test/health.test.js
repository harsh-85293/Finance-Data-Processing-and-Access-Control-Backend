const { test } = require("node:test");
const assert = require("node:assert");
const request = require("supertest");
const app = require("../src/app");

test("health", async () => {
  const res = await request(app).get("/api/health");
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.ok, true);
});

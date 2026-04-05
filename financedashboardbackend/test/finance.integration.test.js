"use strict";

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert");
const request = require("supertest");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

const { User } = require("../src/models/user");
const { FinancialRecord } = require("../src/models/financialRecord");
const { signUserToken } = require("../src/utils/token");

let mongoServer;
let app;

before(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri();
  process.env.JWT_SECRET = "test-jwt-secret-for-automated-tests";
  process.env.NODE_ENV = "test";
  await mongoose.connect(process.env.MONGODB_URI);
  delete require.cache[require.resolve("../src/app")];
  app = require("../src/app");
});

after(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

beforeEach(async () => {
  await User.deleteMany({});
  await FinancialRecord.deleteMany({});
});

test("DELETE soft-deletes record; GET returns 404; dashboard excludes it", async () => {
  const admin = await User.create({
    email: "admin@test.com",
    passwordHash: await User.hashPassword("password123!"),
    name: "Admin",
    role: "admin",
    status: "active",
  });

  const token = signUserToken(admin.id);

  const createRes = await request(app)
    .post("/api/finance/records")
    .set("Authorization", `Bearer ${token}`)
    .send({
      amount: 50,
      type: "income",
      category: "test-cat",
      date: "2026-04-01",
      notes: "before delete",
    })
    .expect(201);

  const recordId = createRes.body.record.id;

  await request(app)
    .delete(`/api/finance/records/${recordId}`)
    .set("Authorization", `Bearer ${token}`)
    .expect(200);

  await request(app)
    .get(`/api/finance/records/${recordId}`)
    .set("Authorization", `Bearer ${token}`)
    .expect(404);

  const stillInDb = await FinancialRecord.findById(recordId);
  assert.ok(stillInDb);
  assert.ok(stillInDb.deletedAt instanceof Date);

  const dash = await request(app)
    .get("/api/dashboard/summary")
    .set("Authorization", `Bearer ${token}`)
    .expect(200);

  assert.strictEqual(dash.body.summary.totalIncome, 0);
});

test("GET /api/finance/records returns 403 for viewer", async () => {
  const viewer = await User.create({
    email: "viewer-fin@test.com",
    passwordHash: await User.hashPassword("password123!"),
    name: "Viewer",
    role: "viewer",
    status: "active",
  });

  const token = signUserToken(viewer.id);

  await request(app)
    .get("/api/finance/records")
    .set("Authorization", `Bearer ${token}`)
    .expect(403);
});

test("GET /api/finance/records filters by type", async () => {
  const admin = await User.create({
    email: "admin-filter@test.com",
    passwordHash: await User.hashPassword("password123!"),
    name: "Admin",
    role: "admin",
    status: "active",
  });

  const token = signUserToken(admin.id);

  await request(app)
    .post("/api/finance/records")
    .set("Authorization", `Bearer ${token}`)
    .send({
      amount: 10,
      type: "income",
      category: "a",
      date: "2026-04-01",
      notes: "",
    })
    .expect(201);

  await request(app)
    .post("/api/finance/records")
    .set("Authorization", `Bearer ${token}`)
    .send({
      amount: 5,
      type: "expense",
      category: "b",
      date: "2026-04-02",
      notes: "",
    })
    .expect(201);

  const res = await request(app)
    .get("/api/finance/records?type=income")
    .set("Authorization", `Bearer ${token}`)
    .expect(200);

  assert.strictEqual(res.body.data.length, 1);
  assert.strictEqual(res.body.data[0].type, "income");
});

test("POST /api/finance/records returns 400 for invalid amount", async () => {
  const admin = await User.create({
    email: "admin-val@test.com",
    passwordHash: await User.hashPassword("password123!"),
    name: "Admin",
    role: "admin",
    status: "active",
  });

  const token = signUserToken(admin.id);

  const res = await request(app)
    .post("/api/finance/records")
    .set("Authorization", `Bearer ${token}`)
    .send({
      amount: -1,
      type: "income",
      category: "x",
      date: "2026-04-01",
    })
    .expect(400);

  assert.ok(res.body.message);
});

test("GET /api/dashboard/summary returns summary shape", async () => {
  const admin = await User.create({
    email: "admin-dash@test.com",
    passwordHash: await User.hashPassword("password123!"),
    name: "Admin",
    role: "admin",
    status: "active",
  });

  const token = signUserToken(admin.id);

  const res = await request(app)
    .get("/api/dashboard/summary")
    .set("Authorization", `Bearer ${token}`)
    .expect(200);

  assert.ok("totalIncome" in res.body.summary);
  assert.ok("totalExpense" in res.body.summary);
  assert.ok("netBalance" in res.body.summary);
  assert.ok(Array.isArray(res.body.categoryTotals));
  assert.ok(Array.isArray(res.body.recentActivity));
  assert.ok(res.body.trends && res.body.trends.buckets);
});

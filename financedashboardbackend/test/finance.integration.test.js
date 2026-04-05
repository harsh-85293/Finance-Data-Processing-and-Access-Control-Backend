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

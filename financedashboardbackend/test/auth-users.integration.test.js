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
  process.env.NODE_ENV = "test";
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri();
  process.env.JWT_SECRET = "test-jwt-secret-for-automated-tests";
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

test("GET /api/health", async () => {
  const res = await request(app).get("/api/health").expect(200);
  assert.strictEqual(res.body.ok, true);
});

test("GET /api/health/ready returns 200 when database is up", async () => {
  const res = await request(app).get("/api/health/ready").expect(200);
  assert.strictEqual(res.body.ok, true);
  assert.strictEqual(res.body.db, "connected");
});

test("responses include X-Request-Id", async () => {
  const res = await request(app).get("/api/health").expect(200);
  assert.ok(res.headers["x-request-id"], "expected X-Request-Id header");
});

test("first POST /api/auth/register becomes admin", async () => {
  const res = await request(app)
    .post("/api/auth/register")
    .send({
      email: "first@test.com",
      password: "password123!",
      name: "First",
    })
    .expect(201);
  assert.strictEqual(res.body.user.role, "admin");
  assert.strictEqual(res.body.notice, undefined);
});

test("POST /api/auth/register ignores role for subsequent users and returns notice", async () => {
  await User.create({
    email: "existing@test.com",
    passwordHash: await User.hashPassword("password123!"),
    name: "Existing",
    role: "admin",
    status: "active",
  });

  const res = await request(app)
    .post("/api/auth/register")
    .send({
      email: "second@test.com",
      password: "password123!",
      name: "Second",
      role: "admin",
    })
    .expect(201);

  assert.strictEqual(res.body.user.role, "viewer");
  assert.ok(res.body.notice);
  assert.ok(res.body.notice.includes("ignored"));
});

test("POST /api/users as admin sets role on new user", async () => {
  const admin = await User.create({
    email: "admin@test.com",
    passwordHash: await User.hashPassword("password123!"),
    name: "Admin",
    role: "admin",
    status: "active",
  });

  const token = signUserToken(admin.id);

  const res = await request(app)
    .post("/api/users")
    .set("Authorization", `Bearer ${token}`)
    .send({
      email: "analyst@test.com",
      password: "password123!",
      name: "Analyst Person",
      role: "analyst",
    })
    .expect(201);

  assert.strictEqual(res.body.user.role, "analyst");
});

test("POST /api/auth/register returns 409 when email already exists", async () => {
  await User.create({
    email: "taken@test.com",
    passwordHash: await User.hashPassword("password123!"),
    name: "Taken",
    role: "viewer",
    status: "active",
  });

  await request(app)
    .post("/api/auth/register")
    .send({
      email: "taken@test.com",
      password: "password123!",
      name: "Dup",
    })
    .expect(409);
});

test("POST /api/users as viewer returns 403", async () => {
  const viewer = await User.create({
    email: "viewer@test.com",
    passwordHash: await User.hashPassword("password123!"),
    name: "Viewer",
    role: "viewer",
    status: "active",
  });

  const token = signUserToken(viewer.id);

  await request(app)
    .post("/api/users")
    .set("Authorization", `Bearer ${token}`)
    .send({
      email: "blocked@test.com",
      password: "password123!",
      name: "Blocked",
      role: "admin",
    })
    .expect(403);
});

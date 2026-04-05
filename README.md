# Finance dashboard backend
- Clone for Finance Data Processing and Access Control Backend.
```bash
git clone <repo-url>
cd <repo-directory>
```

## Quick start
- This project uses npm as a package manager. 
```bash
npm install
cp financedashboardbackend/.env.example financedashboardbackend/.env
```

Set **`MONGODB_URI`** and **`JWT_SECRET`** in `financedashboardbackend/.env` (use a long random secret in production).
```bash
npm test -w financedashboardbackend
npm run dev -w financedashboardbackend
```

`GET http://localhost:4000/api/health` → `{ "ok": true }`.

## Development (lint & format)
From the repo root:
```bash
npm run lint
npm run format:check
npm run format
```

CI runs lint and format check before tests.

## Architecture (request flow)
```text
HTTP client
  → Express (financedashboardbackend/src/app.js)
  → X-Request-Id, cors, compression, json, cookie-parser
  → connectDb (MongoDB, pooled connection)
  → optional Redis if REDIS_URL (rate limits + dashboard cache)
  → /api → requireAuth / requireRoles
  → handler → services → Mongoose → JSON
```

**Layers:** routes are thin; services own validation and queries; models + indexes in `src/models/`.
Deeper diagrams: **[system design](docs/system-design.md)** (§4.1 HLD, §5.2 sequence).

**Ops:** Stateless JWT, optional Mongo pool env vars, gzip, `X-Request-Id`, `/api/health` vs `/api/health/ready`, graceful shutdown. Optional **`REDIS_URL`** shares rate-limit state and caches dashboard summaries (TTL; invalidated on finance writes). Without Redis, limits are in-memory and the dashboard hits Mongo every time. Kafka isn’t in this repo.

## RBAC matrix (simplified)

| Area | viewer | analyst | admin |
|------|:------:|:-------:|:-----:|
| `GET /api/dashboard/summary` | ✓ | ✓ | ✓ |
| `GET /api/finance/records`, `GET .../:id` | ✗ | ✓ | ✓ |
| `POST` / `PATCH` / `DELETE /api/finance/records` | ✗ | ✗ | ✓ |
| `/api/users/*` | ✗ | ✗ | ✓ |
| `POST /api/auth/register`, `POST /api/auth/login`, … | ✓ | ✓ | ✓ |

Inactive users get **403** on protected routes.

## Security notes
- Passwords: **bcrypt** hashes; never returned in JSON.  
- JWT: signed with **`JWT_SECRET`**; **`Authorization: Bearer`** or httpOnly **`token`** cookie.  
- Rate limits on `/api/auth` and other `/api` groups (off when `NODE_ENV=test`). With **`REDIS_URL`**, limits use Redis across instances.  
- Don’t commit **`financedashboardbackend/.env`** — use **`.env.example`**.

## Security hardening
Rough notes for reviewers—not a pentest. You still need HTTPS in front of the app, locked-down Atlas/Redis, and secrets only in the host env.

| Issue | What we did |
|------|-------------|
| Short `JWT_SECRET` in production | Process exits on startup if `NODE_ENV=production` and secret shorter than 32 chars (`JWT_SECRET_MIN_LENGTH` overrides). See `src/config/envValidate.js`. |
| JWT algorithm tricks | Sign + verify with **HS256** only (`token.js`, `auth.js`). |
| NoSQL injection via `$` in input | **`express-mongo-sanitize`** on body/query/params after JSON parsing. |
| Bare minimum HTTP headers | **`helmet`** (CSP off for this JSON API; CORP off so CORS + cookies still work). |
| Cookie scope | `httpOnly`, `secure` in prod, `SameSite` strict/lax, `path: '/'`. |
| Leaking stack traces on 500 | Clients get a generic message; details go to server logs (with `X-Request-Id` when present). |
| Brute force on auth | Stricter rate limit on `/api/auth`; optional Redis for shared counters. |
| Wildcard CORS | Only listed origins (`localhost:3000`, `CLIENT_ORIGIN`, `VERCEL_URL`). |

Not built here: MFA, OAuth, refresh rotation, email verification, automated `npm audit` in CI, WAF. Run **`npm audit`** yourself and set **`NODE_ENV=production`** on live servers.

## Finance soft delete

Deletes set **`deletedAt`**; lists and dashboard math only see active rows (`deletedAt: null`).

## Database (modeling)

MongoDB + Mongoose: **`users`** and **`financialrecords`**, with indexes for filters and dashboard queries. More in **[system design](docs/system-design.md)**.

### MongoDB Atlas + Compass (example)

Screenshots below are from **MongoDB Compass** against an **Atlas** cluster on **AWS** (not a local `mongod`). Your URI and data will differ.

<img src="docs/images/mongo-compass-users.png" alt="Compass: users" width="920" />

<img src="docs/images/mongo-compass-financialrecords.png" alt="Compass: financialrecords" width="920" />

## Documentation
- **[System design](docs/system-design.md)** — HLD/LLD, workflows, data model (Mermaid in §4.1, §5.2).  
- **[Feature checklist](docs/feature-checklist.md)** — Feature table.  
- **[openapi.yaml](docs/openapi.yaml)** — Route sketch + cross-cutting behaviour.  
- **[API Testing](API%20Testing.md)** — Postman-style steps; `api-testing-images/` has screenshots.  
- **`docs/images/`** — Compass PNGs above.

## Running it locally

See **`.env.example`** for `PORT`, `JWT_EXPIRES_IN`, `CLIENT_ORIGIN`, optional **`REDIS_URL`**, Mongo pool vars, rate limits.

```bash
npm run dev -w financedashboardbackend
```

```bash
npm test -w financedashboardbackend
```

```bash
npm start -w financedashboardbackend
```

## Deploying

**Vercel:** repo root, set `MONGODB_URI`, `JWT_SECRET`, optional `CLIENT_ORIGIN` / `REDIS_URL`, deploy from `main`.

**Other hosts:** `npm ci` at root, `npm start -w financedashboardbackend`, or run from `financedashboardbackend/` with `npm start`. Render etc. set `PORT`.

## Auth

Register/login set httpOnly **`token`** and return the user. Protected routes also accept **`Authorization: Bearer`**. **`POST /api/auth/logout`** clears the cookie. Missing `JWT_SECRET` fails loudly on purpose.

## Roles (quick reference)

- **viewer** — dashboard summary only  
- **analyst** — read finance + summary  
- **admin** — finance CRUD + users  

First **`POST /api/auth/register`** on an empty DB becomes **admin**; later self-registrations are **viewer**. Public register ignores `role`. Admins create other roles via **`POST /api/users`**.

Shared dataset — no multi-tenancy.

## Routes

All under `/api`. Use `Content-Type: application/json`.

**Auth:** `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`

**Users (admin):** `GET/POST /users`, `PATCH /users/:id`

**Finance:** `/finance/records` — read for analyst/admin; writes admin only. Filters: `type`, `category`, `dateFrom`/`dateTo`, `page`/`limit`. Soft delete via **`deletedAt`**.

**Rate limits:** defaults 60/15m on auth, 300/15m on other `/api` (override with env). Skipped in tests. **`REDIS_URL`** + **`rate-limit-redis`** for multiple nodes. **`TRUST_PROXY=1`** behind a reverse proxy if needed.

**Dashboard:** `GET /dashboard/summary` with optional `dateFrom`, `dateTo`, `trend`. Redis may cache responses when configured (`DASHBOARD_CACHE_TTL_SECONDS`).

**Health:** `GET /` → `{ ok, health }`. **`GET /api/health`** (no DB). **`GET /api/health/ready`** (needs Mongo). Responses include **`X-Request-Id`**.

## Example snippets

```http
POST /api/auth/register
Content-Type: application/json

{"email":"you@example.com","password":"yourpassword","name":"You"}
```

```http
POST /api/finance/records
Cookie: token=<jwt>
Content-Type: application/json

{"amount":120.5,"type":"income","category":"salary","date":"2026-04-01","notes":"April"}
```

## Scope choices
Single DB, single org. First signup bootstraps admin. Bcrypt passwords only, no OAuth. CORS locked to known origins; API clients without `Origin` still work.

## Tradeoffs
One auth story (cookie + optional Bearer) keeps browser and CLI clients simple; cookie `Secure`/`SameSite` must match how the frontend is hosted. Mongo stays flexible; referential checks are in code. Vercel uses the same app in serverless (cold starts). Workspace layout matches how Vercel installs. Dashboard uses aggregations—fine at moderate size; indexes and optional Redis cache help. Category filter is exact match (case-insensitive), not fuzzy search.

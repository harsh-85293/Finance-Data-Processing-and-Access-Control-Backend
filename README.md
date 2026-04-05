# Finance dashboard backend

Express + MongoDB API for a small finance dashboard: JWT auth, role-based access, and aggregated summaries. The app itself lives in `financedashboardbackend/`; there’s a root `package.json` with npm workspaces so `node_modules` lines up for local dev and for Vercel. The Vercel entry is `api/index.js` — it wraps the same Express app with `serverless-http`.

You’ll need Node 18+, MongoDB the app can reach, and **npm** (there’s a `package-lock.json` at the repo root).

## Quick start

```bash
git clone <repo-url>
cd <repo-directory>
npm install
cp financedashboardbackend/.env.example financedashboardbackend/.env
```

Edit `financedashboardbackend/.env`: set **`MONGODB_URI`** and **`JWT_SECRET`** (long random string in production).

```bash
npm test -w financedashboardbackend
npm run dev -w financedashboardbackend
```

Open `GET http://localhost:4000/api/health` — expect `{ "ok": true }`.

## Development (lint & format)

ESLint and Prettier are configured for the backend workspace and `api/index.js`. From the repo root:

```bash
npm run lint
npm run format:check
npm run format
```

CI runs `lint` and `format:check` before tests.

## Architecture (request flow)

```text
HTTP client
  → Express (financedashboardbackend/src/app.js)
  → X-Request-Id, cors, compression, json, cookie-parser
  → connectDb (MongoDB, pooled connection)
  → optional Redis (if REDIS_URL): rate-limit store + dashboard cache
  → /api route → middleware (requireAuth, requireRoles)
  → route handler → service (validation + business rules)
  → Mongoose model → JSON response
```

- **Routes** (`src/routes/`) — HTTP only: parse input, call services, map status/body.  
- **Services** (`src/services/`) — Rules, validation orchestration, queries/aggregations.  
- **Models** (`src/models/`) — Schemas and indexes.  
- **Mappers** (`src/mappers/`) — Stable API shapes (e.g. finance records).

**Scalability (operational):** Stateless JWT auth; configurable MongoDB pool (`MONGODB_MAX_POOL_SIZE` and related vars in `.env.example`); gzip **compression** on responses; **`X-Request-Id`** on every response for log correlation; **`GET /api/health`** for liveness (no DB) and **`GET /api/health/ready`** for readiness (DB connected); graceful shutdown (SIGTERM/SIGINT) closes HTTP, optional **Redis**, then MongoDB. **Optional Redis** (`REDIS_URL`): shared **rate-limit** state across multiple app instances and a short-TTL **cache** for dashboard summary (invalidated on finance create/update/delete). Omit Redis for local dev and CI—behaviour stays the same with in-memory limits and live aggregations. **Kafka** is not used here (would add heavy ops/CI cost for this scope). Details: **[system design](docs/system-design.md)** (NFR-7, NFR-8).

The **HLD context diagram** (§4.1) and **request pipeline sequence diagram** (§5.2) both show **Redis** as optional infrastructure aligned with the code. More detail: **[system design](docs/system-design.md)**.

## RBAC matrix (simplified)

| Area | viewer | analyst | admin |
|------|:------:|:-------:|:-----:|
| `GET /api/dashboard/summary` | ✓ | ✓ | ✓ |
| `GET /api/finance/records`, `GET .../:id` | ✗ | ✓ | ✓ |
| `POST` / `PATCH` / `DELETE /api/finance/records` | ✗ | ✗ | ✓ |
| `/api/users/*` | ✗ | ✗ | ✓ |
| `POST /api/auth/register`, `POST /api/auth/login`, … | ✓ | ✓ | ✓ |

Inactive users receive **403** on protected routes.

## HTTP status codes (common)

| Code | When |
|------|------|
| **200** | Success |
| **201** | Created |
| **400** | Validation / bad input (often `details`) |
| **401** | Missing or invalid JWT |
| **403** | Wrong role or inactive account |
| **404** | Resource not found |
| **409** | Conflict (e.g. duplicate email) |
| **429** | Rate limit exceeded |
| **500** | Unexpected server error |

## Security notes

- **Passwords:** stored as **bcrypt** hashes; never returned in API JSON.  
- **JWT:** signed with **`JWT_SECRET`**; optional **`Authorization: Bearer`** and httpOnly cookie **`token`**. Stateless — no server-side session store.  
- **Rate limiting:** per IP on `/api/auth` and other protected `/api` groups (off when `NODE_ENV=test`). With **`REDIS_URL`**, counters are stored in **Redis** so limits are consistent across multiple server instances.  
- **Secrets:** do not commit **`financedashboardbackend/.env`**; copy from **`.env.example`**.

### Security: common risks and what we mitigated

This is not a formal penetration-test sign-off; it documents **defence-in-depth** baked into the codebase. **Deployment** (TLS, firewall, Atlas network access, Redis passwords) remains your responsibility.

| Risk | Mitigation |
|------|------------|
| **Guessable or short `JWT_SECRET` in production** | Startup check (`src/config/envValidate.js`): when **`NODE_ENV=production`**, the process **exits** unless `JWT_SECRET` is at least **32** characters (override with **`JWT_SECRET_MIN_LENGTH`**). |
| **JWT “algorithm confusion”** | Tokens are **signed and verified with `HS256` only** (`algorithm` / `algorithms` in `token.js` and `auth.js`). |
| **NoSQL injection** (e.g. `$gt` in JSON body/query) | **`express-mongo-sanitize`** strips dangerous keys/patterns from `req.body`, `req.query`, and `req.params` after JSON parsing. |
| **Missing baseline HTTP security headers** | **`helmet`** sets headers such as `X-Content-Type-Options`, `X-DNS-Prefetch-Control`, `Strict-Transport-Security` (when served over HTTPS), etc. **CSP** is disabled for this JSON API; **CORP** is disabled so browser **CORS** + credentials keep working. |
| **Session cookie too broad / missing path** | Auth cookie uses **`httpOnly`**, **`secure` in production**, **`SameSite` strict (prod) / lax (dev)**, explicit **`path: '/'`**. |
| **Verbose 500 errors to clients** | Global handler returns a **generic** `{ "message": "Internal server error" }`; stack traces stay in **server logs** (with `X-Request-Id` when present). |
| **Brute-force on `/api/auth`** | **Rate limits** (stricter on auth routes); optional **Redis** for shared counters across instances. |
| **CORS allowing arbitrary origins** | **Allowlist** only (`localhost:3000`, `CLIENT_ORIGIN`, `VERCEL_URL`); credentials require an allowed origin. |

**Still out of scope** (would be separate work): MFA/OAuth, refresh-token rotation, email verification, automated dependency scanning in CI, WAF, and full OWASP review. Run **`npm audit`** regularly and keep **`NODE_ENV=production`** on live hosts.

## Finance soft delete

Deletes set **`deletedAt`** instead of removing documents, so rows stay auditable in MongoDB while lists, get-by-id, updates, and dashboard aggregates only include **`deletedAt: null`** records.

## Database (modeling)

MongoDB + Mongoose: **`users`** and **`financialrecords`**, with indexes for list filters, soft delete, and dashboard-style queries. Rationale (why MongoDB, indexes, integrity rules, soft-delete behaviour) is in **[system design](docs/system-design.md)** under **Database design**.

### Example: MongoDB Atlas + Compass (live connection)

The app uses whatever database name is in **`MONGODB_URI`** (e.g. `.../finance_dashboard`). Below are **MongoDB Compass** screenshots from a **cloud** deployment: **not** a local `mongod` on your laptop—the database is **MongoDB Atlas** (managed MongoDB; the cluster used for these captures is hosted on **AWS**, as in a typical Atlas setup). Documents in **`users`** and **`financialrecords`** show the API persisting to a real remote URI (your cluster provider, name, and rows may differ).

<img src="docs/images/mongo-compass-users.png" alt="MongoDB Compass: finance_dashboard.users collection on MongoDB Atlas (AWS cloud, not local)" width="920" />

<img src="docs/images/mongo-compass-financialrecords.png" alt="MongoDB Compass: finance_dashboard.financialrecords on MongoDB Atlas (AWS cloud, not local)" width="920" />

## Documentation

- **[System design](docs/system-design.md)** — Architecture, flows, and data model (Mermaid diagrams **§4.1**, **§5.2** are the source of truth for HLD/sequence; export new PNGs from GitHub/Mermaid preview for slides—**`api-testing-images/`** screenshots are examples and may lag until re-captured). **[`docs/images/`](docs/images/)** — optional MongoDB Compass screenshots (cloud Atlas on AWS, not local).  
- **[Feature checklist](docs/feature-checklist.md)** — What’s implemented, in table form.  
- **[openapi.yaml](docs/openapi.yaml)** — OpenAPI sketch for the main routes (includes cross-cutting notes: `X-Request-Id`, optional Redis cache/rate limits, compression).  
- **[API Testing](API%20Testing.md)** — Postman walkthrough; images in [`api-testing-images/`](api-testing-images/).

## Running it locally

After the [Quick start](#quick-start) steps: set `MONGODB_URI` and `JWT_SECRET` in `financedashboardbackend/.env`. Optional: `PORT` (default 4000), `JWT_EXPIRES_IN` (default 7d), `CLIENT_ORIGIN` for extra CORS origins, **`REDIS_URL`** for Redis-backed rate limits + dashboard cache (omit for local dev/CI), MongoDB pool vars (`MONGODB_MAX_POOL_SIZE`, etc.—see `.env.example`). Local `localhost:3000` / `127.0.0.1:3000` are allowed by default; on Vercel, `VERCEL_URL` is added for CORS.

```bash
npm run dev -w financedashboardbackend
```

`GET /api/health` should return `{ "ok": true }`. Tests use an in-memory MongoDB:

```bash
npm test -w financedashboardbackend
```

Production-style process (same env):

```bash
npm start -w financedashboardbackend
```

## Deploying

**Vercel:** import this repo, leave **Root Directory** blank (repo root). Set `MONGODB_URI` and `JWT_SECRET` in the project env; add `CLIENT_ORIGIN` if the UI is on another origin. Optional: **`REDIS_URL`** if you use a managed Redis for rate limits + dashboard cache. Push to `main` to deploy — redeploy after you change env vars. If Vercel keeps minting extra GitHub repos, you’re in the “create new repository” flow; you want **Import** on a repo that already exists.

**Elsewhere (Render, Railway, a VPS, etc.):** run Node against this codebase. If the host uses repo root: build with `npm ci`, start with `npm start -w financedashboardbackend`. If you point the service at `financedashboardbackend/` only: `npm install` then `npm start`. Render sets `PORT` for you; the server already reads it.

## Auth

Register/login set an httpOnly cookie called `token` and return the user. Anything protected also accepts `Authorization: Bearer <jwt>` if that’s easier for Postman or a non-browser client. Logout is `POST /api/auth/logout` and clears the cookie. No `JWT_SECRET` in env means things that verify tokens will error — that’s intentional so misconfig is obvious.

## Roles (quick reference)

- **viewer** — dashboard summary only  
- **analyst** — read finance records + summary  
- **admin** — records CRUD + user management  

Whoever hits `POST /api/auth/register` first becomes **admin**; after that, every self-signup is **viewer**. **`/auth/register` ignores any `role` in the body** — it is not a way to create admins. To create an **admin** or **analyst**, log in as an admin and use **`POST /api/users`** with JSON including `"role": "admin"` (or `"analyst"`). Inactive users get 403 on protected routes.

Everything’s one shared pool of data — no tenants, no org isolation. That was a deliberate scope cut.

## Routes

Everything is under `/api`. JSON bodies expect `Content-Type: application/json`.

**Auth**

- `POST /auth/register` — signup (first user = admin)  
- `POST /auth/login`  
- `POST /auth/logout`  
- `GET /auth/me` — authenticated  

**Users (admin only)** — `GET /users` (pagination: `page`, `limit`), `POST /users`, `PATCH /users/:id` (role, status, name, etc.)

**Finance records** — under `/finance/records`. List/detail: **analyst** or **admin**. Writes: **admin** only. List query params include `type` (`income` / `expense`), `category` (exact match, case-insensitive), `dateFrom` / `dateTo`, `page`, `limit`. Create/update use `amount`, `type`, `category`, `date`, optional `notes`. **Delete** is a **soft delete** (`deletedAt`); deleted rows are hidden from list, get-by-id, updates, and dashboard totals.

**Rate limiting** — Per-IP limits on `/api/auth` (default 60 requests / 15 min) and on other protected `/api/*` routes (default 300 / 15 min). Tune with `RATE_LIMIT_AUTH_MAX` and `RATE_LIMIT_API_MAX` in env. Limits are skipped when `NODE_ENV=test` (automated tests). Set **`REDIS_URL`** to use Redis-backed counters (`rate-limit-redis`) for horizontal scaling. On Vercel, `trust proxy` is enabled automatically so limits use the client IP; for other reverse proxies set `TRUST_PROXY=1`.

**Dashboard** — `GET /dashboard/summary` for any logged-in role. Optional `dateFrom`, `dateTo`, and `trend` (`month` or `week`) for how trend buckets are shaped. Response includes totals, per-category numbers, recent rows, and trend series. With **`REDIS_URL`**, responses may be **cached** in Redis for a short TTL (see **`DASHBOARD_CACHE_TTL_SECONDS`** in `.env.example`); finance writes invalidate the cache.

**Sanity / probes** — `GET /` returns `{ "ok": true, "health": "/api/health" }`. **`GET /api/health`** is liveness (no DB). **`GET /api/health/ready`** is readiness (Mongo connected after `connectDb`). Successful responses include **`X-Request-Id`** for tracing.

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

## What I assumed / didn’t build

Single database, single “organization” — no multi-tenancy. First registration bootstraps admin instead of a separate invite-only or seeded admin flow. Passwords are bcrypt only; no OAuth. Record types are just income/expense with non-negative amounts. CORS is locked down for browser origins we know about; non-browser clients without an `Origin` header still work with how `cors` is set up.

## Tradeoffs (why it’s shaped like this)

JWT in a cookie plus optional Bearer means one auth mechanism for browsers and for curl/Postman without maintaining two parallel systems — the catch is cookie `secure` / `SameSite` have to match how and where you host the frontend. Mongo keeps the schema loose and development fast; anything that would be a foreign key or join in SQL is enforced in code here. The Vercel handler is the same Express app, so you get cold starts and platform limits instead of a always-on process — fine for this API shape, not for heavy background jobs. The npm workspace at the root means Vercel and `npm ci` see one tree; on some hosts you have to remember `-w financedashboardbackend` or set the subdirectory as root. Dashboard numbers come from aggregation pipelines; they’re fine at moderate data sizes — if this ever grew huge I’d revisit indexes and maybe pre-aggregation. Category filtering is exact (case-insensitive), not fuzzy search, on purpose — simpler and predictable.

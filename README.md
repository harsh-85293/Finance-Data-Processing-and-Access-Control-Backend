# Finance dashboard backend

Express + MongoDB API for a small finance dashboard: JWT auth, role-based access, and aggregated summaries. The app itself lives in `financedashboardbackend/`; there’s a root `package.json` with npm workspaces so `node_modules` lines up for local dev and for Vercel. The Vercel entry is `api/index.js` — it wraps the same Express app with `serverless-http`.

You’ll need Node 18+ (CI runs on 20), MongoDB somewhere the process can reach, and **npm** — there’s a `package-lock.json`, I didn’t set this up for Yarn.

## Running it locally

From the **repo root**:

```bash
npm install
cp financedashboardbackend/.env.example financedashboardbackend/.env
```

Fill in `financedashboardbackend/.env`. You **must** set `MONGODB_URI` and `JWT_SECRET` (use a long random secret in prod). Optional: `PORT` (defaults to 4000), `JWT_EXPIRES_IN` (defaults to 7d), `CLIENT_ORIGIN` if your frontend isn’t covered by the built-in CORS list. For local dev, `localhost:3000` / `127.0.0.1:3000` are already allowed; on Vercel, `VERCEL_URL` gets added automatically.

```bash
npm run dev -w financedashboardbackend
```

Hit `GET /api/health` — you should see `{ "ok": true }`. Tests don’t need Mongo for what’s there right now:

```bash
npm test -w financedashboardbackend
```

For a normal long-running server (same env):

```bash
npm start -w financedashboardbackend
```

## Deploying

**Vercel:** import this repo, leave **Root Directory** blank (repo root). Set `MONGODB_URI` and `JWT_SECRET` in the project env; add `CLIENT_ORIGIN` if the UI is on another origin. Push to `main` to deploy — redeploy after you change env vars. If Vercel keeps minting extra GitHub repos, you’re in the “create new repository” flow; you want **Import** on a repo that already exists.

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

**Finance records** — under `/finance/records`. List/detail: **analyst** or **admin**. Writes: **admin** only. List query params include `type` (`income` / `expense`), `category` (exact match, case-insensitive), `dateFrom` / `dateTo`, `page`, `limit`. Create/update use `amount`, `type`, `category`, `date`, optional `notes`.

**Dashboard** — `GET /dashboard/summary` for any logged-in role. Optional `dateFrom`, `dateTo`, and `trend` (`month` or `week`) for how trend buckets are shaped. Response includes totals, per-category numbers, recent rows, and trend series.

There’s also `GET /` and `GET /api/health` for sanity checks.

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

# Finance dashboard backend

Express API, Mongoose, JWT in a cookie (Bearer header works too). Code is in `financedashboardbackend/`.

**Roles:** `viewer` (dashboard summary only), `analyst` (read records + summary), `admin` (records + users). Inactive accounts get 403 on protected routes.

First person to hit `POST /api/auth/register` becomes admin; later signups default to `viewer` unless an admin creates the user with another role. Data is one shared pool (no multi-tenant split).

## Run locally

```bash
cd financedashboardbackend
cp .env.example .env
```

Fill in `MONGODB_URI` and `JWT_SECRET`. **`CLIENT_ORIGIN` is optional** for a backend-only API: leave it unset so Postman, curl, and browser tests work without a separate frontend. Set it later if you add a web app and want a strict CORS allow-list.

```bash
npm install
npm run dev
```

Port defaults to `4000`. Smoke: `GET /api/health`. Tests: `npm test` (health route only, no Mongo needed).

**Vercel:** Root Directory **empty** (repo root). Env: `MONGODB_URI`, `JWT_SECRET` (required). **You can omit `CLIENT_ORIGIN`** for a backend-only submission. If you previously set `CLIENT_ORIGIN` to `http://localhost:3000`, remove it on Vercel so CORS stays open for testing. If you still see **404 NOT_FOUND**, redeploy after the latest commit.

**Other hosts:** use `npm start` with the same env vars (long-running process).

## Routes (all under `/api`)

- `POST /auth/register`, `POST /auth/login`, `POST /auth/logout` — login/register are open; logout clears the cookie.
- `GET /auth/me` — needs auth.
- `GET /users`, `POST /users`, `PATCH /users/:id` — admin.
- `GET /finance/records`, `GET /finance/records/:id` — analyst or admin. Query: `type`, `category`, `dateFrom`, `dateTo`, `page`, `limit`.
- `POST/PATCH/DELETE /finance/records` — admin.
- `GET /dashboard/summary` — any role; optional `dateFrom`, `dateTo`, `trend` (`month` or `week`).

## Examples

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



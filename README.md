# Finance dashboard backend

Express API, Mongoose, JWT in a cookie (Bearer header works too). Code is in `financedashboardbackend/` (`routes`, `models`, `middlewares`, `utils` for validation and tokens).

**Roles:** `viewer` (dashboard summary only), `analyst` (read records + summary), `admin` (records + users). Inactive accounts get 403 on protected routes.

First person to hit `POST /api/auth/register` becomes admin; later signups default to `viewer` unless an admin creates the user with another role. Data is one shared pool (no multi-tenant split).

## Run locally

From the **repo root** (npm workspaces install shared `node_modules` used by Vercel and local dev):

```bash
cp financedashboardbackend/.env.example financedashboardbackend/.env
npm install
```

Edit `financedashboardbackend/.env`: `MONGODB_URI`, `JWT_SECRET`. **`CLIENT_ORIGIN` is optional** (see above).

```bash
npm run dev -w financedashboardbackend
```

Port defaults to `4000`. Smoke: `GET /api/health`. Tests: `npm test` (health route only, no Mongo needed).

**Vercel:** Root Directory **empty** (repo root). Env: `MONGODB_URI`, `JWT_SECRET`. `VERCEL_URL` is injected by Vercel for CORS. **`CLIENT_ORIGIN` is optional.** Redeploy after env changes. If you see **404 NOT_FOUND**, confirm the latest `main` is deployed (root `vercel.json` + `api/`).

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



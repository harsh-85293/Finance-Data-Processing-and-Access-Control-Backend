# Finance dashboard backend

Express API, Mongoose, JWT in a cookie (Bearer header works too). Code is in `financedashboardbackend/`.

**Roles:** `viewer` (dashboard summary only), `analyst` (read records + summary), `admin` (records + users). Inactive accounts get 403 on protected routes.

First person to hit `POST /api/auth/register` becomes admin; later signups default to `viewer` unless an admin creates the user with another role. Data is one shared pool (no multi-tenant split).

## Run locally

```bash
cd financedashboardbackend
cp .env.example .env
```

Fill in `MONGODB_URI`, `JWT_SECRET`, and `CLIENT_ORIGIN` if the front end isn’t on `http://localhost:3000`.

```bash
npm install
npm run dev
```

Port defaults to `4000`. Smoke: `GET /api/health`. Tests: `npm test` (health route only, no Mongo needed).

### Vercel

In the Vercel project settings, set **Root Directory** to `financedashboardbackend` (this repo’s API folder). Add **Environment Variables**: `MONGODB_URI`, `JWT_SECRET`, and optionally `CLIENT_ORIGIN` (your frontend origin). Vercel sets `VERCEL_URL` automatically; CORS allows it. Redeploy after changing env.

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



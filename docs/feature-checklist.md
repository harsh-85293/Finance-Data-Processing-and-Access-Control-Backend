# Feature checklist

What the API implements, in one place. Details: [system-design.md](system-design.md), routes and env in the [README](../README.md).

## Main features

| # | Area | Notes |
|---|------|--------|
| **1** | Users & roles | `/api/users` for admins: list (paginated), create with role, update role/status/name. Register via `/api/auth/register` (first user → admin, later → viewer). Roles: viewer, analyst, admin ([README roles](../README.md#roles-quick-reference)). |
| **2** | Finance records | `/api/finance/records` — amount, type, category, date, notes. Filters: `type`, `category`, `dateFrom`/`dateTo`, `page`/`limit`. Deletes are soft (`deletedAt`). |
| **3** | Dashboard | `GET /api/dashboard/summary` — totals, categories, recent activity, trends (`trend=month` or `week`). Implemented in `dashboard.service.js` (aggregation). |
| **4** | Access control | `requireAuth` + `requireRoles` on routes. Inactive users get **403**. |
| **5** | Validation / errors | Validation in services/utils; global handler in `app.js` (400/401/403/404/409/500 as appropriate). |
| **6** | Database | MongoDB + Mongoose via `MONGODB_URI`. |

## Extras

| Topic | Implementation |
|-------|------------------|
| Auth | JWT in httpOnly `token` cookie or `Authorization: Bearer`. |
| Pagination | `page` / `limit` on finance and user lists. |
| “Search” | Filter by type, category, date — not full-text search ([tradeoffs](../README.md#tradeoffs-why-its-shaped-like-this)). |
| Soft delete | `deletedAt` set on delete; excluded from reads and dashboard math. |
| Rate limits | `express-rate-limit` on `/api/auth` and other `/api` groups; off when `NODE_ENV=test`. |
| Tests | `npm test -w financedashboardbackend` (in-memory Mongo). CI runs the same on push/PR. |
| API docs | README, system design, [API Testing](../API%20Testing.md), [openapi.yaml](openapi.yaml). |

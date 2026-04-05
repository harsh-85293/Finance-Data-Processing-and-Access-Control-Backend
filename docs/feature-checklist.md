# Feature checklist

What the API does, in one place. For more details, see [system-design.md](system-design.md). For routes and environment variables, see the [README](../README.md).

## Main features

| # | Area | Notes |
|---|------|--------|
| **1** | Users & roles | Admins use `/api/users` to list users with pagination, create users with a selected role, and update user role, status, or name. Public registration uses `/api/auth/register`. The first registered user becomes `admin`; later registrations become `viewer`. Supported roles: `viewer`, `analyst`, `admin` ([README](../README.md#roles-quick-reference)). |
| **2** | Finance records | `/api/finance/records` manages finance records with `amount`, `type`, `category`, `date`, and `notes`. Supports filters: `type`, `category`, `dateFrom`, `dateTo`, `page`, and `limit`. Deletes are soft deletes using `deletedAt`. |
| **3** | Dashboard | `GET /api/dashboard/summary` returns totals, category summaries, recent activity, and trends with `trend=month` or `trend=week`. It is implemented in `dashboard.service.js` using MongoDB aggregation. If `REDIS_URL` is set, Redis can cache dashboard responses through `dashboardCache.js`, and the cache is refreshed after finance writes. |
| **4** | Access control | Routes use `requireAuth` and `requireRoles`. Inactive users receive **403 Forbidden**. |
| **5** | Validation / errors | Validation is handled in services and utils. Global error handling is in `app.js`. The API returns `400`, `401`, `403`, `404`, `409`, or `500` where appropriate. `500` responses stay generic. Security middleware includes `express-mongo-sanitize` and `helmet`. |
| **6** | Database | The app uses MongoDB with Mongoose, configured through `MONGODB_URI`. |

## Extras

| Topic | Implementation |
|-------|------------------|
| Auth | Authentication uses JWT in an httpOnly `token` cookie or `Authorization: Bearer`. Only **HS256** is used. In production, `JWT_SECRET` must meet a minimum length defined in `envValidate.js`. |
| Pagination | `page` and `limit` are supported on finance and user list endpoints. |
| “Search” | Filtering supports type, category, and date range. It does not support full-text search ([README tradeoffs](../README.md#tradeoffs)). |
| Soft delete | Deletes set `deletedAt` instead of removing records permanently. Soft-deleted records are excluded from reads and dashboard calculations. |
| Rate limits | `express-rate-limit` is applied to `/api/auth` and other `/api` routes. It is disabled when `NODE_ENV=test`. If `REDIS_URL` is set, Redis is used for shared rate limits across multiple app instances. |
| Health | `GET /api/health` is a liveness check and does not require the database. `GET /api/health/ready` is a readiness check and requires MongoDB to be connected. |
| Scalability / ops | The app supports pooled MongoDB connections (`MONGODB_*` env vars), gzip compression, `X-Request-Id`, graceful shutdown, and optional Redis for rate limits and dashboard caching. See [system-design](system-design.md) NFR-7 and NFR-8. |
| Tests | Run tests with `npm test -w financedashboardbackend`. Tests use in-memory MongoDB. CI runs the same test command on push and pull request. |
| API docs | README, system design, [Postman Documenter](https://documenter.getpostman.com/view/53758015/2sBXiqEU2C), [API Testing](../API%20Testing.md), [openapi.yaml](openapi.yaml). |
| Deployed API | The API is deployed over **HTTPS** on Render. The base URL is listed in [README Deploying](../README.md#deploying). |

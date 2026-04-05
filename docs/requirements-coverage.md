# Requirements coverage

How the API maps to the product requirements (core capabilities and optional operational extras). For architecture detail see [system-design.md](system-design.md); for routes and env see the [README](../README.md).

## Core capabilities

| # | Area | What ships |
|---|------|------------|
| **1** | **User & role management** | Admin APIs under `/api/users`: list (paginated), create users with a chosen **role**, update **role** / **status** / name. Self-registration via `/api/auth/register` (first user → admin; later → viewer). Roles: **viewer**, **analyst**, **admin** (see [Roles](../README.md#roles-quick-reference) in the README). |
| **2** | **Financial records** | CRUD under `/api/finance/records` with **amount**, **type** (income/expense), **category**, **date**, **notes**. **Filtering** via query params: `type`, `category` (exact, case-insensitive), `dateFrom` / `dateTo`, plus `page` / `limit`. **Delete** is a **soft delete** (`deletedAt`). |
| **3** | **Dashboard summary** | `GET /api/dashboard/summary`: total income/expense, net balance, category breakdowns, recent activity, monthly or weekly **trends** (`trend=month` \| `week`), optional date range. Implemented with MongoDB **aggregation** in `dashboard.service.js`. |
| **4** | **Access control** | `requireAuth` loads the user; `requireRoles` and route wiring enforce RBAC (e.g. viewer: dashboard only; analyst: read records + dashboard; admin: record writes + user management). Inactive users receive **403**. |
| **5** | **Validation & errors** | Request validation in services/utils; centralized error handler in `app.js` (**400** validation/cast, **401** auth, **403** forbidden, **404** missing, **409** duplicate email, **500** unexpected). |
| **6** | **Data persistence** | **MongoDB** with **Mongoose** (real database, not mocks). Connection via `MONGODB_URI`. |

## Optional operational extras

| Topic | Status |
|-------|--------|
| **Authentication (tokens / sessions)** | **JWT**: httpOnly cookie `token` and optional `Authorization: Bearer` (stateless; no server-side session store). |
| **Pagination** | **Yes** — finance list and user list support `page` / `limit` (with caps). |
| **Search** | **Filtering** by type, category, and date range — not full-text or fuzzy search across arbitrary fields (see [Tradeoffs](../README.md#tradeoffs-why-its-shaped-like-this) in the README). |
| **Soft delete** | **Yes** — finance deletes set `deletedAt`; rows remain in the DB but are excluded from reads and dashboard aggregates. |
| **Rate limiting** | **Yes** — `express-rate-limit` on `/api/auth` and on other protected `/api` route groups; configurable env; skipped in tests. |
| **Unit / integration tests** | **Integration tests** (`npm test -w financedashboardbackend`) with in-memory MongoDB: health, auth bootstrap, users RBAC, finance soft delete. |
| **API documentation** | **Markdown**: [README](../README.md), [system-design.md](system-design.md), and [API Testing](../API%20Testing.md) (Postman). **No** generated OpenAPI/Swagger spec in-repo. |

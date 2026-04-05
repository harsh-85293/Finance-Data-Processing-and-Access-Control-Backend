# API Testing
---

## 1. Sanity check

- Method: GET
- URL: `http://localhost:4000/api/health`
- Send → expect 200 and body 
```json
{
  "ok": true
}
```

- Optional: **`GET http://localhost:4000/`** → `{ "ok": true, "health": "/api/health" }`.
- After MongoDB is up and the app has run **`connectDb`** (any normal `/api/...` request does this), **`GET http://localhost:4000/api/health/ready`** → `200` with `{ "ok": true, "db": "connected" }` (or **`503`** if the DB is not connected).
- Response headers often include **`X-Request-Id`** (for log correlation). Screenshots under `api-testing-images/` are **examples**; re-run requests after code changes so captures match current behaviour.

<img src="api-testing-images/image11.png" height=450px width=900px>

---

## 2. Register (creates first user as admin on a fresh DB)

- Method: POST
- URL: `http://localhost:4000/api/auth/register`
- Headers: Content-Type = application/json
- Body → raw → JSON, e.g.:

```json
{
  "email": "you@example.com",
  "password": "yourpassword",
  "name": "You"
}
```

- Input

```json
{
  "email": "harsh.ramchandani1220013@gmail.com",
  "password": "harsh@1234",
  "name": "harshu"
}
```

- Output

```json
{
    "user": {
        "id": "69d16ce0291c309f2f802ee4",
        "email": "harsh.ramchandani1220013@gmail.com",
        "name": "harshu",
        "role": "viewer",
        "status": "active",
        "createdAt": "2026-04-04T19:56:16.039Z",
        "updatedAt": "2026-04-04T19:56:16.039Z"
    }
}
```

- Send → 201. Postman can store the cookie automatically for this domain.

<img src="api-testing-images/imager.png" height=450px width=900px>

---

## 3. Login (if you already have a user)

- POST `http://localhost:4000/api/auth/login`
- Same JSON shape (email, password).
- Response 200 with user; cookie token should be set if you use the Postman cookie jar (see below).

- Input

```json
{
  "email": "harsh.ramchandani1220013@gmail.com",
  "password": "harsh@1234"
}
```

- Output

```json
{
    "user": {
        "id": "69d16ce0291c309f2f802ee4",
        "email": "harsh.ramchandani1220013@gmail.com",
        "name": "harshu",
        "role": "viewer",
        "status": "active",
        "createdAt": "2026-04-04T19:56:16.039Z",
        "updatedAt": "2026-04-04T19:56:16.039Z"
    }
}
```

<img src="api-testing-images/imagel.png" height=450px width=900px>

---

## 4. Using auth on other requests

- **Option A – Cookie (easiest in Postman)**  
  Postman Settings → enable “Send cookies with requests” (and use the same host localhost:4000).  
  After register/login, call e.g. GET `http://localhost:4000/api/auth/me` — no extra headers if the cookie is sent.

<img src="api-testing-images/image-3.png" height=450px width=900px>

- **Option B – Bearer token**  
  Copy the JWT from the Set-Cookie header value for `token=...`, or open **Cookies** under the URL bar.  
  Or use **Authorization → Type: Bearer Token** → paste the token value only (not the `token=` prefix).  
  GET `http://localhost:4000/api/auth/me`

<img src="api-testing-images/image.png" height=450px width=900px>

<img src="api-testing-images/image-3.png" height=450px width=900px>

---

## 5. Dashboard (protected route example)

With cookie or Bearer set, call:

- GET `http://localhost:4000/api/dashboard/summary`

Optional query: `dateFrom`, `dateTo`, `trend` (`month` or `week`).

<img src="api-testing-images/image-5.png" height=450px width=900px>

Example response shape:

```json
{
    "summary": {
        "totalIncome": 42.5,
        "totalExpense": 0,
        "netBalance": 42.5
    },
    "categoryTotals": [
        {
            "category": "verification",
            "income": 42.5,
            "expense": 0,
            "net": 42.5
        }
    ],
    "recentActivity": [
        {
            "id": "69d0f45aeb88ff548e3e66a6",
            "amount": 42.5,
            "type": "income",
            "category": "verification",
            "date": "2026-04-04T00:00:00.000Z",
            "notes": "verify-db-insert script",
            "createdAt": "2026-04-04T11:22:02.167Z"
        }
    ],
    "trends": {
        "granularity": "month",
        "buckets": [
            {
                "period": "month",
                "year": 2026,
                "month": 4,
                "label": "2026-04",
                "income": 42.5,
                "expense": 0,
                "net": 42.5
            }
        ]
    },
    "filters": {
        "dateFrom": null,
        "dateTo": null
    }
}
```

---

## 6. Finance records — CRUD in Postman

All routes are under **`/api/finance/records`**. Use the same auth as in §4 (cookie jar or Bearer).

**Screenshots:** Save files under `api-testing-images/` and point the `<img src="...">` paths below at your filenames (or replace the placeholder `src` with your image paths).

### 6.1 Roles (what you will see in Postman)

| Action | Method & path | Allowed roles |
|--------|----------------|---------------|
| List + filter | GET `/api/finance/records` | **analyst**, **admin** |
| Get one | GET `/api/finance/records/:id` | **analyst**, **admin** |
| Create | POST `/api/finance/records` | **admin** only |
| Update | PATCH `/api/finance/records/:id` | **admin** only |
| Delete | DELETE `/api/finance/records/:id` | **admin** only |

- **Viewer** gets **403** on list/create (finance is not allowed for viewers).  

### 6.2 List records (GET) — analyst or admin

- **GET** `http://localhost:4000/api/finance/records`
- Optional query parameters:
  - `page` (default 1), `limit` (default 20, max 100)
  - `type`: `income` or `expense`
  - `category`: exact match, case-insensitive
  - `dateFrom`, `dateTo`: filter by record `date` (inclusive range)

Example:

`http://localhost:4000/api/finance/records?page=1&limit=20&type=income&dateFrom=2026-01-01&dateTo=2026-12-31`

Expect **200** with `data`, `page`, `limit`, `total`.

<!-- Screenshot: Postman GET list with Params tab / response -->

<img src="api-testing-images/read.png" height=450px width=900px alt="Placeholder: GET finance records list">

### 6.3 Get one record (GET) — analyst or admin

- **GET** `http://localhost:4000/api/finance/records/<RECORD_ID>`

Replace `<RECORD_ID>` with an `id` from the list response.

Expect **200** with `{ "record": { ... } }`. Invalid id → **400**; missing record → **404**.

<!-- Screenshot: Postman GET by id -->

<img src="api-testing-images/ger.png" height=450px width=900px alt="Placeholder: GET record by id">

### 6.4 Create record (POST) — admin only

- **POST** `http://localhost:4000/api/finance/records`
- Body (raw JSON):

```json
{
  "amount": 120.5,
  "type": "income",
  "category": "salary",
  "date": "2026-04-01",
  "notes": "Test"
}
```

Expect **201** and a `record` object with `id`, `createdBy`, timestamps.

**Without admin** (e.g. analyst or viewer) → **403**:

```json
{
    "message": "Insufficient permissions"
}
```

<img src="api-testing-images/image-6.png" height=450px width=900px>

```json
{
    "message": "Insufficient permissions"
}
```

**With admin:**

<img src="api-testing-images/image-1.png" height=450px width=900px>

```json
{
    "record": {
        "id": "69d17ff85990cbc8fb05746c",
        "amount": 120.5,
        "type": "income",
        "category": "salary",
        "date": "2026-04-01T00:00:00.000Z",
        "notes": "Test",
        "createdBy": "69d1792580b81667816ed65a",
        "createdAt": "2026-04-04T21:17:44.200Z",
        "updatedAt": "2026-04-04T21:17:44.200Z"
    }
}
```

### 6.5 Update record (PATCH) — admin only

- **PATCH** `http://localhost:4000/api/finance/records/<RECORD_ID>`
- Send only fields to change, e.g.:

```json
{
  "amount": 200,
  "notes": "Updated via Postman"
}
```

Expect **200** with updated `record`. No valid fields → **400**. Wrong role → **403**.

<!-- Screenshot: Postman PATCH update -->

<img src="api-testing-images/ur.png" height=450px width=900px alt="Placeholder: PATCH update record">

### 6.6 Delete record (DELETE) — admin only

- **DELETE** `http://localhost:4000/api/finance/records/<RECORD_ID>`

Expect **200** on success with a JSON body, for example:

```json
{
  "message": "Deleted data successfully"
}
```

This is a **soft delete**: the row stays in MongoDB with `deletedAt` set; it no longer appears in list, get-by-id, or dashboard totals (see **§7.3**).

Missing id / bad id → **400** or **404**.

<img src="api-testing-images/dr.png" height=450px width=900px alt="Placeholder: DELETE record">

### 6.7 Common status codes (quick reference)

| Code | Typical cause |
|------|----------------|
| **401** | Missing or invalid JWT; log in again or fix Bearer token |
| **403** | Wrong role (e.g. viewer on finance, or non-admin on POST/PATCH/DELETE) or inactive user |
| **404** | Record id not found (GET/PATCH/DELETE) |
| **400** | Validation errors (body or query); response may include `details` |

---

## 7. Optional enhancements — how to test in Postman

Optional features from the **[feature checklist](../docs/feature-checklist.md)** — tested here with **Postman** (or Collection Runner). Automated tests: **§9**.

**Images:** Placeholders use empty `src=""`. Put your files under `api-testing-images/` (or elsewhere) and set each `src` to your path, e.g. `api-testing-images/your-screenshot.png`.

### 7.1 Pagination

**Finance —** `GET /api/finance/records` (same route family as **§6.2**; add `page` and `limit`).

1. Authenticate as **analyst** or **admin** (§3–4).
2. Call  
   `http://localhost:4000/api/finance/records?page=1&limit=2`  
   Confirm `page`, `limit`, `total`, and that `data` has at most `limit` items.
3. If `total` > 2, call again with `page=2` and check the next page (or empty `data`).

<!-- Screenshot: finance list pagination -->

<img src="api-testing-images/pn.png" height=450px width=900px alt="">

**Users (admin) —** `GET /api/users?page=1&limit=5` (admin JWT). Response includes `page`, `limit`, `total`, `data`.

<!-- Screenshot: users list pagination (optional) -->

<img src="api-testing-images/pn2.png" height=450px width=900px alt="">

### 7.2 Filtering (type, category, date range)

Still **`GET /api/finance/records`** — only the query string changes (structured filters, not full-text search).

Try, for example:

`http://localhost:4000/api/finance/records?type=income`

`http://localhost:4000/api/finance/records?category=salary`

`http://localhost:4000/api/finance/records?dateFrom=2026-01-01&dateTo=2026-12-31`

Confirm filtered `data` and `total` match expectations.

<!-- Screenshot: filtered finance list -->

<img src="api-testing-images/filtering.png" height=450px width=900px alt="">
<img src="api-testing-images/filtering1.png" height=450px width=900px alt="">
<img src="api-testing-images/filtering2.png" height=450px width=900px alt="">

### 7.3 Soft delete (end-to-end)

1. **POST** `/api/finance/records` as **admin** — create a row; note `record.id` (see **§6.4**).
2. **DELETE** `/api/finance/records/<RECORD_ID>` — expect **200** and `"Deleted data successfully"` (see **§6.6**).
3. **GET** `/api/finance/records/<RECORD_ID>` — expect **404** (same request shape as **§6.3**).
4. **GET** `/api/finance/records` — that id must not appear in `data` (**§6.2**).
5. **GET** `/api/dashboard/summary` — totals / recent activity must not still include that row (**§5**).

<!-- Same API as §6.4 POST create -->

<img src="api-testing-images/image-1.png" height=450px width=900px alt="POST create — same as §6.4">

<!-- Same API as §6.6 DELETE -->

<img src="api-testing-images/dr.png" height=450px width=900px alt="DELETE — same as §6.6">

<!-- Same request layout as §6.3 GET by id (here 404 body) -->

<img src="api-testing-images/ger.png" height=450px width=900px alt="GET by id — same as §6.3">

<!-- Same API as §6.2 list -->

<img src="api-testing-images/read.png" height=450px width=900px alt="GET list — same as §6.2">

<!-- Same API as §5 dashboard summary -->

<img src="api-testing-images/image-5.png" height=450px width=900px alt="GET dashboard summary — same as §5">

### 7.4 Rate limiting

Per **IP** (defaults: **60 / 15 min** on `/api/auth`, **300 / 15 min** on other protected `/api` routes). Limits are **disabled** when `NODE_ENV=test` — use a normal dev server.

**Quick check on `/api/auth`:** In `financedashboardbackend/.env` set e.g. `RATE_LIMIT_AUTH_MAX=3`, restart, then **POST** `/api/auth/login` **four times** in a row. The fourth request should return **429** with a JSON `message` about too many requests.

<!-- Screenshot: login request (same route as §3) -->

<img src="api-testing-images/rl.png" height=450px width=900px alt="">

---

## 8. Logout

POST `http://localhost:4000/api/auth/logout` → **200**; cookie cleared; JSON body with message.

- Output

<img src="api-testing-images/image-2.png" height=450px width=900px>

```json
{
    "message": "Logged out successfully"
}
```

---

## 9. Automated integration tests (terminal)

This is **not** Postman — it runs the project’s **Node test suite** (same checks you might use in CI).

From the **repo root**:

```bash
npm test -w financedashboardbackend
```

Uses **in-memory MongoDB**; all tests should pass without a real database.

<!-- Screenshot: terminal output (optional) -->

<img src="api-testing-images/test.png" height=450px width=900px alt="">


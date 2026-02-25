# Coffee Export Operations Management System (CEOMS)

Phase 1 backend scaffold for a lot-native coffee export operations system.

## Stack

- API: Node.js + TypeScript + Express
- Database: PostgreSQL
- Schema management: Prisma (`prisma/schema.prisma`)
- Runtime DB access: `pg` with transaction-safe service logic
- Security: JWT + API keys + Argon2 + Helmet + CORS + rate limiting + CSRF + request logging

## Architecture

Codebase is organized for enterprise maintainability with separated layers:

- `src/app`: Express app setup and centralized route registration
- `src/config`: environment and runtime config
- `src/db`: connection pool and transaction helper
- `src/common`: shared middleware, errors, and reusable DB/domain helpers
- `src/modules/*`: domain modules with strict separation:
  - `*.routes.ts`
  - `*.controller.ts`
  - `*.service.ts`
  - `*.validation.ts` (where needed)

Each module has its own `README.md` under `src/modules/<module>/README.md`.

## Security Controls Implemented

- Authentication and authorization:
  - JWT access/refresh authentication
  - DB-backed session management with refresh token rotation
  - API key authentication (`x-api-key`)
  - Role-based authorization (`admin`, `trader`, `warehouse`, `finance`, `compliance`)
- Security middleware:
  - `helmet` security headers
  - strict CORS allowlist
  - global and auth-specific rate limiters
  - JSON and URL-encoded request size limits
  - request logging through `winston` + `morgan`
  - request ID propagation (`x-request-id`)
- Data security:
  - Argon2id password hashing
  - encrypted sensitive session metadata (IP/user-agent)
  - TLS-capable DB config with production SSL enforcement
  - no plaintext API key storage (SHA-256 hashes only)
- API security:
  - recursive request sanitization middleware
  - parameterized SQL queries and safe identifier checks
  - CSRF protection for browser-origin mutating requests
  - idempotency protection for mutating requests (`Idempotency-Key`)
  - API versioning under `/api/v1`

## What is implemented

- Master data: suppliers, buyers, warehouses, grades, bag types
- Procurement:
  - Auction lots
  - Direct agreements and deliveries
- Inventory:
  - Lot-level stock tracking
  - Stock adjustments with approvals
  - Inventory dashboard
- Contracts and allocations:
  - Contract creation
  - Allocation guardrails (prevents over-allocation and double-selling)
  - Contract dashboard and risk alerts
- Shipments:
  - Shipment creation from allocations
  - Traceability snapshot freeze on shipment creation
  - Shipment status progression checks
- Documents:
  - Commercial invoice
  - Packing list
  - Traceability report
  - Cost breakdown summary
- Costing/profitability:
  - Cost entry capture
  - Contract profitability endpoint
- Traceability:
  - Backward/forward traceability endpoint per lot
- Notifications:
  - Email alerts for key operational events
  - Scheduled contract risk and API-key-expiry alerts

## Quick start

1. Copy env file:

```bash
cp .env.example .env
```

Update secret placeholders in `.env` before running.

2. Start Postgres:

```bash
docker compose up -d
```

3. Install dependencies:

```bash
npm install
```

4. Create database schema with Prisma:

```bash
npm run prisma:migrate:dev
```

5. Start API:

```bash
npm run dev
```

`npm run dev` uses `nodemon` and automatically restarts the server on source changes.

API runs at `http://localhost:4000`.
Versioned endpoints are served under `/api/v1/*`.

## Notification configuration

Set these in `.env` to enable email notifications and daily alerts:

- `RESEND_API_KEY`
- `NOTIFICATION_FROM_EMAIL`
- `NOTIFICATION_ADMIN_EMAILS` (comma-separated)
- `NOTIFICATIONS_CRON_ENABLED` (`true`/`false`)
- `NOTIFICATIONS_CRON_TIMEZONE` (for example `UTC`)
- `CONTRACT_RISK_CRON_SCHEDULE` (default `0 7 * * *`)
- `CONTRACT_RISK_ALERT_WINDOW_DAYS` (default `7`)
- `API_KEY_EXPIRY_CRON_SCHEDULE` (default `15 7 * * *`)
- `API_KEY_EXPIRY_ALERT_WINDOW_DAYS` (default `7`)

## First-run default users

On first API startup (when `users` table is empty), the server auto-creates one test user per role from:

- `src/bootstrap/defaultUsers.ts`

Default seeded accounts include:

- `admin@ceoms.test` (`admin`)
- `trader@ceoms.test` (`trader`)
- `warehouse@ceoms.test` (`warehouse`)
- `finance@ceoms.test` (`finance`)
- `compliance@ceoms.test` (`compliance`)

Edit credentials in `src/bootstrap/defaultUsers.ts` before first run if needed.

## Standard bag types bootstrap

On API startup, the server ensures standard bag types exist and seeds missing entries from:

- `src/bootstrap/defaultBagTypes.ts`

Default bag types:

- `50kg`
- `60kg`

This is idempotent and safe to run on every startup (no duplicate inserts for these standards).

## Web application (Next.js)

The repository includes a separate frontend app in `../web`.

Run it in a second terminal:

```bash
cd ../web
cp .env.example .env
npm install
npm run dev
```

Frontend runs at `http://localhost:3000` and securely proxies requests to the API.

## Auth and CSRF Usage

1. Bootstrap the first user:
- `POST /api/v1/auth/register` (first account is automatically `admin`).

2. Login:
- `POST /api/v1/auth/login` to receive `access_token`, `refresh_token`, and `csrf_token`.

3. Call protected endpoints:
- Send `Authorization: Bearer <access_token>` or `x-api-key: <api_key>`.

4. Browser-origin mutating requests (`POST/PUT/PATCH/DELETE`):
- Include header `x-csrf-token: <csrf_token>`.
- Ensure cookie `ceoms_csrf` is sent.

## Idempotency Contract

- All mutating endpoints (`POST`, `PUT`, `PATCH`, `DELETE`) require:
  - `Idempotency-Key: <unique-key>`
- Behavior:
  - Same key + same request payload returns stored response (`idempotency-replayed: true`).
  - Same key + different payload returns `409`.
  - Concurrent duplicate request with same key returns `409` while first request is processing.

## Pagination and Filter Contract

Standard query params for list endpoints:

- `page` (default `1`)
- `page_size` (default `20`, max `100`)
- `sort_by` (endpoint-specific allowlist)
- `sort_order` (`asc` or `desc`, default `desc`)
- `search` (text search where supported)
- `filter_<field>` for exact filters
  - examples: `filter_status=allocated`, `filter_supplier_id=12`

Standard list response shape:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "page_size": 20,
    "total": 0,
    "total_pages": 1,
    "has_next": false,
    "has_prev": false,
    "sort_by": "created_at",
    "sort_order": "desc",
    "search": "optional",
    "filters": {}
  }
}
```

## Prisma workflow

- Update `prisma/schema.prisma`
- Keep datasource connection in `prisma.config.ts` (Prisma 7 style)
- Generate and apply migration locally:

```bash
npm run prisma:migrate:dev
```

- In deployment environments:

```bash
npm run prisma:migrate:deploy
```

## Key endpoints

- `GET /api/v1/health`
- `GET /api/v1/auth/csrf-token`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
- `GET /api/v1/auth/users`
- `POST /api/v1/auth/api-keys` (admin)
- `GET /api/v1/auth/api-keys` (admin)
- `PATCH /api/v1/auth/api-keys/:apiKeyId/revoke` (admin)
- `POST /api/v1/master/suppliers`
- `GET /api/v1/master/suppliers`
- `POST /api/v1/master/buyers`
- `GET /api/v1/master/buyers`
- `POST /api/v1/master/warehouses`
- `GET /api/v1/master/warehouses`
- `POST /api/v1/master/grades`
- `GET /api/v1/master/grades`
- `POST /api/v1/master/bag-types`
- `GET /api/v1/master/bag-types`
- `POST /api/v1/procurement/auction-lots`
- `GET /api/v1/procurement/auction-lots`
- `POST /api/v1/procurement/direct-agreements`
- `GET /api/v1/procurement/direct-agreements`
- `POST /api/v1/procurement/direct-deliveries`
- `GET /api/v1/procurement/direct-deliveries`
- `GET /api/v1/inventory/lots`
- `POST /api/v1/inventory/adjustments`
- `GET /api/v1/inventory/dashboard`
- `POST /api/v1/contracts`
- `POST /api/v1/contracts/:contractId/allocations`
- `GET /api/v1/contracts/dashboard`
- `POST /api/v1/shipments`
- `PATCH /api/v1/shipments/:shipmentId/status`
- `POST /api/v1/shipments/:shipmentId/documents/generate`
- `GET /api/v1/shipments/:shipmentId/documents`
- `POST /api/v1/costs/entries`
- `GET /api/v1/profitability/contracts/:contractId`
- `GET /api/v1/traceability/lots/:lotId`

## Important business guarantees in the API

- Lot inventory is identity-based (`lot_code`) and source-aware (`auction` vs `direct`)
- Allocation cannot exceed:
  - Remaining contract quantity
  - Remaining lot availability
- Shipment cannot over-fulfill contract quantity
- Shipment status cannot move backwards
- Shipment creation freezes a traceability snapshot for auditability

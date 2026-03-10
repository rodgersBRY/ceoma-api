# Internal (Super Admin) Module

## Purpose

Separate super admin API surface for platform operations:

- Manage organizations, plans, trials, and suspension
- View usage and revenue metrics
- Impersonate tenant admins for support
- Add internal notes and review alerts

These routes are completely separate from tenant auth and require a super admin JWT.

## Structure

- `internal.routes.ts`
- `internal.controller.ts`
- `internal.service.ts`
- `internal.validation.ts`

## Endpoints

- `POST /api/internal/v1/auth/login`
- `GET /api/internal/v1/auth/me`
- `GET /api/internal/v1/orgs`
- `POST /api/internal/v1/orgs`
- `GET /api/internal/v1/orgs/:orgId`
- `PATCH /api/internal/v1/orgs/:orgId/plan`
- `PATCH /api/internal/v1/orgs/:orgId/trial`
- `PATCH /api/internal/v1/orgs/:orgId/status`
- `POST /api/internal/v1/orgs/:orgId/notes`
- `POST /api/internal/v1/orgs/:orgId/impersonate`
- `GET /api/internal/v1/revenue`
- `GET /api/internal/v1/alerts`

## Configuration Notes

- Super admin JWT uses `SUPER_ADMIN_JWT_SECRET` and `SUPER_ADMIN_JWT_TTL`.
- Optional bootstrap super admin uses `SUPER_ADMIN_BOOTSTRAP_EMAIL` and `SUPER_ADMIN_BOOTSTRAP_PASSWORD`.
- Impersonation tokens are short-lived (15 minutes) and logged in `impersonation_logs`.

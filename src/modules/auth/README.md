# Auth Module

## Purpose

Provides API authentication and authorization controls:

- User registration and login
- JWT access/refresh token flow
- Session lifecycle management
- API key issuance and validation
- Current-user context endpoint

## Structure

- `auth.routes.ts`
- `auth.controller.ts`
- `auth.service.ts`
- `auth.validation.ts`

## Endpoints

- `GET /api/v1/auth/csrf-token`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
- `GET /api/v1/auth/users` (admin)
- `POST /api/v1/auth/api-keys` (admin)
- `GET /api/v1/auth/api-keys` (admin)
- `PATCH /api/v1/auth/api-keys/:apiKeyId/revoke` (admin)

## Configuration Notes

- First registered user is auto-assigned `admin` role (bootstrap flow).
- Passwords are hashed with Argon2id.
- Access/refresh tokens are JWTs with separate secrets.
- Refresh tokens are tied to DB sessions and rotated on refresh.
- API keys are never stored in plaintext; only SHA-256 hashes are persisted.
- Session metadata (IP/user-agent) is encrypted before persistence.

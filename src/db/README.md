# DB Configuration Layer

## Files

- `pool.ts`: PostgreSQL connection pool, shared query helper, transaction wrapper

## Responsibilities

- Centralize DB connectivity from environment configuration
- Provide reusable transaction helper (`withTransaction`)
- Avoid duplicated connection logic in modules
- Enforce configurable TLS for database transport in production

## Notes

- Prisma manages schema/migrations (`prisma/schema.prisma` and migration commands).
- Runtime data access in this scaffold uses `pg` for explicit SQL control.

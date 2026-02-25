# Master Module

## Purpose

Owns core reference data used by all transactional modules:

- Suppliers
- Buyers
- Warehouses
- Grades
- Bag types

## Structure

- `master.routes.ts`: HTTP route declarations
- `master.controller.ts`: request parsing + response mapping
- `master.service.ts`: DB operations and business behavior
- `master.validation.ts`: Zod request schemas

## Endpoints

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

## Configuration Notes

- Depends on shared DB config in `src/db/pool.ts`.
- Validation failures are handled by global error middleware.
- No cross-module writes should happen here beyond master tables.
- Standard bag types (`50kg`, `60kg`) are auto-seeded at API startup via `src/bootstrap/defaultBagTypes.ts`.
- Supplier type usage:
  - `auction_agent` is used in auction procurement as the marketing agent/broker.
  - `mill`, `farmer`, and `other` are used for direct procurement suppliers.

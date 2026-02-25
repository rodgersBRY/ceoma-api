# Modules Overview

Each module follows the same layering pattern:

- `*.routes.ts`: route map only
- `*.controller.ts`: input parsing and HTTP response handling
- `*.service.ts`: business logic and data access
- `*.validation.ts`: Zod schemas for request contracts (when needed)

Current modules:

- `auth`
- `master`
- `procurement`
- `inventory`
- `contracts`
- `shipments`
- `finance`
- `traceability`
- `notifications`

Shared API standards across modules:

- Mutating endpoints require `Idempotency-Key`.
- List endpoints use:
  - `page`
  - `page_size`
  - `sort_by`
  - `sort_order`
  - `search`
  - `filter_<field>`
- List responses return `{ data, meta }`.

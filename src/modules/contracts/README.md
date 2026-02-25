# Contracts Module

## Purpose

Controls outbound commitments and lot allocations to prevent overselling.

## Structure

- `contracts.routes.ts`
- `contracts.controller.ts`
- `contracts.service.ts`
- `contracts.validation.ts`

## Endpoints

- `POST /api/v1/contracts`
- `POST /api/v1/contracts/:contractId/allocations`
- `GET /api/v1/contracts/dashboard`
- `GET /api/v1/contracts/reference-data`

## Configuration Notes

- Allocation checks enforce:
  - remaining contract quantity
  - remaining lot availability
- Allocation writes run inside a single DB transaction.
- Contracts dashboard includes fulfillment and unallocated risk flags.
- `reference-data` provides buyers, grades, eligible contracts, and allocatable lots for UI selectors.

# Finance Module

## Purpose

Captures cost entries and computes contract-level profitability.

## Structure

- `finance.routes.ts`
- `finance.controller.ts`
- `finance.service.ts`
- `finance.validation.ts`

## Endpoints

- `POST /api/v1/costs/entries`
- `GET /api/v1/costs/reference-data`
- `GET /api/v1/profitability/reference-data`
- `GET /api/v1/profitability/contracts/:contractId`

## Configuration Notes

- Cost entries can be attached to lots, shipments, or both.
- Profitability uses shipped allocations only.
- COGS derives landed lot cost per kg:
  - purchase price
  - auction fees allocation
  - additional lot costs allocation
- `reference-data` provides contracts, lots, and shipments for selector-driven form input.

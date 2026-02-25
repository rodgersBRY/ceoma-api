# Traceability Module

## Purpose

Provides backward and forward lot traceability across procurement, allocations, shipments, and generated documents.

## Structure

- `traceability.routes.ts`
- `traceability.controller.ts`
- `traceability.service.ts`

## Endpoints

- `GET /api/v1/traceability/lots/:lotId`
- `GET /api/v1/traceability/reference-data`

## Configuration Notes

- Source-specific enrichment:
  - auction: pulls from `auction_procurements`
  - direct: pulls from `direct_deliveries` + `direct_agreements`
- Aggregates linked allocations, shipments, and documents for audit-ready reporting.
- `reference-data` returns lot options for UI lookup selectors.

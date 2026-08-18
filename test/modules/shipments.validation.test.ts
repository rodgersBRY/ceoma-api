import { describe, expect, it } from "vitest";
import {
  docsGenerateSchema,
  shipmentCreateSchema,
  shipmentStatusSchema,
} from "../../src/modules/shipments/shipments.validation.js";

describe("shipments.validation", () => {
  describe("shipmentCreateSchema", () => {
    it("accepts a valid payload", () => {
      const result = shipmentCreateSchema.safeParse({
        shipment_number: "SHP-0001",
        contract_id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        container_number: "MSCU1234567",
        seal_number: "SEAL123",
        planned_departure: "2026-06-01",
        allocation_ids: ["3fa85f64-5717-4562-b3fc-2c963f66afa6"],
      });
      expect(result.success).toBe(true);
    });

    it("accepts a minimal payload without optional fields", () => {
      const result = shipmentCreateSchema.safeParse({
        shipment_number: "SHP-0002",
        contract_id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        allocation_ids: ["3fa85f64-5717-4562-b3fc-2c963f66afa6"],
      });
      expect(result.success).toBe(true);
    });

    it("rejects an empty shipment_number", () => {
      const result = shipmentCreateSchema.safeParse({
        shipment_number: "",
        contract_id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        allocation_ids: ["3fa85f64-5717-4562-b3fc-2c963f66afa6"],
      });
      expect(result.success).toBe(false);
    });

    it("rejects a non-uuid contract_id", () => {
      const result = shipmentCreateSchema.safeParse({
        shipment_number: "SHP-0003",
        contract_id: "not-a-uuid",
        allocation_ids: ["3fa85f64-5717-4562-b3fc-2c963f66afa6"],
      });
      expect(result.success).toBe(false);
    });

    it("rejects an empty allocation_ids array", () => {
      const result = shipmentCreateSchema.safeParse({
        shipment_number: "SHP-0004",
        contract_id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        allocation_ids: [],
      });
      expect(result.success).toBe(false);
    });

    it("rejects a malformed planned_departure date", () => {
      const result = shipmentCreateSchema.safeParse({
        shipment_number: "SHP-0005",
        contract_id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        allocation_ids: ["3fa85f64-5717-4562-b3fc-2c963f66afa6"],
        planned_departure: "06/01/2026",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("shipmentStatusSchema", () => {
    it.each(["planned", "stuffed", "cleared", "on_vessel", "completed"])(
      "accepts status %s",
      (status) => {
        const result = shipmentStatusSchema.safeParse({ status });
        expect(result.success).toBe(true);
      },
    );

    it("accepts an optional actual_departure date", () => {
      const result = shipmentStatusSchema.safeParse({
        status: "on_vessel",
        actual_departure: "2026-07-01",
      });
      expect(result.success).toBe(true);
    });

    it("rejects an unknown status", () => {
      const result = shipmentStatusSchema.safeParse({ status: "delivered" });
      expect(result.success).toBe(false);
    });

    it("rejects a missing status", () => {
      const result = shipmentStatusSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe("docsGenerateSchema", () => {
    it("accepts a valid payload", () => {
      const result = docsGenerateSchema.safeParse({
        doc_types: ["commercial_invoice", "packing_list"],
      });
      expect(result.success).toBe(true);
    });

    it("rejects an empty doc_types array", () => {
      const result = docsGenerateSchema.safeParse({ doc_types: [] });
      expect(result.success).toBe(false);
    });

    it("rejects an unknown doc type", () => {
      const result = docsGenerateSchema.safeParse({ doc_types: ["bill_of_lading"] });
      expect(result.success).toBe(false);
    });
  });
});

import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { allocationSchema, contractSchema } from "../../src/modules/contracts/contracts.validation.js";

describe("contracts.validation", () => {
  describe("contractSchema", () => {
    const validPayload = {
      contract_number: `CT-${randomUUID()}`,
      buyer_id: randomUUID(),
      quantity_kg: 1000,
      price_per_kg: 4.5,
      price_terms: "fob" as const,
      shipment_window_start: "2026-01-01",
      shipment_window_end: "2026-02-01",
    };

    it("accepts a valid payload", () => {
      const result = contractSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it("accepts a valid payload with an optional grade_id", () => {
      const result = contractSchema.safeParse({ ...validPayload, grade_id: randomUUID() });
      expect(result.success).toBe(true);
    });

    it("defaults currency to USD when omitted", () => {
      const result = contractSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.currency).toBe("USD");
      }
    });

    it("rejects a missing contract_number", () => {
      const { contract_number, ...rest } = validPayload;
      const result = contractSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it("rejects an empty contract_number", () => {
      const result = contractSchema.safeParse({ ...validPayload, contract_number: "" });
      expect(result.success).toBe(false);
    });

    it("rejects a non-uuid buyer_id", () => {
      const result = contractSchema.safeParse({ ...validPayload, buyer_id: "not-a-uuid" });
      expect(result.success).toBe(false);
    });

    it("rejects a non-uuid grade_id when provided", () => {
      const result = contractSchema.safeParse({ ...validPayload, grade_id: "not-a-uuid" });
      expect(result.success).toBe(false);
    });

    it("rejects a zero quantity_kg", () => {
      const result = contractSchema.safeParse({ ...validPayload, quantity_kg: 0 });
      expect(result.success).toBe(false);
    });

    it("rejects a negative quantity_kg", () => {
      const result = contractSchema.safeParse({ ...validPayload, quantity_kg: -10 });
      expect(result.success).toBe(false);
    });

    it("rejects a zero price_per_kg", () => {
      const result = contractSchema.safeParse({ ...validPayload, price_per_kg: 0 });
      expect(result.success).toBe(false);
    });

    it("rejects an invalid price_terms value", () => {
      const result = contractSchema.safeParse({ ...validPayload, price_terms: "exw" });
      expect(result.success).toBe(false);
    });

    it("rejects a malformed shipment_window_start", () => {
      const result = contractSchema.safeParse({
        ...validPayload,
        shipment_window_start: "01/01/2026",
      });
      expect(result.success).toBe(false);
    });

    it("rejects a malformed shipment_window_end", () => {
      const result = contractSchema.safeParse({
        ...validPayload,
        shipment_window_end: "not-a-date",
      });
      expect(result.success).toBe(false);
    });

    it("rejects a shipment window where start is after end", () => {
      const result = contractSchema.safeParse({
        ...validPayload,
        shipment_window_start: "2026-03-01",
        shipment_window_end: "2026-02-01",
      });
      expect(result.success).toBe(false);
    });

    it("accepts a shipment window where start equals end", () => {
      const result = contractSchema.safeParse({
        ...validPayload,
        shipment_window_start: "2026-02-01",
        shipment_window_end: "2026-02-01",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("allocationSchema", () => {
    it("accepts a valid payload", () => {
      const result = allocationSchema.safeParse({ lot_id: randomUUID(), allocated_kg: 250 });
      expect(result.success).toBe(true);
    });

    it("rejects a missing lot_id", () => {
      const result = allocationSchema.safeParse({ allocated_kg: 250 });
      expect(result.success).toBe(false);
    });

    it("rejects a non-uuid lot_id", () => {
      const result = allocationSchema.safeParse({ lot_id: "not-a-uuid", allocated_kg: 250 });
      expect(result.success).toBe(false);
    });

    it("rejects a missing allocated_kg", () => {
      const result = allocationSchema.safeParse({ lot_id: randomUUID() });
      expect(result.success).toBe(false);
    });

    it("rejects a zero allocated_kg", () => {
      const result = allocationSchema.safeParse({ lot_id: randomUUID(), allocated_kg: 0 });
      expect(result.success).toBe(false);
    });

    it("rejects a negative allocated_kg", () => {
      const result = allocationSchema.safeParse({ lot_id: randomUUID(), allocated_kg: -5 });
      expect(result.success).toBe(false);
    });
  });
});

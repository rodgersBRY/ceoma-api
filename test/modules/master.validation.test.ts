import { describe, expect, it } from "vitest";
import {
  bagTypeSchema,
  buyerSchema,
  gradeSchema,
  supplierSchema,
  warehouseSchema,
} from "../../src/modules/master/master.validation.js";

describe("master.validation", () => {
  describe("buyerSchema", () => {
    it("accepts a valid payload with country", () => {
      const result = buyerSchema.safeParse({ name: "Acme Roasters", country: "DE" });
      expect(result.success).toBe(true);
    });

    it("accepts a payload without country (optional)", () => {
      const result = buyerSchema.safeParse({ name: "Acme Roasters" });
      expect(result.success).toBe(true);
    });

    it("rejects an empty name", () => {
      const result = buyerSchema.safeParse({ name: "" });
      expect(result.success).toBe(false);
    });

    it("rejects a missing name", () => {
      const result = buyerSchema.safeParse({ country: "DE" });
      expect(result.success).toBe(false);
    });
  });

  describe("warehouseSchema", () => {
    it("accepts a valid payload with location", () => {
      const result = warehouseSchema.safeParse({ name: "Mombasa Bonded Store", location: "Mombasa" });
      expect(result.success).toBe(true);
    });

    it("accepts a payload without location (optional)", () => {
      const result = warehouseSchema.safeParse({ name: "Mombasa Bonded Store" });
      expect(result.success).toBe(true);
    });

    it("rejects an empty name", () => {
      const result = warehouseSchema.safeParse({ name: "" });
      expect(result.success).toBe(false);
    });

    it("rejects a missing name", () => {
      const result = warehouseSchema.safeParse({ location: "Mombasa" });
      expect(result.success).toBe(false);
    });
  });

  describe("gradeSchema", () => {
    it("accepts a valid payload with description", () => {
      const result = gradeSchema.safeParse({ code: "AA", description: "Top grade" });
      expect(result.success).toBe(true);
    });

    it("accepts a payload without description (optional)", () => {
      const result = gradeSchema.safeParse({ code: "AA" });
      expect(result.success).toBe(true);
    });

    it("rejects an empty code", () => {
      const result = gradeSchema.safeParse({ code: "" });
      expect(result.success).toBe(false);
    });

    it("rejects a missing code", () => {
      const result = gradeSchema.safeParse({ description: "Top grade" });
      expect(result.success).toBe(false);
    });
  });

  describe("bagTypeSchema", () => {
    it("accepts a valid payload", () => {
      const result = bagTypeSchema.safeParse({ name: "60kg jute", weight_kg: 60 });
      expect(result.success).toBe(true);
    });

    it("rejects an empty name", () => {
      const result = bagTypeSchema.safeParse({ name: "", weight_kg: 60 });
      expect(result.success).toBe(false);
    });

    it("rejects a missing weight_kg", () => {
      const result = bagTypeSchema.safeParse({ name: "60kg jute" });
      expect(result.success).toBe(false);
    });

    it("rejects a zero weight_kg (must be positive)", () => {
      const result = bagTypeSchema.safeParse({ name: "60kg jute", weight_kg: 0 });
      expect(result.success).toBe(false);
    });

    it("rejects a negative weight_kg", () => {
      const result = bagTypeSchema.safeParse({ name: "60kg jute", weight_kg: -5 });
      expect(result.success).toBe(false);
    });

    it("rejects a non-numeric weight_kg", () => {
      const result = bagTypeSchema.safeParse({ name: "60kg jute", weight_kg: "sixty" });
      expect(result.success).toBe(false);
    });
  });

  describe("supplierSchema edge cases", () => {
    it("defaults type to 'other' when omitted", () => {
      const result = supplierSchema.safeParse({ name: "Independent Farmer" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe("other");
      }
    });

    it("rejects an invalid type enum value", () => {
      const result = supplierSchema.safeParse({ name: "Independent Farmer", type: "cooperative" });
      expect(result.success).toBe(false);
    });

    it("rejects an empty name", () => {
      const result = supplierSchema.safeParse({ name: "", type: "mill" });
      expect(result.success).toBe(false);
    });
  });
});

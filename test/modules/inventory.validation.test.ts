import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { stockAdjustmentSchema } from "../../src/modules/inventory/inventory.validation.js";

describe("inventory validation schemas", () => {
  describe("stockAdjustmentSchema", () => {
    const validPayload = {
      lot_id: randomUUID(),
      adjustment_kg: 12.5,
      reason: "Reweigh after re-bagging",
      approved_by: "Jane Warehouse Manager",
    };

    it("accepts a valid payload", () => {
      const result = stockAdjustmentSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it("accepts a negative adjustment_kg (schema allows any number)", () => {
      const result = stockAdjustmentSchema.safeParse({ ...validPayload, adjustment_kg: -5.25 });
      expect(result.success).toBe(true);
    });

    it("rejects a missing lot_id", () => {
      const { lot_id, ...rest } = validPayload;
      const result = stockAdjustmentSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it("rejects a non-uuid lot_id", () => {
      const result = stockAdjustmentSchema.safeParse({ ...validPayload, lot_id: "not-a-uuid" });
      expect(result.success).toBe(false);
    });

    it("rejects a missing adjustment_kg", () => {
      const { adjustment_kg, ...rest } = validPayload;
      const result = stockAdjustmentSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it("rejects a non-numeric adjustment_kg", () => {
      const result = stockAdjustmentSchema.safeParse({ ...validPayload, adjustment_kg: "12.5" });
      expect(result.success).toBe(false);
    });

    it("rejects a missing reason", () => {
      const { reason, ...rest } = validPayload;
      const result = stockAdjustmentSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it("rejects an empty reason", () => {
      const result = stockAdjustmentSchema.safeParse({ ...validPayload, reason: "" });
      expect(result.success).toBe(false);
    });

    it("rejects a missing approved_by", () => {
      const { approved_by, ...rest } = validPayload;
      const result = stockAdjustmentSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it("rejects an empty approved_by", () => {
      const result = stockAdjustmentSchema.safeParse({ ...validPayload, approved_by: "" });
      expect(result.success).toBe(false);
    });
  });
});

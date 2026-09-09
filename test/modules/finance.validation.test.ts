import { describe, expect, it } from "vitest";
import { costEntrySchema } from "../../src/modules/finance/finance.validation.js";

describe("finance.validation", () => {
  describe("costEntrySchema", () => {
    it("accepts a valid payload with a lot_id", () => {
      const result = costEntrySchema.safeParse({
        lot_id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        category: "freight",
        amount: 150.5,
        currency: "USD",
        notes: "trucking to port",
      });
      expect(result.success).toBe(true);
    });

    it("accepts a valid payload with a shipment_id", () => {
      const result = costEntrySchema.safeParse({
        shipment_id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        category: "documentation",
        amount: 25,
      });
      expect(result.success).toBe(true);
    });

    it("defaults currency to USD when omitted", () => {
      const result = costEntrySchema.safeParse({
        category: "insurance",
        amount: 40,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.currency).toBe("USD");
      }
    });

    it("rejects a non-uuid lot_id", () => {
      const result = costEntrySchema.safeParse({
        lot_id: "not-a-uuid",
        category: "freight",
        amount: 10,
      });
      expect(result.success).toBe(false);
    });

    it("rejects a zero amount", () => {
      const result = costEntrySchema.safeParse({
        category: "freight",
        amount: 0,
      });
      expect(result.success).toBe(false);
    });

    it("rejects a negative amount", () => {
      const result = costEntrySchema.safeParse({
        category: "freight",
        amount: -5,
      });
      expect(result.success).toBe(false);
    });

    it("rejects an empty category", () => {
      const result = costEntrySchema.safeParse({
        category: "",
        amount: 10,
      });
      expect(result.success).toBe(false);
    });

    it("rejects a missing amount", () => {
      const result = costEntrySchema.safeParse({
        category: "freight",
      });
      expect(result.success).toBe(false);
    });
  });
});

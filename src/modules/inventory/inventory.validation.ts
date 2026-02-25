import { z } from "zod";

export const stockAdjustmentSchema = z.object({
  lot_id: z.number().int().positive(),
  adjustment_kg: z.number(),
  reason: z.string().min(1),
  approved_by: z.string().min(1),
});

export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>;

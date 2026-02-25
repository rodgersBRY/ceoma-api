import { z } from "zod";

export const costEntrySchema = z.object({
  lot_id: z.number().int().positive().optional(),
  shipment_id: z.number().int().positive().optional(),
  category: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().default("USD"),
  notes: z.string().optional(),
});

export type CostEntryInput = z.infer<typeof costEntrySchema>;

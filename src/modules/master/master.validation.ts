import { z } from "zod";

export const supplierSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["auction_agent", "mill", "farmer", "other"]).default("other"),
  country: z.string().optional(),
});

export const buyerSchema = z.object({
  name: z.string().min(1),
  country: z.string().optional(),
});

export const warehouseSchema = z.object({
  name: z.string().min(1),
  location: z.string().optional(),
});

export const gradeSchema = z.object({
  code: z.string().min(1),
  description: z.string().optional(),
});

export const bagTypeSchema = z.object({
  name: z.string().min(1),
  weight_kg: z.number().positive(),
});

export type SupplierInput = z.infer<typeof supplierSchema>;
export type BuyerInput = z.infer<typeof buyerSchema>;
export type WarehouseInput = z.infer<typeof warehouseSchema>;
export type GradeInput = z.infer<typeof gradeSchema>;
export type BagTypeInput = z.infer<typeof bagTypeSchema>;

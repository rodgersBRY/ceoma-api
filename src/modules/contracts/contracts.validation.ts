import { z } from "zod";

export const contractSchema = z
  .object({
    contract_number: z.string().min(1),
    buyer_id: z.number().int().positive(),
    grade_id: z.number().int().positive().optional(),
    quantity_kg: z.number().positive(),
    price_per_kg: z.number().positive(),
    price_terms: z.enum(["fob", "cif"]),
    currency: z.string().default("USD"),
    shipment_window_start: z.string().date(),
    shipment_window_end: z.string().date(),
  })
  .refine(
    (val) =>
      new Date(`${val.shipment_window_start}T00:00:00.000Z`) <=
      new Date(`${val.shipment_window_end}T00:00:00.000Z`),
    { message: "shipment_window_start must be <= shipment_window_end" },
  );

export const allocationSchema = z.object({
  lot_id: z.number().int().positive(),
  allocated_kg: z.number().positive(),
});

export type ContractInput = z.infer<typeof contractSchema>;
export type AllocationInput = z.infer<typeof allocationSchema>;

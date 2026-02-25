import { z } from "zod";

export const shipmentCreateSchema = z.object({
  shipment_number: z.string().min(1),
  contract_id: z.number().int().positive(),
  container_number: z.string().optional(),
  seal_number: z.string().optional(),
  planned_departure: z.string().date().optional(),
  allocation_ids: z.array(z.number().int().positive()).min(1),
});

export const shipmentStatusSchema = z.object({
  status: z.enum(["planned", "stuffed", "cleared", "on_vessel", "completed"]),
  actual_departure: z.string().date().optional(),
});

export const docsGenerateSchema = z.object({
  doc_types: z
    .array(
      z.enum([
        "commercial_invoice",
        "packing_list",
        "traceability_report",
        "cost_breakdown_summary",
      ]),
    )
    .min(1),
});

export type ShipmentCreateInput = z.infer<typeof shipmentCreateSchema>;
export type ShipmentStatusInput = z.infer<typeof shipmentStatusSchema>;
export type DocsGenerateInput = z.infer<typeof docsGenerateSchema>;

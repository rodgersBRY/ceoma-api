import { Request, Response } from "express";

import { parseListQuery } from "../../common/pagination.js";
import { inventoryService } from "./inventory.service.js";
import { stockAdjustmentSchema } from "./inventory.validation.js";

export class InventoryController {
  async listLots(req: Request, res: Response): Promise<void> {
    const query = parseListQuery(req.query as Record<string, unknown>, {
      allowedSortBy: [
        "id",
        "lot_code",
        "source",
        "status",
        "crop_year",
        "weight_total_kg",
        "weight_available_kg",
        "created_at",
      ],
      defaultSortBy: "created_at",
    });
    const lots = await inventoryService.listLots(query);
    res.json(lots);
  }

  async adjustStock(req: Request, res: Response): Promise<void> {
    const payload = stockAdjustmentSchema.parse(req.body);
    const adjustment = await inventoryService.adjustStock(payload);
    res.status(201).json(adjustment);
  }

  async getDashboard(_req: Request, res: Response): Promise<void> {
    const dashboard = await inventoryService.getDashboard();
    res.json(dashboard);
  }

  async getReferenceData(_req: Request, res: Response): Promise<void> {
    const data = await inventoryService.getReferenceData();
    res.json(data);
  }
}

export const inventoryController = new InventoryController();

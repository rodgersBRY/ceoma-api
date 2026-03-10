import { Request, Response } from "express";

import { ApiError } from "../../common/errors/ApiError.js";
import { parseListQuery } from "../../common/pagination.js";
import { inventoryService } from "./inventory.service.js";
import { stockAdjustmentSchema } from "./inventory.validation.js";

export class InventoryController {
  async listLots(req: Request, res: Response): Promise<void> {
    if (!req.auth) {
      throw new ApiError(401, "Authentication required");
    }
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
    const lots = await inventoryService.listLots(query, req.auth.organizationId);
    res.json(lots);
  }

  async adjustStock(req: Request, res: Response): Promise<void> {
    if (!req.auth) {
      throw new ApiError(401, "Authentication required");
    }
    const payload = stockAdjustmentSchema.parse(req.body);
    const adjustment = await inventoryService.adjustStock(payload, req.auth.organizationId);
    res.status(201).json(adjustment);
  }

  async getDashboard(req: Request, res: Response): Promise<void> {
    if (!req.auth) {
      throw new ApiError(401, "Authentication required");
    }
    const dashboard = await inventoryService.getDashboard(req.auth.organizationId);
    res.json(dashboard);
  }

  async getReferenceData(req: Request, res: Response): Promise<void> {
    if (!req.auth) {
      throw new ApiError(401, "Authentication required");
    }
    const data = await inventoryService.getReferenceData(req.auth.organizationId);
    res.json(data);
  }
}

export const inventoryController = new InventoryController();

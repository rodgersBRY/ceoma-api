import { Request, Response } from "express";

import { ApiError } from "../../common/errors/ApiError.js";
import { parseListQuery } from "../../common/pagination.js";
import { contractsService } from "./contracts.service.js";
import { allocationSchema, contractSchema } from "./contracts.validation.js";

export class ContractsController {
  async createContract(req: Request, res: Response): Promise<void> {
    const payload = contractSchema.parse(req.body);
    const contract = await contractsService.createContract(payload);
    res.status(201).json(contract);
  }

  async allocateLot(req: Request, res: Response): Promise<void> {
    const contractId = Number(req.params.contractId);
    if (!Number.isFinite(contractId) || contractId <= 0) {
      throw new ApiError(400, "Invalid contractId");
    }
    const payload = allocationSchema.parse(req.body);
    const allocation = await contractsService.allocateLot(contractId, payload);
    res.status(201).json(allocation);
  }

  async getDashboard(req: Request, res: Response): Promise<void> {
    const query = parseListQuery(req.query as Record<string, unknown>, {
      allowedSortBy: [
        "id",
        "contract_number",
        "status",
        "quantity_kg",
        "allocated_kg",
        "shipped_kg",
        "shipment_window_start",
        "shipment_window_end",
        "created_at",
      ],
      defaultSortBy: "created_at",
    });
    const dashboard = await contractsService.getDashboard(query);
    res.json(dashboard);
  }

  async getReferenceData(_req: Request, res: Response): Promise<void> {
    const data = await contractsService.getReferenceData();
    res.json(data);
  }
}

export const contractsController = new ContractsController();

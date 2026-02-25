import { Request, Response } from "express";

import { ApiError } from "../../common/errors/ApiError.js";
import { financeService } from "./finance.service.js";
import { costEntrySchema } from "./finance.validation.js";

export class FinanceController {
  async createCostEntry(req: Request, res: Response): Promise<void> {
    const payload = costEntrySchema.parse(req.body);
    const costEntry = await financeService.createCostEntry(payload);
    res.status(201).json(costEntry);
  }

  async getContractProfitability(req: Request, res: Response): Promise<void> {
    const contractId = Number(req.params.contractId);
    if (!Number.isFinite(contractId) || contractId <= 0) {
      throw new ApiError(400, "Invalid contractId");
    }
    const data = await financeService.getContractProfitability(contractId);
    res.json(data);
  }

  async getReferenceData(_req: Request, res: Response): Promise<void> {
    const data = await financeService.getReferenceData();
    res.json(data);
  }
}

export const financeController = new FinanceController();

import { Request, Response } from "express";

import { ApiError } from "../../common/errors/ApiError.js";
import { financeService } from "./finance.service.js";
import { costEntrySchema } from "./finance.validation.js";

export class FinanceController {
  async createCostEntry(req: Request, res: Response): Promise<void> {
    if (!req.auth) {
      throw new ApiError(401, "Authentication required");
    }
    const payload = costEntrySchema.parse(req.body);
    const costEntry = await financeService.createCostEntry(payload, req.auth.organizationId);
    res.status(201).json(costEntry);
  }

  async getContractProfitability(req: Request, res: Response): Promise<void> {
    if (!req.auth) {
      throw new ApiError(401, "Authentication required");
    }
    const contractId = Number(req.params.contractId);
    if (!Number.isFinite(contractId) || contractId <= 0) {
      throw new ApiError(400, "Invalid contractId");
    }
    const data = await financeService.getContractProfitability(
      contractId,
      req.auth.organizationId,
    );
    res.json(data);
  }

  async getReferenceData(req: Request, res: Response): Promise<void> {
    if (!req.auth) {
      throw new ApiError(401, "Authentication required");
    }
    const data = await financeService.getReferenceData(req.auth.organizationId);
    res.json(data);
  }
}

export const financeController = new FinanceController();

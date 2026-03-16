import { Request, Response } from "express";

import { ApiError } from "../../common/errors/ApiError.js";
import { financeService } from "./finance.service.js";
import { costEntrySchema } from "./finance.validation.js";

export class FinanceController {
  private parseUuid(value: string | string[] | undefined, label: string): string {
    const rawValue = Array.isArray(value) ? value[0] : value;
    const raw = String(rawValue ?? "").trim();
    if (!/^[0-9a-f-]{36}$/i.test(raw)) {
      throw new ApiError(400, `Invalid ${label}`);
    }
    return raw;
  }

  async createCostEntry(req: Request, res: Response): Promise<void> {
    if (!req.auth) {
      throw new ApiError(401, "Authentication required");
    }
    const payload = costEntrySchema.parse(req.body);
    const costEntry = await financeService.createCostEntry(payload, req.auth);
    res.status(201).json(costEntry);
  }

  async getContractProfitability(req: Request, res: Response): Promise<void> {
    if (!req.auth) {
      throw new ApiError(401, "Authentication required");
    }
    const contractId = this.parseUuid(req.params.contractId, "contractId");
    const data = await financeService.getContractProfitability(
      contractId,
      req.auth,
    );
    res.json(data);
  }

  async getReferenceData(req: Request, res: Response): Promise<void> {
    if (!req.auth) {
      throw new ApiError(401, "Authentication required");
    }
    const data = await financeService.getReferenceData(req.auth);
    res.json(data);
  }
}

export const financeController = new FinanceController();

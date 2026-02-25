import { Request, Response } from "express";

import { ApiError } from "../../common/errors/ApiError.js";
import { traceabilityService } from "./traceability.service.js";

export class TraceabilityController {
  async getLotTraceability(req: Request, res: Response): Promise<void> {
    const lotId = Number(req.params.lotId);
    if (!Number.isFinite(lotId) || lotId <= 0) {
      throw new ApiError(400, "Invalid lotId");
    }
    const data = await traceabilityService.getLotTraceability(lotId);
    res.json(data);
  }

  async getReferenceData(_req: Request, res: Response): Promise<void> {
    const data = await traceabilityService.getReferenceData();
    res.json(data);
  }
}

export const traceabilityController = new TraceabilityController();

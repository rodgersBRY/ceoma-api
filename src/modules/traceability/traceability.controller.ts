import { Request, Response } from "express";

import { ApiError } from "../../common/errors/ApiError.js";
import { traceabilityService } from "./traceability.service.js";

export class TraceabilityController {
  async getLotTraceability(req: Request, res: Response): Promise<void> {
    if (!req.auth) {
      throw new ApiError(401, "Authentication required");
    }
    const lotId = Number(req.params.lotId);
    if (!Number.isFinite(lotId) || lotId <= 0) {
      throw new ApiError(400, "Invalid lotId");
    }
    const data = await traceabilityService.getLotTraceability(
      lotId,
      req.auth.organizationId,
    );
    res.json(data);
  }

  async getReferenceData(req: Request, res: Response): Promise<void> {
    if (!req.auth) {
      throw new ApiError(401, "Authentication required");
    }
    const data = await traceabilityService.getReferenceData(req.auth.organizationId);
    res.json(data);
  }
}

export const traceabilityController = new TraceabilityController();

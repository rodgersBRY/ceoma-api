import { Request, Response } from "express";

import { ApiError } from "../../common/errors/ApiError.js";
import { traceabilityService } from "./traceability.service.js";

export class TraceabilityController {
  private parseUuid(value: string | undefined, label: string): string {
    const raw = String(value ?? "").trim();
    if (!/^[0-9a-f-]{36}$/i.test(raw)) {
      throw new ApiError(400, `Invalid ${label}`);
    }
    return raw;
  }

  async getLotTraceability(req: Request, res: Response): Promise<void> {
    if (!req.auth) {
      throw new ApiError(401, "Authentication required");
    }
    const lotId = this.parseUuid(req.params.lotId, "lotId");
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

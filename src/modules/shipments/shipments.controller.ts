import { Request, Response } from "express";

import { ApiError } from "../../common/errors/ApiError.js";
import { parseListQuery } from "../../common/pagination.js";
import { shipmentsService } from "./shipments.service.js";
import {
  docsGenerateSchema,
  shipmentCreateSchema,
  shipmentStatusSchema,
} from "./shipments.validation.js";

export class ShipmentsController {
  private parseUuid(value: string | string[] | undefined, label: string): string {
    const rawValue = Array.isArray(value) ? value[0] : value;
    const raw = String(rawValue ?? "").trim();
    if (!/^[0-9a-f-]{36}$/i.test(raw)) {
      throw new ApiError(400, `Invalid ${label}`);
    }
    return raw;
  }

  async createShipment(req: Request, res: Response): Promise<void> {
    if (!req.auth) {
      throw new ApiError(401, "Authentication required");
    }
    const payload = shipmentCreateSchema.parse(req.body);
    const shipment = await shipmentsService.createShipment(payload, req.auth);
    res.status(201).json(shipment);
  }

  async updateStatus(req: Request, res: Response): Promise<void> {
    if (!req.auth) {
      throw new ApiError(401, "Authentication required");
    }
    const shipmentId = this.parseUuid(req.params.shipmentId, "shipmentId");
    const payload = shipmentStatusSchema.parse(req.body);
    const shipment = await shipmentsService.updateStatus(
      shipmentId,
      payload,
      req.auth,
    );
    res.json(shipment);
  }

  async generateDocuments(req: Request, res: Response): Promise<void> {
    if (!req.auth) {
      throw new ApiError(401, "Authentication required");
    }
    const shipmentId = this.parseUuid(req.params.shipmentId, "shipmentId");
    const payload = docsGenerateSchema.parse(req.body);
    const docs = await shipmentsService.generateDocuments(
      shipmentId,
      payload,
      req.auth,
    );
    res.status(201).json(docs);
  }

  async listDocuments(req: Request, res: Response): Promise<void> {
    if (!req.auth) {
      throw new ApiError(401, "Authentication required");
    }
    const shipmentId = this.parseUuid(req.params.shipmentId, "shipmentId");
    const query = parseListQuery(req.query as Record<string, unknown>, {
      allowedSortBy: ["id", "document_type", "created_at"],
      defaultSortBy: "created_at",
    });
    const docs = await shipmentsService.listDocuments(
      shipmentId,
      query,
      req.auth,
    );
    res.json(docs);
  }

  async getReferenceData(req: Request, res: Response): Promise<void> {
    if (!req.auth) {
      throw new ApiError(401, "Authentication required");
    }
    const data = await shipmentsService.getReferenceData(req.auth);
    res.json(data);
  }
}

export const shipmentsController = new ShipmentsController();

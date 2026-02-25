import { Request, Response } from "express";

import { parseListQuery } from "../../common/pagination.js";
import { procurementService } from "./procurement.service.js";
import {
  auctionLotSchema,
  directAgreementSchema,
  directDeliverySchema,
} from "./procurement.validation.js";

export class ProcurementController {
  async createAuctionLot(req: Request, res: Response): Promise<void> {
    const payload = auctionLotSchema.parse(req.body);
    const lot = await procurementService.createAuctionLot(payload);
    res.status(201).json(lot);
  }

  async createDirectAgreement(req: Request, res: Response): Promise<void> {
    const payload = directAgreementSchema.parse(req.body);
    const agreement = await procurementService.createDirectAgreement(payload);
    res.status(201).json(agreement);
  }

  async listDirectAgreements(req: Request, res: Response): Promise<void> {
    const query = parseListQuery(req.query as Record<string, unknown>, {
      allowedSortBy: ["id", "agreement_reference", "supplier_id", "crop_year", "created_at"],
      defaultSortBy: "created_at",
    });
    const agreements = await procurementService.listDirectAgreements(query);
    res.json(agreements);
  }

  async listAuctionLots(req: Request, res: Response): Promise<void> {
    const query = parseListQuery(req.query as Record<string, unknown>, {
      allowedSortBy: [
        "id",
        "auction_lot_number",
        "marketing_agent",
        "grade",
        "warehouse",
        "crop_year",
        "bags",
        "weight_total_kg",
        "weight_available_kg",
        "purchase_price_per_kg",
        "auction_fees_total",
        "status",
        "created_at",
      ],
      defaultSortBy: "created_at",
    });
    const lots = await procurementService.listAuctionLots(query);
    res.json(lots);
  }

  async createDirectDelivery(req: Request, res: Response): Promise<void> {
    const payload = directDeliverySchema.parse(req.body);
    const lot = await procurementService.createDirectDelivery(payload);
    res.status(201).json(lot);
  }

  async listDirectDeliveries(req: Request, res: Response): Promise<void> {
    const query = parseListQuery(req.query as Record<string, unknown>, {
      allowedSortBy: [
        "id",
        "delivery_reference",
        "lot_code",
        "agreement_reference",
        "supplier",
        "grade",
        "warehouse",
        "crop_year",
        "bags",
        "weight_total_kg",
        "weight_available_kg",
        "agreed_price_per_kg",
        "status",
        "received_at",
        "created_at",
      ],
      defaultSortBy: "created_at",
    });
    const deliveries = await procurementService.listDirectDeliveries(query);
    res.json(deliveries);
  }

  async getReferenceData(_req: Request, res: Response): Promise<void> {
    const data = await procurementService.getReferenceData();
    res.json(data);
  }
}

export const procurementController = new ProcurementController();

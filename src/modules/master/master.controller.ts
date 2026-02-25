import { Request, Response } from "express";

import { parseListQuery } from "../../common/pagination.js";
import { masterService } from "./master.service.js";
import {
  bagTypeSchema,
  buyerSchema,
  gradeSchema,
  supplierSchema,
  warehouseSchema,
} from "./master.validation.js";

export class MasterController {
  async createSupplier(req: Request, res: Response): Promise<void> {
    const payload = supplierSchema.parse(req.body);
    const created = await masterService.createSupplier(payload);
    res.status(201).json(created);
  }

  async listSuppliers(req: Request, res: Response): Promise<void> {
    const query = parseListQuery(req.query as Record<string, unknown>, {
      allowedSortBy: ["id", "name", "supplier_type", "country", "created_at"],
      defaultSortBy: "created_at",
    });
    const rows = await masterService.listSuppliers(query);
    res.json(rows);
  }

  async createBuyer(req: Request, res: Response): Promise<void> {
    const payload = buyerSchema.parse(req.body);
    const created = await masterService.createBuyer(payload);
    res.status(201).json(created);
  }

  async listBuyers(req: Request, res: Response): Promise<void> {
    const query = parseListQuery(req.query as Record<string, unknown>, {
      allowedSortBy: ["id", "name", "country", "created_at"],
      defaultSortBy: "created_at",
    });
    const rows = await masterService.listBuyers(query);
    res.json(rows);
  }

  async createWarehouse(req: Request, res: Response): Promise<void> {
    const payload = warehouseSchema.parse(req.body);
    const created = await masterService.createWarehouse(payload);
    res.status(201).json(created);
  }

  async listWarehouses(req: Request, res: Response): Promise<void> {
    const query = parseListQuery(req.query as Record<string, unknown>, {
      allowedSortBy: ["id", "name", "location", "created_at"],
      defaultSortBy: "created_at",
    });
    const rows = await masterService.listWarehouses(query);
    res.json(rows);
  }

  async createGrade(req: Request, res: Response): Promise<void> {
    const payload = gradeSchema.parse(req.body);
    const created = await masterService.createGrade(payload);
    res.status(201).json(created);
  }

  async listGrades(req: Request, res: Response): Promise<void> {
    const query = parseListQuery(req.query as Record<string, unknown>, {
      allowedSortBy: ["id", "code", "created_at"],
      defaultSortBy: "created_at",
    });
    const rows = await masterService.listGrades(query);
    res.json(rows);
  }

  async createBagType(req: Request, res: Response): Promise<void> {
    const payload = bagTypeSchema.parse(req.body);
    const created = await masterService.createBagType(payload);
    res.status(201).json(created);
  }

  async listBagTypes(req: Request, res: Response): Promise<void> {
    const query = parseListQuery(req.query as Record<string, unknown>, {
      allowedSortBy: ["id", "name", "weight_kg", "created_at"],
      defaultSortBy: "created_at",
    });
    const rows = await masterService.listBagTypes(query);
    res.json(rows);
  }
}

export const masterController = new MasterController();

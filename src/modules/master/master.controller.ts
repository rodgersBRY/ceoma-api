import { Request, Response } from "express";

import { ApiError } from "../../common/errors/ApiError.js";
import { parseListQuery } from "../../common/pagination.js";
import { masterService } from "./master.service.js";
import {
  bagTypeSchema,
  buyerSchema,
  gradeSchema,
  supplierSchema,
  warehouseSchema,
} from "./master.validation.js";

function parseEntityId(rawValue: string | string[] | undefined, entityLabel: string): number {
  const candidate = Array.isArray(rawValue) ? rawValue[0] : rawValue;
  const parsed = Number(candidate);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new ApiError(400, `${entityLabel} id must be a positive integer`);
  }
  return parsed;
}

export class MasterController {
  async createSupplier(req: Request, res: Response): Promise<void> {
    const payload = supplierSchema.parse(req.body);
    const created = await masterService.createSupplier(payload);
    res.status(201).json(created);
  }

  async updateSupplier(req: Request, res: Response): Promise<void> {
    const payload = supplierSchema.parse(req.body);
    const supplierId = parseEntityId(req.params.id, "Supplier");

    const updated = await masterService.updateSupplier(supplierId, payload);
    res.status(200).json(updated);
  }

  async deleteSupplier(req: Request, res: Response): Promise<void> {
    const supplierId = parseEntityId(req.params.id, "Supplier");
    const deleted = await masterService.deleteSupplier(supplierId);
    res.status(200).json(deleted);
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

  async updateBuyer(req: Request, res: Response): Promise<void> {
    const payload = buyerSchema.parse(req.body);
    const buyerId = parseEntityId(req.params.id, "Buyer");

    const updated = await masterService.updateBuyer(buyerId, payload);

    res.status(200).json(updated);
  }

  async deleteBuyer(req: Request, res: Response): Promise<void> {
    const buyerId = parseEntityId(req.params.id, "Buyer");

    const deleted = await masterService.deleteBuyer(buyerId);

    res.status(200).json(deleted);
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

  async updateWarehouse(req: Request, res: Response): Promise<void> {
    const payload = warehouseSchema.parse(req.body);
    const warehouseId = parseEntityId(req.params.id, "Warehouse");

    const updated = await masterService.updateWarehouse(warehouseId, payload);

    res.status(200).json(updated);
  }

  async deleteWarehouse(req: Request, res: Response): Promise<void> {
    const warehouseId = parseEntityId(req.params.id, "Warehouse");

    const deleted = await masterService.deleteWarehouse(warehouseId);

    res.status(200).json(deleted);
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

  async updateGrade(req: Request, res: Response): Promise<void> {
    const payload = gradeSchema.parse(req.body);
    const gradeId = parseEntityId(req.params.id, "Grade");

    const updated = await masterService.updateGrade(gradeId, payload);

    res.status(200).json(updated);
  }
  async deleteGrade(req: Request, res: Response): Promise<void> {
    const gradeId = parseEntityId(req.params.id, "Grade");

    const deleted = await masterService.deleteGrade(gradeId);

    res.status(200).json(deleted);
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

  async updateBagType(req: Request, res: Response): Promise<void> {
    const payload = bagTypeSchema.parse(req.body);
    const bagTypeId = parseEntityId(req.params.id, "Bag type");

    const updated = await masterService.updateBagType(bagTypeId, payload);

    res.status(200).json(updated);
  }

  async deleteBagType(req: Request, res: Response): Promise<void> {
    const bagTypeId = parseEntityId(req.params.id, "Bag type");

    const deleted = await masterService.deleteBagType(bagTypeId);

    res.status(200).json(deleted);
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

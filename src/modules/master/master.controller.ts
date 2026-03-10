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

function parseEntityId(rawValue: string | string[] | undefined, entityLabel: string): string {
  const candidate = Array.isArray(rawValue) ? rawValue[0] : rawValue;
  if (!candidate || !/^[0-9a-f-]{36}$/i.test(candidate)) {
    throw new ApiError(400, `${entityLabel} id must be a valid UUID`);
  }
  return candidate;
}

export class MasterController {
  async createSupplier(req: Request, res: Response): Promise<void> {
    if (!req.auth) {
      throw new ApiError(401, "Authentication required");
    }

    const payload = supplierSchema.parse(req.body);

    const created = await masterService.createSupplier(payload, req.auth.organizationId);

    res.status(201).json(created);
  }

  async updateSupplier(req: Request, res: Response): Promise<void> {
    if (!req.auth) {
      throw new ApiError(401, "Authentication required");
    }

    const payload = supplierSchema.parse(req.body);
    const supplierId = parseEntityId(req.params.id, "Supplier");

    const updated = await masterService.updateSupplier(
      supplierId,
      payload,
      req.auth.organizationId,
    );

    res.status(200).json(updated);
  }

  async deleteSupplier(req: Request, res: Response): Promise<void> {
    if (!req.auth) {
      throw new ApiError(401, "Authentication required");
    }

    const supplierId = parseEntityId(req.params.id, "Supplier");
    
    const deleted = await masterService.deleteSupplier(supplierId, req.auth.organizationId);
    
    res.status(200).json(deleted);
  }

  async listSuppliers(req: Request, res: Response): Promise<void> {
    if (!req.auth) {
      throw new ApiError(401, "Authentication required");
    }

    const query = parseListQuery(req.query as Record<string, unknown>, {
      allowedSortBy: ["id", "name", "supplier_type", "country", "created_at"],
      defaultSortBy: "created_at",
    });

    const rows = await masterService.listSuppliers(query, req.auth.organizationId);

    res.json(rows);
  }

  async createBuyer(req: Request, res: Response): Promise<void> {
    if (!req.auth) {
      throw new ApiError(401, "Authentication required");
    }

    const payload = buyerSchema.parse(req.body);

    const created = await masterService.createBuyer(payload, req.auth.organizationId);

    res.status(201).json(created);
  }

  async updateBuyer(req: Request, res: Response): Promise<void> {
    if (!req.auth) {
      throw new ApiError(401, "Authentication required");
    }

    const payload = buyerSchema.parse(req.body);
    const buyerId = parseEntityId(req.params.id, "Buyer");

    const updated = await masterService.updateBuyer(buyerId, payload, req.auth.organizationId);

    res.status(200).json(updated);
  }

  async deleteBuyer(req: Request, res: Response): Promise<void> {
    if (!req.auth) {
      throw new ApiError(401, "Authentication required");
    }

    const buyerId = parseEntityId(req.params.id, "Buyer");

    const deleted = await masterService.deleteBuyer(buyerId, req.auth.organizationId);

    res.status(200).json(deleted);
  }

  async listBuyers(req: Request, res: Response): Promise<void> {
    if (!req.auth) {
      throw new ApiError(401, "Authentication required");
    }

    const query = parseListQuery(req.query as Record<string, unknown>, {
      allowedSortBy: ["id", "name", "country", "created_at"],
      defaultSortBy: "created_at",
    });

    const rows = await masterService.listBuyers(query, req.auth.organizationId);

    res.json(rows);
  }

  async createWarehouse(req: Request, res: Response): Promise<void> {
    if (!req.auth) {
      throw new ApiError(401, "Authentication required");
    }

    const payload = warehouseSchema.parse(req.body);

    const created = await masterService.createWarehouse(payload, req.auth.organizationId);

    res.status(201).json(created);
  }

  async updateWarehouse(req: Request, res: Response): Promise<void> {
    if (!req.auth) {
      throw new ApiError(401, "Authentication required");
    }

    const payload = warehouseSchema.parse(req.body);
    const warehouseId = parseEntityId(req.params.id, "Warehouse");

    const updated = await masterService.updateWarehouse(
      warehouseId,
      payload,
      req.auth.organizationId,
    );

    res.status(200).json(updated);
  }

  async deleteWarehouse(req: Request, res: Response): Promise<void> {
    if (!req.auth) {
      throw new ApiError(401, "Authentication required");
    }
    const warehouseId = parseEntityId(req.params.id, "Warehouse");

    const deleted = await masterService.deleteWarehouse(warehouseId, req.auth.organizationId);

    res.status(200).json(deleted);
  }

  async listWarehouses(req: Request, res: Response): Promise<void> {
    if (!req.auth) {
      throw new ApiError(401, "Authentication required");
    }

    const query = parseListQuery(req.query as Record<string, unknown>, {
      allowedSortBy: ["id", "name", "location", "created_at"],
      defaultSortBy: "created_at",
    });

    const rows = await masterService.listWarehouses(query, req.auth.organizationId);
    
    res.json(rows);
  }

  async createGrade(req: Request, res: Response): Promise<void> {
    if (!req.auth) {
      throw new ApiError(401, "Authentication required");
    }

    const payload = gradeSchema.parse(req.body);
    
    const created = await masterService.createGrade(payload, req.auth.organizationId);
    
    res.status(201).json(created);
  }

  async updateGrade(req: Request, res: Response): Promise<void> {
    if (!req.auth) {
      throw new ApiError(401, "Authentication required");
    }

    const payload = gradeSchema.parse(req.body);
    const gradeId = parseEntityId(req.params.id, "Grade");

    const updated = await masterService.updateGrade(gradeId, payload, req.auth.organizationId);

    res.status(200).json(updated);
  }
  async deleteGrade(req: Request, res: Response): Promise<void> {
    if (!req.auth) {
      throw new ApiError(401, "Authentication required");
    }

    const gradeId = parseEntityId(req.params.id, "Grade");

    const deleted = await masterService.deleteGrade(gradeId, req.auth.organizationId);

    res.status(200).json(deleted);
  }

  async listGrades(req: Request, res: Response): Promise<void> {
    if (!req.auth) {
      throw new ApiError(401, "Authentication required");
    }

    const query = parseListQuery(req.query as Record<string, unknown>, {
      allowedSortBy: ["id", "code", "created_at"],
      defaultSortBy: "created_at",
    });

    const rows = await masterService.listGrades(query, req.auth.organizationId);

    res.json(rows);
  }

  async createBagType(req: Request, res: Response): Promise<void> {
    if (!req.auth) {
      throw new ApiError(401, "Authentication required");
    }

    const payload = bagTypeSchema.parse(req.body);

    const created = await masterService.createBagType(payload, req.auth.organizationId);

    res.status(201).json(created);
  }

  async updateBagType(req: Request, res: Response): Promise<void> {
    if (!req.auth) {
      throw new ApiError(401, "Authentication required");
    }
    const payload = bagTypeSchema.parse(req.body);
    const bagTypeId = parseEntityId(req.params.id, "Bag type");

    const updated = await masterService.updateBagType(
      bagTypeId,
      payload,
      req.auth.organizationId,
    );

    res.status(200).json(updated);
  }

  async deleteBagType(req: Request, res: Response): Promise<void> {
    if (!req.auth) {
      throw new ApiError(401, "Authentication required");
    }

    const bagTypeId = parseEntityId(req.params.id, "Bag type");

    const deleted = await masterService.deleteBagType(bagTypeId, req.auth.organizationId);

    res.status(200).json(deleted);
  }

  async listBagTypes(req: Request, res: Response): Promise<void> {
    if (!req.auth) {
      throw new ApiError(401, "Authentication required");
    }

    const query = parseListQuery(req.query as Record<string, unknown>, {
      allowedSortBy: ["id", "name", "weight_kg", "created_at"],
      defaultSortBy: "created_at",
    });

    const rows = await masterService.listBagTypes(query, req.auth.organizationId);
    
    res.json(rows);
  }
}

export const masterController = new MasterController();

import { Request, Response } from "express";

import { ApiError } from "../../common/errors/ApiError.js";
import { parseListQuery } from "../../common/pagination.js";
import type { AuthContext } from "../../types/auth.js";
import type { BulkImportResult } from "./master.bulkImport.js";
import { masterService } from "./master.service.js";
import {
  bagTypeSchema,
  buyerSchema,
  gradeSchema,
  supplierSchema,
  warehouseSchema,
} from "./master.validation.js";

function parseEntityId(
  rawValue: string | string[] | undefined,
  entityLabel: string,
): string {
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

    const created = await masterService.createSupplier(payload, req.auth);

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
      req.auth,
    );

    res.status(200).json(updated);
  }

  async deleteSupplier(req: Request, res: Response): Promise<void> {
    if (!req.auth) {
      throw new ApiError(401, "Authentication required");
    }

    const supplierId = parseEntityId(req.params.id, "Supplier");

    const deleted = await masterService.deleteSupplier(supplierId, req.auth);

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

    const rows = await masterService.listSuppliers(query, req.auth);

    res.json(rows);
  }

  async createBuyer(req: Request, res: Response): Promise<void> {
    if (!req.auth) {
      throw new ApiError(401, "Authentication required");
    }

    const payload = buyerSchema.parse(req.body);

    const created = await masterService.createBuyer(payload, req.auth);

    res.status(201).json(created);
  }

  async updateBuyer(req: Request, res: Response): Promise<void> {
    if (!req.auth) {
      throw new ApiError(401, "Authentication required");
    }

    const payload = buyerSchema.parse(req.body);
    const buyerId = parseEntityId(req.params.id, "Buyer");

    const updated = await masterService.updateBuyer(buyerId, payload, req.auth);

    res.status(200).json(updated);
  }

  async deleteBuyer(req: Request, res: Response): Promise<void> {
    if (!req.auth) {
      throw new ApiError(401, "Authentication required");
    }

    const buyerId = parseEntityId(req.params.id, "Buyer");

    const deleted = await masterService.deleteBuyer(buyerId, req.auth);

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

    const rows = await masterService.listBuyers(query, req.auth);

    res.json(rows);
  }

  async createWarehouse(req: Request, res: Response): Promise<void> {
    if (!req.auth) {
      throw new ApiError(401, "Authentication required");
    }

    const payload = warehouseSchema.parse(req.body);

    const created = await masterService.createWarehouse(payload, req.auth);

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
      req.auth,
    );

    res.status(200).json(updated);
  }

  async deleteWarehouse(req: Request, res: Response): Promise<void> {
    if (!req.auth) {
      throw new ApiError(401, "Authentication required");
    }
    const warehouseId = parseEntityId(req.params.id, "Warehouse");

    const deleted = await masterService.deleteWarehouse(warehouseId, req.auth);

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

    const rows = await masterService.listWarehouses(query, req.auth);

    res.json(rows);
  }

  async createGrade(req: Request, res: Response): Promise<void> {
    if (!req.auth) {
      throw new ApiError(401, "Authentication required");
    }

    const payload = gradeSchema.parse(req.body);

    const created = await masterService.createGrade(payload, req.auth);

    res.status(201).json(created);
  }

  async updateGrade(req: Request, res: Response): Promise<void> {
    if (!req.auth) {
      throw new ApiError(401, "Authentication required");
    }

    const payload = gradeSchema.parse(req.body);
    const gradeId = parseEntityId(req.params.id, "Grade");

    const updated = await masterService.updateGrade(gradeId, payload, req.auth);

    res.status(200).json(updated);
  }
  async deleteGrade(req: Request, res: Response): Promise<void> {
    if (!req.auth) {
      throw new ApiError(401, "Authentication required");
    }

    const gradeId = parseEntityId(req.params.id, "Grade");

    const deleted = await masterService.deleteGrade(gradeId, req.auth);

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

    const rows = await masterService.listGrades(query, req.auth);

    res.json(rows);
  }

  async createBagType(req: Request, res: Response): Promise<void> {
    if (!req.auth) {
      throw new ApiError(401, "Authentication required");
    }

    const payload = bagTypeSchema.parse(req.body);

    const created = await masterService.createBagType(payload, req.auth);

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
      req.auth,
    );

    res.status(200).json(updated);
  }

  async deleteBagType(req: Request, res: Response): Promise<void> {
    if (!req.auth) {
      throw new ApiError(401, "Authentication required");
    }

    const bagTypeId = parseEntityId(req.params.id, "Bag type");

    const deleted = await masterService.deleteBagType(bagTypeId, req.auth);

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

    const rows = await masterService.listBagTypes(query, req.auth);

    res.json(rows);
  }

  // BULK IMPORT
  private async runImport(
    req: Request,
    res: Response,
    importFn: (
      fileBuffer: Buffer,
      filename: string,
      actor: AuthContext,
    ) => Promise<BulkImportResult>,
  ): Promise<void> {
    if (!req.auth) {
      throw new ApiError(401, "Authentication required");
    }
    if (!req.file) {
      throw new ApiError(400, "No file was uploaded");
    }

    const result = await importFn(
      req.file.buffer,
      req.file.originalname,
      req.auth,
    );

    res.status(200).json(result);
  }

  private sendCsvTemplate(res: Response, filename: string, csv: string): void {
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", "text/csv");
    res.send(csv);
  }

  async importSuppliers(req: Request, res: Response): Promise<void> {
    await this.runImport(req, res, (buffer, filename, actor) =>
      masterService.importSuppliers(buffer, filename, actor),
    );
  }

  downloadSuppliersTemplate(_req: Request, res: Response): void {
    this.sendCsvTemplate(
      res,
      "suppliers-import-template.csv",
      masterService.getSuppliersImportTemplate(),
    );
  }

  async importBuyers(req: Request, res: Response): Promise<void> {
    await this.runImport(req, res, (buffer, filename, actor) =>
      masterService.importBuyers(buffer, filename, actor),
    );
  }

  downloadBuyersTemplate(_req: Request, res: Response): void {
    this.sendCsvTemplate(
      res,
      "buyers-import-template.csv",
      masterService.getBuyersImportTemplate(),
    );
  }

  async importWarehouses(req: Request, res: Response): Promise<void> {
    await this.runImport(req, res, (buffer, filename, actor) =>
      masterService.importWarehouses(buffer, filename, actor),
    );
  }

  downloadWarehousesTemplate(_req: Request, res: Response): void {
    this.sendCsvTemplate(
      res,
      "warehouses-import-template.csv",
      masterService.getWarehousesImportTemplate(),
    );
  }

  async importGrades(req: Request, res: Response): Promise<void> {
    await this.runImport(req, res, (buffer, filename, actor) =>
      masterService.importGrades(buffer, filename, actor),
    );
  }

  downloadGradesTemplate(_req: Request, res: Response): void {
    this.sendCsvTemplate(
      res,
      "grades-import-template.csv",
      masterService.getGradesImportTemplate(),
    );
  }

  async importBagTypes(req: Request, res: Response): Promise<void> {
    await this.runImport(req, res, (buffer, filename, actor) =>
      masterService.importBagTypes(buffer, filename, actor),
    );
  }

  downloadBagTypesTemplate(_req: Request, res: Response): void {
    this.sendCsvTemplate(
      res,
      "bag-types-import-template.csv",
      masterService.getBagTypesImportTemplate(),
    );
  }
}

export const masterController = new MasterController();

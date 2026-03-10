import crypto from "node:crypto";

import {
  ListQueryParams,
  buildPaginatedResult,
  escapeLikeQuery,
} from "../../common/pagination.js";
import { ApiError } from "../../common/errors/ApiError.js";
import { query } from "../../db/pool.js";
import {
  BagTypeInput,
  BuyerInput,
  GradeInput,
  SupplierInput,
  WarehouseInput,
} from "./master.validation.js";

type PgErrorLike = {
  code?: string;
};

function throwReferenceConflict(error: unknown, entityName: string): never {
  const pgError = error as PgErrorLike;
  if (pgError.code === "23503") {
    throw new ApiError(409, `${entityName} is in use and cannot be deleted`);
  }
  
  throw error;
}

export class MasterService {
  // SUPPLIER SERVICES
  async createSupplier(
    input: SupplierInput,
    organizationId: string,
  ): Promise<unknown> {
    const result = await query(
      `
      INSERT INTO suppliers (id, name, supplier_type, country, organization_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
      `,
      [crypto.randomUUID(), input.name, input.type, input.country ?? null, organizationId],
    );

    return result.rows[0];
  }

  async updateSupplier(
    id: string,
    input: Partial<SupplierInput>,
    organizationId: string,
  ): Promise<unknown> {
    const result = await query(
      `
      UPDATE suppliers
      SET name = $1, supplier_type = $2, country = $3
      WHERE id = $4 AND organization_id = $5
      RETURNING *;
      `,
      [input.name, input.type, input.country ?? null, id, organizationId],
    );

    if (result.rowCount === 0) {
      throw new ApiError(404, `Supplier ${id} not found`);
    }
    return result.rows[0];
  }

  async deleteSupplier(id: string, organizationId: string): Promise<unknown> {
    const result = await query(
      `DELETE FROM suppliers WHERE id = $1 AND organization_id = $2 RETURNING *`,
      [id, organizationId],
    ).catch((error: unknown) => throwReferenceConflict(error, "Supplier"));

    if (result.rowCount === 0) {
      throw new ApiError(404, `Supplier ${id} not found`);
    }
    return result.rows[0];
  }

  async listSuppliers(
    listQuery: ListQueryParams,
    organizationId: string,
  ): Promise<unknown> {
    const whereClauses: string[] = [];
    const values: unknown[] = [];

    values.push(organizationId);
    whereClauses.push(`organization_id = $${values.length}`);

    if (listQuery.search) {
      values.push(`%${escapeLikeQuery(listQuery.search)}%`);
      whereClauses.push(`name ILIKE $${values.length} ESCAPE '\\'`);
    }
    if (listQuery.filters.type) {
      values.push(listQuery.filters.type);
      whereClauses.push(`supplier_type = $${values.length}`);
    }
    if (listQuery.filters.country) {
      values.push(listQuery.filters.country);
      whereClauses.push(`country = $${values.length}`);
    }

    const whereSql =
      whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";
    const countResult = await query<{ total: number }>(
      `SELECT COUNT(*)::int AS total FROM suppliers ${whereSql}`,
      values,
    );
    values.push(listQuery.pageSize, listQuery.offset);
    const result = await query(
      `
      SELECT * FROM suppliers
      ${whereSql}
      ORDER BY ${listQuery.sortBy} ${listQuery.sortOrder}
      LIMIT $${values.length - 1} OFFSET $${values.length}
      `,
      values,
    );
    return buildPaginatedResult(
      result.rows,
      Number(countResult.rows[0].total),
      listQuery,
    );
  }

  // BUYER SERVICES
  async createBuyer(
    input: BuyerInput,
    organizationId: string,
  ): Promise<unknown> {
    const result = await query(
      `
      INSERT INTO buyers (id, name, country, organization_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
      `,
      [crypto.randomUUID(), input.name, input.country ?? null, organizationId],
    );
    return result.rows[0];
  }

  async updateBuyer(
    id: string,
    input: Partial<BuyerInput>,
    organizationId: string,
  ): Promise<unknown> {
    const result = await query(
      `
      UPDATE buyers SET name = $1, country = $2 WHERE id = $3 AND organization_id = $4 RETURNING *;
      `,
      [input.name, input.country ?? null, id, organizationId],
    );

    if (result.rowCount === 0) {
      throw new ApiError(404, `Buyer ${id} not found`);
    }
    return result.rows[0];
  }

  async deleteBuyer(id: string, organizationId: string): Promise<unknown> {
    const result = await query(
      `DELETE FROM buyers WHERE id = $1 AND organization_id = $2 RETURNING *`,
      [id, organizationId],
    ).catch((error: unknown) => throwReferenceConflict(error, "Buyer"));

    if (result.rowCount === 0) {
      throw new ApiError(404, `Buyer ${id} not found`);
    }
    return result.rows[0];
  }

  async listBuyers(
    listQuery: ListQueryParams,
    organizationId: string,
  ): Promise<unknown> {
    const whereClauses: string[] = [];
    const values: unknown[] = [];

    values.push(organizationId);
    whereClauses.push(`organization_id = $${values.length}`);

    if (listQuery.search) {
      values.push(`%${escapeLikeQuery(listQuery.search)}%`);
      whereClauses.push(`name ILIKE $${values.length} ESCAPE '\\'`);
    }
    if (listQuery.filters.country) {
      values.push(listQuery.filters.country);
      whereClauses.push(`country = $${values.length}`);
    }

    const whereSql =
      whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";
    const countResult = await query<{ total: number }>(
      `SELECT COUNT(*)::int AS total FROM buyers ${whereSql}`,
      values,
    );
    values.push(listQuery.pageSize, listQuery.offset);
    const result = await query(
      `
      SELECT * FROM buyers
      ${whereSql}
      ORDER BY ${listQuery.sortBy} ${listQuery.sortOrder}
      LIMIT $${values.length - 1} OFFSET $${values.length}
      `,
      values,
    );
    return buildPaginatedResult(
      result.rows,
      Number(countResult.rows[0].total),
      listQuery,
    );
  }

  // WAREHOUSE SERVICES
  async createWarehouse(
    input: WarehouseInput,
    organizationId: string,
  ): Promise<unknown> {
    const result = await query(
      `
      INSERT INTO warehouses (id, name, location, organization_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
      `,
      [crypto.randomUUID(), input.name, input.location ?? null, organizationId],
    );
    return result.rows[0];
  }

  async updateWarehouse(
    id: string,
    input: Partial<WarehouseInput>,
    organizationId: string,
  ): Promise<unknown> {
    const result = await query(
      `
      UPDATE warehouses SET name = $1, location = $2 WHERE id = $3 AND organization_id = $4 RETURNING *;
      `,
      [input.name, input.location ?? null, id, organizationId],
    );

    if (result.rowCount === 0) {
      throw new ApiError(404, `Warehouse ${id} not found`);
    }
    return result.rows[0];
  }

  async deleteWarehouse(id: string, organizationId: string): Promise<unknown> {
    const result = await query(
      `DELETE FROM warehouses WHERE id = $1 AND organization_id = $2 RETURNING *`,
      [id, organizationId],
    ).catch((error: unknown) => throwReferenceConflict(error, "Warehouse"));

    if (result.rowCount === 0) {
      throw new ApiError(404, `Warehouse ${id} not found`);
    }
    return result.rows[0];
  }

  async listWarehouses(
    listQuery: ListQueryParams,
    organizationId: string,
  ): Promise<unknown> {
    const whereClauses: string[] = [];
    const values: unknown[] = [];

    values.push(organizationId);
    whereClauses.push(`organization_id = $${values.length}`);

    if (listQuery.search) {
      values.push(`%${escapeLikeQuery(listQuery.search)}%`);
      whereClauses.push(`name ILIKE $${values.length} ESCAPE '\\'`);
    }
    if (listQuery.filters.location) {
      values.push(listQuery.filters.location);
      whereClauses.push(`location = $${values.length}`);
    }

    const whereSql =
      whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";
    const countResult = await query<{ total: number }>(
      `SELECT COUNT(*)::int AS total FROM warehouses ${whereSql}`,
      values,
    );
    values.push(listQuery.pageSize, listQuery.offset);
    const result = await query(
      `
      SELECT * FROM warehouses
      ${whereSql}
      ORDER BY ${listQuery.sortBy} ${listQuery.sortOrder}
      LIMIT $${values.length - 1} OFFSET $${values.length}
      `,
      values,
    );
    return buildPaginatedResult(
      result.rows,
      Number(countResult.rows[0].total),
      listQuery,
    );
  }

  // GRADE SERVICES
  async createGrade(
    input: GradeInput,
    organizationId: string,
  ): Promise<unknown> {
    const result = await query(
      `
      INSERT INTO grades (id, code, description, organization_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
      `,
      [crypto.randomUUID(), input.code, input.description ?? null, organizationId],
    );
    return result.rows[0];
  }

  async updateGrade(
    id: string,
    input: Partial<GradeInput>,
    organizationId: string,
  ): Promise<unknown> {
    const result = await query(
      `
      UPDATE grades SET code = $1, description = $2 WHERE id = $3 AND organization_id = $4 RETURNING *;
      `,
      [input.code, input.description ?? null, id, organizationId],
    );

    if (result.rowCount === 0) {
      throw new ApiError(404, `Grade ${id} not found`);
    }
    return result.rows[0];
  }

  async deleteGrade(id: string, organizationId: string): Promise<unknown> {
    const result = await query(
      `DELETE FROM grades WHERE id = $1 AND organization_id = $2 RETURNING *`,
      [id, organizationId],
    ).catch((error: unknown) => throwReferenceConflict(error, "Grade"));

    if (result.rowCount === 0) {
      throw new ApiError(404, `Grade ${id} not found`);
    }
    return result.rows[0];
  }

  async listGrades(
    listQuery: ListQueryParams,
    organizationId: string,
  ): Promise<unknown> {
    const whereClauses: string[] = [];
    const values: unknown[] = [];

    values.push(organizationId);
    whereClauses.push(`organization_id = $${values.length}`);

    if (listQuery.search) {
      values.push(`%${escapeLikeQuery(listQuery.search)}%`);
      whereClauses.push(
        `(code ILIKE $${values.length} ESCAPE '\\' OR description ILIKE $${values.length} ESCAPE '\\')`,
      );
    }
    if (listQuery.filters.code) {
      values.push(listQuery.filters.code);
      whereClauses.push(`code = $${values.length}`);
    }

    const whereSql =
      whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";
    const countResult = await query<{ total: number }>(
      `SELECT COUNT(*)::int AS total FROM grades ${whereSql}`,
      values,
    );
    values.push(listQuery.pageSize, listQuery.offset);
    const result = await query(
      `
      SELECT * FROM grades
      ${whereSql}
      ORDER BY ${listQuery.sortBy} ${listQuery.sortOrder}
      LIMIT $${values.length - 1} OFFSET $${values.length}
      `,
      values,
    );
    return buildPaginatedResult(
      result.rows,
      Number(countResult.rows[0].total),
      listQuery,
    );
  }

  // BAG TYPE SERVICES
  async createBagType(
    input: BagTypeInput,
    organizationId: string,
  ): Promise<unknown> {
    const result = await query(
      `
      INSERT INTO bag_types (id, name, weight_kg, organization_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
      `,
      [crypto.randomUUID(), input.name, input.weight_kg, organizationId],
    );
    return result.rows[0];
  }

  async updateBagType(
    id: string,
    input: Partial<BagTypeInput>,
    organizationId: string,
  ): Promise<unknown> {
    const result = await query(
      `
      UPDATE bag_types SET name = $1, weight_kg = $2 WHERE id = $3 AND organization_id = $4 RETURNING *;
      `,
      [input.name, input.weight_kg ?? null, id, organizationId],
    );

    if (result.rowCount === 0) {
      throw new ApiError(404, `Bag type ${id} not found`);
    }
    return result.rows[0];
  }

  async deleteBagType(id: string, organizationId: string): Promise<unknown> {
    const result = await query(
      `DELETE FROM bag_types WHERE id = $1 AND organization_id = $2 RETURNING *`,
      [id, organizationId],
    ).catch((error: unknown) => throwReferenceConflict(error, "Bag type"));

    if (result.rowCount === 0) {
      throw new ApiError(404, `Bag type ${id} not found`);
    }
    return result.rows[0];
  }

  async listBagTypes(
    listQuery: ListQueryParams,
    organizationId: string,
  ): Promise<unknown> {
    const whereClauses: string[] = [];
    const values: unknown[] = [];

    values.push(organizationId);
    whereClauses.push(`organization_id = $${values.length}`);

    if (listQuery.search) {
      values.push(`%${escapeLikeQuery(listQuery.search)}%`);
      whereClauses.push(`name ILIKE $${values.length} ESCAPE '\\'`);
    }

    const whereSql =
      whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";
    const countResult = await query<{ total: number }>(
      `SELECT COUNT(*)::int AS total FROM bag_types ${whereSql}`,
      values,
    );
    values.push(listQuery.pageSize, listQuery.offset);
    const result = await query(
      `
      SELECT * FROM bag_types
      ${whereSql}
      ORDER BY ${listQuery.sortBy} ${listQuery.sortOrder}
      LIMIT $${values.length - 1} OFFSET $${values.length}
      `,
      values,
    );
    return buildPaginatedResult(
      result.rows,
      Number(countResult.rows[0].total),
      listQuery,
    );
  }
}

export const masterService = new MasterService();

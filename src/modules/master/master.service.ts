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
  async createSupplier(input: SupplierInput): Promise<unknown> {
    const result = await query(
      `
      INSERT INTO suppliers (name, supplier_type, country)
      VALUES ($1, $2, $3)
      RETURNING *;
      `,
      [input.name, input.type, input.country ?? null],
    );

    return result.rows[0];
  }

  async updateSupplier(
    id: number,
    input: Partial<SupplierInput>,
  ): Promise<unknown> {
    const result = await query(
      `
      UPDATE suppliers SET name = $1, supplier_type = $2, country = $3 WHERE id = $4 RETURNING *;
      `,
      [input.name, input.type, input.country ?? null, id],
    );

    if (result.rowCount === 0) {
      throw new ApiError(404, `Supplier ${id} not found`);
    }

    return result.rows[0];
  }

  async deleteSupplier(id: number): Promise<unknown> {
    const result = await query(
      `DELETE FROM suppliers WHERE id = $1 RETURNING *`,
      [id],
    ).catch((error: unknown) => throwReferenceConflict(error, "Supplier"));

    if (result.rowCount === 0) {
      throw new ApiError(404, `Supplier ${id} not found`);
    }

    return result.rows[0];
  }

  async listSuppliers(listQuery: ListQueryParams): Promise<unknown> {
    const whereClauses: string[] = [];
    const values: unknown[] = [];

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
  async createBuyer(input: BuyerInput): Promise<unknown> {
    const result = await query(
      `
      INSERT INTO buyers (name, country)
      VALUES ($1, $2)
      RETURNING *;
      `,
      [input.name, input.country ?? null],
    );

    return result.rows[0];
  }

  async updateBuyer(id: number, input: Partial<BuyerInput>): Promise<unknown> {
    const result = await query(
      `
      UPDATE buyers SET name = $1, country = $2 WHERE id = $3 RETURNING *;
      `,
      [input.name, input.country ?? null, id],
    );

    if (result.rowCount === 0) {
      throw new ApiError(404, `Buyer ${id} not found`);
    }

    return result.rows[0];
  }

  async deleteBuyer(id: number): Promise<unknown> {
    const result = await query(`DELETE FROM buyers WHERE id = $1 RETURNING *`, [
      id,
    ]).catch((error: unknown) => throwReferenceConflict(error, "Buyer"));

    if (result.rowCount === 0) {
      throw new ApiError(404, `Buyer ${id} not found`);
    }

    return result.rows[0];
  }

  async listBuyers(listQuery: ListQueryParams): Promise<unknown> {
    const whereClauses: string[] = [];
    const values: unknown[] = [];

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
  async createWarehouse(input: WarehouseInput): Promise<unknown> {
    const result = await query(
      `
      INSERT INTO warehouses (name, location)
      VALUES ($1, $2)
      RETURNING *;
      `,
      [input.name, input.location ?? null],
    );

    return result.rows[0];
  }

  async updateWarehouse(
    id: number,
    input: Partial<WarehouseInput>,
  ): Promise<unknown> {
    const result = await query(
      `
      UPDATE warehouses SET name = $1, location = $2 WHERE id = $3 RETURNING *;
      `,
      [input.name, input.location ?? null, id],
    );

    if (result.rowCount === 0) {
      throw new ApiError(404, `Warehouse ${id} not found`);
    }

    return result.rows[0];
  }

  async deleteWarehouse(id: number): Promise<unknown> {
    const result = await query(
      `DELETE FROM warehouses WHERE id = $1 RETURNING *`,
      [id],
    ).catch((error: unknown) => throwReferenceConflict(error, "Warehouse"));

    if (result.rowCount === 0) {
      throw new ApiError(404, `Warehouse ${id} not found`);
    }

    return result.rows[0];
  }

  async listWarehouses(listQuery: ListQueryParams): Promise<unknown> {
    const whereClauses: string[] = [];
    const values: unknown[] = [];

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
  async createGrade(input: GradeInput): Promise<unknown> {
    const result = await query(
      `
      INSERT INTO grades (code, description)
      VALUES ($1, $2)
      RETURNING *;
      `,
      [input.code, input.description ?? null],
    );

    return result.rows[0];
  }

  async updateGrade(id: number, input: Partial<GradeInput>): Promise<unknown> {
    const result = await query(
      `
      UPDATE grades SET code = $1, description = $2 WHERE id = $3 RETURNING *;
      `,
      [input.code, input.description ?? null, id],
    );

    if (result.rowCount === 0) {
      throw new ApiError(404, `Grade ${id} not found`);
    }

    return result.rows[0];
  }

  async deleteGrade(id: number): Promise<unknown> {
    const result = await query(`DELETE FROM grades WHERE id = $1 RETURNING *`, [
      id,
    ]).catch((error: unknown) => throwReferenceConflict(error, "Grade"));

    if (result.rowCount === 0) {
      throw new ApiError(404, `Grade ${id} not found`);
    }

    return result.rows[0];
  }

  async listGrades(listQuery: ListQueryParams): Promise<unknown> {
    const whereClauses: string[] = [];
    const values: unknown[] = [];

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
  async createBagType(input: BagTypeInput): Promise<unknown> {
    const result = await query(
      `
      INSERT INTO bag_types (name, weight_kg)
      VALUES ($1, $2)
      RETURNING *;
      `,
      [input.name, input.weight_kg],
    );

    return result.rows[0];
  }

  async updateBagType(
    id: number,
    input: Partial<BagTypeInput>,
  ): Promise<unknown> {
    const result = await query(
      `
      UPDATE bag_types SET name = $1, weight_kg = $2 WHERE id = $3 RETURNING *;
      `,
      [input.name, input.weight_kg ?? null, id],
    );

    if (result.rowCount === 0) {
      throw new ApiError(404, `Bag type ${id} not found`);
    }

    return result.rows[0];
  }

  async deleteBagType(id: number): Promise<unknown> {
    const result = await query(
      `DELETE FROM bag_types WHERE id = $1 RETURNING *`,
      [id],
    ).catch((error: unknown) => throwReferenceConflict(error, "Bag type"));

    if (result.rowCount === 0) {
      throw new ApiError(404, `Bag type ${id} not found`);
    }

    return result.rows[0];
  }

  async listBagTypes(listQuery: ListQueryParams): Promise<unknown> {
    const whereClauses: string[] = [];
    const values: unknown[] = [];

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

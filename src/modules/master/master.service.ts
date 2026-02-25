import {
  ListQueryParams,
  buildPaginatedResult,
  escapeLikeQuery,
} from "../../common/pagination.js";
import { query } from "../../db/pool.js";
import {
  BagTypeInput,
  BuyerInput,
  GradeInput,
  SupplierInput,
  WarehouseInput,
} from "./master.validation.js";

export class MasterService {
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

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";
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
    return buildPaginatedResult(result.rows, Number(countResult.rows[0].total), listQuery);
  }

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

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";
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
    return buildPaginatedResult(result.rows, Number(countResult.rows[0].total), listQuery);
  }

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

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";
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
    return buildPaginatedResult(result.rows, Number(countResult.rows[0].total), listQuery);
  }

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

  async listGrades(listQuery: ListQueryParams): Promise<unknown> {
    const whereClauses: string[] = [];
    const values: unknown[] = [];

    if (listQuery.search) {
      values.push(`%${escapeLikeQuery(listQuery.search)}%`);
      whereClauses.push(`(code ILIKE $${values.length} ESCAPE '\\' OR description ILIKE $${values.length} ESCAPE '\\')`);
    }
    if (listQuery.filters.code) {
      values.push(listQuery.filters.code);
      whereClauses.push(`code = $${values.length}`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";
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
    return buildPaginatedResult(result.rows, Number(countResult.rows[0].total), listQuery);
  }

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

  async listBagTypes(listQuery: ListQueryParams): Promise<unknown> {
    const whereClauses: string[] = [];
    const values: unknown[] = [];

    if (listQuery.search) {
      values.push(`%${escapeLikeQuery(listQuery.search)}%`);
      whereClauses.push(`name ILIKE $${values.length} ESCAPE '\\'`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";
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
    return buildPaginatedResult(result.rows, Number(countResult.rows[0].total), listQuery);
  }
}

export const masterService = new MasterService();

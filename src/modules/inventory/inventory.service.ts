import { ApiError } from "../../common/errors/ApiError.js";
import { EPSILON, refreshLotStatus, toNumber } from "../../common/dbHelpers.js";
import {
  ListQueryParams,
  buildPaginatedResult,
  escapeLikeQuery,
  toIntFilter,
} from "../../common/pagination.js";
import { query, withTransaction } from "../../db/pool.js";
import { notificationsService } from "../notifications/notifications.service.js";
import { StockAdjustmentInput } from "./inventory.validation.js";

export class InventoryService {
  async listLots(listQuery: ListQueryParams): Promise<unknown> {
    const whereClauses: string[] = [];
    const values: unknown[] = [];
    const gradeId = toIntFilter(listQuery.filters, "grade_id");
    const warehouseId = toIntFilter(listQuery.filters, "warehouse_id");
    const supplierId = toIntFilter(listQuery.filters, "supplier_id");

    if (listQuery.search) {
      values.push(`%${escapeLikeQuery(listQuery.search)}%`);
      whereClauses.push(`(l.lot_code ILIKE $${values.length} ESCAPE '\\' OR l.source_reference ILIKE $${values.length} ESCAPE '\\')`);
    }
    if (listQuery.filters.source) {
      values.push(listQuery.filters.source);
      whereClauses.push(`l.source = $${values.length}`);
    }
    if (listQuery.filters.status) {
      values.push(listQuery.filters.status);
      whereClauses.push(`l.status = $${values.length}`);
    }
    if (gradeId) {
      values.push(gradeId);
      whereClauses.push(`l.grade_id = $${values.length}`);
    }
    if (warehouseId) {
      values.push(warehouseId);
      whereClauses.push(`l.warehouse_id = $${values.length}`);
    }
    if (supplierId) {
      values.push(supplierId);
      whereClauses.push(`l.supplier_id = $${values.length}`);
    }
    if (listQuery.filters.crop_year) {
      values.push(listQuery.filters.crop_year);
      whereClauses.push(`l.crop_year = $${values.length}`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";
    const countResult = await query<{ total: number }>(
      `
      SELECT COUNT(*)::int AS total
      FROM lots l
      ${whereSql}
      `,
      values,
    );
    values.push(listQuery.pageSize, listQuery.offset);
    const result = await query(
      `
      SELECT
        l.id,
        l.lot_code,
        l.source,
        l.source_reference,
        l.crop_year,
        l.bags_total,
        l.weight_total_kg,
        l.weight_available_kg,
        l.purchase_price_per_kg,
        l.auction_fees_total,
        l.additional_cost_total,
        l.status,
        l.created_at,
        g.code AS grade,
        s.name AS supplier,
        w.name AS warehouse,
        bt.name AS bag_type
      FROM lots l
      JOIN grades g ON g.id = l.grade_id
      JOIN suppliers s ON s.id = l.supplier_id
      JOIN warehouses w ON w.id = l.warehouse_id
      JOIN bag_types bt ON bt.id = l.bag_type_id
      ${whereSql}
      ORDER BY l.${listQuery.sortBy} ${listQuery.sortOrder}
      LIMIT $${values.length - 1} OFFSET $${values.length};
      `,
      values,
    );
    return buildPaginatedResult(result.rows, Number(countResult.rows[0].total), listQuery);
  }

  async adjustStock(input: StockAdjustmentInput): Promise<unknown> {
    const adjustment = await withTransaction(async (client) => {
      const lotResult = await client.query("SELECT * FROM lots WHERE id = $1 FOR UPDATE", [
        input.lot_id,
      ]);
      if (lotResult.rowCount === 0) {
        throw new ApiError(404, `Lot ${input.lot_id} not found`);
      }

      const lot = lotResult.rows[0];
      const newTotal = toNumber(lot.weight_total_kg) + input.adjustment_kg;
      const newAvailable = toNumber(lot.weight_available_kg) + input.adjustment_kg;
      if (newTotal < -EPSILON || newAvailable < -EPSILON) {
        throw new ApiError(409, "Adjustment would make lot quantity negative");
      }

      await client.query(
        `
        UPDATE lots
        SET weight_total_kg = $1, weight_available_kg = $2
        WHERE id = $3;
        `,
        [Math.max(newTotal, 0), Math.max(newAvailable, 0), input.lot_id],
      );
      await refreshLotStatus(client, input.lot_id);

      const insertResult = await client.query(
        `
        INSERT INTO stock_adjustments (lot_id, adjustment_kg, reason, approved_by)
        VALUES ($1, $2, $3, $4)
        RETURNING *;
        `,
        [input.lot_id, input.adjustment_kg, input.reason, input.approved_by],
      );
      return {
        adjustment: insertResult.rows[0],
        lotCode: String(lot.lot_code),
      };
    });

    await notificationsService.notifyStockAdjusted({
      lotCode: adjustment.lotCode,
      adjustmentKg: input.adjustment_kg,
      reason: input.reason,
      approvedBy: input.approved_by,
    });

    return adjustment.adjustment;
  }

  async getDashboard(): Promise<unknown> {
    const lotsResult = await query(
      "SELECT grade_id, source, weight_total_kg, weight_available_kg FROM lots",
    );
    const gradesResult = await query("SELECT id, code FROM grades");
    const allocatedResult = await query(
      "SELECT COALESCE(SUM(allocated_kg), 0) AS total FROM allocations WHERE status = 'allocated'",
    );

    const gradeMap = new Map<number, string>();
    for (const row of gradesResult.rows) {
      gradeMap.set(Number(row.id), String(row.code));
    }

    let totalPhysical = 0;
    let available = 0;
    const byGrade: Record<string, { total_kg: number; available_kg: number }> = {};
    const bySource: Record<string, { total_kg: number; available_kg: number }> = {
      auction: { total_kg: 0, available_kg: 0 },
      direct: { total_kg: 0, available_kg: 0 },
    };

    for (const row of lotsResult.rows) {
      const total = toNumber(row.weight_total_kg);
      const free = toNumber(row.weight_available_kg);
      totalPhysical += total;
      available += free;

      const source = String(row.source);
      if (!bySource[source]) {
        bySource[source] = { total_kg: 0, available_kg: 0 };
      }
      bySource[source].total_kg += total;
      bySource[source].available_kg += free;

      const grade = gradeMap.get(Number(row.grade_id)) ?? "unknown";
      if (!byGrade[grade]) {
        byGrade[grade] = { total_kg: 0, available_kg: 0 };
      }
      byGrade[grade].total_kg += total;
      byGrade[grade].available_kg += free;
    }

    return {
      total_physical_stock_kg: Number(totalPhysical.toFixed(3)),
      allocated_stock_kg: Number(toNumber(allocatedResult.rows[0].total).toFixed(3)),
      available_to_sell_kg: Number(available.toFixed(3)),
      by_grade: byGrade,
      by_source: bySource,
    };
  }

  async getReferenceData(): Promise<unknown> {
    const [gradesResult, warehousesResult, suppliersResult, lotsResult] = await Promise.all([
      query(
        `
        SELECT id, code
        FROM grades
        ORDER BY code ASC
        `,
      ),
      query(
        `
        SELECT id, name
        FROM warehouses
        ORDER BY name ASC
        `,
      ),
      query(
        `
        SELECT id, name, supplier_type
        FROM suppliers
        ORDER BY name ASC
        `,
      ),
      query(
        `
        SELECT id, lot_code, source, status, weight_available_kg
        FROM lots
        ORDER BY created_at DESC, id DESC
        LIMIT 1000
        `,
      ),
    ]);

    return {
      grades: gradesResult.rows,
      warehouses: warehousesResult.rows,
      suppliers: suppliersResult.rows,
      lots: lotsResult.rows,
    };
  }
}

export const inventoryService = new InventoryService();

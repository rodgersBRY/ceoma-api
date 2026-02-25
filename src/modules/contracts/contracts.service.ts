import { ApiError } from "../../common/errors/ApiError.js";
import {
  EPSILON,
  ensureReference,
  refreshLotStatus,
  toNumber,
} from "../../common/dbHelpers.js";
import {
  ListQueryParams,
  buildPaginatedResult,
  escapeLikeQuery,
  toIntFilter,
} from "../../common/pagination.js";
import { query, withTransaction } from "../../db/pool.js";
import { notificationsService } from "../notifications/notifications.service.js";
import { AllocationInput, ContractInput } from "./contracts.validation.js";

export class ContractsService {
  async createContract(input: ContractInput): Promise<unknown> {
    const created = await withTransaction(async (client) => {
      await ensureReference(client, "buyers", input.buyer_id, "Buyer");
      if (input.grade_id) {
        await ensureReference(client, "grades", input.grade_id, "Grade");
      }

      const result = await client.query(
        `
        INSERT INTO contracts (
          contract_number, buyer_id, grade_id, quantity_kg, price_per_kg, price_terms,
          currency, shipment_window_start, shipment_window_end, allocated_kg, shipped_kg, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8::date, $9::date, 0, 0, 'open')
        RETURNING *;
        `,
        [
          input.contract_number,
          input.buyer_id,
          input.grade_id ?? null,
          input.quantity_kg,
          input.price_per_kg,
          input.price_terms,
          input.currency,
          input.shipment_window_start,
          input.shipment_window_end,
        ],
      );
      const buyerResult = await client.query("SELECT name FROM buyers WHERE id = $1", [input.buyer_id]);
      return {
        contract: result.rows[0],
        buyerName:
          (buyerResult.rowCount ?? 0) > 0
            ? String(buyerResult.rows[0].name)
            : String(input.buyer_id),
      };
    });

    await notificationsService.notifyContractCreated({
      contractNumber: String(created.contract.contract_number),
      buyerName: created.buyerName,
      quantityKg: toNumber(created.contract.quantity_kg),
      shipmentWindowStart: String(created.contract.shipment_window_start),
      shipmentWindowEnd: String(created.contract.shipment_window_end),
    });

    return created.contract;
  }

  async allocateLot(contractId: number, input: AllocationInput): Promise<unknown> {
    const allocated = await withTransaction(async (client) => {
      const contractResult = await client.query("SELECT * FROM contracts WHERE id = $1 FOR UPDATE", [
        contractId,
      ]);
      if (contractResult.rowCount === 0) {
        throw new ApiError(404, `Contract ${contractId} not found`);
      }
      const contract = contractResult.rows[0];
      if (String(contract.status) === "closed") {
        throw new ApiError(400, "Contract is closed");
      }

      const lotResult = await client.query("SELECT * FROM lots WHERE id = $1 FOR UPDATE", [input.lot_id]);
      if (lotResult.rowCount === 0) {
        throw new ApiError(404, `Lot ${input.lot_id} not found`);
      }
      const lot = lotResult.rows[0];

      const remainingContract = toNumber(contract.quantity_kg) - toNumber(contract.allocated_kg);
      if (input.allocated_kg - remainingContract > EPSILON) {
        throw new ApiError(409, "Allocation exceeds remaining contract quantity");
      }
      if (input.allocated_kg - toNumber(lot.weight_available_kg) > EPSILON) {
        throw new ApiError(409, "Allocation exceeds available lot quantity");
      }

      const insertResult = await client.query(
        `
        INSERT INTO allocations (contract_id, lot_id, allocated_kg, status)
        VALUES ($1, $2, $3, 'allocated')
        RETURNING *;
        `,
        [contractId, input.lot_id, input.allocated_kg],
      );

      const updatedContractResult = await client.query(
        "UPDATE contracts SET allocated_kg = allocated_kg + $1 WHERE id = $2 RETURNING contract_number, allocated_kg, quantity_kg",
        [input.allocated_kg, contractId],
      );
      await client.query(
        "UPDATE lots SET weight_available_kg = weight_available_kg - $1 WHERE id = $2",
        [input.allocated_kg, input.lot_id],
      );
      await refreshLotStatus(client, input.lot_id);
      const updatedContract = updatedContractResult.rows[0];
      return {
        allocation: insertResult.rows[0],
        contractNumber: String(updatedContract.contract_number),
        allocatedKg: toNumber(updatedContract.allocated_kg),
        quantityKg: toNumber(updatedContract.quantity_kg),
      };
    });

    if (allocated.allocatedKg + EPSILON >= allocated.quantityKg) {
      await notificationsService.notifyContractFullyAllocated({
        contractNumber: allocated.contractNumber,
        allocatedKg: allocated.allocatedKg,
      });
    }

    return allocated.allocation;
  }

  async getDashboard(listQuery: ListQueryParams): Promise<unknown> {
    const whereClauses: string[] = [];
    const values: unknown[] = [];
    const buyerId = toIntFilter(listQuery.filters, "buyer_id");

    if (listQuery.search) {
      values.push(`%${escapeLikeQuery(listQuery.search)}%`);
      whereClauses.push(`contract_number ILIKE $${values.length} ESCAPE '\\'`);
    }
    if (listQuery.filters.status) {
      values.push(listQuery.filters.status);
      whereClauses.push(`status = $${values.length}`);
    }
    if (buyerId) {
      values.push(buyerId);
      whereClauses.push(`buyer_id = $${values.length}`);
    }
    if (listQuery.filters.shipment_window_from) {
      values.push(listQuery.filters.shipment_window_from);
      whereClauses.push(`shipment_window_start >= $${values.length}::date`);
    }
    if (listQuery.filters.shipment_window_to) {
      values.push(listQuery.filters.shipment_window_to);
      whereClauses.push(`shipment_window_end <= $${values.length}::date`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";
    const countResult = await query<{ total: number }>(
      `SELECT COUNT(*)::int AS total FROM contracts ${whereSql}`,
      values,
    );
    values.push(listQuery.pageSize, listQuery.offset);
    const result = await query(
      `
      SELECT *
      FROM contracts
      ${whereSql}
      ORDER BY ${listQuery.sortBy} ${listQuery.sortOrder}
      LIMIT $${values.length - 1} OFFSET $${values.length}
      `,
      values,
    );
    const today = new Date();
    const openContracts = [];
    const riskAlerts = [];

    for (const row of result.rows) {
      const quantity = toNumber(row.quantity_kg);
      const shipped = toNumber(row.shipped_kg);
      const allocated = toNumber(row.allocated_kg);
      const unallocated = Math.max(quantity - allocated, 0);
      const fulfillment = quantity > 0 ? (shipped / quantity) * 100 : 0;
      const endDate = new Date(row.shipment_window_end);
      const msPerDay = 1000 * 60 * 60 * 24;
      const daysToClose = Math.floor((endDate.getTime() - today.getTime()) / msPerDay);

      openContracts.push({
        contract_id: row.id,
        contract_number: row.contract_number,
        status: row.status,
        fulfillment_percent: Number(fulfillment.toFixed(2)),
        unallocated_commitment_kg: Number(unallocated.toFixed(3)),
        shipment_window_end: row.shipment_window_end,
      });

      if (unallocated > EPSILON && daysToClose <= 7) {
        riskAlerts.push({
          contract_number: row.contract_number,
          issue: "Unallocated commitment near shipment window close",
          days_to_window_close: daysToClose,
          unallocated_kg: Number(unallocated.toFixed(3)),
        });
      }
    }

    const paginated = buildPaginatedResult(
      openContracts,
      Number(countResult.rows[0].total),
      listQuery,
    );
    return {
      data: paginated.data,
      meta: paginated.meta,
      risk_alerts: riskAlerts,
    };
  }

  async getReferenceData(): Promise<unknown> {
    const [buyersResult, gradesResult, contractsResult, lotsResult] = await Promise.all([
      query(
        `
        SELECT id, name, country
        FROM buyers
        ORDER BY name ASC
        `,
      ),
      query(
        `
        SELECT id, code, description
        FROM grades
        ORDER BY code ASC
        `,
      ),
      query(
        `
        SELECT id, contract_number, status, shipment_window_end
        FROM contracts
        WHERE status IN ('open', 'partially_fulfilled')
        ORDER BY shipment_window_end ASC, id DESC
        LIMIT 500
        `,
      ),
      query(
        `
        SELECT
          l.id,
          l.lot_code,
          l.source,
          l.status,
          l.weight_available_kg,
          g.code AS grade_code,
          s.name AS supplier_name
        FROM lots l
        JOIN grades g ON g.id = l.grade_id
        JOIN suppliers s ON s.id = l.supplier_id
        WHERE l.weight_available_kg > 0
          AND l.status IN ('in_stock', 'allocated')
        ORDER BY l.created_at DESC
        LIMIT 500
        `,
      ),
    ]);

    return {
      buyers: buyersResult.rows,
      grades: gradesResult.rows,
      contracts: contractsResult.rows,
      lots: lotsResult.rows,
    };
  }
}

export const contractsService = new ContractsService();

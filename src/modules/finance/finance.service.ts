import { ApiError } from "../../common/errors/ApiError.js";
import { ensureReference, toNumber } from "../../common/dbHelpers.js";
import { query, withTransaction } from "../../db/pool.js";
import { CostEntryInput } from "./finance.validation.js";

export class FinanceService {
  async createCostEntry(input: CostEntryInput): Promise<unknown> {
    return withTransaction(async (client) => {
      if (input.lot_id) {
        await ensureReference(client, "lots", input.lot_id, "Lot");
      }
      if (input.shipment_id) {
        await ensureReference(client, "shipments", input.shipment_id, "Shipment");
      }
      const result = await client.query(
        `
        INSERT INTO cost_entries (lot_id, shipment_id, category, amount, currency, notes)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *;
        `,
        [
          input.lot_id ?? null,
          input.shipment_id ?? null,
          input.category,
          input.amount,
          input.currency,
          input.notes ?? null,
        ],
      );
      return result.rows[0];
    });
  }

  async getContractProfitability(contractId: number): Promise<unknown> {
    const contractResult = await query("SELECT * FROM contracts WHERE id = $1", [contractId]);
    if (contractResult.rowCount === 0) {
      throw new ApiError(404, `Contract ${contractId} not found`);
    }
    const contract = contractResult.rows[0];

    const allocationResult = await query(
      `
      SELECT
        a.allocated_kg,
        a.shipment_id,
        l.weight_total_kg,
        l.purchase_price_per_kg,
        l.auction_fees_total,
        l.additional_cost_total
      FROM allocations a
      JOIN lots l ON l.id = a.lot_id
      WHERE a.contract_id = $1 AND a.status = 'shipped';
      `,
      [contractId],
    );

    let shippedKg = 0;
    let cogs = 0;
    const shipmentIds = new Set<number>();
    for (const row of allocationResult.rows) {
      const allocatedKg = toNumber(row.allocated_kg);
      const totalWeight = toNumber(row.weight_total_kg);
      const base = toNumber(row.purchase_price_per_kg);
      const additionalPerKg =
        totalWeight > 0
          ? (toNumber(row.auction_fees_total) + toNumber(row.additional_cost_total)) / totalWeight
          : 0;
      shippedKg += allocatedKg;
      cogs += allocatedKg * (base + additionalPerKg);
      if (row.shipment_id) {
        shipmentIds.add(Number(row.shipment_id));
      }
    }

    let shipmentCost = 0;
    if (shipmentIds.size > 0) {
      const shipmentCostResult = await query(
        "SELECT COALESCE(SUM(amount), 0) AS total FROM cost_entries WHERE shipment_id = ANY($1::int[])",
        [Array.from(shipmentIds)],
      );
      shipmentCost = toNumber(shipmentCostResult.rows[0].total);
    }

    const revenue = shippedKg * toNumber(contract.price_per_kg);
    const totalCost = cogs + shipmentCost;
    const margin = revenue - totalCost;
    const marginPercent = revenue > 0 ? (margin / revenue) * 100 : 0;

    return {
      contract_id: contract.id,
      contract_number: contract.contract_number,
      shipped_kg: Number(shippedKg.toFixed(3)),
      revenue: Number(revenue.toFixed(2)),
      cost_of_goods: Number(cogs.toFixed(2)),
      shipment_cost: Number(shipmentCost.toFixed(2)),
      total_cost: Number(totalCost.toFixed(2)),
      margin: Number(margin.toFixed(2)),
      margin_percent: Number(marginPercent.toFixed(2)),
    };
  }

  async getReferenceData(): Promise<unknown> {
    const [contractsResult, lotsResult, shipmentsResult] = await Promise.all([
      query(
        `
        SELECT id, contract_number, status
        FROM contracts
        ORDER BY created_at DESC, id DESC
        LIMIT 500
        `,
      ),
      query(
        `
        SELECT id, lot_code, source, status
        FROM lots
        ORDER BY created_at DESC, id DESC
        LIMIT 1000
        `,
      ),
      query(
        `
        SELECT id, shipment_number, status
        FROM shipments
        ORDER BY created_at DESC, id DESC
        LIMIT 500
        `,
      ),
    ]);

    return {
      contracts: contractsResult.rows,
      lots: lotsResult.rows,
      shipments: shipmentsResult.rows,
    };
  }
}

export const financeService = new FinanceService();

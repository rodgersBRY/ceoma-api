import { randomUUID } from "node:crypto";
import request from "supertest";
import { getTestApp } from "../testApp.js";
import { authHeader } from "../factories.js";

/**
 * Inventory has no lot-creation endpoint of its own - lots are created via
 * procurement (auction or direct). This provisions the minimal prerequisite
 * chain (warehouse, non-auction supplier, direct agreement, direct delivery)
 * using grades/bag types that are auto-seeded per org, then returns the
 * resulting lot so inventory endpoints have something real to operate on.
 */
export async function createLotForOrg(
  accessToken: string,
  overrides: Partial<{ weight_total_kg: number; bags: number }> = {},
): Promise<{
  id: string;
  lot_code: string;
  weight_total_kg: string;
  weight_available_kg: string;
  organization_id: string;
}> {
  const app = getTestApp();
  const headers = authHeader(accessToken);

  const gradesRes = await request(app).get("/api/v1/master/grades").set(headers);
  if (gradesRes.status !== 200 || gradesRes.body.data.length === 0) {
    throw new Error(
      `createLotForOrg: could not fetch seeded grades: ${gradesRes.status} ${JSON.stringify(gradesRes.body)}`,
    );
  }
  const gradeId = gradesRes.body.data[0].id;

  const bagTypesRes = await request(app).get("/api/v1/master/bag-types").set(headers);
  if (bagTypesRes.status !== 200 || bagTypesRes.body.data.length === 0) {
    throw new Error(
      `createLotForOrg: could not fetch seeded bag types: ${bagTypesRes.status} ${JSON.stringify(bagTypesRes.body)}`,
    );
  }
  const bagTypeId = bagTypesRes.body.data[0].id;

  const warehouseRes = await request(app)
    .post("/api/v1/master/warehouses")
    .set(headers)
    .send({ name: `Test Warehouse ${randomUUID()}` });
  if (warehouseRes.status !== 201) {
    throw new Error(
      `createLotForOrg: warehouse creation failed: ${warehouseRes.status} ${JSON.stringify(warehouseRes.body)}`,
    );
  }
  const warehouseId = warehouseRes.body.id;

  const supplierRes = await request(app)
    .post("/api/v1/master/suppliers")
    .set(headers)
    .send({ name: `Test Supplier ${randomUUID()}`, type: "mill" });
  if (supplierRes.status !== 201) {
    throw new Error(
      `createLotForOrg: supplier creation failed: ${supplierRes.status} ${JSON.stringify(supplierRes.body)}`,
    );
  }
  const supplierId = supplierRes.body.id;

  const agreementRes = await request(app)
    .post("/api/v1/procurement/direct-agreements")
    .set(headers)
    .send({
      supplier_id: supplierId,
      agreement_reference: `AGMT-${randomUUID()}`,
      agreed_price_per_kg: 4.5,
      currency: "USD",
      crop_year: "2025",
    });
  if (agreementRes.status !== 201) {
    throw new Error(
      `createLotForOrg: direct agreement creation failed: ${agreementRes.status} ${JSON.stringify(agreementRes.body)}`,
    );
  }
  const agreementId = agreementRes.body.id;

  const deliveryRes = await request(app)
    .post("/api/v1/procurement/direct-deliveries")
    .set(headers)
    .send({
      agreement_id: agreementId,
      internal_lot_id: `LOT-${randomUUID()}`,
      delivery_reference: `DEL-${randomUUID()}`,
      grade_id: gradeId,
      warehouse_id: warehouseId,
      bag_type_id: bagTypeId,
      bags: overrides.bags ?? 10,
      weight_total_kg: overrides.weight_total_kg ?? 600,
      moisture_percent: 11.5,
      screen_size: 15,
      defects_percent: 2,
    });
  if (deliveryRes.status !== 201) {
    throw new Error(
      `createLotForOrg: direct delivery creation failed: ${deliveryRes.status} ${JSON.stringify(deliveryRes.body)}`,
    );
  }

  return deliveryRes.body;
}

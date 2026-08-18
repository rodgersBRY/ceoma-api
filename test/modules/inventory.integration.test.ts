import { randomUUID } from "node:crypto";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { getTestApp } from "../testApp.js";
import { authHeader, provisionOrgAndAdmin, uniqueEmail } from "../factories.js";
import { createLotForOrg } from "./inventory.testHelpers.js";

const app = getTestApp();

/**
 * Registers a second user in the given org with a role outside
 * {admin, warehouse, trader} - the set authorized on /api/v1/inventory -
 * and returns their access token for RBAC-forbidden assertions.
 */
async function createNonInventoryRoleUser(adminAccessToken: string): Promise<string> {
  const email = uniqueEmail("finance");
  const password = "AnotherSecurePassw0rd!";
  const registerRes = await request(app)
    .post("/api/v1/auth/register")
    .set(authHeader(adminAccessToken))
    .send({
      email,
      password,
      full_name: "Finance User",
      role: "finance",
    });
  if (registerRes.status !== 201) {
    throw new Error(
      `createNonInventoryRoleUser: register failed: ${registerRes.status} ${JSON.stringify(registerRes.body)}`,
    );
  }

  const loginRes = await request(app).post("/api/v1/auth/login").send({ email, password });
  if (loginRes.status !== 200) {
    throw new Error(
      `createNonInventoryRoleUser: login failed: ${loginRes.status} ${JSON.stringify(loginRes.body)}`,
    );
  }
  return loginRes.body.access_token;
}

describe("inventory integration", () => {
  describe("GET /api/v1/inventory/lots", () => {
    it("lists lots belonging to the caller's org", async () => {
      const org = await provisionOrgAndAdmin();
      const lot = await createLotForOrg(org.accessToken);

      const res = await request(app)
        .get("/api/v1/inventory/lots")
        .set(authHeader(org.accessToken));

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      const ids = res.body.data.map((l: { id: string }) => l.id);
      expect(ids).toContain(lot.id);
    });

    it("rejects an invalid sort_by with 400", async () => {
      const org = await provisionOrgAndAdmin();

      const res = await request(app)
        .get("/api/v1/inventory/lots")
        .query({ sort_by: "not_a_real_column" })
        .set(authHeader(org.accessToken));

      expect(res.status).toBe(400);
    });

    it("rejects a caller whose role is not admin/warehouse/trader", async () => {
      const org = await provisionOrgAndAdmin();
      const forbiddenToken = await createNonInventoryRoleUser(org.accessToken);

      const res = await request(app)
        .get("/api/v1/inventory/lots")
        .set(authHeader(forbiddenToken));

      expect(res.status).toBe(403);
    });
  });

  describe("GET /api/v1/inventory/dashboard", () => {
    it("returns aggregate stock figures for the caller's org", async () => {
      const org = await provisionOrgAndAdmin();
      await createLotForOrg(org.accessToken, { weight_total_kg: 500 });

      const res = await request(app)
        .get("/api/v1/inventory/dashboard")
        .set(authHeader(org.accessToken));

      expect(res.status).toBe(200);
      expect(res.body.total_physical_stock_kg).toEqual(expect.any(Number));
      expect(res.body.available_to_sell_kg).toEqual(expect.any(Number));
      expect(res.body.total_physical_stock_kg).toBeGreaterThanOrEqual(500);
      expect(res.body.by_grade).toEqual(expect.any(Object));
      expect(res.body.by_source).toEqual(expect.any(Object));
    });

    it("rejects a caller whose role is not admin/warehouse/trader", async () => {
      const org = await provisionOrgAndAdmin();
      const forbiddenToken = await createNonInventoryRoleUser(org.accessToken);

      const res = await request(app)
        .get("/api/v1/inventory/dashboard")
        .set(authHeader(forbiddenToken));

      expect(res.status).toBe(403);
    });
  });

  describe("GET /api/v1/inventory/reference-data", () => {
    it("returns grades, warehouses, suppliers, and lots for the caller's org", async () => {
      const org = await provisionOrgAndAdmin();
      const lot = await createLotForOrg(org.accessToken);

      const res = await request(app)
        .get("/api/v1/inventory/reference-data")
        .set(authHeader(org.accessToken));

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.grades)).toBe(true);
      expect(res.body.grades.length).toBeGreaterThan(0);
      expect(Array.isArray(res.body.warehouses)).toBe(true);
      expect(Array.isArray(res.body.suppliers)).toBe(true);
      expect(Array.isArray(res.body.lots)).toBe(true);
      const lotIds = res.body.lots.map((l: { id: string }) => l.id);
      expect(lotIds).toContain(lot.id);
    });
  });

  describe("POST /api/v1/inventory/adjustments", () => {
    it("adjusts stock for an existing lot and reflects it in the lot's weight", async () => {
      const org = await provisionOrgAndAdmin();
      const lot = await createLotForOrg(org.accessToken, { weight_total_kg: 500 });

      const res = await request(app)
        .post("/api/v1/inventory/adjustments")
        .set(authHeader(org.accessToken))
        .send({
          lot_id: lot.id,
          adjustment_kg: -20,
          reason: "Moisture loss during storage",
          approved_by: "Warehouse Supervisor",
        });

      expect(res.status).toBe(201);
      expect(res.body.lot_id).toBe(lot.id);
      expect(res.body.adjustment_kg).toEqual(expect.any(String));
      expect(Number(res.body.adjustment_kg)).toBe(-20);

      const listRes = await request(app)
        .get("/api/v1/inventory/lots")
        .set(authHeader(org.accessToken));
      const updatedLot = listRes.body.data.find((l: { id: string }) => l.id === lot.id);
      expect(Number(updatedLot.weight_total_kg)).toBe(480);
      expect(Number(updatedLot.weight_available_kg)).toBe(480);
    });

    it("rejects a payload missing required fields with 400", async () => {
      const org = await provisionOrgAndAdmin();
      const lot = await createLotForOrg(org.accessToken);

      const res = await request(app)
        .post("/api/v1/inventory/adjustments")
        .set(authHeader(org.accessToken))
        .send({
          lot_id: lot.id,
          adjustment_kg: -5,
          // reason and approved_by omitted
        });

      expect(res.status).toBe(400);
      expect(res.body.issues).toBeDefined();
    });

    it("returns 404 for a lot that does not exist", async () => {
      const org = await provisionOrgAndAdmin();

      const res = await request(app)
        .post("/api/v1/inventory/adjustments")
        .set(authHeader(org.accessToken))
        .send({
          lot_id: randomUUID(),
          adjustment_kg: 5,
          reason: "Correction",
          approved_by: "Warehouse Supervisor",
        });

      expect(res.status).toBe(404);
    });

    it("returns 409 when the adjustment would make lot quantity negative", async () => {
      const org = await provisionOrgAndAdmin();
      const lot = await createLotForOrg(org.accessToken, { weight_total_kg: 100 });

      const res = await request(app)
        .post("/api/v1/inventory/adjustments")
        .set(authHeader(org.accessToken))
        .send({
          lot_id: lot.id,
          adjustment_kg: -1000,
          reason: "Impossible correction",
          approved_by: "Warehouse Supervisor",
        });

      expect(res.status).toBe(409);
    });

    it("rejects a caller whose role is not admin/warehouse/trader", async () => {
      const org = await provisionOrgAndAdmin();
      const lot = await createLotForOrg(org.accessToken);
      const forbiddenToken = await createNonInventoryRoleUser(org.accessToken);

      const res = await request(app)
        .post("/api/v1/inventory/adjustments")
        .set(authHeader(forbiddenToken))
        .send({
          lot_id: lot.id,
          adjustment_kg: 1,
          reason: "Should not happen",
          approved_by: "Nobody",
        });

      expect(res.status).toBe(403);
    });
  });
});

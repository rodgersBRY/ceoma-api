import { randomUUID } from "node:crypto";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { getTestApp } from "../testApp.js";
import { authHeader, provisionOrgAndAdmin, uniqueEmail } from "../factories.js";
import { buildShipmentContext } from "./shipmentContext.fixtures.js";

const app = getTestApp();

async function createUserWithRole(adminAccessToken: string, role: string): Promise<string> {
  const email = uniqueEmail(role);
  const password = "AnotherSecurePassw0rd!";
  const registerRes = await request(app)
    .post("/api/v1/auth/register")
    .set(authHeader(adminAccessToken))
    .send({ email, password, full_name: `${role} user`, role });
  expect(registerRes.status).toBe(201);

  const loginRes = await request(app).post("/api/v1/auth/login").send({ email, password });
  expect(loginRes.status).toBe(200);
  return loginRes.body.access_token;
}

describe("finance integration", () => {
  describe("POST /api/v1/costs/entries", () => {
    it("creates a cost entry attached to a shipment", async () => {
      const org = await provisionOrgAndAdmin();
      const ctx = await buildShipmentContext(org.accessToken);

      const res = await request(app)
        .post("/api/v1/costs/entries")
        .set(authHeader(org.accessToken))
        .send({
          shipment_id: ctx.shipmentId,
          category: "freight",
          amount: 250.75,
          currency: "USD",
          notes: "trucking to port of Mombasa",
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toEqual(expect.any(String));
      expect(res.body.shipment_id).toBe(ctx.shipmentId);
      expect(Number(res.body.amount)).toBeCloseTo(250.75);
    });

    it("creates a cost entry attached to a lot", async () => {
      const org = await provisionOrgAndAdmin();
      const ctx = await buildShipmentContext(org.accessToken);

      const res = await request(app)
        .post("/api/v1/costs/entries")
        .set(authHeader(org.accessToken))
        .send({
          lot_id: ctx.lotId,
          category: "warehousing",
          amount: 40,
        });

      expect(res.status).toBe(201);
      expect(res.body.lot_id).toBe(ctx.lotId);
    });

    it("rejects a malformed body", async () => {
      const org = await provisionOrgAndAdmin();

      const res = await request(app)
        .post("/api/v1/costs/entries")
        .set(authHeader(org.accessToken))
        .send({ category: "freight", amount: -10 });

      expect(res.status).toBe(400);
      expect(res.body.issues).toBeDefined();
    });

    it("404s when the referenced shipment does not exist", async () => {
      const org = await provisionOrgAndAdmin();

      const res = await request(app)
        .post("/api/v1/costs/entries")
        .set(authHeader(org.accessToken))
        .send({ shipment_id: randomUUID(), category: "freight", amount: 10 });

      expect(res.status).toBe(404);
    });

    it("rejects a role not permitted on the costs router", async () => {
      const org = await provisionOrgAndAdmin();
      const traderToken = await createUserWithRole(org.accessToken, "trader");

      const res = await request(app)
        .post("/api/v1/costs/entries")
        .set(authHeader(traderToken))
        .send({ category: "freight", amount: 10 });

      expect(res.status).toBe(403);
    });

    it("rejects a request with no token", async () => {
      const res = await request(app)
        .post("/api/v1/costs/entries")
        .send({ category: "freight", amount: 10 });

      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/v1/costs/reference-data", () => {
    it("returns contracts, lots, and shipments scoped to the org", async () => {
      const org = await provisionOrgAndAdmin();
      const ctx = await buildShipmentContext(org.accessToken);

      const res = await request(app)
        .get("/api/v1/costs/reference-data")
        .set(authHeader(org.accessToken));

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.contracts)).toBe(true);
      expect(Array.isArray(res.body.lots)).toBe(true);
      expect(Array.isArray(res.body.shipments)).toBe(true);
      const shipmentIds = res.body.shipments.map((s: { id: string }) => s.id);
      expect(shipmentIds).toContain(ctx.shipmentId);
    });
  });

  describe("GET /api/v1/profitability/contracts/:contractId", () => {
    it("computes profitability for a fully shipped contract", async () => {
      const org = await provisionOrgAndAdmin();
      const ctx = await buildShipmentContext(org.accessToken, {
        weightTotalKg: 1000,
        quantityKg: 1000,
        allocatedKg: 1000,
      });
      await request(app)
        .post("/api/v1/costs/entries")
        .set(authHeader(org.accessToken))
        .send({ shipment_id: ctx.shipmentId, category: "freight", amount: 100 });

      const res = await request(app)
        .get(`/api/v1/profitability/contracts/${ctx.contractId}`)
        .set(authHeader(org.accessToken));

      expect(res.status).toBe(200);
      expect(res.body.contract_id).toBe(ctx.contractId);
      expect(res.body.shipped_kg).toBe(1000);
      expect(res.body.revenue).toBeGreaterThan(0);
      expect(res.body.shipment_cost).toBe(100);
      expect(res.body.margin).toBe(res.body.revenue - res.body.total_cost);
    });

    it("404s for an unknown contract id", async () => {
      const org = await provisionOrgAndAdmin();

      const res = await request(app)
        .get(`/api/v1/profitability/contracts/${randomUUID()}`)
        .set(authHeader(org.accessToken));

      expect(res.status).toBe(404);
    });

    it("400s for a malformed contract id", async () => {
      const org = await provisionOrgAndAdmin();

      const res = await request(app)
        .get("/api/v1/profitability/contracts/not-a-uuid")
        .set(authHeader(org.accessToken));

      expect(res.status).toBe(400);
    });

    it("rejects a role not permitted on the profitability router", async () => {
      const org = await provisionOrgAndAdmin();
      const warehouseToken = await createUserWithRole(org.accessToken, "warehouse");

      const res = await request(app)
        .get(`/api/v1/profitability/contracts/${randomUUID()}`)
        .set(authHeader(warehouseToken));

      expect(res.status).toBe(403);
    });

    it("allows a trader (in addition to admin/finance) to read profitability", async () => {
      const org = await provisionOrgAndAdmin();
      const ctx = await buildShipmentContext(org.accessToken);
      const traderToken = await createUserWithRole(org.accessToken, "trader");

      const res = await request(app)
        .get(`/api/v1/profitability/contracts/${ctx.contractId}`)
        .set(authHeader(traderToken));

      expect(res.status).toBe(200);
    });
  });

  describe("cross-org isolation", () => {
    it("404s when org B queries profitability for org A's contract", async () => {
      const orgA = await provisionOrgAndAdmin();
      const orgB = await provisionOrgAndAdmin();
      const ctxA = await buildShipmentContext(orgA.accessToken);

      const res = await request(app)
        .get(`/api/v1/profitability/contracts/${ctxA.contractId}`)
        .set(authHeader(orgB.accessToken));

      expect(res.status).toBe(404);
    });
  });
});

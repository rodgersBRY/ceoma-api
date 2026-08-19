import { randomUUID } from "node:crypto";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { getTestApp } from "../testApp.js";
import { authHeader, provisionOrgAndAdmin, uniqueEmail } from "../factories.js";
import { buildShippableContext, buildShipmentContext } from "./shipmentContext.fixtures.js";

const app = getTestApp();

/**
 * Registers a second user in the given org with a role that is NOT allowed
 * on the shipments router (admin, trader, warehouse, compliance are all
 * allowed - so "finance" is the one role guaranteed to be forbidden), then
 * logs them in and returns their access token. Mirrors the RBAC pattern
 * used in auth.integration.test.ts.
 */
async function createForbiddenRoleUser(adminAccessToken: string): Promise<string> {
  const email = uniqueEmail("finance");
  const password = "AnotherSecurePassw0rd!";
  const registerRes = await request(app)
    .post("/api/v1/auth/register")
    .set(authHeader(adminAccessToken))
    .send({ email, password, full_name: "Finance User", role: "finance" });
  expect(registerRes.status).toBe(201);

  const loginRes = await request(app).post("/api/v1/auth/login").send({ email, password });
  expect(loginRes.status).toBe(200);
  return loginRes.body.access_token;
}

describe("shipments integration", () => {
  describe("POST /api/v1/shipments", () => {
    it("creates a shipment from an allocated contract lot", async () => {
      const org = await provisionOrgAndAdmin();
      const ctx = await buildShippableContext(org.accessToken);

      const res = await request(app)
        .post("/api/v1/shipments")
        .set(authHeader(org.accessToken))
        .send({
          shipment_number: `SHP-${randomUUID()}`,
          contract_id: ctx.contractId,
          allocation_ids: [ctx.allocationId],
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toEqual(expect.any(String));
      expect(res.body.status).toBe("planned");
      expect(res.body.contract_id).toBe(ctx.contractId);
    });

    it("rejects a malformed body", async () => {
      const org = await provisionOrgAndAdmin();

      const res = await request(app)
        .post("/api/v1/shipments")
        .set(authHeader(org.accessToken))
        .send({ shipment_number: "SHP-BAD" });

      expect(res.status).toBe(400);
      expect(res.body.issues).toBeDefined();
    });

    it("rejects a role not permitted on the shipments router", async () => {
      const org = await provisionOrgAndAdmin();
      const forbiddenToken = await createForbiddenRoleUser(org.accessToken);

      const res = await request(app)
        .post("/api/v1/shipments")
        .set(authHeader(forbiddenToken))
        .send({
          shipment_number: `SHP-${randomUUID()}`,
          contract_id: randomUUID(),
          allocation_ids: [randomUUID()],
        });

      expect(res.status).toBe(403);
    });

    it("404s when the contract does not exist", async () => {
      const org = await provisionOrgAndAdmin();

      const res = await request(app)
        .post("/api/v1/shipments")
        .set(authHeader(org.accessToken))
        .send({
          shipment_number: `SHP-${randomUUID()}`,
          contract_id: randomUUID(),
          allocation_ids: [randomUUID()],
        });

      expect(res.status).toBe(404);
    });
  });

  describe("PATCH /api/v1/shipments/:shipmentId/status", () => {
    it("advances shipment status forward", async () => {
      const org = await provisionOrgAndAdmin();
      const ctx = await buildShipmentContext(org.accessToken);

      const res = await request(app)
        .patch(`/api/v1/shipments/${ctx.shipmentId}/status`)
        .set(authHeader(org.accessToken))
        .send({ status: "stuffed" });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("stuffed");
    });

    it("rejects moving status backwards", async () => {
      const org = await provisionOrgAndAdmin();
      const ctx = await buildShipmentContext(org.accessToken);

      await request(app)
        .patch(`/api/v1/shipments/${ctx.shipmentId}/status`)
        .set(authHeader(org.accessToken))
        .send({ status: "cleared" });

      const res = await request(app)
        .patch(`/api/v1/shipments/${ctx.shipmentId}/status`)
        .set(authHeader(org.accessToken))
        .send({ status: "planned" });

      expect(res.status).toBe(409);
    });

    it("rejects an invalid status value", async () => {
      const org = await provisionOrgAndAdmin();
      const ctx = await buildShipmentContext(org.accessToken);

      const res = await request(app)
        .patch(`/api/v1/shipments/${ctx.shipmentId}/status`)
        .set(authHeader(org.accessToken))
        .send({ status: "delivered" });

      expect(res.status).toBe(400);
      expect(res.body.issues).toBeDefined();
    });

    it("rejects a role not permitted on the shipments router", async () => {
      const org = await provisionOrgAndAdmin();
      const ctx = await buildShipmentContext(org.accessToken);
      const forbiddenToken = await createForbiddenRoleUser(org.accessToken);

      const res = await request(app)
        .patch(`/api/v1/shipments/${ctx.shipmentId}/status`)
        .set(authHeader(forbiddenToken))
        .send({ status: "stuffed" });

      expect(res.status).toBe(403);
    });

    it("404s for an unknown shipment id", async () => {
      const org = await provisionOrgAndAdmin();

      const res = await request(app)
        .patch(`/api/v1/shipments/${randomUUID()}/status`)
        .set(authHeader(org.accessToken))
        .send({ status: "stuffed" });

      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/v1/shipments/:shipmentId/documents/generate", () => {
    it("generates the requested documents", async () => {
      const org = await provisionOrgAndAdmin();
      const ctx = await buildShipmentContext(org.accessToken);

      const res = await request(app)
        .post(`/api/v1/shipments/${ctx.shipmentId}/documents/generate`)
        .set(authHeader(org.accessToken))
        .send({ doc_types: ["commercial_invoice", "packing_list"] });

      expect(res.status).toBe(201);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
      const docTypes = res.body.map((d: { document_type: string }) => d.document_type);
      expect(docTypes).toContain("commercial_invoice");
      expect(docTypes).toContain("packing_list");
    });

    it("rejects an empty doc_types array", async () => {
      const org = await provisionOrgAndAdmin();
      const ctx = await buildShipmentContext(org.accessToken);

      const res = await request(app)
        .post(`/api/v1/shipments/${ctx.shipmentId}/documents/generate`)
        .set(authHeader(org.accessToken))
        .send({ doc_types: [] });

      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/v1/shipments/:shipmentId/documents", () => {
    it("lists documents generated for a shipment", async () => {
      const org = await provisionOrgAndAdmin();
      const ctx = await buildShipmentContext(org.accessToken);
      await request(app)
        .post(`/api/v1/shipments/${ctx.shipmentId}/documents/generate`)
        .set(authHeader(org.accessToken))
        .send({ doc_types: ["packing_list"] });

      const res = await request(app)
        .get(`/api/v1/shipments/${ctx.shipmentId}/documents`)
        .set(authHeader(org.accessToken));

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });

  describe("GET /api/v1/shipments/reference-data", () => {
    it("returns contracts, allocations, and shipments scoped to the org", async () => {
      const org = await provisionOrgAndAdmin();
      const ctx = await buildShipmentContext(org.accessToken);

      const res = await request(app)
        .get("/api/v1/shipments/reference-data")
        .set(authHeader(org.accessToken));

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.contracts)).toBe(true);
      expect(Array.isArray(res.body.allocations)).toBe(true);
      expect(Array.isArray(res.body.shipments)).toBe(true);
      const shipmentIds = res.body.shipments.map((s: { id: string }) => s.id);
      expect(shipmentIds).toContain(ctx.shipmentId);
    });

    it("rejects a request with no token", async () => {
      const res = await request(app).get("/api/v1/shipments/reference-data");
      expect(res.status).toBe(401);
    });
  });

  describe("cross-org isolation", () => {
    it("hides org A's shipment from org B and 404s on cross-org status update", async () => {
      const orgA = await provisionOrgAndAdmin();
      const orgB = await provisionOrgAndAdmin();
      const ctxA = await buildShipmentContext(orgA.accessToken);

      const orgBReferenceData = await request(app)
        .get("/api/v1/shipments/reference-data")
        .set(authHeader(orgB.accessToken));
      expect(orgBReferenceData.status).toBe(200);
      const orgBShipmentIds = orgBReferenceData.body.shipments.map((s: { id: string }) => s.id);
      expect(orgBShipmentIds).not.toContain(ctxA.shipmentId);

      const crossOrgUpdate = await request(app)
        .patch(`/api/v1/shipments/${ctxA.shipmentId}/status`)
        .set(authHeader(orgB.accessToken))
        .send({ status: "stuffed" });
      expect(crossOrgUpdate.status).toBe(404);

      const crossOrgDocs = await request(app)
        .get(`/api/v1/shipments/${ctxA.shipmentId}/documents`)
        .set(authHeader(orgB.accessToken));
      expect(crossOrgDocs.status).toBe(200);
      expect(crossOrgDocs.body.data.length).toBe(0);
    });
  });
});

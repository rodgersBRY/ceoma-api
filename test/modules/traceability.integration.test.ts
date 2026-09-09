import { randomUUID } from "node:crypto";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { getTestApp } from "../testApp.js";
import { authHeader, provisionOrgAndAdmin, uniqueEmail } from "../factories.js";
import { createAuctionLot, createDirectLot } from "./fixtures.js";

const app = getTestApp();

async function loginAs(email: string, password: string): Promise<string> {
  const res = await request(app).post("/api/v1/auth/login").send({ email, password });
  if (res.status !== 200) {
    throw new Error(`login failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body.access_token as string;
}

async function createRestrictedRoleUser(
  adminToken: string,
  role: "warehouse" | "finance",
): Promise<string> {
  const email = uniqueEmail(role);
  const password = "AnotherSecurePassw0rd!";
  const res = await request(app)
    .post("/api/v1/auth/register")
    .set(authHeader(adminToken))
    .send({ email, password, full_name: `Restricted ${role}`, role });
  if (res.status !== 201) {
    throw new Error(`createRestrictedRoleUser failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return loginAs(email, password);
}

/**
 * traceability has no *.validation.ts (no create/write endpoints of its
 * own - it's a read-only aggregation over lots/procurement/allocations/
 * shipments), so there are no Zod schemas to unit test here. Coverage
 * focuses on the two GET endpoints against real lot data.
 */
describe("traceability integration", () => {
  describe("GET /api/v1/traceability/lots/:lotId", () => {
    it("returns full traceability for a direct-delivery lot", async () => {
      const org = await provisionOrgAndAdmin();
      const { lot, supplier, agreementId } = await createDirectLot(org.accessToken);

      const res = await request(app)
        .get(`/api/v1/traceability/lots/${lot.id}`)
        .set(authHeader(org.accessToken));

      expect(res.status).toBe(200);
      expect(res.body.lot.id).toBe(lot.id);
      expect(res.body.procurement.source).toBe("direct");
      expect(res.body.procurement.agreement_id).toBe(agreementId);
      expect(res.body.procurement.quality_metrics).toBeDefined();
      expect(Array.isArray(res.body.allocations)).toBe(true);
      expect(Array.isArray(res.body.shipments)).toBe(true);
      expect(Array.isArray(res.body.documents)).toBe(true);
      expect(res.body.allocations.length).toBe(0);
    });

    it("returns full traceability for an auction lot", async () => {
      const org = await provisionOrgAndAdmin();
      const { lot, marketingAgent } = await createAuctionLot(org.accessToken);

      const res = await request(app)
        .get(`/api/v1/traceability/lots/${lot.id}`)
        .set(authHeader(org.accessToken));

      expect(res.status).toBe(200);
      expect(res.body.lot.id).toBe(lot.id);
      expect(res.body.procurement.source).toBe("auction");
      expect(res.body.procurement.marketing_agent_id).toBe(marketingAgent.id);
    });

    it("rejects a malformed lotId", async () => {
      const org = await provisionOrgAndAdmin();

      const res = await request(app)
        .get("/api/v1/traceability/lots/not-a-uuid")
        .set(authHeader(org.accessToken));

      expect(res.status).toBe(400);
    });

    it("returns 404 for a lot that doesn't exist", async () => {
      const org = await provisionOrgAndAdmin();

      const res = await request(app)
        .get(`/api/v1/traceability/lots/${randomUUID()}`)
        .set(authHeader(org.accessToken));

      expect(res.status).toBe(404);
    });

    it("rejects a non-admin/compliance/trader role", async () => {
      const org = await provisionOrgAndAdmin();
      const { lot } = await createDirectLot(org.accessToken);
      const restrictedToken = await createRestrictedRoleUser(org.accessToken, "warehouse");

      const res = await request(app)
        .get(`/api/v1/traceability/lots/${lot.id}`)
        .set(authHeader(restrictedToken));

      expect(res.status).toBe(403);
    });

    it("rejects an unauthenticated request", async () => {
      const org = await provisionOrgAndAdmin();
      const { lot } = await createDirectLot(org.accessToken);

      const res = await request(app).get(`/api/v1/traceability/lots/${lot.id}`);

      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/v1/traceability/reference-data", () => {
    it("returns lot options for the org", async () => {
      const org = await provisionOrgAndAdmin();
      const { lot } = await createDirectLot(org.accessToken);

      const res = await request(app)
        .get("/api/v1/traceability/reference-data")
        .set(authHeader(org.accessToken));

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.lots)).toBe(true);
      const lotIds = res.body.lots.map((l: { id: string }) => l.id);
      expect(lotIds).toContain(lot.id);
    });

    it("rejects a non-admin/compliance/trader role", async () => {
      const org = await provisionOrgAndAdmin();
      const restrictedToken = await createRestrictedRoleUser(org.accessToken, "finance");

      const res = await request(app)
        .get("/api/v1/traceability/reference-data")
        .set(authHeader(restrictedToken));

      expect(res.status).toBe(403);
    });
  });

  describe("cross-org isolation", () => {
    it("hides one org's lot from another org's reference-data", async () => {
      const orgA = await provisionOrgAndAdmin();
      const orgB = await provisionOrgAndAdmin();
      const { lot } = await createDirectLot(orgA.accessToken);

      const orgBRefData = await request(app)
        .get("/api/v1/traceability/reference-data")
        .set(authHeader(orgB.accessToken));
      expect(orgBRefData.status).toBe(200);
      const orgBLotIds = orgBRefData.body.lots.map((l: { id: string }) => l.id);
      expect(orgBLotIds).not.toContain(lot.id);

      const orgARefData = await request(app)
        .get("/api/v1/traceability/reference-data")
        .set(authHeader(orgA.accessToken));
      const orgALotIds = orgARefData.body.lots.map((l: { id: string }) => l.id);
      expect(orgALotIds).toContain(lot.id);
    });

    it("returns 404 when another org tries to fetch traceability by lot id", async () => {
      const orgA = await provisionOrgAndAdmin();
      const orgB = await provisionOrgAndAdmin();
      const { lot } = await createDirectLot(orgA.accessToken);

      const res = await request(app)
        .get(`/api/v1/traceability/lots/${lot.id}`)
        .set(authHeader(orgB.accessToken));

      expect(res.status).toBe(404);
    });
  });
});

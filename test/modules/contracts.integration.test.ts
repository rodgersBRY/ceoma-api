import { randomUUID } from "node:crypto";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { getTestApp } from "../testApp.js";
import { authHeader, provisionOrgAndAdmin, uniqueEmail } from "../factories.js";
import { createBuyer, createDirectLot } from "./fixtures.js";

const app = getTestApp();

function validContractPayload(buyerId: string, overrides: Record<string, unknown> = {}) {
  return {
    contract_number: `CT-${randomUUID()}`,
    buyer_id: buyerId,
    quantity_kg: 1000,
    price_per_kg: 4.5,
    price_terms: "fob",
    shipment_window_start: "2026-01-01",
    shipment_window_end: "2026-03-01",
    ...overrides,
  };
}

async function loginAs(email: string, password: string): Promise<string> {
  const res = await request(app).post("/api/v1/auth/login").send({ email, password });
  if (res.status !== 200) {
    throw new Error(`login failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body.access_token as string;
}

async function createRestrictedRoleUser(
  adminToken: string,
  role: "warehouse" | "finance" | "compliance",
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

describe("contracts integration", () => {
  describe("POST /api/v1/contracts", () => {
    it("creates a contract with a valid payload", async () => {
      const org = await provisionOrgAndAdmin();
      const buyer = await createBuyer(org.accessToken);

      const res = await request(app)
        .post("/api/v1/contracts")
        .set(authHeader(org.accessToken))
        .send(validContractPayload(buyer.id));

      expect(res.status).toBe(201);
      expect(res.body.id).toEqual(expect.any(String));
      expect(res.body.status).toBe("open");
      expect(Number(res.body.allocated_kg)).toBe(0);
      expect(Number(res.body.shipped_kg)).toBe(0);
      expect(res.body.buyer_id).toBe(buyer.id);
    });

    it("rejects a payload with an invalid shipment window", async () => {
      const org = await provisionOrgAndAdmin();
      const buyer = await createBuyer(org.accessToken);

      const res = await request(app)
        .post("/api/v1/contracts")
        .set(authHeader(org.accessToken))
        .send(
          validContractPayload(buyer.id, {
            shipment_window_start: "2026-05-01",
            shipment_window_end: "2026-01-01",
          }),
        );

      expect(res.status).toBe(400);
      expect(res.body.issues).toBeDefined();
    });

    it("rejects a payload missing required fields", async () => {
      const org = await provisionOrgAndAdmin();

      const res = await request(app)
        .post("/api/v1/contracts")
        .set(authHeader(org.accessToken))
        .send({ contract_number: `CT-${randomUUID()}` });

      expect(res.status).toBe(400);
      expect(res.body.issues).toBeDefined();
    });

    it("rejects a non-admin/trader role", async () => {
      const org = await provisionOrgAndAdmin();
      const buyer = await createBuyer(org.accessToken);
      const restrictedToken = await createRestrictedRoleUser(org.accessToken, "warehouse");

      const res = await request(app)
        .post("/api/v1/contracts")
        .set(authHeader(restrictedToken))
        .send(validContractPayload(buyer.id));

      expect(res.status).toBe(403);
    });

    it("rejects an unauthenticated request", async () => {
      const org = await provisionOrgAndAdmin();
      const buyer = await createBuyer(org.accessToken);

      const res = await request(app).post("/api/v1/contracts").send(validContractPayload(buyer.id));

      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/v1/contracts/dashboard", () => {
    it("lists contracts for the caller's org", async () => {
      const org = await provisionOrgAndAdmin();
      const buyer = await createBuyer(org.accessToken);
      const createRes = await request(app)
        .post("/api/v1/contracts")
        .set(authHeader(org.accessToken))
        .send(validContractPayload(buyer.id));
      const contractId = createRes.body.id;

      const res = await request(app)
        .get("/api/v1/contracts/dashboard")
        .set(authHeader(org.accessToken));

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      const ids = res.body.data.map((c: { contract_id: string }) => c.contract_id);
      expect(ids).toContain(contractId);
      expect(Array.isArray(res.body.risk_alerts)).toBe(true);
    });

    it("rejects an invalid sort_by query param", async () => {
      const org = await provisionOrgAndAdmin();

      const res = await request(app)
        .get("/api/v1/contracts/dashboard?sort_by=not_a_real_column")
        .set(authHeader(org.accessToken));

      expect(res.status).toBe(400);
    });

    it("rejects a non-admin/trader role", async () => {
      const org = await provisionOrgAndAdmin();
      const restrictedToken = await createRestrictedRoleUser(org.accessToken, "finance");

      const res = await request(app)
        .get("/api/v1/contracts/dashboard")
        .set(authHeader(restrictedToken));

      expect(res.status).toBe(403);
    });
  });

  describe("GET /api/v1/contracts/reference-data", () => {
    it("returns buyers, grades, contracts, and lots for the org", async () => {
      const org = await provisionOrgAndAdmin();
      const buyer = await createBuyer(org.accessToken);
      await request(app)
        .post("/api/v1/contracts")
        .set(authHeader(org.accessToken))
        .send(validContractPayload(buyer.id));

      const res = await request(app)
        .get("/api/v1/contracts/reference-data")
        .set(authHeader(org.accessToken));

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.buyers)).toBe(true);
      expect(Array.isArray(res.body.grades)).toBe(true);
      expect(Array.isArray(res.body.contracts)).toBe(true);
      expect(Array.isArray(res.body.lots)).toBe(true);
      const buyerIds = res.body.buyers.map((b: { id: string }) => b.id);
      expect(buyerIds).toContain(buyer.id);
    });
  });

  describe("POST /api/v1/contracts/:contractId/allocations", () => {
    it("allocates an available lot to an open contract", async () => {
      const org = await provisionOrgAndAdmin();
      const buyer = await createBuyer(org.accessToken);
      const { lot } = await createDirectLot(org.accessToken, { weight_total_kg: 600 });
      const createRes = await request(app)
        .post("/api/v1/contracts")
        .set(authHeader(org.accessToken))
        .send(validContractPayload(buyer.id, { quantity_kg: 500 }));
      const contractId = createRes.body.id;

      const res = await request(app)
        .post(`/api/v1/contracts/${contractId}/allocations`)
        .set(authHeader(org.accessToken))
        .send({ lot_id: lot.id, allocated_kg: 300 });

      expect(res.status).toBe(201);
      expect(res.body.contract_id).toBe(contractId);
      expect(res.body.lot_id).toBe(lot.id);
      expect(Number(res.body.allocated_kg)).toBe(300);
      expect(res.body.status).toBe("allocated");
    });

    it("rejects an allocation exceeding the remaining contract quantity", async () => {
      const org = await provisionOrgAndAdmin();
      const buyer = await createBuyer(org.accessToken);
      const { lot } = await createDirectLot(org.accessToken, { weight_total_kg: 5000 });
      const createRes = await request(app)
        .post("/api/v1/contracts")
        .set(authHeader(org.accessToken))
        .send(validContractPayload(buyer.id, { quantity_kg: 100 }));
      const contractId = createRes.body.id;

      const res = await request(app)
        .post(`/api/v1/contracts/${contractId}/allocations`)
        .set(authHeader(org.accessToken))
        .send({ lot_id: lot.id, allocated_kg: 200 });

      expect(res.status).toBe(409);
    });

    it("rejects a malformed allocation payload", async () => {
      const org = await provisionOrgAndAdmin();
      const buyer = await createBuyer(org.accessToken);
      const createRes = await request(app)
        .post("/api/v1/contracts")
        .set(authHeader(org.accessToken))
        .send(validContractPayload(buyer.id));
      const contractId = createRes.body.id;

      const res = await request(app)
        .post(`/api/v1/contracts/${contractId}/allocations`)
        .set(authHeader(org.accessToken))
        .send({ lot_id: "not-a-uuid", allocated_kg: 100 });

      expect(res.status).toBe(400);
      expect(res.body.issues).toBeDefined();
    });

    it("rejects a non-admin/trader role", async () => {
      const org = await provisionOrgAndAdmin();
      const buyer = await createBuyer(org.accessToken);
      const { lot } = await createDirectLot(org.accessToken);
      const createRes = await request(app)
        .post("/api/v1/contracts")
        .set(authHeader(org.accessToken))
        .send(validContractPayload(buyer.id));
      const contractId = createRes.body.id;
      const restrictedToken = await createRestrictedRoleUser(org.accessToken, "compliance");

      const res = await request(app)
        .post(`/api/v1/contracts/${contractId}/allocations`)
        .set(authHeader(restrictedToken))
        .send({ lot_id: lot.id, allocated_kg: 100 });

      expect(res.status).toBe(403);
    });
  });

  describe("cross-org isolation", () => {
    it("hides one org's contract from another org's dashboard", async () => {
      const orgA = await provisionOrgAndAdmin();
      const orgB = await provisionOrgAndAdmin();
      const buyerA = await createBuyer(orgA.accessToken);

      const createRes = await request(app)
        .post("/api/v1/contracts")
        .set(authHeader(orgA.accessToken))
        .send(validContractPayload(buyerA.id));
      expect(createRes.status).toBe(201);
      const contractId = createRes.body.id;

      const orgBDashboard = await request(app)
        .get("/api/v1/contracts/dashboard")
        .set(authHeader(orgB.accessToken));
      expect(orgBDashboard.status).toBe(200);
      const orgBIds = orgBDashboard.body.data.map((c: { contract_id: string }) => c.contract_id);
      expect(orgBIds).not.toContain(contractId);

      const orgADashboard = await request(app)
        .get("/api/v1/contracts/dashboard")
        .set(authHeader(orgA.accessToken));
      const orgAIds = orgADashboard.body.data.map((c: { contract_id: string }) => c.contract_id);
      expect(orgAIds).toContain(contractId);
    });

    it("returns 404 when another org tries to allocate against a contract it doesn't own", async () => {
      const orgA = await provisionOrgAndAdmin();
      const orgB = await provisionOrgAndAdmin();
      const buyerA = await createBuyer(orgA.accessToken);

      const createRes = await request(app)
        .post("/api/v1/contracts")
        .set(authHeader(orgA.accessToken))
        .send(validContractPayload(buyerA.id));
      const contractId = createRes.body.id;

      const res = await request(app)
        .post(`/api/v1/contracts/${contractId}/allocations`)
        .set(authHeader(orgB.accessToken))
        .send({ lot_id: randomUUID(), allocated_kg: 50 });

      expect(res.status).toBe(404);
    });

    it("does not surface another org's buyers in reference-data", async () => {
      const orgA = await provisionOrgAndAdmin();
      const orgB = await provisionOrgAndAdmin();
      const buyerA = await createBuyer(orgA.accessToken);

      const res = await request(app)
        .get("/api/v1/contracts/reference-data")
        .set(authHeader(orgB.accessToken));

      expect(res.status).toBe(200);
      const buyerIds = res.body.buyers.map((b: { id: string }) => b.id);
      expect(buyerIds).not.toContain(buyerA.id);
    });
  });
});

import { randomUUID } from "node:crypto";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { getTestApp } from "../testApp.js";
import { authHeader, provisionOrgAndAdmin, uniqueEmail } from "../factories.js";

const app = getTestApp();

/**
 * Logs in as a freshly-registered non-privileged ("trader") user in the
 * given org, for RBAC-forbidden assertions against /api/v1/master, which
 * is gated to admin|compliance at the router mount level.
 */
async function loginAsTrader(adminAccessToken: string): Promise<string> {
  const traderEmail = uniqueEmail("trader");
  const registerRes = await request(app)
    .post("/api/v1/auth/register")
    .set(authHeader(adminAccessToken))
    .send({
      email: traderEmail,
      password: "AnotherSecurePassw0rd!",
      full_name: "Trader User",
      role: "trader",
    });
  expect(registerRes.status).toBe(201);

  const loginRes = await request(app)
    .post("/api/v1/auth/login")
    .send({ email: traderEmail, password: "AnotherSecurePassw0rd!" });
  expect(loginRes.status).toBe(200);
  return loginRes.body.access_token;
}

describe("master integration", () => {
  describe("buyers", () => {
    it("supports create, list, update, delete", async () => {
      const org = await provisionOrgAndAdmin();

      const createRes = await request(app)
        .post("/api/v1/master/buyers")
        .set(authHeader(org.accessToken))
        .send({ name: "Nordic Coffee Roasters", country: "SE" });
      expect(createRes.status).toBe(201);
      expect(createRes.body.name).toBe("Nordic Coffee Roasters");
      const buyerId = createRes.body.id;

      const listRes = await request(app)
        .get("/api/v1/master/buyers")
        .set(authHeader(org.accessToken));
      expect(listRes.status).toBe(200);
      expect(Array.isArray(listRes.body.data)).toBe(true);
      expect(listRes.body.data.map((b: { id: string }) => b.id)).toContain(buyerId);

      const updateRes = await request(app)
        .put(`/api/v1/master/buyers/${buyerId}`)
        .set(authHeader(org.accessToken))
        .send({ name: "Nordic Coffee Roasters AB", country: "SE" });
      expect(updateRes.status).toBe(200);
      expect(updateRes.body.name).toBe("Nordic Coffee Roasters AB");

      const deleteRes = await request(app)
        .delete(`/api/v1/master/buyers/${buyerId}`)
        .set(authHeader(org.accessToken));
      expect(deleteRes.status).toBe(200);

      const listAfterDelete = await request(app)
        .get("/api/v1/master/buyers")
        .set(authHeader(org.accessToken));
      expect(listAfterDelete.body.data.map((b: { id: string }) => b.id)).not.toContain(buyerId);
    });

    it("rejects creating a buyer with an empty name (400)", async () => {
      const org = await provisionOrgAndAdmin();

      const res = await request(app)
        .post("/api/v1/master/buyers")
        .set(authHeader(org.accessToken))
        .send({ name: "" });

      expect(res.status).toBe(400);
      expect(res.body.issues).toBeDefined();
    });

    it("rejects a non-admin/compliance user (403)", async () => {
      const org = await provisionOrgAndAdmin();
      const traderToken = await loginAsTrader(org.accessToken);

      const res = await request(app)
        .get("/api/v1/master/buyers")
        .set(authHeader(traderToken));

      expect(res.status).toBe(403);
    });
  });

  describe("warehouses", () => {
    it("supports create, list, update, delete", async () => {
      const org = await provisionOrgAndAdmin();

      const createRes = await request(app)
        .post("/api/v1/master/warehouses")
        .set(authHeader(org.accessToken))
        .send({ name: "Mombasa Bonded Store", location: "Mombasa" });
      expect(createRes.status).toBe(201);
      expect(createRes.body.name).toBe("Mombasa Bonded Store");
      const warehouseId = createRes.body.id;

      const listRes = await request(app)
        .get("/api/v1/master/warehouses")
        .set(authHeader(org.accessToken));
      expect(listRes.status).toBe(200);
      expect(listRes.body.data.map((w: { id: string }) => w.id)).toContain(warehouseId);

      const updateRes = await request(app)
        .put(`/api/v1/master/warehouses/${warehouseId}`)
        .set(authHeader(org.accessToken))
        .send({ name: "Mombasa Bonded Store 2", location: "Mombasa" });
      expect(updateRes.status).toBe(200);
      expect(updateRes.body.name).toBe("Mombasa Bonded Store 2");

      const deleteRes = await request(app)
        .delete(`/api/v1/master/warehouses/${warehouseId}`)
        .set(authHeader(org.accessToken));
      expect(deleteRes.status).toBe(200);

      const listAfterDelete = await request(app)
        .get("/api/v1/master/warehouses")
        .set(authHeader(org.accessToken));
      expect(listAfterDelete.body.data.map((w: { id: string }) => w.id)).not.toContain(warehouseId);
    });

    it("rejects creating a warehouse with an empty name (400)", async () => {
      const org = await provisionOrgAndAdmin();

      const res = await request(app)
        .post("/api/v1/master/warehouses")
        .set(authHeader(org.accessToken))
        .send({ name: "" });

      expect(res.status).toBe(400);
      expect(res.body.issues).toBeDefined();
    });

    it("returns 404 updating a warehouse id that does not exist", async () => {
      const org = await provisionOrgAndAdmin();

      const res = await request(app)
        .put(`/api/v1/master/warehouses/${randomUUID()}`)
        .set(authHeader(org.accessToken))
        .send({ name: "Ghost Warehouse" });

      expect(res.status).toBe(404);
    });

    it("rejects a non-admin/compliance user creating a warehouse (403)", async () => {
      const org = await provisionOrgAndAdmin();
      const traderToken = await loginAsTrader(org.accessToken);

      const res = await request(app)
        .post("/api/v1/master/warehouses")
        .set(authHeader(traderToken))
        .send({ name: "Trader's Warehouse" });

      expect(res.status).toBe(403);
    });
  });

  describe("grades", () => {
    it("lists the standard grades auto-seeded for a new org", async () => {
      const org = await provisionOrgAndAdmin();

      const res = await request(app)
        .get("/api/v1/master/grades")
        .set(authHeader(org.accessToken));

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it("supports creating, updating, and deleting a custom grade", async () => {
      const org = await provisionOrgAndAdmin();

      const createRes = await request(app)
        .post("/api/v1/master/grades")
        .set(authHeader(org.accessToken))
        .send({ code: `CUSTOM-${randomUUID().slice(0, 8)}`, description: "Custom test grade" });
      expect(createRes.status).toBe(201);
      const gradeId = createRes.body.id;

      const updateRes = await request(app)
        .put(`/api/v1/master/grades/${gradeId}`)
        .set(authHeader(org.accessToken))
        .send({ code: createRes.body.code, description: "Updated description" });
      expect(updateRes.status).toBe(200);
      expect(updateRes.body.description).toBe("Updated description");

      const deleteRes = await request(app)
        .delete(`/api/v1/master/grades/${gradeId}`)
        .set(authHeader(org.accessToken));
      expect(deleteRes.status).toBe(200);
    });

    it("rejects creating a grade with an empty code (400)", async () => {
      const org = await provisionOrgAndAdmin();

      const res = await request(app)
        .post("/api/v1/master/grades")
        .set(authHeader(org.accessToken))
        .send({ code: "" });

      expect(res.status).toBe(400);
      expect(res.body.issues).toBeDefined();
    });
  });

  describe("bag types", () => {
    it("lists the standard bag types auto-seeded for a new org", async () => {
      const org = await provisionOrgAndAdmin();

      const res = await request(app)
        .get("/api/v1/master/bag-types")
        .set(authHeader(org.accessToken));

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it("supports creating, updating, and deleting a custom bag type", async () => {
      const org = await provisionOrgAndAdmin();

      const createRes = await request(app)
        .post("/api/v1/master/bag-types")
        .set(authHeader(org.accessToken))
        .send({ name: `Custom bag ${randomUUID().slice(0, 8)}`, weight_kg: 45 });
      expect(createRes.status).toBe(201);
      expect(Number(createRes.body.weight_kg)).toBe(45);
      const bagTypeId = createRes.body.id;

      const updateRes = await request(app)
        .put(`/api/v1/master/bag-types/${bagTypeId}`)
        .set(authHeader(org.accessToken))
        .send({ name: createRes.body.name, weight_kg: 50 });
      expect(updateRes.status).toBe(200);
      expect(Number(updateRes.body.weight_kg)).toBe(50);

      const deleteRes = await request(app)
        .delete(`/api/v1/master/bag-types/${bagTypeId}`)
        .set(authHeader(org.accessToken));
      expect(deleteRes.status).toBe(200);
    });

    it("rejects creating a bag type with a non-positive weight (400)", async () => {
      const org = await provisionOrgAndAdmin();

      const res = await request(app)
        .post("/api/v1/master/bag-types")
        .set(authHeader(org.accessToken))
        .send({ name: "Bad bag", weight_kg: 0 });

      expect(res.status).toBe(400);
      expect(res.body.issues).toBeDefined();
    });
  });
});

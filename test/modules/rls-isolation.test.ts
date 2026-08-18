import request from "supertest";
import { describe, expect, it } from "vitest";
import { getTestApp } from "../testApp.js";
import { authHeader, provisionOrgAndAdmin } from "../factories.js";

const app = getTestApp();

/**
 * The whole multi-tenancy model rests on Postgres RLS scoping every query
 * to app.org_id. These tests prove that invariant end-to-end through the
 * real HTTP surface rather than trusting the SQL policies in isolation -
 * a regression here means one tenant can see or modify another's data.
 */
describe("multi-tenant RLS isolation", () => {
  it("hides one org's suppliers from another org's admin", async () => {
    const orgA = await provisionOrgAndAdmin();
    const orgB = await provisionOrgAndAdmin();

    const createRes = await request(app)
      .post("/api/v1/master/suppliers")
      .set(authHeader(orgA.accessToken))
      .send({ name: "Org A Exclusive Supplier", type: "mill" });
    expect(createRes.status).toBe(201);
    const supplierId = createRes.body.id;

    const orgBList = await request(app)
      .get("/api/v1/master/suppliers")
      .set(authHeader(orgB.accessToken));
    expect(orgBList.status).toBe(200);
    const orgBSupplierIds = orgBList.body.data.map((s: { id: string }) => s.id);
    expect(orgBSupplierIds).not.toContain(supplierId);

    const orgAList = await request(app)
      .get("/api/v1/master/suppliers")
      .set(authHeader(orgA.accessToken));
    const orgASupplierIds = orgAList.body.data.map((s: { id: string }) => s.id);
    expect(orgASupplierIds).toContain(supplierId);
  });

  it("returns 404 when an org tries to modify another org's supplier by id", async () => {
    const orgA = await provisionOrgAndAdmin();
    const orgB = await provisionOrgAndAdmin();

    const createRes = await request(app)
      .post("/api/v1/master/suppliers")
      .set(authHeader(orgA.accessToken))
      .send({ name: "Org A Only", type: "farmer" });
    const supplierId = createRes.body.id;

    const updateRes = await request(app)
      .put(`/api/v1/master/suppliers/${supplierId}`)
      .set(authHeader(orgB.accessToken))
      .send({ name: "Hijacked" });
    expect(updateRes.status).toBe(404);

    const deleteRes = await request(app)
      .delete(`/api/v1/master/suppliers/${supplierId}`)
      .set(authHeader(orgB.accessToken));
    expect(deleteRes.status).toBe(404);
  });

  it("scopes the user list to the caller's own org", async () => {
    const orgA = await provisionOrgAndAdmin();
    const orgB = await provisionOrgAndAdmin();

    const orgAUsers = await request(app)
      .get("/api/v1/auth/users")
      .set(authHeader(orgA.accessToken));
    expect(orgAUsers.status).toBe(200);
    const orgAUserIds = orgAUsers.body.data.map((u: { id: string }) => u.id);
    expect(orgAUserIds).toContain(orgA.userId);
    expect(orgAUserIds).not.toContain(orgB.userId);
  });

  it("seeds independent standard grades per org rather than sharing rows", async () => {
    const orgA = await provisionOrgAndAdmin();
    const orgB = await provisionOrgAndAdmin();

    const gradesA = await request(app)
      .get("/api/v1/master/grades")
      .set(authHeader(orgA.accessToken));
    const gradesB = await request(app)
      .get("/api/v1/master/grades")
      .set(authHeader(orgB.accessToken));

    expect(gradesA.status).toBe(200);
    expect(gradesB.status).toBe(200);
    expect(gradesA.body.data.length).toBeGreaterThan(0);
    expect(gradesB.body.data.length).toBeGreaterThan(0);

    const gradesAIds = new Set(gradesA.body.data.map((g: { id: string }) => g.id));
    const gradesBIds = gradesB.body.data.map((g: { id: string }) => g.id);
    for (const id of gradesBIds) {
      expect(gradesAIds.has(id)).toBe(false);
    }
  });
});

import request from "supertest";
import { describe, expect, it } from "vitest";
import { getTestApp } from "../testApp.js";
import { authHeader, provisionOrgAndAdmin } from "../factories.js";
import { createLotForOrg } from "./inventory.testHelpers.js";

const app = getTestApp();

/**
 * Inventory (lots, adjustments, dashboard, reference-data) rides on the
 * same organization_id RLS scoping as the rest of the app. These prove that
 * scoping end-to-end, mirroring test/modules/rls-isolation.test.ts.
 */
describe("inventory cross-org isolation", () => {
  it("hides one org's lot from another org's admin in the lot list", async () => {
    const orgA = await provisionOrgAndAdmin();
    const orgB = await provisionOrgAndAdmin();

    const lot = await createLotForOrg(orgA.accessToken);

    const orgBList = await request(app)
      .get("/api/v1/inventory/lots")
      .set(authHeader(orgB.accessToken));
    expect(orgBList.status).toBe(200);
    const orgBLotIds = orgBList.body.data.map((l: { id: string }) => l.id);
    expect(orgBLotIds).not.toContain(lot.id);

    const orgAList = await request(app)
      .get("/api/v1/inventory/lots")
      .set(authHeader(orgA.accessToken));
    const orgALotIds = orgAList.body.data.map((l: { id: string }) => l.id);
    expect(orgALotIds).toContain(lot.id);
  });

  it("excludes another org's lot from reference-data", async () => {
    const orgA = await provisionOrgAndAdmin();
    const orgB = await provisionOrgAndAdmin();

    const lot = await createLotForOrg(orgA.accessToken);

    const orgBReferenceData = await request(app)
      .get("/api/v1/inventory/reference-data")
      .set(authHeader(orgB.accessToken));
    expect(orgBReferenceData.status).toBe(200);
    const orgBLotIds = orgBReferenceData.body.lots.map((l: { id: string }) => l.id);
    expect(orgBLotIds).not.toContain(lot.id);
  });

  it("does not count another org's lot toward the dashboard totals", async () => {
    const orgA = await provisionOrgAndAdmin();
    const orgB = await provisionOrgAndAdmin();

    await createLotForOrg(orgA.accessToken, { weight_total_kg: 750 });

    const orgBDashboard = await request(app)
      .get("/api/v1/inventory/dashboard")
      .set(authHeader(orgB.accessToken));
    expect(orgBDashboard.status).toBe(200);
    expect(orgBDashboard.body.total_physical_stock_kg).toBe(0);
  });

  it("returns 404 when an org tries to adjust stock on another org's lot", async () => {
    const orgA = await provisionOrgAndAdmin();
    const orgB = await provisionOrgAndAdmin();

    const lot = await createLotForOrg(orgA.accessToken);

    const res = await request(app)
      .post("/api/v1/inventory/adjustments")
      .set(authHeader(orgB.accessToken))
      .send({
        lot_id: lot.id,
        adjustment_kg: -10,
        reason: "Hijack attempt",
        approved_by: "Org B Admin",
      });

    expect(res.status).toBe(404);
  });
});

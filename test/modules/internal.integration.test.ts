import { randomUUID } from "node:crypto";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { getTestApp } from "../testApp.js";
import { authHeader, provisionOrgAndAdmin, superAdminToken, uniqueEmail } from "../factories.js";

const app = getTestApp();

/**
 * provisionOrgAndAdmin()'s returned organizationId is read from
 * POST /api/internal/v1/orgs's response body.id, but that endpoint's
 * response shape is actually `{ organization: { id, ... }, subscription,
 * usage, users, notes }` (see internal.service.ts createOrganization ->
 * getOrganization) - there is no top-level `id`. So organizationId on the
 * factory's return value is always undefined. Since factories.ts is off
 * limits to edit here, resolve the real org id independently via
 * GET /api/v1/auth/me (which does return organization_id) instead of
 * trusting the factory's field.
 */
async function resolveOrganizationId(accessToken: string): Promise<string> {
  const res = await request(app).get("/api/v1/auth/me").set(authHeader(accessToken));
  if (res.status !== 200 || !res.body.organization_id) {
    throw new Error(`resolveOrganizationId failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body.organization_id;
}

describe("internal (super admin) integration", () => {
  describe("authentication guard", () => {
    it("rejects listOrganizations with no Authorization header", async () => {
      const res = await request(app).get("/api/internal/v1/orgs");
      expect(res.status).toBe(401);
    });

    it("rejects listOrganizations with an obviously invalid bearer token", async () => {
      const res = await request(app)
        .get("/api/internal/v1/orgs")
        .set("Authorization", "Bearer not-a-real-token");
      expect(res.status).toBe(401);
    });

    it("rejects a regular tenant admin token on an internal endpoint", async () => {
      const org = await provisionOrgAndAdmin();

      const res = await request(app)
        .get("/api/internal/v1/orgs")
        .set(authHeader(org.accessToken));

      expect(res.status).toBe(401);
    });

    it("rejects getRevenue and getAlerts without a super admin token", async () => {
      const revenueRes = await request(app).get("/api/internal/v1/revenue");
      expect(revenueRes.status).toBe(401);

      const alertsRes = await request(app).get("/api/internal/v1/alerts");
      expect(alertsRes.status).toBe(401);
    });
  });

  describe("GET /api/internal/v1/orgs", () => {
    it("includes an org just created via provisionOrgAndAdmin", async () => {
      const org = await provisionOrgAndAdmin();
      const orgId = await resolveOrganizationId(org.accessToken);
      const token = await superAdminToken();

      const res = await request(app)
        .get("/api/internal/v1/orgs")
        .set("Authorization", `Bearer ${token}`)
        .query({ page_size: 100 });

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      const orgIds = res.body.data.map((o: { id: string }) => o.id);
      expect(orgIds).toContain(orgId);
    });

    it("supports searching by organization name", async () => {
      const uniqueName = `Searchable Org ${randomUUID()}`;
      const org = await provisionOrgAndAdmin({ organizationName: uniqueName });
      const orgId = await resolveOrganizationId(org.accessToken);
      const token = await superAdminToken();

      const res = await request(app)
        .get("/api/internal/v1/orgs")
        .set("Authorization", `Bearer ${token}`)
        .query({ search: uniqueName });

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data.every((o: { id: string }) => o.id === orgId)).toBe(true);
    });
  });

  describe("GET /api/internal/v1/orgs/:orgId", () => {
    it("returns organization detail, usage, users, and notes", async () => {
      const org = await provisionOrgAndAdmin();
      const orgId = await resolveOrganizationId(org.accessToken);
      const token = await superAdminToken();

      const res = await request(app)
        .get(`/api/internal/v1/orgs/${orgId}`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.organization.id).toBe(orgId);
      expect(res.body.usage).toBeDefined();
      expect(Array.isArray(res.body.users)).toBe(true);
      expect(Array.isArray(res.body.notes)).toBe(true);
    });

    it("404s for an unknown org id", async () => {
      const token = await superAdminToken();

      const res = await request(app)
        .get(`/api/internal/v1/orgs/${randomUUID()}`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  describe("PATCH /api/internal/v1/orgs/:orgId/plan", () => {
    it("updates an org's plan and status", async () => {
      const org = await provisionOrgAndAdmin({ plan: "starter" });
      const orgId = await resolveOrganizationId(org.accessToken);
      const token = await superAdminToken();

      const res = await request(app)
        .patch(`/api/internal/v1/orgs/${orgId}/plan`)
        .set("Authorization", `Bearer ${token}`)
        .send({ plan: "enterprise", status: "active" });

      expect(res.status).toBe(200);
      expect(res.body.plan).toBe("enterprise");
      expect(res.body.status).toBe("active");
    });

    it("rejects an invalid plan value", async () => {
      const org = await provisionOrgAndAdmin();
      const orgId = await resolveOrganizationId(org.accessToken);
      const token = await superAdminToken();

      const res = await request(app)
        .patch(`/api/internal/v1/orgs/${orgId}/plan`)
        .set("Authorization", `Bearer ${token}`)
        .send({ plan: "ultra-deluxe" });

      expect(res.status).toBe(400);
      expect(res.body.issues).toBeDefined();
    });

    it("404s for an unknown org id", async () => {
      const token = await superAdminToken();

      const res = await request(app)
        .patch(`/api/internal/v1/orgs/${randomUUID()}/plan`)
        .set("Authorization", `Bearer ${token}`)
        .send({ plan: "growth" });

      expect(res.status).toBe(404);
    });
  });

  describe("PATCH /api/internal/v1/orgs/:orgId/trial", () => {
    it("extends the trial by a number of days", async () => {
      const org = await provisionOrgAndAdmin({ plan: "starter" });
      const orgId = await resolveOrganizationId(org.accessToken);
      const token = await superAdminToken();

      const res = await request(app)
        .patch(`/api/internal/v1/orgs/${orgId}/trial`)
        .set("Authorization", `Bearer ${token}`)
        .send({ extend_days: 30 });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("trialing");
      expect(res.body.trial_ends_at).toBeDefined();
    });

    it("sets an explicit trial_ends_at date", async () => {
      const org = await provisionOrgAndAdmin();
      const orgId = await resolveOrganizationId(org.accessToken);
      const token = await superAdminToken();

      const res = await request(app)
        .patch(`/api/internal/v1/orgs/${orgId}/trial`)
        .set("Authorization", `Bearer ${token}`)
        .send({ trial_ends_at: "2027-01-01" });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("trialing");
    });

    it("rejects a body with neither extend_days nor trial_ends_at", async () => {
      const org = await provisionOrgAndAdmin();
      const orgId = await resolveOrganizationId(org.accessToken);
      const token = await superAdminToken();

      const res = await request(app)
        .patch(`/api/internal/v1/orgs/${orgId}/trial`)
        .set("Authorization", `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe("PATCH /api/internal/v1/orgs/:orgId/status", () => {
    it("suspends and reactivates an organization", async () => {
      const org = await provisionOrgAndAdmin();
      const orgId = await resolveOrganizationId(org.accessToken);
      const token = await superAdminToken();

      const suspendRes = await request(app)
        .patch(`/api/internal/v1/orgs/${orgId}/status`)
        .set("Authorization", `Bearer ${token}`)
        .send({ status: "suspended" });
      expect(suspendRes.status).toBe(200);
      expect(suspendRes.body.status).toBe("suspended");

      const reactivateRes = await request(app)
        .patch(`/api/internal/v1/orgs/${orgId}/status`)
        .set("Authorization", `Bearer ${token}`)
        .send({ status: "active" });
      expect(reactivateRes.status).toBe(200);
      expect(reactivateRes.body.status).toBe("active");
    });

    it("rejects an invalid status value", async () => {
      const org = await provisionOrgAndAdmin();
      const orgId = await resolveOrganizationId(org.accessToken);
      const token = await superAdminToken();

      const res = await request(app)
        .patch(`/api/internal/v1/orgs/${orgId}/status`)
        .set("Authorization", `Bearer ${token}`)
        .send({ status: "archived" });

      expect(res.status).toBe(400);
    });

    it("a suspended org's mutating tenant requests are rejected as 423", async () => {
      const org = await provisionOrgAndAdmin();
      const orgId = await resolveOrganizationId(org.accessToken);
      const token = await superAdminToken();

      await request(app)
        .patch(`/api/internal/v1/orgs/${orgId}/status`)
        .set("Authorization", `Bearer ${token}`)
        .send({ status: "suspended" });

      const res = await request(app)
        .post("/api/v1/master/suppliers")
        .set(authHeader(org.accessToken))
        .send({ name: "Blocked Supplier", type: "mill" });

      expect(res.status).toBe(423);
    });
  });

  describe("POST /api/internal/v1/orgs/:orgId/notes", () => {
    it("adds a note to an organization", async () => {
      const org = await provisionOrgAndAdmin();
      const orgId = await resolveOrganizationId(org.accessToken);
      const token = await superAdminToken();

      const res = await request(app)
        .post(`/api/internal/v1/orgs/${orgId}/notes`)
        .set("Authorization", `Bearer ${token}`)
        .send({ note: "Reached out about upgrading to enterprise plan." });

      expect(res.status).toBe(201);
      expect(res.body.note).toBe("Reached out about upgrading to enterprise plan.");
      expect(res.body.organization_id).toBe(orgId);
    });

    it("rejects a note shorter than 3 characters", async () => {
      const org = await provisionOrgAndAdmin();
      const orgId = await resolveOrganizationId(org.accessToken);
      const token = await superAdminToken();

      const res = await request(app)
        .post(`/api/internal/v1/orgs/${orgId}/notes`)
        .set("Authorization", `Bearer ${token}`)
        .send({ note: "hi" });

      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/internal/v1/orgs/:orgId/impersonate", () => {
    it("issues a short-lived access token for the org's admin user", async () => {
      const org = await provisionOrgAndAdmin();
      const orgId = await resolveOrganizationId(org.accessToken);
      const token = await superAdminToken();

      const res = await request(app)
        .post(`/api/internal/v1/orgs/${orgId}/impersonate`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.access_token).toEqual(expect.any(String));
      expect(res.body.token_type).toBe("Bearer");

      const meRes = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${res.body.access_token}`);
      expect(meRes.status).toBe(200);
      expect(meRes.body.email).toBe(org.email);
    });

    it("404s for an unknown org id", async () => {
      const token = await superAdminToken();

      const res = await request(app)
        .post(`/api/internal/v1/orgs/${randomUUID()}/impersonate`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/internal/v1/revenue", () => {
    it("returns an mrr/arr breakdown shape", async () => {
      await provisionOrgAndAdmin();
      const token = await superAdminToken();

      const res = await request(app)
        .get("/api/internal/v1/revenue")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(typeof res.body.mrr).toBe("number");
      expect(typeof res.body.arr_run_rate).toBe("number");
      expect(typeof res.body.active_orgs).toBe("number");
      expect(typeof res.body.trialing_orgs).toBe("number");
      expect(typeof res.body.past_due_orgs).toBe("number");
      expect(typeof res.body.breakdown).toBe("object");
    });
  });

  describe("GET /api/internal/v1/alerts", () => {
    it("returns an alerts array, including a trial_expiring alert for a soon-to-expire trial", async () => {
      const org = await provisionOrgAndAdmin({ plan: "starter" });
      const orgId = await resolveOrganizationId(org.accessToken);
      const token = await superAdminToken();

      await request(app)
        .patch(`/api/internal/v1/orgs/${orgId}/trial`)
        .set("Authorization", `Bearer ${token}`)
        .send({ extend_days: 1 });

      const res = await request(app)
        .get("/api/internal/v1/alerts")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.alerts)).toBe(true);
      const trialAlert = res.body.alerts.find(
        (a: { type: string; organization_id: string }) =>
          a.type === "trial_expiring" && a.organization_id === orgId,
      );
      expect(trialAlert).toBeDefined();
    });
  });

  describe("POST /api/internal/v1/auth/login", () => {
    it("rejects an unknown super admin email", async () => {
      const res = await request(app)
        .post("/api/internal/v1/auth/login")
        .send({ email: uniqueEmail("no-such-admin"), password: "whatever12345" });

      expect(res.status).toBe(401);
    });
  });
});

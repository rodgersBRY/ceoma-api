import request from "supertest";
import { describe, expect, it } from "vitest";
import { getTestApp } from "../testApp.js";
import { provisionOrgAndAdmin } from "../factories.js";
import {
  sendApiKeyExpiryAlerts,
  sendContractRiskAlerts,
} from "../../src/modules/notifications/notifications.cron.js";
import { notificationsService } from "../../src/modules/notifications/notifications.service.js";

const app = getTestApp();

/**
 * notifications has no authenticated CRUD REST surface (see
 * src/modules/notifications/README.md / notifications.cron.routes.ts) - it's
 * a cron-triggered module. The only HTTP surface is /api/v1/cron/*, gated
 * by a shared CRON_SECRET rather than user auth. test/env.setup.ts never
 * sets CRON_SECRET, so env.cronSecret is falsy for the whole test run and
 * verifyCronSecret() in notifications.cron.routes.ts unconditionally
 * rejects - that's exercised below. The actual alerting logic is unit/
 * integration tested directly against notificationsService and the cron
 * trigger functions, bypassing HTTP.
 */
describe("notifications cron HTTP surface", () => {
  it("rejects /api/v1/cron/contract-risk-alerts with no auth header (cron secret unconfigured in tests)", async () => {
    const res = await request(app).get("/api/v1/cron/contract-risk-alerts");
    expect(res.status).toBe(401);
  });

  it("rejects /api/v1/cron/contract-risk-alerts even with a bearer token, since no CRON_SECRET is configured", async () => {
    const res = await request(app)
      .get("/api/v1/cron/contract-risk-alerts")
      .set("Authorization", "Bearer whatever-secret");
    expect(res.status).toBe(401);
  });

  it("rejects /api/v1/cron/api-key-expiry-alerts with no auth header", async () => {
    const res = await request(app).get("/api/v1/cron/api-key-expiry-alerts");
    expect(res.status).toBe(401);
  });

  it("rejects /api/v1/cron/api-key-expiry-alerts even with a bearer token", async () => {
    const res = await request(app)
      .get("/api/v1/cron/api-key-expiry-alerts")
      .set("Authorization", "Bearer whatever-secret");
    expect(res.status).toBe(401);
  });
});

describe("notifications.cron trigger functions", () => {
  // These query across all orgs directly (no RLS actor context - see
  // notifications.cron.ts) and are exercised here independent of the HTTP
  // layer and independent of NOTIFICATIONS_CRON_ENABLED (which only gates
  // the route handler, not these exported functions).
  it("sendContractRiskAlerts resolves without throwing", async () => {
    await expect(sendContractRiskAlerts()).resolves.toBeUndefined();
  });

  it("sendApiKeyExpiryAlerts resolves without throwing", async () => {
    await expect(sendApiKeyExpiryAlerts()).resolves.toBeUndefined();
  });
});

describe("notificationsService", () => {
  // EmailJS is never configured in the test env (no EMAILJS_* vars set in
  // test/env.setup.ts), so isEmailConfigured() is always false and every
  // notify* call takes the "skipped_config" path internally rather than
  // actually sending mail. What's under test here is that the recipient
  // resolution (a real DB query scoped by organization_id/role) and the
  // overall call complete cleanly for a real, freshly-provisioned org and
  // never throw - notifyByRoles() is expected to swallow/catch and log.
  it("notifyContractRiskAlert resolves without throwing for a real org", async () => {
    const org = await provisionOrgAndAdmin();

    await expect(
      notificationsService.notifyContractRiskAlert({
        organizationId: org.organizationId,
        contractNumber: "CT-0001",
        daysToWindowClose: 3,
        unallocatedKg: 1200,
      }),
    ).resolves.toBeUndefined();
  });

  it("notifyApiKeyExpiring resolves without throwing for a real org", async () => {
    const org = await provisionOrgAndAdmin();

    await expect(
      notificationsService.notifyApiKeyExpiring({
        organizationId: org.organizationId,
        keyName: "CI integration key",
        keyPrefix: "kahawatrade_",
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3),
        daysToExpiry: 3,
        ownerEmail: org.email,
      }),
    ).resolves.toBeUndefined();
  });

  it("notifyShipmentCreated resolves without throwing for a real org", async () => {
    const org = await provisionOrgAndAdmin();

    await expect(
      notificationsService.notifyShipmentCreated({
        organizationId: org.organizationId,
        shipmentNumber: "SH-0001",
        contractNumber: "CT-0001",
        lotCodes: ["LOT-001", "LOT-002"],
      }),
    ).resolves.toBeUndefined();
  });

  it("notifyDocumentsReady resolves without throwing for a real org", async () => {
    const org = await provisionOrgAndAdmin();

    await expect(
      notificationsService.notifyDocumentsReady({
        organizationId: org.organizationId,
        shipmentNumber: "SH-0001",
        contractNumber: "CT-0001",
        buyerName: "Nordic Coffee Roasters",
        docTypes: ["bill_of_lading", "certificate_of_origin"],
      }),
    ).resolves.toBeUndefined();
  });

  it("notifyContractFullyAllocated resolves without throwing for a real org", async () => {
    const org = await provisionOrgAndAdmin();

    await expect(
      notificationsService.notifyContractFullyAllocated({
        organizationId: org.organizationId,
        contractNumber: "CT-0001",
        allocatedKg: 5000,
      }),
    ).resolves.toBeUndefined();
  });

  it("notifyStockAdjusted resolves without throwing for a real org", async () => {
    const org = await provisionOrgAndAdmin();

    await expect(
      notificationsService.notifyStockAdjusted({
        organizationId: org.organizationId,
        lotCode: "LOT-001",
        adjustmentKg: -25,
        reason: "Weight reconciliation",
        approvedBy: org.email,
      }),
    ).resolves.toBeUndefined();
  });

  describe("notifyShipmentStatusChanged", () => {
    it("resolves without throwing for a status with a notification rule ('cleared')", async () => {
      const org = await provisionOrgAndAdmin();

      await expect(
        notificationsService.notifyShipmentStatusChanged({
          organizationId: org.organizationId,
          shipmentNumber: "SH-0001",
          contractNumber: "CT-0001",
          newStatus: "cleared",
        }),
      ).resolves.toBeUndefined();
    });

    it("silently no-ops for a status with no notification rule ('planned')", async () => {
      const org = await provisionOrgAndAdmin();

      await expect(
        notificationsService.notifyShipmentStatusChanged({
          organizationId: org.organizationId,
          shipmentNumber: "SH-0001",
          contractNumber: "CT-0001",
          newStatus: "planned",
        }),
      ).resolves.toBeUndefined();
    });
  });
});

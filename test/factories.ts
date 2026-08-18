import { randomUUID } from "node:crypto";
import request from "supertest";
import { getTestApp } from "./testApp.js";

export function uniqueEmail(prefix = "user"): string {
  return `${prefix}-${randomUUID()}@test.ceoms.local`;
}

let cachedSuperAdminToken: string | undefined;

/**
 * Logs in as the seeded bootstrap super admin (test/setup.ts seeds it from
 * SUPER_ADMIN_BOOTSTRAP_EMAIL/PASSWORD). Cached per test file since login
 * is idempotent and the token is short-lived enough to cover a suite.
 */
export async function superAdminToken(): Promise<string> {
  if (cachedSuperAdminToken) {
    return cachedSuperAdminToken;
  }
  const app = getTestApp();
  const res = await request(app).post("/api/internal/v1/auth/login").send({
    email: process.env.SUPER_ADMIN_BOOTSTRAP_EMAIL,
    password: process.env.SUPER_ADMIN_BOOTSTRAP_PASSWORD,
  });
  if (res.status !== 200) {
    throw new Error(
      `superAdminToken login failed: ${res.status} ${JSON.stringify(res.body)}`,
    );
  }
  cachedSuperAdminToken = res.body.access_token as string;
  return cachedSuperAdminToken;
}

type ProvisionedOrg = {
  email: string;
  password: string;
  accessToken: string;
  refreshToken: string;
  organizationId: string;
  userId: string;
};

/**
 * Provisions a brand-new org + admin user via the super-admin onboarding
 * endpoint (the real path new orgs are created through in this app — the
 * public /auth/register endpoint only bootstraps the very first org ever
 * and otherwise only adds users to the caller's own org). Each call uses
 * unique email/org name so tests never collide, and callers don't need to
 * truncate or share state between tests.
 */
export async function provisionOrgAndAdmin(
  overrides: Partial<{
    email: string;
    password: string;
    organizationName: string;
    adminFullName: string;
    plan: "starter" | "growth" | "enterprise";
  }> = {},
): Promise<ProvisionedOrg> {
  const app = getTestApp();
  const email = overrides.email ?? uniqueEmail("admin");
  const password = overrides.password ?? "Sup3rSecurePassw0rd!";
  const organizationName = overrides.organizationName ?? `Test Org ${randomUUID()}`;
  const token = await superAdminToken();

  const createRes = await request(app)
    .post("/api/internal/v1/orgs")
    .set("Authorization", `Bearer ${token}`)
    .send({
      name: organizationName,
      admin_full_name: overrides.adminFullName ?? "Test Admin",
      admin_email: email,
      admin_password: password,
      plan: overrides.plan ?? "growth",
      trial_days: 0,
    });

  if (createRes.status !== 201) {
    throw new Error(
      `provisionOrgAndAdmin failed: ${createRes.status} ${JSON.stringify(createRes.body)}`,
    );
  }

  const loginRes = await request(app).post("/api/v1/auth/login").send({ email, password });
  if (loginRes.status !== 200) {
    throw new Error(
      `provisionOrgAndAdmin login failed: ${loginRes.status} ${JSON.stringify(loginRes.body)}`,
    );
  }

  const organizationId: string = createRes.body.organization.id;

  return {
    email,
    password,
    accessToken: loginRes.body.access_token,
    refreshToken: loginRes.body.refresh_token,
    organizationId,
    userId: loginRes.body.user.id,
  };
}

export function authHeader(accessToken: string): { Authorization: string } {
  return { Authorization: `Bearer ${accessToken}` };
}

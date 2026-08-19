import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { getTestApp } from "../testApp.js";
import { authHeader, provisionOrgAndAdmin, uniqueEmail } from "../factories.js";

const app = getTestApp();

describe("auth integration", () => {
  describe("login", () => {
    it("logs in with valid credentials and returns tokens", async () => {
      const org = await provisionOrgAndAdmin();

      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: org.email, password: org.password });

      expect(res.status).toBe(200);
      expect(res.body.access_token).toEqual(expect.any(String));
      expect(res.body.refresh_token).toEqual(expect.any(String));
      expect(res.body.csrf_token).toEqual(expect.any(String));
    });

    it("rejects an unknown email", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: uniqueEmail("nobody"), password: "whatever12345" });

      expect(res.status).toBe(401);
    });

    it("rejects a wrong password", async () => {
      const org = await provisionOrgAndAdmin();

      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: org.email, password: "wrongPassword123!" });

      expect(res.status).toBe(401);
    });

    it("rejects a malformed body", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: "not-an-email" });

      expect(res.status).toBe(400);
      expect(res.body.issues).toBeDefined();
    });
  });

  describe("refresh", () => {
    it("issues a new access token from a valid refresh token", async () => {
      const org = await provisionOrgAndAdmin();

      const res = await request(app)
        .post("/api/v1/auth/refresh")
        .send({ refresh_token: org.refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.access_token).toEqual(expect.any(String));
      expect(res.body.refresh_token).toEqual(expect.any(String));
    });

    it("rejects a garbage refresh token", async () => {
      const res = await request(app)
        .post("/api/v1/auth/refresh")
        .send({ refresh_token: "z".repeat(40) });

      expect([400, 401]).toContain(res.status);
    });
  });

  describe("logout", () => {
    it("revokes the session so the refresh token can no longer be used", async () => {
      const org = await provisionOrgAndAdmin();

      const logoutRes = await request(app)
        .post("/api/v1/auth/logout")
        .set(authHeader(org.accessToken))
        .send({ refresh_token: org.refreshToken });
      expect(logoutRes.status).toBe(204);

      const refreshRes = await request(app)
        .post("/api/v1/auth/refresh")
        .send({ refresh_token: org.refreshToken });
      expect(refreshRes.status).toBe(401);
    });

    it("rejects logout without authentication", async () => {
      const res = await request(app).post("/api/v1/auth/logout").send({});
      expect(res.status).toBe(401);
    });
  });

  describe("me", () => {
    it("returns the current authenticated user", async () => {
      const org = await provisionOrgAndAdmin();

      const res = await request(app).get("/api/v1/auth/me").set(authHeader(org.accessToken));

      expect(res.status).toBe(200);
      expect(res.body.email).toBe(org.email);
    });

    it("rejects a request with no token", async () => {
      const res = await request(app).get("/api/v1/auth/me");
      expect(res.status).toBe(401);
    });

    it("rejects a request with a malformed bearer token", async () => {
      const res = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", "Bearer not-a-real-token");
      expect(res.status).toBe(401);
    });
  });

  describe("register (adding users to an existing org)", () => {
    it("lets an admin add a trader to their own org", async () => {
      const org = await provisionOrgAndAdmin();
      const newUserEmail = uniqueEmail("trader");

      const res = await request(app)
        .post("/api/v1/auth/register")
        .set(authHeader(org.accessToken))
        .send({
          email: newUserEmail,
          password: "AnotherSecurePassw0rd!",
          full_name: "New Trader",
          role: "trader",
        });

      expect(res.status).toBe(201);
      expect(res.body.role).toBe("trader");
    });

    it("rejects an unauthenticated register call once an org already exists", async () => {
      await provisionOrgAndAdmin();

      const res = await request(app).post("/api/v1/auth/register").send({
        email: uniqueEmail("ghost"),
        password: "AnotherSecurePassw0rd!",
        full_name: "Ghost User",
        organization_name: "Ghost Org",
      });

      expect(res.status).toBe(401);
    });

    it("rejects a non-admin trying to add a user", async () => {
      const org = await provisionOrgAndAdmin();
      const traderEmail = uniqueEmail("trader");
      await request(app)
        .post("/api/v1/auth/register")
        .set(authHeader(org.accessToken))
        .send({
          email: traderEmail,
          password: "AnotherSecurePassw0rd!",
          full_name: "New Trader",
          role: "trader",
        });
      const traderLogin = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: traderEmail, password: "AnotherSecurePassw0rd!" });

      const res = await request(app)
        .post("/api/v1/auth/register")
        .set(authHeader(traderLogin.body.access_token))
        .send({
          email: uniqueEmail("blocked"),
          password: "AnotherSecurePassw0rd!",
          full_name: "Blocked User",
        });

      expect(res.status).toBe(403);
    });
  });

  describe("RBAC on /auth/users", () => {
    it("allows an admin to list users in their org", async () => {
      const org = await provisionOrgAndAdmin();

      const res = await request(app).get("/api/v1/auth/users").set(authHeader(org.accessToken));

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it("rejects a non-admin listing users", async () => {
      const org = await provisionOrgAndAdmin();
      const traderEmail = uniqueEmail("trader");
      await request(app)
        .post("/api/v1/auth/register")
        .set(authHeader(org.accessToken))
        .send({
          email: traderEmail,
          password: "AnotherSecurePassw0rd!",
          full_name: "New Trader",
          role: "trader",
        });
      const traderLogin = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: traderEmail, password: "AnotherSecurePassw0rd!" });

      const res = await request(app)
        .get("/api/v1/auth/users")
        .set(authHeader(traderLogin.body.access_token));

      expect(res.status).toBe(403);
    });
  });

  describe("API keys", () => {
    it("lets an admin create, list, and revoke an API key", async () => {
      const org = await provisionOrgAndAdmin();

      const createRes = await request(app)
        .post("/api/v1/auth/api-keys")
        .set(authHeader(org.accessToken))
        .send({ name: "CI integration key" });
      expect(createRes.status).toBe(201);
      expect(createRes.body.key ?? createRes.body.api_key).toEqual(expect.any(String));

      const listRes = await request(app)
        .get("/api/v1/auth/api-keys")
        .set(authHeader(org.accessToken));
      expect(listRes.status).toBe(200);
      expect(listRes.body.data.length).toBeGreaterThan(0);

      const keyId = createRes.body.id;
      const revokeRes = await request(app)
        .patch(`/api/v1/auth/api-keys/${keyId}/revoke`)
        .set(authHeader(org.accessToken));
      expect(revokeRes.status).toBe(200);
    });
  });
});

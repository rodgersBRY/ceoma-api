import { describe, expect, it } from "vitest";
import {
  createApiKeySchema,
  loginSchema,
  logoutSchema,
  refreshSchema,
  registerSchema,
} from "../../src/modules/auth/auth.validation.js";

describe("auth.validation", () => {
  describe("registerSchema", () => {
    it("accepts a valid payload", () => {
      const result = registerSchema.safeParse({
        email: "trader@example.com",
        password: "Sup3rSecurePassw0rd!",
        full_name: "Jane Trader",
        organization_name: "Acme Coffee",
      });
      expect(result.success).toBe(true);
    });

    it("rejects an invalid email", () => {
      const result = registerSchema.safeParse({
        email: "not-an-email",
        password: "Sup3rSecurePassw0rd!",
        full_name: "Jane Trader",
      });
      expect(result.success).toBe(false);
    });

    it("rejects a password under 12 characters", () => {
      const result = registerSchema.safeParse({
        email: "trader@example.com",
        password: "short1!",
        full_name: "Jane Trader",
      });
      expect(result.success).toBe(false);
    });

    it("rejects a missing full_name", () => {
      const result = registerSchema.safeParse({
        email: "trader@example.com",
        password: "Sup3rSecurePassw0rd!",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("loginSchema", () => {
    it("accepts a valid payload", () => {
      const result = loginSchema.safeParse({
        email: "trader@example.com",
        password: "anything",
      });
      expect(result.success).toBe(true);
    });

    it("rejects an empty password", () => {
      const result = loginSchema.safeParse({
        email: "trader@example.com",
        password: "",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("refreshSchema", () => {
    it("rejects a refresh token shorter than 20 characters", () => {
      const result = refreshSchema.safeParse({ refresh_token: "short" });
      expect(result.success).toBe(false);
    });

    it("accepts a sufficiently long refresh token", () => {
      const result = refreshSchema.safeParse({
        refresh_token: "a".repeat(32),
      });
      expect(result.success).toBe(true);
    });
  });

  describe("logoutSchema", () => {
    it("accepts an empty body (refresh_token optional)", () => {
      const result = logoutSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe("createApiKeySchema", () => {
    it("accepts a valid payload", () => {
      const result = createApiKeySchema.safeParse({
        name: "CI key",
        expires_in_days: 30,
      });
      expect(result.success).toBe(true);
    });

    it("rejects expires_in_days over 365", () => {
      const result = createApiKeySchema.safeParse({
        name: "CI key",
        expires_in_days: 400,
      });
      expect(result.success).toBe(false);
    });

    it("rejects an empty name", () => {
      const result = createApiKeySchema.safeParse({ name: "" });
      expect(result.success).toBe(false);
    });
  });
});

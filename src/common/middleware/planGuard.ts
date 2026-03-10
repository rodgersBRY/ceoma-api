import type { NextFunction, Request, Response } from "express";

import { ApiError } from "../errors/ApiError.js";
import { query } from "../../db/pool.js";

type PlanTier = "starter" | "growth" | "enterprise";
type PlanResource = "users" | "lots" | "api_keys";

const PLAN_LIMITS: Record<PlanTier, Record<PlanResource, number>> = {
  starter: { users: 3, lots: 50, api_keys: 0 },
  growth: { users: 10, lots: 999, api_keys: 5 },
  enterprise: { users: Number.POSITIVE_INFINITY, lots: Number.POSITIVE_INFINITY, api_keys: Number.POSITIVE_INFINITY },
};

async function resolvePlan(organizationId: number): Promise<PlanTier> {
  const result = await query<{ plan: string }>(
    `
    SELECT plan::text AS plan
    FROM subscriptions
    WHERE organization_id = $1
    `,
    [organizationId],
  );

  const plan = result.rows[0]?.plan;
  if (plan === "growth" || plan === "enterprise") {
    return plan;
  }
  return "starter";
}

async function countUsers(organizationId: number): Promise<number> {
  const result = await query<{ total: number }>(
    `
    SELECT COUNT(*)::int AS total
    FROM users
    WHERE organization_id = $1 AND is_active = TRUE
    `,
    [organizationId],
  );
  return Number(result.rows[0]?.total ?? 0);
}

async function countLots(organizationId: number): Promise<number> {
  const result = await query<{ total: number }>(
    `
    SELECT COUNT(*)::int AS total
    FROM lots
    WHERE organization_id = $1
    `,
    [organizationId],
  );
  return Number(result.rows[0]?.total ?? 0);
}

async function countApiKeys(organizationId: number): Promise<number> {
  const result = await query<{ total: number }>(
    `
    SELECT COUNT(*)::int AS total
    FROM api_keys ak
    JOIN users u ON u.id = ak.user_id
    WHERE u.organization_id = $1
      AND ak.is_active = TRUE
      AND ak.revoked_at IS NULL
    `,
    [organizationId],
  );
  return Number(result.rows[0]?.total ?? 0);
}

async function countResource(resource: PlanResource, organizationId: number): Promise<number> {
  switch (resource) {
    case "users":
      return countUsers(organizationId);
    case "lots":
      return countLots(organizationId);
    case "api_keys":
      return countApiKeys(organizationId);
    default:
      return 0;
  }
}

export function planGuard(resource: PlanResource) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.auth) {
        next();
        return;
      }

      const organizationId = req.auth.organizationId;
      if (!organizationId) {
        throw new ApiError(500, "Organization context missing");
      }

      const plan = await resolvePlan(organizationId);
      const limit = PLAN_LIMITS[plan][resource];

      if (!Number.isFinite(limit)) {
        next();
        return;
      }

      const current = await countResource(resource, organizationId);
      if (current >= limit) {
        throw new ApiError(402, `Upgrade your plan to add more ${resource.replace("_", " ")}`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

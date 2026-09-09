import type { NextFunction, Request, Response } from "express";

import { ApiError } from "../errors/ApiError.js";
import { query } from "../../db/pool.js";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export async function ensureOrgActive(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    if (!MUTATING_METHODS.has(req.method.toUpperCase())) {
      next();
      return;
    }

    if (!req.auth) {
      next();
      return;
    }

    const result = await query<{ status: string }>(
      "SELECT status::text AS status FROM organizations WHERE id = $1",
      [req.auth.organizationId],
    );
    
    const status = result.rows[0]?.status ?? "active";
    if (status !== "active") {
      throw new ApiError(423, "Organization is suspended");
    }

    next();
  } catch (error) {
    next(error);
  }
}

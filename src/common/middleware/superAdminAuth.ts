import { Request, Response, NextFunction } from "express";

import { ApiError } from "../errors/ApiError.js";
import { verifySuperAdminToken } from "../security/superAdminJwt.js";

export function requireSuperAdmin(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

  if (!token) {
    next(new ApiError(401, "Super admin authorization required"));
    return;
  }

  try {
    const claims = verifySuperAdminToken(token);
    req.superAdmin = {
      id: claims.sub,
      email: claims.email,
    };
    next();
  } catch (error) {
    next(error);
  }
}

import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";

import { env } from "../../config/env.js";
import { ApiError } from "../errors/ApiError.js";

export type SuperAdminClaims = {
  sub: string;
  email: string;
  superAdmin: true;
};

export function signSuperAdminToken(payload: {
  superAdminId: number;
  email: string;
  expiresIn?: SignOptions["expiresIn"];
}): string {
  const options: SignOptions = {
    expiresIn: payload.expiresIn ?? (env.superAdminJwtTtl as SignOptions["expiresIn"]),
    issuer: "ceoms-internal",
    audience: "ceoms-super-admin",
  };

  return jwt.sign(
    {
      sub: String(payload.superAdminId),
      email: payload.email,
      superAdmin: true,
    } satisfies SuperAdminClaims,
    env.superAdminJwtSecret,
    options,
  );
}

function assertClaims(payload: string | JwtPayload | undefined): asserts payload is JwtPayload {
  if (!payload || typeof payload === "string") {
    throw new ApiError(401, "Invalid token payload");
  }
}

export function verifySuperAdminToken(token: string): SuperAdminClaims {
  try {
    const decoded = jwt.verify(token, env.superAdminJwtSecret, {
      issuer: "ceoms-internal",
      audience: "ceoms-super-admin",
    });

    assertClaims(decoded);
    if (decoded.superAdmin !== true) {
      throw new ApiError(401, "Invalid super admin token");
    }
    
    if (typeof decoded.sub !== "string" || typeof decoded.email !== "string") {
      throw new ApiError(401, "Invalid super admin claims");
    }

    return decoded as SuperAdminClaims;
  } catch {
    throw new ApiError(401, "Invalid or expired super admin token");
  }
}

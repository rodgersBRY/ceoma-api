import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";

import { env } from "../../config/env.js";
import { ApiError } from "../errors/ApiError.js";

type TokenKind = "access" | "refresh";

type BaseClaims = {
  sub: string;
  role: string;
  organizationId: string;
  kind: TokenKind;
  sessionId: string;
  impersonated?: boolean;
};

export type AccessTokenClaims = BaseClaims & {
  kind: "access";
};

export type RefreshTokenClaims = BaseClaims & {
  kind: "refresh";
};

export function signAccessToken(payload: {
  userId: string;
  role: string;
  organizationId: string;
  sessionId: string;
  impersonated?: boolean;
  expiresIn?: SignOptions["expiresIn"];
}): string {
  const options: SignOptions = {
    expiresIn: payload.expiresIn ?? (env.jwtAccessTtl as SignOptions["expiresIn"]),
    issuer: "ceoms-api",
    audience: "ceoms-clients",
  };

  return jwt.sign(
    {
      sub: String(payload.userId),
      role: payload.role,
      organizationId: payload.organizationId,
      kind: "access",
      sessionId: payload.sessionId,
      impersonated: payload.impersonated ?? false,
    } satisfies AccessTokenClaims,
    env.jwtAccessSecret,
    options,
  );
}

export function signRefreshToken(payload: {
  userId: string;
  role: string;
  organizationId: string;
  sessionId: string;
}): string {
  const options: SignOptions = {
    expiresIn: env.jwtRefreshTtl as SignOptions["expiresIn"],
    issuer: "ceoms-api",
    audience: "ceoms-clients",
  };

  return jwt.sign(
    {
      sub: String(payload.userId),
      role: payload.role,
      organizationId: payload.organizationId,
      kind: "refresh",
      sessionId: payload.sessionId,
    } satisfies RefreshTokenClaims,
    env.jwtRefreshSecret,
    options,
  );
}

function assertClaims(payload: string | JwtPayload | undefined): asserts payload is JwtPayload {
  if (!payload || typeof payload === "string") {
    throw new ApiError(401, "Invalid token payload");
  }
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export function verifyAccessToken(token: string): AccessTokenClaims {
  try {
    const decoded = jwt.verify(token, env.jwtAccessSecret, {
      issuer: "ceoms-api",
      audience: "ceoms-clients",
    });

    assertClaims(decoded);
    if (decoded.kind !== "access") {
      throw new ApiError(401, "Invalid access token type");
    }

    if (typeof decoded.sub !== "string" || typeof decoded.role !== "string") {
      throw new ApiError(401, "Invalid access token claims");
    }

    if (typeof decoded.organizationId !== "string" || !isUuid(decoded.organizationId)) {
      throw new ApiError(401, "Invalid access token organization");
    }

    if (typeof decoded.sessionId !== "string") {
      throw new ApiError(401, "Invalid access token session");
    }

    return decoded as AccessTokenClaims;
  } catch {
    throw new ApiError(401, "Invalid or expired access token");
  }
}

export function verifyRefreshToken(token: string): RefreshTokenClaims {
  try {
    const decoded = jwt.verify(token, env.jwtRefreshSecret, {
      issuer: "ceoms-api",
      audience: "ceoms-clients",
    });

    assertClaims(decoded);
    if (decoded.kind !== "refresh") {
      throw new ApiError(401, "Invalid refresh token type");
    }

    if (typeof decoded.sub !== "string" || typeof decoded.role !== "string") {
      throw new ApiError(401, "Invalid refresh token claims");
    }
    
    if (typeof decoded.organizationId !== "string" || !isUuid(decoded.organizationId)) {
      throw new ApiError(401, "Invalid refresh token organization");
    }

    if (typeof decoded.sessionId !== "string") {
      throw new ApiError(401, "Invalid refresh token session");
    }

    return decoded as RefreshTokenClaims;
  } catch {
    throw new ApiError(401, "Invalid or expired refresh token");
  }
}

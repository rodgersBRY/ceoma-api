import crypto from "node:crypto";

import jwt, { JwtPayload } from "jsonwebtoken";

import { ApiError } from "../../common/errors/ApiError.js";
import {
  ListQueryParams,
  buildPaginatedResult,
  escapeLikeQuery,
  toBooleanFilter,
  toIntFilter,
} from "../../common/pagination.js";
import { query, withTransaction } from "../../db/pool.js";
import { AuthContext, UserRole } from "../../types/auth.js";
import { hashPassword, verifyPasswordHash } from "../../common/security/password.js";
import { encryptSensitiveText, hashSha256, secureRandomToken } from "../../common/security/crypto.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../../common/security/jwt.js";
import {
  CreateApiKeyInput,
  LoginInput,
  LogoutInput,
  RefreshInput,
  RegisterInput,
} from "./auth.validation.js";

type UserRow = {
  id: number;
  email: string;
  password_hash: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
};

type UserListRow = {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  last_login_at: Date | null;
  created_at: Date;
};

type SessionRow = {
  id: string;
  user_id: number;
  refresh_token_hash: string;
  expires_at: Date;
  revoked_at: Date | null;
  role: UserRole;
  is_active: boolean;
};

function getExpiryDateFromJwt(token: string): Date {
  const decoded = jwt.decode(token);
  if (!decoded || typeof decoded === "string") {
    throw new ApiError(500, "Unable to decode token expiry");
  }
  const payload = decoded as JwtPayload;
  if (typeof payload.exp !== "number") {
    throw new ApiError(500, "Token missing expiry");
  }
  return new Date(payload.exp * 1000);
}

function mapUserPublic(row: UserRow): Record<string, unknown> {
  return {
    id: row.id,
    email: row.email,
    full_name: row.full_name,
    role: row.role,
    is_active: row.is_active,
  };
}

export class AuthService {
  async register(input: RegisterInput, actor?: AuthContext): Promise<Record<string, unknown>> {
    const email = input.email.toLowerCase();
    const usersCountResult = await query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM users",
    );
    const usersCount = Number(usersCountResult.rows[0].count);

    const isBootstrap = usersCount === 0;
    if (!isBootstrap) {
      if (!actor) {
        throw new ApiError(401, "Authentication required to create new users");
      }
      if (actor.role !== "admin") {
        throw new ApiError(403, "Only admin users can create accounts");
      }
    }

    const role: UserRole = isBootstrap ? "admin" : (input.role ?? "trader");
    const passwordHash = await hashPassword(input.password);

    const result = await query<UserRow>(
      `
      INSERT INTO users (email, password_hash, full_name, role, is_active, updated_at)
      VALUES ($1, $2, $3, $4, TRUE, NOW())
      RETURNING id, email, password_hash, full_name, role, is_active;
      `,
      [email, passwordHash, input.full_name, role],
    );
    return mapUserPublic(result.rows[0]);
  }

  async login(
    input: LoginInput,
    requestMeta: { ipAddress: string; userAgent: string },
  ): Promise<Record<string, unknown>> {
    const email = input.email.toLowerCase();
    const userResult = await query<UserRow>(
      `
      SELECT id, email, password_hash, full_name, role, is_active
      FROM users
      WHERE email = $1
      `,
      [email],
    );
    if (userResult.rowCount === 0) {
      throw new ApiError(401, "Invalid credentials");
    }

    const user = userResult.rows[0];
    if (!user.is_active) {
      throw new ApiError(403, "User account is inactive");
    }
    const valid = await verifyPasswordHash(user.password_hash, input.password);
    if (!valid) {
      throw new ApiError(401, "Invalid credentials");
    }

    const sessionId = crypto.randomUUID();

    const accessToken = signAccessToken({
      userId: user.id,
      role: user.role,
      sessionId,
    });

    const refreshToken = signRefreshToken({
      userId: user.id,
      role: user.role,
      sessionId,
    });

    const refreshTokenHash = hashSha256(refreshToken);
    const expiresAt = getExpiryDateFromJwt(refreshToken);

    await withTransaction(async (client) => {
      await client.query(
        `
        INSERT INTO user_sessions (
          id, user_id, refresh_token_hash, ip_address_encrypted, user_agent_encrypted, expires_at
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [
          sessionId,
          user.id,
          refreshTokenHash,
          encryptSensitiveText(requestMeta.ipAddress),
          encryptSensitiveText(requestMeta.userAgent),
          expiresAt,
        ],
      );
      await client.query("UPDATE users SET last_login_at = NOW() WHERE id = $1", [user.id]);
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: "Bearer",
      user: mapUserPublic(user),
    };
  }

  async refresh(input: RefreshInput): Promise<Record<string, unknown>> {
    const claims = verifyRefreshToken(input.refresh_token);
    const sessionResult = await query<SessionRow>(
      `
      SELECT
        s.id,
        s.user_id,
        s.refresh_token_hash,
        s.expires_at,
        s.revoked_at,
        u.role,
        u.is_active
      FROM user_sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.id = $1
      `,
      [claims.sessionId],
    );
    if (sessionResult.rowCount === 0) {
      throw new ApiError(401, "Session not found");
    }
    const session = sessionResult.rows[0];
    if (!session.is_active || session.revoked_at !== null) {
      throw new ApiError(401, "Session is revoked");
    }
    if (new Date(session.expires_at).getTime() <= Date.now()) {
      throw new ApiError(401, "Session has expired");
    }
    if (session.user_id !== Number(claims.sub)) {
      throw new ApiError(401, "Session user mismatch");
    }

    const incomingHash = hashSha256(input.refresh_token);
    if (incomingHash !== session.refresh_token_hash) {
      await query("UPDATE user_sessions SET revoked_at = NOW() WHERE id = $1", [session.id]);
      throw new ApiError(401, "Refresh token mismatch");
    }

    const newAccessToken = signAccessToken({
      userId: session.user_id,
      role: session.role,
      sessionId: session.id,
    });
    const newRefreshToken = signRefreshToken({
      userId: session.user_id,
      role: session.role,
      sessionId: session.id,
    });
    const newRefreshHash = hashSha256(newRefreshToken);
    const newExpiry = getExpiryDateFromJwt(newRefreshToken);

    await query(
      `
      UPDATE user_sessions
      SET refresh_token_hash = $1, expires_at = $2
      WHERE id = $3
      `,
      [newRefreshHash, newExpiry, session.id],
    );

    return {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      token_type: "Bearer",
    };
  }

  async logout(actor: AuthContext, input: LogoutInput): Promise<void> {
    if (input.refresh_token) {
      const claims = verifyRefreshToken(input.refresh_token);
      if (Number(claims.sub) !== actor.userId && actor.role !== "admin") {
        throw new ApiError(403, "You cannot revoke another user's session");
      }
      await query("UPDATE user_sessions SET revoked_at = NOW() WHERE id = $1", [claims.sessionId]);
      return;
    }

    await query(
      "UPDATE user_sessions SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL",
      [actor.userId],
    );
  }

  async getCurrentUser(actor: AuthContext): Promise<Record<string, unknown>> {
    const result = await query<UserRow>(
      `
      SELECT id, email, password_hash, full_name, role, is_active
      FROM users
      WHERE id = $1
      `,
      [actor.userId],
    );
    if (result.rowCount === 0) {
      throw new ApiError(404, "User not found");
    }
    return mapUserPublic(result.rows[0]);
  }

  async listUsers(actor: AuthContext, listQuery: ListQueryParams): Promise<unknown> {
    if (actor.role !== "admin") {
      throw new ApiError(403, "Only admin users can list accounts");
    }

    const whereClauses: string[] = [];
    const values: unknown[] = [];
    const activeFilter = toBooleanFilter(listQuery.filters, "is_active");
    const roleFilter = listQuery.filters.role;
    const allowedRoles: UserRole[] = ["admin", "trader", "warehouse", "finance", "compliance"];

    if (activeFilter !== undefined) {
      values.push(activeFilter);
      whereClauses.push(`is_active = $${values.length}`);
    }
    if (roleFilter) {
      if (!allowedRoles.includes(roleFilter as UserRole)) {
        throw new ApiError(400, "filter_role must be one of: admin, trader, warehouse, finance, compliance");
      }
      values.push(roleFilter);
      whereClauses.push(`role = $${values.length}`);
    }
    if (listQuery.search) {
      values.push(`%${escapeLikeQuery(listQuery.search)}%`);
      whereClauses.push(`(email ILIKE $${values.length} ESCAPE '\\' OR full_name ILIKE $${values.length} ESCAPE '\\')`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";
    const countResult = await query<{ total: number }>(
      `SELECT COUNT(*)::int AS total FROM users ${whereSql}`,
      values,
    );

    values.push(listQuery.pageSize, listQuery.offset);
    const result = await query<UserListRow>(
      `
      SELECT
        id,
        email,
        full_name,
        role,
        is_active,
        last_login_at,
        created_at
      FROM users
      ${whereSql}
      ORDER BY ${listQuery.sortBy} ${listQuery.sortOrder}
      LIMIT $${values.length - 1} OFFSET $${values.length}
      `,
      values,
    );
    return buildPaginatedResult(result.rows, Number(countResult.rows[0].total), listQuery);
  }

  async createApiKey(
    actor: AuthContext,
    input: CreateApiKeyInput,
  ): Promise<Record<string, unknown>> {
    const targetUserId = input.user_id ?? actor.userId;
    if (targetUserId !== actor.userId && actor.role !== "admin") {
      throw new ApiError(403, "Only admin can create API keys for another user");
    }

    const userResult = await query<{ id: number; is_active: boolean }>(
      "SELECT id, is_active FROM users WHERE id = $1",
      [targetUserId],
    );
    if (userResult.rowCount === 0 || !userResult.rows[0].is_active) {
      throw new ApiError(404, "Target user is not active or missing");
    }

    const secret = secureRandomToken(32);
    const prefix = `ceoms_${secret.slice(0, 8)}`;
    const apiKey = `${prefix}.${secureRandomToken(24)}`;
    const keyHash = hashSha256(apiKey);
    const keyId = crypto.randomUUID();

    const expiresAt =
      typeof input.expires_in_days === "number"
        ? new Date(Date.now() + input.expires_in_days * 24 * 60 * 60 * 1000)
        : null;

    await query(
      `
      INSERT INTO api_keys (id, user_id, name, key_hash, key_prefix, is_active, expires_at)
      VALUES ($1, $2, $3, $4, $5, TRUE, $6)
      `,
      [keyId, targetUserId, input.name, keyHash, prefix, expiresAt],
    );

    return {
      id: keyId,
      user_id: targetUserId,
      name: input.name,
      key_prefix: prefix,
      expires_at: expiresAt,
      api_key: apiKey,
    };
  }

  async listApiKeys(actor: AuthContext, listQuery: ListQueryParams): Promise<unknown> {
    const whereClauses: string[] = [];
    const values: unknown[] = [];
    const filteredUserId = toIntFilter(listQuery.filters, "user_id");
    const filteredActive = toBooleanFilter(listQuery.filters, "is_active");

    if (actor.role !== "admin" && filteredUserId && filteredUserId !== actor.userId) {
      throw new ApiError(403, "Non-admin users cannot query API keys for another user");
    }
    
    if (actor.role === "admin") {
      if (filteredUserId) {
        values.push(filteredUserId);
        whereClauses.push(`user_id = $${values.length}`);
      }
    } else {
      values.push(actor.userId);
      whereClauses.push(`user_id = $${values.length}`);
    }
    if (filteredActive !== undefined) {
      values.push(filteredActive);
      whereClauses.push(`is_active = $${values.length}`);
    }
    if (listQuery.search) {
      values.push(`%${escapeLikeQuery(listQuery.search)}%`);
      whereClauses.push(`name ILIKE $${values.length} ESCAPE '\\'`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";
    const countResult = await query<{ total: number }>(
      `SELECT COUNT(*)::int AS total FROM api_keys ${whereSql}`,
      values,
    );

    values.push(listQuery.pageSize, listQuery.offset);
    const result = await query(
      `
      SELECT
        id,
        user_id,
        name,
        key_prefix,
        is_active,
        expires_at,
        last_used_at,
        created_at,
        revoked_at
      FROM api_keys
      ${whereSql}
      ORDER BY ${listQuery.sortBy} ${listQuery.sortOrder}
      LIMIT $${values.length - 1} OFFSET $${values.length}
      `,
      values,
    );
    return buildPaginatedResult(result.rows, Number(countResult.rows[0].total), listQuery);
  }

  async revokeApiKey(actor: AuthContext, apiKeyId: string): Promise<Record<string, unknown>> {
    if (actor.role !== "admin") {
      throw new ApiError(403, "Only admin users can revoke API keys");
    }

    const existing = await query<{
      id: string;
      is_active: boolean;
      revoked_at: Date | null;
    }>(
      `
      SELECT id, is_active, revoked_at
      FROM api_keys
      WHERE id = $1
      `,
      [apiKeyId],
    );

    if (existing.rowCount === 0) {
      throw new ApiError(404, "API key not found");
    }

    const row = existing.rows[0];
    if (row.revoked_at !== null || !row.is_active) {
      return {
        id: row.id,
        is_active: false,
        revoked_at: row.revoked_at,
      };
    }

    const result = await query<{
      id: string;
      is_active: boolean;
      revoked_at: Date;
    }>(
      `
      UPDATE api_keys
      SET is_active = FALSE, revoked_at = NOW()
      WHERE id = $1
      RETURNING id, is_active, revoked_at
      `,
      [apiKeyId],
    );

    return result.rows[0];
  }
}

export const authService = new AuthService();

import { Request, Response } from "express";

import { ApiError } from "../../common/errors/ApiError.js";
import { parseListQuery } from "../../common/pagination.js";
import { issueCsrfToken } from "../../common/security/csrf.js";
import { authService } from "./auth.service.js";
import {
  createApiKeySchema,
  loginSchema,
  logoutSchema,
  refreshSchema,
  registerSchema,
} from "./auth.validation.js";

function requestMeta(req: Request): { ipAddress: string; userAgent: string } {
  const userAgentRaw = req.headers["user-agent"];
  const userAgentValue = Array.isArray(userAgentRaw) ? userAgentRaw[0] : userAgentRaw;
  const userAgent = userAgentValue ?? "unknown";
  return {
    ipAddress: req.ip ?? "unknown",
    userAgent,
  };
}

export class AuthController {
  async register(req: Request, res: Response): Promise<void> {
    const payload = registerSchema.parse(req.body);
    const user = await authService.register(payload, req.auth);
    res.status(201).json(user);
  }

  async login(req: Request, res: Response): Promise<void> {
    const payload = loginSchema.parse(req.body);
    const result = await authService.login(payload, requestMeta(req));
    const csrfToken = issueCsrfToken(res);
    res.json({
      ...result,
      csrf_token: csrfToken,
    });
  }

  async refresh(req: Request, res: Response): Promise<void> {
    const payload = refreshSchema.parse(req.body);
    const result = await authService.refresh(payload);
    const csrfToken = issueCsrfToken(res);
    res.json({
      ...result,
      csrf_token: csrfToken,
    });
  }

  async logout(req: Request, res: Response): Promise<void> {
    if (!req.auth) {
      throw new ApiError(401, "Authentication required");
    }
    const payload = logoutSchema.parse(req.body);
    await authService.logout(req.auth, payload);
    res.status(204).send();
  }

  async me(req: Request, res: Response): Promise<void> {
    if (!req.auth) {
      throw new ApiError(401, "Authentication required");
    }
    const user = await authService.getCurrentUser(req.auth);
    res.json(user);
  }

  async listUsers(req: Request, res: Response): Promise<void> {
    if (!req.auth) {
      throw new ApiError(401, "Authentication required");
    }
    const query = parseListQuery(req.query as Record<string, unknown>, {
      allowedSortBy: ["created_at", "last_login_at", "email", "full_name", "role", "id", "is_active"],
      defaultSortBy: "created_at",
    });
    const users = await authService.listUsers(req.auth, query);
    res.json(users);
  }

  async issueCsrf(_req: Request, res: Response): Promise<void> {
    const token = issueCsrfToken(res);
    res.json({ csrf_token: token });
  }

  async createApiKey(req: Request, res: Response): Promise<void> {
    if (!req.auth) {
      throw new ApiError(401, "Authentication required");
    }
    const payload = createApiKeySchema.parse(req.body);
    const created = await authService.createApiKey(req.auth, payload);
    res.status(201).json(created);
  }

  async listApiKeys(req: Request, res: Response): Promise<void> {
    if (!req.auth) {
      throw new ApiError(401, "Authentication required");
    }
    const query = parseListQuery(req.query as Record<string, unknown>, {
      allowedSortBy: ["created_at", "last_used_at", "expires_at", "name", "id"],
      defaultSortBy: "created_at",
    });
    const keys = await authService.listApiKeys(req.auth, query);
    res.json(keys);
  }

  async revokeApiKey(req: Request, res: Response): Promise<void> {
    if (!req.auth) {
      throw new ApiError(401, "Authentication required");
    }
    const apiKeyId = String(req.params.apiKeyId ?? "").trim();
    if (!apiKeyId) {
      throw new ApiError(400, "apiKeyId is required");
    }

    const revoked = await authService.revokeApiKey(req.auth, apiKeyId);
    res.json(revoked);
  }
}

export const authController = new AuthController();

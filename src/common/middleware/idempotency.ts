import crypto from "node:crypto";

import { NextFunction, Request, RequestHandler, Response } from "express";

import { env } from "../../config/env.js";
import { query } from "../../db/pool.js";
import { ApiError } from "../errors/ApiError.js";
import { logger } from "../logger.js";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const MAX_IDEMPOTENCY_KEY_LENGTH = 128;

type IdempotencyRow = {
  id: string;
  idempotency_key: string;
  actor_scope: string;
  request_fingerprint: string;
  status: "processing" | "completed" | "failed";
  response_status: number | null;
  response_body: unknown | null;
  response_content_type: string | null;
  expires_at: Date;
};

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
    a.localeCompare(b),
  );
  return `{${entries
    .map(([key, entryValue]) => `${JSON.stringify(key)}:${stableStringify(entryValue)}`)
    .join(",")}}`;
}

function buildFingerprint(req: Request, actorScope: string): string {
  const payload = [
    req.method.toUpperCase(),
    req.originalUrl,
    actorScope,
    stableStringify(req.body ?? null),
  ].join("|");
  return crypto.createHash("sha256").update(payload).digest("hex");
}

function getActorScope(req: Request): string {
  if (req.auth) {
    return `user:${req.auth.userId}`;
  }
  return `anonymous:${req.ip}`;
}

function normalizeResponseBody(value: unknown): unknown {
  if (value === undefined) {
    return null;
  }
  if (Buffer.isBuffer(value)) {
    return value.toString("utf-8");
  }
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as unknown;
    } catch {
      return value;
    }
  }
  return value;
}

export const idempotencyMiddleware: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (!env.idempotencyEnabled) {
    next();
    return;
  }

  if (!MUTATING_METHODS.has(req.method.toUpperCase())) {
    next();
    return;
  }

  const keyRaw = req.headers["idempotency-key"];
  const idempotencyKey = Array.isArray(keyRaw) ? keyRaw[0] : keyRaw;
  if (!idempotencyKey) {
    if (env.idempotencyRequireKey) {
      next(new ApiError(400, "Idempotency-Key header is required for mutating requests"));
      return;
    }
    next();
    return;
  }

  const key = idempotencyKey.trim();
  if (!key || key.length > MAX_IDEMPOTENCY_KEY_LENGTH) {
    next(
      new ApiError(
        400,
        `Idempotency-Key must be 1-${MAX_IDEMPOTENCY_KEY_LENGTH} characters`,
      ),
    );
    return;
  }

  const actorScope = getActorScope(req);
  const fingerprint = buildFingerprint(req, actorScope);
  const recordId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + env.idempotencyTtlSeconds * 1000);

  void query<IdempotencyRow>(
    `
    INSERT INTO idempotency_keys (
      id,
      idempotency_key,
      actor_scope,
      request_method,
      request_path,
      request_fingerprint,
      status,
      updated_at,
      expires_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, 'processing', NOW(), $7)
    ON CONFLICT (idempotency_key, actor_scope)
    DO UPDATE SET
      request_method = EXCLUDED.request_method,
      request_path = EXCLUDED.request_path,
      request_fingerprint = EXCLUDED.request_fingerprint,
      status = 'processing',
      response_status = NULL,
      response_body = NULL,
      response_content_type = NULL,
      expires_at = EXCLUDED.expires_at
    WHERE idempotency_keys.expires_at < NOW()
    RETURNING *;
    `,
    [
      recordId,
      key,
      actorScope,
      req.method.toUpperCase(),
      req.originalUrl,
      fingerprint,
      expiresAt,
    ],
  )
    .then(async (inserted) => {
      if (inserted.rowCount === 0) {
        const existingResult = await query<IdempotencyRow>(
          `
          SELECT *
          FROM idempotency_keys
          WHERE idempotency_key = $1
            AND actor_scope = $2
          LIMIT 1
          `,
          [key, actorScope],
        );
        const existing = existingResult.rows[0];
        if (!existing) {
          throw new ApiError(409, "Unable to resolve idempotent request state");
        }
        if (existing.request_fingerprint !== fingerprint) {
          throw new ApiError(
            409,
            "Idempotency-Key has already been used with different request payload",
          );
        }
        if (existing.status === "processing") {
          throw new ApiError(409, "A matching request is already being processed");
        }

        res.setHeader("idempotency-replayed", "true");
        const responseStatus = existing.response_status ?? 200;
        const contentType = existing.response_content_type;
        if (contentType) {
          res.setHeader("content-type", contentType);
        }

        const replayBody = existing.response_body;
        if (replayBody === null) {
          res.status(responseStatus).send();
          return;
        }
        if (typeof replayBody === "string") {
          res.status(responseStatus).send(replayBody);
          return;
        }
        res.status(responseStatus).json(replayBody);
        return;
      }

      const activeRecord = inserted.rows[0];
      let capturedBody: unknown;
      let responseCaptured = false;
      let finalized = false;

      const originalJson = res.json.bind(res);
      const originalSend = res.send.bind(res);

      res.json = ((body: unknown) => {
        responseCaptured = true;
        capturedBody = body;
        return originalJson(body);
      }) as Response["json"];

      res.send = ((body?: unknown) => {
        if (!responseCaptured) {
          responseCaptured = true;
          capturedBody = normalizeResponseBody(body);
        }
        return originalSend(body);
      }) as Response["send"];

      res.on("finish", () => {
        if (finalized) {
          return;
        }
        finalized = true;

        const statusCode = res.statusCode;
        const status = statusCode >= 500 ? "failed" : "completed";
        const payload = responseCaptured ? normalizeResponseBody(capturedBody) : null;
        const contentTypeHeader = res.getHeader("content-type");
        const contentType =
          typeof contentTypeHeader === "string"
            ? contentTypeHeader
            : Array.isArray(contentTypeHeader)
              ? contentTypeHeader[0]
              : null;

        void query(
          `
          UPDATE idempotency_keys
          SET
            status = $1,
            response_status = $2,
            response_body = $3,
            response_content_type = $4
          WHERE id = $5
          `,
          [status, statusCode, payload, contentType, activeRecord.id],
        ).catch((error) => {
          logger.warn("Failed to persist idempotency response", {
            error,
            requestId: req.requestId,
            idempotencyKey: key,
          });
        });
      });

      next();
    })
    .catch(next);
};

import type { NextFunction, Request, Response } from "express";

import { logger } from "../logger.js";

function toNumberOrNull(value: string | number | string[] | undefined): number | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (Array.isArray(value)) {
    return value.length > 0 ? Number(value[0]) : null;
  }
  if (typeof value === "string" && value.trim() === "-") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = process.hrtime.bigint();

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    const contentLength = toNumberOrNull(res.getHeader("content-length"));

    logger.http("HTTP Request", {
      type: "http_request",
      method: req.method,
      path: req.originalUrl || req.url,
      status_code: res.statusCode,
      duration_ms: Number(durationMs.toFixed(2)),
      content_length: contentLength,
      ip: req.ip ?? null,
      user_agent: req.headers["user-agent"] ?? null,
      request_id: req.requestId ?? null,
    });
  });

  next();
}

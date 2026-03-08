import { NextFunction, Request, Response } from "express";

import { logger } from "../logger.js";

export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const start = Date.now();

  res.on("finish", () => {
    logger.http("HTTP Request", {
      type: "http_request",
      method: req.method,
      path: req.originalUrl,
      status_code: res.statusCode,
      duration_ms: Date.now() - start,
      content_length: res.getHeader("content-length") ?? null,
      ip: req.ip,
      user_agent: req.get("user-agent") ?? null,
      request_id: req.requestId ?? null,
    });
  });

  next();
};

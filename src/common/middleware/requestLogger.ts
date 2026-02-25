import morgan from "morgan";
import { Request } from "express";

import { logger } from "../logger.js";

function toNumberOrNull(value: string | null | undefined): number | null {
  if (!value || value === "-") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

const requestLogFormat = (
  tokens: morgan.TokenIndexer<Request, import("http").ServerResponse>,
  req: Request,
  res: import("http").ServerResponse,
): string =>
  JSON.stringify({
    type: "http_request",
    method: tokens.method(req, res),
    path: tokens.url(req, res),
    status_code: toNumberOrNull(tokens.status(req, res)),
    duration_ms: toNumberOrNull(tokens["response-time"](req, res)),
    content_length: toNumberOrNull(tokens.res(req, res, "content-length")),
    ip: tokens["remote-addr"](req, res),
    user_agent: tokens["user-agent"](req, res),
    request_id: req.requestId ?? null,
  });

export const requestLogger = morgan(requestLogFormat, {
  stream: {
    write: (message: string) => {
      try {
        const parsed = JSON.parse(message.trim()) as Record<string, unknown>;
        logger.http("HTTP Request", parsed);
      } catch {
        logger.http(message.trim());
      }
    },
  },
});

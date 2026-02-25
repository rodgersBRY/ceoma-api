import express, { Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";

import { env } from "../config/env.js";
import { apiRateLimiter } from "../common/middleware/rateLimiters.js";
import { requestLogger } from "../common/middleware/requestLogger.js";
import { sanitizeInput } from "../common/middleware/sanitizeInput.js";
import { requestId } from "../common/middleware/requestId.js";
import { csrfProtection } from "../common/middleware/csrfProtection.js";
import { errorHandler } from "../common/middleware/errorHandler.js";
import { registerRoutes } from "./registerRoutes.js";

export function createApp(): Express {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", env.trustProxy);

  app.use(requestId);
  app.use(requestLogger);
  app.use(
    helmet({
      crossOriginResourcePolicy: false,
    }),
  );
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) {
          callback(null, true);
          return;
        }
        if (env.corsAllowedOrigins.length === 0 || env.corsAllowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(null, false);
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    }),
  );
  app.use(cookieParser());
  app.use(express.json({ limit: env.requestBodyLimit }));
  app.use(express.urlencoded({ extended: true, limit: env.requestBodyLimit }));
  app.use(sanitizeInput);
  app.use(apiRateLimiter);
  app.use(csrfProtection);

  app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "ceoms-api" });
  });
  
  app.get("/api/v1/health", (_req, res) => {
    res.json({ ok: true, service: "ceoms-api", version: "v1" });
  });

  registerRoutes(app);
  app.use(errorHandler);

  return app;
}

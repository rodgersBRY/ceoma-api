import { Router } from "express";

import { ApiError } from "../../common/errors/ApiError.js";
import { asyncHandler } from "../../common/middleware/asyncHandler.js";
import { env } from "../../config/env.js";
import {
  sendApiKeyExpiryAlerts,
  sendContractRiskAlerts,
} from "./notifications.cron.js";

export const notificationsCronRouter = Router();

function verifyCronSecret(authHeader: string | undefined): void {
  if (!env.cronSecret || authHeader !== `Bearer ${env.cronSecret}`) {
    throw new ApiError(401, "Unauthorized");
  }
}

notificationsCronRouter.get(
  "/contract-risk-alerts",
  asyncHandler(async (req, res) => {
    verifyCronSecret(req.headers.authorization);
    if (env.notificationsCronEnabled) {
      await sendContractRiskAlerts();
    }
    res.json({ ok: true });
  }),
);

notificationsCronRouter.get(
  "/api-key-expiry-alerts",
  asyncHandler(async (req, res) => {
    verifyCronSecret(req.headers.authorization);
    if (env.notificationsCronEnabled) {
      await sendApiKeyExpiryAlerts();
    }
    res.json({ ok: true });
  }),
);

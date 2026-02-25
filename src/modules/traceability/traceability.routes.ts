import { Router } from "express";

import { asyncHandler } from "../../common/middleware/asyncHandler.js";
import { traceabilityController } from "./traceability.controller.js";

export const traceabilityRouter = Router();

traceabilityRouter.get(
  "/lots/:lotId",
  asyncHandler(traceabilityController.getLotTraceability.bind(traceabilityController)),
);
traceabilityRouter.get(
  "/reference-data",
  asyncHandler(traceabilityController.getReferenceData.bind(traceabilityController)),
);

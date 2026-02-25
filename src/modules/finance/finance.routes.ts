import { Router } from "express";

import { asyncHandler } from "../../common/middleware/asyncHandler.js";
import { financeController } from "./finance.controller.js";

export const costsRouter = Router();
export const profitabilityRouter = Router();

costsRouter.post(
  "/entries",
  asyncHandler(financeController.createCostEntry.bind(financeController)),
);
costsRouter.get(
  "/reference-data",
  asyncHandler(financeController.getReferenceData.bind(financeController)),
);

profitabilityRouter.get(
  "/contracts/:contractId",
  asyncHandler(financeController.getContractProfitability.bind(financeController)),
);
profitabilityRouter.get(
  "/reference-data",
  asyncHandler(financeController.getReferenceData.bind(financeController)),
);

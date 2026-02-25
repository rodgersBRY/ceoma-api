import { Router } from "express";

import { asyncHandler } from "../../common/middleware/asyncHandler.js";
import { contractsController } from "./contracts.controller.js";

export const contractsRouter = Router();

contractsRouter.post("/", asyncHandler(contractsController.createContract.bind(contractsController)));
contractsRouter.post(
  "/:contractId/allocations",
  asyncHandler(contractsController.allocateLot.bind(contractsController)),
);
contractsRouter.get(
  "/dashboard",
  asyncHandler(contractsController.getDashboard.bind(contractsController)),
);
contractsRouter.get(
  "/reference-data",
  asyncHandler(contractsController.getReferenceData.bind(contractsController)),
);

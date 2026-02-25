import { Router } from "express";

import { asyncHandler } from "../../common/middleware/asyncHandler.js";
import { procurementController } from "./procurement.controller.js";

export const procurementRouter = Router();

procurementRouter.post(
  "/auction-lots",
  asyncHandler(procurementController.createAuctionLot.bind(procurementController)),
);
procurementRouter.get(
  "/auction-lots",
  asyncHandler(procurementController.listAuctionLots.bind(procurementController)),
);
procurementRouter.post(
  "/direct-agreements",
  asyncHandler(procurementController.createDirectAgreement.bind(procurementController)),
);
procurementRouter.get(
  "/direct-agreements",
  asyncHandler(procurementController.listDirectAgreements.bind(procurementController)),
);
procurementRouter.get(
  "/reference-data",
  asyncHandler(procurementController.getReferenceData.bind(procurementController)),
);
procurementRouter.post(
  "/direct-deliveries",
  asyncHandler(procurementController.createDirectDelivery.bind(procurementController)),
);
procurementRouter.get(
  "/direct-deliveries",
  asyncHandler(procurementController.listDirectDeliveries.bind(procurementController)),
);

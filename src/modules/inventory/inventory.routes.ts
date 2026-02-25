import { Router } from "express";

import { asyncHandler } from "../../common/middleware/asyncHandler.js";
import { inventoryController } from "./inventory.controller.js";

export const inventoryRouter = Router();

inventoryRouter.get("/lots", asyncHandler(inventoryController.listLots.bind(inventoryController)));
inventoryRouter.post(
  "/adjustments",
  asyncHandler(inventoryController.adjustStock.bind(inventoryController)),
);
inventoryRouter.get(
  "/dashboard",
  asyncHandler(inventoryController.getDashboard.bind(inventoryController)),
);
inventoryRouter.get(
  "/reference-data",
  asyncHandler(inventoryController.getReferenceData.bind(inventoryController)),
);

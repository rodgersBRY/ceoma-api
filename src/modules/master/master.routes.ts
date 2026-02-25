import { Router } from "express";

import { asyncHandler } from "../../common/middleware/asyncHandler.js";
import { masterController } from "./master.controller.js";

export const masterRouter = Router();

masterRouter.post("/suppliers", asyncHandler(masterController.createSupplier.bind(masterController)));
masterRouter.get("/suppliers", asyncHandler(masterController.listSuppliers.bind(masterController)));

masterRouter.post("/buyers", asyncHandler(masterController.createBuyer.bind(masterController)));
masterRouter.get("/buyers", asyncHandler(masterController.listBuyers.bind(masterController)));

masterRouter.post(
  "/warehouses",
  asyncHandler(masterController.createWarehouse.bind(masterController)),
);
masterRouter.get("/warehouses", asyncHandler(masterController.listWarehouses.bind(masterController)));

masterRouter.post("/grades", asyncHandler(masterController.createGrade.bind(masterController)));
masterRouter.get("/grades", asyncHandler(masterController.listGrades.bind(masterController)));

masterRouter.post("/bag-types", asyncHandler(masterController.createBagType.bind(masterController)));
masterRouter.get("/bag-types", asyncHandler(masterController.listBagTypes.bind(masterController)));

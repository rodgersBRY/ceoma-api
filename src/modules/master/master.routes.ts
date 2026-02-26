import { Router } from "express";

import { asyncHandler } from "../../common/middleware/asyncHandler.js";
import { masterController } from "./master.controller.js";

export const masterRouter = Router();

masterRouter
  .route("/suppliers")
  .get(asyncHandler(masterController.listSuppliers.bind(masterController)))
  .post(asyncHandler(masterController.createSupplier.bind(masterController)));

masterRouter
  .route("/suppliers/:id")
  .put(asyncHandler(masterController.updateSupplier.bind(masterController)))
  .delete(asyncHandler(masterController.deleteSupplier.bind(masterController)));

masterRouter
  .route("/buyers")
  .get(asyncHandler(masterController.listBuyers.bind(masterController)))
  .post(asyncHandler(masterController.createBuyer.bind(masterController)));

masterRouter
  .route("/buyers/:id")
  .put(asyncHandler(masterController.updateBuyer.bind(masterController)))
  .delete(asyncHandler(masterController.deleteBuyer.bind(masterController)));

masterRouter
  .route("/warehouses")
  .get(asyncHandler(masterController.listWarehouses.bind(masterController)))
  .post(asyncHandler(masterController.createWarehouse.bind(masterController)));

masterRouter
  .route("/grades")
  .get(asyncHandler(masterController.listGrades.bind(masterController)))
  .post(asyncHandler(masterController.createGrade.bind(masterController)));

masterRouter
  .route("/bag-types")
  .get(asyncHandler(masterController.listBagTypes.bind(masterController)))
  .post(asyncHandler(masterController.createBagType.bind(masterController)));

import { Router } from "express";

import { asyncHandler } from "../../common/middleware/asyncHandler.js";
import { authorize } from "../../common/middleware/auth.js";
import { masterController } from "./master.controller.js";

export const masterRouter = Router();

masterRouter
  .route("/suppliers")
  .get(asyncHandler(masterController.listSuppliers.bind(masterController)))
  .post(asyncHandler(masterController.createSupplier.bind(masterController)));

masterRouter
  .route("/suppliers/:id")
  .put(authorize("admin"), asyncHandler(masterController.updateSupplier.bind(masterController)))
  .delete(authorize("admin"), asyncHandler(masterController.deleteSupplier.bind(masterController)));

masterRouter
  .route("/buyers")
  .get(asyncHandler(masterController.listBuyers.bind(masterController)))
  .post(asyncHandler(masterController.createBuyer.bind(masterController)));

masterRouter
  .route("/buyers/:id")
  .put(authorize("admin"), asyncHandler(masterController.updateBuyer.bind(masterController)))
  .delete(authorize("admin"), asyncHandler(masterController.deleteBuyer.bind(masterController)));

masterRouter
  .route("/warehouses")
  .get(asyncHandler(masterController.listWarehouses.bind(masterController)))
  .post(asyncHandler(masterController.createWarehouse.bind(masterController)));

masterRouter
  .route("/warehouses/:id")
  .put(authorize("admin"), asyncHandler(masterController.updateWarehouse.bind(masterController)))
  .delete(authorize("admin"), asyncHandler(masterController.deleteWarehouse.bind(masterController)));

masterRouter
  .route("/grades")
  .get(asyncHandler(masterController.listGrades.bind(masterController)))
  .post(asyncHandler(masterController.createGrade.bind(masterController)));

masterRouter
  .route("/grades/:id")
  .put(authorize("admin"), asyncHandler(masterController.updateGrade.bind(masterController)))
  .delete(authorize("admin"), asyncHandler(masterController.deleteGrade.bind(masterController)));

masterRouter
  .route("/bag-types")
  .get(asyncHandler(masterController.listBagTypes.bind(masterController)))
  .post(asyncHandler(masterController.createBagType.bind(masterController)));

masterRouter
  .route("/bag-types/:id")
  .put(authorize("admin"), asyncHandler(masterController.updateBagType.bind(masterController)))
  .delete(authorize("admin"), asyncHandler(masterController.deleteBagType.bind(masterController)));

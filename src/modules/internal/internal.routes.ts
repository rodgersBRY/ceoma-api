import { Router } from "express";

import { asyncHandler } from "../../common/middleware/asyncHandler.js";
import { requireSuperAdmin } from "../../common/middleware/superAdminAuth.js";
import { internalController } from "./internal.controller.js";

export const internalRouter = Router();

internalRouter.post("/auth/login", asyncHandler(internalController.login.bind(internalController)));

internalRouter.get(
  "/auth/me",
  requireSuperAdmin,
  asyncHandler(internalController.me.bind(internalController)),
);

internalRouter.get(
  "/orgs",
  requireSuperAdmin,
  asyncHandler(internalController.listOrganizations.bind(internalController)),
);
internalRouter.post(
  "/orgs",
  requireSuperAdmin,
  asyncHandler(internalController.createOrganization.bind(internalController)),
);
internalRouter.get(
  "/orgs/:orgId",
  requireSuperAdmin,
  asyncHandler(internalController.getOrganization.bind(internalController)),
);
internalRouter.patch(
  "/orgs/:orgId/plan",
  requireSuperAdmin,
  asyncHandler(internalController.updatePlan.bind(internalController)),
);
internalRouter.patch(
  "/orgs/:orgId/trial",
  requireSuperAdmin,
  asyncHandler(internalController.extendTrial.bind(internalController)),
);
internalRouter.patch(
  "/orgs/:orgId/status",
  requireSuperAdmin,
  asyncHandler(internalController.updateOrgStatus.bind(internalController)),
);
internalRouter.post(
  "/orgs/:orgId/notes",
  requireSuperAdmin,
  asyncHandler(internalController.addOrgNote.bind(internalController)),
);
internalRouter.post(
  "/orgs/:orgId/impersonate",
  requireSuperAdmin,
  asyncHandler(internalController.impersonate.bind(internalController)),
);

internalRouter.get(
  "/revenue",
  requireSuperAdmin,
  asyncHandler(internalController.getRevenue.bind(internalController)),
);
internalRouter.get(
  "/alerts",
  requireSuperAdmin,
  asyncHandler(internalController.getAlerts.bind(internalController)),
);

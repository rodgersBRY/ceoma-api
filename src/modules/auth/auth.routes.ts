import { Router } from "express";

import { asyncHandler } from "../../common/middleware/asyncHandler.js";
import {
  authenticate,
  authenticateOptional,
  authorize,
} from "../../common/middleware/auth.js";
import { authRateLimiter } from "../../common/middleware/rateLimiters.js";
import { authController } from "./auth.controller.js";

export const authRouter = Router();

authRouter.get("/csrf-token", asyncHandler(authController.issueCsrf.bind(authController)));
authRouter.post("/login", authRateLimiter, asyncHandler(authController.login.bind(authController)));
authRouter.post("/refresh", authRateLimiter, asyncHandler(authController.refresh.bind(authController)));

authRouter.post(
  "/register",
  authenticateOptional,
  asyncHandler(authController.register.bind(authController)),
);

authRouter.post(
  "/logout",
  authenticate,
  asyncHandler(authController.logout.bind(authController)),
);
authRouter.get("/me", authenticate, asyncHandler(authController.me.bind(authController)));
authRouter.get(
  "/users",
  authenticate,
  authorize("admin"),
  asyncHandler(authController.listUsers.bind(authController)),
);
authRouter.post(
  "/api-keys",
  authenticate,
  authorize("admin"),
  asyncHandler(authController.createApiKey.bind(authController)),
);
authRouter.get(
  "/api-keys",
  authenticate,
  authorize("admin"),
  asyncHandler(authController.listApiKeys.bind(authController)),
);
authRouter.patch(
  "/api-keys/:apiKeyId/revoke",
  authenticate,
  authorize("admin"),
  asyncHandler(authController.revokeApiKey.bind(authController)),
);

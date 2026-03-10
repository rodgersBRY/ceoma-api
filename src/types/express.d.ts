import { AuthContext } from "./auth.js";
import { SuperAdminContext } from "./superAdmin.js";

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
      superAdmin?: SuperAdminContext;
      requestId?: string;
    }
  }
}

export {};

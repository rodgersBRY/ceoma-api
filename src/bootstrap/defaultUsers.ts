import { UserRole } from "../types/auth.js";

export type BootstrapUserSeed = {
  email: string;
  fullName: string;
  role: UserRole;
  password: string;
};

// Update these test accounts as needed for local/dev initialization.
export const bootstrapUsers: BootstrapUserSeed[] = [
  {
    email: "admin@ceoms.test",
    fullName: "CEOMS Administrator",
    role: "admin",
    password: "AdminTest#1234",
  },
  {
    email: "trader@ceoms.test",
    fullName: "CEOMS Trader",
    role: "trader",
    password: "TraderTest#1234",
  },
  {
    email: "warehouse@ceoms.test",
    fullName: "CEOMS Warehouse",
    role: "warehouse",
    password: "WarehouseTest#1234",
  },
  {
    email: "finance@ceoms.test",
    fullName: "CEOMS Finance",
    role: "finance",
    password: "FinanceTest#1234",
  },
  {
    email: "compliance@ceoms.test",
    fullName: "CEOMS Compliance",
    role: "compliance",
    password: "ComplianceTest#1234",
  },
];

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
    email: "admin@kahawatrade.test",
    fullName: "Kahawa Trade Administrator",
    role: "admin",
    password: "AdminTest#1234",
  },
  {
    email: "trader@kahawatrade.test",
    fullName: "Kahawa Trade Trader",
    role: "trader",
    password: "TraderTest#1234",
  },
  {
    email: "warehouse@kahawatrade.test",
    fullName: "Kahawa Trade Warehouse",
    role: "warehouse",
    password: "WarehouseTest#1234",
  },
  {
    email: "finance@kahawatrade.test",
    fullName: "Kahawa Trade Finance",
    role: "finance",
    password: "FinanceTest#1234",
  },
  {
    email: "compliance@kahawatrade.test",
    fullName: "Kahawa Trade Compliance",
    role: "compliance",
    password: "ComplianceTest#1234",
  },
];

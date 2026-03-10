export type UserRole = "admin" | "trader" | "warehouse" | "finance" | "compliance";

export type AuthContext = {
  authType: "jwt" | "api_key";
  userId: number;
  role: UserRole;
  organizationId: number;
  sessionId?: string;
  apiKeyId?: string;
  impersonated?: boolean;
};

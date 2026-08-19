export type UserRole = "admin" | "trader" | "warehouse" | "finance" | "compliance";

export type AuthContext = {
  authType: "jwt" | "api_key";
  userId: string;
  role: UserRole;
  organizationId: string;
  sessionId?: string;
  apiKeyId?: string;
  impersonated?: boolean;
};

import { z } from "zod";

export const userRoleSchema = z.enum([
  "admin",
  "trader",
  "warehouse",
  "finance",
  "compliance",
]);

export const registerSchema = z.object({
  email: z.string().email({ message: "Please provide a valid email address" }),
  password: z
    .string()
    .min(12, { message: "Password must be at least 12 characters long" }),
  full_name: z.string().min(1, { message: "Full name is required" }),
  role: userRoleSchema.optional(),
});

export const loginSchema = z.object({
  email: z.string().email({ message: "Please provide a valid email address" }),
  password: z.string().min(1, { message: "Password is required" }),
});

export const refreshSchema = z.object({
  refresh_token: z.string().min(20),
});

export const logoutSchema = z.object({
  refresh_token: z.string().min(20).optional(),
});

export const createApiKeySchema = z.object({
  name: z.string().min(1),
  user_id: z.number().int().positive().optional(),
  expires_in_days: z.number().int().positive().max(365).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type LogoutInput = z.infer<typeof logoutSchema>;
export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;

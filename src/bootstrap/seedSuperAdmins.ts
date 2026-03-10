import { logger } from "../common/logger.js";
import { hashPassword } from "../common/security/password.js";
import { env } from "../config/env.js";
import { query } from "../db/pool.js";

export async function seedSuperAdminsIfConfigured(): Promise<void> {
  if (!env.superAdminBootstrapEmail || !env.superAdminBootstrapPassword) {
    return;
  }

  const existing = await query<{ count: string }>(
    "SELECT COUNT(*)::text AS count FROM super_admins",
  );
  const count = Number(existing.rows[0]?.count ?? 0);
  if (count > 0) {
    return;
  }

  const email = env.superAdminBootstrapEmail.trim().toLowerCase();
  const passwordHash = await hashPassword(env.superAdminBootstrapPassword);

  await query(
    `
    INSERT INTO super_admins (email, password_hash)
    VALUES ($1, $2)
    `,
    [email, passwordHash],
  );

  logger.info("Bootstrap super admin created", { email });
}

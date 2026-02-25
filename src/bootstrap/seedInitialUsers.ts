import { logger } from "../common/logger.js";
import { hashPassword } from "../common/security/password.js";
import { withTransaction } from "../db/pool.js";
import { bootstrapUsers } from "./defaultUsers.js";

type CountRow = {
  count: number;
};

export async function seedInitialUsersIfEmpty(): Promise<void> {
  await withTransaction(async (client) => {
    const countResult = await client.query<CountRow>(
      "SELECT COUNT(*)::int AS count FROM users",
    );
    const usersCount = Number(countResult.rows[0]?.count ?? 0);

    if (usersCount > 0) {
      logger.info("User bootstrap skipped: users already exist", {
        usersCount,
      });
      return;
    }

    logger.warn("Users table is empty. Bootstrapping default test users.", {
      totalUsers: bootstrapUsers.length,
    });

    for (const user of bootstrapUsers) {
      const passwordHash = await hashPassword(user.password);
      await client.query(
        `
        INSERT INTO users (email, password_hash, full_name, role, is_active, updated_at)
        VALUES ($1, $2, $3, $4, TRUE, NOW())
        ON CONFLICT (email) DO NOTHING
        `,
        [user.email.toLowerCase(), passwordHash, user.fullName, user.role],
      );
    }

    logger.info("Default test users bootstrapped", {
      users: bootstrapUsers.map((user) => ({ email: user.email, role: user.role })),
    });
  });
}

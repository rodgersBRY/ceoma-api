import { createApp } from "./app/createApp.js";
import { seedInitialUsersIfEmpty } from "./bootstrap/seedInitialUsers.js";
import { seedStandardBagTypesIfMissing } from "./bootstrap/seedStandardBagTypes.js";
import { logger } from "./common/logger.js";
import { env } from "./config/env.js";
import {
  pool,
  registerPoolEventLogging,
  verifyDatabaseConnection,
} from "./db/pool.js";
import { registerNotificationCrons } from "./modules/notifications/notifications.cron.js";

const app = createApp();

async function bootstrap(): Promise<void> {
  registerPoolEventLogging();

  await verifyDatabaseConnection();

  await seedInitialUsersIfEmpty();
  await seedStandardBagTypesIfMissing();
  registerNotificationCrons();

  const server = app.listen(env.port, () => {
    logger.info(`CEOMS API running on http://localhost:${env.port}`);
  });

  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`Received ${signal}. Shutting down gracefully.`);
    server.close(async () => {
      await pool.end();
      logger.info("HTTP server and database pool closed.");
      process.exit(0);
    });
  };

  process.on("SIGINT", () => {
    void shutdown("SIGINT");
  });
  
  process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
  });
}

void bootstrap().catch((error) => {
  logger.error("Server bootstrap failed", { error });
  process.exit(1);
});

import { createApp } from "../src/app/createApp.js";
import { seedSuperAdminsIfConfigured } from "../src/bootstrap/seedSuperAdmins.js";
import { seedStandardBagTypesIfMissing } from "../src/bootstrap/seedStandardBagTypes.js";
import { seedStandardGradesIfMissing } from "../src/bootstrap/seedStandardGrades.js";
import { logger } from "../src/common/logger.js";
import {
  registerPoolEventLogging,
  verifyDatabaseConnection,
} from "../src/db/pool.js";

const app = createApp();

void (async () => {
  try {
    registerPoolEventLogging();
    await verifyDatabaseConnection();
    await seedSuperAdminsIfConfigured();
    await seedStandardBagTypesIfMissing();
    await seedStandardGradesIfMissing();
  } catch (error) {
    logger.error("Initialization error on cold start", { error });
  }
})();

export default app;

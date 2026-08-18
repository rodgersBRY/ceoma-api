import { afterAll } from "vitest";
import { pool } from "../src/db/pool.js";
import { seedSuperAdminsIfConfigured } from "../src/bootstrap/seedSuperAdmins.js";

// Runs after test/env.setup.ts (see vitest.config.ts setupFiles order), so
// env vars are already the test-only ones by the time src/config/env.ts
// gets imported here. Seeding is idempotent (checks count first), so it's
// safe to call once per test file.
await seedSuperAdminsIfConfigured();

afterAll(async () => {
  await pool.end();
});

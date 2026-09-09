import crypto from "node:crypto";

import { logger } from "../common/logger.js";
import { withTransaction } from "../db/pool.js";
import { bootstrapGrades } from "./defaultGrades.js";

type GradeRow = {
  id: string;
  code: string;
  description: string | null;
  organization_id?: string;
};

export async function seedStandardGradesIfMissing(): Promise<void> {
  await withTransaction(async (client) => {
    const orgResult = await client.query<{ id: string }>(
      "SELECT id FROM organizations",
    );
    const organizationIds = orgResult.rows.map((row) => row.id);
    if (organizationIds.length === 0) {
      logger.warn("No organizations found. Skipping grade bootstrap.");
      
      return;
    }

    const inserted: Array<{ code: string; organization_id: string }> = [];

    for (const organizationId of organizationIds) {
      const existingResult = await client.query<GradeRow>(
        "SELECT id, code FROM grades WHERE organization_id = $1",
        [organizationId],
      );
      const existing = existingResult.rows;

      for (const seed of bootstrapGrades) {
        const found = existing.some(
          (row) => row.code.trim().toUpperCase() === seed.code.toUpperCase(),
        );

        if (found) {
          continue;
        }

        const insertResult = await client.query<GradeRow>(
          `
          INSERT INTO grades (id, code, description, organization_id)
          VALUES ($1, $2, $3, $4)
          RETURNING id, code, description
          `,
          [crypto.randomUUID(), seed.code, seed.description, organizationId],
        );

        existing.push(insertResult.rows[0]);
        inserted.push({ code: seed.code, organization_id: organizationId });
      }
    }

    if (inserted.length === 0) {
      logger.info("Standard grades already present. Bootstrap skipped.");
      return;
    }

    logger.info("Standard grades bootstrapped", { inserted });
  });
}

export async function seedStandardGradesForOrg(organizationId: string): Promise<void> {
  await withTransaction(async (client) => {
    const existingResult = await client.query<GradeRow>(
      "SELECT id, code FROM grades WHERE organization_id = $1",
      [organizationId],
    );
    const existing = existingResult.rows;

    const inserted: Array<{ code: string }> = [];

    for (const seed of bootstrapGrades) {
      const found = existing.some(
        (row) => row.code.trim().toUpperCase() === seed.code.toUpperCase(),
      );

      if (found) {
        continue;
      }

      const insertResult = await client.query<GradeRow>(
        `
        INSERT INTO grades (id, code, description, organization_id)
        VALUES ($1, $2, $3, $4)
        RETURNING id, code, description
        `,
        [crypto.randomUUID(), seed.code, seed.description, organizationId],
      );

      existing.push(insertResult.rows[0]);
      inserted.push({ code: seed.code });
    }

    if (inserted.length > 0) {
      logger.info("Standard grades bootstrapped for organization", {
        organization_id: organizationId,
        inserted,
      });
    }
  });
}

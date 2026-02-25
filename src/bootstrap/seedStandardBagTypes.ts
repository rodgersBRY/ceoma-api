import { logger } from "../common/logger.js";
import { withTransaction } from "../db/pool.js";
import { bootstrapBagTypes } from "./defaultBagTypes.js";

type BagTypeRow = {
  id: number;
  name: string;
  weight_kg: string | number;
};

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

function sameWeight(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.0001;
}

export async function seedStandardBagTypesIfMissing(): Promise<void> {
  await withTransaction(async (client) => {
    const existingResult = await client.query<BagTypeRow>(
      "SELECT id, name, weight_kg FROM bag_types",
    );
    const existing = existingResult.rows;

    const inserted: Array<{ name: string; weight_kg: number }> = [];
    for (const seed of bootstrapBagTypes) {
      const found = existing.some((row) => {
        const existingWeight = Number(row.weight_kg);
        return (
          normalizeName(row.name) === normalizeName(seed.name) ||
          sameWeight(existingWeight, seed.weightKg)
        );
      });

      if (found) {
        continue;
      }

      const insertResult = await client.query<BagTypeRow>(
        `
        INSERT INTO bag_types (name, weight_kg)
        VALUES ($1, $2)
        RETURNING id, name, weight_kg
        `,
        [seed.name, seed.weightKg],
      );

      existing.push(insertResult.rows[0]);
      inserted.push({ name: seed.name, weight_kg: seed.weightKg });
    }

    if (inserted.length === 0) {
      logger.info("Standard bag types already present. Bootstrap skipped.");
      return;
    }

    logger.info("Standard bag types bootstrapped", {
      inserted,
    });
  });
}

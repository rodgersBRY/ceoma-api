import crypto from "node:crypto";
import path from "node:path";

import multer from "multer";
import { ZodType } from "zod";
import * as XLSX from "xlsx";

import { ApiError } from "../../common/errors/ApiError.js";
import { withTransaction } from "../../db/pool.js";
import { AuthContext } from "../../types/auth.js";

const MAX_IMPORT_FILE_BYTES = 5 * 1024 * 1024;
const MAX_IMPORT_ROWS = 5000;
const ALLOWED_IMPORT_EXTENSIONS = new Set([".xlsx", ".xls", ".csv"]);

export const bulkImportUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMPORT_FILE_BYTES },
  fileFilter: (_req, file, callback) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_IMPORT_EXTENSIONS.has(ext)) {
      callback(null, true);
      
      return;
    }

    callback(new ApiError(400, "File must be .xlsx, .xls, or .csv"));
  },
});

export type BulkImportColumn = {
  header: string;
  field: string;
  required: boolean;
  type?: "string" | "number";
  example?: string;
};

export type BulkImportConfig<TInput> = {
  entityLabel: string;
  table: string;
  columns: BulkImportColumn[];
  schema: ZodType<TInput>;
  dedupeKey: (input: TInput) => string;
  existingKeysQuery: string;
  insertColumns: string[];
  toInsertValues: (
    input: TInput,
    id: string,
    organizationId: string,
  ) => unknown[];
};

type InsertedOutcome = { row: number; status: "inserted"; id: string };
type SkippedOutcome = { row: number; status: "skipped"; reason: string };
type ErrorOutcome = { row: number; status: "error"; issues: string[] };

export type BulkImportResult = {
  total_rows: number;
  inserted_count: number;
  skipped_count: number;
  error_count: number;
  inserted: InsertedOutcome[];
  skipped: SkippedOutcome[];
  errors: ErrorOutcome[];
};

function parseSheetRows(
  fileBuffer: Buffer,
  originalFilename: string,
): Record<string, unknown>[] {
  const isCsv = originalFilename.toLowerCase().endsWith(".csv");
  let workbook: XLSX.WorkBook;
  try {
    workbook = isCsv
      ? XLSX.read(fileBuffer.toString("utf-8"), { type: "string" })
      : XLSX.read(fileBuffer, { type: "buffer" });
  } catch {
    throw new ApiError(
      400,
      "Unable to parse file. Ensure it is a valid .xlsx, .xls, or .csv file",
    );
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new ApiError(400, "File does not contain any sheets");
  }

  const sheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
  });
}

function buildHeaderFieldMap(
  sampleRow: Record<string, unknown>,
): Map<string, string> {
  const map = new Map<string, string>();
  for (const key of Object.keys(sampleRow)) {
    map.set(key.trim().toLowerCase(), key);
  }

  return map;
}

function mapRow(
  raw: Record<string, unknown>,
  columns: BulkImportColumn[],
  headerFieldMap: Map<string, string>,
): Record<string, unknown> {
  const mapped: Record<string, unknown> = {};
  for (const column of columns) {
    const rawKey = headerFieldMap.get(column.header.toLowerCase());
    const value = rawKey !== undefined ? raw[rawKey] : undefined;

    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed === "") {
        mapped[column.field] = undefined;
      } else if (column.type === "number") {
        const parsed = Number(trimmed);
        mapped[column.field] = Number.isNaN(parsed) ? trimmed : parsed;
      } else {
        mapped[column.field] = trimmed;
      }
    } else if (value === undefined || value === null) {
      mapped[column.field] = undefined;
    } else {
      mapped[column.field] = value;
    }
  }
  return mapped;
}

export async function runBulkImport<TInput>(
  config: BulkImportConfig<TInput>,
  fileBuffer: Buffer,
  originalFilename: string,
  actor: AuthContext,
): Promise<BulkImportResult> {
  const rawRows = parseSheetRows(fileBuffer, originalFilename);

  if (rawRows.length === 0) {
    throw new ApiError(400, "File contains no data rows to import");
  }

  if (rawRows.length > MAX_IMPORT_ROWS) {
    throw new ApiError(
      400,
      `File contains ${rawRows.length} rows; maximum is ${MAX_IMPORT_ROWS}`,
    );
  }

  const headerFieldMap = buildHeaderFieldMap(rawRows[0]);
  for (const column of config.columns) {
    if (column.required && !headerFieldMap.has(column.header.toLowerCase())) {
      throw new ApiError(400, `Missing required column: ${column.header}`);
    }
  }

  const existingKeysResult = await withTransaction(
    (client) =>
      client.query<{ key: string }>(config.existingKeysQuery, [
        actor.organizationId,
      ]),
    actor,
  );
  const existingKeys = new Set(
    existingKeysResult.rows.map((row) => String(row.key).trim().toLowerCase()),
  );
  const seenInFile = new Set<string>();

  const inserted: InsertedOutcome[] = [];
  const skipped: SkippedOutcome[] = [];
  const errors: ErrorOutcome[] = [];
  const queued: { id: string; input: TInput; row: number }[] = [];

  rawRows.forEach((raw, index) => {
    const rowNumber = index + 2; // header is row 1, first data row is row 2
    const mapped = mapRow(raw, config.columns, headerFieldMap);
    const parsed = config.schema.safeParse(mapped);

    if (!parsed.success) {
      errors.push({
        row: rowNumber,
        status: "error",
        issues: parsed.error.issues.map((issue) => {
          const field = issue.path.join(".");
          return field ? `${field}: ${issue.message}` : issue.message;
        }),
      });

      return;
    }

    const key = config.dedupeKey(parsed.data);
    if (existingKeys.has(key)) {
      skipped.push({
        row: rowNumber,
        status: "skipped",
        reason: `Duplicate of existing ${config.entityLabel.toLowerCase()}`,
      });

      return;
    }

    if (seenInFile.has(key)) {
      skipped.push({
        row: rowNumber,
        status: "skipped",
        reason: `Duplicate of another row within the uploaded file`,
      });

      return;
    }

    seenInFile.add(key);
    queued.push({
      id: crypto.randomUUID(),
      input: parsed.data,
      row: rowNumber,
    });
  });

  if (queued.length > 0) {
    await withTransaction(async (client) => {
      const valuesSql: string[] = [];
      const params: unknown[] = [];
      let paramIndex = 1;

      for (const item of queued) {
        const values = config.toInsertValues(
          item.input,
          item.id,
          actor.organizationId,
        );
        const placeholders = values.map(() => `$${paramIndex++}`);
        
        valuesSql.push(`(${placeholders.join(",")})`);
        params.push(...values);
      }

      await client.query(
        `INSERT INTO ${config.table} (${config.insertColumns.join(",")}) VALUES ${valuesSql.join(",")}`,
        params,
      );
    }, actor);

    for (const item of queued) {
      inserted.push({ row: item.row, status: "inserted", id: item.id });
    }
  }

  return {
    total_rows: rawRows.length,
    inserted_count: inserted.length,
    skipped_count: skipped.length,
    error_count: errors.length,
    inserted,
    skipped,
    errors,
  };
}

function csvField(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function buildImportTemplateCsv(columns: BulkImportColumn[]): string {
  const header = columns.map((column) => csvField(column.header)).join(",");
  const example = columns
    .map((column) => csvField(column.example ?? ""))
    .join(",");
  return `${header}\n${example}\n`;
}

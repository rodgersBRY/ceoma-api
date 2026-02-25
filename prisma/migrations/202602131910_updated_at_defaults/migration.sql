-- Ensure updated_at columns have defaults for raw SQL inserts.
ALTER TABLE "users"
ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "idempotency_keys"
ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;

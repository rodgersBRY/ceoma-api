-- Create organization status enum
DO $$ BEGIN
  CREATE TYPE "OrganizationStatus" AS ENUM ('active', 'suspended');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Super admin table
CREATE TABLE IF NOT EXISTS "super_admins" (
  "id" SERIAL PRIMARY KEY,
  "email" TEXT NOT NULL UNIQUE,
  "password_hash" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Add organization status + onboarded by
ALTER TABLE "organizations"
  ADD COLUMN IF NOT EXISTS "status" "OrganizationStatus" NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS "onboarded_by" INTEGER;

CREATE INDEX IF NOT EXISTS "idx_org_status" ON "organizations" ("status");

ALTER TABLE "organizations"
  ADD CONSTRAINT "organizations_onboarded_by_fkey"
  FOREIGN KEY ("onboarded_by") REFERENCES "super_admins"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Org notes
CREATE TABLE IF NOT EXISTS "org_notes" (
  "id" SERIAL PRIMARY KEY,
  "organization_id" INTEGER NOT NULL,
  "super_admin_id" INTEGER NOT NULL,
  "note" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_org_notes_org" ON "org_notes" ("organization_id");
CREATE INDEX IF NOT EXISTS "idx_org_notes_admin" ON "org_notes" ("super_admin_id");

ALTER TABLE "org_notes"
  ADD CONSTRAINT "org_notes_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "org_notes"
  ADD CONSTRAINT "org_notes_super_admin_id_fkey"
  FOREIGN KEY ("super_admin_id") REFERENCES "super_admins"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Impersonation logs
CREATE TABLE IF NOT EXISTS "impersonation_logs" (
  "id" SERIAL PRIMARY KEY,
  "organization_id" INTEGER NOT NULL,
  "super_admin_id" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_impersonation_org" ON "impersonation_logs" ("organization_id");
CREATE INDEX IF NOT EXISTS "idx_impersonation_admin" ON "impersonation_logs" ("super_admin_id");

ALTER TABLE "impersonation_logs"
  ADD CONSTRAINT "impersonation_logs_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "impersonation_logs"
  ADD CONSTRAINT "impersonation_logs_super_admin_id_fkey"
  FOREIGN KEY ("super_admin_id") REFERENCES "super_admins"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

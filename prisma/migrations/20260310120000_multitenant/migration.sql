-- CreateEnum
CREATE TYPE "PlanTier" AS ENUM ('starter', 'growth', 'enterprise');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('trialing', 'active', 'past_due', 'cancelled');

-- CreateTable
CREATE TABLE "organizations" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "country" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" SERIAL NOT NULL,
    "organization_id" INTEGER NOT NULL,
    "plan" "PlanTier" NOT NULL DEFAULT 'starter',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'trialing',
    "stripe_customer_id" TEXT,
    "stripe_sub_id" TEXT,
    "trial_ends_at" TIMESTAMP(3),
    "current_period_end" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_organization_id_key" ON "subscriptions"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_stripe_sub_id_key" ON "subscriptions"("stripe_sub_id");

-- Seed default organization if missing
INSERT INTO "organizations" ("name", "slug")
VALUES ('Default Organization', 'default')
ON CONFLICT ("slug") DO NOTHING;

-- Seed default subscription for default org if missing
INSERT INTO "subscriptions" ("organization_id", "plan", "status")
SELECT o."id", 'starter', 'trialing'
FROM "organizations" o
WHERE o."slug" = 'default'
ON CONFLICT ("organization_id") DO NOTHING;

-- Add organization_id to users
ALTER TABLE "users" ADD COLUMN "organization_id" INTEGER;
UPDATE "users" SET "organization_id" = (SELECT "id" FROM "organizations" ORDER BY "id" LIMIT 1) WHERE "organization_id" IS NULL;
ALTER TABLE "users" ALTER COLUMN "organization_id" SET NOT NULL;

-- Add organization_id to business tables
ALTER TABLE "suppliers" ADD COLUMN "organization_id" INTEGER;
UPDATE "suppliers" SET "organization_id" = (SELECT "id" FROM "organizations" ORDER BY "id" LIMIT 1) WHERE "organization_id" IS NULL;
ALTER TABLE "suppliers" ALTER COLUMN "organization_id" SET NOT NULL;

ALTER TABLE "buyers" ADD COLUMN "organization_id" INTEGER;
UPDATE "buyers" SET "organization_id" = (SELECT "id" FROM "organizations" ORDER BY "id" LIMIT 1) WHERE "organization_id" IS NULL;
ALTER TABLE "buyers" ALTER COLUMN "organization_id" SET NOT NULL;

ALTER TABLE "warehouses" ADD COLUMN "organization_id" INTEGER;
UPDATE "warehouses" SET "organization_id" = (SELECT "id" FROM "organizations" ORDER BY "id" LIMIT 1) WHERE "organization_id" IS NULL;
ALTER TABLE "warehouses" ALTER COLUMN "organization_id" SET NOT NULL;

ALTER TABLE "grades" ADD COLUMN "organization_id" INTEGER;
UPDATE "grades" SET "organization_id" = (SELECT "id" FROM "organizations" ORDER BY "id" LIMIT 1) WHERE "organization_id" IS NULL;
ALTER TABLE "grades" ALTER COLUMN "organization_id" SET NOT NULL;

ALTER TABLE "bag_types" ADD COLUMN "organization_id" INTEGER;
UPDATE "bag_types" SET "organization_id" = (SELECT "id" FROM "organizations" ORDER BY "id" LIMIT 1) WHERE "organization_id" IS NULL;
ALTER TABLE "bag_types" ALTER COLUMN "organization_id" SET NOT NULL;

ALTER TABLE "lots" ADD COLUMN "organization_id" INTEGER;
UPDATE "lots" SET "organization_id" = (SELECT "id" FROM "organizations" ORDER BY "id" LIMIT 1) WHERE "organization_id" IS NULL;
ALTER TABLE "lots" ALTER COLUMN "organization_id" SET NOT NULL;

ALTER TABLE "auction_procurements" ADD COLUMN "organization_id" INTEGER;
UPDATE "auction_procurements" SET "organization_id" = (SELECT "id" FROM "organizations" ORDER BY "id" LIMIT 1) WHERE "organization_id" IS NULL;
ALTER TABLE "auction_procurements" ALTER COLUMN "organization_id" SET NOT NULL;

ALTER TABLE "direct_agreements" ADD COLUMN "organization_id" INTEGER;
UPDATE "direct_agreements" SET "organization_id" = (SELECT "id" FROM "organizations" ORDER BY "id" LIMIT 1) WHERE "organization_id" IS NULL;
ALTER TABLE "direct_agreements" ALTER COLUMN "organization_id" SET NOT NULL;

ALTER TABLE "direct_deliveries" ADD COLUMN "organization_id" INTEGER;
UPDATE "direct_deliveries" SET "organization_id" = (SELECT "id" FROM "organizations" ORDER BY "id" LIMIT 1) WHERE "organization_id" IS NULL;
ALTER TABLE "direct_deliveries" ALTER COLUMN "organization_id" SET NOT NULL;

ALTER TABLE "contracts" ADD COLUMN "organization_id" INTEGER;
UPDATE "contracts" SET "organization_id" = (SELECT "id" FROM "organizations" ORDER BY "id" LIMIT 1) WHERE "organization_id" IS NULL;
ALTER TABLE "contracts" ALTER COLUMN "organization_id" SET NOT NULL;

ALTER TABLE "shipments" ADD COLUMN "organization_id" INTEGER;
UPDATE "shipments" SET "organization_id" = (SELECT "id" FROM "organizations" ORDER BY "id" LIMIT 1) WHERE "organization_id" IS NULL;
ALTER TABLE "shipments" ALTER COLUMN "organization_id" SET NOT NULL;

ALTER TABLE "allocations" ADD COLUMN "organization_id" INTEGER;
UPDATE "allocations" SET "organization_id" = (SELECT "id" FROM "organizations" ORDER BY "id" LIMIT 1) WHERE "organization_id" IS NULL;
ALTER TABLE "allocations" ALTER COLUMN "organization_id" SET NOT NULL;

ALTER TABLE "shipment_documents" ADD COLUMN "organization_id" INTEGER;
UPDATE "shipment_documents" SET "organization_id" = (SELECT "id" FROM "organizations" ORDER BY "id" LIMIT 1) WHERE "organization_id" IS NULL;
ALTER TABLE "shipment_documents" ALTER COLUMN "organization_id" SET NOT NULL;

ALTER TABLE "cost_entries" ADD COLUMN "organization_id" INTEGER;
UPDATE "cost_entries" SET "organization_id" = (SELECT "id" FROM "organizations" ORDER BY "id" LIMIT 1) WHERE "organization_id" IS NULL;
ALTER TABLE "cost_entries" ALTER COLUMN "organization_id" SET NOT NULL;

ALTER TABLE "stock_adjustments" ADD COLUMN "organization_id" INTEGER;
UPDATE "stock_adjustments" SET "organization_id" = (SELECT "id" FROM "organizations" ORDER BY "id" LIMIT 1) WHERE "organization_id" IS NULL;
ALTER TABLE "stock_adjustments" ALTER COLUMN "organization_id" SET NOT NULL;

-- Drop old unique indexes
DROP INDEX IF EXISTS "lots_lot_code_key";
DROP INDEX IF EXISTS "contracts_contract_number_key";
DROP INDEX IF EXISTS "shipments_shipment_number_key";

-- Add new unique composite indexes
CREATE UNIQUE INDEX "uniq_lots_org_code" ON "lots"("organization_id", "lot_code");
CREATE UNIQUE INDEX "uniq_contracts_org_number" ON "contracts"("organization_id", "contract_number");
CREATE UNIQUE INDEX "uniq_shipments_org_number" ON "shipments"("organization_id", "shipment_number");

-- Add org indexes
CREATE INDEX "idx_users_org" ON "users"("organization_id");
CREATE INDEX "idx_suppliers_org" ON "suppliers"("organization_id");
CREATE INDEX "idx_buyers_org" ON "buyers"("organization_id");
CREATE INDEX "idx_warehouses_org" ON "warehouses"("organization_id");
CREATE INDEX "idx_grades_org" ON "grades"("organization_id");
CREATE INDEX "idx_bag_types_org" ON "bag_types"("organization_id");
CREATE INDEX "idx_lots_org" ON "lots"("organization_id");
CREATE INDEX "idx_auction_procurements_org" ON "auction_procurements"("organization_id");
CREATE INDEX "idx_direct_agreements_org" ON "direct_agreements"("organization_id");
CREATE INDEX "idx_direct_deliveries_org" ON "direct_deliveries"("organization_id");
CREATE INDEX "idx_contracts_org" ON "contracts"("organization_id");
CREATE INDEX "idx_shipments_org" ON "shipments"("organization_id");
CREATE INDEX "idx_allocations_org" ON "allocations"("organization_id");
CREATE INDEX "idx_shipment_documents_org" ON "shipment_documents"("organization_id");
CREATE INDEX "idx_cost_entries_org" ON "cost_entries"("organization_id");
CREATE INDEX "idx_stock_adjustments_org" ON "stock_adjustments"("organization_id");

-- Add foreign keys
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "buyers" ADD CONSTRAINT "buyers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "grades" ADD CONSTRAINT "grades_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bag_types" ADD CONSTRAINT "bag_types_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "lots" ADD CONSTRAINT "lots_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "auction_procurements" ADD CONSTRAINT "auction_procurements_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "direct_agreements" ADD CONSTRAINT "direct_agreements_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "direct_deliveries" ADD CONSTRAINT "direct_deliveries_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "allocations" ADD CONSTRAINT "allocations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "shipment_documents" ADD CONSTRAINT "shipment_documents_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cost_entries" ADD CONSTRAINT "cost_entries_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Link subscription to organization
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

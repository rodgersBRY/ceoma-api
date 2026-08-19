-- AlterTable
ALTER TABLE "allocations" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "api_keys" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "auction_procurements" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "bag_types" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "buyers" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "contracts" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "cost_entries" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "direct_agreements" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "direct_deliveries" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "grades" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "idempotency_keys" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "impersonation_logs" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "lots" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "org_notes" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "organizations" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "shipment_documents" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "shipments" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "stock_adjustments" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "subscriptions" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "super_admins" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "suppliers" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "user_sessions" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "warehouses" ALTER COLUMN "id" DROP DEFAULT;

-- Ensure we only run this migration on empty tables.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM organizations) OR
     EXISTS (SELECT 1 FROM subscriptions) OR
     EXISTS (SELECT 1 FROM super_admins) OR
     EXISTS (SELECT 1 FROM org_notes) OR
     EXISTS (SELECT 1 FROM impersonation_logs) OR
     EXISTS (SELECT 1 FROM users) OR
     EXISTS (SELECT 1 FROM user_sessions) OR
     EXISTS (SELECT 1 FROM api_keys) OR
     EXISTS (SELECT 1 FROM idempotency_keys) OR
     EXISTS (SELECT 1 FROM suppliers) OR
     EXISTS (SELECT 1 FROM buyers) OR
     EXISTS (SELECT 1 FROM warehouses) OR
     EXISTS (SELECT 1 FROM grades) OR
     EXISTS (SELECT 1 FROM bag_types) OR
     EXISTS (SELECT 1 FROM lots) OR
     EXISTS (SELECT 1 FROM auction_procurements) OR
     EXISTS (SELECT 1 FROM direct_agreements) OR
     EXISTS (SELECT 1 FROM direct_deliveries) OR
     EXISTS (SELECT 1 FROM contracts) OR
     EXISTS (SELECT 1 FROM shipments) OR
     EXISTS (SELECT 1 FROM allocations) OR
     EXISTS (SELECT 1 FROM shipment_documents) OR
     EXISTS (SELECT 1 FROM cost_entries) OR
     EXISTS (SELECT 1 FROM stock_adjustments) THEN
    RAISE EXCEPTION 'UUID migration requires empty tables. Run prisma migrate reset or perform a manual data migration.';
  END IF;
END $$;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop foreign keys (id types will change)
ALTER TABLE "organizations" DROP CONSTRAINT IF EXISTS "organizations_onboarded_by_fkey";
ALTER TABLE "org_notes" DROP CONSTRAINT IF EXISTS "org_notes_organization_id_fkey";
ALTER TABLE "org_notes" DROP CONSTRAINT IF EXISTS "org_notes_super_admin_id_fkey";
ALTER TABLE "impersonation_logs" DROP CONSTRAINT IF EXISTS "impersonation_logs_organization_id_fkey";
ALTER TABLE "impersonation_logs" DROP CONSTRAINT IF EXISTS "impersonation_logs_super_admin_id_fkey";
ALTER TABLE "subscriptions" DROP CONSTRAINT IF EXISTS "subscriptions_organization_id_fkey";
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_organization_id_fkey";
ALTER TABLE "user_sessions" DROP CONSTRAINT IF EXISTS "user_sessions_user_id_fkey";
ALTER TABLE "api_keys" DROP CONSTRAINT IF EXISTS "api_keys_user_id_fkey";
ALTER TABLE "suppliers" DROP CONSTRAINT IF EXISTS "suppliers_organization_id_fkey";
ALTER TABLE "buyers" DROP CONSTRAINT IF EXISTS "buyers_organization_id_fkey";
ALTER TABLE "warehouses" DROP CONSTRAINT IF EXISTS "warehouses_organization_id_fkey";
ALTER TABLE "grades" DROP CONSTRAINT IF EXISTS "grades_organization_id_fkey";
ALTER TABLE "bag_types" DROP CONSTRAINT IF EXISTS "bag_types_organization_id_fkey";
ALTER TABLE "lots" DROP CONSTRAINT IF EXISTS "lots_supplier_id_fkey";
ALTER TABLE "lots" DROP CONSTRAINT IF EXISTS "lots_grade_id_fkey";
ALTER TABLE "lots" DROP CONSTRAINT IF EXISTS "lots_warehouse_id_fkey";
ALTER TABLE "lots" DROP CONSTRAINT IF EXISTS "lots_bag_type_id_fkey";
ALTER TABLE "lots" DROP CONSTRAINT IF EXISTS "lots_organization_id_fkey";
ALTER TABLE "auction_procurements" DROP CONSTRAINT IF EXISTS "auction_procurements_lot_id_fkey";
ALTER TABLE "auction_procurements" DROP CONSTRAINT IF EXISTS "auction_procurements_marketing_agent_id_fkey";
ALTER TABLE "auction_procurements" DROP CONSTRAINT IF EXISTS "auction_procurements_organization_id_fkey";
ALTER TABLE "direct_agreements" DROP CONSTRAINT IF EXISTS "direct_agreements_supplier_id_fkey";
ALTER TABLE "direct_agreements" DROP CONSTRAINT IF EXISTS "direct_agreements_organization_id_fkey";
ALTER TABLE "direct_deliveries" DROP CONSTRAINT IF EXISTS "direct_deliveries_agreement_id_fkey";
ALTER TABLE "direct_deliveries" DROP CONSTRAINT IF EXISTS "direct_deliveries_lot_id_fkey";
ALTER TABLE "direct_deliveries" DROP CONSTRAINT IF EXISTS "direct_deliveries_organization_id_fkey";
ALTER TABLE "contracts" DROP CONSTRAINT IF EXISTS "contracts_buyer_id_fkey";
ALTER TABLE "contracts" DROP CONSTRAINT IF EXISTS "contracts_grade_id_fkey";
ALTER TABLE "contracts" DROP CONSTRAINT IF EXISTS "contracts_organization_id_fkey";
ALTER TABLE "shipments" DROP CONSTRAINT IF EXISTS "shipments_contract_id_fkey";
ALTER TABLE "shipments" DROP CONSTRAINT IF EXISTS "shipments_organization_id_fkey";
ALTER TABLE "allocations" DROP CONSTRAINT IF EXISTS "allocations_contract_id_fkey";
ALTER TABLE "allocations" DROP CONSTRAINT IF EXISTS "allocations_lot_id_fkey";
ALTER TABLE "allocations" DROP CONSTRAINT IF EXISTS "allocations_shipment_id_fkey";
ALTER TABLE "allocations" DROP CONSTRAINT IF EXISTS "allocations_organization_id_fkey";
ALTER TABLE "shipment_documents" DROP CONSTRAINT IF EXISTS "shipment_documents_shipment_id_fkey";
ALTER TABLE "shipment_documents" DROP CONSTRAINT IF EXISTS "shipment_documents_organization_id_fkey";
ALTER TABLE "cost_entries" DROP CONSTRAINT IF EXISTS "cost_entries_lot_id_fkey";
ALTER TABLE "cost_entries" DROP CONSTRAINT IF EXISTS "cost_entries_shipment_id_fkey";
ALTER TABLE "cost_entries" DROP CONSTRAINT IF EXISTS "cost_entries_organization_id_fkey";
ALTER TABLE "stock_adjustments" DROP CONSTRAINT IF EXISTS "stock_adjustments_lot_id_fkey";
ALTER TABLE "stock_adjustments" DROP CONSTRAINT IF EXISTS "stock_adjustments_organization_id_fkey";

-- Drop serial defaults before type conversion
ALTER TABLE "organizations" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "super_admins" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "org_notes" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "impersonation_logs" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "subscriptions" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "user_sessions" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "api_keys" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "idempotency_keys" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "suppliers" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "buyers" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "warehouses" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "grades" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "bag_types" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "lots" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "auction_procurements" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "direct_agreements" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "direct_deliveries" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "contracts" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "shipments" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "allocations" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "shipment_documents" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "cost_entries" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "stock_adjustments" ALTER COLUMN "id" DROP DEFAULT;

-- Alter primary key columns
ALTER TABLE "organizations"
  ALTER COLUMN "id" TYPE uuid USING gen_random_uuid(),
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid(),
  ALTER COLUMN "onboarded_by" TYPE uuid USING CASE WHEN "onboarded_by" IS NULL THEN NULL ELSE gen_random_uuid() END;

ALTER TABLE "super_admins"
  ALTER COLUMN "id" TYPE uuid USING gen_random_uuid(),
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "org_notes"
  ALTER COLUMN "id" TYPE uuid USING gen_random_uuid(),
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid(),
  ALTER COLUMN "organization_id" TYPE uuid USING gen_random_uuid(),
  ALTER COLUMN "super_admin_id" TYPE uuid USING gen_random_uuid();

ALTER TABLE "impersonation_logs"
  ALTER COLUMN "id" TYPE uuid USING gen_random_uuid(),
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid(),
  ALTER COLUMN "organization_id" TYPE uuid USING gen_random_uuid(),
  ALTER COLUMN "super_admin_id" TYPE uuid USING gen_random_uuid();

ALTER TABLE "subscriptions"
  ALTER COLUMN "id" TYPE uuid USING gen_random_uuid(),
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid(),
  ALTER COLUMN "organization_id" TYPE uuid USING gen_random_uuid();

ALTER TABLE "users"
  ALTER COLUMN "id" TYPE uuid USING gen_random_uuid(),
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid(),
  ALTER COLUMN "organization_id" TYPE uuid USING gen_random_uuid();

ALTER TABLE "user_sessions"
  ALTER COLUMN "id" TYPE uuid USING gen_random_uuid(),
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid(),
  ALTER COLUMN "user_id" TYPE uuid USING gen_random_uuid();

ALTER TABLE "api_keys"
  ALTER COLUMN "id" TYPE uuid USING gen_random_uuid(),
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid(),
  ALTER COLUMN "user_id" TYPE uuid USING gen_random_uuid();

ALTER TABLE "idempotency_keys"
  ALTER COLUMN "id" TYPE uuid USING gen_random_uuid(),
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "suppliers"
  ALTER COLUMN "id" TYPE uuid USING gen_random_uuid(),
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid(),
  ALTER COLUMN "organization_id" TYPE uuid USING gen_random_uuid();

ALTER TABLE "buyers"
  ALTER COLUMN "id" TYPE uuid USING gen_random_uuid(),
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid(),
  ALTER COLUMN "organization_id" TYPE uuid USING gen_random_uuid();

ALTER TABLE "warehouses"
  ALTER COLUMN "id" TYPE uuid USING gen_random_uuid(),
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid(),
  ALTER COLUMN "organization_id" TYPE uuid USING gen_random_uuid();

ALTER TABLE "grades"
  ALTER COLUMN "id" TYPE uuid USING gen_random_uuid(),
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid(),
  ALTER COLUMN "organization_id" TYPE uuid USING gen_random_uuid();

ALTER TABLE "bag_types"
  ALTER COLUMN "id" TYPE uuid USING gen_random_uuid(),
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid(),
  ALTER COLUMN "organization_id" TYPE uuid USING gen_random_uuid();

ALTER TABLE "lots"
  ALTER COLUMN "id" TYPE uuid USING gen_random_uuid(),
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid(),
  ALTER COLUMN "supplier_id" TYPE uuid USING gen_random_uuid(),
  ALTER COLUMN "grade_id" TYPE uuid USING gen_random_uuid(),
  ALTER COLUMN "warehouse_id" TYPE uuid USING gen_random_uuid(),
  ALTER COLUMN "bag_type_id" TYPE uuid USING gen_random_uuid(),
  ALTER COLUMN "organization_id" TYPE uuid USING gen_random_uuid();

ALTER TABLE "auction_procurements"
  ALTER COLUMN "id" TYPE uuid USING gen_random_uuid(),
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid(),
  ALTER COLUMN "lot_id" TYPE uuid USING gen_random_uuid(),
  ALTER COLUMN "marketing_agent_id" TYPE uuid USING gen_random_uuid(),
  ALTER COLUMN "organization_id" TYPE uuid USING gen_random_uuid();

ALTER TABLE "direct_agreements"
  ALTER COLUMN "id" TYPE uuid USING gen_random_uuid(),
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid(),
  ALTER COLUMN "supplier_id" TYPE uuid USING gen_random_uuid(),
  ALTER COLUMN "organization_id" TYPE uuid USING gen_random_uuid();

ALTER TABLE "direct_deliveries"
  ALTER COLUMN "id" TYPE uuid USING gen_random_uuid(),
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid(),
  ALTER COLUMN "agreement_id" TYPE uuid USING gen_random_uuid(),
  ALTER COLUMN "lot_id" TYPE uuid USING gen_random_uuid(),
  ALTER COLUMN "organization_id" TYPE uuid USING gen_random_uuid();

ALTER TABLE "contracts"
  ALTER COLUMN "id" TYPE uuid USING gen_random_uuid(),
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid(),
  ALTER COLUMN "buyer_id" TYPE uuid USING gen_random_uuid(),
  ALTER COLUMN "grade_id" TYPE uuid USING CASE WHEN "grade_id" IS NULL THEN NULL ELSE gen_random_uuid() END,
  ALTER COLUMN "organization_id" TYPE uuid USING gen_random_uuid();

ALTER TABLE "shipments"
  ALTER COLUMN "id" TYPE uuid USING gen_random_uuid(),
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid(),
  ALTER COLUMN "contract_id" TYPE uuid USING gen_random_uuid(),
  ALTER COLUMN "organization_id" TYPE uuid USING gen_random_uuid();

ALTER TABLE "allocations"
  ALTER COLUMN "id" TYPE uuid USING gen_random_uuid(),
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid(),
  ALTER COLUMN "contract_id" TYPE uuid USING gen_random_uuid(),
  ALTER COLUMN "lot_id" TYPE uuid USING gen_random_uuid(),
  ALTER COLUMN "shipment_id" TYPE uuid USING CASE WHEN "shipment_id" IS NULL THEN NULL ELSE gen_random_uuid() END,
  ALTER COLUMN "organization_id" TYPE uuid USING gen_random_uuid();

ALTER TABLE "shipment_documents"
  ALTER COLUMN "id" TYPE uuid USING gen_random_uuid(),
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid(),
  ALTER COLUMN "shipment_id" TYPE uuid USING gen_random_uuid(),
  ALTER COLUMN "organization_id" TYPE uuid USING gen_random_uuid();

ALTER TABLE "cost_entries"
  ALTER COLUMN "id" TYPE uuid USING gen_random_uuid(),
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid(),
  ALTER COLUMN "lot_id" TYPE uuid USING CASE WHEN "lot_id" IS NULL THEN NULL ELSE gen_random_uuid() END,
  ALTER COLUMN "shipment_id" TYPE uuid USING CASE WHEN "shipment_id" IS NULL THEN NULL ELSE gen_random_uuid() END,
  ALTER COLUMN "organization_id" TYPE uuid USING gen_random_uuid();

ALTER TABLE "stock_adjustments"
  ALTER COLUMN "id" TYPE uuid USING gen_random_uuid(),
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid(),
  ALTER COLUMN "lot_id" TYPE uuid USING gen_random_uuid(),
  ALTER COLUMN "organization_id" TYPE uuid USING gen_random_uuid();

-- Recreate foreign keys
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_onboarded_by_fkey" FOREIGN KEY ("onboarded_by") REFERENCES "super_admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "org_notes" ADD CONSTRAINT "org_notes_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "org_notes" ADD CONSTRAINT "org_notes_super_admin_id_fkey" FOREIGN KEY ("super_admin_id") REFERENCES "super_admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "impersonation_logs" ADD CONSTRAINT "impersonation_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "impersonation_logs" ADD CONSTRAINT "impersonation_logs_super_admin_id_fkey" FOREIGN KEY ("super_admin_id") REFERENCES "super_admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "buyers" ADD CONSTRAINT "buyers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "grades" ADD CONSTRAINT "grades_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bag_types" ADD CONSTRAINT "bag_types_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "lots" ADD CONSTRAINT "lots_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "lots" ADD CONSTRAINT "lots_grade_id_fkey" FOREIGN KEY ("grade_id") REFERENCES "grades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "lots" ADD CONSTRAINT "lots_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "lots" ADD CONSTRAINT "lots_bag_type_id_fkey" FOREIGN KEY ("bag_type_id") REFERENCES "bag_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "lots" ADD CONSTRAINT "lots_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "auction_procurements" ADD CONSTRAINT "auction_procurements_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "lots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "auction_procurements" ADD CONSTRAINT "auction_procurements_marketing_agent_id_fkey" FOREIGN KEY ("marketing_agent_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "auction_procurements" ADD CONSTRAINT "auction_procurements_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "direct_agreements" ADD CONSTRAINT "direct_agreements_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "direct_agreements" ADD CONSTRAINT "direct_agreements_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "direct_deliveries" ADD CONSTRAINT "direct_deliveries_agreement_id_fkey" FOREIGN KEY ("agreement_id") REFERENCES "direct_agreements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "direct_deliveries" ADD CONSTRAINT "direct_deliveries_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "lots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "direct_deliveries" ADD CONSTRAINT "direct_deliveries_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "buyers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_grade_id_fkey" FOREIGN KEY ("grade_id") REFERENCES "grades"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "allocations" ADD CONSTRAINT "allocations_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "allocations" ADD CONSTRAINT "allocations_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "lots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "allocations" ADD CONSTRAINT "allocations_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "allocations" ADD CONSTRAINT "allocations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "shipment_documents" ADD CONSTRAINT "shipment_documents_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "shipment_documents" ADD CONSTRAINT "shipment_documents_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cost_entries" ADD CONSTRAINT "cost_entries_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "lots"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cost_entries" ADD CONSTRAINT "cost_entries_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cost_entries" ADD CONSTRAINT "cost_entries_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "lots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

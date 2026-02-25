-- CreateEnum
CREATE TYPE "SupplierType" AS ENUM ('auction_agent', 'mill', 'farmer', 'other');

-- CreateEnum
CREATE TYPE "LotSource" AS ENUM ('auction', 'direct');

-- CreateEnum
CREATE TYPE "LotStatus" AS ENUM ('in_stock', 'allocated', 'picked', 'stuffed', 'shipped');

-- CreateEnum
CREATE TYPE "PriceTerms" AS ENUM ('fob', 'cif');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('open', 'partially_fulfilled', 'fulfilled', 'closed');

-- CreateEnum
CREATE TYPE "AllocationStatus" AS ENUM ('allocated', 'shipped', 'cancelled');

-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('planned', 'stuffed', 'cleared', 'on_vessel', 'completed');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('commercial_invoice', 'packing_list', 'traceability_report', 'cost_breakdown_summary');

-- CreateTable
CREATE TABLE "suppliers" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "supplier_type" "SupplierType" NOT NULL,
    "country" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "buyers" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "buyers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouses" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grades" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "grades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bag_types" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "weight_kg" DECIMAL(10,3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bag_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lots" (
    "id" SERIAL NOT NULL,
    "lot_code" TEXT NOT NULL,
    "source" "LotSource" NOT NULL,
    "source_reference" TEXT NOT NULL,
    "supplier_id" INTEGER NOT NULL,
    "grade_id" INTEGER NOT NULL,
    "warehouse_id" INTEGER NOT NULL,
    "bag_type_id" INTEGER NOT NULL,
    "crop_year" TEXT NOT NULL,
    "bags_total" INTEGER NOT NULL,
    "weight_total_kg" DECIMAL(12,3) NOT NULL,
    "weight_available_kg" DECIMAL(12,3) NOT NULL,
    "purchase_price_per_kg" DECIMAL(12,4) NOT NULL,
    "auction_fees_total" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "additional_cost_total" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "status" "LotStatus" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auction_procurements" (
    "id" SERIAL NOT NULL,
    "lot_id" INTEGER NOT NULL,
    "auction_lot_number" TEXT NOT NULL,
    "marketing_agent_id" INTEGER NOT NULL,
    "catalog_document_path" TEXT,
    "immutable" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auction_procurements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "direct_agreements" (
    "id" SERIAL NOT NULL,
    "supplier_id" INTEGER NOT NULL,
    "agreement_reference" TEXT NOT NULL,
    "agreed_price_per_kg" DECIMAL(12,4) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "crop_year" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "direct_agreements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "direct_deliveries" (
    "id" SERIAL NOT NULL,
    "agreement_id" INTEGER NOT NULL,
    "lot_id" INTEGER NOT NULL,
    "delivery_reference" TEXT NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "moisture_percent" DECIMAL(8,3) NOT NULL,
    "screen_size" DECIMAL(8,3) NOT NULL,
    "defects_percent" DECIMAL(8,3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "direct_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts" (
    "id" SERIAL NOT NULL,
    "contract_number" TEXT NOT NULL,
    "buyer_id" INTEGER NOT NULL,
    "grade_id" INTEGER,
    "quantity_kg" DECIMAL(12,3) NOT NULL,
    "price_per_kg" DECIMAL(12,4) NOT NULL,
    "price_terms" "PriceTerms" NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "shipment_window_start" DATE NOT NULL,
    "shipment_window_end" DATE NOT NULL,
    "allocated_kg" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "shipped_kg" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "status" "ContractStatus" NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipments" (
    "id" SERIAL NOT NULL,
    "shipment_number" TEXT NOT NULL,
    "contract_id" INTEGER NOT NULL,
    "status" "ShipmentStatus" NOT NULL DEFAULT 'planned',
    "container_number" TEXT,
    "seal_number" TEXT,
    "planned_departure" DATE,
    "actual_departure" DATE,
    "traceability_snapshot" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "allocations" (
    "id" SERIAL NOT NULL,
    "contract_id" INTEGER NOT NULL,
    "lot_id" INTEGER NOT NULL,
    "allocated_kg" DECIMAL(12,3) NOT NULL,
    "status" "AllocationStatus" NOT NULL DEFAULT 'allocated',
    "shipment_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipment_documents" (
    "id" SERIAL NOT NULL,
    "shipment_id" INTEGER NOT NULL,
    "document_type" "DocumentType" NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shipment_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cost_entries" (
    "id" SERIAL NOT NULL,
    "lot_id" INTEGER,
    "shipment_id" INTEGER,
    "category" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cost_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_adjustments" (
    "id" SERIAL NOT NULL,
    "lot_id" INTEGER NOT NULL,
    "adjustment_kg" DECIMAL(12,3) NOT NULL,
    "reason" TEXT NOT NULL,
    "approved_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lots_lot_code_key" ON "lots"("lot_code");

-- CreateIndex
CREATE INDEX "idx_lots_source" ON "lots"("source");

-- CreateIndex
CREATE INDEX "idx_lots_status" ON "lots"("status");

-- CreateIndex
CREATE UNIQUE INDEX "auction_procurements_lot_id_key" ON "auction_procurements"("lot_id");

-- CreateIndex
CREATE UNIQUE INDEX "direct_deliveries_lot_id_key" ON "direct_deliveries"("lot_id");

-- CreateIndex
CREATE UNIQUE INDEX "contracts_contract_number_key" ON "contracts"("contract_number");

-- CreateIndex
CREATE UNIQUE INDEX "shipments_shipment_number_key" ON "shipments"("shipment_number");

-- CreateIndex
CREATE INDEX "idx_shipments_contract" ON "shipments"("contract_id");

-- CreateIndex
CREATE INDEX "idx_allocations_contract" ON "allocations"("contract_id");

-- CreateIndex
CREATE INDEX "idx_allocations_lot" ON "allocations"("lot_id");

-- CreateIndex
CREATE INDEX "idx_allocations_status" ON "allocations"("status");

-- AddForeignKey
ALTER TABLE "lots" ADD CONSTRAINT "lots_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lots" ADD CONSTRAINT "lots_grade_id_fkey" FOREIGN KEY ("grade_id") REFERENCES "grades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lots" ADD CONSTRAINT "lots_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lots" ADD CONSTRAINT "lots_bag_type_id_fkey" FOREIGN KEY ("bag_type_id") REFERENCES "bag_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_procurements" ADD CONSTRAINT "auction_procurements_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "lots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_procurements" ADD CONSTRAINT "auction_procurements_marketing_agent_id_fkey" FOREIGN KEY ("marketing_agent_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direct_agreements" ADD CONSTRAINT "direct_agreements_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direct_deliveries" ADD CONSTRAINT "direct_deliveries_agreement_id_fkey" FOREIGN KEY ("agreement_id") REFERENCES "direct_agreements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direct_deliveries" ADD CONSTRAINT "direct_deliveries_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "lots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "buyers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_grade_id_fkey" FOREIGN KEY ("grade_id") REFERENCES "grades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "allocations" ADD CONSTRAINT "allocations_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "allocations" ADD CONSTRAINT "allocations_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "lots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "allocations" ADD CONSTRAINT "allocations_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_documents" ADD CONSTRAINT "shipment_documents_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_entries" ADD CONSTRAINT "cost_entries_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "lots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_entries" ADD CONSTRAINT "cost_entries_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "lots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

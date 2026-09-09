-- ============================================================
-- Enable Row Level Security
-- ============================================================
-- Strategy:
--   1. All tenant-scoped business tables are isolated by organization_id.
--   2. Auth tables (user_sessions, api_keys) are isolated by user_id.
--   3. Platform tables (organizations, subscriptions, super_admins,
--      org_notes, impersonation_logs) are blocked for regular app users;
--      the super-admin DB role uses BYPASSRLS.
--   4. idempotency_keys is internal infrastructure — RLS skipped.
--
-- The app must inject three session-local settings before any query:
--   SET LOCAL app.org_id    = '<uuid>';
--   SET LOCAL app.user_id   = '<uuid>';
--   SET LOCAL app.user_role = '<role>';
-- ============================================================


-- ============================================================
-- HELPER: reusable expressions (defined here for reference)
--   current_org()  → current_setting('app.org_id',  true)::uuid
--   current_uid()  → current_setting('app.user_id', true)::uuid
--   current_role_app() → current_setting('app.user_role', true)
-- ============================================================


-- ============================================================
-- TENANT-SCOPED TABLES
-- Primary policy: org isolation.
-- Secondary policy: role-based write restrictions where relevant.
-- ============================================================


-- ------------------------------------------------------------
-- users
-- All roles can read users in their org (needed for UI, listings).
-- Only admin can insert/delete. Users can update themselves; admin can update anyone.
-- ------------------------------------------------------------
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_select ON users
  FOR SELECT
  USING (organization_id = current_setting('app.org_id', true)::uuid);

CREATE POLICY users_insert ON users
  FOR INSERT
  WITH CHECK (
    organization_id = current_setting('app.org_id', true)::uuid
    AND current_setting('app.user_role', true) = 'admin'
  );

CREATE POLICY users_update ON users
  FOR UPDATE
  USING (
    organization_id = current_setting('app.org_id', true)::uuid
    AND (
      current_setting('app.user_role', true) = 'admin'
      OR id = current_setting('app.user_id', true)::uuid
    )
  );

CREATE POLICY users_delete ON users
  FOR DELETE
  USING (
    organization_id = current_setting('app.org_id', true)::uuid
    AND current_setting('app.user_role', true) = 'admin'
  );


-- ------------------------------------------------------------
-- suppliers
-- All roles can read. Only admin/compliance can write (mirrors route-level auth).
-- ------------------------------------------------------------
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY suppliers_select ON suppliers
  FOR SELECT
  USING (organization_id = current_setting('app.org_id', true)::uuid);

CREATE POLICY suppliers_insert ON suppliers
  FOR INSERT
  WITH CHECK (
    organization_id = current_setting('app.org_id', true)::uuid
    AND current_setting('app.user_role', true) IN ('admin', 'compliance')
  );

CREATE POLICY suppliers_update ON suppliers
  FOR UPDATE
  USING (
    organization_id = current_setting('app.org_id', true)::uuid
    AND current_setting('app.user_role', true) IN ('admin', 'compliance')
  );

CREATE POLICY suppliers_delete ON suppliers
  FOR DELETE
  USING (
    organization_id = current_setting('app.org_id', true)::uuid
    AND current_setting('app.user_role', true) IN ('admin', 'compliance')
  );


-- ------------------------------------------------------------
-- buyers
-- Same pattern as suppliers.
-- ------------------------------------------------------------
ALTER TABLE buyers ENABLE ROW LEVEL SECURITY;

CREATE POLICY buyers_select ON buyers
  FOR SELECT
  USING (organization_id = current_setting('app.org_id', true)::uuid);

CREATE POLICY buyers_insert ON buyers
  FOR INSERT
  WITH CHECK (
    organization_id = current_setting('app.org_id', true)::uuid
    AND current_setting('app.user_role', true) IN ('admin', 'compliance')
  );

CREATE POLICY buyers_update ON buyers
  FOR UPDATE
  USING (
    organization_id = current_setting('app.org_id', true)::uuid
    AND current_setting('app.user_role', true) IN ('admin', 'compliance')
  );

CREATE POLICY buyers_delete ON buyers
  FOR DELETE
  USING (
    organization_id = current_setting('app.org_id', true)::uuid
    AND current_setting('app.user_role', true) IN ('admin', 'compliance')
  );


-- ------------------------------------------------------------
-- warehouses
-- Same pattern as suppliers.
-- ------------------------------------------------------------
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;

CREATE POLICY warehouses_select ON warehouses
  FOR SELECT
  USING (organization_id = current_setting('app.org_id', true)::uuid);

CREATE POLICY warehouses_insert ON warehouses
  FOR INSERT
  WITH CHECK (
    organization_id = current_setting('app.org_id', true)::uuid
    AND current_setting('app.user_role', true) IN ('admin', 'compliance')
  );

CREATE POLICY warehouses_update ON warehouses
  FOR UPDATE
  USING (
    organization_id = current_setting('app.org_id', true)::uuid
    AND current_setting('app.user_role', true) IN ('admin', 'compliance')
  );

CREATE POLICY warehouses_delete ON warehouses
  FOR DELETE
  USING (
    organization_id = current_setting('app.org_id', true)::uuid
    AND current_setting('app.user_role', true) IN ('admin', 'compliance')
  );


-- ------------------------------------------------------------
-- grades
-- Same pattern as suppliers.
-- ------------------------------------------------------------
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;

CREATE POLICY grades_select ON grades
  FOR SELECT
  USING (organization_id = current_setting('app.org_id', true)::uuid);

CREATE POLICY grades_insert ON grades
  FOR INSERT
  WITH CHECK (
    organization_id = current_setting('app.org_id', true)::uuid
    AND current_setting('app.user_role', true) IN ('admin', 'compliance')
  );

CREATE POLICY grades_update ON grades
  FOR UPDATE
  USING (
    organization_id = current_setting('app.org_id', true)::uuid
    AND current_setting('app.user_role', true) IN ('admin', 'compliance')
  );

CREATE POLICY grades_delete ON grades
  FOR DELETE
  USING (
    organization_id = current_setting('app.org_id', true)::uuid
    AND current_setting('app.user_role', true) IN ('admin', 'compliance')
  );


-- ------------------------------------------------------------
-- bag_types
-- Same pattern as suppliers.
-- ------------------------------------------------------------
ALTER TABLE bag_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY bag_types_select ON bag_types
  FOR SELECT
  USING (organization_id = current_setting('app.org_id', true)::uuid);

CREATE POLICY bag_types_insert ON bag_types
  FOR INSERT
  WITH CHECK (
    organization_id = current_setting('app.org_id', true)::uuid
    AND current_setting('app.user_role', true) IN ('admin', 'compliance')
  );

CREATE POLICY bag_types_update ON bag_types
  FOR UPDATE
  USING (
    organization_id = current_setting('app.org_id', true)::uuid
    AND current_setting('app.user_role', true) IN ('admin', 'compliance')
  );

CREATE POLICY bag_types_delete ON bag_types
  FOR DELETE
  USING (
    organization_id = current_setting('app.org_id', true)::uuid
    AND current_setting('app.user_role', true) IN ('admin', 'compliance')
  );


-- ------------------------------------------------------------
-- lots
-- All roles can read. Writes restricted to admin/trader/warehouse.
-- ------------------------------------------------------------
ALTER TABLE lots ENABLE ROW LEVEL SECURITY;

CREATE POLICY lots_select ON lots
  FOR SELECT
  USING (organization_id = current_setting('app.org_id', true)::uuid);

CREATE POLICY lots_insert ON lots
  FOR INSERT
  WITH CHECK (
    organization_id = current_setting('app.org_id', true)::uuid
    AND current_setting('app.user_role', true) IN ('admin', 'trader', 'warehouse')
  );

CREATE POLICY lots_update ON lots
  FOR UPDATE
  USING (
    organization_id = current_setting('app.org_id', true)::uuid
    AND current_setting('app.user_role', true) IN ('admin', 'trader', 'warehouse')
  );

CREATE POLICY lots_delete ON lots
  FOR DELETE
  USING (
    organization_id = current_setting('app.org_id', true)::uuid
    AND current_setting('app.user_role', true) = 'admin'
  );


-- ------------------------------------------------------------
-- auction_procurements
-- Reads: all org members. Writes: admin/trader.
-- ------------------------------------------------------------
ALTER TABLE auction_procurements ENABLE ROW LEVEL SECURITY;

CREATE POLICY auction_procurements_select ON auction_procurements
  FOR SELECT
  USING (organization_id = current_setting('app.org_id', true)::uuid);

CREATE POLICY auction_procurements_insert ON auction_procurements
  FOR INSERT
  WITH CHECK (
    organization_id = current_setting('app.org_id', true)::uuid
    AND current_setting('app.user_role', true) IN ('admin', 'trader')
  );

CREATE POLICY auction_procurements_update ON auction_procurements
  FOR UPDATE
  USING (
    organization_id = current_setting('app.org_id', true)::uuid
    AND current_setting('app.user_role', true) IN ('admin', 'trader')
  );


-- ------------------------------------------------------------
-- direct_agreements
-- Same as auction_procurements.
-- ------------------------------------------------------------
ALTER TABLE direct_agreements ENABLE ROW LEVEL SECURITY;

CREATE POLICY direct_agreements_select ON direct_agreements
  FOR SELECT
  USING (organization_id = current_setting('app.org_id', true)::uuid);

CREATE POLICY direct_agreements_insert ON direct_agreements
  FOR INSERT
  WITH CHECK (
    organization_id = current_setting('app.org_id', true)::uuid
    AND current_setting('app.user_role', true) IN ('admin', 'trader')
  );

CREATE POLICY direct_agreements_update ON direct_agreements
  FOR UPDATE
  USING (
    organization_id = current_setting('app.org_id', true)::uuid
    AND current_setting('app.user_role', true) IN ('admin', 'trader')
  );


-- ------------------------------------------------------------
-- direct_deliveries
-- Same as auction_procurements.
-- ------------------------------------------------------------
ALTER TABLE direct_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY direct_deliveries_select ON direct_deliveries
  FOR SELECT
  USING (organization_id = current_setting('app.org_id', true)::uuid);

CREATE POLICY direct_deliveries_insert ON direct_deliveries
  FOR INSERT
  WITH CHECK (
    organization_id = current_setting('app.org_id', true)::uuid
    AND current_setting('app.user_role', true) IN ('admin', 'trader')
  );

CREATE POLICY direct_deliveries_update ON direct_deliveries
  FOR UPDATE
  USING (
    organization_id = current_setting('app.org_id', true)::uuid
    AND current_setting('app.user_role', true) IN ('admin', 'trader')
  );


-- ------------------------------------------------------------
-- contracts
-- Reads: admin/trader/finance/compliance. Writes: admin/trader.
-- ------------------------------------------------------------
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY contracts_select ON contracts
  FOR SELECT
  USING (organization_id = current_setting('app.org_id', true)::uuid);

CREATE POLICY contracts_insert ON contracts
  FOR INSERT
  WITH CHECK (
    organization_id = current_setting('app.org_id', true)::uuid
    AND current_setting('app.user_role', true) IN ('admin', 'trader')
  );

CREATE POLICY contracts_update ON contracts
  FOR UPDATE
  USING (
    organization_id = current_setting('app.org_id', true)::uuid
    AND current_setting('app.user_role', true) IN ('admin', 'trader')
  );


-- ------------------------------------------------------------
-- shipments
-- Reads: all org members. Writes: admin/trader/warehouse.
-- ------------------------------------------------------------
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;

CREATE POLICY shipments_select ON shipments
  FOR SELECT
  USING (organization_id = current_setting('app.org_id', true)::uuid);

CREATE POLICY shipments_insert ON shipments
  FOR INSERT
  WITH CHECK (
    organization_id = current_setting('app.org_id', true)::uuid
    AND current_setting('app.user_role', true) IN ('admin', 'trader', 'warehouse')
  );

CREATE POLICY shipments_update ON shipments
  FOR UPDATE
  USING (
    organization_id = current_setting('app.org_id', true)::uuid
    AND current_setting('app.user_role', true) IN ('admin', 'trader', 'warehouse')
  );


-- ------------------------------------------------------------
-- allocations
-- Reads: all org members. Writes: admin/trader.
-- ------------------------------------------------------------
ALTER TABLE allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY allocations_select ON allocations
  FOR SELECT
  USING (organization_id = current_setting('app.org_id', true)::uuid);

CREATE POLICY allocations_insert ON allocations
  FOR INSERT
  WITH CHECK (
    organization_id = current_setting('app.org_id', true)::uuid
    AND current_setting('app.user_role', true) IN ('admin', 'trader')
  );

CREATE POLICY allocations_update ON allocations
  FOR UPDATE
  USING (
    organization_id = current_setting('app.org_id', true)::uuid
    AND current_setting('app.user_role', true) IN ('admin', 'trader')
  );


-- ------------------------------------------------------------
-- shipment_documents
-- Reads: all org members. Writes: admin/trader/warehouse.
-- ------------------------------------------------------------
ALTER TABLE shipment_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY shipment_documents_select ON shipment_documents
  FOR SELECT
  USING (organization_id = current_setting('app.org_id', true)::uuid);

CREATE POLICY shipment_documents_insert ON shipment_documents
  FOR INSERT
  WITH CHECK (
    organization_id = current_setting('app.org_id', true)::uuid
    AND current_setting('app.user_role', true) IN ('admin', 'trader', 'warehouse')
  );


-- ------------------------------------------------------------
-- cost_entries
-- Reads and writes: admin/finance only.
-- ------------------------------------------------------------
ALTER TABLE cost_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY cost_entries_select ON cost_entries
  FOR SELECT
  USING (
    organization_id = current_setting('app.org_id', true)::uuid
    AND current_setting('app.user_role', true) IN ('admin', 'finance')
  );

CREATE POLICY cost_entries_insert ON cost_entries
  FOR INSERT
  WITH CHECK (
    organization_id = current_setting('app.org_id', true)::uuid
    AND current_setting('app.user_role', true) IN ('admin', 'finance')
  );

CREATE POLICY cost_entries_update ON cost_entries
  FOR UPDATE
  USING (
    organization_id = current_setting('app.org_id', true)::uuid
    AND current_setting('app.user_role', true) IN ('admin', 'finance')
  );


-- ------------------------------------------------------------
-- stock_adjustments
-- Reads: admin/warehouse/trader. Writes: admin/warehouse.
-- ------------------------------------------------------------
ALTER TABLE stock_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY stock_adjustments_select ON stock_adjustments
  FOR SELECT
  USING (
    organization_id = current_setting('app.org_id', true)::uuid
    AND current_setting('app.user_role', true) IN ('admin', 'warehouse', 'trader')
  );

CREATE POLICY stock_adjustments_insert ON stock_adjustments
  FOR INSERT
  WITH CHECK (
    organization_id = current_setting('app.org_id', true)::uuid
    AND current_setting('app.user_role', true) IN ('admin', 'warehouse')
  );


-- ============================================================
-- AUTH TABLES (scoped by user_id, no organization_id column)
-- ============================================================


-- ------------------------------------------------------------
-- user_sessions
-- Users can only see and manage their own sessions.
-- ------------------------------------------------------------
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_sessions_all ON user_sessions
  USING (user_id = current_setting('app.user_id', true)::uuid);


-- ------------------------------------------------------------
-- api_keys
-- Users can only see and manage their own API keys.
-- ------------------------------------------------------------
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY api_keys_all ON api_keys
  USING (user_id = current_setting('app.user_id', true)::uuid);


-- ============================================================
-- PLATFORM TABLES
-- Blocked entirely for regular app users.
-- Super-admin DB role uses BYPASSRLS — no policies needed there.
-- Regular app DB role must NOT have BYPASSRLS.
-- ============================================================

ALTER TABLE organizations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE super_admins        ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_notes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE impersonation_logs  ENABLE ROW LEVEL SECURITY;

-- No policies created → default-deny for the app DB role.
-- Super-admin API connects with a separate DB role that has BYPASSRLS.


-- ============================================================
-- PHASE 1 SAFETY: grant BYPASSRLS to app role so nothing breaks
-- yet. Remove this once context injection is deployed and tested.
-- Replace 'app_user' with your actual application DB role name.
-- ============================================================
-- ALTER ROLE app_user BYPASSRLS;

-- DropForeignKey
ALTER TABLE "impersonation_logs" DROP CONSTRAINT "impersonation_logs_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "impersonation_logs" DROP CONSTRAINT "impersonation_logs_super_admin_id_fkey";

-- DropForeignKey
ALTER TABLE "org_notes" DROP CONSTRAINT "org_notes_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "org_notes" DROP CONSTRAINT "org_notes_super_admin_id_fkey";

-- DropForeignKey
ALTER TABLE "subscriptions" DROP CONSTRAINT "subscriptions_organization_id_fkey";

-- AddForeignKey
ALTER TABLE "org_notes" ADD CONSTRAINT "org_notes_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_notes" ADD CONSTRAINT "org_notes_super_admin_id_fkey" FOREIGN KEY ("super_admin_id") REFERENCES "super_admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "impersonation_logs" ADD CONSTRAINT "impersonation_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "impersonation_logs" ADD CONSTRAINT "impersonation_logs_super_admin_id_fkey" FOREIGN KEY ("super_admin_id") REFERENCES "super_admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

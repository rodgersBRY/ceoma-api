import emailjs from "@emailjs/nodejs";

import { logger } from "../../common/logger.js";
import { env } from "../../config/env.js";
import { query } from "../../db/pool.js";
import {
  ApiKeyExpiryAlertPayload,
  ContractCreatedNotificationPayload,
  ContractFullyAllocatedNotificationPayload,
  ContractRiskAlertPayload,
  DocumentsReadyNotificationPayload,
  NotificationEmailMessage,
  NotificationRecipientRoles,
  ShipmentCreatedNotificationPayload,
  ShipmentStatus,
  ShipmentStatusNotificationPayload,
  StockAdjustedNotificationPayload,
} from "./notifications.types.js";
import { apiKeyExpiringTemplate } from "./templates/api-key-expiring.js";
import { contractCreatedTemplate } from "./templates/contract-created.js";
import { contractFullyAllocatedTemplate } from "./templates/contract-fully-allocated.js";
import { contractRiskTemplate } from "./templates/contract-risk-alert.js";
import { documentsReadyTemplate } from "./templates/documents-ready.js";
import { shipmentCreatedTemplate } from "./templates/shipment-created.js";
import { shipmentStatusTemplate } from "./templates/shipment-status.js";
import { stockAdjustedTemplate } from "./templates/stock-adjusted.js";

const statusRecipients: Partial<Record<ShipmentStatus, NotificationRecipientRoles>> = {
  stuffed: ["admin", "warehouse"],
  cleared: ["admin", "finance", "compliance"],
  on_vessel: ["admin", "trader"],
  completed: ["admin", "finance"],
};

export class NotificationService {
  private readonly adminEmails: string[];

  constructor() {
    this.adminEmails = env.notificationAdminEmails;

    if (env.emailjsPublicKey) {
      emailjs.init({
        publicKey: env.emailjsPublicKey,
        privateKey: env.emailjsPrivateKey,
      });
    }

    if (!this.isEmailConfigured()) {
      logger.warn("Notification email is disabled due to missing configuration", {
        has_service_id: Boolean(env.emailjsServiceId),
        has_template_id: Boolean(env.emailjsTemplateId),
        has_public_key: Boolean(env.emailjsPublicKey),
        admin_email_count: this.adminEmails.length,
      });
    }
  }

  private isEmailConfigured(): boolean {
    return Boolean(env.emailjsServiceId && env.emailjsTemplateId && env.emailjsPublicKey);
  }

  private async findUsersByRoles(roles: NotificationRecipientRoles): Promise<string[]> {
    if (roles.length === 0) {
      return [];
    }

    const result = await query<{ email: string }>(
      `
      SELECT email
      FROM users
      WHERE is_active = TRUE
        AND role::text = ANY($1::text[])
      `,
      [roles],
    );

    return result.rows
      .map((row) => row.email.trim().toLowerCase())
      .filter((email) => email.length > 0);
  }

  private uniqueRecipients(...groups: Array<string[] | undefined>): string[] {
    const deduped = new Set<string>();

    for (const group of groups) {
      if (!group) {
        continue;
      }

      for (const email of group) {
        const normalized = email.trim().toLowerCase();
        if (normalized.length > 0) {
          deduped.add(normalized);
        }
      }
    }

    return Array.from(deduped);
  }

  private async sendEmail(
    event: string,
    message: NotificationEmailMessage,
  ): Promise<"sent" | "skipped_config" | "skipped_no_recipients" | "failed"> {
    if (!this.isEmailConfigured()) {
      logger.warn("Notification skipped: provider not configured", {
        event,
        subject: message.subject,
      });
      return "skipped_config";
    }

    if (message.to.length === 0) {
      logger.warn("Notification skipped: no recipients resolved", {
        event,
        subject: message.subject,
      });
      return "skipped_no_recipients";
    }

    try {
      await Promise.all(
        message.to.map((recipient) =>
          emailjs.send(env.emailjsServiceId!, env.emailjsTemplateId!, {
            to_email: recipient,
            subject: message.subject,
            html_content: message.html,
          }),
        ),
      );

      logger.info("Notification email dispatched", {
        event,
        subject: message.subject,
        recipients_count: message.to.length,
      });
      return "sent";
    } catch (error) {
      logger.error("Notification email dispatch failed", {
        event,
        subject: message.subject,
        recipients: message.to,
        error,
      });
      return "failed";
    }
  }

  private async notifyByRoles(params: {
    event: string;
    roles: NotificationRecipientRoles;
    subject: string;
    html: string;
    extraRecipients?: string[];
  }): Promise<void> {
    try {
      const roleRecipients = await this.findUsersByRoles(params.roles);
      const recipients = this.uniqueRecipients(this.adminEmails, roleRecipients, params.extraRecipients);
      const result = await this.sendEmail(params.event, {
        to: recipients,
        subject: params.subject,
        html: params.html,
      });
      if (result !== "sent") {
        logger.warn("Notification processing completed without successful send", {
          event: params.event,
          status: result,
          roles: params.roles,
          recipients_count: recipients.length,
          subject: params.subject,
        });
      }
    } catch (error) {
      logger.error("Notification recipient resolution failed", {
        event: params.event,
        subject: params.subject,
        roles: params.roles,
        error,
      });
    }
  }

  async notifyShipmentCreated(payload: ShipmentCreatedNotificationPayload): Promise<void> {
    await this.notifyByRoles({
      event: "shipment_created",
      roles: ["admin", "trader"],
      subject: `Shipment ${payload.shipmentNumber} planned`,
      html: shipmentCreatedTemplate(payload),
    });
  }

  async notifyShipmentStatusChanged(payload: ShipmentStatusNotificationPayload): Promise<void> {
    const roles = statusRecipients[payload.newStatus];
    if (!roles) {
      logger.debug("Notification skipped: shipment status has no notification rule", {
        event: "shipment_status_changed",
        status: payload.newStatus,
      });
      return;
    }

    await this.notifyByRoles({
      event: "shipment_status_changed",
      roles,
      subject: `Shipment ${payload.shipmentNumber} is now ${payload.newStatus}`,
      html: shipmentStatusTemplate(payload),
    });
  }

  async notifyDocumentsReady(payload: DocumentsReadyNotificationPayload): Promise<void> {
    await this.notifyByRoles({
      event: "shipment_documents_ready",
      roles: ["admin", "compliance"],
      subject: `Documents ready for shipment ${payload.shipmentNumber}`,
      html: documentsReadyTemplate(payload),
    });
  }

  async notifyContractCreated(payload: ContractCreatedNotificationPayload): Promise<void> {
    await this.notifyByRoles({
      event: "contract_created",
      roles: ["admin", "trader"],
      subject: `New contract ${payload.contractNumber} created`,
      html: contractCreatedTemplate(payload),
    });
  }

  async notifyContractFullyAllocated(payload: ContractFullyAllocatedNotificationPayload): Promise<void> {
    await this.notifyByRoles({
      event: "contract_fully_allocated",
      roles: ["admin", "trader"],
      subject: `Contract ${payload.contractNumber} fully allocated`,
      html: contractFullyAllocatedTemplate(payload),
    });
  }

  async notifyStockAdjusted(payload: StockAdjustedNotificationPayload): Promise<void> {
    await this.notifyByRoles({
      event: "stock_adjusted",
      roles: ["admin", "warehouse"],
      subject: `Stock adjustment on lot ${payload.lotCode}`,
      html: stockAdjustedTemplate(payload),
    });
  }

  async notifyContractRiskAlert(payload: ContractRiskAlertPayload): Promise<void> {
    await this.notifyByRoles({
      event: "contract_risk_alert",
      roles: ["admin", "trader"],
      subject: `Risk alert: contract ${payload.contractNumber} has ${Math.round(payload.unallocatedKg)} kg unallocated`,
      html: contractRiskTemplate(payload),
    });
  }

  async notifyApiKeyExpiring(payload: ApiKeyExpiryAlertPayload): Promise<void> {
    await this.notifyByRoles({
      event: "api_key_expiring",
      roles: ["admin"],
      extraRecipients: [payload.ownerEmail],
      subject: `API key ${payload.keyName} expires in ${payload.daysToExpiry} day(s)`,
      html: apiKeyExpiringTemplate(payload),
    });
  }
}

export const notificationsService = new NotificationService();

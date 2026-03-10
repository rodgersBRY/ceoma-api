import { UserRole } from "../../types/auth.js";

export type ShipmentStatus = "planned" | "stuffed" | "cleared" | "on_vessel" | "completed";

export type NotificationContext = {
  organizationId: string;
};

export type ShipmentCreatedNotificationPayload = NotificationContext & {
  shipmentNumber: string;
  contractNumber: string;
  lotCodes: string[];
};

export type ShipmentStatusNotificationPayload = NotificationContext & {
  shipmentNumber: string;
  contractNumber: string;
  newStatus: ShipmentStatus;
  actualDeparture?: string | null;
};

export type DocumentsReadyNotificationPayload = NotificationContext & {
  shipmentNumber: string;
  contractNumber: string;
  buyerName: string;
  docTypes: string[];
};

export type ContractCreatedNotificationPayload = NotificationContext & {
  contractNumber: string;
  buyerName: string;
  quantityKg: number;
  shipmentWindowStart: string;
  shipmentWindowEnd: string;
};

export type ContractFullyAllocatedNotificationPayload = NotificationContext & {
  contractNumber: string;
  allocatedKg: number;
};

export type StockAdjustedNotificationPayload = NotificationContext & {
  lotCode: string;
  adjustmentKg: number;
  reason: string;
  approvedBy: string;
};

export type ContractRiskAlertPayload = NotificationContext & {
  contractNumber: string;
  daysToWindowClose: number;
  unallocatedKg: number;
};

export type ApiKeyExpiryAlertPayload = NotificationContext & {
  keyName: string;
  keyPrefix: string;
  expiresAt: Date;
  daysToExpiry: number;
  ownerEmail: string;
};

export type NotificationEmailMessage = {
  to: string[];
  subject: string;
  html: string;
};

export type NotificationRecipientRoles = UserRole[];

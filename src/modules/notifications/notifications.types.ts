import { UserRole } from "../../types/auth.js";

export type ShipmentStatus = "planned" | "stuffed" | "cleared" | "on_vessel" | "completed";

export type ShipmentCreatedNotificationPayload = {
  shipmentNumber: string;
  contractNumber: string;
  lotCodes: string[];
};

export type ShipmentStatusNotificationPayload = {
  shipmentNumber: string;
  contractNumber: string;
  newStatus: ShipmentStatus;
  actualDeparture?: string | null;
};

export type DocumentsReadyNotificationPayload = {
  shipmentNumber: string;
  contractNumber: string;
  buyerName: string;
  docTypes: string[];
};

export type ContractCreatedNotificationPayload = {
  contractNumber: string;
  buyerName: string;
  quantityKg: number;
  shipmentWindowStart: string;
  shipmentWindowEnd: string;
};

export type ContractFullyAllocatedNotificationPayload = {
  contractNumber: string;
  allocatedKg: number;
};

export type StockAdjustedNotificationPayload = {
  lotCode: string;
  adjustmentKg: number;
  reason: string;
  approvedBy: string;
};

export type ContractRiskAlertPayload = {
  contractNumber: string;
  daysToWindowClose: number;
  unallocatedKg: number;
};

export type ApiKeyExpiryAlertPayload = {
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

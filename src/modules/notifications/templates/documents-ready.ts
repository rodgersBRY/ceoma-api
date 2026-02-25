import { DocumentsReadyNotificationPayload } from "../notifications.types.js";
import { renderTemplate } from "./shared.js";

export function documentsReadyTemplate(payload: DocumentsReadyNotificationPayload): string {
  return renderTemplate("Shipment Documents Ready", "Shipment export documents were generated.", [
    { label: "Shipment", value: payload.shipmentNumber },
    { label: "Contract", value: payload.contractNumber },
    { label: "Buyer", value: payload.buyerName },
    { label: "Documents", value: payload.docTypes.join(", ") },
  ]);
}

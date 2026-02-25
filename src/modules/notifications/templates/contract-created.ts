import { ContractCreatedNotificationPayload } from "../notifications.types.js";
import { formatDateOnly, renderTemplate } from "./shared.js";

export function contractCreatedTemplate(payload: ContractCreatedNotificationPayload): string {
  return renderTemplate("Contract Created", "A new sales contract was created.", [
    { label: "Contract", value: payload.contractNumber },
    { label: "Buyer", value: payload.buyerName },
    { label: "Quantity (kg)", value: String(Math.round(payload.quantityKg)) },
    {
      label: "Shipment Window",
      value: `${formatDateOnly(payload.shipmentWindowStart)} to ${formatDateOnly(payload.shipmentWindowEnd)}`,
    },
  ]);
}

import { ShipmentStatusNotificationPayload } from "../notifications.types.js";
import { formatDateOnly, renderTemplate } from "./shared.js";

export function shipmentStatusTemplate(payload: ShipmentStatusNotificationPayload): string {
  return renderTemplate("Shipment Status Updated", "Shipment stage changed.", [
    { label: "Shipment", value: payload.shipmentNumber },
    { label: "Contract", value: payload.contractNumber },
    { label: "New Status", value: payload.newStatus },
    { label: "Actual Departure", value: formatDateOnly(payload.actualDeparture) },
  ]);
}

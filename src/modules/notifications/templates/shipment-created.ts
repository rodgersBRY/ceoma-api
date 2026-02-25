import { ShipmentCreatedNotificationPayload } from "../notifications.types.js";
import { renderTemplate } from "./shared.js";

export function shipmentCreatedTemplate(payload: ShipmentCreatedNotificationPayload): string {
  return renderTemplate("Shipment Planned", "A new shipment has been created.", [
    { label: "Shipment", value: payload.shipmentNumber },
    { label: "Contract", value: payload.contractNumber },
    {
      label: "Lots",
      value: payload.lotCodes.length > 0 ? payload.lotCodes.join(", ") : "N/A",
    },
  ]);
}

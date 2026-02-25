import { StockAdjustedNotificationPayload } from "../notifications.types.js";
import { renderTemplate } from "./shared.js";

export function stockAdjustedTemplate(payload: StockAdjustedNotificationPayload): string {
  return renderTemplate("Stock Adjustment Recorded", "A lot quantity was adjusted.", [
    { label: "Lot", value: payload.lotCode },
    { label: "Adjustment (kg)", value: String(Math.round(payload.adjustmentKg)) },
    { label: "Reason", value: payload.reason },
    { label: "Approved By", value: payload.approvedBy },
  ]);
}

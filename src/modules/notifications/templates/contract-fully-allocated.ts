import { ContractFullyAllocatedNotificationPayload } from "../notifications.types.js";
import { renderTemplate } from "./shared.js";

export function contractFullyAllocatedTemplate(
  payload: ContractFullyAllocatedNotificationPayload,
): string {
  return renderTemplate("Contract Fully Allocated", "All required quantity is now allocated.", [
    { label: "Contract", value: payload.contractNumber },
    { label: "Allocated (kg)", value: String(Math.round(payload.allocatedKg)) },
  ]);
}

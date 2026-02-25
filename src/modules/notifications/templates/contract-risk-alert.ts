import { ContractRiskAlertPayload } from "../notifications.types.js";
import { renderTemplate } from "./shared.js";

export function contractRiskTemplate(payload: ContractRiskAlertPayload): string {
  return renderTemplate(
    "Contract Risk Alert",
    "A contract has unallocated quantity near shipment window close.",
    [
      { label: "Contract", value: payload.contractNumber },
      { label: "Unallocated (kg)", value: String(Math.round(payload.unallocatedKg)) },
      { label: "Days to Window Close", value: String(payload.daysToWindowClose) },
    ],
  );
}

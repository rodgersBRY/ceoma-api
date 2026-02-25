import { ApiKeyExpiryAlertPayload } from "../notifications.types.js";
import { formatDateOnly, renderTemplate } from "./shared.js";

export function apiKeyExpiringTemplate(payload: ApiKeyExpiryAlertPayload): string {
  return renderTemplate("API Key Expiry Alert", "An active API key is close to expiry.", [
    { label: "Key Name", value: payload.keyName },
    { label: "Key Prefix", value: payload.keyPrefix },
    { label: "Owner", value: payload.ownerEmail },
    { label: "Expires On", value: formatDateOnly(payload.expiresAt) },
    { label: "Days to Expiry", value: String(payload.daysToExpiry) },
  ]);
}

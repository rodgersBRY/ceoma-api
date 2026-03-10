# Notifications Module

## Purpose

Sends operational email notifications after successful business actions and runs scheduled alert checks.

## Structure

- `notifications.service.ts`
- `notifications.types.ts`
- `notifications.cron.ts`
- `templates/`

## Triggered Notifications

- Shipment created
- Shipment status updated (`stuffed`, `cleared`, `on_vessel`, `completed`)
- Shipment documents generated
- Contract created
- Contract fully allocated
- Stock adjustment recorded
- Contract risk alerts (daily cron)
- API key nearing expiry (daily cron)

## Configuration Notes

- Notifications are email-only.
- Email provider uses EmailJS (`@emailjs/nodejs`).
- Notification dispatch is called after transactional writes complete, avoiding phantom alerts.
- Cron jobs are enabled/disabled via env config and run in configured timezone.
- Recipients are resolved per organization (active users by role), with optional global system recipients via `NOTIFICATION_ADMIN_EMAILS`.

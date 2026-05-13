# MVP Guardrails

## Product Goal

Build a safe, simple, working assisted mobility platform for Jom Makcik CareRide.

This is a controlled assisted mobility platform, not open e-hailing. Admin oversight is required for sensitive actions, rider approval, payment verification, assignment, monitoring, and care reports.

## Visual Direction

The supplied mockup is visual direction only, not final implementation code.

Final apps should follow a clean, simple, card-based layout:

- Purple and pink Jom Makcik branding
- Clear status badges
- Simple booking forms
- Simple rider job offer cards
- Simple admin dashboard cards
- Mobile-first Android app screens
- Web dashboard with sidebar and monitoring tables

When backend data is unavailable, screens must show empty states instead of fake dashboard data or fake charts.

## Booking Statuses

Allowed statuses:

- `DRAFT`
- `QUOTED`
- `PAYMENT_PENDING`
- `PAID`
- `MATCHING`
- `ASSIGNED`
- `IN_PROGRESS`
- `COMPLETED`
- `CANCELLED`
- `SLA_FAILED`
- `REFUND_PENDING`
- `REFUNDED`

Allowed transitions:

- `DRAFT -> QUOTED`
- `QUOTED -> PAYMENT_PENDING`
- `PAYMENT_PENDING -> PAID`
- `PAID -> MATCHING`
- `MATCHING -> ASSIGNED`
- `MATCHING -> SLA_FAILED`
- `ASSIGNED -> IN_PROGRESS`
- `IN_PROGRESS -> COMPLETED`
- `ASSIGNED -> CANCELLED`
- `PAID -> REFUND_PENDING`
- `SLA_FAILED -> REFUND_PENDING`
- `REFUND_PENDING -> REFUNDED`

Forbidden examples:

- `DRAFT -> COMPLETED`
- `QUOTED -> COMPLETED`
- `PAYMENT_PENDING -> COMPLETED`
- `PAID -> COMPLETED`
- `MATCHING -> COMPLETED`
- `CANCELLED -> COMPLETED`
- `REFUNDED -> COMPLETED`

Booking status validation must be enforced by the backend, not only by frontend screens.

## Security Rules

- Do not bypass authentication.
- Do not hardcode secret keys.
- Do not expose API keys in frontend code.
- Do not skip validation.
- Do not allow passengers, riders, or admins to access each other's protected data.
- All admin-sensitive actions must be protected by admin role permission.
- All payment verification must require admin approval in the MVP.
- All rider accounts must require admin approval before receiving jobs.
- All chat messages must be stored in the database for admin monitoring.
- All important actions must be logged.

## Development Process

Work one phase and one small task at a time. After each task, stop and report before continuing.

# Booking State Machine

The backend booking state machine controls every booking status change. Future code must use this validation instead of directly updating booking status.

## Approved Booking Statuses

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

## Allowed Transitions

| From | To |
| --- | --- |
| `DRAFT` | `QUOTED` |
| `QUOTED` | `PAYMENT_PENDING` |
| `PAYMENT_PENDING` | `PAID` |
| `PAID` | `MATCHING` |
| `MATCHING` | `ASSIGNED` |
| `MATCHING` | `SLA_FAILED` |
| `ASSIGNED` | `IN_PROGRESS` |
| `IN_PROGRESS` | `COMPLETED` |
| `ASSIGNED` | `CANCELLED` |
| `PAID` | `REFUND_PENDING` |
| `SLA_FAILED` | `REFUND_PENDING` |
| `REFUND_PENDING` | `REFUNDED` |

## Forbidden Examples

- `DRAFT -> COMPLETED`
- `PAID -> COMPLETED`
- `MATCHING -> COMPLETED`
- `CANCELLED -> COMPLETED`
- `REFUNDED -> COMPLETED`

## Why This Matters

The state machine protects the platform from unsafe or confusing status changes. For example, a booking cannot become completed before payment, matching, rider assignment, and trip progress.

## Maintenance Warning

Any future function that changes booking status must use the backend state machine validation.

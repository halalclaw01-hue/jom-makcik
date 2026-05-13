# Testing Checklist

Use this checklist after repairs or updates.

## A. Authentication Test

- Passenger can register.
- Rider can register.
- Admin can login.
- Wrong password is rejected.
- User cannot access another role page.

## B. Passenger Flow Test

- Create booking.
- Confirm quote.
- Upload payment proof.
- View booking status.
- Use chat.

## C. Admin Flow Test

- View booking.
- Approve payment.
- Approve rider.
- Start matching.
- Assign rider.
- Monitor chat.

## D. Rider Flow Test

- Login.
- Set available.
- View job offer.
- Accept job.
- Update trip status.
- Submit care report.

## E. Booking State Machine Test

- Valid transitions work.
- Invalid transitions are blocked.
- `booking_status_history` is written.
- `audit_logs` is written for important status changes.

## F. Security Test

- Passenger cannot view other passenger booking.
- Rider cannot access unassigned booking.
- Non-admin cannot approve payment.
- Non-admin cannot approve rider.
- Non-admin cannot view audit logs.
- Non-admin cannot view all bookings.

## Useful Backend Test Commands

From `/backend`:

```bash
npm run check
npm run test:mvp
npm run test:booking-status
npm run test:audit-logs
```

## Maintenance Warning

Run tests after changing backend rules, role permissions, matching, payment, booking status, chat, or care reports.

# Jom Makcik CareRide - System Overview

## What The System Is

Jom Makcik CareRide is a controlled assisted mobility MVP. It is not open e-hailing. The platform is designed for safer assisted transport where admin oversight is required for sensitive actions such as rider approval, payment verification, matching, cancellation, refunds, and monitoring.

## Passenger App Purpose

The Passenger Android App, **Jom Makcik CareRide**, allows passengers to:

- Register and login.
- Create bookings.
- View their own bookings.
- Submit manual payment proof.
- Chat for their own booking.
- View care reports when available.

## Rider App Purpose

The Rider Android App, **Jom Makcik Rider**, allows riders to:

- Register and login.
- View their profile.
- Set availability after approval.
- View controlled job offers.
- Accept or reject job offers.
- Update assigned trip progress.
- Chat for assigned bookings.
- Submit care reports after completed trips.

## Admin Android App Purpose

The Admin Android App, **Jom Makcik Admin**, is a light urgent-monitoring app. It helps admins handle important actions from a phone, such as:

- View bookings.
- Verify payment proof.
- Approve or reject riders.
- Start matching.
- Assign riders.
- Monitor chat.
- View alerts.

## Admin Web Dashboard Purpose

The Admin Web Dashboard, **Jom Makcik Control Centre**, is the main admin workspace. It is used for:

- Booking management.
- Payment verification.
- Rider management.
- Matching control.
- Chat monitoring.
- Care report review.
- Reports.
- Audit logs.

## Backend Purpose

The backend API controls the system rules. It handles:

- Authentication.
- Role protection.
- Booking creation and status updates.
- Payment proof verification.
- Rider approval and eligibility.
- Matching and assignment.
- Trip events.
- Chat storage.
- Care reports.
- Reports.
- Audit logs.

## Database Purpose

The SQLite database is the local MVP source of truth. It stores users, bookings, rider profiles, payment proofs, job offers, trip events, chat messages, care reports, and audit logs.

## Main Booking Flow

1. Passenger creates a booking.
2. Booking starts as `QUOTED` or `DRAFT`.
3. Passenger confirms booking.
4. Booking becomes `PAYMENT_PENDING`.
5. Passenger submits payment proof.
6. Admin approves payment proof.
7. Booking becomes `PAID`.
8. Admin starts matching.
9. Booking becomes `MATCHING`.
10. Rider accepts job offer.
11. Booking becomes `ASSIGNED`.
12. Rider starts trip.
13. Booking becomes `IN_PROGRESS`.
14. Rider completes trip.
15. Booking becomes `COMPLETED`.
16. Rider submits care report.

## Main Admin Control Flow

Admin controls risky actions:

- Approve or reject riders.
- Approve or reject payment proofs.
- Start matching only after payment is approved.
- Manually assign riders when needed.
- Cancel bookings where allowed.
- Mark refund pending where allowed.
- Monitor booking chat.
- View reports and audit logs.

## Important Safety Principles

- The database is the source of truth.
- Admin controls risky actions.
- Riders must be approved before receiving jobs.
- Payment proof must be verified before matching.
- Booking status must follow the backend state machine.
- Role protection must happen in the backend, not only in the frontend.
- Important actions must be written to audit logs.

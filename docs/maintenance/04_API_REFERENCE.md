# Backend API Reference

This file lists the known MVP backend APIs. If an API is not available in the MVP, it is marked as: `Not implemented yet / future phase.`

## Authentication APIs

### POST `/auth/login`

Method: `POST`

Endpoint: `/auth/login`

Who can access: Public

Purpose: Login user and return token plus user role.

Input: `identifier`, `password`

Output: Auth token and public user data.

Important rules:

- Must not return password hash.
- Must reject suspended or rejected accounts.
- Failed login attempts are audit logged.

Maintenance warning:

Do not bypass password hashing or token validation.

### POST `/auth/register/passenger`

Method: `POST`

Endpoint: `/auth/register/passenger`

Who can access: Public

Purpose: Register a passenger account.

Input: Passenger name, phone, email, password, emergency contact.

Output: Auth token and passenger user data.

Important rules:

- Phone and email must be unique.
- Password must be hashed.

Maintenance warning:

Do not allow passenger registration to create admin or rider roles.

### POST `/auth/register/rider`

Method: `POST`

Endpoint: `/auth/register/rider`

Who can access: Public

Purpose: Register a rider account pending approval.

Input: Rider name, phone, email, password, IC number, license number, vehicle model, vehicle plate.

Output: Auth token and rider user data.

Important rules:

- Rider starts pending approval.
- Rider cannot receive jobs until admin approval and eligibility checks pass.

Maintenance warning:

Do not auto-approve rider accounts.

### GET `/auth/me`

Method: `GET`

Endpoint: `/auth/me`

Who can access: Authenticated users.

Purpose: Return current logged-in user.

Input: Bearer token.

Output: Public user data.

Important rules:

- Token must be valid.

Maintenance warning:

Never expose password hashes.

## Passenger APIs

### POST `/passenger/bookings`

Method: `POST`

Endpoint: `/passenger/bookings`

Who can access: Passenger

Purpose: Create a booking.

Input: Passenger category, service type, pickup, destination, pickup date/time, optional notes.

Output: Booking and MVP fare quote.

Important rules:

- Booking can only be created as `DRAFT` or `QUOTED`.
- MVP fare quote is simple placeholder logic.

Maintenance warning:

Do not create bookings for another passenger from this route.

### GET `/passenger/bookings`

Method: `GET`

Endpoint: `/passenger/bookings`

Who can access: Passenger

Purpose: List passenger's own bookings.

Input: Bearer token.

Output: Own booking list.

Important rules:

- Passenger only sees own bookings.

Maintenance warning:

Do not return all bookings here.

### GET `/passenger/bookings/:id`

Method: `GET`

Endpoint: `/passenger/bookings/:id`

Who can access: Passenger

Purpose: View own booking detail.

Input: Booking ID.

Output: Booking detail.

Important rules:

- Return not found if booking does not belong to passenger.

Maintenance warning:

Do not reveal another passenger booking.

### POST `/passenger/bookings/:id/confirm`

Method: `POST`

Endpoint: `/passenger/bookings/:id/confirm`

Who can access: Passenger

Purpose: Confirm quoted booking and move to payment pending.

Input: Booking ID.

Output: Updated booking.

Important rules:

- Uses backend state machine.
- `QUOTED -> PAYMENT_PENDING`.

Maintenance warning:

Do not confirm bookings by directly editing database status.

### POST `/passenger/bookings/:id/payment-proof`

Method: `POST`

Endpoint: `/passenger/bookings/:id/payment-proof`

Who can access: Passenger

Purpose: Submit manual payment proof reference.

Input: Amount and proof reference.

Output: Payment proof record.

Important rules:

- Booking must be `PAYMENT_PENDING`.
- Proof starts as pending.

Maintenance warning:

Do not mark payment as approved from passenger route.

### GET `/passenger/bookings/:id/care-report`

Method: `GET`

Endpoint: `/passenger/bookings/:id/care-report`

Who can access: Passenger

Purpose: View care report for own booking.

Input: Booking ID.

Output: Care report.

Important rules:

- Passenger can only view own booking care report.

Maintenance warning:

Do not expose other passenger care reports.

## Rider APIs

### GET `/rider/me`

Method: `GET`

Endpoint: `/rider/me`

Who can access: Rider

Purpose: View own rider profile.

Input: Bearer token.

Output: Rider profile.

Important rules:

- Rider can only view own profile.

Maintenance warning:

Do not expose other rider profiles here.

### POST `/rider/availability`

Method: `POST`

Endpoint: `/rider/availability`

Who can access: Rider

Purpose: Set rider availability.

Input: `availabilityStatus`

Output: Updated rider profile.

Important rules:

- Rider must be approved and active.

Maintenance warning:

Do not allow pending or suspended rider to become available.

### GET `/rider/job-offers`

Method: `GET`

Endpoint: `/rider/job-offers`

Who can access: Rider

Purpose: List active controlled job offers for rider.

Input: Bearer token.

Output: Job offers.

Important rules:

- Rider sees own pending offers only.

Maintenance warning:

Do not show offers for other riders.

### POST `/rider/job-offers/:id/accept`

Method: `POST`

Endpoint: `/rider/job-offers/:id/accept`

Who can access: Rider

Purpose: Accept a controlled job offer.

Input: Offer ID.

Output: Accepted offer and assigned booking.

Important rules:

- Rider must be eligible.
- Booking must still be `MATCHING`.
- Other offers for booking are closed.

Maintenance warning:

Never allow two riders to accept the same booking.

### POST `/rider/job-offers/:id/reject`

Method: `POST`

Endpoint: `/rider/job-offers/:id/reject`

Who can access: Rider

Purpose: Reject a job offer.

Input: Offer ID.

Output: Rejected offer.

Important rules:

- Rider can only reject own active offer.

Maintenance warning:

Do not change booking status unless required by approved rules.

### GET `/rider/bookings/assigned`

Method: `GET`

Endpoint: `/rider/bookings/assigned`

Who can access: Rider

Purpose: List rider's assigned active trips.

Input: Bearer token.

Output: Assigned trips.

Important rules:

- Rider sees own assigned or in-progress trips only.

Maintenance warning:

Do not expose other riders' assigned trips.

### GET `/rider/bookings/:id`

Method: `GET`

Endpoint: `/rider/bookings/:id`

Who can access: Rider

Purpose: View assigned trip detail.

Input: Booking ID.

Output: Booking and trip events.

Important rules:

- Rider must be assigned to booking.

Maintenance warning:

Return not found for unassigned bookings.

### POST `/rider/bookings/:id/events`

Method: `POST`

Endpoint: `/rider/bookings/:id/events`

Who can access: Rider

Purpose: Log trip event.

Input: Event type and optional note.

Output: Trip event.

Important rules:

- Event must match allowed trip stage.

Maintenance warning:

Do not allow event logging for unassigned booking.

### POST `/rider/bookings/:id/start-trip`

Method: `POST`

Endpoint: `/rider/bookings/:id/start-trip`

Who can access: Rider

Purpose: Start assigned trip.

Input: Booking ID.

Output: Updated booking and trip events.

Important rules:

- `ASSIGNED -> IN_PROGRESS`.

Maintenance warning:

Must use backend state machine.

### POST `/rider/bookings/:id/complete-trip`

Method: `POST`

Endpoint: `/rider/bookings/:id/complete-trip`

Who can access: Rider

Purpose: Complete trip.

Input: Booking ID.

Output: Updated booking and trip events.

Important rules:

- `IN_PROGRESS -> COMPLETED`.

Maintenance warning:

Do not complete trips that are not in progress.

### POST `/rider/bookings/:id/care-report`

Method: `POST`

Endpoint: `/rider/bookings/:id/care-report`

Who can access: Rider

Purpose: Submit care report after completed trip.

Input: Arrived safely, assistance, handover notes, medication/document notes, summary.

Output: Care report.

Important rules:

- Booking must be `COMPLETED`.
- Rider must be assigned rider.

Maintenance warning:

Do not allow care reports before trip completion.

## Admin APIs

### GET `/admin/bookings`

Method: `GET`

Endpoint: `/admin/bookings`

Who can access: Admin, Super Admin

Purpose: List all bookings with filters.

Input: Optional status, date, passenger, rider.

Output: Booking list.

Important rules:

- Admin-only route.

Maintenance warning:

Do not expose this to passenger or rider.

### GET `/admin/bookings/:id`

Method: `GET`

Endpoint: `/admin/bookings/:id`

Who can access: Admin, Super Admin

Purpose: View booking detail and status history.

Input: Booking ID.

Output: Booking detail and status history.

Important rules:

- Admin-only route.

Maintenance warning:

Keep status history visible for troubleshooting.

### POST `/admin/bookings/:id/start-matching`

Method: `POST`

Endpoint: `/admin/bookings/:id/start-matching`

Who can access: Admin, Super Admin

Purpose: Start controlled matching.

Input: Booking ID.

Output: Matching result.

Important rules:

- Booking must be `PAID`.
- Moves `PAID -> MATCHING`.

Maintenance warning:

Do not start matching before payment approval.

### POST `/admin/bookings/:id/assign-rider`

Method: `POST`

Endpoint: `/admin/bookings/:id/assign-rider`

Who can access: Admin, Super Admin

Purpose: Manually assign rider.

Input: Rider ID, reason, optional override reason.

Output: Updated booking.

Important rules:

- Booking must be `MATCHING`.
- Rider must be eligible unless allowed override is recorded.

Maintenance warning:

Never assign unapproved rider.

### POST `/admin/bookings/:id/sla-failed`

Method: `POST`

Endpoint: `/admin/bookings/:id/sla-failed`

Who can access: Admin, Super Admin

Purpose: Mark matching as failed by SLA.

Input: Reason.

Output: Updated booking.

Important rules:

- Moves `MATCHING -> SLA_FAILED`.

Maintenance warning:

Must write audit log.

### POST `/admin/bookings/:id/cancel`

Method: `POST`

Endpoint: `/admin/bookings/:id/cancel`

Who can access: Admin, Super Admin

Purpose: Cancel booking.

Input: Reason.

Output: Updated booking.

Important rules:

- Uses backend state machine.

Maintenance warning:

Do not cancel completed bookings.

### POST `/admin/bookings/:id/refund-pending`

Method: `POST`

Endpoint: `/admin/bookings/:id/refund-pending`

Who can access: Admin, Super Admin

Purpose: Mark booking refund pending.

Input: Reason.

Output: Updated booking.

Important rules:

- Allowed from `PAID` or `SLA_FAILED`.

Maintenance warning:

Do not skip audit log.

### GET `/admin/payment-proofs/pending`

Method: `GET`

Endpoint: `/admin/payment-proofs/pending`

Who can access: Admin, Super Admin

Purpose: List pending payment proofs.

Input: Bearer token.

Output: Pending payment proofs.

Important rules:

- Admin-only.

Maintenance warning:

Do not expose proof queue to passengers or riders.

### POST `/admin/payment-proofs/:id/approve`

Method: `POST`

Endpoint: `/admin/payment-proofs/:id/approve`

Who can access: Admin, Super Admin

Purpose: Approve payment proof.

Input: Optional admin note.

Output: Approved proof and booking status.

Important rules:

- Booking moves `PAYMENT_PENDING -> PAID`.

Maintenance warning:

Do not approve non-pending proof.

### POST `/admin/payment-proofs/:id/reject`

Method: `POST`

Endpoint: `/admin/payment-proofs/:id/reject`

Who can access: Admin, Super Admin

Purpose: Reject payment proof.

Input: Admin note.

Output: Rejected proof.

Important rules:

- Booking remains `PAYMENT_PENDING`.

Maintenance warning:

Admin note is required for rejection.

### GET `/admin/payment-proofs/history`

Method: `GET`

Endpoint: `/admin/payment-proofs/history`

Who can access: Admin, Super Admin

Purpose: View payment proof history.

Input: Bearer token.

Output: Payment proof history.

Important rules:

- Admin-only.

Maintenance warning:

Use real database history, not fake rows.

### GET `/admin/riders/pending`

Method: `GET`

Endpoint: `/admin/riders/pending`

Who can access: Admin, Super Admin

Purpose: List pending riders.

Input: Bearer token.

Output: Pending rider list.

Important rules:

- Admin-only.

Maintenance warning:

Do not approve riders from frontend state only.

### GET `/admin/riders`

Method: `GET`

Endpoint: `/admin/riders`

Who can access: Admin, Super Admin

Purpose: List riders.

Input: Bearer token.

Output: Rider list.

Important rules:

- Admin-only.

Maintenance warning:

Keep protected.

### GET `/admin/riders/:id`

Method: `GET`

Endpoint: `/admin/riders/:id`

Who can access: Admin, Super Admin

Purpose: View rider detail.

Input: Rider ID.

Output: Rider detail.

Important rules:

- Admin-only.

Maintenance warning:

Do not expose identity details publicly.

### POST `/admin/riders/:id/approve`

Method: `POST`

Endpoint: `/admin/riders/:id/approve`

Who can access: Admin, Super Admin

Purpose: Approve rider.

Input: Optional admin note.

Output: Updated rider.

Important rules:

- Rider becomes approved and active.

Maintenance warning:

Approval must be audit logged.

### POST `/admin/riders/:id/reject`

Method: `POST`

Endpoint: `/admin/riders/:id/reject`

Who can access: Admin, Super Admin

Purpose: Reject rider.

Input: Admin note.

Output: Updated rider.

Important rules:

- Rejected rider cannot receive jobs.

Maintenance warning:

Keep availability unavailable.

### POST `/admin/riders/:id/suspend`

Method: `POST`

Endpoint: `/admin/riders/:id/suspend`

Who can access: Admin, Super Admin

Purpose: Suspend rider.

Input: Admin note.

Output: Updated rider.

Important rules:

- Suspended rider cannot receive jobs.

Maintenance warning:

Must be audit logged.

### POST `/admin/riders/:id/reactivate`

Method: `POST`

Endpoint: `/admin/riders/:id/reactivate`

Who can access: Admin, Super Admin

Purpose: Reactivate rider.

Input: Admin note.

Output: Updated rider.

Important rules:

- Rider becomes approved and active.

Maintenance warning:

Check business rules before reactivation.

### GET `/admin/trip-events`

Method: `GET`

Endpoint: `/admin/trip-events`

Who can access: Admin, Super Admin

Purpose: View trip events.

Input: Bearer token.

Output: Trip events.

Important rules:

- Admin-only.

Maintenance warning:

Do not expose all trip events to passengers or riders.

### GET `/admin/care-reports`

Method: `GET`

Endpoint: `/admin/care-reports`

Who can access: Admin, Super Admin

Purpose: List care reports.

Input: Bearer token.

Output: Care reports.

Important rules:

- Admin-only.

Maintenance warning:

Care reports may contain sensitive information.

### POST `/admin/care-reports/:id/approve`

Method: `POST`

Endpoint: `/admin/care-reports/:id/approve`

Who can access: Admin, Super Admin

Purpose: Approve care report.

Input: Care report ID.

Output: Updated care report.

Important rules:

- Admin-only.

Maintenance warning:

Must be audit logged.

### GET `/admin/audit-logs`

Method: `GET`

Endpoint: `/admin/audit-logs`

Who can access: Admin, Super Admin

Purpose: View audit logs.

Input: Optional filters: user, action, entity type, date.

Output: Audit log list.

Important rules:

- Admin-only.

Maintenance warning:

Do not expose audit logs publicly.

## Shared Chat APIs

### POST `/bookings/:id/chat`

Method: `POST`

Endpoint: `/bookings/:id/chat`

Who can access: Passenger for own booking, rider for assigned booking, admin/super admin for any booking.

Purpose: Send booking chat message.

Input: Message.

Output: Stored chat message.

Important rules:

- Message must be stored in database.
- Access is checked by role and booking relationship.

Maintenance warning:

Do not store chat only in local frontend state.

### GET `/bookings/:id/chat`

Method: `GET`

Endpoint: `/bookings/:id/chat`

Who can access: Passenger for own booking, rider for assigned booking, admin/super admin for any booking.

Purpose: View booking chat messages.

Input: Booking ID.

Output: Chat messages.

Important rules:

- Access is checked by role and booking relationship.

Maintenance warning:

Do not allow passengers or riders to view unrelated booking chats.

### GET `/bookings/admin/monitor`

Method: `GET`

Endpoint: `/bookings/admin/monitor`

Who can access: Admin, Super Admin

Purpose: List active booking chats for monitoring.

Input: Bearer token.

Output: Chat monitoring list.

Important rules:

- Admin-only.

Maintenance warning:

Keep protected.

### POST `/bookings/:id/admin-note`

Method: `POST`

Endpoint: `/bookings/:id/admin-note`

Who can access: Admin, Super Admin

Purpose: Add admin monitoring note.

Input: Note.

Output: Admin note response.

Important rules:

- Admin-only.

Maintenance warning:

Notes are audit logged, not regular chat messages.

## Report APIs

### GET `/admin/reports/daily-bookings`

Method: `GET`

Endpoint: `/admin/reports/daily-bookings`

Who can access: Admin, Super Admin

Purpose: Daily booking summary.

Input: Bearer token.

Output: Daily booking rows.

Important rules:

- Admin-only.

Maintenance warning:

Do not use fake chart data.

### GET `/admin/reports/completed-trips`

Method: `GET`

Endpoint: `/admin/reports/completed-trips`

Who can access: Admin, Super Admin

Purpose: Completed trip report.

Input: Bearer token.

Output: Completed trip rows.

Important rules:

- Admin-only.

Maintenance warning:

Use real booking status `COMPLETED`.

### GET `/admin/reports/cancelled-bookings`

Method: `GET`

Endpoint: `/admin/reports/cancelled-bookings`

Who can access: Admin, Super Admin

Purpose: Cancelled booking report.

Input: Bearer token.

Output: Cancelled booking rows.

Important rules:

- Admin-only.

Maintenance warning:

Use real booking status `CANCELLED`.

### GET `/admin/reports/payment-summary`

Method: `GET`

Endpoint: `/admin/reports/payment-summary`

Who can access: Admin, Super Admin

Purpose: Payment proof summary by status.

Input: Bearer token.

Output: Payment summary rows.

Important rules:

- Admin-only.

Maintenance warning:

Amounts are stored in sen.

### GET `/admin/reports/rider-completed-trips`

Method: `GET`

Endpoint: `/admin/reports/rider-completed-trips`

Who can access: Admin, Super Admin

Purpose: Completed trips grouped by rider.

Input: Bearer token.

Output: Rider completed trip rows.

Important rules:

- Admin-only.

Maintenance warning:

Do not display future performance metrics unless backend supports them.

## Not Implemented Yet / Future Phase

The following are not implemented yet / future phase:

- Real payment gateway.
- Real payment file upload storage.
- Live maps and distance calculation.
- AI chat moderation.
- Admin user management.
- Wallet top-up and payout automation.
- Production deployment scripts.

# Database Reference

The local MVP database uses SQLite. The database is the source of truth for bookings, users, payments, rider assignment, chat, care reports, and audit logs.

## Table name: users

Purpose: Stores all login accounts.

Important fields:

- `id`
- `name`
- `phone`
- `email`
- `password_hash`
- `role`
- `status`
- `created_at`
- `updated_at`

Related tables:

- `passenger_profiles`
- `rider_profiles`
- `admin_profiles`
- `bookings`
- `audit_logs`
- `chat_messages`

Maintenance warning:

Do not store plain text passwords. Always use password hashing.

## Table name: passenger_profiles

Purpose: Stores passenger-specific profile information.

Important fields:

- `id`
- `user_id`
- `emergency_contact_name`
- `emergency_contact_phone`
- `created_at`

Related tables:

- `users`
- `bookings`

Maintenance warning:

Do not allow passengers to view or edit another passenger profile.

## Table name: rider_profiles

Purpose: Stores rider-specific approval, vehicle, availability, wallet, and deposit information.

Important fields:

- `id`
- `user_id`
- `ic_number`
- `license_number`
- `vehicle_model`
- `vehicle_plate`
- `approval_status`
- `availability_status`
- `wallet_balance`
- `deposit_balance`
- `created_at`

Related tables:

- `users`
- `bookings`
- `rider_job_offers`
- `trip_events`
- `care_reports`

Maintenance warning:

Do not allow unapproved, suspended, unavailable, or insufficient-deposit riders to receive jobs.

## Table name: admin_profiles

Purpose: Stores admin-specific profile information.

Important fields:

- `id`
- `user_id`
- `admin_role`
- `created_at`

Related tables:

- `users`
- `audit_logs`

Maintenance warning:

Admin-sensitive functions must check admin or super admin role in the backend.

## Table name: bookings

Purpose: Stores passenger bookings and the current booking status.

Important fields:

- `id`
- `passenger_id`
- `dependent_name`
- `passenger_category`
- `service_type`
- `pickup_address`
- `destination_address`
- `pickup_datetime`
- `special_notes`
- `estimated_fare`
- `status`
- `assigned_rider_id`
- `payment_status`
- `created_at`
- `updated_at`

Related tables:

- `users`
- `booking_status_history`
- `payment_proofs`
- `rider_job_offers`
- `trip_events`
- `chat_messages`
- `care_reports`

Maintenance warning:

Do not update `status` directly unless the backend state machine validation is used.

## Table name: booking_status_history

Purpose: Stores every booking status change for audit and troubleshooting.

Important fields:

- `id`
- `booking_id`
- `old_status`
- `new_status`
- `changed_by`
- `reason`
- `created_at`

Related tables:

- `bookings`
- `users`

Maintenance warning:

Do not delete `booking_status_history` because it is needed for audit and troubleshooting.

## Table name: payment_proofs

Purpose: Stores manual payment proof submissions and admin verification results.

Important fields:

- `id`
- `booking_id`
- `passenger_id`
- `amount`
- `proof_file_url`
- `status`
- `admin_note`
- `verified_by`
- `created_at`
- `verified_at`

Related tables:

- `bookings`
- `users`

Maintenance warning:

Do not mark a booking as paid without approved payment proof in the MVP.

## Table name: rider_job_offers

Purpose: Stores controlled job offers sent to eligible riders.

Important fields:

- `id`
- `booking_id`
- `rider_id`
- `offer_status`
- `offered_at`
- `responded_at`

Related tables:

- `bookings`
- `users`
- `rider_profiles`

Maintenance warning:

Never allow two riders to accept the same booking.

## Table name: trip_events

Purpose: Stores trip progress events such as on the way, arrived pickup, started, arrived destination, and completed.

Important fields:

- `id`
- `booking_id`
- `rider_id`
- `event_type`
- `note`
- `created_at`

Related tables:

- `bookings`
- `users`

Maintenance warning:

Riders must only create trip events for their own assigned bookings.

## Table name: chat_messages

Purpose: Stores passenger, rider, and admin chat messages for booking monitoring.

Important fields:

- `id`
- `booking_id`
- `sender_id`
- `sender_role`
- `message`
- `created_at`

Related tables:

- `bookings`
- `users`

Maintenance warning:

Do not store chat only in frontend state. Messages must be saved in the database for admin monitoring.

## Table name: care_reports

Purpose: Stores rider care reports after completed trips.

Important fields:

- `id`
- `booking_id`
- `rider_id`
- `arrived_safely`
- `assistance_given`
- `handover_notes`
- `medication_or_document_notes`
- `summary`
- `admin_approved`
- `created_at`
- `updated_at`

Related tables:

- `bookings`
- `users`

Maintenance warning:

Care reports should only be submitted after the trip is completed.

## Table name: audit_logs

Purpose: Stores important system actions for safety review and troubleshooting.

Important fields:

- `id`
- `user_id`
- `action`
- `entity_type`
- `entity_id`
- `details`
- `created_at`

Related tables:

- `users`

Maintenance warning:

Do not remove audit logging from admin-sensitive or booking-status-changing actions.

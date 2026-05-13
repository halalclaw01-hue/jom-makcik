# Jom Makcik CareRide MVP Test Report

Date: 2026-05-12

## Scope

This report covers the Phase 30 final MVP backend smoke test for the controlled assisted mobility flow.

The test verifies the MVP as a controlled platform, not open e-hailing:

- Admin approval is required for riders.
- Manual payment proof requires admin approval.
- Matching is started by admin.
- Riders can only accept controlled job offers.
- Booking status changes are validated by the backend state machine.
- Passenger, rider, and admin data access is role protected.
- Chat messages are stored and visible to admin.
- Care reports are submitted manually by riders after trip completion.

## Test Command

Run from `backend`:

```bash
npm run test:mvp
```

The test resets the local SQLite database before running.

## Test Coverage

| Task | Result | Notes |
| --- | --- | --- |
| 30.1 Passenger registration | Passed | New passenger registered through `/auth/register/passenger`. |
| 30.2 Rider registration | Passed | New rider registered through `/auth/register/rider` with pending approval. |
| 30.3 Admin login | Passed | Super admin logged in through `/auth/login`. |
| 30.4 Rider approval | Passed | Admin approved rider through `/admin/riders/:id/approve`. |
| 30.5 Passenger booking creation | Passed | Passenger created quoted booking through `/passenger/bookings`. |
| 30.6 Passenger payment proof submission | Passed | Passenger submitted manual proof reference. |
| 30.7 Admin payment approval | Passed | Admin approved proof and booking moved to `PAID`. |
| 30.8 Start matching | Passed | Admin started matching and booking moved to `MATCHING`. |
| 30.9 Rider accepts job | Passed | Rider accepted own job offer and booking moved to `ASSIGNED`. |
| 30.10 Trip status update | Passed | Rider logged `on_the_way` event. |
| 30.11 Passenger/rider/admin chat | Passed | All three roles sent messages; admin read stored chat. |
| 30.12 Trip completion | Passed | Rider started and completed trip; booking moved to `COMPLETED`. |
| 30.13 Rider care report | Passed | Rider submitted care report after completion. |
| 30.14 Admin care report view | Passed | Admin listed care reports and saw submitted report. |
| 30.15 Forbidden booking status transitions | Passed | Attempted `COMPLETED -> CANCELLED` was blocked with `400`. |
| 30.16 Unauthorized access attempts | Passed | Passenger blocked from admin route; rider blocked from passenger route; passenger blocked from rider trip route. |

## Latest Test Result

The latest `npm run test:mvp` completed successfully.

Observed final output:

```json
{
  "ok": true,
  "bookingId": 1,
  "riderId": 5,
  "offerId": 1,
  "careReportId": 1,
  "finalStatus": "COMPLETED",
  "chatMessages": 3
}
```

## Safety Review Notes

- Rider deposit was seeded directly in the test database after admin rider approval because the MVP does not yet include a wallet top-up endpoint.
- This is test setup only and is not exposed as production behavior.
- The backend state machine blocked forbidden transitions.
- Role middleware blocked unauthorized route access.
- Chat storage and admin monitoring were verified through backend APIs.

## Known Gaps

- This test is API-level end-to-end testing. It does not automate tapping through the Android or web interfaces.
- Local SQLite is reset during the test.
- Real payment gateway, real file upload, live maps, and AI moderation are intentionally not part of the MVP test.

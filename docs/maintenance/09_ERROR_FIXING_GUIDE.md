# Error Fixing Guide

Fix one error at a time. Do not refactor the whole project during bug fixing.

## A. App Cannot Start

Checklist:

- Check terminal error.
- Check `npm install`.
- Check `.env`.
- Check database connection.
- Check port already in use.
- Check backend running.
- Check frontend API URL.

Common notes:

- Backend usually runs on `http://localhost:4000`.
- Android emulator uses `http://10.0.2.2:4000` to reach local backend.

## B. Login Not Working

Checklist:

- Check user exists.
- Check password hash.
- Check token.
- Check role.
- Check backend auth middleware.
- Check account is not suspended or rejected.

Common notes:

- Seed admin login is normally `superadmin@jommakcik.local`.
- Seed password is normally `Password123!`.

## C. Booking Not Updating

Checklist:

- Check booking status.
- Check allowed transition.
- Check user permission.
- Check backend logs.
- Check `booking_status_history`.

Common notes:

- Do not update booking status directly in database during normal app use.
- Use backend status update functions.

## D. Payment Not Approved

Checklist:

- Check payment proof exists.
- Check admin role.
- Check payment proof status.
- Check booking status is `PAYMENT_PENDING`.
- Check admin note if rejecting proof.

Common notes:

- Approval moves booking to `PAID`.
- Rejection keeps booking as `PAYMENT_PENDING`.

## E. Rider Cannot Receive Job

Checklist:

- Check `approval_status`.
- Check `availability_status`.
- Check suspension status.
- Check active trip conflict.
- Check deposit/wallet rule.
- Check booking status is `MATCHING`.

Common notes:

- Rider must be approved and available.
- Rider must not already have an active assigned or in-progress trip.

## F. Chat Not Showing

Checklist:

- Check booking access permission.
- Check `chat_messages` table.
- Check API response.
- Check frontend state update.
- Check booking belongs to passenger or is assigned to rider.

Common notes:

- Admin can monitor booking chats.
- Chat messages must be stored in database.

## G. Localhost Refused Connection

Checklist:

- Check server is running.
- Check correct port.
- Check terminal errors.
- Check firewall.
- Check whether another app is using same port.
- Check Android emulator URL uses `10.0.2.2`, not `localhost`.

## Maintenance Rule

Fix one error at a time. Do not refactor whole project during bug fixing.

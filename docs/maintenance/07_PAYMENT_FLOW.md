# Payment Flow Reference

The MVP uses manual payment proof. There is no real payment gateway yet.

## MVP Payment Flow

1. Passenger creates booking.
2. Passenger confirms booking.
3. Booking becomes `PAYMENT_PENDING`.
4. Passenger uploads payment proof reference.
5. Admin checks payment proof.
6. Admin approves payment.
7. Booking becomes `PAID`.
8. Admin/system starts matching.
9. Trip is completed.
10. Driver payout is handled manually or in a future phase.

## Payment Proof Statuses

- `pending`
- `approved`
- `rejected`

## Booking Payment Statuses

- `unpaid`
- `proof_submitted`
- `verified`
- `rejected`
- `refund_pending`
- `refunded`

## Important Rules

- Passenger cannot approve payment.
- Admin must approve payment proof in the MVP.
- Rejected payment proof does not move booking to `PAID`.
- Matching must not begin before payment is approved.
- Payment amounts are stored in sen.

## Not Implemented Yet / Future Phase

- Real payment gateway.
- Real receipt file upload storage.
- Automated refund processing.
- Automated driver payout.

## Maintenance Warning

Do not start matching before payment is approved.

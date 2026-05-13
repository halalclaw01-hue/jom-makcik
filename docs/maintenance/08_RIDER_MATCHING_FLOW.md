# Rider Matching Flow

Jom Makcik CareRide uses controlled matching. It is not an open rider marketplace.

## Rider Eligibility

A rider must:

- Be approved.
- Be available.
- Not be suspended.
- Have sufficient deposit or wallet if this rule is implemented.
- Not already have an active assigned trip.

The MVP includes a deposit rule for job eligibility.

## Matching Flow

1. Booking status is `PAID`.
2. Admin starts matching.
3. Booking becomes `MATCHING`.
4. Eligible riders receive offers.
5. Rider accepts.
6. Booking becomes `ASSIGNED`.
7. Other offers for the same booking are closed.
8. Rider starts trip.
9. Booking becomes `IN_PROGRESS`.
10. Rider completes trip.
11. Booking becomes `COMPLETED`.

## Admin Manual Assignment

Admin can manually assign a rider when booking is `MATCHING`.

Rules:

- Admin cannot assign an unapproved rider.
- Admin cannot assign suspended rider.
- Admin cannot assign rider with insufficient deposit.
- If an unavailable rider is assigned by allowed override, an override reason must be recorded.

## Not Implemented Yet / Future Phase

- Automated distance-based nearest rider matching.
- Live map tracking.
- Advanced dispatch rules.

## Maintenance Warning

Never allow two riders to accept the same booking.

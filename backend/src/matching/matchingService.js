const { getDatabase } = require("../db/connection");
const { httpError } = require("../utils/httpError");
const { writeAuditLog } = require("../utils/auditLog");
const { BOOKING_STATUSES } = require("../bookings/bookingStatus");
const { updateBookingStatus } = require("../bookings/bookingStatusService");
const { getRiderJobEligibility, MINIMUM_RIDER_DEPOSIT_SEN } = require("../riders/riderService");

function toJobOfferResponse(row) {
  return {
    id: row.id,
    bookingId: row.booking_id,
    riderId: row.rider_id,
    offerStatus: row.offer_status,
    offeredAt: row.offered_at,
    respondedAt: row.responded_at,
    booking: row.service_type
      ? {
          passengerCategory: row.passenger_category,
          serviceType: row.service_type,
          pickupAddress: row.pickup_address,
          destinationAddress: row.destination_address,
          pickupDatetime: row.pickup_datetime,
          estimatedFare: row.estimated_fare,
          status: row.booking_status,
        }
      : undefined,
  };
}

function listEligibleRiders() {
  return getDatabase()
    .prepare(
      `SELECT
        rider_profiles.user_id AS rider_id,
        rider_profiles.deposit_balance,
        rider_profiles.availability_status,
        rider_profiles.approval_status,
        users.status AS user_status
       FROM rider_profiles
       JOIN users ON users.id = rider_profiles.user_id
       WHERE users.role = 'rider'
         AND users.status = 'active'
         AND rider_profiles.approval_status = 'approved'
         AND rider_profiles.availability_status = 'available'
         AND rider_profiles.deposit_balance >= ?
         AND NOT EXISTS (
           SELECT 1 FROM bookings
           WHERE bookings.assigned_rider_id = rider_profiles.user_id
             AND bookings.status IN ('ASSIGNED', 'IN_PROGRESS')
         )
       ORDER BY rider_profiles.created_at ASC, rider_profiles.id ASC`
    )
    .all(MINIMUM_RIDER_DEPOSIT_SEN);
}

function startMatching(bookingId, adminId) {
  const db = getDatabase();

  return db.transaction(() => {
    const booking = db.prepare("SELECT * FROM bookings WHERE id = ?").get(bookingId);

    if (!booking) {
      throw httpError(404, "Booking not found.");
    }

    if (booking.status !== BOOKING_STATUSES.PAID) {
      throw httpError(400, "Only PAID bookings can start matching.");
    }

    const matchingBooking = updateBookingStatus(
      bookingId,
      BOOKING_STATUSES.MATCHING,
      adminId,
      "Admin started controlled rider matching"
    );

    const eligibleRiders = listEligibleRiders();
    const insertOffer = db.prepare(
      `INSERT OR IGNORE INTO rider_job_offers (booking_id, rider_id, offer_status)
       VALUES (?, ?, 'pending')`
    );

    for (const rider of eligibleRiders) {
      insertOffer.run(bookingId, rider.rider_id);
    }

    writeAuditLog({
      userId: adminId,
      action: "matching_started",
      entityType: "booking",
      entityId: bookingId,
      details: {
        eligibleRiderCount: eligibleRiders.length,
        offeredRiderIds: eligibleRiders.map((rider) => rider.rider_id),
      },
    });

    return {
      booking: matchingBooking,
      eligibleRiderCount: eligibleRiders.length,
      offeredRiderIds: eligibleRiders.map((rider) => rider.rider_id),
    };
  })();
}

function listRiderJobOffers(riderId) {
  return getDatabase()
    .prepare(
      `SELECT
        rider_job_offers.*,
        bookings.passenger_category,
        bookings.service_type,
        bookings.pickup_address,
        bookings.destination_address,
        bookings.pickup_datetime,
        bookings.estimated_fare,
        bookings.status AS booking_status
       FROM rider_job_offers
       JOIN bookings ON bookings.id = rider_job_offers.booking_id
       WHERE rider_job_offers.rider_id = ?
         AND rider_job_offers.offer_status = 'pending'
         AND bookings.status = 'MATCHING'
       ORDER BY rider_job_offers.offered_at ASC, rider_job_offers.id ASC`
    )
    .all(riderId)
    .map(toJobOfferResponse);
}

function getPendingOfferForRider(db, offerId, riderId) {
  return db
    .prepare(
      `SELECT rider_job_offers.*, bookings.status AS booking_status
       FROM rider_job_offers
       JOIN bookings ON bookings.id = rider_job_offers.booking_id
       WHERE rider_job_offers.id = ?
         AND rider_job_offers.rider_id = ?
         AND rider_job_offers.offer_status = 'pending'`
    )
    .get(offerId, riderId);
}

function acceptJobOffer(offerId, riderId) {
  const db = getDatabase();

  return db.transaction(() => {
    const eligibility = getRiderJobEligibility(riderId);

    if (!eligibility.eligible) {
      throw httpError(403, `Rider is not eligible to accept jobs: ${eligibility.reasons.join(" ")}`);
    }

    const offer = getPendingOfferForRider(db, offerId, riderId);

    if (!offer) {
      throw httpError(404, "Active job offer not found.");
    }

    const booking = db.prepare("SELECT * FROM bookings WHERE id = ?").get(offer.booking_id);

    if (!booking || booking.status !== BOOKING_STATUSES.MATCHING) {
      db.prepare(
        `UPDATE rider_job_offers
         SET offer_status = 'expired', responded_at = CURRENT_TIMESTAMP
         WHERE id = ? AND offer_status = 'pending'`
      ).run(offerId);
      throw httpError(409, "Booking is no longer available for matching.");
    }

    const alreadyAssigned = db
      .prepare(
        `SELECT id FROM rider_job_offers
         WHERE booking_id = ? AND offer_status = 'accepted'`
      )
      .get(offer.booking_id);

    if (alreadyAssigned) {
      throw httpError(409, "Booking has already been accepted by another rider.");
    }

    db.prepare(
      `UPDATE rider_job_offers
       SET offer_status = 'accepted', responded_at = CURRENT_TIMESTAMP
       WHERE id = ? AND offer_status = 'pending'`
    ).run(offerId);

    db.prepare(
      `UPDATE bookings
       SET assigned_rider_id = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(riderId, offer.booking_id);

    const updatedBooking = updateBookingStatus(
      offer.booking_id,
      BOOKING_STATUSES.ASSIGNED,
      riderId,
      "Rider accepted controlled job offer"
    );

    db.prepare(
      `UPDATE rider_job_offers
       SET offer_status = 'cancelled', responded_at = CURRENT_TIMESTAMP
       WHERE booking_id = ?
         AND id <> ?
         AND offer_status = 'pending'`
    ).run(offer.booking_id, offerId);

    writeAuditLog({
      userId: riderId,
      action: "job_offer_accepted",
      entityType: "rider_job_offer",
      entityId: offerId,
      details: {
        bookingId: offer.booking_id,
        assignedRiderId: riderId,
      },
    });

    return {
      offer: toJobOfferResponse(db.prepare("SELECT * FROM rider_job_offers WHERE id = ?").get(offerId)),
      booking: updatedBooking,
    };
  })();
}

function rejectJobOffer(offerId, riderId) {
  const db = getDatabase();

  return db.transaction(() => {
    const offer = getPendingOfferForRider(db, offerId, riderId);

    if (!offer) {
      throw httpError(404, "Active job offer not found.");
    }

    db.prepare(
      `UPDATE rider_job_offers
       SET offer_status = 'rejected', responded_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(offerId);

    writeAuditLog({
      userId: riderId,
      action: "job_offer_rejected",
      entityType: "rider_job_offer",
      entityId: offerId,
      details: {
        bookingId: offer.booking_id,
      },
    });

    const remainingPendingOffers = db
      .prepare(
        `SELECT COUNT(*) AS count FROM rider_job_offers
         WHERE booking_id = ?
           AND offer_status = 'pending'`
      )
      .get(offer.booking_id).count;

    return {
      offer: toJobOfferResponse(db.prepare("SELECT * FROM rider_job_offers WHERE id = ?").get(offerId)),
      bookingRemainsMatching: offer.booking_status === BOOKING_STATUSES.MATCHING,
      remainingPendingOffers,
    };
  })();
}

module.exports = {
  listEligibleRiders,
  startMatching,
  listRiderJobOffers,
  acceptJobOffer,
  rejectJobOffer,
};

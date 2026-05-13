const { getDatabase } = require("../db/connection");
const { httpError } = require("../utils/httpError");
const { writeAuditLog } = require("../utils/auditLog");
const { BOOKING_STATUSES } = require("./bookingStatus");
const { updateBookingStatus } = require("./bookingStatusService");
const { getRiderJobEligibility, MINIMUM_RIDER_DEPOSIT_SEN } = require("../riders/riderService");

function toBookingSummary(row) {
  return {
    id: row.id,
    passengerId: row.passenger_id,
    passengerName: row.passenger_name,
    passengerPhone: row.passenger_phone,
    dependentName: row.dependent_name,
    passengerCategory: row.passenger_category,
    serviceType: row.service_type,
    pickupAddress: row.pickup_address,
    destinationAddress: row.destination_address,
    pickupDatetime: row.pickup_datetime,
    estimatedFare: row.estimated_fare,
    status: row.status,
    assignedRiderId: row.assigned_rider_id,
    assignedRiderName: row.assigned_rider_name,
    paymentStatus: row.payment_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function baseBookingQuery() {
  return `
    SELECT
      bookings.*,
      passengers.name AS passenger_name,
      passengers.phone AS passenger_phone,
      riders.name AS assigned_rider_name
    FROM bookings
    JOIN users passengers ON passengers.id = bookings.passenger_id
    LEFT JOIN users riders ON riders.id = bookings.assigned_rider_id
  `;
}

function listAdminBookings(filters = {}) {
  const where = [];
  const params = [];

  if (filters.status) {
    where.push("bookings.status = ?");
    params.push(filters.status);
  }

  if (filters.date) {
    where.push("date(bookings.pickup_datetime) = date(?)");
    params.push(filters.date);
  }

  if (filters.passenger) {
    where.push("(passengers.name LIKE ? OR passengers.phone LIKE ?)");
    params.push(`%${filters.passenger}%`, `%${filters.passenger}%`);
  }

  if (filters.rider) {
    where.push("(riders.name LIKE ? OR CAST(bookings.assigned_rider_id AS TEXT) = ?)");
    params.push(`%${filters.rider}%`, String(filters.rider));
  }

  const sql = `
    ${baseBookingQuery()}
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY bookings.created_at DESC, bookings.id DESC
  `;

  return getDatabase().prepare(sql).all(...params).map(toBookingSummary);
}

function getAdminBookingDetail(bookingId) {
  const db = getDatabase();
  const booking = db.prepare(`${baseBookingQuery()} WHERE bookings.id = ?`).get(bookingId);

  if (!booking) {
    throw httpError(404, "Booking not found.");
  }

  const statusHistory = db
    .prepare(
      `SELECT
        booking_status_history.*,
        users.name AS changed_by_name,
        users.role AS changed_by_role
       FROM booking_status_history
       LEFT JOIN users ON users.id = booking_status_history.changed_by
       WHERE booking_status_history.booking_id = ?
       ORDER BY booking_status_history.created_at ASC, booking_status_history.id ASC`
    )
    .all(bookingId)
    .map((row) => ({
      id: row.id,
      oldStatus: row.old_status,
      newStatus: row.new_status,
      changedBy: row.changed_by,
      changedByName: row.changed_by_name,
      changedByRole: row.changed_by_role,
      reason: row.reason,
      createdAt: row.created_at,
    }));

  return {
    booking: toBookingSummary(booking),
    statusHistory,
  };
}

function listMatchingRiderCandidates() {
  return getDatabase()
    .prepare(
      `SELECT
        users.id,
        users.name,
        users.phone,
        users.status AS user_status,
        rider_profiles.vehicle_model,
        rider_profiles.vehicle_plate,
        rider_profiles.license_number,
        rider_profiles.approval_status,
        rider_profiles.availability_status,
        rider_profiles.wallet_balance,
        rider_profiles.deposit_balance
       FROM rider_profiles
       JOIN users ON users.id = rider_profiles.user_id
       WHERE users.role = 'rider'
         AND users.status = 'active'
         AND rider_profiles.approval_status = 'approved'
         AND rider_profiles.deposit_balance >= ?
         AND NOT EXISTS (
           SELECT 1 FROM bookings
           WHERE bookings.assigned_rider_id = rider_profiles.user_id
             AND bookings.status IN ('ASSIGNED', 'IN_PROGRESS')
         )
       ORDER BY
         CASE rider_profiles.availability_status WHEN 'available' THEN 0 ELSE 1 END,
         rider_profiles.created_at ASC,
         rider_profiles.id ASC`
    )
    .all(MINIMUM_RIDER_DEPOSIT_SEN)
    .map((row) => ({
      id: row.id,
      name: row.name,
      phone: row.phone,
      userStatus: row.user_status,
      vehicleModel: row.vehicle_model,
      vehiclePlate: row.vehicle_plate,
      licenseNumber: row.license_number,
      approvalStatus: row.approval_status,
      availabilityStatus: row.availability_status,
      walletBalance: row.wallet_balance,
      depositBalance: row.deposit_balance,
      assignmentMode: row.availability_status === "available" ? "eligible" : "override_required",
    }));
}

function listMatchingQueue() {
  return {
    matchingBookings: listAdminBookings({ status: BOOKING_STATUSES.MATCHING }),
    paidBookings: listAdminBookings({ status: BOOKING_STATUSES.PAID }),
  };
}

function assignRiderManually(bookingId, riderId, adminId, reason, overrideReason) {
  const db = getDatabase();

  return db.transaction(() => {
    const booking = db.prepare("SELECT * FROM bookings WHERE id = ?").get(bookingId);

    if (!booking) {
      throw httpError(404, "Booking not found.");
    }

    if (booking.status !== BOOKING_STATUSES.MATCHING) {
      throw httpError(400, "Manual rider assignment requires booking status MATCHING.");
    }

    const eligibility = getRiderJobEligibility(riderId);
    const availabilityOnlyOverride =
      !eligibility.eligible &&
      eligibility.rider?.approvalStatus === "approved" &&
      eligibility.rider?.userStatus === "active" &&
      eligibility.rider?.availabilityStatus === "unavailable" &&
      eligibility.rider?.depositBalance >= eligibility.minimumDepositSen &&
      eligibility.reasons.length === 1 &&
      eligibility.reasons[0] === "Rider availability status is not available.";

    if (!eligibility.eligible && !availabilityOnlyOverride) {
      throw httpError(400, `Rider is not eligible: ${eligibility.reasons.join(" ")}`);
    }

    if (availabilityOnlyOverride && !String(overrideReason || "").trim()) {
      throw httpError(400, "Override reason is required to assign an unavailable rider.");
    }

    db.prepare(
      `UPDATE bookings
       SET assigned_rider_id = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(riderId, bookingId);

    db.prepare(
      `INSERT OR IGNORE INTO rider_job_offers (booking_id, rider_id, offer_status, responded_at)
       VALUES (?, ?, 'accepted', CURRENT_TIMESTAMP)`
    ).run(bookingId, riderId);

    db.prepare(
      `UPDATE rider_job_offers
       SET offer_status = CASE WHEN rider_id = ? THEN 'accepted' ELSE 'cancelled' END,
           responded_at = CURRENT_TIMESTAMP
       WHERE booking_id = ? AND offer_status IN ('pending', 'accepted')`
    ).run(riderId, bookingId);

    const updatedBooking = updateBookingStatus(
      bookingId,
      BOOKING_STATUSES.ASSIGNED,
      adminId,
      reason || "Admin manually assigned rider"
    );

    writeAuditLog({
      userId: adminId,
      action: "booking_rider_manually_assigned",
      entityType: "booking",
      entityId: bookingId,
      details: {
        riderId,
        reason: reason || null,
        overrideReason: availabilityOnlyOverride ? overrideReason : null,
      },
    });

    return getAdminBookingDetail(updatedBooking.id);
  })();
}

function markSlaFailed(bookingId, adminId, reason) {
  const db = getDatabase();

  return db.transaction(() => {
    const booking = updateBookingStatus(
      bookingId,
      BOOKING_STATUSES.SLA_FAILED,
      adminId,
      reason || "Admin stopped matching and marked SLA failed"
    );

    db.prepare(
      `UPDATE rider_job_offers
       SET offer_status = 'expired', responded_at = CURRENT_TIMESTAMP
       WHERE booking_id = ? AND offer_status = 'pending'`
    ).run(bookingId);

    writeAuditLog({
      userId: adminId,
      action: "booking_sla_failed_by_admin",
      entityType: "booking",
      entityId: bookingId,
      details: { reason: reason || null },
    });

    return getAdminBookingDetail(booking.id);
  })();
}

function cancelBooking(bookingId, adminId, reason) {
  const booking = updateBookingStatus(
    bookingId,
    BOOKING_STATUSES.CANCELLED,
    adminId,
    reason || "Admin cancelled booking"
  );

  writeAuditLog({
    userId: adminId,
    action: "booking_cancelled_by_admin",
    entityType: "booking",
    entityId: bookingId,
    details: { reason: reason || null },
  });

  return getAdminBookingDetail(booking.id);
}

function markRefundPending(bookingId, adminId, reason) {
  const db = getDatabase();

  return db.transaction(() => {
    const booking = updateBookingStatus(
      bookingId,
      BOOKING_STATUSES.REFUND_PENDING,
      adminId,
      reason || "Admin marked refund pending"
    );

    db.prepare(
      `UPDATE bookings
       SET payment_status = 'refund_pending', updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(bookingId);

    writeAuditLog({
      userId: adminId,
      action: "booking_refund_pending_by_admin",
      entityType: "booking",
      entityId: bookingId,
      details: { reason: reason || null },
    });

    return getAdminBookingDetail(booking.id);
  })();
}

module.exports = {
  listAdminBookings,
  listMatchingQueue,
  listMatchingRiderCandidates,
  getAdminBookingDetail,
  assignRiderManually,
  markSlaFailed,
  cancelBooking,
  markRefundPending,
};

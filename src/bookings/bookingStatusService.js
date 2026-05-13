const { getDatabase } = require("../db/connection");
const { httpError } = require("../utils/httpError");
const { writeAuditLog } = require("../utils/auditLog");
const { validateBookingTransition } = require("./bookingStatus");

function findBookingById(db, bookingId) {
  return db.prepare("SELECT * FROM bookings WHERE id = ?").get(bookingId);
}

function updateBookingStatus(bookingId, newStatus, changedBy, reason) {
  const db = getDatabase();

  return db.transaction(() => {
    const booking = findBookingById(db, bookingId);

    if (!booking) {
      throw httpError(404, "Booking not found.");
    }

    const transition = validateBookingTransition(booking.status, newStatus);

    if (!transition.valid) {
      throw httpError(400, transition.reason);
    }

    db.prepare(
      `UPDATE bookings
       SET status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(newStatus, bookingId);

    db.prepare(
      `INSERT INTO booking_status_history
        (booking_id, old_status, new_status, changed_by, reason)
       VALUES (?, ?, ?, ?, ?)`
    ).run(bookingId, booking.status, newStatus, changedBy || null, reason || null);

    writeAuditLog({
      userId: changedBy || null,
      action: "booking_status_updated",
      entityType: "booking",
      entityId: bookingId,
      details: {
        oldStatus: booking.status,
        newStatus,
        reason: reason || null,
      },
    });

    return findBookingById(db, bookingId);
  })();
}

module.exports = { updateBookingStatus };

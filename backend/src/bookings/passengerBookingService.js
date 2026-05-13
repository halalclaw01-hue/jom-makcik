const { getDatabase } = require("../db/connection");
const { httpError } = require("../utils/httpError");
const { writeAuditLog } = require("../utils/auditLog");
const { BOOKING_STATUSES } = require("./bookingStatus");
const { updateBookingStatus } = require("./bookingStatusService");
const { calculateMvpFareQuote } = require("./fareQuote");

function requireText(value, fieldName) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw httpError(400, `${fieldName} is required.`);
  }

  return value.trim();
}

function optionalText(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  return String(value).trim();
}

function parseNeedsChaperone(value) {
  return value === true;
}

function validateRequestedStatus(status) {
  if (!status) {
    return BOOKING_STATUSES.QUOTED;
  }

  if (![BOOKING_STATUSES.DRAFT, BOOKING_STATUSES.QUOTED].includes(status)) {
    throw httpError(400, "Passenger booking can only be created as DRAFT or QUOTED.");
  }

  return status;
}

function toBookingResponse(booking) {
  return {
    id: booking.id,
    passengerId: booking.passenger_id,
    dependentName: booking.dependent_name,
    passengerCategory: booking.passenger_category,
    serviceType: booking.service_type,
    pickupAddress: booking.pickup_address,
    destinationAddress: booking.destination_address,
    pickupDatetime: booking.pickup_datetime,
    specialNotes: booking.special_notes,
    estimatedFare: booking.estimated_fare,
    status: booking.status,
    assignedRiderId: booking.assigned_rider_id,
    paymentStatus: booking.payment_status,
    createdAt: booking.created_at,
    updatedAt: booking.updated_at,
  };
}

function createPassengerBooking(passengerId, payload) {
  const dependentName = optionalText(payload.dependentName);
  const passengerCategory = requireText(payload.passengerCategory, "passengerCategory");
  const serviceType = requireText(payload.serviceType, "serviceType");
  const pickupAddress = requireText(payload.pickupAddress, "pickupAddress");
  const destinationAddress = requireText(payload.destinationAddress, "destinationAddress");
  const pickupDatetime = requireText(payload.pickupDatetime, "pickupDatetime");
  const specialNotes = optionalText(payload.specialNotes);
  const status = validateRequestedStatus(payload.status);
  const needsChaperone = parseNeedsChaperone(payload.needsChaperone);
  const fareQuote = calculateMvpFareQuote({ serviceType, needsChaperone });

  const db = getDatabase();

  return db.transaction(() => {
    const result = db
      .prepare(
        `INSERT INTO bookings
          (passenger_id, dependent_name, passenger_category, service_type, pickup_address,
           destination_address, pickup_datetime, special_notes, estimated_fare, status, payment_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unpaid')`
      )
      .run(
        passengerId,
        dependentName,
        passengerCategory,
        serviceType,
        pickupAddress,
        destinationAddress,
        pickupDatetime,
        specialNotes,
        fareQuote.amountSen,
        status
      );

    db.prepare(
      `INSERT INTO booking_status_history
        (booking_id, old_status, new_status, changed_by, reason)
       VALUES (?, NULL, ?, ?, ?)`
    ).run(result.lastInsertRowid, status, passengerId, "Passenger booking created");

    writeAuditLog({
      userId: passengerId,
      action: "passenger_booking_created",
      entityType: "booking",
      entityId: result.lastInsertRowid,
      details: {
        status,
        quote: fareQuote,
      },
    });

    const booking = db.prepare("SELECT * FROM bookings WHERE id = ?").get(result.lastInsertRowid);

    return {
      booking: toBookingResponse(booking),
      quote: fareQuote,
    };
  })();
}

function listPassengerBookings(passengerId) {
  return getDatabase()
    .prepare(
      `SELECT * FROM bookings
       WHERE passenger_id = ?
       ORDER BY created_at DESC, id DESC`
    )
    .all(passengerId)
    .map(toBookingResponse);
}

function getPassengerBooking(passengerId, bookingId) {
  const booking = getDatabase()
    .prepare("SELECT * FROM bookings WHERE id = ? AND passenger_id = ?")
    .get(bookingId, passengerId);

  if (!booking) {
    throw httpError(404, "Booking not found.");
  }

  return toBookingResponse(booking);
}

function confirmPassengerBooking(passengerId, bookingId) {
  getPassengerBooking(passengerId, bookingId);

  const booking = updateBookingStatus(
    bookingId,
    BOOKING_STATUSES.PAYMENT_PENDING,
    passengerId,
    "Passenger confirmed quoted booking"
  );

  return toBookingResponse(booking);
}

module.exports = {
  createPassengerBooking,
  listPassengerBookings,
  getPassengerBooking,
  confirmPassengerBooking,
};

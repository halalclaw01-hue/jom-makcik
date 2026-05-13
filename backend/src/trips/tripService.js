const { getDatabase } = require("../db/connection");
const { httpError } = require("../utils/httpError");
const { writeAuditLog } = require("../utils/auditLog");
const { BOOKING_STATUSES } = require("../bookings/bookingStatus");
const { updateBookingStatus } = require("../bookings/bookingStatusService");

const TRIP_EVENT_TYPES = Object.freeze({
  ON_THE_WAY: "on_the_way",
  ARRIVED_PICKUP: "arrived_pickup",
  PASSENGER_PICKED_UP: "passenger_picked_up",
  TRIP_STARTED: "trip_started",
  ARRIVED_DESTINATION: "arrived_destination",
  COMPLETED: "completed",
});

function toTripEventResponse(event) {
  return {
    id: event.id,
    bookingId: event.booking_id,
    riderId: event.rider_id,
    eventType: event.event_type,
    note: event.note,
    createdAt: event.created_at,
  };
}

function getAssignedBookingForRider(db, bookingId, riderId) {
  return db
    .prepare("SELECT * FROM bookings WHERE id = ? AND assigned_rider_id = ?")
    .get(bookingId, riderId);
}

function createTripEvent(db, bookingId, riderId, eventType, note = null) {
  const existing = db
    .prepare(
      `SELECT * FROM trip_events
       WHERE booking_id = ? AND rider_id = ? AND event_type = ?
       ORDER BY id DESC
       LIMIT 1`
    )
    .get(bookingId, riderId, eventType);

  if (existing) {
    return existing;
  }

  const result = db
    .prepare(
      `INSERT INTO trip_events (booking_id, rider_id, event_type, note)
       VALUES (?, ?, ?, ?)`
    )
    .run(bookingId, riderId, eventType, note);

  return db.prepare("SELECT * FROM trip_events WHERE id = ?").get(result.lastInsertRowid);
}

function recordTripEvent(bookingId, riderId, payload = {}) {
  const eventType = payload.eventType;
  const allowedEventTypes = [
    TRIP_EVENT_TYPES.ON_THE_WAY,
    TRIP_EVENT_TYPES.ARRIVED_PICKUP,
    TRIP_EVENT_TYPES.PASSENGER_PICKED_UP,
    TRIP_EVENT_TYPES.ARRIVED_DESTINATION,
  ];

  if (!allowedEventTypes.includes(eventType)) {
    throw httpError(400, "eventType is not allowed for manual rider event logging.");
  }

  const db = getDatabase();

  return db.transaction(() => {
    const booking = getAssignedBookingForRider(db, bookingId, riderId);

    if (!booking) {
      throw httpError(404, "Assigned booking not found.");
    }

    if (
      [TRIP_EVENT_TYPES.ON_THE_WAY, TRIP_EVENT_TYPES.ARRIVED_PICKUP, TRIP_EVENT_TYPES.PASSENGER_PICKED_UP].includes(eventType) &&
      booking.status !== BOOKING_STATUSES.ASSIGNED
    ) {
      throw httpError(400, "Pickup events can only be logged while booking is ASSIGNED.");
    }

    if (eventType === TRIP_EVENT_TYPES.ARRIVED_DESTINATION && booking.status !== BOOKING_STATUSES.IN_PROGRESS) {
      throw httpError(400, "Destination arrival can only be logged while booking is IN_PROGRESS.");
    }

    const event = createTripEvent(db, bookingId, riderId, eventType, payload.note || null);

    writeAuditLog({
      userId: riderId,
      action: "trip_event_logged",
      entityType: "booking",
      entityId: bookingId,
      details: { eventType },
    });

    return { tripEvent: toTripEventResponse(event) };
  })();
}

function startTrip(bookingId, riderId) {
  const db = getDatabase();

  return db.transaction(() => {
    const booking = getAssignedBookingForRider(db, bookingId, riderId);

    if (!booking) {
      throw httpError(404, "Assigned booking not found.");
    }

    if (booking.status !== BOOKING_STATUSES.ASSIGNED) {
      throw httpError(400, "Only ASSIGNED bookings can be started.");
    }

    const updatedBooking = updateBookingStatus(
      bookingId,
      BOOKING_STATUSES.IN_PROGRESS,
      riderId,
      "Rider started assigned trip"
    );

    const events = [
      createTripEvent(db, bookingId, riderId, TRIP_EVENT_TYPES.ON_THE_WAY),
      createTripEvent(db, bookingId, riderId, TRIP_EVENT_TYPES.ARRIVED_PICKUP),
      createTripEvent(db, bookingId, riderId, TRIP_EVENT_TYPES.PASSENGER_PICKED_UP),
      createTripEvent(db, bookingId, riderId, TRIP_EVENT_TYPES.TRIP_STARTED),
    ];

    writeAuditLog({
      userId: riderId,
      action: "trip_started",
      entityType: "booking",
      entityId: bookingId,
      details: {
        eventTypes: events.map((event) => event.event_type),
      },
    });

    return {
      booking: updatedBooking,
      tripEvents: events.map(toTripEventResponse),
    };
  })();
}

function completeTrip(bookingId, riderId) {
  const db = getDatabase();

  return db.transaction(() => {
    const booking = getAssignedBookingForRider(db, bookingId, riderId);

    if (!booking) {
      throw httpError(404, "Assigned booking not found.");
    }

    if (booking.status !== BOOKING_STATUSES.IN_PROGRESS) {
      throw httpError(400, "Only IN_PROGRESS bookings can be completed.");
    }

    const events = [
      createTripEvent(db, bookingId, riderId, TRIP_EVENT_TYPES.ARRIVED_DESTINATION),
      createTripEvent(db, bookingId, riderId, TRIP_EVENT_TYPES.COMPLETED),
    ];

    const updatedBooking = updateBookingStatus(
      bookingId,
      BOOKING_STATUSES.COMPLETED,
      riderId,
      "Rider completed assigned trip"
    );

    writeAuditLog({
      userId: riderId,
      action: "trip_completed",
      entityType: "booking",
      entityId: bookingId,
      details: {
        eventTypes: events.map((event) => event.event_type),
      },
    });

    return {
      booking: updatedBooking,
      tripEvents: events.map(toTripEventResponse),
    };
  })();
}

function listAllTripEvents() {
  return getDatabase()
    .prepare(
      `SELECT * FROM trip_events
       ORDER BY created_at DESC, id DESC`
    )
    .all()
    .map(toTripEventResponse);
}

function toAssignedTripResponse(row) {
  return {
    id: row.id,
    passengerId: row.passenger_id,
    passengerCategory: row.passenger_category,
    dependentName: row.dependent_name,
    serviceType: row.service_type,
    pickupAddress: row.pickup_address,
    destinationAddress: row.destination_address,
    pickupDatetime: row.pickup_datetime,
    estimatedFare: row.estimated_fare,
    status: row.status,
    paymentStatus: row.payment_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function listAssignedTrips(riderId) {
  return getDatabase()
    .prepare(
      `SELECT * FROM bookings
       WHERE assigned_rider_id = ?
         AND status IN ('ASSIGNED', 'IN_PROGRESS')
       ORDER BY pickup_datetime ASC, id ASC`
    )
    .all(riderId)
    .map(toAssignedTripResponse);
}

function getRiderTripDetail(bookingId, riderId) {
  const db = getDatabase();
  const booking = getAssignedBookingForRider(db, bookingId, riderId);

  if (!booking) {
    throw httpError(404, "Assigned booking not found.");
  }

  const tripEvents = db
    .prepare(
      `SELECT * FROM trip_events
       WHERE booking_id = ? AND rider_id = ?
       ORDER BY created_at ASC, id ASC`
    )
    .all(bookingId, riderId)
    .map(toTripEventResponse);

  return {
    booking: toAssignedTripResponse(booking),
    tripEvents,
  };
}

module.exports = {
  TRIP_EVENT_TYPES,
  recordTripEvent,
  startTrip,
  completeTrip,
  listAssignedTrips,
  getRiderTripDetail,
  listAllTripEvents,
};

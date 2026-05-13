const assert = require("assert");

const { getDatabase, closeDatabase } = require("../db/connection");
const { setupDatabase } = require("../db/setup");
const { updateBookingStatus } = require("./bookingStatusService");
const { validateBookingTransition, BOOKING_STATUSES } = require("./bookingStatus");

function createManualTestBooking(db) {
  const passenger = db
    .prepare("SELECT id FROM users WHERE role = 'passenger' ORDER BY id LIMIT 1")
    .get();

  if (!passenger) {
    throw new Error("Manual test requires one passenger seed user.");
  }

  const result = db
    .prepare(
      `INSERT INTO bookings
        (passenger_id, dependent_name, passenger_category, service_type, pickup_address,
         destination_address, pickup_datetime, special_notes, estimated_fare, status, payment_status)
       VALUES
        (?, 'Manual Test Dependent', 'senior', 'medical_appointment', 'Pickup Address',
         'Destination Address', '2026-05-20T10:00:00.000Z', 'Manual status test booking',
         4500, 'DRAFT', 'unpaid')`
    )
    .run(passenger.id);

  return result.lastInsertRowid;
}

function runManualTest() {
  setupDatabase();

  const db = getDatabase();
  const bookingId = createManualTestBooking(db);
  const passenger = db
    .prepare("SELECT id FROM users WHERE role = 'passenger' ORDER BY id LIMIT 1")
    .get();

  assert.deepStrictEqual(
    validateBookingTransition(BOOKING_STATUSES.DRAFT, BOOKING_STATUSES.QUOTED),
    { valid: true, reason: null }
  );

  const invalidDraftToCompleted = validateBookingTransition(
    BOOKING_STATUSES.DRAFT,
    BOOKING_STATUSES.COMPLETED
  );
  assert.strictEqual(invalidDraftToCompleted.valid, false);

  const updatedBooking = updateBookingStatus(
    bookingId,
    BOOKING_STATUSES.QUOTED,
    passenger.id,
    "Manual test valid transition"
  );
  assert.strictEqual(updatedBooking.status, BOOKING_STATUSES.QUOTED);

  const historyCount = db
    .prepare("SELECT COUNT(*) AS count FROM booking_status_history WHERE booking_id = ?")
    .get(bookingId).count;
  assert.strictEqual(historyCount, 1);

  assert.throws(
    () =>
      updateBookingStatus(
        bookingId,
        BOOKING_STATUSES.COMPLETED,
        passenger.id,
        "Manual test forbidden transition"
      ),
    /not allowed/
  );

  const stillQuoted = db.prepare("SELECT status FROM bookings WHERE id = ?").get(bookingId);
  assert.strictEqual(stillQuoted.status, BOOKING_STATUSES.QUOTED);

  console.log({
    ok: true,
    bookingId,
    validTransitionTested: "DRAFT -> QUOTED",
    invalidTransitionBlocked: "QUOTED -> COMPLETED",
    statusHistoryRows: historyCount,
  });
}

if (require.main === module) {
  try {
    runManualTest();
  } finally {
    closeDatabase();
  }
}

module.exports = { runManualTest };

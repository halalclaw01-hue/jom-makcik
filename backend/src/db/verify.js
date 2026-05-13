const { getDatabase, closeDatabase, resolveDatabasePath } = require("./connection");

function verifyDatabase() {
  const db = getDatabase();
  const expectedTables = [
    "admin_profiles",
    "audit_logs",
    "booking_status_history",
    "bookings",
    "care_reports",
    "chat_messages",
    "passenger_profiles",
    "payment_proofs",
    "rider_job_offers",
    "rider_profiles",
    "trip_events",
    "users",
  ];

  const tables = db
    .prepare(
      `SELECT name FROM sqlite_master
       WHERE type = 'table'
       AND name IN (${expectedTables.map(() => "?").join(", ")})
       ORDER BY name`
    )
    .all(...expectedTables);

  const userCount = db.prepare("SELECT COUNT(*) AS count FROM users").get().count;
  const auditLogCount = db.prepare("SELECT COUNT(*) AS count FROM audit_logs").get().count;
  const pendingRiderCount = db
    .prepare("SELECT COUNT(*) AS count FROM rider_profiles WHERE approval_status = 'pending'")
    .get().count;
  const bookingCount = db.prepare("SELECT COUNT(*) AS count FROM bookings").get().count;
  const paymentProofCount = db.prepare("SELECT COUNT(*) AS count FROM payment_proofs").get().count;
  const riderOfferCount = db.prepare("SELECT COUNT(*) AS count FROM rider_job_offers").get().count;
  const tripEventCount = db.prepare("SELECT COUNT(*) AS count FROM trip_events").get().count;
  const careReportCount = db.prepare("SELECT COUNT(*) AS count FROM care_reports").get().count;
  const chatMessageCount = db.prepare("SELECT COUNT(*) AS count FROM chat_messages").get().count;

  console.log({
    databasePath: resolveDatabasePath(),
    tables: tables.map((table) => table.name),
    userCount,
    auditLogCount,
    pendingRiderCount,
    bookingCount,
    paymentProofCount,
    riderOfferCount,
    tripEventCount,
    careReportCount,
    chatMessageCount,
  });
}

if (require.main === module) {
  try {
    verifyDatabase();
  } finally {
    closeDatabase();
  }
}

module.exports = { verifyDatabase };

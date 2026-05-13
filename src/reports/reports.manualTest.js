const assert = require("assert");

process.env.JWT_SECRET = process.env.JWT_SECRET || "phase-28-local-test-secret";

const { createApp } = require("../app");
const { getDatabase, closeDatabase } = require("../db/connection");
const { resetDatabase } = require("../db/reset");

async function postJson(baseUrl, path, body, token) {
  return fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

async function getJson(baseUrl, path, token) {
  return fetch(`${baseUrl}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

async function login(baseUrl, identifier) {
  const response = await postJson(baseUrl, "/auth/login", {
    identifier,
    password: "Password123!",
  });
  const body = await response.json();

  assert.strictEqual(response.status, 200);
  return body.token;
}

function seedReportRows() {
  const db = getDatabase();
  const passengerId = db.prepare("SELECT id FROM users WHERE email = ?").get("passenger@jommakcik.local").id;
  const riderId = db.prepare("SELECT id FROM users WHERE email = ?").get("rider@jommakcik.local").id;

  db.prepare("UPDATE users SET status = 'active' WHERE id = ?").run(riderId);
  db.prepare(
    `UPDATE rider_profiles
     SET approval_status = 'approved',
         availability_status = 'available',
         deposit_balance = 5000
     WHERE user_id = ?`
  ).run(riderId);

  const completedBooking = db
    .prepare(
      `INSERT INTO bookings (
        passenger_id,
        dependent_name,
        passenger_category,
        service_type,
        pickup_address,
        destination_address,
        pickup_datetime,
        estimated_fare,
        status,
        assigned_rider_id,
        payment_status
       ) VALUES (?, 'Puan Report', 'senior', 'medical_appointment', 'Pickup A', 'Hospital A',
        '2026-05-20T10:00:00.000Z', 4500, 'COMPLETED', ?, 'verified')`
    )
    .run(passengerId, riderId).lastInsertRowid;

  const cancelledBooking = db
    .prepare(
      `INSERT INTO bookings (
        passenger_id,
        dependent_name,
        passenger_category,
        service_type,
        pickup_address,
        destination_address,
        pickup_datetime,
        estimated_fare,
        status,
        assigned_rider_id,
        payment_status
       ) VALUES (?, 'Encik Report', 'senior', 'physiotherapy', 'Pickup B', 'Clinic B',
        '2026-05-21T10:00:00.000Z', 3500, 'CANCELLED', ?, 'refund_pending')`
    )
    .run(passengerId, riderId).lastInsertRowid;

  db.prepare(
    `INSERT INTO payment_proofs (booking_id, passenger_id, amount, proof_file_url, status, verified_by)
     VALUES (?, ?, 4500, 'REPORT-APPROVED', 'approved', ?)`
  ).run(completedBooking, passengerId, riderId);

  db.prepare(
    `INSERT INTO payment_proofs (booking_id, passenger_id, amount, proof_file_url, status)
     VALUES (?, ?, 3500, 'REPORT-PENDING', 'pending')`
  ).run(cancelledBooking, passengerId);
}

async function expectReport(baseUrl, token, path, key) {
  const response = await getJson(baseUrl, path, token);
  const body = await response.json();

  assert.strictEqual(response.status, 200);
  assert.ok(Array.isArray(body[key]));
  assert.ok(body[key].length >= 1);

  return body[key];
}

async function runManualTest() {
  resetDatabase();
  seedReportRows();

  const app = createApp();
  const server = app.listen(0);
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const adminToken = await login(baseUrl, "superadmin@jommakcik.local");
    const passengerToken = await login(baseUrl, "passenger@jommakcik.local");

    const blockedResponse = await getJson(baseUrl, "/admin/reports/daily-bookings", passengerToken);
    assert.strictEqual(blockedResponse.status, 403);

    const dailyBookings = await expectReport(
      baseUrl,
      adminToken,
      "/admin/reports/daily-bookings",
      "dailyBookings"
    );
    const completedTrips = await expectReport(
      baseUrl,
      adminToken,
      "/admin/reports/completed-trips",
      "completedTrips"
    );
    const cancelledBookings = await expectReport(
      baseUrl,
      adminToken,
      "/admin/reports/cancelled-bookings",
      "cancelledBookings"
    );
    const paymentSummary = await expectReport(
      baseUrl,
      adminToken,
      "/admin/reports/payment-summary",
      "paymentSummary"
    );
    const riderCompletedTrips = await expectReport(
      baseUrl,
      adminToken,
      "/admin/reports/rider-completed-trips",
      "riderCompletedTrips"
    );

    assert.ok(dailyBookings[0].totalBookings >= 2);
    assert.strictEqual(completedTrips[0].estimatedFare, 4500);
    assert.strictEqual(cancelledBookings[0].paymentStatus, "refund_pending");
    assert.ok(paymentSummary.some((item) => item.status === "approved"));
    assert.strictEqual(riderCompletedTrips[0].completedTrips, 1);

    console.log({
      ok: true,
      reports: {
        dailyBookings: dailyBookings.length,
        completedTrips: completedTrips.length,
        cancelledBookings: cancelledBookings.length,
        paymentSummary: paymentSummary.length,
        riderCompletedTrips: riderCompletedTrips.length,
      },
    });
  } finally {
    await new Promise((resolve) => server.close(resolve));
    closeDatabase();
  }
}

if (require.main === module) {
  runManualTest().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = { runManualTest };

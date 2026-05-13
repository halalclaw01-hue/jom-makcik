const assert = require("assert");

process.env.JWT_SECRET = process.env.JWT_SECRET || "phase-11-local-test-secret";

const { createApp } = require("../app");
const { getDatabase, closeDatabase } = require("../db/connection");
const { resetDatabase } = require("../db/reset");
const { MINIMUM_RIDER_DEPOSIT_SEN } = require("../riders/riderService");

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

async function registerRider(baseUrl, suffix) {
  const response = await postJson(baseUrl, "/auth/register/rider", {
    name: `Trip Rider ${suffix}`,
    phone: `+6012666${suffix}`,
    email: `trip-rider-${suffix}@example.com`,
    password: "Password123!",
    icNumber: `920101-10-${suffix}`,
    licenseNumber: `T${suffix}`,
    vehicleModel: "Perodua Alza",
    vehiclePlate: `TRP${suffix}`,
  });
  const body = await response.json();

  assert.strictEqual(response.status, 201);
  return {
    id: body.user.id,
    token: body.token,
  };
}

function makeRiderEligible(riderId) {
  const db = getDatabase();

  db.prepare(
    `UPDATE rider_profiles
     SET approval_status = 'approved',
         availability_status = 'available',
         deposit_balance = ?
     WHERE user_id = ?`
  ).run(MINIMUM_RIDER_DEPOSIT_SEN, riderId);

  db.prepare("UPDATE users SET status = 'active', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(
    riderId
  );
}

async function createAssignedBooking(baseUrl, passengerToken, adminToken, riderToken) {
  const createResponse = await postJson(
    baseUrl,
    "/passenger/bookings",
    {
      passengerCategory: "senior",
      serviceType: "medical_appointment",
      pickupAddress: "Taman Melati, Kuala Lumpur",
      destinationAddress: "Hospital Kuala Lumpur",
      pickupDatetime: "2026-05-20T10:00:00.000Z",
      needsChaperone: true,
    },
    passengerToken
  );
  const createBody = await createResponse.json();
  assert.strictEqual(createResponse.status, 201);

  const bookingId = createBody.booking.id;

  assert.strictEqual(
    (await postJson(baseUrl, `/passenger/bookings/${bookingId}/confirm`, {}, passengerToken)).status,
    200
  );

  const proofResponse = await postJson(
    baseUrl,
    `/passenger/bookings/${bookingId}/payment-proof`,
    { amount: createBody.booking.estimatedFare, proofReference: "TRIP-STATUS-PROOF" },
    passengerToken
  );
  const proofBody = await proofResponse.json();
  assert.strictEqual(proofResponse.status, 201);

  const approveResponse = await postJson(
    baseUrl,
    `/admin/payment-proofs/${proofBody.paymentProof.id}/approve`,
    { adminNote: "Trip status test approval" },
    adminToken
  );
  assert.strictEqual(approveResponse.status, 200);

  const matchingResponse = await postJson(
    baseUrl,
    `/admin/bookings/${bookingId}/start-matching`,
    {},
    adminToken
  );
  assert.strictEqual(matchingResponse.status, 200);

  const offersResponse = await getJson(baseUrl, "/rider/job-offers", riderToken);
  const offersBody = await offersResponse.json();
  assert.strictEqual(offersResponse.status, 200);
  assert.strictEqual(offersBody.jobOffers.length, 1);

  const acceptResponse = await postJson(
    baseUrl,
    `/rider/job-offers/${offersBody.jobOffers[0].id}/accept`,
    {},
    riderToken
  );
  const acceptBody = await acceptResponse.json();
  assert.strictEqual(acceptResponse.status, 200);
  assert.strictEqual(acceptBody.booking.status, "ASSIGNED");

  return bookingId;
}

async function runManualTest() {
  resetDatabase();

  const app = createApp();
  const server = app.listen(0);
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const adminToken = await login(baseUrl, "superadmin@jommakcik.local");
    const passengerToken = await login(baseUrl, "passenger@jommakcik.local");
    const assignedRider = await registerRider(baseUrl, "3001");
    const otherRider = await registerRider(baseUrl, "3002");

    makeRiderEligible(assignedRider.id);
    makeRiderEligible(otherRider.id);

    const bookingId = await createAssignedBooking(
      baseUrl,
      passengerToken,
      adminToken,
      assignedRider.token
    );

    const wrongRiderStart = await postJson(
      baseUrl,
      `/rider/bookings/${bookingId}/start-trip`,
      {},
      otherRider.token
    );
    assert.strictEqual(wrongRiderStart.status, 404);

    const onTheWayResponse = await postJson(
      baseUrl,
      `/rider/bookings/${bookingId}/events`,
      { eventType: "on_the_way" },
      assignedRider.token
    );
    assert.strictEqual(onTheWayResponse.status, 201);

    const startTripResponse = await postJson(
      baseUrl,
      `/rider/bookings/${bookingId}/start-trip`,
      {},
      assignedRider.token
    );
    const startTripBody = await startTripResponse.json();
    assert.strictEqual(startTripResponse.status, 200);
    assert.strictEqual(startTripBody.booking.status, "IN_PROGRESS");
    assert.deepStrictEqual(
      startTripBody.tripEvents.map((event) => event.eventType),
      ["on_the_way", "arrived_pickup", "passenger_picked_up", "trip_started"]
    );

    const detailResponse = await getJson(baseUrl, `/rider/bookings/${bookingId}`, assignedRider.token);
    const detailBody = await detailResponse.json();
    assert.strictEqual(detailResponse.status, 200);
    assert.strictEqual(detailBody.booking.status, "IN_PROGRESS");
    assert.ok(detailBody.tripEvents.some((event) => event.eventType === "on_the_way"));

    const arrivedDestinationResponse = await postJson(
      baseUrl,
      `/rider/bookings/${bookingId}/events`,
      { eventType: "arrived_destination" },
      assignedRider.token
    );
    assert.strictEqual(arrivedDestinationResponse.status, 201);

    const passengerInProgressResponse = await getJson(
      baseUrl,
      `/passenger/bookings/${bookingId}`,
      passengerToken
    );
    const passengerInProgressBody = await passengerInProgressResponse.json();
    assert.strictEqual(passengerInProgressResponse.status, 200);
    assert.strictEqual(passengerInProgressBody.booking.status, "IN_PROGRESS");

    const completeTripResponse = await postJson(
      baseUrl,
      `/rider/bookings/${bookingId}/complete-trip`,
      {},
      assignedRider.token
    );
    const completeTripBody = await completeTripResponse.json();
    assert.strictEqual(completeTripResponse.status, 200);
    assert.strictEqual(completeTripBody.booking.status, "COMPLETED");
    assert.deepStrictEqual(
      completeTripBody.tripEvents.map((event) => event.eventType),
      ["arrived_destination", "completed"]
    );

    const adminEventsResponse = await getJson(baseUrl, "/admin/trip-events", adminToken);
    const adminEventsBody = await adminEventsResponse.json();
    assert.strictEqual(adminEventsResponse.status, 200);
    assert.strictEqual(adminEventsBody.tripEvents.length, 6);

    const auditCount = getDatabase()
      .prepare(
        `SELECT COUNT(*) AS count FROM audit_logs
         WHERE action IN ('trip_started', 'trip_completed')`
      )
      .get().count;
    assert.strictEqual(auditCount, 2);

    console.log({
      ok: true,
      bookingId,
      startStatus: "IN_PROGRESS",
      completeStatus: "COMPLETED",
      tripEventCount: adminEventsBody.tripEvents.length,
      wrongRiderBlockedWith: 404,
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

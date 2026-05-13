const assert = require("assert");

process.env.JWT_SECRET = process.env.JWT_SECRET || "phase-15-local-test-secret";

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

async function registerRider(baseUrl, suffix = "5555") {
  const response = await postJson(baseUrl, "/auth/register/rider", {
    name: `Manual Assign Rider ${suffix}`,
    phone: `+6012111${suffix}`,
    email: `manual-assign-rider-${suffix}@example.com`,
    password: "Password123!",
    icNumber: `950101-10-${suffix}`,
    licenseNumber: `MA${suffix}`,
    vehicleModel: "Perodua Alza",
    vehiclePlate: `ADM${suffix}`,
  });
  const body = await response.json();

  assert.strictEqual(response.status, 201);
  return body.user.id;
}

function makeRiderApprovedUnavailable(riderId) {
  const db = getDatabase();

  db.prepare(
    `UPDATE rider_profiles
     SET approval_status = 'approved',
         availability_status = 'unavailable',
         deposit_balance = ?
     WHERE user_id = ?`
  ).run(MINIMUM_RIDER_DEPOSIT_SEN, riderId);

  db.prepare("UPDATE users SET status = 'active', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(
    riderId
  );
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

async function createPaidBooking(baseUrl, passengerToken, adminToken, suffix) {
  const createResponse = await postJson(
    baseUrl,
    "/passenger/bookings",
    {
      passengerCategory: "senior",
      serviceType: "medical_appointment",
      pickupAddress: `Pickup ${suffix}`,
      destinationAddress: `Destination ${suffix}`,
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
    { amount: createBody.booking.estimatedFare, proofReference: `ADMIN-BOOKING-${suffix}` },
    passengerToken
  );
  const proofBody = await proofResponse.json();
  assert.strictEqual(proofResponse.status, 201);

  const approveResponse = await postJson(
    baseUrl,
    `/admin/payment-proofs/${proofBody.paymentProof.id}/approve`,
    { adminNote: "Admin booking test approval" },
    adminToken
  );
  assert.strictEqual(approveResponse.status, 200);

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
    const riderId = await registerRider(baseUrl, "5555");
    makeRiderEligible(riderId);
    const pendingRiderId = await registerRider(baseUrl, "6666");
    const unavailableRiderId = await registerRider(baseUrl, "7777");
    makeRiderApprovedUnavailable(unavailableRiderId);

    const assignBookingId = await createPaidBooking(baseUrl, passengerToken, adminToken, "assign");
    const refundBookingId = await createPaidBooking(baseUrl, passengerToken, adminToken, "refund");
    const slaBookingId = await createPaidBooking(baseUrl, passengerToken, adminToken, "sla");
    const overrideBookingId = await createPaidBooking(baseUrl, passengerToken, adminToken, "override");

    const listResponse = await getJson(baseUrl, "/admin/bookings?status=PAID", adminToken);
    const listBody = await listResponse.json();
    assert.strictEqual(listResponse.status, 200);
    assert.ok(listBody.bookings.length >= 2);

    const detailResponse = await getJson(baseUrl, `/admin/bookings/${assignBookingId}`, adminToken);
    const detailBody = await detailResponse.json();
    assert.strictEqual(detailResponse.status, 200);
    assert.strictEqual(detailBody.booking.passengerName, "Test Passenger");
    assert.ok(Array.isArray(detailBody.statusHistory));

    const matchingResponse = await postJson(
      baseUrl,
      `/admin/bookings/${assignBookingId}/start-matching`,
      {},
      adminToken
    );
    assert.strictEqual(matchingResponse.status, 200);

    const queueResponse = await getJson(baseUrl, "/admin/bookings/matching-queue", adminToken);
    const queueBody = await queueResponse.json();
    assert.strictEqual(queueResponse.status, 200);
    assert.ok(queueBody.matchingBookings.some((booking) => booking.id === assignBookingId));
    assert.ok(queueBody.paidBookings.some((booking) => booking.id === refundBookingId));

    const candidatesResponse = await getJson(
      baseUrl,
      `/admin/bookings/${assignBookingId}/matching-riders`,
      adminToken
    );
    const candidatesBody = await candidatesResponse.json();
    assert.strictEqual(candidatesResponse.status, 200);
    assert.ok(candidatesBody.riders.some((rider) => rider.id === riderId));
    assert.ok(candidatesBody.riders.some((rider) => rider.id === unavailableRiderId));
    assert.ok(!candidatesBody.riders.some((rider) => rider.id === pendingRiderId));

    const unapprovedAssignResponse = await postJson(
      baseUrl,
      `/admin/bookings/${assignBookingId}/assign-rider`,
      { riderId: pendingRiderId, reason: "Should not assign unapproved rider" },
      adminToken
    );
    assert.strictEqual(unapprovedAssignResponse.status, 400);

    const unavailableWithoutOverrideResponse = await postJson(
      baseUrl,
      `/admin/bookings/${assignBookingId}/assign-rider`,
      { riderId: unavailableRiderId, reason: "Missing override reason" },
      adminToken
    );
    assert.strictEqual(unavailableWithoutOverrideResponse.status, 400);

    const assignResponse = await postJson(
      baseUrl,
      `/admin/bookings/${assignBookingId}/assign-rider`,
      { riderId, reason: "Manual admin assignment test" },
      adminToken
    );
    const assignBody = await assignResponse.json();
    assert.strictEqual(assignResponse.status, 200);
    assert.strictEqual(assignBody.booking.status, "ASSIGNED");
    assert.strictEqual(assignBody.booking.assignedRiderId, riderId);

    assert.strictEqual(
      (await postJson(baseUrl, `/admin/bookings/${overrideBookingId}/start-matching`, {}, adminToken))
        .status,
      200
    );

    const overrideAssignResponse = await postJson(
      baseUrl,
      `/admin/bookings/${overrideBookingId}/assign-rider`,
      {
        riderId: unavailableRiderId,
        reason: "Passenger care continuity",
        overrideReason: "Rider confirmed availability by phone for this controlled booking",
      },
      adminToken
    );
    const overrideAssignBody = await overrideAssignResponse.json();
    assert.strictEqual(overrideAssignResponse.status, 200);
    assert.strictEqual(overrideAssignBody.booking.status, "ASSIGNED");
    assert.strictEqual(overrideAssignBody.booking.assignedRiderId, unavailableRiderId);

    const cancelResponse = await postJson(
      baseUrl,
      `/admin/bookings/${assignBookingId}/cancel`,
      { reason: "Manual admin cancellation test" },
      adminToken
    );
    const cancelBody = await cancelResponse.json();
    assert.strictEqual(cancelResponse.status, 200);
    assert.strictEqual(cancelBody.booking.status, "CANCELLED");

    assert.strictEqual(
      (await postJson(baseUrl, `/admin/bookings/${slaBookingId}/start-matching`, {}, adminToken))
        .status,
      200
    );

    const slaResponse = await postJson(
      baseUrl,
      `/admin/bookings/${slaBookingId}/sla-failed`,
      { reason: "No suitable rider accepted within MVP SLA window" },
      adminToken
    );
    const slaBody = await slaResponse.json();
    assert.strictEqual(slaResponse.status, 200);
    assert.strictEqual(slaBody.booking.status, "SLA_FAILED");

    const pendingOfferCount = getDatabase()
      .prepare(
        `SELECT COUNT(*) AS count FROM rider_job_offers
         WHERE booking_id = ? AND offer_status = 'pending'`
      )
      .get(slaBookingId).count;
    assert.strictEqual(pendingOfferCount, 0);

    const refundResponse = await postJson(
      baseUrl,
      `/admin/bookings/${refundBookingId}/refund-pending`,
      { reason: "Manual admin refund test" },
      adminToken
    );
    const refundBody = await refundResponse.json();
    assert.strictEqual(refundResponse.status, 200);
    assert.strictEqual(refundBody.booking.status, "REFUND_PENDING");
    assert.strictEqual(refundBody.booking.paymentStatus, "refund_pending");

    console.log({
      ok: true,
      assignBookingId,
      refundBookingId,
      slaBookingId,
      overrideBookingId,
      assignedRiderId: riderId,
      unavailableOverrideRiderId: unavailableRiderId,
      cancelStatus: cancelBody.booking.status,
      slaStatus: slaBody.booking.status,
      refundStatus: refundBody.booking.status,
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

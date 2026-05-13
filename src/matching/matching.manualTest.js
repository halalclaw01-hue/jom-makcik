const assert = require("assert");

process.env.JWT_SECRET = process.env.JWT_SECRET || "phase-10-local-test-secret";

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
    name: `Matching Rider ${suffix}`,
    phone: `+6012999${suffix}`,
    email: `matching-rider-${suffix}@example.com`,
    password: "Password123!",
    icNumber: `910101-10-${suffix}`,
    licenseNumber: `M${suffix}`,
    vehicleModel: "Perodua Alza",
    vehiclePlate: `MAT${suffix}`,
  });
  const body = await response.json();

  assert.strictEqual(response.status, 201);
  return {
    id: body.user.id,
    token: body.token,
  };
}

async function createPaidBooking(baseUrl, passengerToken, adminToken) {
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

  const confirmResponse = await postJson(
    baseUrl,
    `/passenger/bookings/${bookingId}/confirm`,
    {},
    passengerToken
  );
  assert.strictEqual(confirmResponse.status, 200);

  const proofResponse = await postJson(
    baseUrl,
    `/passenger/bookings/${bookingId}/payment-proof`,
    { amount: createBody.booking.estimatedFare, proofReference: `MATCHING-PROOF-${bookingId}` },
    passengerToken
  );
  const proofBody = await proofResponse.json();
  assert.strictEqual(proofResponse.status, 201);

  const approveResponse = await postJson(
    baseUrl,
    `/admin/payment-proofs/${proofBody.paymentProof.id}/approve`,
    { adminNote: "Manual matching test payment approval" },
    adminToken
  );
  const approveBody = await approveResponse.json();
  assert.strictEqual(approveResponse.status, 200);
  assert.strictEqual(approveBody.bookingStatus, "PAID");

  return bookingId;
}

function makeRiderEligible(riderId) {
  getDatabase()
    .prepare(
      `UPDATE rider_profiles
       SET approval_status = 'approved',
           availability_status = 'available',
           deposit_balance = ?
       WHERE user_id = ?`
    )
    .run(MINIMUM_RIDER_DEPOSIT_SEN, riderId);

  getDatabase()
    .prepare("UPDATE users SET status = 'active', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
    .run(riderId);
}

async function runManualTest() {
  resetDatabase();

  const app = createApp();
  const server = app.listen(0);
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const adminToken = await login(baseUrl, "superadmin@jommakcik.local");
    const passengerToken = await login(baseUrl, "passenger@jommakcik.local");
    const riderOne = await registerRider(baseUrl, "2001");
    const riderTwo = await registerRider(baseUrl, "2002");
    const pendingRider = await registerRider(baseUrl, "2003");

    makeRiderEligible(riderOne.id);
    makeRiderEligible(riderTwo.id);

    assert.strictEqual(
      (
        await postJson(
          baseUrl,
          "/rider/availability",
          { availabilityStatus: "available" },
          pendingRider.token
        )
      ).status,
      403
    );

    const availabilityResponse = await postJson(
      baseUrl,
      "/rider/availability",
      { availabilityStatus: "available" },
      riderOne.token
    );
    assert.strictEqual(availabilityResponse.status, 200);

    const bookingId = await createPaidBooking(baseUrl, passengerToken, adminToken);

    const passengerStartMatching = await postJson(
      baseUrl,
      `/admin/bookings/${bookingId}/start-matching`,
      {},
      passengerToken
    );
    assert.strictEqual(passengerStartMatching.status, 403);

    const startMatchingResponse = await postJson(
      baseUrl,
      `/admin/bookings/${bookingId}/start-matching`,
      {},
      adminToken
    );
    const startMatchingBody = await startMatchingResponse.json();
    assert.strictEqual(startMatchingResponse.status, 200);
    assert.strictEqual(startMatchingBody.booking.status, "MATCHING");
    assert.strictEqual(startMatchingBody.eligibleRiderCount, 2);

    const riderOneOffersResponse = await getJson(baseUrl, "/rider/job-offers", riderOne.token);
    const riderOneOffersBody = await riderOneOffersResponse.json();
    assert.strictEqual(riderOneOffersResponse.status, 200);
    assert.strictEqual(riderOneOffersBody.jobOffers.length, 1);

    const riderTwoOffersResponse = await getJson(baseUrl, "/rider/job-offers", riderTwo.token);
    const riderTwoOffersBody = await riderTwoOffersResponse.json();
    assert.strictEqual(riderTwoOffersResponse.status, 200);
    assert.strictEqual(riderTwoOffersBody.jobOffers.length, 1);

    const injectedPendingOffer = getDatabase()
      .prepare(
        `INSERT INTO rider_job_offers (booking_id, rider_id, offer_status)
         VALUES (?, ?, 'pending')`
      )
      .run(bookingId, pendingRider.id).lastInsertRowid;
    const blockedAcceptResponse = await postJson(
      baseUrl,
      `/rider/job-offers/${injectedPendingOffer}/accept`,
      {},
      pendingRider.token
    );
    assert.strictEqual(blockedAcceptResponse.status, 403);

    const rejectResponse = await postJson(
      baseUrl,
      `/rider/job-offers/${riderOneOffersBody.jobOffers[0].id}/reject`,
      {},
      riderOne.token
    );
    const rejectBody = await rejectResponse.json();
    assert.strictEqual(rejectResponse.status, 200);
    assert.strictEqual(rejectBody.offer.offerStatus, "rejected");
    assert.strictEqual(rejectBody.bookingRemainsMatching, true);

    const acceptResponse = await postJson(
      baseUrl,
      `/rider/job-offers/${riderTwoOffersBody.jobOffers[0].id}/accept`,
      {},
      riderTwo.token
    );
    const acceptBody = await acceptResponse.json();
    assert.strictEqual(acceptResponse.status, 200);
    assert.strictEqual(acceptBody.offer.offerStatus, "accepted");
    assert.strictEqual(acceptBody.booking.status, "ASSIGNED");
    assert.strictEqual(acceptBody.booking.assigned_rider_id, riderTwo.id);

    const secondAcceptResponse = await postJson(
      baseUrl,
      `/rider/job-offers/${riderOneOffersBody.jobOffers[0].id}/accept`,
      {},
      riderOne.token
    );
    assert.strictEqual(secondAcceptResponse.status, 404);

    const assignedTripsResponse = await getJson(baseUrl, "/rider/bookings/assigned", riderTwo.token);
    const assignedTripsBody = await assignedTripsResponse.json();
    assert.strictEqual(assignedTripsResponse.status, 200);
    assert.strictEqual(assignedTripsBody.assignedTrips.length, 1);
    assert.strictEqual(assignedTripsBody.assignedTrips[0].id, bookingId);

    const acceptedCount = getDatabase()
      .prepare(
        `SELECT COUNT(*) AS count FROM rider_job_offers
         WHERE booking_id = ? AND offer_status = 'accepted'`
      )
      .get(bookingId).count;
    assert.strictEqual(acceptedCount, 1);

    const auditCount = getDatabase()
      .prepare(
        `SELECT COUNT(*) AS count FROM audit_logs
         WHERE action IN ('matching_started', 'job_offer_rejected', 'job_offer_accepted')`
      )
      .get().count;
    assert.strictEqual(auditCount, 3);

    console.log({
      ok: true,
      bookingId,
      matchingStatus: "MATCHING",
      assignedStatus: "ASSIGNED",
      eligibleRiderCount: startMatchingBody.eligibleRiderCount,
      acceptedOfferCount: acceptedCount,
      assignedTripCount: assignedTripsBody.assignedTrips.length,
      passengerAdminAccessBlockedWith: 403,
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

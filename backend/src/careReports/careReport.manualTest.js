const assert = require("assert");

process.env.JWT_SECRET = process.env.JWT_SECRET || "phase-13-local-test-secret";

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
    name: `Care Rider ${suffix}`,
    phone: `+6012333${suffix}`,
    email: `care-rider-${suffix}@example.com`,
    password: "Password123!",
    icNumber: `940101-10-${suffix}`,
    licenseNumber: `CR${suffix}`,
    vehicleModel: "Perodua Alza",
    vehiclePlate: `CAR${suffix}`,
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

async function createCompletedBooking(baseUrl, passengerToken, adminToken, riderToken) {
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
    { amount: createBody.booking.estimatedFare, proofReference: "CARE-REPORT-PROOF" },
    passengerToken
  );
  const proofBody = await proofResponse.json();
  assert.strictEqual(proofResponse.status, 201);

  assert.strictEqual(
    (
      await postJson(
        baseUrl,
        `/admin/payment-proofs/${proofBody.paymentProof.id}/approve`,
        { adminNote: "Care report test payment approval" },
        adminToken
      )
    ).status,
    200
  );

  assert.strictEqual(
    (await postJson(baseUrl, `/admin/bookings/${bookingId}/start-matching`, {}, adminToken)).status,
    200
  );

  const offersResponse = await getJson(baseUrl, "/rider/job-offers", riderToken);
  const offersBody = await offersResponse.json();
  assert.strictEqual(offersResponse.status, 200);
  assert.strictEqual(offersBody.jobOffers.length, 1);

  assert.strictEqual(
    (
      await postJson(
        baseUrl,
        `/rider/job-offers/${offersBody.jobOffers[0].id}/accept`,
        {},
        riderToken
      )
    ).status,
    200
  );

  assert.strictEqual(
    (await postJson(baseUrl, `/rider/bookings/${bookingId}/start-trip`, {}, riderToken)).status,
    200
  );
  assert.strictEqual(
    (await postJson(baseUrl, `/rider/bookings/${bookingId}/complete-trip`, {}, riderToken)).status,
    200
  );

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
    const assignedRider = await registerRider(baseUrl, "4001");
    const otherRider = await registerRider(baseUrl, "4002");

    makeRiderEligible(assignedRider.id);
    makeRiderEligible(otherRider.id);

    const bookingId = await createCompletedBooking(
      baseUrl,
      passengerToken,
      adminToken,
      assignedRider.token
    );

    const wrongRiderReport = await postJson(
      baseUrl,
      `/rider/bookings/${bookingId}/care-report`,
      {
        arrivedSafely: true,
        assistanceGiven: "Wheelchair assistance",
        handoverNotes: "Handover to daughter",
        medicationOrDocumentNotes: "Appointment card returned",
        summary: "Wrong rider should not submit this.",
      },
      otherRider.token
    );
    assert.strictEqual(wrongRiderReport.status, 404);

    const submitResponse = await postJson(
      baseUrl,
      `/rider/bookings/${bookingId}/care-report`,
      {
        arrivedSafely: true,
        assistanceGiven: "Wheelchair assistance from lobby to clinic.",
        handoverNotes: "Passenger handed over to daughter at destination.",
        medicationOrDocumentNotes: "Appointment card and medication list returned.",
        summary: "Trip completed safely with basic mobility assistance.",
      },
      assignedRider.token
    );
    const submitBody = await submitResponse.json();
    assert.strictEqual(submitResponse.status, 201);
    assert.strictEqual(submitBody.careReport.arrivedSafely, true);
    assert.strictEqual(submitBody.careReport.adminApproved, false);

    const passengerViewResponse = await getJson(
      baseUrl,
      `/passenger/bookings/${bookingId}/care-report`,
      passengerToken
    );
    const passengerViewBody = await passengerViewResponse.json();
    assert.strictEqual(passengerViewResponse.status, 200);
    assert.strictEqual(passengerViewBody.careReport.id, submitBody.careReport.id);

    const adminListResponse = await getJson(baseUrl, "/admin/care-reports", adminToken);
    const adminListBody = await adminListResponse.json();
    assert.strictEqual(adminListResponse.status, 200);
    assert.strictEqual(adminListBody.careReports.length, 1);

    const approveResponse = await postJson(
      baseUrl,
      `/admin/care-reports/${submitBody.careReport.id}/approve`,
      {},
      adminToken
    );
    const approveBody = await approveResponse.json();
    assert.strictEqual(approveResponse.status, 200);
    assert.strictEqual(approveBody.careReport.adminApproved, true);

    const duplicateResponse = await postJson(
      baseUrl,
      `/rider/bookings/${bookingId}/care-report`,
      {
        arrivedSafely: true,
        assistanceGiven: "Duplicate",
        summary: "Duplicate should fail.",
      },
      assignedRider.token
    );
    assert.strictEqual(duplicateResponse.status, 409);

    const auditCount = getDatabase()
      .prepare(
        `SELECT COUNT(*) AS count FROM audit_logs
         WHERE action IN ('care_report_submitted', 'care_report_approved')`
      )
      .get().count;
    assert.strictEqual(auditCount, 2);

    console.log({
      ok: true,
      bookingId,
      careReportId: submitBody.careReport.id,
      passengerCanView: true,
      adminApproved: true,
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

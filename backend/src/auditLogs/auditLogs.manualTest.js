const assert = require("assert");

process.env.JWT_SECRET = process.env.JWT_SECRET || "phase-29-local-test-secret";

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
    name: `Audit Rider ${suffix}`,
    phone: `+6012444${suffix}`,
    email: `audit-rider-${suffix}@example.com`,
    password: "Password123!",
    icNumber: `960101-10-${suffix}`,
    licenseNumber: `AUD${suffix}`,
    vehicleModel: "Perodua Alza",
    vehiclePlate: `AUD${suffix}`,
  });
  const body = await response.json();

  assert.strictEqual(response.status, 201);
  return body.user.id;
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

async function createPaidBooking(baseUrl, passengerToken, adminToken) {
  const createResponse = await postJson(
    baseUrl,
    "/passenger/bookings",
    {
      passengerCategory: "senior",
      serviceType: "medical_appointment",
      pickupAddress: "Audit Pickup",
      destinationAddress: "Audit Hospital",
      pickupDatetime: "2026-05-22T10:00:00.000Z",
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
    { amount: createBody.booking.estimatedFare, proofReference: "AUDIT-PROOF" },
    passengerToken
  );
  const proofBody = await proofResponse.json();
  assert.strictEqual(proofResponse.status, 201);

  assert.strictEqual(
    (
      await postJson(
        baseUrl,
        `/admin/payment-proofs/${proofBody.paymentProof.id}/approve`,
        { adminNote: "Audit approval" },
        adminToken
      )
    ).status,
    200
  );

  return bookingId;
}

function assertAuditActions(actions) {
  const db = getDatabase();
  const placeholders = actions.map(() => "?").join(", ");
  const found = db
    .prepare(`SELECT action FROM audit_logs WHERE action IN (${placeholders}) GROUP BY action`)
    .all(...actions)
    .map((row) => row.action);

  actions.forEach((action) => {
    assert.ok(found.includes(action), `Missing audit action: ${action}`);
  });
}

async function runManualTest() {
  resetDatabase();

  const app = createApp();
  const server = app.listen(0);
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const failedLogin = await postJson(baseUrl, "/auth/login", {
      identifier: "superadmin@jommakcik.local",
      password: "wrong-password",
    });
    assert.strictEqual(failedLogin.status, 401);

    const adminToken = await login(baseUrl, "superadmin@jommakcik.local");
    const passengerToken = await login(baseUrl, "passenger@jommakcik.local");

    const rejectedProofBookingId = await createPaidBooking(baseUrl, passengerToken, adminToken);
    const rejectCreateResponse = await postJson(
      baseUrl,
      "/passenger/bookings",
      {
        passengerCategory: "senior",
        serviceType: "physiotherapy",
        pickupAddress: "Reject Pickup",
        destinationAddress: "Reject Clinic",
        pickupDatetime: "2026-05-23T10:00:00.000Z",
        needsChaperone: false,
      },
      passengerToken
    );
    const rejectCreateBody = await rejectCreateResponse.json();
    assert.strictEqual(rejectCreateResponse.status, 201);
    const rejectBookingId = rejectCreateBody.booking.id;
    assert.strictEqual(
      (await postJson(baseUrl, `/passenger/bookings/${rejectBookingId}/confirm`, {}, passengerToken))
        .status,
      200
    );
    const rejectProofResponse = await postJson(
      baseUrl,
      `/passenger/bookings/${rejectBookingId}/payment-proof`,
      { amount: rejectCreateBody.booking.estimatedFare, proofReference: "AUDIT-REJECT-PROOF" },
      passengerToken
    );
    const rejectProofBody = await rejectProofResponse.json();
    assert.strictEqual(rejectProofResponse.status, 201);
    assert.strictEqual(
      (
        await postJson(
          baseUrl,
          `/admin/payment-proofs/${rejectProofBody.paymentProof.id}/reject`,
          { adminNote: "Audit rejection" },
          adminToken
        )
      ).status,
      200
    );

    const riderId = await registerRider(baseUrl, "9101");
    assert.strictEqual(
      (await postJson(baseUrl, `/admin/riders/${riderId}/approve`, { adminNote: "Audit rider approval" }, adminToken))
        .status,
      200
    );
    assert.strictEqual(
      (await postJson(baseUrl, `/admin/riders/${riderId}/suspend`, { adminNote: "Audit rider suspension" }, adminToken))
        .status,
      200
    );
    makeRiderEligible(riderId);

    assert.strictEqual(
      (await postJson(baseUrl, `/admin/bookings/${rejectedProofBookingId}/start-matching`, {}, adminToken))
        .status,
      200
    );
    assert.strictEqual(
      (
        await postJson(
          baseUrl,
          `/admin/bookings/${rejectedProofBookingId}/assign-rider`,
          { riderId, reason: "Audit manual rider assignment" },
          adminToken
        )
      ).status,
      200
    );
    assert.strictEqual(
      (
        await postJson(
          baseUrl,
          `/admin/bookings/${rejectedProofBookingId}/cancel`,
          { reason: "Audit cancellation" },
          adminToken
        )
      ).status,
      200
    );

    const refundBookingId = await createPaidBooking(baseUrl, passengerToken, adminToken);
    assert.strictEqual(
      (
        await postJson(
          baseUrl,
          `/admin/bookings/${refundBookingId}/refund-pending`,
          { reason: "Audit refund pending" },
          adminToken
        )
      ).status,
      200
    );

    assertAuditActions([
      "auth_login_failed",
      "payment_proof_approved",
      "payment_proof_rejected",
      "rider_approved",
      "rider_suspended",
      "booking_status_updated",
      "booking_rider_manually_assigned",
      "booking_refund_pending_by_admin",
      "booking_cancelled_by_admin",
    ]);

    const blockedAuditResponse = await getJson(baseUrl, "/admin/audit-logs", passengerToken);
    assert.strictEqual(blockedAuditResponse.status, 403);

    const auditResponse = await getJson(baseUrl, "/admin/audit-logs?action=payment_proof", adminToken);
    const auditBody = await auditResponse.json();
    assert.strictEqual(auditResponse.status, 200);
    assert.ok(auditBody.auditLogs.length >= 2);
    assert.ok(auditBody.auditLogs.every((log) => log.action.includes("payment_proof")));

    console.log({
      ok: true,
      checkedActions: 9,
      filteredAuditLogs: auditBody.auditLogs.length,
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

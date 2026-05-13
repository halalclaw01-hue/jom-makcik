const assert = require("assert");

process.env.JWT_SECRET = process.env.JWT_SECRET || "phase-8-local-test-secret";

const { createApp } = require("../app");
const { closeDatabase } = require("../db/connection");
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

async function createPaymentPendingBooking(baseUrl, passengerToken) {
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

  const confirmResponse = await postJson(
    baseUrl,
    `/passenger/bookings/${createBody.booking.id}/confirm`,
    {},
    passengerToken
  );
  const confirmBody = await confirmResponse.json();
  assert.strictEqual(confirmResponse.status, 200);
  assert.strictEqual(confirmBody.booking.status, "PAYMENT_PENDING");

  return createBody.booking.id;
}

async function runManualTest() {
  resetDatabase();

  const app = createApp();
  const server = app.listen(0);
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const passengerToken = await login(baseUrl, "passenger@jommakcik.local");
    const adminToken = await login(baseUrl, "superadmin@jommakcik.local");

    const adminBlockedForPassenger = await getJson(
      baseUrl,
      "/admin/payment-proofs/pending",
      passengerToken
    );
    assert.strictEqual(adminBlockedForPassenger.status, 403);

    const approveBookingId = await createPaymentPendingBooking(baseUrl, passengerToken);
    const approveProofResponse = await postJson(
      baseUrl,
      `/passenger/bookings/${approveBookingId}/payment-proof`,
      { amount: 7000, proofReference: "LOCAL-MVP-RECEIPT-APPROVE" },
      passengerToken
    );
    const approveProofBody = await approveProofResponse.json();
    assert.strictEqual(approveProofResponse.status, 201);
    assert.strictEqual(approveProofBody.paymentProof.status, "pending");

    const pendingResponse = await getJson(baseUrl, "/admin/payment-proofs/pending", adminToken);
    const pendingBody = await pendingResponse.json();
    assert.strictEqual(pendingResponse.status, 200);
    assert.strictEqual(pendingBody.paymentProofs.length, 1);

    const approveResponse = await postJson(
      baseUrl,
      `/admin/payment-proofs/${approveProofBody.paymentProof.id}/approve`,
      { adminNote: "Manual test approved" },
      adminToken
    );
    const approveBody = await approveResponse.json();
    assert.strictEqual(approveResponse.status, 200);
    assert.strictEqual(approveBody.paymentProof.status, "approved");
    assert.strictEqual(approveBody.bookingStatus, "PAID");

    const rejectBookingId = await createPaymentPendingBooking(baseUrl, passengerToken);
    const rejectProofResponse = await postJson(
      baseUrl,
      `/passenger/bookings/${rejectBookingId}/payment-proof`,
      { amount: 7000, proofReference: "LOCAL-MVP-RECEIPT-REJECT" },
      passengerToken
    );
    const rejectProofBody = await rejectProofResponse.json();
    assert.strictEqual(rejectProofResponse.status, 201);

    const rejectResponse = await postJson(
      baseUrl,
      `/admin/payment-proofs/${rejectProofBody.paymentProof.id}/reject`,
      { adminNote: "Reference does not match bank transfer" },
      adminToken
    );
    const rejectBody = await rejectResponse.json();
    assert.strictEqual(rejectResponse.status, 200);
    assert.strictEqual(rejectBody.paymentProof.status, "rejected");
    assert.strictEqual(rejectBody.bookingStatus, "PAYMENT_PENDING");

    const historyResponse = await getJson(baseUrl, "/admin/payment-proofs/history", adminToken);
    const historyBody = await historyResponse.json();
    assert.strictEqual(historyResponse.status, 200);
    assert.strictEqual(historyBody.paymentProofs.length, 2);
    assert.deepStrictEqual(
      historyBody.paymentProofs.map((proof) => proof.status).sort(),
      ["approved", "rejected"]
    );

    console.log({
      ok: true,
      approvedProofId: approveProofBody.paymentProof.id,
      approvedBookingStatus: approveBody.bookingStatus,
      rejectedProofId: rejectProofBody.paymentProof.id,
      rejectedBookingStatus: rejectBody.bookingStatus,
      paymentHistoryCount: historyBody.paymentProofs.length,
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

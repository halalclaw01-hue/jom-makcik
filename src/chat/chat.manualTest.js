const assert = require("assert");

process.env.JWT_SECRET = process.env.JWT_SECRET || "phase-12-local-test-secret";

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

async function registerPassenger(baseUrl) {
  const response = await postJson(baseUrl, "/auth/register/passenger", {
    name: "Unrelated Passenger",
    phone: "+60125551234",
    email: "unrelated-passenger@example.com",
    password: "Password123!",
    emergencyContactName: "Family",
    emergencyContactPhone: "+60125554321",
  });
  const body = await response.json();

  assert.strictEqual(response.status, 201);
  return body.token;
}

async function registerRider(baseUrl) {
  const response = await postJson(baseUrl, "/auth/register/rider", {
    name: "Chat Rider",
    phone: "+60124440001",
    email: "chat-rider@example.com",
    password: "Password123!",
    icNumber: "930101-10-0001",
    licenseNumber: "C10001",
    vehicleModel: "Perodua Alza",
    vehiclePlate: "CHAT1",
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
    { amount: createBody.booking.estimatedFare, proofReference: "CHAT-PROOF" },
    passengerToken
  );
  const proofBody = await proofResponse.json();
  assert.strictEqual(proofResponse.status, 201);

  assert.strictEqual(
    (
      await postJson(
        baseUrl,
        `/admin/payment-proofs/${proofBody.paymentProof.id}/approve`,
        { adminNote: "Chat test approval" },
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
    const unrelatedPassengerToken = await registerPassenger(baseUrl);
    const rider = await registerRider(baseUrl);
    makeRiderEligible(rider.id);

    const bookingId = await createAssignedBooking(baseUrl, passengerToken, adminToken, rider.token);

    const passengerMessage = await postJson(
      baseUrl,
      `/bookings/${bookingId}/chat`,
      { message: "Hello rider, I am at the pickup lobby." },
      passengerToken
    );
    assert.strictEqual(passengerMessage.status, 201);

    const riderMessage = await postJson(
      baseUrl,
      `/bookings/${bookingId}/chat`,
      { message: "I can see the entrance. Arriving now." },
      rider.token
    );
    assert.strictEqual(riderMessage.status, 201);

    const adminMessage = await postJson(
      baseUrl,
      `/bookings/${bookingId}/chat`,
      { message: "Admin monitoring: please keep updates clear." },
      adminToken
    );
    assert.strictEqual(adminMessage.status, 201);

    const unrelatedRead = await getJson(
      baseUrl,
      `/bookings/${bookingId}/chat`,
      unrelatedPassengerToken
    );
    assert.strictEqual(unrelatedRead.status, 404);

    const unrelatedMonitor = await getJson(baseUrl, "/bookings/admin/monitor", unrelatedPassengerToken);
    assert.strictEqual(unrelatedMonitor.status, 403);

    const passengerRead = await getJson(baseUrl, `/bookings/${bookingId}/chat`, passengerToken);
    const passengerReadBody = await passengerRead.json();
    assert.strictEqual(passengerRead.status, 200);
    assert.strictEqual(passengerReadBody.chatMessages.length, 3);

    const monitorRead = await getJson(baseUrl, "/bookings/admin/monitor", adminToken);
    const monitorReadBody = await monitorRead.json();
    assert.strictEqual(monitorRead.status, 200);
    assert.ok(monitorReadBody.chats.some((chat) => chat.bookingId === bookingId));

    const adminRead = await getJson(baseUrl, `/bookings/${bookingId}/chat`, adminToken);
    const adminReadBody = await adminRead.json();
    assert.strictEqual(adminRead.status, 200);
    assert.deepStrictEqual(
      adminReadBody.chatMessages.map((message) => message.senderRole),
      ["passenger", "rider", "super_admin"]
    );

    const noteResponse = await postJson(
      baseUrl,
      `/bookings/${bookingId}/admin-note`,
      { note: "Internal admin note: family member called to confirm location." },
      adminToken
    );
    assert.strictEqual(noteResponse.status, 201);

    const noteAuditCount = getDatabase()
      .prepare(
        `SELECT COUNT(*) AS count FROM audit_logs
         WHERE action = 'admin_chat_note_created' AND entity_id = ?`
      )
      .get(String(bookingId)).count;
    assert.strictEqual(noteAuditCount, 1);

    const chatMessageCount = getDatabase()
      .prepare("SELECT COUNT(*) AS count FROM chat_messages WHERE booking_id = ?")
      .get(bookingId).count;
    assert.strictEqual(chatMessageCount, 3);

    console.log({
      ok: true,
      bookingId,
      chatMessageCount,
      unrelatedPassengerBlockedWith: 404,
      adminCanMonitor: true,
      adminNoteAuditCount: noteAuditCount,
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

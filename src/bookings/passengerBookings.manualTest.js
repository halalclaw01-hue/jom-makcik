const assert = require("assert");

process.env.JWT_SECRET = process.env.JWT_SECRET || "phase-7-local-test-secret";

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

async function runManualTest() {
  resetDatabase();

  const app = createApp();
  const server = app.listen(0);
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const passengerToken = await login(baseUrl, "passenger@jommakcik.local");

    const secondPassengerResponse = await postJson(baseUrl, "/auth/register/passenger", {
      name: "Second Passenger",
      phone: "+60127770000",
      email: "second-passenger@example.com",
      password: "Password123!",
      emergencyContactName: "Second Emergency",
      emergencyContactPhone: "+60127779999",
    });
    const secondPassengerBody = await secondPassengerResponse.json();
    assert.strictEqual(secondPassengerResponse.status, 201);
    const secondPassengerToken = secondPassengerBody.token;

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
        specialNotes: "Manual passenger booking API test",
      },
      passengerToken
    );
    const createBody = await createResponse.json();
    assert.strictEqual(createResponse.status, 201);
    assert.strictEqual(createBody.booking.status, "QUOTED");
    assert.strictEqual(createBody.quote.note.includes("MVP quote logic"), true);

    const bookingId = createBody.booking.id;

    const listResponse = await getJson(baseUrl, "/passenger/bookings", passengerToken);
    const listBody = await listResponse.json();
    assert.strictEqual(listResponse.status, 200);
    assert.strictEqual(listBody.bookings.length, 1);

    const detailResponse = await getJson(baseUrl, `/passenger/bookings/${bookingId}`, passengerToken);
    const detailBody = await detailResponse.json();
    assert.strictEqual(detailResponse.status, 200);
    assert.strictEqual(detailBody.booking.id, bookingId);

    const otherPassengerDetail = await getJson(
      baseUrl,
      `/passenger/bookings/${bookingId}`,
      secondPassengerToken
    );
    assert.strictEqual(otherPassengerDetail.status, 404);

    const confirmResponse = await postJson(
      baseUrl,
      `/passenger/bookings/${bookingId}/confirm`,
      {},
      passengerToken
    );
    const confirmBody = await confirmResponse.json();
    assert.strictEqual(confirmResponse.status, 200);
    assert.strictEqual(confirmBody.booking.status, "PAYMENT_PENDING");

    const secondConfirmResponse = await postJson(
      baseUrl,
      `/passenger/bookings/${bookingId}/confirm`,
      {},
      passengerToken
    );
    assert.strictEqual(secondConfirmResponse.status, 400);

    console.log({
      ok: true,
      bookingId,
      createdStatus: "QUOTED",
      confirmedStatus: "PAYMENT_PENDING",
      otherPassengerBlockedWith: 404,
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

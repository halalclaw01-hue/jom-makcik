const assert = require("assert");

process.env.JWT_SECRET = process.env.JWT_SECRET || "phase-30-local-test-secret";

const { createApp } = require("../app");
const { getDatabase, closeDatabase } = require("../db/connection");
const { resetDatabase } = require("../db/reset");
const { MINIMUM_RIDER_DEPOSIT_SEN } = require("../riders/riderService");

async function requestJson(baseUrl, path, { method = "GET", body, token } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));

  return { response, data };
}

async function expectStatus(promise, status, label) {
  const result = await promise;
  assert.strictEqual(result.response.status, status, label);
  return result.data;
}

function makeRiderDepositSufficient(riderId) {
  getDatabase()
    .prepare("UPDATE rider_profiles SET deposit_balance = ? WHERE user_id = ?")
    .run(MINIMUM_RIDER_DEPOSIT_SEN, riderId);
}

async function runManualTest() {
  resetDatabase();

  const app = createApp();
  const server = app.listen(0);
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const suffix = Date.now();

  try {
    const adminLogin = await expectStatus(
      requestJson(baseUrl, "/auth/login", {
        method: "POST",
        body: {
          identifier: "superadmin@jommakcik.local",
          password: "Password123!",
        },
      }),
      200,
      "admin login"
    );
    const adminToken = adminLogin.token;

    const passengerRegistration = await expectStatus(
      requestJson(baseUrl, "/auth/register/passenger", {
        method: "POST",
        body: {
          name: "MVP Test Passenger",
          phone: `+6013000${String(suffix).slice(-6)}`,
          email: `mvp-passenger-${suffix}@example.com`,
          password: "Password123!",
          emergencyContactName: "Emergency Contact",
          emergencyContactPhone: "+60139999999",
        },
      }),
      201,
      "passenger registration"
    );
    const passengerToken = passengerRegistration.token;

    const riderRegistration = await expectStatus(
      requestJson(baseUrl, "/auth/register/rider", {
        method: "POST",
        body: {
          name: "MVP Test Rider",
          phone: `+6014000${String(suffix).slice(-6)}`,
          email: `mvp-rider-${suffix}@example.com`,
          password: "Password123!",
          icNumber: "950101-10-3030",
          licenseNumber: "MVP3030",
          vehicleModel: "Perodua Alza",
          vehiclePlate: "MVP3030",
        },
      }),
      201,
      "rider registration"
    );
    const riderId = riderRegistration.user.id;
    const riderToken = riderRegistration.token;

    await expectStatus(
      requestJson(baseUrl, `/admin/riders/${riderId}/approve`, {
        method: "POST",
        token: adminToken,
        body: { adminNote: "Phase 30 MVP test approval" },
      }),
      200,
      "rider approval"
    );
    makeRiderDepositSufficient(riderId);

    await expectStatus(
      requestJson(baseUrl, "/rider/availability", {
        method: "POST",
        token: riderToken,
        body: { availabilityStatus: "available" },
      }),
      200,
      "rider availability"
    );

    const bookingCreate = await expectStatus(
      requestJson(baseUrl, "/passenger/bookings", {
        method: "POST",
        token: passengerToken,
        body: {
          dependentName: "Puan MVP",
          passengerCategory: "senior",
          serviceType: "medical_appointment",
          pickupAddress: "Taman Melati, Kuala Lumpur",
          destinationAddress: "Hospital Kuala Lumpur",
          pickupDatetime: "2026-05-25T10:00:00.000Z",
          specialNotes: "Needs wheelchair assistance",
          needsChaperone: true,
        },
      }),
      201,
      "passenger booking creation"
    );
    const bookingId = bookingCreate.booking.id;

    await expectStatus(
      requestJson(baseUrl, `/passenger/bookings/${bookingId}/confirm`, {
        method: "POST",
        token: passengerToken,
      }),
      200,
      "booking confirmation"
    );

    const paymentProof = await expectStatus(
      requestJson(baseUrl, `/passenger/bookings/${bookingId}/payment-proof`, {
        method: "POST",
        token: passengerToken,
        body: {
          amount: bookingCreate.booking.estimatedFare,
          proofReference: "MVP-PROOF-001",
        },
      }),
      201,
      "payment proof submission"
    );

    await expectStatus(
      requestJson(baseUrl, `/admin/payment-proofs/${paymentProof.paymentProof.id}/approve`, {
        method: "POST",
        token: adminToken,
        body: { adminNote: "Phase 30 payment approved" },
      }),
      200,
      "admin payment approval"
    );

    await expectStatus(
      requestJson(baseUrl, `/admin/bookings/${bookingId}/start-matching`, {
        method: "POST",
        token: adminToken,
      }),
      200,
      "start matching"
    );

    const jobOffers = await expectStatus(
      requestJson(baseUrl, "/rider/job-offers", { token: riderToken }),
      200,
      "rider job offer list"
    );
    assert.ok(jobOffers.jobOffers.length >= 1, "rider should receive at least one job offer");
    const offer = jobOffers.jobOffers.find((item) => item.bookingId === bookingId);
    assert.ok(offer, "rider should receive the created booking offer");

    await expectStatus(
      requestJson(baseUrl, `/rider/job-offers/${offer.id}/accept`, {
        method: "POST",
        token: riderToken,
      }),
      200,
      "rider accepts job"
    );

    await expectStatus(
      requestJson(baseUrl, `/rider/bookings/${bookingId}/events`, {
        method: "POST",
        token: riderToken,
        body: { eventType: "on_the_way", note: "Rider is on the way" },
      }),
      201,
      "trip status event"
    );

    await expectStatus(
      requestJson(baseUrl, `/bookings/${bookingId}/chat`, {
        method: "POST",
        token: passengerToken,
        body: { message: "Passenger message for MVP test" },
      }),
      201,
      "passenger chat"
    );
    await expectStatus(
      requestJson(baseUrl, `/bookings/${bookingId}/chat`, {
        method: "POST",
        token: riderToken,
        body: { message: "Rider message for MVP test" },
      }),
      201,
      "rider chat"
    );
    await expectStatus(
      requestJson(baseUrl, `/bookings/${bookingId}/chat`, {
        method: "POST",
        token: adminToken,
        body: { message: "Admin monitored message for MVP test" },
      }),
      201,
      "admin chat"
    );
    const chatMessages = await expectStatus(
      requestJson(baseUrl, `/bookings/${bookingId}/chat`, { token: adminToken }),
      200,
      "admin reads chat"
    );
    assert.strictEqual(chatMessages.chatMessages.length, 3);

    await expectStatus(
      requestJson(baseUrl, `/rider/bookings/${bookingId}/start-trip`, {
        method: "POST",
        token: riderToken,
      }),
      200,
      "trip start"
    );
    await expectStatus(
      requestJson(baseUrl, `/rider/bookings/${bookingId}/complete-trip`, {
        method: "POST",
        token: riderToken,
      }),
      200,
      "trip completion"
    );

    const careReport = await expectStatus(
      requestJson(baseUrl, `/rider/bookings/${bookingId}/care-report`, {
        method: "POST",
        token: riderToken,
        body: {
          arrivedSafely: true,
          assistanceGiven: "Wheelchair assistance and chaperone support",
          handoverNotes: "Passenger handed over safely to family member",
          medicationOrDocumentNotes: "Appointment card returned",
          summary: "Trip completed safely with no incidents.",
        },
      }),
      201,
      "rider care report"
    );

    const adminCareReports = await expectStatus(
      requestJson(baseUrl, "/admin/care-reports", { token: adminToken }),
      200,
      "admin care report view"
    );
    assert.ok(
      adminCareReports.careReports.some((report) => report.id === careReport.careReport.id),
      "admin should see rider care report"
    );

    await expectStatus(
      requestJson(baseUrl, `/admin/bookings/${bookingId}/cancel`, {
        method: "POST",
        token: adminToken,
        body: { reason: "Forbidden transition test" },
      }),
      400,
      "forbidden completed to cancelled transition"
    );

    await expectStatus(
      requestJson(baseUrl, "/admin/bookings", { token: passengerToken }),
      403,
      "passenger blocked from admin bookings"
    );
    await expectStatus(
      requestJson(baseUrl, `/passenger/bookings/${bookingId}`, { token: riderToken }),
      403,
      "rider blocked from passenger booking route"
    );
    await expectStatus(
      requestJson(baseUrl, `/rider/bookings/${bookingId}/complete-trip`, {
        method: "POST",
        token: passengerToken,
      }),
      403,
      "passenger blocked from rider trip route"
    );

    const finalBooking = await expectStatus(
      requestJson(baseUrl, `/passenger/bookings/${bookingId}`, { token: passengerToken }),
      200,
      "passenger views final booking"
    );
    assert.strictEqual(finalBooking.booking.status, "COMPLETED");

    console.log({
      ok: true,
      bookingId,
      riderId,
      offerId: offer.id,
      careReportId: careReport.careReport.id,
      finalStatus: finalBooking.booking.status,
      chatMessages: chatMessages.chatMessages.length,
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

const assert = require("assert");

process.env.JWT_SECRET = process.env.JWT_SECRET || "phase-9-local-test-secret";

const { createApp } = require("../app");
const { getDatabase, closeDatabase } = require("../db/connection");
const { resetDatabase } = require("../db/reset");
const { getRiderJobEligibility, MINIMUM_RIDER_DEPOSIT_SEN } = require("./riderService");

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
    name: `Manual Rider ${suffix}`,
    phone: `+6012888${suffix}`,
    email: `manual-rider-${suffix}@example.com`,
    password: "Password123!",
    icNumber: `900101-10-${suffix}`,
    licenseNumber: `D${suffix}`,
    vehicleModel: "Perodua Alza",
    vehiclePlate: `MVP${suffix}`,
  });
  const body = await response.json();

  assert.strictEqual(response.status, 201);
  return body.user.id;
}

async function runManualTest() {
  resetDatabase();

  const app = createApp();
  const server = app.listen(0);
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const adminToken = await login(baseUrl, "superadmin@jommakcik.local");
    const passengerToken = await login(baseUrl, "passenger@jommakcik.local");

    const passengerBlocked = await getJson(baseUrl, "/admin/riders/pending", passengerToken);
    assert.strictEqual(passengerBlocked.status, 403);

    const pendingResponse = await getJson(baseUrl, "/admin/riders/pending", adminToken);
    const pendingBody = await pendingResponse.json();
    assert.strictEqual(pendingResponse.status, 200);
    assert.strictEqual(pendingBody.riders.length, 1);

    const seedRiderId = pendingBody.riders[0].id;
    const approveResponse = await postJson(
      baseUrl,
      `/admin/riders/${seedRiderId}/approve`,
      { adminNote: "Manual test approval" },
      adminToken
    );
    const approveBody = await approveResponse.json();
    assert.strictEqual(approveResponse.status, 200);
    assert.strictEqual(approveBody.rider.approvalStatus, "approved");
    assert.strictEqual(approveBody.rider.userStatus, "active");

    let eligibility = getRiderJobEligibility(seedRiderId);
    assert.strictEqual(eligibility.eligible, false);

    const db = getDatabase();
    db.prepare(
      `UPDATE rider_profiles
       SET availability_status = 'available',
           deposit_balance = ?
       WHERE user_id = ?`
    ).run(MINIMUM_RIDER_DEPOSIT_SEN, seedRiderId);

    eligibility = getRiderJobEligibility(seedRiderId);
    assert.strictEqual(eligibility.eligible, true);

    const rejectRiderId = await registerRider(baseUrl, "1111");
    const rejectResponse = await postJson(
      baseUrl,
      `/admin/riders/${rejectRiderId}/reject`,
      { adminNote: "Manual test rejection" },
      adminToken
    );
    const rejectBody = await rejectResponse.json();
    assert.strictEqual(rejectResponse.status, 200);
    assert.strictEqual(rejectBody.rider.approvalStatus, "rejected");
    assert.strictEqual(rejectBody.rider.userStatus, "rejected");

    const suspendResponse = await postJson(
      baseUrl,
      `/admin/riders/${seedRiderId}/suspend`,
      { adminNote: "Manual test suspension" },
      adminToken
    );
    const suspendBody = await suspendResponse.json();
    assert.strictEqual(suspendResponse.status, 200);
    assert.strictEqual(suspendBody.rider.approvalStatus, "suspended");
    assert.strictEqual(suspendBody.rider.availabilityStatus, "unavailable");
    assert.strictEqual(suspendBody.rider.userStatus, "suspended");

    const reactivateResponse = await postJson(
      baseUrl,
      `/admin/riders/${seedRiderId}/reactivate`,
      { adminNote: "Manual test reactivation" },
      adminToken
    );
    const reactivateBody = await reactivateResponse.json();
    assert.strictEqual(reactivateResponse.status, 200);
    assert.strictEqual(reactivateBody.rider.approvalStatus, "approved");
    assert.strictEqual(reactivateBody.rider.userStatus, "active");
    assert.strictEqual(reactivateBody.rider.availabilityStatus, "unavailable");

    const detailResponse = await getJson(baseUrl, `/admin/riders/${seedRiderId}`, adminToken);
    const detailBody = await detailResponse.json();
    assert.strictEqual(detailResponse.status, 200);
    assert.strictEqual(detailBody.rider.id, seedRiderId);

    const auditCount = db
      .prepare(
        `SELECT COUNT(*) AS count FROM audit_logs
         WHERE action IN ('rider_approved', 'rider_rejected', 'rider_suspended', 'rider_reactivated')`
      )
      .get().count;
    assert.strictEqual(auditCount, 4);

    const allResponse = await getJson(baseUrl, "/admin/riders", adminToken);
    const allBody = await allResponse.json();
    assert.strictEqual(allResponse.status, 200);
    assert.ok(allBody.riders.length >= 2);

    console.log({
      ok: true,
      approvedRiderId: seedRiderId,
      eligibilityAfterDepositAndAvailability: true,
      rejectedRiderId: rejectRiderId,
      auditActionsWritten: auditCount,
      reactivatedRiderId: seedRiderId,
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

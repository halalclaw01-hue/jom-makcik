const { getDatabase } = require("../db/connection");
const { httpError } = require("../utils/httpError");
const { writeAuditLog } = require("../utils/auditLog");

const MINIMUM_RIDER_DEPOSIT_SEN = 5000;

function toRiderResponse(row) {
  return {
    id: row.user_id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    role: row.role,
    userStatus: row.user_status,
    icNumber: row.ic_number,
    licenseNumber: row.license_number,
    vehicleModel: row.vehicle_model,
    vehiclePlate: row.vehicle_plate,
    approvalStatus: row.approval_status,
    availabilityStatus: row.availability_status,
    walletBalance: row.wallet_balance,
    depositBalance: row.deposit_balance,
    createdAt: row.created_at,
  };
}

function getRiderRowByUserId(db, riderId) {
  return db
    .prepare(
      `SELECT
        rider_profiles.*,
        users.name,
        users.phone,
        users.email,
        users.role,
        users.status AS user_status
       FROM rider_profiles
       JOIN users ON users.id = rider_profiles.user_id
       WHERE rider_profiles.user_id = ? AND users.role = 'rider'`
    )
    .get(riderId);
}

function listRiders({ approvalStatus } = {}) {
  const db = getDatabase();
  const params = [];
  let whereClause = "WHERE users.role = 'rider'";

  if (approvalStatus) {
    whereClause += " AND rider_profiles.approval_status = ?";
    params.push(approvalStatus);
  }

  return db
    .prepare(
      `SELECT
        rider_profiles.*,
        users.name,
        users.phone,
        users.email,
        users.role,
        users.status AS user_status
       FROM rider_profiles
       JOIN users ON users.id = rider_profiles.user_id
       ${whereClause}
       ORDER BY rider_profiles.created_at DESC, rider_profiles.id DESC`
    )
    .all(...params)
    .map(toRiderResponse);
}

function listPendingRiders() {
  return listRiders({ approvalStatus: "pending" });
}

function getRiderDetail(riderId) {
  const rider = getRiderRowByUserId(getDatabase(), riderId);

  if (!rider) {
    throw httpError(404, "Rider not found.");
  }

  return toRiderResponse(rider);
}

function getOwnRiderProfile(riderId) {
  return getRiderDetail(riderId);
}

function updateOwnAvailability(riderId, payload = {}) {
  const availabilityStatus = payload.availabilityStatus;

  if (!["available", "unavailable"].includes(availabilityStatus)) {
    throw httpError(400, "availabilityStatus must be available or unavailable.");
  }

  const db = getDatabase();

  return db.transaction(() => {
    const rider = getRiderRowByUserId(db, riderId);

    if (!rider) {
      throw httpError(404, "Rider not found.");
    }

    if (rider.approval_status !== "approved" || rider.user_status !== "active") {
      throw httpError(403, "Rider must be approved before setting availability.");
    }

    db.prepare(
      `UPDATE rider_profiles
       SET availability_status = ?
       WHERE user_id = ?`
    ).run(availabilityStatus, riderId);

    writeAuditLog({
      userId: riderId,
      action: "rider_availability_updated",
      entityType: "rider",
      entityId: riderId,
      details: {
        oldAvailabilityStatus: rider.availability_status,
        newAvailabilityStatus: availabilityStatus,
      },
    });

    return toRiderResponse(getRiderRowByUserId(db, riderId));
  })();
}

function updateRiderApprovalStatus(riderId, adminId, approvalStatus, userStatus, action, adminNote) {
  const db = getDatabase();

  return db.transaction(() => {
    const rider = getRiderRowByUserId(db, riderId);

    if (!rider) {
      throw httpError(404, "Rider not found.");
    }

    db.prepare(
      `UPDATE rider_profiles
       SET approval_status = ?,
           availability_status = CASE WHEN ? = 'approved' THEN availability_status ELSE 'unavailable' END
       WHERE user_id = ?`
    ).run(approvalStatus, approvalStatus, riderId);

    db.prepare(
      `UPDATE users
       SET status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(userStatus, riderId);

    writeAuditLog({
      userId: adminId,
      action,
      entityType: "rider",
      entityId: riderId,
      details: {
        oldApprovalStatus: rider.approval_status,
        newApprovalStatus: approvalStatus,
        oldUserStatus: rider.user_status,
        newUserStatus: userStatus,
        adminNote: adminNote || null,
      },
    });

    return toRiderResponse(getRiderRowByUserId(db, riderId));
  })();
}

function approveRider(riderId, adminId, payload = {}) {
  return updateRiderApprovalStatus(
    riderId,
    adminId,
    "approved",
    "active",
    "rider_approved",
    payload.adminNote
  );
}

function rejectRider(riderId, adminId, payload = {}) {
  return updateRiderApprovalStatus(
    riderId,
    adminId,
    "rejected",
    "rejected",
    "rider_rejected",
    payload.adminNote
  );
}

function suspendRider(riderId, adminId, payload = {}) {
  return updateRiderApprovalStatus(
    riderId,
    adminId,
    "suspended",
    "suspended",
    "rider_suspended",
    payload.adminNote
  );
}

function reactivateRider(riderId, adminId, payload = {}) {
  return updateRiderApprovalStatus(
    riderId,
    adminId,
    "approved",
    "active",
    "rider_reactivated",
    payload.adminNote
  );
}

function getRiderJobEligibility(riderId, minimumDepositSen = MINIMUM_RIDER_DEPOSIT_SEN) {
  const rider = getRiderRowByUserId(getDatabase(), riderId);

  if (!rider) {
    return {
      eligible: false,
      reasons: ["Rider not found."],
      minimumDepositSen,
    };
  }

  const reasons = [];

  if (rider.role !== "rider") {
    reasons.push("User role is not rider.");
  }

  if (rider.approval_status !== "approved") {
    reasons.push("Rider approval status is not approved.");
  }

  if (rider.availability_status !== "available") {
    reasons.push("Rider availability status is not available.");
  }

  if (rider.deposit_balance < minimumDepositSen) {
    reasons.push("Rider deposit balance is below the minimum required amount.");
  }

  return {
    eligible: reasons.length === 0,
    reasons,
    minimumDepositSen,
    rider: toRiderResponse(rider),
  };
}

module.exports = {
  MINIMUM_RIDER_DEPOSIT_SEN,
  listRiders,
  listPendingRiders,
  getRiderDetail,
  getOwnRiderProfile,
  updateOwnAvailability,
  approveRider,
  rejectRider,
  suspendRider,
  reactivateRider,
  getRiderJobEligibility,
};

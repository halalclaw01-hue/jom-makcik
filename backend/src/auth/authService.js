const { getDatabase } = require("../db/connection");
const { hashPassword, verifyPassword, validatePassword, PASSWORD_MIN_LENGTH } = require("./password");
const { signAuthToken } = require("./token");
const { httpError } = require("../utils/httpError");
const { writeAuditLog } = require("../utils/auditLog");
const {
  toPublicUser,
  findUserByPhoneOrEmail,
  findUserByPhone,
  findUserByEmail,
} = require("../users/userRepository");

function requireText(value, fieldName) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw httpError(400, `${fieldName} is required.`);
  }

  return value.trim();
}

function optionalEmail(email) {
  if (email === undefined || email === null || email === "") {
    return null;
  }

  const cleanedEmail = String(email).trim().toLowerCase();
  if (!cleanedEmail.includes("@")) {
    throw httpError(400, "A valid email is required.");
  }

  return cleanedEmail;
}

function ensurePassword(password) {
  if (!validatePassword(password)) {
    throw httpError(400, `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`);
  }
}

function ensureUniqueUser({ phone, email }) {
  if (findUserByPhone(phone)) {
    throw httpError(409, "Phone is already registered.");
  }

  if (email && findUserByEmail(email)) {
    throw httpError(409, "Email is already registered.");
  }
}

function createAuthResponse(user) {
  return {
    token: signAuthToken(user),
    user: toPublicUser(user),
  };
}

function login({ identifier, password }) {
  const cleanedIdentifier = requireText(identifier, "identifier");
  requireText(password, "password");

  const user = findUserByPhoneOrEmail(cleanedIdentifier);

  if (!user || !verifyPassword(password, user.password_hash)) {
    writeAuditLog({
      userId: user?.id || null,
      action: "auth_login_failed",
      entityType: "auth",
      entityId: user?.id || cleanedIdentifier,
      details: {
        identifier: cleanedIdentifier,
        reason: "invalid_credentials",
      },
    });
    throw httpError(401, "Invalid login credentials.");
  }

  if (user.status === "suspended" || user.status === "rejected") {
    writeAuditLog({
      userId: user.id,
      action: "auth_login_failed",
      entityType: "auth",
      entityId: user.id,
      details: {
        identifier: cleanedIdentifier,
        reason: `account_${user.status}`,
        role: user.role,
      },
    });
    throw httpError(403, "Account is not allowed to login.");
  }

  writeAuditLog({
    userId: user.id,
    action: "auth_login",
    entityType: "user",
    entityId: user.id,
    details: { role: user.role },
  });

  return createAuthResponse(user);
}

function registerPassenger(payload) {
  const name = requireText(payload.name, "name");
  const phone = requireText(payload.phone, "phone");
  const email = optionalEmail(payload.email);
  const emergencyContactName = requireText(
    payload.emergencyContactName,
    "emergencyContactName"
  );
  const emergencyContactPhone = requireText(
    payload.emergencyContactPhone,
    "emergencyContactPhone"
  );

  ensurePassword(payload.password);
  ensureUniqueUser({ phone, email });

  const db = getDatabase();
  const user = db.transaction(() => {
    const result = db
      .prepare(
        `INSERT INTO users (name, phone, email, password_hash, role, status)
         VALUES (?, ?, ?, ?, 'passenger', 'active')`
      )
      .run(name, phone, email, hashPassword(payload.password));

    db.prepare(
      `INSERT INTO passenger_profiles
        (user_id, emergency_contact_name, emergency_contact_phone)
       VALUES (?, ?, ?)`
    ).run(result.lastInsertRowid, emergencyContactName, emergencyContactPhone);

    writeAuditLog({
      userId: result.lastInsertRowid,
      action: "passenger_registered",
      entityType: "user",
      entityId: result.lastInsertRowid,
      details: { role: "passenger" },
    });

    return db.prepare("SELECT * FROM users WHERE id = ?").get(result.lastInsertRowid);
  })();

  return createAuthResponse(user);
}

function registerRider(payload) {
  const name = requireText(payload.name, "name");
  const phone = requireText(payload.phone, "phone");
  const email = optionalEmail(payload.email);
  const icNumber = requireText(payload.icNumber, "icNumber");
  const licenseNumber = requireText(payload.licenseNumber, "licenseNumber");
  const vehicleModel = requireText(payload.vehicleModel, "vehicleModel");
  const vehiclePlate = requireText(payload.vehiclePlate, "vehiclePlate");

  ensurePassword(payload.password);
  ensureUniqueUser({ phone, email });

  const db = getDatabase();
  const user = db.transaction(() => {
    const result = db
      .prepare(
        `INSERT INTO users (name, phone, email, password_hash, role, status)
         VALUES (?, ?, ?, ?, 'rider', 'pending')`
      )
      .run(name, phone, email, hashPassword(payload.password));

    db.prepare(
      `INSERT INTO rider_profiles
        (user_id, ic_number, license_number, vehicle_model, vehicle_plate, approval_status, availability_status)
       VALUES (?, ?, ?, ?, ?, 'pending', 'unavailable')`
    ).run(result.lastInsertRowid, icNumber, licenseNumber, vehicleModel, vehiclePlate);

    writeAuditLog({
      userId: result.lastInsertRowid,
      action: "rider_registered_pending_approval",
      entityType: "user",
      entityId: result.lastInsertRowid,
      details: { role: "rider", approvalStatus: "pending" },
    });

    return db.prepare("SELECT * FROM users WHERE id = ?").get(result.lastInsertRowid);
  })();

  return createAuthResponse(user);
}

module.exports = { login, registerPassenger, registerRider };

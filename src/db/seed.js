const bcrypt = require("bcryptjs");

const SEED_PASSWORD = "Password123!";

function createPasswordHash() {
  return bcrypt.hashSync(SEED_PASSWORD, 10);
}

function insertUser(db, user) {
  const existingUser = db.prepare("SELECT id FROM users WHERE phone = ?").get(user.phone);

  if (existingUser) {
    return existingUser.id;
  }

  const result = db
    .prepare(
      `INSERT INTO users (name, phone, email, password_hash, role, status)
       VALUES (@name, @phone, @email, @passwordHash, @role, @status)`
    )
    .run(user);

  return result.lastInsertRowid;
}

function insertAuditLog(db, log) {
  db.prepare(
    `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
     VALUES (@userId, @action, @entityType, @entityId, @details)`
  ).run(log);
}

function seedDatabase(db) {
  const passwordHash = createPasswordHash();

  const superAdminId = insertUser(db, {
    name: "Jom Makcik Super Admin",
    phone: "+60120000001",
    email: "superadmin@jommakcik.local",
    passwordHash,
    role: "super_admin",
    status: "active",
  });

  db.prepare(
    `INSERT OR IGNORE INTO admin_profiles (user_id, admin_role)
     VALUES (?, 'super_admin')`
  ).run(superAdminId);

  const passengerId = insertUser(db, {
    name: "Test Passenger",
    phone: "+60120000002",
    email: "passenger@jommakcik.local",
    passwordHash,
    role: "passenger",
    status: "active",
  });

  db.prepare(
    `INSERT OR IGNORE INTO passenger_profiles
      (user_id, emergency_contact_name, emergency_contact_phone)
     VALUES (?, 'Emergency Contact', '+60129999999')`
  ).run(passengerId);

  const riderId = insertUser(db, {
    name: "Test Rider Pending",
    phone: "+60120000003",
    email: "rider@jommakcik.local",
    passwordHash,
    role: "rider",
    status: "pending",
  });

  db.prepare(
    `INSERT OR IGNORE INTO rider_profiles
      (user_id, ic_number, license_number, vehicle_model, vehicle_plate, approval_status, availability_status)
     VALUES (?, '900101-10-0001', 'D1234567', 'Perodua Alza', 'JMC1234', 'pending', 'unavailable')`
  ).run(riderId);

  const seedLogExists = db
    .prepare("SELECT id FROM audit_logs WHERE action = ? AND entity_type = ?")
    .get("database_seeded", "system");

  if (!seedLogExists) {
    insertAuditLog(db, {
      userId: superAdminId,
      action: "database_seeded",
      entityType: "system",
      entityId: "local-seed",
      details: JSON.stringify({
        users: ["super_admin", "passenger", "rider_pending"],
        note: "Local development seed data only.",
      }),
    });
  }
}

module.exports = { seedDatabase, SEED_PASSWORD };

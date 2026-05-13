const { getDatabase } = require("../db/connection");

function writeAuditLog({ userId, action, entityType, entityId, details }) {
  const db = getDatabase();

  db.prepare(
    `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
     VALUES (@userId, @action, @entityType, @entityId, @details)`
  ).run({
    userId: userId || null,
    action,
    entityType,
    entityId: entityId ? String(entityId) : null,
    details: details ? JSON.stringify(details) : null,
  });
}

module.exports = { writeAuditLog };

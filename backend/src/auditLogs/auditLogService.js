const { getDatabase } = require("../db/connection");

function parseDetails(details) {
  if (!details) return null;

  try {
    return JSON.parse(details);
  } catch {
    return details;
  }
}

function listAuditLogs(filters = {}) {
  const where = [];
  const params = [];

  if (filters.user) {
    where.push("(users.name LIKE ? OR users.email LIKE ? OR users.phone LIKE ? OR CAST(audit_logs.user_id AS TEXT) = ?)");
    params.push(`%${filters.user}%`, `%${filters.user}%`, `%${filters.user}%`, String(filters.user));
  }

  if (filters.action) {
    where.push("audit_logs.action LIKE ?");
    params.push(`%${filters.action}%`);
  }

  if (filters.entityType) {
    where.push("audit_logs.entity_type = ?");
    params.push(filters.entityType);
  }

  if (filters.date) {
    where.push("date(audit_logs.created_at) = date(?)");
    params.push(filters.date);
  }

  const rows = getDatabase()
    .prepare(
      `SELECT
        audit_logs.id,
        audit_logs.user_id,
        users.name AS user_name,
        users.role AS user_role,
        audit_logs.action,
        audit_logs.entity_type,
        audit_logs.entity_id,
        audit_logs.details,
        audit_logs.created_at
       FROM audit_logs
       LEFT JOIN users ON users.id = audit_logs.user_id
       ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
       ORDER BY audit_logs.created_at DESC, audit_logs.id DESC
       LIMIT 250`
    )
    .all(...params);

  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    userRole: row.user_role,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    details: parseDetails(row.details),
    createdAt: row.created_at,
  }));
}

module.exports = { listAuditLogs };

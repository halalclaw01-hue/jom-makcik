const { getDatabase } = require("../db/connection");

function toPublicUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    email: user.email,
    role: user.role,
    status: user.status,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  };
}

function findUserById(id) {
  return getDatabase().prepare("SELECT * FROM users WHERE id = ?").get(id);
}

function findUserByPhoneOrEmail(identifier) {
  return getDatabase()
    .prepare("SELECT * FROM users WHERE phone = ? OR lower(email) = lower(?)")
    .get(identifier, identifier);
}

function findUserByPhone(phone) {
  return getDatabase().prepare("SELECT * FROM users WHERE phone = ?").get(phone);
}

function findUserByEmail(email) {
  if (!email) {
    return null;
  }

  return getDatabase().prepare("SELECT * FROM users WHERE lower(email) = lower(?)").get(email);
}

module.exports = {
  toPublicUser,
  findUserById,
  findUserByPhoneOrEmail,
  findUserByPhone,
  findUserByEmail,
};

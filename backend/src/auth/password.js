const bcrypt = require("bcryptjs");

const PASSWORD_MIN_LENGTH = 8;

function validatePassword(password) {
  return typeof password === "string" && password.length >= PASSWORD_MIN_LENGTH;
}

function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

function verifyPassword(password, passwordHash) {
  return bcrypt.compareSync(password, passwordHash);
}

module.exports = { PASSWORD_MIN_LENGTH, validatePassword, hashPassword, verifyPassword };

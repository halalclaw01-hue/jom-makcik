const jwt = require("jsonwebtoken");

const { config } = require("../config/env");

function requireJwtSecret() {
  if (!config.jwtSecret) {
    const error = new Error("JWT_SECRET is not configured.");
    error.statusCode = 500;
    throw error;
  }

  return config.jwtSecret;
}

function signAuthToken(user) {
  return jwt.sign(
    {
      sub: String(user.id),
      role: user.role,
      status: user.status,
    },
    requireJwtSecret(),
    { expiresIn: config.jwtExpiresIn }
  );
}

function verifyAuthToken(token) {
  return jwt.verify(token, requireJwtSecret());
}

module.exports = { signAuthToken, verifyAuthToken };

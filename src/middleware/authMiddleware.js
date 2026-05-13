const { verifyAuthToken } = require("../auth/token");
const { httpError } = require("../utils/httpError");
const { findUserById, toPublicUser } = require("../users/userRepository");

function getBearerToken(req) {
  const header = req.get("authorization");

  if (!header || !header.startsWith("Bearer ")) {
    return null;
  }

  return header.slice("Bearer ".length).trim();
}

function requireAuth(req, res, next) {
  try {
    const token = getBearerToken(req);

    if (!token) {
      throw httpError(401, "Authentication token is required.");
    }

    const payload = verifyAuthToken(token);
    const user = findUserById(payload.sub);

    if (!user) {
      throw httpError(401, "Authenticated user no longer exists.");
    }

    if (user.status === "suspended" || user.status === "rejected") {
      throw httpError(403, "Account is not allowed to access this resource.");
    }

    req.user = toPublicUser(user);
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      next(httpError(401, "Invalid or expired authentication token."));
      return;
    }

    next(error);
  }
}

module.exports = { requireAuth };

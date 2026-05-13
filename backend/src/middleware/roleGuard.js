const { httpError } = require("../utils/httpError");

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      next(httpError(401, "Authentication is required."));
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      next(httpError(403, "You do not have permission to access this resource."));
      return;
    }

    next();
  };
}

module.exports = { requireRole };

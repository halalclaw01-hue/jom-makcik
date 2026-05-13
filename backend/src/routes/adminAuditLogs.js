const express = require("express");

const { requireAuth } = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleGuard");
const { listAuditLogs } = require("../auditLogs/auditLogService");

const adminAuditLogsRouter = express.Router();

adminAuditLogsRouter.use(requireAuth, requireRole("admin", "super_admin"));

adminAuditLogsRouter.get("/", (req, res, next) => {
  try {
    res.json({ auditLogs: listAuditLogs(req.query || {}) });
  } catch (error) {
    next(error);
  }
});

module.exports = { adminAuditLogsRouter };

const express = require("express");

const { requireAuth } = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleGuard");
const { listCareReports, approveCareReport } = require("../careReports/careReportService");

const adminCareReportsRouter = express.Router();

adminCareReportsRouter.use(requireAuth, requireRole("admin", "super_admin"));

adminCareReportsRouter.get("/", (req, res, next) => {
  try {
    res.json({ careReports: listCareReports() });
  } catch (error) {
    next(error);
  }
});

adminCareReportsRouter.post("/:id/approve", (req, res, next) => {
  try {
    res.json({ careReport: approveCareReport(req.params.id, req.user.id) });
  } catch (error) {
    next(error);
  }
});

module.exports = { adminCareReportsRouter };

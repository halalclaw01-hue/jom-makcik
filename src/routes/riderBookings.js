const express = require("express");

const { requireAuth } = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleGuard");
const {
  getRiderTripDetail,
  listAssignedTrips,
  recordTripEvent,
  startTrip,
  completeTrip,
} = require("../trips/tripService");
const { submitCareReport } = require("../careReports/careReportService");

const riderBookingsRouter = express.Router();

riderBookingsRouter.use(requireAuth, requireRole("rider"));

riderBookingsRouter.get("/assigned", (req, res, next) => {
  try {
    res.json({ assignedTrips: listAssignedTrips(req.user.id) });
  } catch (error) {
    next(error);
  }
});

riderBookingsRouter.get("/:id", (req, res, next) => {
  try {
    res.json(getRiderTripDetail(req.params.id, req.user.id));
  } catch (error) {
    next(error);
  }
});

riderBookingsRouter.post("/:id/events", (req, res, next) => {
  try {
    res.status(201).json(recordTripEvent(req.params.id, req.user.id, req.body || {}));
  } catch (error) {
    next(error);
  }
});

riderBookingsRouter.post("/:id/start-trip", (req, res, next) => {
  try {
    res.json(startTrip(req.params.id, req.user.id));
  } catch (error) {
    next(error);
  }
});

riderBookingsRouter.post("/:id/complete-trip", (req, res, next) => {
  try {
    res.json(completeTrip(req.params.id, req.user.id));
  } catch (error) {
    next(error);
  }
});

riderBookingsRouter.post("/:id/care-report", (req, res, next) => {
  try {
    res.status(201).json({
      careReport: submitCareReport(req.params.id, req.user.id, req.body || {}),
    });
  } catch (error) {
    next(error);
  }
});

module.exports = { riderBookingsRouter };

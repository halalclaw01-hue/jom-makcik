const express = require("express");

const { requireAuth } = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleGuard");
const {
  getCancelledBookings,
  getCompletedTrips,
  getDailyBookings,
  getPaymentSummary,
  getRiderCompletedTrips,
} = require("../reports/reportService");

const adminReportsRouter = express.Router();

adminReportsRouter.use(requireAuth, requireRole("admin", "super_admin"));

adminReportsRouter.get("/daily-bookings", (req, res, next) => {
  try {
    res.json({ dailyBookings: getDailyBookings() });
  } catch (error) {
    next(error);
  }
});

adminReportsRouter.get("/completed-trips", (req, res, next) => {
  try {
    res.json({ completedTrips: getCompletedTrips() });
  } catch (error) {
    next(error);
  }
});

adminReportsRouter.get("/cancelled-bookings", (req, res, next) => {
  try {
    res.json({ cancelledBookings: getCancelledBookings() });
  } catch (error) {
    next(error);
  }
});

adminReportsRouter.get("/payment-summary", (req, res, next) => {
  try {
    res.json({ paymentSummary: getPaymentSummary() });
  } catch (error) {
    next(error);
  }
});

adminReportsRouter.get("/rider-completed-trips", (req, res, next) => {
  try {
    res.json({ riderCompletedTrips: getRiderCompletedTrips() });
  } catch (error) {
    next(error);
  }
});

module.exports = { adminReportsRouter };

const express = require("express");

const { requireAuth } = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleGuard");
const { startMatching } = require("../matching/matchingService");
const {
  listAdminBookings,
  listMatchingQueue,
  listMatchingRiderCandidates,
  getAdminBookingDetail,
  assignRiderManually,
  markSlaFailed,
  cancelBooking,
  markRefundPending,
} = require("../bookings/adminBookingService");

const adminBookingsRouter = express.Router();

adminBookingsRouter.use(requireAuth, requireRole("admin", "super_admin"));

adminBookingsRouter.get("/", (req, res, next) => {
  try {
    res.json({ bookings: listAdminBookings(req.query || {}) });
  } catch (error) {
    next(error);
  }
});

adminBookingsRouter.get("/matching-queue", (req, res, next) => {
  try {
    res.json(listMatchingQueue());
  } catch (error) {
    next(error);
  }
});

adminBookingsRouter.get("/:id/matching-riders", (req, res, next) => {
  try {
    res.json({ riders: listMatchingRiderCandidates(req.params.id) });
  } catch (error) {
    next(error);
  }
});

adminBookingsRouter.get("/:id", (req, res, next) => {
  try {
    res.json(getAdminBookingDetail(req.params.id));
  } catch (error) {
    next(error);
  }
});

adminBookingsRouter.post("/:id/start-matching", (req, res, next) => {
  try {
    res.json(startMatching(req.params.id, req.user.id));
  } catch (error) {
    next(error);
  }
});

adminBookingsRouter.post("/:id/assign-rider", (req, res, next) => {
  try {
    res.json(
      assignRiderManually(
        req.params.id,
        req.body?.riderId,
        req.user.id,
        req.body?.reason,
        req.body?.overrideReason
      )
    );
  } catch (error) {
    next(error);
  }
});

adminBookingsRouter.post("/:id/sla-failed", (req, res, next) => {
  try {
    res.json(markSlaFailed(req.params.id, req.user.id, req.body?.reason));
  } catch (error) {
    next(error);
  }
});

adminBookingsRouter.post("/:id/cancel", (req, res, next) => {
  try {
    res.json(cancelBooking(req.params.id, req.user.id, req.body?.reason));
  } catch (error) {
    next(error);
  }
});

adminBookingsRouter.post("/:id/refund-pending", (req, res, next) => {
  try {
    res.json(markRefundPending(req.params.id, req.user.id, req.body?.reason));
  } catch (error) {
    next(error);
  }
});

module.exports = { adminBookingsRouter };

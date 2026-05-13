const express = require("express");

const { requireAuth } = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleGuard");
const { listAllTripEvents } = require("../trips/tripService");

const adminTripEventsRouter = express.Router();

adminTripEventsRouter.use(requireAuth, requireRole("admin", "super_admin"));

adminTripEventsRouter.get("/", (req, res, next) => {
  try {
    res.json({ tripEvents: listAllTripEvents() });
  } catch (error) {
    next(error);
  }
});

module.exports = { adminTripEventsRouter };

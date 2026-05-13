const express = require("express");

const { requireAuth } = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleGuard");
const { getOwnRiderProfile, updateOwnAvailability } = require("../riders/riderService");

const riderProfileRouter = express.Router();

riderProfileRouter.use(requireAuth, requireRole("rider"));

riderProfileRouter.get("/me", (req, res, next) => {
  try {
    res.json({ rider: getOwnRiderProfile(req.user.id) });
  } catch (error) {
    next(error);
  }
});

riderProfileRouter.post("/availability", (req, res, next) => {
  try {
    res.json({ rider: updateOwnAvailability(req.user.id, req.body || {}) });
  } catch (error) {
    next(error);
  }
});

module.exports = { riderProfileRouter };

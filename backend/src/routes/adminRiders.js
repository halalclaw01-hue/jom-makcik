const express = require("express");

const { requireAuth } = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleGuard");
const {
  listRiders,
  listPendingRiders,
  getRiderDetail,
  approveRider,
  rejectRider,
  suspendRider,
  reactivateRider,
} = require("../riders/riderService");

const adminRidersRouter = express.Router();

adminRidersRouter.use(requireAuth, requireRole("admin", "super_admin"));

adminRidersRouter.get("/pending", (req, res, next) => {
  try {
    res.json({ riders: listPendingRiders() });
  } catch (error) {
    next(error);
  }
});

adminRidersRouter.get("/", (req, res, next) => {
  try {
    res.json({ riders: listRiders() });
  } catch (error) {
    next(error);
  }
});

adminRidersRouter.get("/:id", (req, res, next) => {
  try {
    res.json({ rider: getRiderDetail(req.params.id) });
  } catch (error) {
    next(error);
  }
});

adminRidersRouter.post("/:id/approve", (req, res, next) => {
  try {
    res.json({ rider: approveRider(req.params.id, req.user.id, req.body || {}) });
  } catch (error) {
    next(error);
  }
});

adminRidersRouter.post("/:id/reject", (req, res, next) => {
  try {
    res.json({ rider: rejectRider(req.params.id, req.user.id, req.body || {}) });
  } catch (error) {
    next(error);
  }
});

adminRidersRouter.post("/:id/suspend", (req, res, next) => {
  try {
    res.json({ rider: suspendRider(req.params.id, req.user.id, req.body || {}) });
  } catch (error) {
    next(error);
  }
});

adminRidersRouter.post("/:id/reactivate", (req, res, next) => {
  try {
    res.json({ rider: reactivateRider(req.params.id, req.user.id, req.body || {}) });
  } catch (error) {
    next(error);
  }
});

module.exports = { adminRidersRouter };

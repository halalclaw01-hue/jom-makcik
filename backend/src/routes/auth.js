const express = require("express");

const { login, registerPassenger, registerRider } = require("../auth/authService");
const { requireAuth } = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleGuard");

const authRouter = express.Router();

authRouter.post("/login", (req, res, next) => {
  try {
    res.json(login(req.body || {}));
  } catch (error) {
    next(error);
  }
});

authRouter.post("/register/passenger", (req, res, next) => {
  try {
    res.status(201).json(registerPassenger(req.body || {}));
  } catch (error) {
    next(error);
  }
});

authRouter.post("/register/rider", (req, res, next) => {
  try {
    res.status(201).json(registerRider(req.body || {}));
  } catch (error) {
    next(error);
  }
});

authRouter.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

authRouter.get("/role-check/passenger", requireAuth, requireRole("passenger"), (req, res) => {
  res.json({ ok: true, role: req.user.role });
});

authRouter.get("/role-check/rider", requireAuth, requireRole("rider"), (req, res) => {
  res.json({ ok: true, role: req.user.role });
});

authRouter.get("/role-check/admin", requireAuth, requireRole("admin"), (req, res) => {
  res.json({ ok: true, role: req.user.role });
});

authRouter.get(
  "/role-check/super-admin",
  requireAuth,
  requireRole("super_admin"),
  (req, res) => {
    res.json({ ok: true, role: req.user.role });
  }
);

module.exports = { authRouter };

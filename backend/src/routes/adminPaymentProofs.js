const express = require("express");

const { requireAuth } = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleGuard");
const {
  listPendingPaymentProofs,
  listPaymentProofHistory,
  approvePaymentProof,
  rejectPaymentProof,
} = require("../payments/paymentProofService");

const adminPaymentProofsRouter = express.Router();

adminPaymentProofsRouter.use(requireAuth, requireRole("admin", "super_admin"));

adminPaymentProofsRouter.get("/pending", (req, res, next) => {
  try {
    res.json({ paymentProofs: listPendingPaymentProofs() });
  } catch (error) {
    next(error);
  }
});

adminPaymentProofsRouter.get("/history", (req, res, next) => {
  try {
    res.json({ paymentProofs: listPaymentProofHistory() });
  } catch (error) {
    next(error);
  }
});

adminPaymentProofsRouter.post("/:id/approve", (req, res, next) => {
  try {
    res.json(approvePaymentProof(req.params.id, req.user.id, req.body || {}));
  } catch (error) {
    next(error);
  }
});

adminPaymentProofsRouter.post("/:id/reject", (req, res, next) => {
  try {
    res.json(rejectPaymentProof(req.params.id, req.user.id, req.body || {}));
  } catch (error) {
    next(error);
  }
});

module.exports = { adminPaymentProofsRouter };

const express = require("express");

const { requireAuth } = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleGuard");
const {
  createPassengerBooking,
  listPassengerBookings,
  getPassengerBooking,
  confirmPassengerBooking,
} = require("../bookings/passengerBookingService");
const { submitPaymentProof } = require("../payments/paymentProofService");
const { getPassengerCareReport } = require("../careReports/careReportService");

const passengerBookingsRouter = express.Router();

passengerBookingsRouter.use(requireAuth, requireRole("passenger"));

passengerBookingsRouter.post("/", (req, res, next) => {
  try {
    res.status(201).json(createPassengerBooking(req.user.id, req.body || {}));
  } catch (error) {
    next(error);
  }
});

passengerBookingsRouter.get("/", (req, res, next) => {
  try {
    res.json({ bookings: listPassengerBookings(req.user.id) });
  } catch (error) {
    next(error);
  }
});

passengerBookingsRouter.get("/:id", (req, res, next) => {
  try {
    res.json({ booking: getPassengerBooking(req.user.id, req.params.id) });
  } catch (error) {
    next(error);
  }
});

passengerBookingsRouter.post("/:id/confirm", (req, res, next) => {
  try {
    res.json({ booking: confirmPassengerBooking(req.user.id, req.params.id) });
  } catch (error) {
    next(error);
  }
});

passengerBookingsRouter.post("/:id/payment-proof", (req, res, next) => {
  try {
    res.status(201).json({
      paymentProof: submitPaymentProof(req.user.id, req.params.id, req.body || {}),
    });
  } catch (error) {
    next(error);
  }
});

passengerBookingsRouter.get("/:id/care-report", (req, res, next) => {
  try {
    res.json({
      careReport: getPassengerCareReport(req.user.id, req.params.id),
    });
  } catch (error) {
    next(error);
  }
});

module.exports = { passengerBookingsRouter };

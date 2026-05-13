const express = require("express");
const cors = require("cors");

const { requestLogger } = require("./middleware/requestLogger");
const { notFoundHandler, errorHandler } = require("./middleware/errorHandler");
const { healthRouter } = require("./routes/health");
const { authRouter } = require("./routes/auth");
const { passengerBookingsRouter } = require("./routes/passengerBookings");
const { adminPaymentProofsRouter } = require("./routes/adminPaymentProofs");
const { adminRidersRouter } = require("./routes/adminRiders");
const { adminBookingsRouter } = require("./routes/adminBookings");
const { riderJobOffersRouter } = require("./routes/riderJobOffers");
const { riderBookingsRouter } = require("./routes/riderBookings");
const { riderProfileRouter } = require("./routes/riderProfile");
const { adminTripEventsRouter } = require("./routes/adminTripEvents");
const { bookingChatRouter } = require("./routes/bookingChat");
const { adminCareReportsRouter } = require("./routes/adminCareReports");
const { adminReportsRouter } = require("./routes/adminReports");
const { adminAuditLogsRouter } = require("./routes/adminAuditLogs");

function createApp() {
  const app = express();
  const { config } = require("./config/env");

  const corsOptions = {
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, health checks, server-to-server)
      if (!origin) return callback(null, true);

      if (config.corsOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.warn(`[CORS] Blocked origin: ${origin}`);
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
  };

  app.use(cors(corsOptions));
  app.use(express.json({ limit: "1mb" }));
  app.use(requestLogger);

  app.get("/", (req, res) => {
    res.json({
      service: "jom-makcik-careride-backend",
      version: "0.1.0",
      docs: "/health",
    });
  });

  app.use("/health", healthRouter);
  app.use("/auth", authRouter);
  app.use("/bookings", bookingChatRouter);
  app.use("/passenger/bookings", passengerBookingsRouter);
  app.use("/rider", riderProfileRouter);
  app.use("/rider/bookings", riderBookingsRouter);
  app.use("/rider/job-offers", riderJobOffersRouter);
  app.use("/admin/bookings", adminBookingsRouter);
  app.use("/admin/payment-proofs", adminPaymentProofsRouter);
  app.use("/admin/riders", adminRidersRouter);
  app.use("/admin/trip-events", adminTripEventsRouter);
  app.use("/admin/care-reports", adminCareReportsRouter);
  app.use("/admin/reports", adminReportsRouter);
  app.use("/admin/audit-logs", adminAuditLogsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };

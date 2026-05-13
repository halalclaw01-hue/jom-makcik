const BOOKING_STATUSES = Object.freeze({
  DRAFT: "DRAFT",
  QUOTED: "QUOTED",
  PAYMENT_PENDING: "PAYMENT_PENDING",
  PAID: "PAID",
  MATCHING: "MATCHING",
  ASSIGNED: "ASSIGNED",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
  SLA_FAILED: "SLA_FAILED",
  REFUND_PENDING: "REFUND_PENDING",
  REFUNDED: "REFUNDED",
});

const ALLOWED_BOOKING_TRANSITIONS = Object.freeze({
  [BOOKING_STATUSES.DRAFT]: Object.freeze([BOOKING_STATUSES.QUOTED]),
  [BOOKING_STATUSES.QUOTED]: Object.freeze([BOOKING_STATUSES.PAYMENT_PENDING]),
  [BOOKING_STATUSES.PAYMENT_PENDING]: Object.freeze([BOOKING_STATUSES.PAID]),
  [BOOKING_STATUSES.PAID]: Object.freeze([
    BOOKING_STATUSES.MATCHING,
    BOOKING_STATUSES.REFUND_PENDING,
  ]),
  [BOOKING_STATUSES.MATCHING]: Object.freeze([
    BOOKING_STATUSES.ASSIGNED,
    BOOKING_STATUSES.SLA_FAILED,
  ]),
  [BOOKING_STATUSES.ASSIGNED]: Object.freeze([
    BOOKING_STATUSES.IN_PROGRESS,
    BOOKING_STATUSES.CANCELLED,
  ]),
  [BOOKING_STATUSES.IN_PROGRESS]: Object.freeze([BOOKING_STATUSES.COMPLETED]),
  [BOOKING_STATUSES.SLA_FAILED]: Object.freeze([BOOKING_STATUSES.REFUND_PENDING]),
  [BOOKING_STATUSES.REFUND_PENDING]: Object.freeze([BOOKING_STATUSES.REFUNDED]),
  [BOOKING_STATUSES.COMPLETED]: Object.freeze([]),
  [BOOKING_STATUSES.CANCELLED]: Object.freeze([]),
  [BOOKING_STATUSES.REFUNDED]: Object.freeze([]),
});

function isKnownBookingStatus(status) {
  return Object.values(BOOKING_STATUSES).includes(status);
}

function validateBookingTransition(oldStatus, newStatus) {
  if (!isKnownBookingStatus(oldStatus)) {
    return {
      valid: false,
      reason: `Unknown old booking status: ${oldStatus}`,
    };
  }

  if (!isKnownBookingStatus(newStatus)) {
    return {
      valid: false,
      reason: `Unknown new booking status: ${newStatus}`,
    };
  }

  const allowedNextStatuses = ALLOWED_BOOKING_TRANSITIONS[oldStatus] || [];

  if (!allowedNextStatuses.includes(newStatus)) {
    return {
      valid: false,
      reason: `Booking status transition ${oldStatus} -> ${newStatus} is not allowed.`,
    };
  }

  return { valid: true, reason: null };
}

module.exports = {
  BOOKING_STATUSES,
  ALLOWED_BOOKING_TRANSITIONS,
  isKnownBookingStatus,
  validateBookingTransition,
};

const { getDatabase } = require("../db/connection");
const { httpError } = require("../utils/httpError");
const { writeAuditLog } = require("../utils/auditLog");
const { BOOKING_STATUSES } = require("../bookings/bookingStatus");
const { updateBookingStatus } = require("../bookings/bookingStatusService");

function requireText(value, fieldName) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw httpError(400, `${fieldName} is required.`);
  }

  return value.trim();
}

function requirePositiveAmount(amount) {
  const parsedAmount = Number(amount);

  if (!Number.isInteger(parsedAmount) || parsedAmount <= 0) {
    throw httpError(400, "amount must be a positive integer in sen.");
  }

  return parsedAmount;
}

function toPaymentProofResponse(paymentProof) {
  return {
    id: paymentProof.id,
    bookingId: paymentProof.booking_id,
    passengerId: paymentProof.passenger_id,
    amount: paymentProof.amount,
    proofReference: paymentProof.proof_file_url,
    status: paymentProof.status,
    adminNote: paymentProof.admin_note,
    verifiedBy: paymentProof.verified_by,
    createdAt: paymentProof.created_at,
    verifiedAt: paymentProof.verified_at,
  };
}

function toPendingPaymentProofResponse(row) {
  return {
    id: row.id,
    bookingId: row.booking_id,
    passengerId: row.passenger_id,
    passengerName: row.passenger_name,
    amount: row.amount,
    proofReference: row.proof_file_url,
    status: row.status,
    adminNote: row.admin_note,
    createdAt: row.created_at,
    bookingStatus: row.booking_status,
    paymentStatus: row.payment_status,
    pickupDatetime: row.pickup_datetime,
    serviceType: row.service_type,
  };
}

function submitPaymentProof(passengerId, bookingId, payload) {
  const amount = requirePositiveAmount(payload.amount);
  const proofReference = requireText(payload.proofReference, "proofReference");
  const db = getDatabase();

  return db.transaction(() => {
    const booking = db
      .prepare("SELECT * FROM bookings WHERE id = ? AND passenger_id = ?")
      .get(bookingId, passengerId);

    if (!booking) {
      throw httpError(404, "Booking not found.");
    }

    if (booking.status !== BOOKING_STATUSES.PAYMENT_PENDING) {
      throw httpError(400, "Payment proof can only be submitted for PAYMENT_PENDING bookings.");
    }

    const pendingProof = db
      .prepare(
        `SELECT id FROM payment_proofs
         WHERE booking_id = ? AND status = 'pending'`
      )
      .get(bookingId);

    if (pendingProof) {
      throw httpError(409, "This booking already has a pending payment proof.");
    }

    const result = db
      .prepare(
        `INSERT INTO payment_proofs
          (booking_id, passenger_id, amount, proof_file_url, status)
         VALUES (?, ?, ?, ?, 'pending')`
      )
      .run(bookingId, passengerId, amount, proofReference);

    db.prepare(
      `UPDATE bookings
       SET payment_status = 'proof_submitted', updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(bookingId);

    writeAuditLog({
      userId: passengerId,
      action: "payment_proof_submitted",
      entityType: "payment_proof",
      entityId: result.lastInsertRowid,
      details: {
        bookingId,
        amount,
        proofReference,
      },
    });

    const proof = db.prepare("SELECT * FROM payment_proofs WHERE id = ?").get(result.lastInsertRowid);

    return toPaymentProofResponse(proof);
  })();
}

function listPendingPaymentProofs() {
  return getDatabase()
    .prepare(
      `SELECT
        payment_proofs.*,
        users.name AS passenger_name,
        bookings.status AS booking_status,
        bookings.payment_status,
        bookings.pickup_datetime,
        bookings.service_type
       FROM payment_proofs
       JOIN bookings ON bookings.id = payment_proofs.booking_id
       JOIN users ON users.id = payment_proofs.passenger_id
       WHERE payment_proofs.status = 'pending'
       ORDER BY payment_proofs.created_at ASC, payment_proofs.id ASC`
    )
    .all()
    .map(toPendingPaymentProofResponse);
}

function listPaymentProofHistory() {
  return getDatabase()
    .prepare(
      `SELECT
        payment_proofs.*,
        users.name AS passenger_name,
        verifier.name AS verified_by_name,
        bookings.status AS booking_status,
        bookings.payment_status,
        bookings.pickup_datetime,
        bookings.service_type
       FROM payment_proofs
       JOIN bookings ON bookings.id = payment_proofs.booking_id
       JOIN users ON users.id = payment_proofs.passenger_id
       LEFT JOIN users verifier ON verifier.id = payment_proofs.verified_by
       ORDER BY payment_proofs.created_at DESC, payment_proofs.id DESC`
    )
    .all()
    .map((row) => ({
      ...toPendingPaymentProofResponse(row),
      verifiedBy: row.verified_by,
      verifiedByName: row.verified_by_name,
      verifiedAt: row.verified_at,
    }));
}

function approvePaymentProof(paymentProofId, adminId, payload = {}) {
  const adminNote = payload.adminNote ? String(payload.adminNote).trim() : null;
  const db = getDatabase();

  return db.transaction(() => {
    const proof = db.prepare("SELECT * FROM payment_proofs WHERE id = ?").get(paymentProofId);

    if (!proof) {
      throw httpError(404, "Payment proof not found.");
    }

    if (proof.status !== "pending") {
      throw httpError(400, "Only pending payment proofs can be approved.");
    }

    const booking = db.prepare("SELECT * FROM bookings WHERE id = ?").get(proof.booking_id);

    if (!booking || booking.status !== BOOKING_STATUSES.PAYMENT_PENDING) {
      throw httpError(400, "Booking must be PAYMENT_PENDING before payment proof approval.");
    }

    db.prepare(
      `UPDATE payment_proofs
       SET status = 'approved',
           admin_note = ?,
           verified_by = ?,
           verified_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(adminNote, adminId, paymentProofId);

    db.prepare(
      `UPDATE bookings
       SET payment_status = 'verified', updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(proof.booking_id);

    const updatedBooking = updateBookingStatus(
      proof.booking_id,
      BOOKING_STATUSES.PAID,
      adminId,
      "Admin approved manual payment proof"
    );

    writeAuditLog({
      userId: adminId,
      action: "payment_proof_approved",
      entityType: "payment_proof",
      entityId: paymentProofId,
      details: {
        bookingId: proof.booking_id,
        amount: proof.amount,
        adminNote,
      },
    });

    const updatedProof = db.prepare("SELECT * FROM payment_proofs WHERE id = ?").get(paymentProofId);

    return {
      paymentProof: toPaymentProofResponse(updatedProof),
      bookingStatus: updatedBooking.status,
    };
  })();
}

function rejectPaymentProof(paymentProofId, adminId, payload = {}) {
  const adminNote = requireText(payload.adminNote, "adminNote");
  const db = getDatabase();

  return db.transaction(() => {
    const proof = db.prepare("SELECT * FROM payment_proofs WHERE id = ?").get(paymentProofId);

    if (!proof) {
      throw httpError(404, "Payment proof not found.");
    }

    if (proof.status !== "pending") {
      throw httpError(400, "Only pending payment proofs can be rejected.");
    }

    const booking = db.prepare("SELECT * FROM bookings WHERE id = ?").get(proof.booking_id);

    if (!booking || booking.status !== BOOKING_STATUSES.PAYMENT_PENDING) {
      throw httpError(400, "Booking must remain PAYMENT_PENDING when rejecting payment proof.");
    }

    db.prepare(
      `UPDATE payment_proofs
       SET status = 'rejected',
           admin_note = ?,
           verified_by = ?,
           verified_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(adminNote, adminId, paymentProofId);

    db.prepare(
      `UPDATE bookings
       SET payment_status = 'rejected', updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(proof.booking_id);

    writeAuditLog({
      userId: adminId,
      action: "payment_proof_rejected",
      entityType: "payment_proof",
      entityId: paymentProofId,
      details: {
        bookingId: proof.booking_id,
        amount: proof.amount,
        adminNote,
      },
    });

    const updatedProof = db.prepare("SELECT * FROM payment_proofs WHERE id = ?").get(paymentProofId);

    return {
      paymentProof: toPaymentProofResponse(updatedProof),
      bookingStatus: booking.status,
    };
  })();
}

module.exports = {
  submitPaymentProof,
  listPendingPaymentProofs,
  listPaymentProofHistory,
  approvePaymentProof,
  rejectPaymentProof,
};

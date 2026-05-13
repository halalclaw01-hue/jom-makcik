const { getDatabase } = require("../db/connection");
const { httpError } = require("../utils/httpError");
const { writeAuditLog } = require("../utils/auditLog");
const { BOOKING_STATUSES } = require("../bookings/bookingStatus");

function requireText(value, fieldName) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw httpError(400, `${fieldName} is required.`);
  }

  return value.trim();
}

function optionalText(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  return String(value).trim();
}

function parseBoolean(value, fieldName) {
  if (typeof value !== "boolean") {
    throw httpError(400, `${fieldName} must be true or false.`);
  }

  return value ? 1 : 0;
}

function toCareReportResponse(row) {
  return {
    id: row.id,
    bookingId: row.booking_id,
    riderId: row.rider_id,
    arrivedSafely: row.arrived_safely === 1,
    assistanceGiven: row.assistance_given,
    handoverNotes: row.handover_notes,
    medicationOrDocumentNotes: row.medication_or_document_notes,
    summary: row.summary,
    adminApproved: row.admin_approved === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function submitCareReport(bookingId, riderId, payload) {
  const arrivedSafely = parseBoolean(payload.arrivedSafely, "arrivedSafely");
  const assistanceGiven = requireText(payload.assistanceGiven, "assistanceGiven");
  const handoverNotes = optionalText(payload.handoverNotes);
  const medicationOrDocumentNotes = optionalText(payload.medicationOrDocumentNotes);
  const summary = requireText(payload.summary, "summary");
  const db = getDatabase();

  return db.transaction(() => {
    const booking = db
      .prepare("SELECT * FROM bookings WHERE id = ? AND assigned_rider_id = ?")
      .get(bookingId, riderId);

    if (!booking) {
      throw httpError(404, "Assigned booking not found.");
    }

    if (booking.status !== BOOKING_STATUSES.COMPLETED) {
      throw httpError(400, "Care report can only be submitted after trip completion.");
    }

    const existingReport = db
      .prepare("SELECT id FROM care_reports WHERE booking_id = ?")
      .get(bookingId);

    if (existingReport) {
      throw httpError(409, "Care report already exists for this booking.");
    }

    const result = db
      .prepare(
        `INSERT INTO care_reports
          (booking_id, rider_id, arrived_safely, assistance_given, handover_notes,
           medication_or_document_notes, summary)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        bookingId,
        riderId,
        arrivedSafely,
        assistanceGiven,
        handoverNotes,
        medicationOrDocumentNotes,
        summary
      );

    writeAuditLog({
      userId: riderId,
      action: "care_report_submitted",
      entityType: "care_report",
      entityId: result.lastInsertRowid,
      details: {
        bookingId,
        arrivedSafely: arrivedSafely === 1,
      },
    });

    return getCareReportById(result.lastInsertRowid);
  })();
}

function getCareReportById(careReportId) {
  const report = getDatabase().prepare("SELECT * FROM care_reports WHERE id = ?").get(careReportId);

  if (!report) {
    throw httpError(404, "Care report not found.");
  }

  return toCareReportResponse(report);
}

function getPassengerCareReport(passengerId, bookingId) {
  const report = getDatabase()
    .prepare(
      `SELECT care_reports.*
       FROM care_reports
       JOIN bookings ON bookings.id = care_reports.booking_id
       WHERE care_reports.booking_id = ?
         AND bookings.passenger_id = ?`
    )
    .get(bookingId, passengerId);

  if (!report) {
    throw httpError(404, "Care report not found.");
  }

  return toCareReportResponse(report);
}

function listCareReports() {
  return getDatabase()
    .prepare(
      `SELECT care_reports.*
       FROM care_reports
       ORDER BY care_reports.created_at DESC, care_reports.id DESC`
    )
    .all()
    .map(toCareReportResponse);
}

function approveCareReport(careReportId, adminId) {
  const db = getDatabase();

  return db.transaction(() => {
    const report = db.prepare("SELECT * FROM care_reports WHERE id = ?").get(careReportId);

    if (!report) {
      throw httpError(404, "Care report not found.");
    }

    db.prepare(
      `UPDATE care_reports
       SET admin_approved = 1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(careReportId);

    writeAuditLog({
      userId: adminId,
      action: "care_report_approved",
      entityType: "care_report",
      entityId: careReportId,
      details: {
        bookingId: report.booking_id,
      },
    });

    return getCareReportById(careReportId);
  })();
}

module.exports = {
  submitCareReport,
  getPassengerCareReport,
  listCareReports,
  approveCareReport,
};

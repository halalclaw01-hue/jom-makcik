const { getDatabase } = require("../db/connection");

function toNumber(value) {
  return Number(value || 0);
}

function getDailyBookings() {
  return getDatabase()
    .prepare(
      `SELECT
        date(created_at) AS report_date,
        COUNT(*) AS total_bookings,
        SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed_count,
        SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) AS cancelled_count,
        SUM(CASE WHEN status = 'SLA_FAILED' THEN 1 ELSE 0 END) AS sla_failed_count
       FROM bookings
       GROUP BY date(created_at)
       ORDER BY report_date DESC`
    )
    .all()
    .map((row) => ({
      date: row.report_date,
      totalBookings: toNumber(row.total_bookings),
      completedCount: toNumber(row.completed_count),
      cancelledCount: toNumber(row.cancelled_count),
      slaFailedCount: toNumber(row.sla_failed_count),
    }));
}

function getCompletedTrips() {
  return getDatabase()
    .prepare(
      `SELECT
        bookings.id,
        bookings.pickup_datetime,
        bookings.estimated_fare,
        bookings.updated_at AS completed_at,
        passengers.name AS passenger_name,
        riders.name AS rider_name,
        bookings.service_type
       FROM bookings
       JOIN users passengers ON passengers.id = bookings.passenger_id
       LEFT JOIN users riders ON riders.id = bookings.assigned_rider_id
       WHERE bookings.status = 'COMPLETED'
       ORDER BY bookings.updated_at DESC, bookings.id DESC`
    )
    .all()
    .map((row) => ({
      bookingId: row.id,
      passengerName: row.passenger_name,
      riderName: row.rider_name,
      serviceType: row.service_type,
      pickupDatetime: row.pickup_datetime,
      completedAt: row.completed_at,
      estimatedFare: row.estimated_fare,
    }));
}

function getCancelledBookings() {
  return getDatabase()
    .prepare(
      `SELECT
        bookings.id,
        bookings.pickup_datetime,
        bookings.updated_at AS cancelled_at,
        bookings.service_type,
        bookings.payment_status,
        passengers.name AS passenger_name,
        riders.name AS rider_name
       FROM bookings
       JOIN users passengers ON passengers.id = bookings.passenger_id
       LEFT JOIN users riders ON riders.id = bookings.assigned_rider_id
       WHERE bookings.status = 'CANCELLED'
       ORDER BY bookings.updated_at DESC, bookings.id DESC`
    )
    .all()
    .map((row) => ({
      bookingId: row.id,
      passengerName: row.passenger_name,
      riderName: row.rider_name,
      serviceType: row.service_type,
      pickupDatetime: row.pickup_datetime,
      paymentStatus: row.payment_status,
      cancelledAt: row.cancelled_at,
    }));
}

function getPaymentSummary() {
  return getDatabase()
    .prepare(
      `SELECT
        status,
        COUNT(*) AS proof_count,
        COALESCE(SUM(amount), 0) AS total_amount
       FROM payment_proofs
       GROUP BY status
       ORDER BY status ASC`
    )
    .all()
    .map((row) => ({
      status: row.status,
      proofCount: toNumber(row.proof_count),
      totalAmount: toNumber(row.total_amount),
    }));
}

function getRiderCompletedTrips() {
  return getDatabase()
    .prepare(
      `SELECT
        riders.id AS rider_id,
        riders.name AS rider_name,
        riders.phone AS rider_phone,
        rider_profiles.vehicle_plate,
        COUNT(bookings.id) AS completed_trips,
        COALESCE(SUM(bookings.estimated_fare), 0) AS total_fare
       FROM bookings
       JOIN users riders ON riders.id = bookings.assigned_rider_id
       JOIN rider_profiles ON rider_profiles.user_id = riders.id
       WHERE bookings.status = 'COMPLETED'
       GROUP BY riders.id, riders.name, riders.phone, rider_profiles.vehicle_plate
       ORDER BY completed_trips DESC, riders.name ASC`
    )
    .all()
    .map((row) => ({
      riderId: row.rider_id,
      riderName: row.rider_name,
      riderPhone: row.rider_phone,
      vehiclePlate: row.vehicle_plate,
      completedTrips: toNumber(row.completed_trips),
      totalFare: toNumber(row.total_fare),
    }));
}

module.exports = {
  getDailyBookings,
  getCompletedTrips,
  getCancelledBookings,
  getPaymentSummary,
  getRiderCompletedTrips,
};

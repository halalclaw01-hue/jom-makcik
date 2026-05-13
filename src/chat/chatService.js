const { getDatabase } = require("../db/connection");
const { httpError } = require("../utils/httpError");
const { writeAuditLog } = require("../utils/auditLog");

function requireMessage(value) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw httpError(400, "message is required.");
  }

  const message = value.trim();

  if (message.length > 1000) {
    throw httpError(400, "message must be 1000 characters or fewer.");
  }

  return message;
}

function toChatMessageResponse(row) {
  return {
    id: row.id,
    bookingId: row.booking_id,
    senderId: row.sender_id,
    senderRole: row.sender_role,
    senderName: row.sender_name,
    message: row.message,
    createdAt: row.created_at,
  };
}

function assertCanAccessBookingChat(user, bookingId) {
  const db = getDatabase();
  const booking = db.prepare("SELECT * FROM bookings WHERE id = ?").get(bookingId);

  if (!booking) {
    throw httpError(404, "Booking not found.");
  }

  if (user.role === "passenger" && booking.passenger_id !== user.id) {
    throw httpError(404, "Booking not found.");
  }

  if (user.role === "rider" && booking.assigned_rider_id !== user.id) {
    throw httpError(404, "Booking not found.");
  }

  if (!["passenger", "rider", "admin", "super_admin"].includes(user.role)) {
    throw httpError(403, "You do not have permission to access this chat.");
  }

  return booking;
}

function createChatMessage(bookingId, user, payload) {
  const message = requireMessage(payload.message);
  const db = getDatabase();

  return db.transaction(() => {
    assertCanAccessBookingChat(user, bookingId);

    const result = db
      .prepare(
        `INSERT INTO chat_messages (booking_id, sender_id, sender_role, message)
         VALUES (?, ?, ?, ?)`
      )
      .run(bookingId, user.id, user.role, message);

    writeAuditLog({
      userId: user.id,
      action: "chat_message_created",
      entityType: "booking",
      entityId: bookingId,
      details: {
        chatMessageId: result.lastInsertRowid,
        senderRole: user.role,
      },
    });

    return getChatMessageById(result.lastInsertRowid);
  })();
}

function getChatMessageById(messageId) {
  return toChatMessageResponse(
    getDatabase()
      .prepare(
        `SELECT chat_messages.*, users.name AS sender_name
         FROM chat_messages
         JOIN users ON users.id = chat_messages.sender_id
         WHERE chat_messages.id = ?`
      )
      .get(messageId)
  );
}

function listChatMessages(bookingId, user) {
  assertCanAccessBookingChat(user, bookingId);

  return getDatabase()
    .prepare(
      `SELECT chat_messages.*, users.name AS sender_name
       FROM chat_messages
       JOIN users ON users.id = chat_messages.sender_id
       WHERE chat_messages.booking_id = ?
       ORDER BY chat_messages.created_at ASC, chat_messages.id ASC`
    )
    .all(bookingId)
    .map(toChatMessageResponse);
}

function requireAdmin(user) {
  if (!["admin", "super_admin"].includes(user.role)) {
    throw httpError(403, "Admin access required.");
  }
}

function listAdminChatConversations(user) {
  requireAdmin(user);

  return getDatabase()
    .prepare(
      `SELECT
        bookings.id AS booking_id,
        bookings.status,
        bookings.service_type,
        bookings.pickup_datetime,
        passengers.name AS passenger_name,
        riders.name AS rider_name,
        COUNT(chat_messages.id) AS message_count,
        latest.message AS latest_message,
        latest.sender_role AS latest_sender_role,
        latest.created_at AS latest_message_at
       FROM bookings
       JOIN users passengers ON passengers.id = bookings.passenger_id
       LEFT JOIN users riders ON riders.id = bookings.assigned_rider_id
       LEFT JOIN chat_messages ON chat_messages.booking_id = bookings.id
       LEFT JOIN chat_messages latest ON latest.id = (
         SELECT id FROM chat_messages
         WHERE chat_messages.booking_id = bookings.id
         ORDER BY created_at DESC, id DESC
         LIMIT 1
       )
       WHERE bookings.status IN (
         'PAYMENT_PENDING',
         'PAID',
         'MATCHING',
         'ASSIGNED',
         'IN_PROGRESS',
         'SLA_FAILED',
         'REFUND_PENDING'
       )
       GROUP BY bookings.id
       ORDER BY COALESCE(latest.created_at, bookings.updated_at) DESC, bookings.id DESC`
    )
    .all()
    .map((row) => ({
      bookingId: row.booking_id,
      status: row.status,
      serviceType: row.service_type,
      pickupDatetime: row.pickup_datetime,
      passengerName: row.passenger_name,
      riderName: row.rider_name,
      messageCount: row.message_count,
      latestMessage: row.latest_message,
      latestSenderRole: row.latest_sender_role,
      latestMessageAt: row.latest_message_at,
    }));
}

function createAdminChatNote(bookingId, user, payload) {
  requireAdmin(user);
  assertCanAccessBookingChat(user, bookingId);

  const note = requireMessage(payload.note);

  writeAuditLog({
    userId: user.id,
    action: "admin_chat_note_created",
    entityType: "booking",
    entityId: bookingId,
    details: { note },
  });

  return {
    bookingId: Number(bookingId),
    note,
    createdBy: user.id,
  };
}

module.exports = {
  createChatMessage,
  listChatMessages,
  listAdminChatConversations,
  createAdminChatNote,
};

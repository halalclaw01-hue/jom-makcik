const DEFAULT_API_BASE_URL = "http://10.0.2.2:4000";

let authToken = null;

export function setAuthToken(token) {
  authToken = token || null;
}

export async function apiRequest(path, { method = "GET", body, token } = {}) {
  const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL;
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token || authToken ? { Authorization: `Bearer ${token || authToken}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error?.message || data.message || "Request failed.");
  }

  return data;
}

export function loginAdmin({ identifier, password }) {
  return apiRequest("/auth/login", {
    method: "POST",
    body: { identifier, password },
  });
}

function toQueryString(params = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      query.append(key, String(value).trim());
    }
  });

  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
}

export function listAdminBookings(filters) {
  return apiRequest(`/admin/bookings${toQueryString(filters)}`);
}

export function getAdminBookingDetail(bookingId) {
  return apiRequest(`/admin/bookings/${bookingId}`);
}

export function startBookingMatching(bookingId) {
  return apiRequest(`/admin/bookings/${bookingId}/start-matching`, {
    method: "POST",
  });
}

export function listMatchingQueue() {
  return apiRequest("/admin/bookings/matching-queue");
}

export function listMatchingRiders(bookingId) {
  return apiRequest(`/admin/bookings/${bookingId}/matching-riders`);
}

export function assignRiderToBooking(bookingId, { riderId, reason, overrideReason }) {
  return apiRequest(`/admin/bookings/${bookingId}/assign-rider`, {
    method: "POST",
    body: { riderId, reason, overrideReason },
  });
}

export function listPendingPaymentProofs() {
  return apiRequest("/admin/payment-proofs/pending");
}

export function approvePaymentProof(paymentProofId, adminNote) {
  return apiRequest(`/admin/payment-proofs/${paymentProofId}/approve`, {
    method: "POST",
    body: { adminNote },
  });
}

export function rejectPaymentProof(paymentProofId, adminNote) {
  return apiRequest(`/admin/payment-proofs/${paymentProofId}/reject`, {
    method: "POST",
    body: { adminNote },
  });
}

export function listPendingRiders() {
  return apiRequest("/admin/riders/pending");
}

export function approveRider(riderId, adminNote) {
  return apiRequest(`/admin/riders/${riderId}/approve`, {
    method: "POST",
    body: { adminNote },
  });
}

export function rejectRider(riderId, adminNote) {
  return apiRequest(`/admin/riders/${riderId}/reject`, {
    method: "POST",
    body: { adminNote },
  });
}

export function listAdminChatConversations() {
  return apiRequest("/bookings/admin/monitor");
}

export function listBookingChatMessages(bookingId) {
  return apiRequest(`/bookings/${bookingId}/chat`);
}

export function sendBookingChatMessage(bookingId, message) {
  return apiRequest(`/bookings/${bookingId}/chat`, {
    method: "POST",
    body: { message },
  });
}

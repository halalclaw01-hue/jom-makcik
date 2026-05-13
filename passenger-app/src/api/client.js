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

export function loginPassenger({ identifier, password }) {
  return apiRequest("/auth/login", {
    method: "POST",
    body: { identifier, password },
  });
}

export function registerPassenger(payload) {
  return apiRequest("/auth/register/passenger", {
    method: "POST",
    body: payload,
  });
}

export function createPassengerBooking(payload) {
  return apiRequest("/passenger/bookings", {
    method: "POST",
    body: payload,
  });
}

export function listPassengerBookings() {
  return apiRequest("/passenger/bookings");
}

export function getPassengerBooking(bookingId) {
  return apiRequest(`/passenger/bookings/${bookingId}`);
}

export function confirmPassengerBooking(bookingId) {
  return apiRequest(`/passenger/bookings/${bookingId}/confirm`, {
    method: "POST",
    body: {},
  });
}

export function submitPassengerPaymentProof(bookingId, payload) {
  return apiRequest(`/passenger/bookings/${bookingId}/payment-proof`, {
    method: "POST",
    body: payload,
  });
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

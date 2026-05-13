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

export function loginRider({ identifier, password }) {
  return apiRequest("/auth/login", {
    method: "POST",
    body: { identifier, password },
  });
}

export function registerRider(payload) {
  return apiRequest("/auth/register/rider", {
    method: "POST",
    body: payload,
  });
}

export function getRiderProfile() {
  return apiRequest("/rider/me");
}

export function updateRiderAvailability(availabilityStatus) {
  return apiRequest("/rider/availability", {
    method: "POST",
    body: { availabilityStatus },
  });
}

export function listRiderJobOffers() {
  return apiRequest("/rider/job-offers");
}

export function acceptJobOffer(offerId) {
  return apiRequest(`/rider/job-offers/${offerId}/accept`, {
    method: "POST",
    body: {},
  });
}

export function rejectJobOffer(offerId) {
  return apiRequest(`/rider/job-offers/${offerId}/reject`, {
    method: "POST",
    body: {},
  });
}

export function listAssignedTrips() {
  return apiRequest("/rider/bookings/assigned");
}

export function getRiderTripDetail(bookingId) {
  return apiRequest(`/rider/bookings/${bookingId}`);
}

export function recordTripEvent(bookingId, eventType) {
  return apiRequest(`/rider/bookings/${bookingId}/events`, {
    method: "POST",
    body: { eventType },
  });
}

export function startTrip(bookingId) {
  return apiRequest(`/rider/bookings/${bookingId}/start-trip`, {
    method: "POST",
    body: {},
  });
}

export function completeTrip(bookingId) {
  return apiRequest(`/rider/bookings/${bookingId}/complete-trip`, {
    method: "POST",
    body: {},
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

export function submitCareReport(bookingId, payload) {
  return apiRequest(`/rider/bookings/${bookingId}/care-report`, {
    method: "POST",
    body: payload,
  });
}

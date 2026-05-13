import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  acceptJobOffer,
  completeTrip,
  getRiderProfile,
  getRiderTripDetail,
  listBookingChatMessages,
  listAssignedTrips,
  listRiderJobOffers,
  loginRider,
  recordTripEvent,
  registerRider,
  rejectJobOffer,
  sendBookingChatMessage,
  setAuthToken,
  startTrip,
  submitCareReport,
  updateRiderAvailability,
} from "./src/api/client";
import { clearToken, getToken, saveToken } from "./src/storage/tokenStorage";

const SCREENS = {
  LOGIN: "Login",
  REGISTER: "Register",
  HOME: "Home",
  PROFILE: "Profile",
  AVAILABILITY: "Availability",
  JOB_OFFERS: "Job Offers",
  ASSIGNED_TRIPS: "Assigned Trips",
  TRIP_DETAIL: "Trip Detail",
  CHAT: "Chat",
  CARE_REPORT: "Care Report",
  WALLET: "Wallet",
};

const HOME_ACTIONS = [
  SCREENS.PROFILE,
  SCREENS.AVAILABILITY,
  SCREENS.JOB_OFFERS,
  SCREENS.ASSIGNED_TRIPS,
  SCREENS.TRIP_DETAIL,
  SCREENS.CHAT,
  SCREENS.CARE_REPORT,
  SCREENS.WALLET,
];

export default function App() {
  const [screen, setScreen] = useState(SCREENS.LOGIN);
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [acceptedTrip, setAcceptedTrip] = useState(null);
  const [selectedTripId, setSelectedTripId] = useState(null);
  const [checkingToken, setCheckingToken] = useState(true);

  useEffect(() => {
    getToken()
      .then((storedToken) => {
        if (storedToken) {
          setToken(storedToken);
          setAuthToken(storedToken);
          setScreen(SCREENS.HOME);
        }
      })
      .finally(() => setCheckingToken(false));
  }, []);

  async function handleAuthSuccess(data) {
    if (data.user?.role !== "rider") {
      throw new Error("Rider account required.");
    }

    await saveToken(data.token);
    setAuthToken(data.token);
    setToken(data.token);
    setUser(data.user);
    setScreen(SCREENS.HOME);
  }

  async function handleLogout() {
    await clearToken();
    setAuthToken(null);
    setToken(null);
    setUser(null);
    setScreen(SCREENS.LOGIN);
  }

  const authenticated = Boolean(token);

  const content = useMemo(() => {
    if (checkingToken) {
      return (
        <View style={styles.loadingPanel}>
          <ActivityIndicator color="#6d25bd" />
          <Text style={styles.mutedText}>Checking saved rider session...</Text>
        </View>
      );
    }

    if (!authenticated && screen === SCREENS.REGISTER) {
      return <RegisterScreen onLogin={() => setScreen(SCREENS.LOGIN)} onSuccess={handleAuthSuccess} />;
    }

    if (!authenticated) {
      return <LoginScreen onRegister={() => setScreen(SCREENS.REGISTER)} onSuccess={handleAuthSuccess} />;
    }

    if (screen === SCREENS.HOME) {
      return <HomeScreen user={user} onNavigate={setScreen} onLogout={handleLogout} />;
    }

    if (screen === SCREENS.AVAILABILITY) {
      return <AvailabilityScreen onBack={() => setScreen(SCREENS.HOME)} />;
    }

    if (screen === SCREENS.JOB_OFFERS) {
      return (
        <JobOffersScreen
          onAccepted={(booking) => {
            setAcceptedTrip(booking);
            setSelectedTripId(booking.id);
            setScreen(SCREENS.ASSIGNED_TRIPS);
          }}
          onBack={() => setScreen(SCREENS.HOME)}
        />
      );
    }

    if (screen === SCREENS.ASSIGNED_TRIPS) {
      return (
        <AssignedTripsScreen
          acceptedTrip={acceptedTrip}
          onBack={() => setScreen(SCREENS.HOME)}
          onOpen={(tripId) => {
            setSelectedTripId(tripId);
            setScreen(SCREENS.TRIP_DETAIL);
          }}
        />
      );
    }

    if (screen === SCREENS.TRIP_DETAIL) {
      return (
        <TripDetailScreen
          bookingId={selectedTripId}
          onBack={() => setScreen(SCREENS.ASSIGNED_TRIPS)}
          onCareReport={() => setScreen(SCREENS.CARE_REPORT)}
          onChat={() => setScreen(SCREENS.CHAT)}
        />
      );
    }

    if (screen === SCREENS.CHAT) {
      return <RiderChatScreen bookingId={selectedTripId} onBack={() => setScreen(SCREENS.TRIP_DETAIL)} />;
    }

    if (screen === SCREENS.CARE_REPORT) {
      return <CareReportScreen bookingId={selectedTripId} onBack={() => setScreen(SCREENS.TRIP_DETAIL)} />;
    }

    return <FoundationScreen title={screen} onBack={() => setScreen(SCREENS.HOME)} />;
  }, [acceptedTrip, authenticated, checkingToken, screen, selectedTripId, user]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fbf7ff" />
      {content}
    </SafeAreaView>
  );
}

function LoginScreen({ onRegister, onSuccess }) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    try {
      const data = await loginRider({ identifier, password });
      await onSuccess(data);
    } catch (error) {
      Alert.alert("Login failed", error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell eyebrow="Rider App" title="Jom Makcik Rider">
      <TextInput
        autoCapitalize="none"
        keyboardType="email-address"
        onChangeText={setIdentifier}
        placeholder="Email or phone"
        style={styles.input}
        value={identifier}
      />
      <TextInput
        onChangeText={setPassword}
        placeholder="Password"
        secureTextEntry
        style={styles.input}
        value={password}
      />
      <PrimaryButton disabled={loading || !identifier || !password} label={loading ? "Logging in..." : "Login"} onPress={submit} />
      <SecondaryButton label="Register as rider" onPress={onRegister} />
    </AuthShell>
  );
}

function RegisterScreen({ onLogin, onSuccess }) {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
    icNumber: "",
    licenseNumber: "",
    vehicleModel: "",
    vehiclePlate: "",
  });
  const [loading, setLoading] = useState(false);

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function submit() {
    setLoading(true);
    try {
      const data = await registerRider(form);
      await onSuccess(data);
      Alert.alert("Registration submitted", "Admin approval is required before receiving jobs.");
    } catch (error) {
      Alert.alert("Registration failed", error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell eyebrow="Rider Registration" title="Create Rider Account">
      <TextInput onChangeText={(value) => updateField("name", value)} placeholder="Full name" style={styles.input} value={form.name} />
      <TextInput onChangeText={(value) => updateField("phone", value)} placeholder="Phone number" style={styles.input} value={form.phone} />
      <TextInput autoCapitalize="none" keyboardType="email-address" onChangeText={(value) => updateField("email", value)} placeholder="Email" style={styles.input} value={form.email} />
      <TextInput onChangeText={(value) => updateField("password", value)} placeholder="Password" secureTextEntry style={styles.input} value={form.password} />
      <TextInput onChangeText={(value) => updateField("icNumber", value)} placeholder="IC number" style={styles.input} value={form.icNumber} />
      <TextInput onChangeText={(value) => updateField("licenseNumber", value)} placeholder="License number" style={styles.input} value={form.licenseNumber} />
      <TextInput onChangeText={(value) => updateField("vehicleModel", value)} placeholder="Vehicle model" style={styles.input} value={form.vehicleModel} />
      <TextInput autoCapitalize="characters" onChangeText={(value) => updateField("vehiclePlate", value)} placeholder="Vehicle plate" style={styles.input} value={form.vehiclePlate} />
      <PrimaryButton disabled={loading} label={loading ? "Submitting..." : "Register"} onPress={submit} />
      <SecondaryButton label="Back to login" onPress={onLogin} />
    </AuthShell>
  );
}

function AuthShell({ eyebrow, title, children }) {
  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
      <ScrollView contentContainerStyle={styles.authContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.logoBox}>
          <Text style={styles.logoIcon}>JM</Text>
        </View>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.card}>{children}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function HomeScreen({ user, onNavigate, onLogout }) {
  return (
    <ScrollView contentContainerStyle={styles.pageContainer}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.eyebrow}>Welcome Back</Text>
          <Text style={styles.title}>{user?.name || "Rider"}</Text>
        </View>
        <Pressable onPress={onLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </View>

      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>Controlled assisted rides only</Text>
        <Text style={styles.heroText}>Riders must be admin-approved before receiving jobs. Availability and job controls will be added in their approved phases.</Text>
      </View>

      <View style={styles.statusRow}>
        <InfoPill label="Approval" value="Admin required" />
        <InfoPill label="Availability" value="Foundation" />
      </View>

      <View style={styles.grid}>
        {HOME_ACTIONS.map((item) => (
          <Pressable key={item} onPress={() => onNavigate(item)} style={styles.menuCard}>
            <Text style={styles.menuTitle}>{item}</Text>
            <Text style={styles.statusBadge}>Ready</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

function AvailabilityScreen({ onBack }) {
  const [state, setState] = useState({ loading: true, rider: null, error: "" });
  const [saving, setSaving] = useState(false);

  async function loadProfile() {
    setState({ loading: true, rider: null, error: "" });
    try {
      const data = await getRiderProfile();
      setState({ loading: false, rider: data.rider, error: "" });
    } catch (error) {
      setState({ loading: false, rider: null, error: error.message });
    }
  }

  useEffect(() => {
    loadProfile();
  }, []);

  async function setAvailability(availabilityStatus) {
    setSaving(true);
    try {
      const data = await updateRiderAvailability(availabilityStatus);
      setState({ loading: false, rider: data.rider, error: "" });
    } catch (error) {
      Alert.alert("Availability not updated", error.message);
    } finally {
      setSaving(false);
    }
  }

  const rider = state.rider;
  const approved = rider?.approvalStatus === "approved" && rider?.userStatus === "active";

  return (
    <ScrollView contentContainerStyle={styles.pageContainer}>
      <SecondaryButton label="Back Home" onPress={onBack} />
      <View>
        <Text style={styles.eyebrow}>Rider Availability</Text>
        <Text style={styles.title}>Availability</Text>
      </View>
      {state.loading ? <StatusCard text="Loading rider profile..." /> : null}
      {state.error ? <StatusCard text={state.error} /> : null}
      {rider ? (
        <View style={styles.card}>
          <Text style={styles.menuTitle}>{rider.name}</Text>
          <InfoRow label="Approval" value={rider.approvalStatus} />
          <InfoRow label="Availability" value={rider.availabilityStatus} />
          <InfoRow label="Deposit" value={`RM ${((rider.depositBalance || 0) / 100).toFixed(2)}`} />
          {!approved ? <Text style={styles.mutedText}>Admin approval is required before availability can be changed.</Text> : null}
          <View style={styles.buttonRow}>
            <PrimaryButton
              disabled={!approved || saving || rider.availabilityStatus === "available"}
              label="Available"
              onPress={() => setAvailability("available")}
            />
            <SecondaryButton label="Unavailable" onPress={() => setAvailability("unavailable")} />
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

function JobOffersScreen({ onAccepted, onBack }) {
  const [profileState, setProfileState] = useState({ loading: true, rider: null, error: "" });
  const [offersState, setOffersState] = useState({ loading: true, offers: [], error: "" });
  const [actionLoading, setActionLoading] = useState(null);

  async function loadData() {
    setProfileState({ loading: true, rider: null, error: "" });
    setOffersState({ loading: true, offers: [], error: "" });
    try {
      const [profile, offers] = await Promise.all([getRiderProfile(), listRiderJobOffers()]);
      setProfileState({ loading: false, rider: profile.rider, error: "" });
      setOffersState({ loading: false, offers: offers.jobOffers || [], error: "" });
    } catch (error) {
      setProfileState((current) => ({ ...current, loading: false, error: error.message }));
      setOffersState({ loading: false, offers: [], error: error.message });
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function runOfferAction(offerId, action) {
    setActionLoading(`${action}-${offerId}`);
    try {
      if (action === "accept") {
        const data = await acceptJobOffer(offerId);
        onAccepted(data.booking);
      } else {
        await rejectJobOffer(offerId);
        await loadData();
      }
    } catch (error) {
      Alert.alert("Job offer action failed", error.message);
    } finally {
      setActionLoading(null);
    }
  }

  const rider = profileState.rider;
  const canAccept = rider?.approvalStatus === "approved" && rider?.availabilityStatus === "available";

  return (
    <ScrollView contentContainerStyle={styles.pageContainer}>
      <SecondaryButton label="Back Home" onPress={onBack} />
      <View>
        <Text style={styles.eyebrow}>Controlled Matching</Text>
        <Text style={styles.title}>Job Offers</Text>
      </View>
      {profileState.loading || offersState.loading ? <StatusCard text="Loading job offers..." /> : null}
      {offersState.error ? <StatusCard text={offersState.error} /> : null}
      {rider && !canAccept ? (
        <View style={styles.card}>
          <Text style={styles.menuTitle}>Not ready for jobs</Text>
          <Text style={styles.mutedText}>Rider must be approved and available before accepting job offers.</Text>
          <InfoRow label="Approval" value={rider.approvalStatus} />
          <InfoRow label="Availability" value={rider.availabilityStatus} />
        </View>
      ) : null}
      {!offersState.loading && !offersState.error && offersState.offers.length === 0 ? (
        <StatusCard text="No active job offers." />
      ) : null}
      {offersState.offers.map((offer) => (
        <JobOfferCard
          canAccept={canAccept}
          key={offer.id}
          loadingAction={actionLoading}
          offer={offer}
          onAccept={() => runOfferAction(offer.id, "accept")}
          onReject={() => runOfferAction(offer.id, "reject")}
        />
      ))}
    </ScrollView>
  );
}

function AssignedTripsScreen({ acceptedTrip, onBack, onOpen }) {
  const [state, setState] = useState({ loading: true, trips: [], error: "" });

  async function loadTrips() {
    setState({ loading: true, trips: [], error: "" });
    try {
      const data = await listAssignedTrips();
      setState({ loading: false, trips: data.assignedTrips || [], error: "" });
    } catch (error) {
      setState({ loading: false, trips: [], error: error.message });
    }
  }

  useEffect(() => {
    loadTrips();
  }, []);

  const shownTrips = state.trips.length ? state.trips : acceptedTrip ? [acceptedTrip] : [];

  return (
    <ScrollView contentContainerStyle={styles.pageContainer}>
      <SecondaryButton label="Back Home" onPress={onBack} />
      <View>
        <Text style={styles.eyebrow}>Assigned Trips</Text>
        <Text style={styles.title}>Assigned Trips</Text>
      </View>
      {state.loading ? <StatusCard text="Loading assigned trips..." /> : null}
      {state.error ? <StatusCard text={state.error} /> : null}
      {!state.loading && !state.error && shownTrips.length === 0 ? <StatusCard text="No assigned trips." /> : null}
      {shownTrips.map((trip) => (
        <TripCard key={trip.id} onPress={() => onOpen(trip.id)} trip={trip} />
      ))}
    </ScrollView>
  );
}

function TripDetailScreen({ bookingId, onBack, onCareReport, onChat }) {
  const [state, setState] = useState({ loading: true, data: null, error: "" });
  const [actionLoading, setActionLoading] = useState(null);

  async function loadTrip() {
    if (!bookingId) {
      setState({ loading: false, data: null, error: "Select an assigned trip first." });
      return;
    }

    setState({ loading: true, data: null, error: "" });
    try {
      const data = await getRiderTripDetail(bookingId);
      setState({ loading: false, data, error: "" });
    } catch (error) {
      setState({ loading: false, data: null, error: error.message });
    }
  }

  useEffect(() => {
    loadTrip();
  }, [bookingId]);

  async function runTripAction(key, handler) {
    setActionLoading(key);
    try {
      await handler();
      await loadTrip();
    } catch (error) {
      Alert.alert("Trip action failed", error.message);
    } finally {
      setActionLoading(null);
    }
  }

  const booking = state.data?.booking;
  const events = state.data?.tripEvents || [];

  return (
    <ScrollView contentContainerStyle={styles.pageContainer}>
      <SecondaryButton label="Back to Trips" onPress={onBack} />
      {state.loading ? <StatusCard text="Loading trip detail..." /> : null}
      {state.error ? <StatusCard text={state.error} /> : null}
      {booking ? (
        <>
          <TripCard trip={booking} />
          <View style={styles.card}>
            <Text style={styles.menuTitle}>Trip Status Actions</Text>
            <PrimaryButton disabled={booking.status !== "ASSIGNED"} label={actionLoading === "on_the_way" ? "Saving..." : "On The Way"} onPress={() => runTripAction("on_the_way", () => recordTripEvent(booking.id, "on_the_way"))} />
            <PrimaryButton disabled={booking.status !== "ASSIGNED"} label="Arrived Pickup" onPress={() => runTripAction("arrived_pickup", () => recordTripEvent(booking.id, "arrived_pickup"))} />
            <PrimaryButton disabled={booking.status !== "ASSIGNED"} label="Passenger Picked Up" onPress={() => runTripAction("passenger_picked_up", () => recordTripEvent(booking.id, "passenger_picked_up"))} />
            <PrimaryButton disabled={booking.status !== "ASSIGNED"} label="Start Trip" onPress={() => runTripAction("start_trip", () => startTrip(booking.id))} />
            <PrimaryButton disabled={booking.status !== "IN_PROGRESS"} label="Arrived Destination" onPress={() => runTripAction("arrived_destination", () => recordTripEvent(booking.id, "arrived_destination"))} />
            <PrimaryButton disabled={booking.status !== "IN_PROGRESS"} label="Complete Trip" onPress={() => runTripAction("complete_trip", () => completeTrip(booking.id))} />
            <SecondaryButton label="Chat" onPress={onChat} />
            <SecondaryButton label="Care Report" onPress={onCareReport} />
          </View>
          <View style={styles.card}>
            <Text style={styles.menuTitle}>Trip Events</Text>
            {events.length === 0 ? <Text style={styles.mutedText}>No trip events yet.</Text> : null}
            {events.map((event) => (
              <InfoRow key={event.id} label={event.eventType} value={event.createdAt} />
            ))}
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

function RiderChatScreen({ bookingId, onBack }) {
  const [state, setState] = useState({ loading: true, messages: [], error: "" });
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  async function loadMessages() {
    if (!bookingId) {
      setState({ loading: false, messages: [], error: "Select a trip first." });
      return;
    }

    setState({ loading: true, messages: [], error: "" });
    try {
      const data = await listBookingChatMessages(bookingId);
      setState({ loading: false, messages: data.chatMessages || [], error: "" });
    } catch (error) {
      setState({ loading: false, messages: [], error: error.message });
    }
  }

  useEffect(() => {
    loadMessages();
  }, [bookingId]);

  async function sendMessage() {
    setSending(true);
    try {
      await sendBookingChatMessage(bookingId, message);
      setMessage("");
      await loadMessages();
    } catch (error) {
      Alert.alert("Message failed", error.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
      <ScrollView contentContainerStyle={styles.pageContainer} keyboardShouldPersistTaps="handled">
        <SecondaryButton label="Back to Trip" onPress={onBack} />
        <Text style={styles.title}>Trip Chat</Text>
        {state.loading ? <StatusCard text="Loading messages..." /> : null}
        {state.error ? <StatusCard text={state.error} /> : null}
        <View style={styles.card}>
          {state.messages.length === 0 ? <Text style={styles.mutedText}>No messages yet.</Text> : null}
          {state.messages.map((item) => (
            <View key={item.id} style={styles.messageBubble}>
              <Text style={styles.menuTitle}>{item.senderName}</Text>
              <Text style={styles.statusBadge}>{item.senderRole}</Text>
              <Text style={styles.rowValue}>{item.message}</Text>
            </View>
          ))}
          <TextInput multiline onChangeText={setMessage} placeholder="Type message" style={[styles.input, styles.textArea]} value={message} />
          <PrimaryButton disabled={sending || !message.trim()} label={sending ? "Sending..." : "Send Message"} onPress={sendMessage} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function CareReportScreen({ bookingId, onBack }) {
  const [form, setForm] = useState({
    arrivedSafely: true,
    assistanceGiven: "",
    handoverNotes: "",
    medicationOrDocumentNotes: "",
    summary: "",
  });
  const [submitting, setSubmitting] = useState(false);

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function submit() {
    setSubmitting(true);
    try {
      await submitCareReport(bookingId, form);
      Alert.alert("Care report submitted", "Admin can now review the care report.");
      onBack();
    } catch (error) {
      Alert.alert("Care report failed", error.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
      <ScrollView contentContainerStyle={styles.pageContainer} keyboardShouldPersistTaps="handled">
        <SecondaryButton label="Back to Trip" onPress={onBack} />
        <View style={styles.card}>
          <Text style={styles.title}>Care Report</Text>
          <Pressable onPress={() => updateField("arrivedSafely", !form.arrivedSafely)} style={styles.menuCard}>
            <Text style={styles.menuTitle}>Arrived Safely</Text>
            <Text style={styles.statusBadge}>{form.arrivedSafely ? "Yes" : "No"}</Text>
          </Pressable>
          <TextInput onChangeText={(value) => updateField("assistanceGiven", value)} placeholder="Assistance given" style={styles.input} value={form.assistanceGiven} />
          <TextInput onChangeText={(value) => updateField("handoverNotes", value)} placeholder="Handover notes" style={styles.input} value={form.handoverNotes} />
          <TextInput onChangeText={(value) => updateField("medicationOrDocumentNotes", value)} placeholder="Medication/document notes" style={styles.input} value={form.medicationOrDocumentNotes} />
          <TextInput multiline onChangeText={(value) => updateField("summary", value)} placeholder="Summary" style={[styles.input, styles.textArea]} value={form.summary} />
          <PrimaryButton disabled={submitting || !form.assistanceGiven.trim() || !form.summary.trim()} label={submitting ? "Submitting..." : "Submit Care Report"} onPress={submit} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function FoundationScreen({ title, onBack }) {
  return (
    <ScrollView contentContainerStyle={styles.pageContainer}>
      <SecondaryButton label="Back Home" onPress={onBack} />
      <View style={styles.card}>
        <Text style={styles.eyebrow}>Rider Flow</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.mutedText}>Screen foundation only. Backend actions for this rider screen will be added in its approved phase.</Text>
      </View>
    </ScrollView>
  );
}

function JobOfferCard({ canAccept, loadingAction, offer, onAccept, onReject }) {
  const booking = offer.booking || {};

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.menuTitle}>Offer #{offer.id}</Text>
        <Text style={styles.statusBadge}>{offer.offerStatus}</Text>
      </View>
      <InfoRow label="Pickup" value={booking.pickupAddress} />
      <InfoRow label="Destination" value={booking.destinationAddress} />
      <InfoRow label="Date/time" value={booking.pickupDatetime} />
      <InfoRow label="Service Type" value={booking.serviceType} />
      <InfoRow label="Passenger Category" value={booking.passengerCategory} />
      <InfoRow label="Estimated Payout" value={`RM ${((booking.estimatedFare || 0) / 100).toFixed(2)}`} />
      <View style={styles.buttonRow}>
        <PrimaryButton
          disabled={!canAccept || loadingAction === `accept-${offer.id}`}
          label={loadingAction === `accept-${offer.id}` ? "Accepting..." : "Accept"}
          onPress={onAccept}
        />
        <SecondaryButton label={loadingAction === `reject-${offer.id}` ? "Rejecting..." : "Reject"} onPress={onReject} />
      </View>
    </View>
  );
}

function TripCard({ onPress, trip }) {
  const Wrapper = onPress ? Pressable : View;

  return (
    <Wrapper onPress={onPress} style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.menuTitle}>Trip #{trip.id}</Text>
        <Text style={styles.statusBadge}>{trip.status}</Text>
      </View>
      <InfoRow label="Pickup" value={trip.pickupAddress} />
      <InfoRow label="Destination" value={trip.destinationAddress} />
      <InfoRow label="Date/time" value={trip.pickupDatetime} />
      <InfoRow label="Service Type" value={trip.serviceType} />
      <InfoRow label="Passenger Category" value={trip.passengerCategory} />
    </Wrapper>
  );
}

function InfoRow({ label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value || "Not available"}</Text>
    </View>
  );
}

function StatusCard({ text }) {
  return (
    <View style={styles.card}>
      <Text style={styles.mutedText}>{text}</Text>
    </View>
  );
}

function InfoPill({ label, value }) {
  return (
    <View style={styles.infoPill}>
      <Text style={styles.pillLabel}>{label}</Text>
      <Text style={styles.pillValue}>{value}</Text>
    </View>
  );
}

function PrimaryButton({ disabled, label, onPress }) {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={[styles.primaryButton, disabled && styles.disabledButton]}>
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

function SecondaryButton({ label, onPress }) {
  return (
    <Pressable onPress={onPress} style={styles.secondaryButton}>
      <Text style={styles.secondaryButtonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fbf7ff",
  },
  flex: {
    flex: 1,
  },
  authContainer: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  pageContainer: {
    flexGrow: 1,
    padding: 20,
    gap: 16,
  },
  loadingPanel: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  logoBox: {
    width: 68,
    height: 68,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#6d25bd",
    shadowColor: "#6d25bd",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  logoIcon: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
  },
  eyebrow: {
    color: "#6d25bd",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  title: {
    color: "#1f1633",
    fontSize: 26,
    fontWeight: "900",
  },
  card: {
    gap: 12,
    borderWidth: 1,
    borderColor: "#eadcf6",
    borderRadius: 8,
    backgroundColor: "#fff",
    padding: 16,
  },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: "#eadcf6",
    borderRadius: 8,
    backgroundColor: "#fff",
    color: "#1f1633",
    paddingHorizontal: 12,
  },
  textArea: {
    minHeight: 88,
    paddingTop: 12,
    textAlignVertical: "top",
  },
  primaryButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#6d25bd",
    paddingHorizontal: 16,
  },
  disabledButton: {
    backgroundColor: "#c8b9da",
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "900",
  },
  secondaryButton: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#f4e7ff",
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    color: "#6d25bd",
    fontWeight: "900",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  logoutButton: {
    borderRadius: 8,
    backgroundColor: "#f4e7ff",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  logoutText: {
    color: "#6d25bd",
    fontWeight: "900",
  },
  heroCard: {
    gap: 12,
    borderRadius: 8,
    backgroundColor: "#6d25bd",
    padding: 18,
  },
  heroTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
  },
  heroText: {
    color: "#f6e9ff",
    lineHeight: 21,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
  },
  statusRow: {
    flexDirection: "row",
    gap: 12,
  },
  infoPill: {
    flex: 1,
    gap: 4,
    borderWidth: 1,
    borderColor: "#eadcf6",
    borderRadius: 8,
    backgroundColor: "#fff",
    padding: 14,
  },
  pillLabel: {
    color: "#746987",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  pillValue: {
    color: "#1f1633",
    fontWeight: "900",
  },
  infoRow: {
    gap: 4,
    borderTopWidth: 1,
    borderTopColor: "#f3eef8",
    paddingTop: 10,
  },
  rowLabel: {
    color: "#746987",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  rowValue: {
    color: "#1f1633",
    fontWeight: "800",
    lineHeight: 20,
  },
  messageBubble: {
    gap: 8,
    borderWidth: 1,
    borderColor: "#eadcf6",
    borderRadius: 8,
    backgroundColor: "#fbf7ff",
    padding: 12,
  },
  grid: {
    gap: 12,
  },
  menuCard: {
    minHeight: 82,
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#eadcf6",
    borderRadius: 8,
    backgroundColor: "#fff",
    padding: 14,
  },
  menuTitle: {
    color: "#1f1633",
    fontSize: 16,
    fontWeight: "900",
  },
  statusBadge: {
    alignSelf: "flex-start",
    overflow: "hidden",
    borderRadius: 999,
    backgroundColor: "#ecfdf5",
    color: "#047857",
    fontSize: 12,
    fontWeight: "900",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  mutedText: {
    color: "#746987",
    lineHeight: 21,
  },
});

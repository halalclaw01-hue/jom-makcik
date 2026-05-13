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
  confirmPassengerBooking,
  createPassengerBooking,
  getPassengerBooking,
  listPassengerBookings,
  listBookingChatMessages,
  loginPassenger,
  registerPassenger,
  sendBookingChatMessage,
  setAuthToken,
  submitPassengerPaymentProof,
} from "./src/api/client";
import { clearToken, getToken, saveToken } from "./src/storage/tokenStorage";

const SCREENS = {
  LOGIN: "Login",
  REGISTER: "Register",
  HOME: "Home",
  CREATE_BOOKING: "Create Booking",
  MY_BOOKINGS: "My Bookings",
  BOOKING_DETAIL: "Booking Detail",
  PAYMENT_PROOF: "Payment Proof",
  CHAT: "Chat",
  FEEDBACK: "Feedback",
};

const HOME_ACTIONS = [
  SCREENS.CREATE_BOOKING,
  SCREENS.MY_BOOKINGS,
  SCREENS.BOOKING_DETAIL,
  SCREENS.PAYMENT_PROOF,
  SCREENS.CHAT,
  SCREENS.FEEDBACK,
];

export default function App() {
  const [screen, setScreen] = useState(SCREENS.LOGIN);
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  const [latestQuote, setLatestQuote] = useState(null);
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
    if (data.user?.role !== "passenger") {
      throw new Error("Passenger account required.");
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
          <ActivityIndicator color="#7c2bd6" />
          <Text style={styles.mutedText}>Checking saved session...</Text>
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

    if (screen === SCREENS.CREATE_BOOKING) {
      return (
        <CreateBookingScreen
          onBack={() => setScreen(SCREENS.HOME)}
          onCreated={({ booking, quote }) => {
            setSelectedBookingId(booking.id);
            setLatestQuote(quote);
            setScreen(SCREENS.BOOKING_DETAIL);
          }}
        />
      );
    }

    if (screen === SCREENS.MY_BOOKINGS) {
      return (
        <MyBookingsScreen
          onBack={() => setScreen(SCREENS.HOME)}
          onOpen={(bookingId) => {
            setSelectedBookingId(bookingId);
            setLatestQuote(null);
            setScreen(SCREENS.BOOKING_DETAIL);
          }}
        />
      );
    }

    if (screen === SCREENS.BOOKING_DETAIL) {
      return (
        <BookingDetailScreen
          bookingId={selectedBookingId}
          latestQuote={latestQuote}
          onBack={() => setScreen(SCREENS.MY_BOOKINGS)}
          onChat={() => setScreen(SCREENS.CHAT)}
          onCreate={() => setScreen(SCREENS.CREATE_BOOKING)}
          onPayment={() => setScreen(SCREENS.PAYMENT_PROOF)}
        />
      );
    }

    if (screen === SCREENS.PAYMENT_PROOF) {
      return (
        <PaymentProofScreen
          selectedBookingId={selectedBookingId}
          onBack={() => setScreen(SCREENS.HOME)}
          onBookingChange={setSelectedBookingId}
        />
      );
    }

    if (screen === SCREENS.CHAT) {
      return (
        <ChatScreen
          selectedBookingId={selectedBookingId}
          onBack={() => setScreen(SCREENS.HOME)}
          onBookingChange={setSelectedBookingId}
        />
      );
    }

    return <PlaceholderScreen title={screen} onBack={() => setScreen(SCREENS.HOME)} />;
  }, [authenticated, checkingToken, latestQuote, screen, selectedBookingId, user]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff7fc" />
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
      const data = await loginPassenger({ identifier, password });
      await onSuccess(data);
    } catch (error) {
      Alert.alert("Login failed", error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell eyebrow="Passenger App" title="Jom Makcik CareRide">
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
      <SecondaryButton label="Create passenger account" onPress={onRegister} />
    </AuthShell>
  );
}

function RegisterScreen({ onLogin, onSuccess }) {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
  });
  const [loading, setLoading] = useState(false);

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function submit() {
    setLoading(true);
    try {
      const data = await registerPassenger(form);
      await onSuccess(data);
    } catch (error) {
      Alert.alert("Registration failed", error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell eyebrow="Passenger Registration" title="Create Account">
      <TextInput onChangeText={(value) => updateField("name", value)} placeholder="Full name" style={styles.input} value={form.name} />
      <TextInput onChangeText={(value) => updateField("phone", value)} placeholder="Phone number" style={styles.input} value={form.phone} />
      <TextInput autoCapitalize="none" keyboardType="email-address" onChangeText={(value) => updateField("email", value)} placeholder="Email" style={styles.input} value={form.email} />
      <TextInput onChangeText={(value) => updateField("password", value)} placeholder="Password" secureTextEntry style={styles.input} value={form.password} />
      <TextInput onChangeText={(value) => updateField("emergencyContactName", value)} placeholder="Emergency contact name" style={styles.input} value={form.emergencyContactName} />
      <TextInput onChangeText={(value) => updateField("emergencyContactPhone", value)} placeholder="Emergency contact phone" style={styles.input} value={form.emergencyContactPhone} />
      <PrimaryButton disabled={loading} label={loading ? "Creating..." : "Register"} onPress={submit} />
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
          <Text style={styles.eyebrow}>Good Morning</Text>
          <Text style={styles.title}>{user?.name || "Passenger"}</Text>
        </View>
        <Pressable onPress={onLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </View>

      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>Book assisted mobility care</Text>
        <Text style={styles.heroText}>Simple booking, manual payment proof, and admin-monitored care support.</Text>
        <PrimaryButton label="New Booking" onPress={() => onNavigate(SCREENS.CREATE_BOOKING)} />
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

function CreateBookingScreen({ onBack, onCreated }) {
  const [form, setForm] = useState({
    dependentName: "",
    passengerCategory: "senior",
    serviceType: "medical_appointment",
    pickupAddress: "",
    destinationAddress: "",
    pickupDatetime: "",
    specialNotes: "",
  });
  const [needsChaperone, setNeedsChaperone] = useState(false);
  const [loading, setLoading] = useState(false);

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function submit() {
    setLoading(true);
    try {
      const data = await createPassengerBooking({
        ...form,
        dependentName: form.dependentName || undefined,
        specialNotes: form.specialNotes || undefined,
        status: "QUOTED",
        needsChaperone,
      });
      onCreated(data);
    } catch (error) {
      Alert.alert("Booking failed", error.message);
    } finally {
      setLoading(false);
    }
  }

  const canSubmit =
    form.passengerCategory &&
    form.serviceType &&
    form.pickupAddress &&
    form.destinationAddress &&
    form.pickupDatetime;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
      <ScrollView contentContainerStyle={styles.pageContainer} keyboardShouldPersistTaps="handled">
        <SecondaryButton label="Back Home" onPress={onBack} />
        <View style={styles.card}>
          <Text style={styles.eyebrow}>New Booking</Text>
          <Text style={styles.title}>Create Booking</Text>
          <TextInput
            onChangeText={(value) => updateField("dependentName", value)}
            placeholder="Passenger/dependent name"
            style={styles.input}
            value={form.dependentName}
          />
          <ChoiceGroup
            label="Passenger Category"
            options={[
              { label: "Senior", value: "senior" },
              { label: "Adult", value: "adult" },
              { label: "Disabled", value: "disabled" },
            ]}
            value={form.passengerCategory}
            onChange={(value) => updateField("passengerCategory", value)}
          />
          <ChoiceGroup
            label="Service Type"
            options={[
              { label: "Medical", value: "medical_appointment" },
              { label: "Dialysis", value: "dialysis" },
              { label: "Physio", value: "physiotherapy" },
              { label: "Discharge", value: "hospital_discharge" },
            ]}
            value={form.serviceType}
            onChange={(value) => updateField("serviceType", value)}
          />
          <TextInput
            onChangeText={(value) => updateField("pickupAddress", value)}
            placeholder="Pickup address"
            style={styles.input}
            value={form.pickupAddress}
          />
          <TextInput
            onChangeText={(value) => updateField("destinationAddress", value)}
            placeholder="Destination address"
            style={styles.input}
            value={form.destinationAddress}
          />
          <TextInput
            onChangeText={(value) => updateField("pickupDatetime", value)}
            placeholder="Date/time, e.g. 2026-05-20T10:00:00.000Z"
            style={styles.input}
            value={form.pickupDatetime}
          />
          <TextInput
            multiline
            onChangeText={(value) => updateField("specialNotes", value)}
            placeholder="Special notes"
            style={[styles.input, styles.textArea]}
            value={form.specialNotes}
          />
          <Pressable onPress={() => setNeedsChaperone((value) => !value)} style={styles.toggleRow}>
            <Text style={styles.menuTitle}>Chaperone required</Text>
            <Text style={needsChaperone ? styles.statusBadge : styles.neutralBadge}>
              {needsChaperone ? "Yes" : "No"}
            </Text>
          </Pressable>
          <PrimaryButton disabled={loading || !canSubmit} label={loading ? "Submitting..." : "Get Fare Quote"} onPress={submit} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function MyBookingsScreen({ onBack, onOpen }) {
  const [state, setState] = useState({ loading: true, bookings: [], error: "" });

  async function loadBookings() {
    setState({ loading: true, bookings: [], error: "" });
    try {
      const data = await listPassengerBookings();
      setState({ loading: false, bookings: data.bookings || [], error: "" });
    } catch (error) {
      setState({ loading: false, bookings: [], error: error.message });
    }
  }

  useEffect(() => {
    loadBookings();
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.pageContainer}>
      <SecondaryButton label="Back Home" onPress={onBack} />
      <View>
        <Text style={styles.eyebrow}>Passenger Bookings</Text>
        <Text style={styles.title}>My Bookings</Text>
      </View>
      {state.loading ? <LoadingCard text="Loading bookings..." /> : null}
      {state.error ? <EmptyCard text={state.error} /> : null}
      {!state.loading && !state.error && state.bookings.length === 0 ? (
        <EmptyCard text="No bookings yet. Create a booking to receive an MVP fare quote." />
      ) : null}
      {state.bookings.map((booking) => (
        <BookingCard booking={booking} key={booking.id} onPress={() => onOpen(booking.id)} />
      ))}
    </ScrollView>
  );
}

function BookingDetailScreen({ bookingId, latestQuote, onBack, onChat, onCreate, onPayment }) {
  const [state, setState] = useState({ loading: Boolean(bookingId), booking: null, error: "" });
  const [actionLoading, setActionLoading] = useState(false);

  async function loadBooking() {
    if (!bookingId) return;
    setState({ loading: true, booking: null, error: "" });
    try {
      const data = await getPassengerBooking(bookingId);
      setState({ loading: false, booking: data.booking, error: "" });
    } catch (error) {
      setState({ loading: false, booking: null, error: error.message });
    }
  }

  useEffect(() => {
    loadBooking();
  }, [bookingId]);

  async function confirmBooking() {
    setActionLoading(true);
    try {
      const data = await confirmPassengerBooking(bookingId);
      setState({ loading: false, booking: data.booking, error: "" });
      Alert.alert("Booking confirmed", "Status moved to PAYMENT_PENDING.");
    } catch (error) {
      Alert.alert("Confirm failed", error.message);
    } finally {
      setActionLoading(false);
    }
  }

  if (!bookingId) {
    return (
      <ScrollView contentContainerStyle={styles.pageContainer}>
        <SecondaryButton label="Back to Bookings" onPress={onBack} />
        <EmptyCard text="Select a booking from My Bookings or create a new booking." />
        <PrimaryButton label="Create Booking" onPress={onCreate} />
      </ScrollView>
    );
  }

  const booking = state.booking;

  return (
    <ScrollView contentContainerStyle={styles.pageContainer}>
      <SecondaryButton label="Back to My Bookings" onPress={onBack} />
      {state.loading ? <LoadingCard text="Loading booking..." /> : null}
      {state.error ? <EmptyCard text={state.error} /> : null}
      {booking ? (
        <>
          <View style={styles.card}>
            <Text style={styles.eyebrow}>Booking #{booking.id}</Text>
            <Text style={styles.title}>{booking.serviceType}</Text>
            <Text style={styles.statusBadge}>{booking.status}</Text>
            <DetailRow label="Passenger/dependent" value={booking.dependentName || "Main passenger"} />
            <DetailRow label="Category" value={booking.passengerCategory} />
            <DetailRow label="Pickup" value={booking.pickupAddress} />
            <DetailRow label="Destination" value={booking.destinationAddress} />
            <DetailRow label="Date/time" value={booking.pickupDatetime} />
            <DetailRow label="Special notes" value={booking.specialNotes || "None"} />
            <DetailRow label="Payment" value={booking.paymentStatus} />
          </View>
          <View style={styles.card}>
            <Text style={styles.eyebrow}>MVP Fare Quote</Text>
            <Text style={styles.fareText}>RM {((booking.estimatedFare || 0) / 100).toFixed(2)}</Text>
            {latestQuote?.description ? <Text style={styles.mutedText}>{latestQuote.description}</Text> : null}
            <Text style={styles.mutedText}>This is MVP quote logic. Final fare rules can be refined later.</Text>
            <PrimaryButton
              disabled={booking.status !== "QUOTED" || actionLoading}
              label={actionLoading ? "Confirming..." : "Confirm Booking"}
              onPress={confirmBooking}
            />
          </View>
          <View style={styles.card}>
            <Text style={styles.eyebrow}>Booking Status</Text>
            <Text style={styles.menuTitle}>{booking.status}</Text>
            <Text style={styles.mutedText}>
              {booking.status === "PAYMENT_PENDING"
                ? "Next step: submit manual payment proof in the Payment Proof phase."
                : "Admin oversight applies before rider assignment."}
            </Text>
            <PrimaryButton disabled={booking.status !== "PAYMENT_PENDING"} label="Submit Payment Proof" onPress={onPayment} />
            <SecondaryButton label="Open Chat" onPress={onChat} />
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

function ChoiceGroup({ label, options, value, onChange }) {
  return (
    <View style={styles.choiceBlock}>
      <Text style={styles.choiceLabel}>{label}</Text>
      <View style={styles.choiceGrid}>
        {options.map((option) => (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.choiceButton, value === option.value && styles.choiceButtonActive]}
          >
            <Text style={[styles.choiceText, value === option.value && styles.choiceTextActive]}>
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function BookingCard({ booking, onPress }) {
  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.menuTitle}>Booking #{booking.id}</Text>
        <Text style={styles.statusBadge}>{booking.status}</Text>
      </View>
      <DetailRow label="Pickup" value={booking.pickupAddress} />
      <DetailRow label="Destination" value={booking.destinationAddress} />
      <DetailRow label="Fare" value={`RM ${((booking.estimatedFare || 0) / 100).toFixed(2)}`} />
    </Pressable>
  );
}

function DetailRow({ label, value }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function LoadingCard({ text }) {
  return (
    <View style={styles.card}>
      <ActivityIndicator color="#7c2bd6" />
      <Text style={styles.mutedText}>{text}</Text>
    </View>
  );
}

function EmptyCard({ text }) {
  return (
    <View style={styles.card}>
      <Text style={styles.mutedText}>{text}</Text>
    </View>
  );
}

function PaymentProofScreen({ selectedBookingId, onBack, onBookingChange }) {
  const [bookingsState, setBookingsState] = useState({ loading: true, bookings: [], error: "" });
  const [bookingState, setBookingState] = useState({ loading: false, booking: null, error: "" });
  const [proofReference, setProofReference] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function loadBookings() {
    setBookingsState({ loading: true, bookings: [], error: "" });
    try {
      const data = await listPassengerBookings();
      const bookings = data.bookings || [];
      setBookingsState({ loading: false, bookings, error: "" });
      if (!selectedBookingId && bookings[0]?.id) {
        onBookingChange(bookings[0].id);
      }
    } catch (error) {
      setBookingsState({ loading: false, bookings: [], error: error.message });
    }
  }

  async function loadBooking() {
    if (!selectedBookingId) {
      setBookingState({ loading: false, booking: null, error: "" });
      return;
    }

    setBookingState({ loading: true, booking: null, error: "" });
    try {
      const data = await getPassengerBooking(selectedBookingId);
      setBookingState({ loading: false, booking: data.booking, error: "" });
    } catch (error) {
      setBookingState({ loading: false, booking: null, error: error.message });
    }
  }

  useEffect(() => {
    loadBookings();
  }, []);

  useEffect(() => {
    loadBooking();
  }, [selectedBookingId]);

  async function submitProof() {
    if (!bookingState.booking) return;

    setSubmitting(true);
    try {
      await submitPassengerPaymentProof(bookingState.booking.id, {
        amount: bookingState.booking.estimatedFare,
        proofReference,
      });
      setProofReference("");
      Alert.alert("Proof submitted", "Payment proof is pending admin verification.");
      await loadBooking();
    } catch (error) {
      Alert.alert("Payment proof failed", error.message);
    } finally {
      setSubmitting(false);
    }
  }

  const booking = bookingState.booking;
  const statusText = getPaymentStatusText(booking);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
      <ScrollView contentContainerStyle={styles.pageContainer} keyboardShouldPersistTaps="handled">
        <SecondaryButton label="Back Home" onPress={onBack} />
        <View>
          <Text style={styles.eyebrow}>Manual Payment</Text>
          <Text style={styles.title}>Payment Proof</Text>
        </View>
        <BookingPicker
          bookings={bookingsState.bookings}
          error={bookingsState.error}
          loading={bookingsState.loading}
          selectedBookingId={selectedBookingId}
          onSelect={onBookingChange}
        />
        {bookingState.loading ? <LoadingCard text="Loading payment status..." /> : null}
        {bookingState.error ? <EmptyCard text={bookingState.error} /> : null}
        {booking ? (
          <View style={styles.card}>
            <Text style={styles.eyebrow}>Booking #{booking.id}</Text>
            <Text style={styles.fareText}>RM {((booking.estimatedFare || 0) / 100).toFixed(2)}</Text>
            <Text style={styles.statusBadge}>{statusText}</Text>
            <DetailRow label="Booking Status" value={booking.status} />
            <DetailRow label="Payment Status" value={booking.paymentStatus} />
            <TextInput
              onChangeText={setProofReference}
              placeholder="Proof reference, e.g. bank transfer receipt number"
              style={styles.input}
              value={proofReference}
            />
            <PrimaryButton
              disabled={submitting || !proofReference.trim() || booking.status !== "PAYMENT_PENDING"}
              label={submitting ? "Submitting..." : "Submit Payment Proof"}
              onPress={submitProof}
            />
            {booking.status !== "PAYMENT_PENDING" ? (
              <Text style={styles.mutedText}>Payment proof can only be submitted when booking status is PAYMENT_PENDING.</Text>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function ChatScreen({ selectedBookingId, onBack, onBookingChange }) {
  const [bookingsState, setBookingsState] = useState({ loading: true, bookings: [], error: "" });
  const [messagesState, setMessagesState] = useState({ loading: false, messages: [], error: "" });
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  async function loadBookings() {
    setBookingsState({ loading: true, bookings: [], error: "" });
    try {
      const data = await listPassengerBookings();
      const bookings = data.bookings || [];
      setBookingsState({ loading: false, bookings, error: "" });
      if (!selectedBookingId && bookings[0]?.id) {
        onBookingChange(bookings[0].id);
      }
    } catch (error) {
      setBookingsState({ loading: false, bookings: [], error: error.message });
    }
  }

  async function loadMessages() {
    if (!selectedBookingId) {
      setMessagesState({ loading: false, messages: [], error: "" });
      return;
    }

    setMessagesState({ loading: true, messages: [], error: "" });
    try {
      const data = await listBookingChatMessages(selectedBookingId);
      setMessagesState({ loading: false, messages: data.chatMessages || [], error: "" });
    } catch (error) {
      setMessagesState({ loading: false, messages: [], error: error.message });
    }
  }

  useEffect(() => {
    loadBookings();
  }, []);

  useEffect(() => {
    loadMessages();
  }, [selectedBookingId]);

  async function sendMessage() {
    setSending(true);
    try {
      await sendBookingChatMessage(selectedBookingId, message);
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
        <SecondaryButton label="Back Home" onPress={onBack} />
        <View>
          <Text style={styles.eyebrow}>Monitored Chat</Text>
          <Text style={styles.title}>Booking Chat</Text>
        </View>
        <BookingPicker
          bookings={bookingsState.bookings}
          error={bookingsState.error}
          loading={bookingsState.loading}
          selectedBookingId={selectedBookingId}
          onSelect={onBookingChange}
        />
        <View style={styles.card}>
          {messagesState.loading ? <Text style={styles.mutedText}>Loading messages...</Text> : null}
          {messagesState.error ? <Text style={styles.mutedText}>{messagesState.error}</Text> : null}
          {!messagesState.loading && !messagesState.error && messagesState.messages.length === 0 ? (
            <Text style={styles.mutedText}>No chat messages yet.</Text>
          ) : null}
          {messagesState.messages.map((item) => (
            <View key={item.id} style={styles.messageBubble}>
              <View style={styles.cardHeader}>
                <Text style={styles.menuTitle}>{item.senderName}</Text>
                <Text style={styles.neutralBadge}>{item.senderRole}</Text>
              </View>
              <Text style={styles.detailValue}>{item.message}</Text>
              <Text style={styles.mutedText}>{item.createdAt}</Text>
            </View>
          ))}
          <TextInput
            multiline
            onChangeText={setMessage}
            placeholder="Type a message"
            style={[styles.input, styles.textArea]}
            value={message}
          />
          <PrimaryButton
            disabled={sending || !selectedBookingId || !message.trim()}
            label={sending ? "Sending..." : "Send Message"}
            onPress={sendMessage}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function BookingPicker({ bookings, error, loading, selectedBookingId, onSelect }) {
  if (loading) return <LoadingCard text="Loading your bookings..." />;
  if (error) return <EmptyCard text={error} />;
  if (!bookings.length) return <EmptyCard text="No bookings available yet." />;

  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>Select Booking</Text>
      {bookings.map((booking) => (
        <Pressable
          key={booking.id}
          onPress={() => onSelect(booking.id)}
          style={[styles.bookingSelectRow, selectedBookingId === booking.id && styles.bookingSelectRowActive]}
        >
          <View>
            <Text style={styles.menuTitle}>Booking #{booking.id}</Text>
            <Text style={styles.mutedText}>{booking.serviceType}</Text>
          </View>
          <Text style={styles.statusBadge}>{booking.status}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function getPaymentStatusText(booking) {
  if (!booking) return "pending verification";
  if (booking.status === "PAID" || booking.paymentStatus === "verified") return "paid";
  if (booking.paymentStatus === "rejected") return "rejected";
  return "pending verification";
}

function PlaceholderScreen({ title, onBack }) {
  return (
    <ScrollView contentContainerStyle={styles.pageContainer}>
      <SecondaryButton label="Back Home" onPress={onBack} />
      <View style={styles.card}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.mutedText}>Screen foundation only. Backend actions for this screen will be added in its approved phase.</Text>
      </View>
    </ScrollView>
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
    backgroundColor: "#fff7fc",
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
    backgroundColor: "#cf2b91",
    shadowColor: "#7c2bd6",
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
    color: "#7c2bd6",
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
    minHeight: 86,
    paddingTop: 12,
    textAlignVertical: "top",
  },
  primaryButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#7c2bd6",
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
    backgroundColor: "#cf2b91",
    padding: 18,
  },
  heroTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
  },
  heroText: {
    color: "#ffe8f6",
    lineHeight: 21,
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
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
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
  neutralBadge: {
    alignSelf: "flex-start",
    overflow: "hidden",
    borderRadius: 999,
    backgroundColor: "#f3eef8",
    color: "#746987",
    fontSize: 12,
    fontWeight: "900",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  toggleRow: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderWidth: 1,
    borderColor: "#eadcf6",
    borderRadius: 8,
    backgroundColor: "#fff",
    paddingHorizontal: 12,
  },
  choiceBlock: {
    gap: 8,
  },
  choiceLabel: {
    color: "#746987",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  choiceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  choiceButton: {
    minHeight: 40,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#eadcf6",
    borderRadius: 8,
    backgroundColor: "#fff",
    paddingHorizontal: 12,
  },
  choiceButtonActive: {
    borderColor: "#7c2bd6",
    backgroundColor: "#f4e7ff",
  },
  choiceText: {
    color: "#746987",
    fontWeight: "800",
  },
  choiceTextActive: {
    color: "#6d25bd",
  },
  detailRow: {
    gap: 4,
    borderTopWidth: 1,
    borderTopColor: "#f3eef8",
    paddingTop: 10,
  },
  detailLabel: {
    color: "#746987",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  detailValue: {
    color: "#1f1633",
    fontWeight: "800",
    lineHeight: 20,
  },
  bookingSelectRow: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderWidth: 1,
    borderColor: "#eadcf6",
    borderRadius: 8,
    backgroundColor: "#fff",
    padding: 12,
  },
  bookingSelectRowActive: {
    borderColor: "#7c2bd6",
    backgroundColor: "#fbf4ff",
  },
  messageBubble: {
    gap: 8,
    borderWidth: 1,
    borderColor: "#eadcf6",
    borderRadius: 8,
    backgroundColor: "#fbf4ff",
    padding: 12,
  },
  fareText: {
    color: "#cf2b91",
    fontSize: 30,
    fontWeight: "900",
  },
  mutedText: {
    color: "#746987",
    lineHeight: 21,
  },
});

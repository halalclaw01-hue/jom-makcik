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
  approvePaymentProof,
  approveRider,
  assignRiderToBooking,
  getAdminBookingDetail,
  listAdminBookings,
  listAdminChatConversations,
  listBookingChatMessages,
  listMatchingQueue,
  listMatchingRiders,
  listPendingPaymentProofs,
  listPendingRiders,
  loginAdmin,
  rejectPaymentProof,
  rejectRider,
  sendBookingChatMessage,
  setAuthToken,
  startBookingMatching,
} from "./src/api/client";
import { clearToken, getToken, saveToken } from "./src/storage/tokenStorage";

const SCREENS = {
  LOGIN: "Login",
  DASHBOARD: "Dashboard",
  BOOKINGS: "Bookings",
  BOOKING_DETAIL: "Booking Detail",
  PAYMENT_VERIFICATION: "Payment Verification",
  RIDER_APPROVAL: "Rider Approval",
  MATCHING: "Matching",
  ALERTS: "Alerts",
  CHAT_MONITOR: "Chat Monitor",
};

const DASHBOARD_ACTIONS = [
  SCREENS.BOOKINGS,
  SCREENS.BOOKING_DETAIL,
  SCREENS.PAYMENT_VERIFICATION,
  SCREENS.RIDER_APPROVAL,
  SCREENS.MATCHING,
  SCREENS.ALERTS,
  SCREENS.CHAT_MONITOR,
];

function formatMoney(amountSen) {
  const amount = Number(amountSen || 0) / 100;
  return `RM ${amount.toFixed(2)}`;
}

function formatDate(value) {
  if (!value) return "-";
  return String(value).replace("T", " ").slice(0, 16);
}

function formatStatus(value) {
  return String(value || "-").replace(/_/g, " ");
}

export default function App() {
  const [screen, setScreen] = useState(SCREENS.LOGIN);
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [checkingToken, setCheckingToken] = useState(true);
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  const [selectedChatBookingId, setSelectedChatBookingId] = useState(null);

  useEffect(() => {
    getToken()
      .then((storedToken) => {
        if (storedToken) {
          setToken(storedToken);
          setAuthToken(storedToken);
          setScreen(SCREENS.DASHBOARD);
        }
      })
      .finally(() => setCheckingToken(false));
  }, []);

  async function handleAuthSuccess(data) {
    if (!["admin", "super_admin"].includes(data.user?.role)) {
      throw new Error("Admin account required.");
    }

    await saveToken(data.token);
    setAuthToken(data.token);
    setToken(data.token);
    setUser(data.user);
    setScreen(SCREENS.DASHBOARD);
  }

  async function handleLogout() {
    await clearToken();
    setAuthToken(null);
    setToken(null);
    setUser(null);
    setSelectedBookingId(null);
    setSelectedChatBookingId(null);
    setScreen(SCREENS.LOGIN);
  }

  function openBooking(bookingId) {
    setSelectedBookingId(bookingId);
    setScreen(SCREENS.BOOKING_DETAIL);
  }

  function openChat(bookingId) {
    setSelectedChatBookingId(bookingId);
    setScreen(SCREENS.CHAT_MONITOR);
  }

  const authenticated = Boolean(token);

  const content = useMemo(() => {
    if (checkingToken) {
      return (
        <View style={styles.loadingPanel}>
          <ActivityIndicator color="#4f20a8" />
          <Text style={styles.mutedText}>Checking admin session...</Text>
        </View>
      );
    }

    if (!authenticated) {
      return <LoginScreen onSuccess={handleAuthSuccess} />;
    }

    if (screen === SCREENS.DASHBOARD) {
      return <DashboardScreen user={user} onNavigate={setScreen} onLogout={handleLogout} />;
    }

    if (screen === SCREENS.BOOKINGS) {
      return <BookingsScreen onBack={() => setScreen(SCREENS.DASHBOARD)} onOpen={openBooking} />;
    }

    if (screen === SCREENS.BOOKING_DETAIL) {
      return (
        <BookingDetailScreen
          bookingId={selectedBookingId}
          onBack={() => setScreen(SCREENS.DASHBOARD)}
          onOpenBookings={() => setScreen(SCREENS.BOOKINGS)}
          onOpenChat={openChat}
        />
      );
    }

    if (screen === SCREENS.PAYMENT_VERIFICATION) {
      return <PaymentVerificationScreen onBack={() => setScreen(SCREENS.DASHBOARD)} onOpenBooking={openBooking} />;
    }

    if (screen === SCREENS.RIDER_APPROVAL) {
      return <RiderApprovalScreen onBack={() => setScreen(SCREENS.DASHBOARD)} />;
    }

    if (screen === SCREENS.MATCHING) {
      return <MatchingScreen onBack={() => setScreen(SCREENS.DASHBOARD)} onOpenBooking={openBooking} />;
    }

    if (screen === SCREENS.ALERTS) {
      return <AlertsScreen onBack={() => setScreen(SCREENS.DASHBOARD)} onOpenBooking={openBooking} />;
    }

    if (screen === SCREENS.CHAT_MONITOR) {
      return (
        <ChatMonitorScreen
          initialBookingId={selectedChatBookingId}
          onBack={() => setScreen(SCREENS.DASHBOARD)}
          onOpenBooking={openBooking}
        />
      );
    }

    return <DashboardScreen user={user} onNavigate={setScreen} onLogout={handleLogout} />;
  }, [authenticated, checkingToken, screen, selectedBookingId, selectedChatBookingId, user]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fbf7ff" />
      {content}
    </SafeAreaView>
  );
}

function LoginScreen({ onSuccess }) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    try {
      const data = await loginAdmin({ identifier, password });
      await onSuccess(data);
    } catch (error) {
      Alert.alert("Login failed", error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
      <ScrollView contentContainerStyle={styles.authContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.logoBox}>
          <Text style={styles.logoIcon}>JM</Text>
        </View>
        <Text style={styles.eyebrow}>Admin App</Text>
        <Text style={styles.title}>Jom Makcik Admin</Text>
        <View style={styles.card}>
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
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function DashboardScreen({ user, onNavigate, onLogout }) {
  return (
    <ScrollView contentContainerStyle={styles.pageContainer}>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>Urgent Monitoring</Text>
          <Text style={styles.title}>Dashboard</Text>
          <Text style={styles.mutedText}>{user?.name || "Admin"} / {user?.role || "admin"}</Text>
        </View>
        <Pressable onPress={onLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </View>

      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>Controlled oversight first</Text>
        <Text style={styles.heroText}>Use this light mobile app for urgent operations. Detailed reporting remains in the Control Centre web dashboard.</Text>
      </View>

      <View style={styles.statusGrid}>
        <InfoCard label="Payments" value="Approve" />
        <InfoCard label="Riders" value="Review" />
        <InfoCard label="Matching" value="Assign" />
        <InfoCard label="Chats" value="Monitor" />
      </View>

      <View style={styles.grid}>
        {DASHBOARD_ACTIONS.map((item) => (
          <Pressable key={item} onPress={() => onNavigate(item)} style={styles.menuCard}>
            <Text style={styles.menuTitle}>{item}</Text>
            <Text style={styles.statusBadge}>Real API</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

function BookingsScreen({ onBack, onOpen }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const data = await listAdminBookings();
      setBookings(data.bookings || []);
    } catch (error) {
      Alert.alert("Bookings unavailable", error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <ScreenFrame title="Bookings" eyebrow="Admin Mobile" onBack={onBack}>
      <SecondaryButton label="Refresh" onPress={load} />
      {loading ? <LoadingBlock /> : null}
      {!loading && bookings.length === 0 ? <EmptyState text="No bookings returned by the backend." /> : null}
      {bookings.map((booking) => (
        <Pressable key={booking.id} onPress={() => onOpen(booking.id)} style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>{booking.id}</Text>
            <Text style={styles.statusBadge}>{formatStatus(booking.status)}</Text>
          </View>
          <DetailRow label="Passenger" value={booking.passengerName || "-"} />
          <DetailRow label="Pickup" value={booking.pickupAddress} />
          <DetailRow label="Destination" value={booking.destinationAddress} />
          <DetailRow label="Time" value={formatDate(booking.pickupDatetime)} />
          <DetailRow label="Fare" value={formatMoney(booking.estimatedFare)} />
        </Pressable>
      ))}
    </ScreenFrame>
  );
}

function BookingDetailScreen({ bookingId, onBack, onOpenBookings, onOpenChat }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(Boolean(bookingId));
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!bookingId) return;
    setLoading(true);
    try {
      setDetail(await getAdminBookingDetail(bookingId));
    } catch (error) {
      Alert.alert("Booking unavailable", error.message);
    } finally {
      setLoading(false);
    }
  }

  async function startMatching() {
    setSaving(true);
    try {
      await startBookingMatching(bookingId);
      await load();
      Alert.alert("Matching started", "Booking moved to MATCHING.");
    } catch (error) {
      Alert.alert("Could not start matching", error.message);
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    load();
  }, [bookingId]);

  if (!bookingId) {
    return (
      <ScreenFrame title="Booking Detail" eyebrow="Admin Mobile" onBack={onBack}>
        <EmptyState text="Open a booking from the booking list first." />
        <PrimaryButton label="Open Bookings" onPress={onOpenBookings} />
      </ScreenFrame>
    );
  }

  const booking = detail?.booking;

  return (
    <ScreenFrame title="Booking Detail" eyebrow={bookingId} onBack={onBack}>
      {loading ? <LoadingBlock /> : null}
      {booking ? (
        <>
          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.cardTitle}>{booking.id}</Text>
              <Text style={styles.statusBadge}>{formatStatus(booking.status)}</Text>
            </View>
            <DetailRow label="Passenger" value={booking.passengerName} />
            <DetailRow label="Phone" value={booking.passengerPhone} />
            <DetailRow label="Dependent" value={booking.dependentName} />
            <DetailRow label="Pickup" value={booking.pickupAddress} />
            <DetailRow label="Destination" value={booking.destinationAddress} />
            <DetailRow label="Service" value={booking.serviceType} />
            <DetailRow label="Fare" value={formatMoney(booking.estimatedFare)} />
            <DetailRow label="Payment" value={formatStatus(booking.paymentStatus)} />
            <DetailRow label="Rider" value={booking.assignedRiderName || "-"} />
          </View>
          <View style={styles.buttonRow}>
            <PrimaryButton disabled={saving || booking.status !== "PAID"} label="Start Matching" onPress={startMatching} />
            <SecondaryButton label="Open Chat" onPress={() => onOpenChat(booking.id)} />
          </View>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Status History</Text>
            {detail.statusHistory?.length ? (
              detail.statusHistory.map((item) => (
                <View key={item.id} style={styles.timelineItem}>
                  <Text style={styles.cardTitle}>{formatStatus(item.oldStatus)} to {formatStatus(item.newStatus)}</Text>
                  <Text style={styles.mutedText}>{item.reason || "No reason recorded"}</Text>
                  <Text style={styles.tinyText}>{formatDate(item.createdAt)} / {item.changedByName || "System"}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.mutedText}>No status history recorded yet.</Text>
            )}
          </View>
        </>
      ) : null}
    </ScreenFrame>
  );
}

function PaymentVerificationScreen({ onBack, onOpenBooking }) {
  const [proofs, setProofs] = useState([]);
  const [adminNote, setAdminNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const data = await listPendingPaymentProofs();
      setProofs(data.paymentProofs || []);
    } catch (error) {
      Alert.alert("Payment proofs unavailable", error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(id) {
    setSavingId(id);
    try {
      await approvePaymentProof(id, adminNote);
      setAdminNote("");
      await load();
      Alert.alert("Payment approved", "Booking moved to PAID.");
    } catch (error) {
      Alert.alert("Approval failed", error.message);
    } finally {
      setSavingId(null);
    }
  }

  async function handleReject(id) {
    if (!adminNote.trim()) {
      Alert.alert("Admin note required", "Add a note before rejecting payment proof.");
      return;
    }

    setSavingId(id);
    try {
      await rejectPaymentProof(id, adminNote);
      setAdminNote("");
      await load();
      Alert.alert("Payment rejected", "Booking remains PAYMENT_PENDING.");
    } catch (error) {
      Alert.alert("Rejection failed", error.message);
    } finally {
      setSavingId(null);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <ScreenFrame title="Payment Verification" eyebrow="Pending Proofs" onBack={onBack}>
      <TextInput onChangeText={setAdminNote} placeholder="Admin note for approval or rejection" style={styles.input} value={adminNote} />
      <SecondaryButton label="Refresh" onPress={load} />
      {loading ? <LoadingBlock /> : null}
      {!loading && proofs.length === 0 ? <EmptyState text="No pending payment proofs." /> : null}
      {proofs.map((proof) => (
        <View key={proof.id} style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>Proof #{proof.id}</Text>
            <Text style={styles.statusBadge}>{formatStatus(proof.status)}</Text>
          </View>
          <DetailRow label="Booking" value={proof.bookingId} />
          <DetailRow label="Passenger" value={proof.passengerName} />
          <DetailRow label="Amount" value={formatMoney(proof.amount)} />
          <DetailRow label="Reference" value={proof.proofReference} />
          <DetailRow label="Submitted" value={formatDate(proof.createdAt)} />
          <View style={styles.buttonRow}>
            <PrimaryButton disabled={savingId === proof.id} label="Approve" onPress={() => handleApprove(proof.id)} />
            <DangerButton disabled={savingId === proof.id} label="Reject" onPress={() => handleReject(proof.id)} />
            <SecondaryButton label="Booking" onPress={() => onOpenBooking(proof.bookingId)} />
          </View>
        </View>
      ))}
    </ScreenFrame>
  );
}

function RiderApprovalScreen({ onBack }) {
  const [riders, setRiders] = useState([]);
  const [adminNote, setAdminNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const data = await listPendingRiders();
      setRiders(data.riders || []);
    } catch (error) {
      Alert.alert("Riders unavailable", error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(id) {
    setSavingId(id);
    try {
      await approveRider(id, adminNote);
      setAdminNote("");
      await load();
      Alert.alert("Rider approved", "Rider can receive jobs when available and deposit is sufficient.");
    } catch (error) {
      Alert.alert("Approval failed", error.message);
    } finally {
      setSavingId(null);
    }
  }

  async function handleReject(id) {
    setSavingId(id);
    try {
      await rejectRider(id, adminNote || "Rejected from admin mobile app");
      setAdminNote("");
      await load();
      Alert.alert("Rider rejected", "The rider cannot receive jobs.");
    } catch (error) {
      Alert.alert("Rejection failed", error.message);
    } finally {
      setSavingId(null);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <ScreenFrame title="Rider Approval" eyebrow="Pending Riders" onBack={onBack}>
      <TextInput onChangeText={setAdminNote} placeholder="Admin note" style={styles.input} value={adminNote} />
      <SecondaryButton label="Refresh" onPress={load} />
      {loading ? <LoadingBlock /> : null}
      {!loading && riders.length === 0 ? <EmptyState text="No pending riders." /> : null}
      {riders.map((rider) => (
        <View key={rider.id} style={styles.card}>
          <Text style={styles.cardTitle}>{rider.name}</Text>
          <DetailRow label="Phone" value={rider.phone} />
          <DetailRow label="Vehicle" value={rider.vehicleModel} />
          <DetailRow label="Plate" value={rider.vehiclePlate} />
          <DetailRow label="License" value={rider.licenseNumber} />
          <DetailRow label="Approval" value={formatStatus(rider.approvalStatus)} />
          <DetailRow label="Availability" value={formatStatus(rider.availabilityStatus)} />
          <View style={styles.buttonRow}>
            <PrimaryButton disabled={savingId === rider.id} label="Approve" onPress={() => handleApprove(rider.id)} />
            <DangerButton disabled={savingId === rider.id} label="Reject" onPress={() => handleReject(rider.id)} />
          </View>
        </View>
      ))}
    </ScreenFrame>
  );
}

function MatchingScreen({ onBack, onOpenBooking }) {
  const [queue, setQueue] = useState({ matchingBookings: [], paidBookings: [] });
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  const [riders, setRiders] = useState([]);
  const [reason, setReason] = useState("Admin mobile urgent assignment");
  const [overrideReason, setOverrideReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await listMatchingQueue();
      setQueue({
        matchingBookings: data.matchingBookings || [],
        paidBookings: data.paidBookings || [],
      });
    } catch (error) {
      Alert.alert("Matching queue unavailable", error.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadRiders(bookingId) {
    setSelectedBookingId(bookingId);
    try {
      const data = await listMatchingRiders(bookingId);
      setRiders(data.riders || []);
    } catch (error) {
      Alert.alert("Riders unavailable", error.message);
    }
  }

  async function handleStartMatching(bookingId) {
    setSaving(true);
    try {
      await startBookingMatching(bookingId);
      await load();
      await loadRiders(bookingId);
      Alert.alert("Matching started", "Eligible riders can now receive offers.");
    } catch (error) {
      Alert.alert("Start matching failed", error.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleAssign(rider) {
    if (rider.assignmentMode === "override_required" && !overrideReason.trim()) {
      Alert.alert("Override reason required", "Unavailable rider assignment needs a recorded override reason.");
      return;
    }

    setSaving(true);
    try {
      await assignRiderToBooking(selectedBookingId, {
        riderId: rider.id,
        reason,
        overrideReason,
      });
      setOverrideReason("");
      await load();
      setRiders([]);
      Alert.alert("Rider assigned", "Booking moved to ASSIGNED.");
    } catch (error) {
      Alert.alert("Assignment failed", error.message);
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <ScreenFrame title="Matching" eyebrow="Controlled Assignment" onBack={onBack}>
      <SecondaryButton label="Refresh" onPress={load} />
      {loading ? <LoadingBlock /> : null}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Start Matching</Text>
        {queue.paidBookings.length === 0 ? <Text style={styles.mutedText}>No PAID bookings waiting to start matching.</Text> : null}
        {queue.paidBookings.map((booking) => (
          <View key={booking.id} style={styles.dividerBlock}>
            <Text style={styles.cardTitle}>{booking.id}</Text>
            <Text style={styles.mutedText}>{booking.passengerName} / {formatDate(booking.pickupDatetime)}</Text>
            <View style={styles.buttonRow}>
              <PrimaryButton disabled={saving} label="Start" onPress={() => handleStartMatching(booking.id)} />
              <SecondaryButton label="Detail" onPress={() => onOpenBooking(booking.id)} />
            </View>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Matching Queue</Text>
        {queue.matchingBookings.length === 0 ? <Text style={styles.mutedText}>No bookings currently in MATCHING.</Text> : null}
        {queue.matchingBookings.map((booking) => (
          <Pressable key={booking.id} onPress={() => loadRiders(booking.id)} style={styles.dividerBlock}>
            <Text style={styles.cardTitle}>{booking.id}</Text>
            <Text style={styles.mutedText}>{booking.pickupAddress} to {booking.destinationAddress}</Text>
            <Text style={styles.tinyText}>Tap to view eligible riders</Text>
          </Pressable>
        ))}
      </View>

      {selectedBookingId ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Manual Assign / {selectedBookingId}</Text>
          <TextInput onChangeText={setReason} placeholder="Assignment reason" style={styles.input} value={reason} />
          <TextInput onChangeText={setOverrideReason} placeholder="Override reason for unavailable rider" style={styles.input} value={overrideReason} />
          {riders.length === 0 ? <Text style={styles.mutedText}>No eligible riders returned by backend.</Text> : null}
          {riders.map((rider) => (
            <View key={rider.id} style={styles.dividerBlock}>
              <Text style={styles.cardTitle}>{rider.name}</Text>
              <DetailRow label="Vehicle" value={`${rider.vehicleModel || "-"} / ${rider.vehiclePlate || "-"}`} />
              <DetailRow label="Availability" value={formatStatus(rider.availabilityStatus)} />
              <DetailRow label="Deposit" value={formatMoney(rider.depositBalance)} />
              <PrimaryButton disabled={saving} label="Assign Rider" onPress={() => handleAssign(rider)} />
            </View>
          ))}
        </View>
      ) : null}
    </ScreenFrame>
  );
}

function AlertsScreen({ onBack, onOpenBooking }) {
  const [pendingProofs, setPendingProofs] = useState([]);
  const [slaFailedBookings, setSlaFailedBookings] = useState([]);
  const [cancelledBookings, setCancelledBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [proofData, slaData, cancelledData] = await Promise.all([
        listPendingPaymentProofs(),
        listAdminBookings({ status: "SLA_FAILED" }),
        listAdminBookings({ status: "CANCELLED" }),
      ]);
      setPendingProofs(proofData.paymentProofs || []);
      setSlaFailedBookings(slaData.bookings || []);
      setCancelledBookings(cancelledData.bookings || []);
    } catch (error) {
      Alert.alert("Alerts unavailable", error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <ScreenFrame title="Alerts" eyebrow="Real Backend Data" onBack={onBack}>
      <SecondaryButton label="Refresh" onPress={load} />
      {loading ? <LoadingBlock /> : null}
      <AlertSection
        title="Payment Pending"
        items={pendingProofs}
        emptyText="No pending payment proof alerts."
        renderItem={(proof) => (
          <Pressable key={`payment-${proof.id}`} onPress={() => onOpenBooking(proof.bookingId)} style={styles.dividerBlock}>
            <Text style={styles.cardTitle}>{proof.bookingId}</Text>
            <Text style={styles.mutedText}>{proof.passengerName} / {formatMoney(proof.amount)}</Text>
            <Text style={styles.tinyText}>Submitted {formatDate(proof.createdAt)}</Text>
          </Pressable>
        )}
      />
      <AlertSection
        title="Matching Failed / SLA Failed"
        items={slaFailedBookings}
        emptyText="No SLA failed booking alerts."
        renderItem={(booking) => (
          <Pressable key={`sla-${booking.id}`} onPress={() => onOpenBooking(booking.id)} style={styles.dividerBlock}>
            <Text style={styles.cardTitle}>{booking.id}</Text>
            <Text style={styles.mutedText}>{booking.passengerName} / {formatDate(booking.pickupDatetime)}</Text>
          </Pressable>
        )}
      />
      <AlertSection
        title="Rider Cancellation"
        items={cancelledBookings}
        emptyText="No cancellation records returned by backend."
        renderItem={(booking) => (
          <Pressable key={`cancelled-${booking.id}`} onPress={() => onOpenBooking(booking.id)} style={styles.dividerBlock}>
            <Text style={styles.cardTitle}>{booking.id}</Text>
            <Text style={styles.mutedText}>Cancelled booking / rider-specific source not yet separated in backend.</Text>
          </Pressable>
        )}
      />
    </ScreenFrame>
  );
}

function ChatMonitorScreen({ initialBookingId, onBack, onOpenBooking }) {
  const [conversations, setConversations] = useState([]);
  const [bookingId, setBookingId] = useState(initialBookingId || null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  async function loadConversations() {
    setLoading(true);
    try {
      const data = await listAdminChatConversations();
      setConversations(data.chats || []);
    } catch (error) {
      Alert.alert("Chats unavailable", error.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadMessages(id = bookingId) {
    if (!id) return;
    try {
      const data = await listBookingChatMessages(id);
      setMessages(data.chatMessages || []);
    } catch (error) {
      Alert.alert("Messages unavailable", error.message);
    }
  }

  async function sendMessage() {
    if (!bookingId || !message.trim()) return;

    setSending(true);
    try {
      await sendBookingChatMessage(bookingId, message);
      setMessage("");
      await loadMessages(bookingId);
    } catch (error) {
      Alert.alert("Message failed", error.message);
    } finally {
      setSending(false);
    }
  }

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (bookingId) {
      loadMessages(bookingId);
    }
  }, [bookingId]);

  return (
    <ScreenFrame title="Chat Monitor" eyebrow="Stored Messages" onBack={onBack}>
      <SecondaryButton label="Refresh" onPress={() => {
        loadConversations();
        loadMessages();
      }} />
      {loading ? <LoadingBlock /> : null}
      {conversations.length === 0 ? <EmptyState text="No active booking chats returned by backend." /> : null}
      {conversations.map((chat) => (
        <Pressable key={chat.bookingId} onPress={() => setBookingId(chat.bookingId)} style={styles.chatListItem}>
          <Text style={styles.cardTitle}>{chat.bookingId}</Text>
          <Text style={styles.mutedText}>{chat.passengerName || "Passenger"} / {formatStatus(chat.bookingStatus)}</Text>
          <Text style={styles.tinyText}>Last message {formatDate(chat.lastMessageAt)}</Text>
        </Pressable>
      ))}

      {bookingId ? (
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>Chat / {bookingId}</Text>
            <SecondaryButton label="Booking" onPress={() => onOpenBooking(bookingId)} />
          </View>
          {messages.length === 0 ? <Text style={styles.mutedText}>No messages for this booking yet.</Text> : null}
          {messages.map((item) => (
            <View key={item.id} style={[styles.messageBubble, item.senderRole === "admin" && styles.adminMessageBubble]}>
              <Text style={styles.messageRole}>{formatStatus(item.senderRole)}</Text>
              <Text style={styles.messageText}>{item.message}</Text>
              <Text style={styles.tinyText}>{formatDate(item.createdAt)}</Text>
            </View>
          ))}
          <TextInput
            multiline
            onChangeText={setMessage}
            placeholder="Send admin message"
            style={styles.textArea}
            value={message}
          />
          <PrimaryButton disabled={sending || !message.trim()} label={sending ? "Sending..." : "Send Message"} onPress={sendMessage} />
        </View>
      ) : null}
    </ScreenFrame>
  );
}

function AlertSection({ title, items, emptyText, renderItem }) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {items.length === 0 ? <Text style={styles.mutedText}>{emptyText}</Text> : null}
      {items.map(renderItem)}
    </View>
  );
}

function ScreenFrame({ children, eyebrow, onBack, title }) {
  return (
    <ScrollView contentContainerStyle={styles.pageContainer} keyboardShouldPersistTaps="handled">
      <SecondaryButton label="Back Dashboard" onPress={onBack} />
      <View>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.title}>{title}</Text>
      </View>
      {children}
    </ScrollView>
  );
}

function DetailRow({ label, value }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value || "-"}</Text>
    </View>
  );
}

function EmptyState({ text }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.mutedText}>{text}</Text>
    </View>
  );
}

function LoadingBlock() {
  return (
    <View style={styles.inlineLoading}>
      <ActivityIndicator color="#4f20a8" />
      <Text style={styles.mutedText}>Loading...</Text>
    </View>
  );
}

function InfoCard({ label, value }) {
  return (
    <View style={styles.infoCard}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
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

function DangerButton({ disabled, label, onPress }) {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={[styles.dangerButton, disabled && styles.disabledButton]}>
      <Text style={styles.dangerButtonText}>{label}</Text>
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
  inlineLoading: {
    alignItems: "center",
    gap: 10,
    padding: 16,
  },
  logoBox: {
    width: 68,
    height: 68,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4f20a8",
    shadowColor: "#4f20a8",
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
    color: "#4f20a8",
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
  cardTitle: {
    color: "#1f1633",
    fontSize: 16,
    fontWeight: "900",
  },
  sectionTitle: {
    color: "#1f1633",
    fontSize: 18,
    fontWeight: "900",
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
    minHeight: 92,
    borderWidth: 1,
    borderColor: "#eadcf6",
    borderRadius: 8,
    backgroundColor: "#fff",
    color: "#1f1633",
    padding: 12,
    textAlignVertical: "top",
  },
  primaryButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#4f20a8",
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
    color: "#4f20a8",
    fontWeight: "900",
  },
  dangerButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#be123c",
    paddingHorizontal: 16,
  },
  dangerButtonText: {
    color: "#fff",
    fontWeight: "900",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  headerText: {
    flex: 1,
  },
  logoutButton: {
    borderRadius: 8,
    backgroundColor: "#f4e7ff",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  logoutText: {
    color: "#4f20a8",
    fontWeight: "900",
  },
  heroCard: {
    gap: 12,
    borderRadius: 8,
    backgroundColor: "#4f20a8",
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
  statusGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  infoCard: {
    width: "47%",
    gap: 4,
    borderWidth: 1,
    borderColor: "#eadcf6",
    borderRadius: 8,
    backgroundColor: "#fff",
    padding: 14,
  },
  infoLabel: {
    color: "#746987",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  infoValue: {
    color: "#1f1633",
    fontWeight: "900",
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
    textTransform: "uppercase",
  },
  mutedText: {
    color: "#746987",
    lineHeight: 21,
  },
  tinyText: {
    color: "#8d829d",
    fontSize: 12,
    lineHeight: 18,
  },
  detailRow: {
    gap: 4,
  },
  detailLabel: {
    color: "#746987",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  detailValue: {
    color: "#1f1633",
    lineHeight: 20,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  buttonRow: {
    gap: 10,
  },
  dividerBlock: {
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: "#f1e8fb",
    paddingTop: 12,
  },
  emptyState: {
    borderWidth: 1,
    borderColor: "#eadcf6",
    borderRadius: 8,
    backgroundColor: "#fff",
    padding: 16,
  },
  timelineItem: {
    gap: 4,
    borderTopWidth: 1,
    borderTopColor: "#f1e8fb",
    paddingTop: 10,
  },
  chatListItem: {
    gap: 6,
    borderWidth: 1,
    borderColor: "#eadcf6",
    borderRadius: 8,
    backgroundColor: "#fff",
    padding: 14,
  },
  messageBubble: {
    gap: 4,
    borderRadius: 8,
    backgroundColor: "#f7f2fc",
    padding: 12,
  },
  adminMessageBubble: {
    backgroundColor: "#ecfdf5",
  },
  messageRole: {
    color: "#4f20a8",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  messageText: {
    color: "#1f1633",
    lineHeight: 21,
  },
});

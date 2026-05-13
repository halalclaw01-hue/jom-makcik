import {
  Activity,
  Ambulance,
  BarChart3,
  Bell,
  ClipboardCheck,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareText,
  Search,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  Navigate,
  NavLink,
  Route,
  BrowserRouter as Router,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom'
import './App.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'

const AuthContext = createContext(null)

const navItems = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Bookings', path: '/bookings', icon: ClipboardCheck },
  { label: 'Riders', path: '/riders', icon: Ambulance },
  { label: 'Passengers', path: '/passengers', icon: Users },
  { label: 'Payments', path: '/payments', icon: CreditCard },
  { label: 'Matching', path: '/matching', icon: Activity },
  { label: 'Chat Monitor', path: '/chat-monitor', icon: MessageSquareText },
  { label: 'Care Reports', path: '/care-reports', icon: ShieldCheck },
  { label: 'Reports', path: '/reports', icon: BarChart3 },
  { label: 'Audit Logs', path: '/audit-logs', icon: ShieldCheck },
]

function useAuth() {
  return useContext(AuthContext)
}

async function apiRequest(path, { token, method = 'GET', body } = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data?.error?.message || 'Request failed')
  }

  return data
}

function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('adminToken') || '')
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(Boolean(token))

  useEffect(() => {
    let cancelled = false

    async function loadCurrentUser() {
      if (!token) {
        setUser(null)
        setLoading(false)
        return
      }

      try {
        const data = await apiRequest('/auth/me', { token })
        if (!['admin', 'super_admin'].includes(data.user.role)) {
          throw new Error('Admin access required')
        }
        if (!cancelled) setUser(data.user)
      } catch {
        localStorage.removeItem('adminToken')
        if (!cancelled) {
          setToken('')
          setUser(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadCurrentUser()

    return () => {
      cancelled = true
    }
  }, [token])

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      login: async ({ identifier, password }) => {
        const data = await apiRequest('/auth/login', {
          method: 'POST',
          body: { identifier, password },
        })
        if (!['admin', 'super_admin'].includes(data.user.role)) {
          throw new Error('This dashboard is for admin users only.')
        }
        localStorage.setItem('adminToken', data.token)
        setToken(data.token)
        setUser(data.user)
      },
      logout: () => {
        localStorage.removeItem('adminToken')
        setToken('')
        setUser(null)
      },
    }),
    [loading, token, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

function ProtectedRoute({ children }) {
  const { loading, user } = useAuth()

  if (loading) return <FullPageState title="Checking admin session" />
  if (!user) return <Navigate to="/login" replace />

  return children
}

function LoginPage() {
  const { login, user } = useAuth()
  const navigate = useNavigate()
  const [identifier, setIdentifier] = useState('superadmin@jommakcik.local')
  const [password, setPassword] = useState('Password123!')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true })
  }, [navigate, user])

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login({ identifier, password })
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-panel">
        <div className="brand-mark">JM</div>
        <p className="eyebrow">Admin Web Dashboard</p>
        <h1>Jom Makcik Control Centre</h1>
        <form onSubmit={handleSubmit} className="login-form">
          <label>
            Email or phone
            <input value={identifier} onChange={(event) => setIdentifier(event.target.value)} />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {error ? <div className="error-banner">{error}</div> : null}
          <button type="submit" disabled={submitting}>
            {submitting ? 'Signing in...' : 'Login'}
          </button>
        </form>
      </section>
    </main>
  )
}

function AppShell() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const activeItem = navItems.find((item) => item.path === location.pathname) || navItems[0]

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark small">JM</div>
          <div>
            <strong>Control Centre</strong>
            <span>Jom Makcik</span>
          </div>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink key={item.path} to={item.path}>
              <item.icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <button className="logout-button" type="button" onClick={logout}>
          <LogOut size={18} />
          Logout
        </button>
      </aside>
      <div className="main-area">
        <header className="topbar">
          <div className="topbar-title">
            <Menu size={20} />
            <div>
              <p>{activeItem.label}</p>
              <span>Admin oversight workspace</span>
            </div>
          </div>
          <div className="topbar-actions">
            <label className="search-box">
              <Search size={17} />
              <input placeholder="Search bookings, riders, passengers..." disabled />
            </label>
            <button className="icon-button" type="button" aria-label="Notifications">
              <Bell size={18} />
            </button>
            <div className="admin-chip">
              <strong>{user?.name || 'Admin'}</strong>
              <span>{user?.role}</span>
            </div>
          </div>
        </header>
        <main className="content-area">
          <Routes>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/bookings" element={<BookingsPage />} />
            <Route path="/bookings/:id" element={<BookingDetailPage />} />
            <Route path="/riders" element={<RidersPage />} />
            <Route path="/riders/pending" element={<PendingRidersPage />} />
            <Route path="/riders/:id" element={<RiderDetailPage />} />
            <Route path="/passengers" element={<UnavailablePage title="Passengers" />} />
            <Route path="/payments" element={<PaymentsPage />} />
            <Route path="/matching" element={<MatchingPage />} />
            <Route path="/chat-monitor" element={<ChatMonitorPage />} />
            <Route path="/care-reports" element={<CareReportsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/audit-logs" element={<AuditLogsPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

function useApiData(path) {
  const { token } = useAuth()
  const [state, setState] = useState({ loading: true, data: null, error: '' })

  useEffect(() => {
    let cancelled = false
    setState({ loading: true, data: null, error: '' })

    apiRequest(path, { token })
      .then((data) => {
        if (!cancelled) setState({ loading: false, data, error: '' })
      })
      .catch((error) => {
        if (!cancelled) setState({ loading: false, data: null, error: error.message })
      })

    return () => {
      cancelled = true
    }
  }, [path, token])

  return state
}

function DashboardPage() {
  const payments = useApiData('/admin/payment-proofs/pending')
  const riders = useApiData('/admin/riders/pending')
  const careReports = useApiData('/admin/care-reports')

  const cards = [
    {
      label: 'Pending Payments',
      value: payments.data?.paymentProofs?.length ?? 0,
      loading: payments.loading,
      tone: 'pink',
    },
    {
      label: 'Pending Riders',
      value: riders.data?.riders?.length ?? 0,
      loading: riders.loading,
      tone: 'purple',
    },
    {
      label: 'Care Reports',
      value: careReports.data?.careReports?.length ?? 0,
      loading: careReports.loading,
      tone: 'green',
    },
  ]

  return (
    <PageFrame title="Dashboard" subtitle="Real backend summaries available in the MVP API.">
      <section className="metric-grid">
        {cards.map((card) => (
          <div className={`metric-card ${card.tone}`} key={card.label}>
            <span>{card.label}</span>
            <strong>{card.loading ? '...' : card.value}</strong>
          </div>
        ))}
      </section>
      <div className="section-grid">
        <DataPanel title="Pending Payment Proofs" state={payments}>
          <PaymentTable items={payments.data?.paymentProofs || []} />
        </DataPanel>
        <DataPanel title="Pending Rider Approvals" state={riders}>
          <RiderTable items={riders.data?.riders || []} />
        </DataPanel>
      </div>
    </PageFrame>
  )
}

function RidersPage() {
  const state = useApiData('/admin/riders')
  return (
    <PageFrame title="Riders" subtitle="Admin-controlled rider status and approval list.">
      <NavLink className="secondary-button link-button" to="/riders/pending">
        Pending Approvals
      </NavLink>
      <DataPanel title="Rider Accounts" state={state}>
        <RiderTable items={state.data?.riders || []} />
      </DataPanel>
    </PageFrame>
  )
}

function PendingRidersPage() {
  const state = useApiData('/admin/riders/pending')
  return (
    <PageFrame title="Pending Riders" subtitle="Rider accounts waiting for admin approval.">
      <NavLink className="secondary-button link-button" to="/riders">
        All Riders
      </NavLink>
      <DataPanel title="Pending Approvals" state={state}>
        <RiderTable items={state.data?.riders || []} />
      </DataPanel>
    </PageFrame>
  )
}

function RiderDetailPage() {
  const { token } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const riderId = location.pathname.split('/').pop()
  const [detail, setDetail] = useState({ loading: true, data: null, error: '' })
  const [adminNote, setAdminNote] = useState('')
  const [actionState, setActionState] = useState({ error: '', message: '' })

  async function loadRider() {
    setDetail({ loading: true, data: null, error: '' })
    try {
      const data = await apiRequest(`/admin/riders/${riderId}`, { token })
      setDetail({ loading: false, data, error: '' })
    } catch (error) {
      setDetail({ loading: false, data: null, error: error.message })
    }
  }

  useEffect(() => {
    loadRider()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [riderId, token])

  async function runRiderAction(action) {
    setActionState({ error: '', message: '' })
    try {
      await apiRequest(`/admin/riders/${riderId}/${action}`, {
        token,
        method: 'POST',
        body: adminNote ? { adminNote } : {},
      })
      setActionState({ error: '', message: `Rider ${action} completed from backend.` })
      await loadRider()
    } catch (error) {
      setActionState({ error: error.message, message: '' })
    }
  }

  const rider = detail.data?.rider

  return (
    <PageFrame title={`Rider #${riderId}`} subtitle="Admin rider review and control.">
      <button className="secondary-button" type="button" onClick={() => navigate('/riders')}>
        Back to Riders
      </button>
      {detail.loading ? <EmptyState text="Loading rider detail..." /> : null}
      {detail.error ? <EmptyState text={detail.error} /> : null}
      {rider ? (
        <>
          <section className="detail-grid">
            <InfoCard title="Rider">
              <p>{rider.name}</p>
              <span>{rider.phone}</span>
            </InfoCard>
            <InfoCard title="Vehicle">
              <p>{rider.vehicleModel}</p>
              <span>{rider.vehiclePlate}</span>
            </InfoCard>
            <InfoCard title="License">
              <p>{rider.licenseNumber}</p>
              <span>{rider.icNumber}</span>
            </InfoCard>
            <InfoCard title="Approval">
              <StatusBadge>{rider.approvalStatus}</StatusBadge>
              <span>{rider.userStatus}</span>
            </InfoCard>
            <InfoCard title="Availability">
              <p>{rider.availabilityStatus}</p>
            </InfoCard>
            <InfoCard title="Balances">
              <p>Wallet RM {(rider.walletBalance / 100).toFixed(2)}</p>
              <span>Deposit RM {(rider.depositBalance / 100).toFixed(2)}</span>
            </InfoCard>
          </section>

          <section className="data-panel">
            <h2>Admin Actions</h2>
            {actionState.error ? <div className="error-banner">{actionState.error}</div> : null}
            {actionState.message ? <div className="success-banner">{actionState.message}</div> : null}
            <div className="action-grid">
              <input
                value={adminNote}
                onChange={(event) => setAdminNote(event.target.value)}
                placeholder="Admin note"
              />
              <button type="button" onClick={() => runRiderAction('approve')}>
                Approve
              </button>
              <button type="button" className="danger-button" onClick={() => runRiderAction('reject')}>
                Reject
              </button>
              <button type="button" className="danger-button" onClick={() => runRiderAction('suspend')}>
                Suspend
              </button>
              <button type="button" onClick={() => runRiderAction('reactivate')}>
                Reactivate
              </button>
            </div>
          </section>

          <section className="metric-grid">
            <FutureMetric label="Acceptance Rate" />
            <FutureMetric label="Cancellation Rate" />
            <FutureMetric label="Completed Trips" />
          </section>
        </>
      ) : null}
    </PageFrame>
  )
}

function PaymentsPage() {
  const { token } = useAuth()
  const [refreshKey, setRefreshKey] = useState(0)
  const [actionState, setActionState] = useState({ error: '', message: '' })
  const state = useApiData(`/admin/payment-proofs/pending?refresh=${refreshKey}`)
  const history = useApiData(`/admin/payment-proofs/history?refresh=${refreshKey}`)

  async function runPaymentAction(proofId, action, adminNote) {
    setActionState({ error: '', message: '' })
    try {
      await apiRequest(`/admin/payment-proofs/${proofId}/${action}`, {
        token,
        method: 'POST',
        body: adminNote ? { adminNote } : {},
      })
      setActionState({
        error: '',
        message:
          action === 'approve'
            ? 'Payment proof approved from backend. Booking moved to PAID.'
            : 'Payment proof rejected from backend. Booking remains PAYMENT_PENDING.',
      })
      setRefreshKey((value) => value + 1)
    } catch (error) {
      setActionState({ error: error.message, message: '' })
    }
  }

  return (
    <PageFrame title="Payments" subtitle="Manual proof verification queue.">
      {actionState.error ? <div className="error-banner">{actionState.error}</div> : null}
      {actionState.message ? <div className="success-banner">{actionState.message}</div> : null}
      <DataPanel title="Pending Payment Proofs" state={state}>
        <PaymentVerificationTable
          items={state.data?.paymentProofs || []}
          onAction={runPaymentAction}
        />
      </DataPanel>
      <DataPanel title="Payment History" state={history}>
        <PaymentHistoryTable items={history.data?.paymentProofs || []} />
      </DataPanel>
    </PageFrame>
  )
}

function CareReportsPage() {
  const state = useApiData('/admin/care-reports')
  return (
    <PageFrame title="Care Reports" subtitle="Manual rider reports awaiting admin review.">
      <DataPanel title="Care Reports" state={state}>
        <CareReportTable items={state.data?.careReports || []} />
      </DataPanel>
    </PageFrame>
  )
}

function ReportsPage() {
  const dailyBookings = useApiData('/admin/reports/daily-bookings')
  const completedTrips = useApiData('/admin/reports/completed-trips')
  const cancelledBookings = useApiData('/admin/reports/cancelled-bookings')
  const paymentSummary = useApiData('/admin/reports/payment-summary')
  const riderCompletedTrips = useApiData('/admin/reports/rider-completed-trips')

  return (
    <PageFrame title="Reports" subtitle="Basic operational reports from real backend data.">
      <DataPanel title="Daily Bookings" state={dailyBookings}>
        <ReportToolbar
          filename="daily-bookings.csv"
          rows={dailyBookings.data?.dailyBookings || []}
          columns={[
            ['date', 'Date'],
            ['totalBookings', 'Total Bookings'],
            ['completedCount', 'Completed'],
            ['cancelledCount', 'Cancelled'],
            ['slaFailedCount', 'SLA Failed'],
          ]}
        />
        <DailyBookingsReportTable items={dailyBookings.data?.dailyBookings || []} />
      </DataPanel>

      <DataPanel title="Completed Trips" state={completedTrips}>
        <ReportToolbar
          filename="completed-trips.csv"
          rows={completedTrips.data?.completedTrips || []}
          columns={[
            ['bookingId', 'Booking ID'],
            ['passengerName', 'Passenger'],
            ['riderName', 'Rider'],
            ['serviceType', 'Service'],
            ['pickupDatetime', 'Pickup Date Time'],
            ['completedAt', 'Completed At'],
            ['estimatedFare', 'Estimated Fare Sen'],
          ]}
        />
        <CompletedTripsReportTable items={completedTrips.data?.completedTrips || []} />
      </DataPanel>

      <DataPanel title="Cancelled Bookings" state={cancelledBookings}>
        <ReportToolbar
          filename="cancelled-bookings.csv"
          rows={cancelledBookings.data?.cancelledBookings || []}
          columns={[
            ['bookingId', 'Booking ID'],
            ['passengerName', 'Passenger'],
            ['riderName', 'Rider'],
            ['serviceType', 'Service'],
            ['pickupDatetime', 'Pickup Date Time'],
            ['paymentStatus', 'Payment Status'],
            ['cancelledAt', 'Cancelled At'],
          ]}
        />
        <CancelledBookingsReportTable items={cancelledBookings.data?.cancelledBookings || []} />
      </DataPanel>

      <DataPanel title="Payment Summary" state={paymentSummary}>
        <ReportToolbar
          filename="payment-summary.csv"
          rows={paymentSummary.data?.paymentSummary || []}
          columns={[
            ['status', 'Status'],
            ['proofCount', 'Proof Count'],
            ['totalAmount', 'Total Amount Sen'],
          ]}
        />
        <PaymentSummaryReportTable items={paymentSummary.data?.paymentSummary || []} />
      </DataPanel>

      <DataPanel title="Rider Completed Trips" state={riderCompletedTrips}>
        <ReportToolbar
          filename="rider-completed-trips.csv"
          rows={riderCompletedTrips.data?.riderCompletedTrips || []}
          columns={[
            ['riderId', 'Rider ID'],
            ['riderName', 'Rider'],
            ['riderPhone', 'Phone'],
            ['vehiclePlate', 'Vehicle Plate'],
            ['completedTrips', 'Completed Trips'],
            ['totalFare', 'Total Fare Sen'],
          ]}
        />
        <RiderCompletedTripsReportTable items={riderCompletedTrips.data?.riderCompletedTrips || []} />
      </DataPanel>
    </PageFrame>
  )
}

function AuditLogsPage() {
  const [filters, setFilters] = useState({
    user: '',
    action: '',
    entityType: '',
    date: '',
  })
  const [query, setQuery] = useState('')
  const state = useApiData(`/admin/audit-logs${query}`)

  function applyFilters(event) {
    event.preventDefault()
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value.trim()) params.set(key, value.trim())
    })
    const nextQuery = params.toString()
    setQuery(nextQuery ? `?${nextQuery}` : '')
  }

  return (
    <PageFrame title="Audit Logs" subtitle="Important backend actions recorded for admin oversight.">
      <form className="filter-bar audit-filter-bar" onSubmit={applyFilters}>
        <label>
          User
          <input
            value={filters.user}
            onChange={(event) => setFilters({ ...filters, user: event.target.value })}
            placeholder="Name, email, phone, or ID"
          />
        </label>
        <label>
          Action
          <input
            value={filters.action}
            onChange={(event) => setFilters({ ...filters, action: event.target.value })}
            placeholder="payment_proof"
          />
        </label>
        <label>
          Entity Type
          <input
            value={filters.entityType}
            onChange={(event) => setFilters({ ...filters, entityType: event.target.value })}
            placeholder="booking"
          />
        </label>
        <label>
          Date
          <input
            type="date"
            value={filters.date}
            onChange={(event) => setFilters({ ...filters, date: event.target.value })}
          />
        </label>
        <button type="submit">Apply Filters</button>
      </form>

      <DataPanel title="Audit Events" state={state}>
        <AuditLogTable items={state.data?.auditLogs || []} />
      </DataPanel>
    </PageFrame>
  )
}

function BookingsPage() {
  const [filters, setFilters] = useState({
    status: '',
    date: '',
    passenger: '',
    rider: '',
  })
  const [query, setQuery] = useState('')
  const state = useApiData(`/admin/bookings${query}`)

  function applyFilters(event) {
    event.preventDefault()
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value.trim()) params.set(key, value.trim())
    })
    const nextQuery = params.toString()
    setQuery(nextQuery ? `?${nextQuery}` : '')
  }

  return (
    <PageFrame title="Bookings" subtitle="Real booking records from the backend.">
      <form className="filter-bar" onSubmit={applyFilters}>
        <label>
          Status
          <select
            value={filters.status}
            onChange={(event) => setFilters({ ...filters, status: event.target.value })}
          >
            <option value="">All</option>
            {[
              'DRAFT',
              'QUOTED',
              'PAYMENT_PENDING',
              'PAID',
              'MATCHING',
              'ASSIGNED',
              'IN_PROGRESS',
              'COMPLETED',
              'CANCELLED',
              'SLA_FAILED',
              'REFUND_PENDING',
              'REFUNDED',
            ].map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
        <label>
          Date
          <input
            type="date"
            value={filters.date}
            onChange={(event) => setFilters({ ...filters, date: event.target.value })}
          />
        </label>
        <label>
          Passenger
          <input
            value={filters.passenger}
            onChange={(event) => setFilters({ ...filters, passenger: event.target.value })}
            placeholder="Name or phone"
          />
        </label>
        <label>
          Rider
          <input
            value={filters.rider}
            onChange={(event) => setFilters({ ...filters, rider: event.target.value })}
            placeholder="Name or ID"
          />
        </label>
        <button type="submit">Apply Filters</button>
      </form>
      <DataPanel title="Bookings" state={state}>
        <BookingsTable items={state.data?.bookings || []} />
      </DataPanel>
    </PageFrame>
  )
}

function MatchingPage() {
  const { token } = useAuth()
  const [queue, setQueue] = useState({ loading: true, data: null, error: '' })
  const [selectedBookingId, setSelectedBookingId] = useState('')
  const [detail, setDetail] = useState({ loading: false, data: null, error: '' })
  const [candidates, setCandidates] = useState({ loading: false, data: [], error: '' })
  const [selectedRiderId, setSelectedRiderId] = useState('')
  const [reason, setReason] = useState('')
  const [overrideReason, setOverrideReason] = useState('')
  const [actionState, setActionState] = useState({ error: '', message: '' })

  async function loadQueue(nextSelectedId) {
    setQueue({ loading: true, data: null, error: '' })
    try {
      const data = await apiRequest('/admin/bookings/matching-queue', { token })
      setQueue({ loading: false, data, error: '' })
      const matchingBookings = data.matchingBookings || []
      const selectedStillExists = matchingBookings.some((booking) => String(booking.id) === String(selectedBookingId))
      const fallbackId = matchingBookings[0]?.id ? String(matchingBookings[0].id) : ''
      setSelectedBookingId(String(nextSelectedId || (selectedStillExists ? selectedBookingId : fallbackId)))
    } catch (error) {
      setQueue({ loading: false, data: null, error: error.message })
    }
  }

  async function loadMatchingDetail(bookingId) {
    if (!bookingId) {
      setDetail({ loading: false, data: null, error: '' })
      setCandidates({ loading: false, data: [], error: '' })
      return
    }

    setDetail({ loading: true, data: null, error: '' })
    setCandidates({ loading: true, data: [], error: '' })
    try {
      const [detailData, candidateData] = await Promise.all([
        apiRequest(`/admin/bookings/${bookingId}`, { token }),
        apiRequest(`/admin/bookings/${bookingId}/matching-riders`, { token }),
      ])
      setDetail({ loading: false, data: detailData, error: '' })
      setCandidates({ loading: false, data: candidateData.riders || [], error: '' })
      setSelectedRiderId('')
      setOverrideReason('')
    } catch (error) {
      setDetail({ loading: false, data: null, error: error.message })
      setCandidates({ loading: false, data: [], error: error.message })
    }
  }

  useEffect(() => {
    loadQueue()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  useEffect(() => {
    loadMatchingDetail(selectedBookingId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBookingId, token])

  async function runMatchingAction(path, body = {}, nextSelectedId) {
    setActionState({ error: '', message: '' })
    try {
      await apiRequest(path, { token, method: 'POST', body })
      setActionState({ error: '', message: 'Matching action completed from backend.' })
      await loadQueue(nextSelectedId)
      if (nextSelectedId) {
        await loadMatchingDetail(nextSelectedId)
      }
    } catch (error) {
      setActionState({ error: error.message, message: '' })
    }
  }

  const matchingBookings = queue.data?.matchingBookings || []
  const paidBookings = queue.data?.paidBookings || []
  const selectedBooking = detail.data?.booking
  const selectedRider = candidates.data.find((rider) => String(rider.id) === String(selectedRiderId))
  const requiresOverride = selectedRider?.assignmentMode === 'override_required'
  const canAssign =
    selectedBooking?.status === 'MATCHING' &&
    selectedRiderId &&
    (!requiresOverride || overrideReason.trim().length > 0)

  return (
    <PageFrame title="Matching Control" subtitle="Controlled admin matching with rider eligibility checks.">
      {actionState.error ? <div className="error-banner">{actionState.error}</div> : null}
      {actionState.message ? <div className="success-banner">{actionState.message}</div> : null}

      <section className="section-grid">
        <DataPanel title="Matching Queue" state={queue}>
          <BookingQueueTable
            items={matchingBookings}
            selectedBookingId={selectedBookingId}
            onSelect={(bookingId) => setSelectedBookingId(String(bookingId))}
            emptyText="No bookings are currently in MATCHING."
          />
        </DataPanel>
        <DataPanel title="Ready To Start Matching" state={queue}>
          <PaidBookingsTable
            items={paidBookings}
            onStart={(bookingId) =>
              runMatchingAction(`/admin/bookings/${bookingId}/start-matching`, {}, String(bookingId))
            }
          />
        </DataPanel>
      </section>

      <section className="detail-grid">
        <InfoCard title="Selected Booking">
          {selectedBooking ? (
            <>
              <p>#{selectedBooking.id} / {selectedBooking.passengerName}</p>
              <span>{selectedBooking.serviceType}</span>
            </>
          ) : (
            <span>Select a MATCHING booking.</span>
          )}
        </InfoCard>
        <InfoCard title="Pickup">
          {selectedBooking ? (
            <>
              <p>{selectedBooking.pickupAddress}</p>
              <span>{selectedBooking.pickupDatetime}</span>
            </>
          ) : (
            <span>No booking selected.</span>
          )}
        </InfoCard>
        <InfoCard title="Destination">
          {selectedBooking ? (
            <>
              <p>{selectedBooking.destinationAddress}</p>
              <span>RM {((selectedBooking.estimatedFare || 0) / 100).toFixed(2)}</span>
            </>
          ) : (
            <span>No booking selected.</span>
          )}
        </InfoCard>
      </section>

      <section className="data-panel">
        <h2>Eligible Riders</h2>
        {detail.loading || candidates.loading ? <EmptyState text="Loading selected booking and riders..." /> : null}
        {detail.error ? <EmptyState text={detail.error} /> : null}
        {!detail.loading && !candidates.loading && selectedBooking ? (
          <>
            <MatchingRiderTable
              items={candidates.data}
              selectedRiderId={selectedRiderId}
              onSelect={(riderId) => setSelectedRiderId(String(riderId))}
            />
            <div className="action-grid matching-actions">
              <input
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Assignment or SLA reason"
              />
              <input
                value={overrideReason}
                onChange={(event) => setOverrideReason(event.target.value)}
                placeholder="Override reason for unavailable rider"
                disabled={!requiresOverride}
              />
              <button
                type="button"
                disabled={!canAssign}
                onClick={() =>
                  runMatchingAction(`/admin/bookings/${selectedBooking.id}/assign-rider`, {
                    riderId: Number(selectedRiderId),
                    reason,
                    overrideReason: requiresOverride ? overrideReason : undefined,
                  })
                }
              >
                Manual Assign
              </button>
              <button
                type="button"
                className="danger-button"
                disabled={selectedBooking.status !== 'MATCHING'}
                onClick={() =>
                  runMatchingAction(`/admin/bookings/${selectedBooking.id}/sla-failed`, {
                    reason,
                  })
                }
              >
                Stop Matching / SLA Failed
              </button>
            </div>
          </>
        ) : null}
      </section>
    </PageFrame>
  )
}

function ChatMonitorPage() {
  const { token } = useAuth()
  const [chats, setChats] = useState({ loading: true, data: [], error: '' })
  const [selectedBookingId, setSelectedBookingId] = useState('')
  const [messages, setMessages] = useState({ loading: false, data: [], error: '' })
  const [adminMessage, setAdminMessage] = useState('')
  const [adminNote, setAdminNote] = useState('')
  const [actionState, setActionState] = useState({ error: '', message: '' })

  async function loadChats(nextSelectedId) {
    setChats({ loading: true, data: [], error: '' })
    try {
      const data = await apiRequest('/bookings/admin/monitor', { token })
      const nextChats = data.chats || []
      setChats({ loading: false, data: nextChats, error: '' })
      const selectedStillExists = nextChats.some((chat) => String(chat.bookingId) === String(selectedBookingId))
      const fallbackId = nextChats[0]?.bookingId ? String(nextChats[0].bookingId) : ''
      setSelectedBookingId(String(nextSelectedId || (selectedStillExists ? selectedBookingId : fallbackId)))
    } catch (error) {
      setChats({ loading: false, data: [], error: error.message })
    }
  }

  async function loadMessages(bookingId) {
    if (!bookingId) {
      setMessages({ loading: false, data: [], error: '' })
      return
    }

    setMessages({ loading: true, data: [], error: '' })
    try {
      const data = await apiRequest(`/bookings/${bookingId}/chat`, { token })
      setMessages({ loading: false, data: data.chatMessages || [], error: '' })
    } catch (error) {
      setMessages({ loading: false, data: [], error: error.message })
    }
  }

  useEffect(() => {
    loadChats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  useEffect(() => {
    loadMessages(selectedBookingId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBookingId, token])

  async function sendAdminMessage() {
    setActionState({ error: '', message: '' })
    try {
      await apiRequest(`/bookings/${selectedBookingId}/chat`, {
        token,
        method: 'POST',
        body: { message: adminMessage },
      })
      setAdminMessage('')
      setActionState({ error: '', message: 'Admin message sent and stored.' })
      await loadMessages(selectedBookingId)
      await loadChats(selectedBookingId)
    } catch (error) {
      setActionState({ error: error.message, message: '' })
    }
  }

  async function saveAdminNote() {
    setActionState({ error: '', message: '' })
    try {
      await apiRequest(`/bookings/${selectedBookingId}/admin-note`, {
        token,
        method: 'POST',
        body: { note: adminNote },
      })
      setAdminNote('')
      setActionState({ error: '', message: 'Internal admin note saved to audit log.' })
    } catch (error) {
      setActionState({ error: error.message, message: '' })
    }
  }

  const selectedChat = chats.data.find((chat) => String(chat.bookingId) === String(selectedBookingId))

  return (
    <PageFrame title="Chat Monitor" subtitle="Admin-monitored booking chat with stored messages.">
      {actionState.error ? <div className="error-banner">{actionState.error}</div> : null}
      {actionState.message ? <div className="success-banner">{actionState.message}</div> : null}

      <section className="chat-monitor-grid">
        <DataPanel title="Active Booking Chats" state={chats}>
          <ChatConversationTable
            items={chats.data}
            selectedBookingId={selectedBookingId}
            onSelect={(bookingId) => setSelectedBookingId(String(bookingId))}
          />
        </DataPanel>

        <section className="data-panel">
          <h2>{selectedChat ? `Booking #${selectedChat.bookingId}` : 'Conversation'}</h2>
          {selectedChat ? (
            <div className="chat-context">
              <StatusBadge>{selectedChat.status}</StatusBadge>
              <span>{selectedChat.passengerName}</span>
              <span>{selectedChat.riderName || 'No rider assigned'}</span>
            </div>
          ) : null}
          {messages.loading ? <EmptyState text="Loading chat messages..." /> : null}
          {messages.error ? <EmptyState text={messages.error} /> : null}
          {!messages.loading && !messages.error ? <ChatMessageList items={messages.data} /> : null}

          <div className="chat-compose">
            <textarea
              value={adminMessage}
              onChange={(event) => setAdminMessage(event.target.value)}
              placeholder="Admin message to passenger/rider"
              disabled={!selectedBookingId}
            />
            <button
              type="button"
              disabled={!selectedBookingId || adminMessage.trim().length === 0}
              onClick={sendAdminMessage}
            >
              Send Message
            </button>
          </div>

          <div className="chat-compose admin-note-box">
            <textarea
              value={adminNote}
              onChange={(event) => setAdminNote(event.target.value)}
              placeholder="Internal admin note"
              disabled={!selectedBookingId}
            />
            <button
              type="button"
              className="secondary-button"
              disabled={!selectedBookingId || adminNote.trim().length === 0}
              onClick={saveAdminNote}
            >
              Save Note
            </button>
          </div>
        </section>
      </section>
    </PageFrame>
  )
}

function BookingDetailPage() {
  const { token } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const bookingId = location.pathname.split('/').pop()
  const [detail, setDetail] = useState({ loading: true, data: null, error: '' })
  const [actionError, setActionError] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const [selectedRiderId, setSelectedRiderId] = useState('')
  const [reason, setReason] = useState('')
  const riders = useApiData('/admin/riders')

  async function loadDetail() {
    setDetail({ loading: true, data: null, error: '' })
    try {
      const data = await apiRequest(`/admin/bookings/${bookingId}`, { token })
      setDetail({ loading: false, data, error: '' })
    } catch (error) {
      setDetail({ loading: false, data: null, error: error.message })
    }
  }

  useEffect(() => {
    loadDetail()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId, token])

  async function runAction(path, body = {}) {
    setActionError('')
    setActionMessage('')
    try {
      await apiRequest(path, { token, method: 'POST', body })
      setActionMessage('Action completed from backend.')
      await loadDetail()
    } catch (error) {
      setActionError(error.message)
    }
  }

  const booking = detail.data?.booking
  const statusHistory = detail.data?.statusHistory || []
  const eligibleRiders =
    riders.data?.riders?.filter(
      (rider) =>
        rider.approvalStatus === 'approved' &&
        rider.availabilityStatus === 'available' &&
        rider.userStatus === 'active' &&
        rider.depositBalance >= 5000,
    ) || []

  return (
    <PageFrame title={`Booking #${bookingId}`} subtitle="Admin booking detail and controlled actions.">
      <button className="secondary-button" type="button" onClick={() => navigate('/bookings')}>
        Back to Bookings
      </button>
      {detail.loading ? <EmptyState text="Loading booking detail..." /> : null}
      {detail.error ? <EmptyState text={detail.error} /> : null}
      {booking ? (
        <>
          <section className="detail-grid">
            <InfoCard title="Passenger">
              <p>{booking.passengerName}</p>
              <span>{booking.passengerPhone}</span>
            </InfoCard>
            <InfoCard title="Pickup">
              <p>{booking.pickupAddress}</p>
              <span>{booking.pickupDatetime}</span>
            </InfoCard>
            <InfoCard title="Destination">
              <p>{booking.destinationAddress}</p>
              <span>{booking.serviceType}</span>
            </InfoCard>
            <InfoCard title="Status">
              <StatusBadge>{booking.status}</StatusBadge>
              <span>{booking.paymentStatus}</span>
            </InfoCard>
            <InfoCard title="Fare">
              <p>RM {((booking.estimatedFare || 0) / 100).toFixed(2)}</p>
            </InfoCard>
            <InfoCard title="Assigned Rider">
              <p>{booking.assignedRiderName || 'Not assigned'}</p>
              <span>{booking.assignedRiderId ? `#${booking.assignedRiderId}` : 'Waiting'}</span>
            </InfoCard>
          </section>

          <section className="data-panel">
            <h2>Admin Actions</h2>
            {actionError ? <div className="error-banner">{actionError}</div> : null}
            {actionMessage ? <div className="success-banner">{actionMessage}</div> : null}
            <div className="action-grid">
              <button
                type="button"
                disabled={booking.status !== 'PAID'}
                onClick={() => runAction(`/admin/bookings/${booking.id}/start-matching`)}
              >
                Start Matching
              </button>
              <div className="inline-action">
                <select
                  value={selectedRiderId}
                  onChange={(event) => setSelectedRiderId(event.target.value)}
                  disabled={booking.status !== 'MATCHING'}
                >
                  <option value="">Select eligible rider</option>
                  {eligibleRiders.map((rider) => (
                    <option key={rider.id} value={rider.id}>
                      {rider.name} / {rider.vehiclePlate}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={booking.status !== 'MATCHING' || !selectedRiderId}
                  onClick={() =>
                    runAction(`/admin/bookings/${booking.id}/assign-rider`, {
                      riderId: Number(selectedRiderId),
                      reason,
                    })
                  }
                >
                  Assign Rider
                </button>
              </div>
              <input
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Reason or admin note"
              />
              <button
                type="button"
                disabled={booking.status !== 'ASSIGNED'}
                onClick={() =>
                  runAction(`/admin/bookings/${booking.id}/cancel`, {
                    reason,
                  })
                }
              >
                Cancel Booking
              </button>
              <button
                type="button"
                disabled={!['PAID', 'SLA_FAILED'].includes(booking.status)}
                onClick={() =>
                  runAction(`/admin/bookings/${booking.id}/refund-pending`, {
                    reason,
                  })
                }
              >
                Mark Refund Pending
              </button>
            </div>
          </section>

          <section className="data-panel">
            <h2>Status History</h2>
            <StatusHistoryTable items={statusHistory} />
          </section>
        </>
      ) : null}
    </PageFrame>
  )
}

function UnavailablePage({ title }) {
  return (
    <PageFrame title={title} subtitle="This section is reserved for the approved MVP flow.">
      <div className="empty-panel">
        <ShieldCheck size={28} />
        <h2>Backend API not available yet</h2>
        <p>No fake records are shown. This page will connect to real backend data in a later phase.</p>
      </div>
    </PageFrame>
  )
}

function PageFrame({ title, subtitle, children }) {
  return (
    <section className="page-frame">
      <div className="page-heading">
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {children}
    </section>
  )
}

function DataPanel({ title, state, children }) {
  return (
    <section className="data-panel">
      <h2>{title}</h2>
      {state.loading ? <EmptyState text="Loading backend data..." /> : null}
      {state.error ? <EmptyState text={state.error} /> : null}
      {!state.loading && !state.error ? children : null}
    </section>
  )
}

function EmptyState({ text }) {
  return <div className="empty-state">{text}</div>
}

function StatusBadge({ children }) {
  return <span className="status-badge">{children}</span>
}

function FutureMetric({ label }) {
  return (
    <div className="metric-card future-metric">
      <span>{label}</span>
      <strong>Future metric</strong>
      <small>Backend performance data is not available yet.</small>
    </div>
  )
}

function downloadCsv(filename, rows, columns) {
  const header = columns.map(([, label]) => label)
  const body = rows.map((row) => columns.map(([key]) => row[key] ?? ''))
  const csv = [header, ...body]
    .map((line) =>
      line
        .map((value) => {
          const text = String(value)
          return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
        })
        .join(','),
    )
    .join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function ReportToolbar({ columns, filename, rows }) {
  return (
    <div className="report-toolbar">
      <span>{rows.length} rows</span>
      <button
        className="secondary-button"
        disabled={!rows.length}
        type="button"
        onClick={() => downloadCsv(filename, rows, columns)}
      >
        Export CSV
      </button>
    </div>
  )
}

function RiderTable({ items }) {
  if (!items.length) return <EmptyState text="No riders found." />
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Phone</th>
            <th>Vehicle</th>
            <th>Approval</th>
            <th>Availability</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {items.map((rider) => (
            <tr key={rider.id}>
              <td>{rider.name}</td>
              <td>{rider.phone}</td>
              <td>
                {rider.vehicleModel} / {rider.vehiclePlate}
              </td>
              <td>
                <StatusBadge>{rider.approvalStatus}</StatusBadge>
              </td>
              <td>{rider.availabilityStatus}</td>
              <td>
                <NavLink className="table-link" to={`/riders/${rider.id}`}>
                  View
                </NavLink>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PaymentTable({ items }) {
  if (!items.length) return <EmptyState text="No pending payment proofs." />
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Proof ID</th>
            <th>Passenger</th>
            <th>Booking</th>
            <th>Amount</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map((proof) => (
            <tr key={proof.id}>
              <td>#{proof.id}</td>
              <td>{proof.passengerName}</td>
              <td>#{proof.bookingId}</td>
              <td>RM {(proof.amount / 100).toFixed(2)}</td>
              <td>
                <StatusBadge>{proof.status}</StatusBadge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PaymentVerificationTable({ items, onAction }) {
  const [notes, setNotes] = useState({})

  if (!items.length) return <EmptyState text="No pending payment proofs." />
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Booking</th>
            <th>Passenger</th>
            <th>Amount</th>
            <th>Proof Reference</th>
            <th>Submitted</th>
            <th>Admin Note</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((proof) => (
            <tr key={proof.id}>
              <td>#{proof.bookingId}</td>
              <td>{proof.passengerName}</td>
              <td>RM {(proof.amount / 100).toFixed(2)}</td>
              <td>{proof.proofReference}</td>
              <td>{proof.createdAt}</td>
              <td>
                <input
                  className="table-input"
                  value={notes[proof.id] || ''}
                  onChange={(event) => setNotes({ ...notes, [proof.id]: event.target.value })}
                  placeholder="Required for rejection"
                />
              </td>
              <td>
                <div className="table-actions">
                  <button type="button" onClick={() => onAction(proof.id, 'approve', notes[proof.id])}>
                    Approve
                  </button>
                  <button
                    type="button"
                    className="danger-button"
                    onClick={() => onAction(proof.id, 'reject', notes[proof.id])}
                  >
                    Reject
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PaymentHistoryTable({ items }) {
  if (!items.length) return <EmptyState text="No payment history found." />
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Proof</th>
            <th>Booking</th>
            <th>Passenger</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Verified By</th>
            <th>Verified At</th>
          </tr>
        </thead>
        <tbody>
          {items.map((proof) => (
            <tr key={proof.id}>
              <td>#{proof.id}</td>
              <td>#{proof.bookingId}</td>
              <td>{proof.passengerName}</td>
              <td>RM {(proof.amount / 100).toFixed(2)}</td>
              <td>
                <StatusBadge>{proof.status}</StatusBadge>
              </td>
              <td>{proof.verifiedByName || '-'}</td>
              <td>{proof.verifiedAt || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function CareReportTable({ items }) {
  if (!items.length) return <EmptyState text="No care reports found." />
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Report</th>
            <th>Booking</th>
            <th>Rider</th>
            <th>Arrived Safely</th>
            <th>Approval</th>
          </tr>
        </thead>
        <tbody>
          {items.map((report) => (
            <tr key={report.id}>
              <td>#{report.id}</td>
              <td>#{report.bookingId}</td>
              <td>#{report.riderId}</td>
              <td>{report.arrivedSafely ? 'Yes' : 'No'}</td>
              <td>
                <StatusBadge>{report.adminApproved ? 'approved' : 'pending'}</StatusBadge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function DailyBookingsReportTable({ items }) {
  if (!items.length) return <EmptyState text="No daily booking records found." />
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Total</th>
            <th>Completed</th>
            <th>Cancelled</th>
            <th>SLA Failed</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.date}>
              <td>{item.date}</td>
              <td>{item.totalBookings}</td>
              <td>{item.completedCount}</td>
              <td>{item.cancelledCount}</td>
              <td>{item.slaFailedCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function CompletedTripsReportTable({ items }) {
  if (!items.length) return <EmptyState text="No completed trips found." />
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Booking</th>
            <th>Passenger</th>
            <th>Rider</th>
            <th>Service</th>
            <th>Pickup</th>
            <th>Completed</th>
            <th>Fare</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.bookingId}>
              <td>#{item.bookingId}</td>
              <td>{item.passengerName}</td>
              <td>{item.riderName || '-'}</td>
              <td>{item.serviceType}</td>
              <td>{item.pickupDatetime}</td>
              <td>{item.completedAt}</td>
              <td>RM {((item.estimatedFare || 0) / 100).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function CancelledBookingsReportTable({ items }) {
  if (!items.length) return <EmptyState text="No cancelled bookings found." />
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Booking</th>
            <th>Passenger</th>
            <th>Rider</th>
            <th>Service</th>
            <th>Pickup</th>
            <th>Payment</th>
            <th>Cancelled</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.bookingId}>
              <td>#{item.bookingId}</td>
              <td>{item.passengerName}</td>
              <td>{item.riderName || '-'}</td>
              <td>{item.serviceType}</td>
              <td>{item.pickupDatetime}</td>
              <td>
                <StatusBadge>{item.paymentStatus}</StatusBadge>
              </td>
              <td>{item.cancelledAt}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PaymentSummaryReportTable({ items }) {
  if (!items.length) return <EmptyState text="No payment proof summary found." />
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Status</th>
            <th>Proof Count</th>
            <th>Total Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.status}>
              <td>
                <StatusBadge>{item.status}</StatusBadge>
              </td>
              <td>{item.proofCount}</td>
              <td>RM {((item.totalAmount || 0) / 100).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function RiderCompletedTripsReportTable({ items }) {
  if (!items.length) return <EmptyState text="No rider completed trip records found." />
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Rider</th>
            <th>Phone</th>
            <th>Plate</th>
            <th>Completed Trips</th>
            <th>Total Fare</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.riderId}>
              <td>{item.riderName}</td>
              <td>{item.riderPhone}</td>
              <td>{item.vehiclePlate}</td>
              <td>{item.completedTrips}</td>
              <td>RM {((item.totalFare || 0) / 100).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function AuditLogTable({ items }) {
  if (!items.length) return <EmptyState text="No audit logs found." />
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Created</th>
            <th>User</th>
            <th>Action</th>
            <th>Entity</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>{item.createdAt}</td>
              <td>
                {item.userName || 'System / unknown'}
                <br />
                <span className="muted-cell">
                  {item.userRole || '-'} {item.userId ? `#${item.userId}` : ''}
                </span>
              </td>
              <td>
                <StatusBadge>{item.action}</StatusBadge>
              </td>
              <td>
                {item.entityType}
                <br />
                <span className="muted-cell">{item.entityId || '-'}</span>
              </td>
              <td>
                <code className="details-code">{JSON.stringify(item.details || {})}</code>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function BookingQueueTable({ items, selectedBookingId, onSelect, emptyText }) {
  if (!items.length) return <EmptyState text={emptyText || 'No bookings found.'} />
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Passenger</th>
            <th>Pickup</th>
            <th>Service</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {items.map((booking) => (
            <tr key={booking.id} className={String(booking.id) === String(selectedBookingId) ? 'selected-row' : ''}>
              <td>#{booking.id}</td>
              <td>{booking.passengerName}</td>
              <td>{booking.pickupAddress}</td>
              <td>{booking.serviceType}</td>
              <td>
                <button className="table-link table-button" type="button" onClick={() => onSelect(booking.id)}>
                  Select
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PaidBookingsTable({ items, onStart }) {
  if (!items.length) return <EmptyState text="No PAID bookings are waiting to start matching." />
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Passenger</th>
            <th>Pickup</th>
            <th>Fare</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {items.map((booking) => (
            <tr key={booking.id}>
              <td>#{booking.id}</td>
              <td>{booking.passengerName}</td>
              <td>{booking.pickupAddress}</td>
              <td>RM {((booking.estimatedFare || 0) / 100).toFixed(2)}</td>
              <td>
                <button className="table-link table-button" type="button" onClick={() => onStart(booking.id)}>
                  Start
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function MatchingRiderTable({ items, selectedRiderId, onSelect }) {
  if (!items.length) return <EmptyState text="No approved rider candidates are available for matching." />
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Rider</th>
            <th>Vehicle</th>
            <th>Availability</th>
            <th>Deposit</th>
            <th>Mode</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {items.map((rider) => (
            <tr key={rider.id} className={String(rider.id) === String(selectedRiderId) ? 'selected-row' : ''}>
              <td>
                {rider.name}
                <br />
                <span className="muted-cell">{rider.phone}</span>
              </td>
              <td>
                {rider.vehicleModel} / {rider.vehiclePlate}
              </td>
              <td>{rider.availabilityStatus}</td>
              <td>RM {((rider.depositBalance || 0) / 100).toFixed(2)}</td>
              <td>
                <StatusBadge>
                  {rider.assignmentMode === 'override_required' ? 'override required' : 'eligible'}
                </StatusBadge>
              </td>
              <td>
                <button className="table-link table-button" type="button" onClick={() => onSelect(rider.id)}>
                  Select
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ChatConversationTable({ items, selectedBookingId, onSelect }) {
  if (!items.length) return <EmptyState text="No active booking chats found." />
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Booking</th>
            <th>Passenger</th>
            <th>Rider</th>
            <th>Messages</th>
            <th>Latest</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {items.map((chat) => (
            <tr
              key={chat.bookingId}
              className={String(chat.bookingId) === String(selectedBookingId) ? 'selected-row' : ''}
            >
              <td>
                #{chat.bookingId}
                <br />
                <StatusBadge>{chat.status}</StatusBadge>
              </td>
              <td>{chat.passengerName}</td>
              <td>{chat.riderName || 'Not assigned'}</td>
              <td>{chat.messageCount}</td>
              <td>
                {chat.latestMessage ? (
                  <>
                    <span className="muted-cell">{chat.latestSenderRole}</span>
                    <br />
                    {chat.latestMessage}
                  </>
                ) : (
                  'No messages yet'
                )}
              </td>
              <td>
                <button className="table-link table-button" type="button" onClick={() => onSelect(chat.bookingId)}>
                  Open
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ChatMessageList({ items }) {
  if (!items.length) return <EmptyState text="No messages stored for this booking yet." />
  return (
    <div className="chat-message-list">
      {items.map((item) => (
        <article className={`chat-message ${item.senderRole}`} key={item.id}>
          <div>
            <strong>{item.senderName}</strong>
            <StatusBadge>{item.senderRole}</StatusBadge>
          </div>
          <p>{item.message}</p>
          <span>{item.createdAt}</span>
        </article>
      ))}
    </div>
  )
}

function BookingsTable({ items }) {
  if (!items.length) return <EmptyState text="No bookings found." />
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Passenger</th>
            <th>Pickup</th>
            <th>Destination</th>
            <th>Status</th>
            <th>Rider</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {items.map((booking) => (
            <tr key={booking.id}>
              <td>#{booking.id}</td>
              <td>{booking.passengerName}</td>
              <td>{booking.pickupAddress}</td>
              <td>{booking.destinationAddress}</td>
              <td>
                <StatusBadge>{booking.status}</StatusBadge>
              </td>
              <td>{booking.assignedRiderName || 'Not assigned'}</td>
              <td>
                <NavLink className="table-link" to={`/bookings/${booking.id}`}>
                  View
                </NavLink>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function InfoCard({ title, children }) {
  return (
    <div className="info-card">
      <strong>{title}</strong>
      {children}
    </div>
  )
}

function StatusHistoryTable({ items }) {
  if (!items.length) return <EmptyState text="No status history found." />
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>From</th>
            <th>To</th>
            <th>Changed By</th>
            <th>Reason</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>{item.oldStatus || '-'}</td>
              <td>
                <StatusBadge>{item.newStatus}</StatusBadge>
              </td>
              <td>{item.changedByName || item.changedBy || 'System'}</td>
              <td>{item.reason || '-'}</td>
              <td>{item.createdAt}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function FullPageState({ title }) {
  return (
    <main className="full-page-state">
      <div className="brand-mark">JM</div>
      <p>{title}</p>
    </main>
  )
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </Router>
  )
}

export default App

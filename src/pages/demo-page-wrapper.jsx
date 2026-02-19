import { useState, useEffect } from "react"
import { useParams, Link } from "react-router-dom"
import { Layers } from "lucide-react"

import { AuthContext } from "../context/AuthContext"
import api from "../services/api"
import { DEMO_USER, matchDemoResponse } from "../mocks/demo-data"
import Sidebar from "../components/sidebar"
import MobileBottomNav from "../components/mobile-bottom-nav"

// ─── Page imports ─────────────────────────────────────────────────────────────
import ServiceFlowDashboard from "./dashboard-redesigned"
import ServiceFlowSchedule from "./schedule-redesigned"
import UnifiedCalendar from "./unified-calendar"
import ServiceFlowJobs from "./jobs"
import ServiceFlowRequests from "./Request"
import LeadsPipeline from "./leads-pipeline"
import Notifications from "./notifications"

import ServiceFlowInvoices from "./serviceflow-invoices"
import ServiceFlowEstimates from "./serviceflow-estimates"
import ServiceFlowPayments from "./serviceflow-payments"
import ServiceFlowRecurring from "./serviceflow-recurring"
import Payroll from "./payroll"

import ServiceFlowCustomers from "./serviceflow-customers"
import ServiceFlowTeam from "./serviceflow-team"
import TeamAvailabilityCalendar from "./team-availability-calendar"
import StaffLocationsMap from "./staff-locations-map"

import ServiceFlowServices from "./serviceflow-services"
import ServiceFlowTerritories from "./serviceflow-territories"
import ServiceFlowCoupons from "./serviceflow-coupons"
import ServiceFlowOnlineBooking from "./serviceflow-online-booking"
import Analytics from "./analytics"

import CreateJobPage from "./createjob"
import ServiceFlowEstimatePage from "./bookableestimate"
import CreateCoupon from "./create-coupon"
import ImportDataPage from "./import-data"
import ImportCustomersPage from "./import-customers"
import UnifiedImportJobsPage from "./import-jobs-unified"

import ServiceFlowSettings from "./serviceflow-settings"
import AccountDetails from "./settings/account-details"
import BillingSettings from "./settings/billing"
import BrandingSettings from "./settings/branding"
import Availability from "./settings/availability"
import PaymentsSettings from "./settings/payments"
import BookingQuoteRequests from "./settings/booking-quote-requests"
import JobAssignment from "./settings/job-assignment"
import ClientTeamNotifications from "./settings/client-team-notifications"
import CalendarSyncing from "./settings/calendar-syncing"
import ServiceAreas from "./settings/service-areas"
import FieldApp from "./settings/field-app"
import TaxesFees from "./settings/taxes-fees"
import FeedbackReviews from "./settings/feedback-reviews"
import Developers from "./settings/developers"

import WhatsNewPage from "./whats-new"
import HelpPage from "./help"

// ─── Page map ─────────────────────────────────────────────────────────────────
const PAGE_MAP = {
  dashboard:            ServiceFlowDashboard,
  schedule:             ServiceFlowSchedule,
  calendar:             UnifiedCalendar,
  jobs:                 ServiceFlowJobs,
  request:              ServiceFlowRequests,
  leads:                LeadsPipeline,
  notifications:        Notifications,
  invoices:             ServiceFlowInvoices,
  estimates:            ServiceFlowEstimates,
  payments:             ServiceFlowPayments,
  recurring:            ServiceFlowRecurring,
  payroll:              Payroll,
  customers:            ServiceFlowCustomers,
  team:                 ServiceFlowTeam,
  "team-availability":  TeamAvailabilityCalendar,
  "staff-locations":    StaffLocationsMap,
  services:             ServiceFlowServices,
  territories:          ServiceFlowTerritories,
  coupons:              ServiceFlowCoupons,
  "online-booking":     ServiceFlowOnlineBooking,
  analytics:            Analytics,
  createjob:            CreateJobPage,
  "bookable-estimate":  ServiceFlowEstimatePage,
  "create-coupon":      CreateCoupon,
  "import-data":        ImportDataPage,
  "import-customers":   ImportCustomersPage,
  "import-jobs":        UnifiedImportJobsPage,
  settings:                              ServiceFlowSettings,
  "settings-account":                    AccountDetails,
  "settings-billing":                    BillingSettings,
  "settings-branding":                   BrandingSettings,
  "settings-availability":               Availability,
  "settings-payments":                   PaymentsSettings,
  "settings-booking-quote-requests":     BookingQuoteRequests,
  "settings-job-assignment":             JobAssignment,
  "settings-notifications":              ClientTeamNotifications,
  "settings-calendar-syncing":           CalendarSyncing,
  "settings-service-areas":             ServiceAreas,
  "settings-field-app":                  FieldApp,
  "settings-taxes-fees":                 TaxesFees,
  "settings-feedback-reviews":           FeedbackReviews,
  "settings-developers":                 Developers,
  "whats-new":          WhatsNewPage,
  help:                 HelpPage,
}

// ─── Static mock auth value ───────────────────────────────────────────────────
// Provided via AuthContext.Provider so ALL components in the tree
// (Sidebar, page components, etc.) get a valid user without a real session.
const noop = () => {}
const MOCK_AUTH = {
  user: DEMO_USER,
  loading: false,
  login:               () => Promise.resolve({ success: true }),
  loginWithGoogle:     () => Promise.resolve({ success: true }),
  signup:              () => Promise.resolve({ success: true }),
  logout:              noop,
  updateUserProfile:   noop,
  refreshUserProfile:  () => Promise.resolve(DEMO_USER),
  isAuthenticated:     () => true,
}

// ─── Component ────────────────────────────────────────────────────────────────
const DemoPageWrapper = () => {
  const { pageId } = useParams()
  const Component = PAGE_MAP[pageId]

  // Intercept failed API responses and return mock data instead.
  // This runs before API calls resolve, so demo pages see realistic content.
  useEffect(() => {
    const id = api.interceptors.response.use(
      (res) => res,
      (err) => {
        const url    = err?.config?.url    ?? ""
        const method = err?.config?.method ?? "get"
        return Promise.resolve({
          data: matchDemoResponse(url, method),
          status: 200,
          headers: {},
          config: err.config,
        })
      }
    )
    return () => api.interceptors.response.eject(id)
  }, [])

  if (!Component) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 text-sm mb-3">
            Page not found: <code className="font-mono">{pageId}</code>
          </p>
          <Link to="/demo" className="text-sm text-blue-600 hover:underline">
            Back to Demo Hub
          </Link>
        </div>
      </div>
    )
  }

  // Wrap the entire layout — including Sidebar — inside AuthContext.Provider
  // so every useAuth() call in any child returns MOCK_AUTH (no login redirect).
  return (
    <AuthContext.Provider value={MOCK_AUTH}>
      <div className="min-h-screen bg-gray-50 flex">
        {/* Sidebar — rendered with mock auth, shows full nav */}
        <div className="hidden lg:block">
          <Sidebar isOpen={false} onClose={noop} />
        </div>

        {/* Page content */}
        <div className="flex-1 lg:ml-52 xl:ml-52">
          <Component />
        </div>

        {/* Mobile bottom nav */}
        <MobileBottomNav teamMembers={[]} />
      </div>

      {/* Floating Demo Hub badge */}
      <Link
        to="/demo"
        className="fixed bottom-5 right-5 z-50 flex items-center gap-1.5 bg-gray-900 text-white text-xs font-medium px-3 py-2 rounded-full shadow-lg hover:bg-gray-700 transition-colors"
      >
        <Layers className="w-3 h-3" />
        Demo Hub
      </Link>
    </AuthContext.Provider>
  )
}

export default DemoPageWrapper

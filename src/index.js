import ReactDOM from "react-dom/client"
import App from "./App"
import { BrowserRouter, Routes, Route } from "react-router-dom"
import { AuthProvider } from "./context/AuthContext"
import ProtectedRoute from "./components/ProtectedRoute"
import SignupForm from "./pages/Signup"
import SignInForm from "./pages/Signin"
import ServiceFlowDashboard from "./pages/dashboard"
import ServiceFlowRequests from "./pages/Request"
import ServiceFlowSchedule from "./pages/Schedule"
import ServiceFlowJobs from "./pages/jobs"
import JobDetails from "./pages/job-details"
import ServiceFlowEstimates from "./pages/serviceflow-estimates"
import ServiceFlowRecurring from "./pages/serviceflow-recurring"
import ServiceFlowPayments from "./pages/serviceflow-payments"
import ServiceFlowInvoices from "./pages/serviceflow-invoices"
import ServiceFlowCustomers from "./pages/serviceflow-customers"
import CustomerDetails from "./pages/customer-details"
import InvoiceDetails from "./pages/invoice-details"
import InvoiceEdit from "./pages/invoice-edit"
import ServiceFlowTeam from "./pages/serviceflow-team"
import ServiceFlowServices from "./pages/serviceflow-services"
import ServiceFlowCoupons from "./pages/serviceflow-coupons"
import CreateCoupon from "./pages/create-coupon"
import ServiceFlowTerritories from "./pages/serviceflow-territories"
import Analytics from "./pages/analytics"
import ServiceFlowOnlineBooking from "./pages/serviceflow-online-booking"
import ServiceFlowWebsiteEmbed from "./pages/serviceflow-website-embed"
import ServiceFlowSettings from "./pages/serviceflow-settings"
import TeamMemberDetails from "./pages/team-member-details"
import AddTeamMember from "./pages/add-team-member"
import ServiceDetails from "./pages/service-details"
import WhatsNewPage from "./pages/whats-new"
import HelpPage from "./pages/help"
import PublicBooking from "./pages/public-booking"
import PublicQuote from "./pages/public-quote"
import DemoPublicPages from "./pages/demo-public-pages"
import CustomerPortal from "./pages/customer-portal"

// Settings Pages
import FeedbackReviews from "./pages/settings/feedback-reviews"
import ClientTeamNotifications from "./pages/settings/client-team-notifications"
import JobAssignment from "./pages/settings/job-assignment"
import Availability from "./pages/settings/availability"
import ReschedulingCancellation from "./pages/settings/rescheduling-cancellation"
import Developers from "./pages/settings/developers"
import CalendarSyncing from "./pages/settings/calendar-syncing"
import TaxesFees from "./pages/settings/taxes-fees"
import PaymentsSettings from "./pages/settings/payments"
import ServiceAreas from "./pages/settings/service-areas"
import BookingQuoteRequests from "./pages/settings/booking-quote-requests"
import FieldApp from "./pages/settings/field-app"
import CreateJobPage from "./pages/createjob"
import ServiceFlowEstimatePage from "./pages/bookableestimate"
import BrandingSettings from "./pages/settings/branding"
import AccountDetails from "./pages/settings/account-details"
import BillingSettings from "./pages/settings/billing"
import CreateRecurringBooking from "./pages/createjob"
import LocationAvailability from "./pages/settings/location-availability"
import QuoteRequestProcessing from "./pages/settings/quote-request-processing"
import JobFollowUp from "./pages/settings/job-follow-up"
import BookingRequestAcknowledgment from "./pages/settings/booking-request-acknowledgment"
import AppointmentCancelled from "./pages/settings/appointment-cancelled"
import Enroute from "./pages/settings/enroute"
import RecurringBookingCancelled from "./pages/settings/recurring-booking-cancelled"
import PaymentReceipt from "./pages/settings/payment-receipt"
import Invoice from "./pages/settings/invoice"
import ContactCustomer from "./pages/settings/contact-customer"
import AppointmentConfirmation from "./pages/settings/appointment-confirmation"
import Estimate from "./pages/settings/estimate"
import AppointmentRescheduled from "./pages/settings/appointment-rescheduled"
import AppointmentReminder from "./pages/settings/appointment-reminder"
import AssignedJobCancelled from "./pages/settings/assigned-job-cancelled"
import AssignedJobRescheduled from "./pages/settings/assigned-job-rescheduled"
import TeamMemberInvite from "./pages/settings/team-member-invite"
import RecurringAssignment from "./pages/settings/recurring-assignment"
import JobOffer from "./pages/settings/job-offer"
import JobAssignmentTeam from "./pages/settings/job-assignment-team"
import TeamMemberLogin from "./pages/team-member-login"
import TeamMemberDashboard from "./pages/team-member-dashboard"
import TeamMemberFieldApp from "./pages/team-member-field-app"
import TeamMemberSignup from "./pages/team-member-signup"
import DropdownMultiselectDemo from "./pages/dropdown-multiselect-demo"
import { TeamMemberAuthProvider } from "./context/TeamMemberAuthContext"

const root = ReactDOM.createRoot(document.getElementById("root"))
root.render(
  <BrowserRouter>
    <AuthProvider>
      <TeamMemberAuthProvider>
        <Routes>
      <Route index element={<App />} />
      <Route path="signup" element={<SignupForm />} />
      <Route path="signin" element={<SignInForm />} />
      <Route path="dashboard" element={<ProtectedRoute><ServiceFlowDashboard /></ProtectedRoute>} />
      <Route path="request" element={<ProtectedRoute><ServiceFlowRequests /></ProtectedRoute>} />
      <Route path="schedule" element={<ProtectedRoute><ServiceFlowSchedule /></ProtectedRoute>} />
      <Route path="jobs" element={<ProtectedRoute><ServiceFlowJobs /></ProtectedRoute>} />
      <Route path="job/:jobId" element={<ProtectedRoute><JobDetails /></ProtectedRoute>} />
      <Route path="estimates" element={<ProtectedRoute><ServiceFlowEstimates /></ProtectedRoute>} />
      <Route path="recurring" element={<ServiceFlowRecurring />} />
      <Route path="recurring/create" element={<CreateRecurringBooking />} />
      <Route path="payments" element={<ServiceFlowPayments />} />
      <Route path="invoices" element={<ProtectedRoute><ServiceFlowInvoices /></ProtectedRoute>} />
      <Route path="customers" element={<ServiceFlowCustomers />} />
      <Route path="customer/:customerId" element={<ProtectedRoute><CustomerDetails /></ProtectedRoute>} />
      <Route path="invoices/:invoiceId" element={<ProtectedRoute><InvoiceDetails /></ProtectedRoute>} />
      <Route path="invoices/:invoiceId/edit" element={<ProtectedRoute><InvoiceEdit /></ProtectedRoute>} />
      <Route path="team" element={<ServiceFlowTeam />} />
      <Route path="team/:memberId" element={<ProtectedRoute><TeamMemberDetails /></ProtectedRoute>} />
      <Route path="add-team-member" element={<AddTeamMember />} />
      <Route path="services" element={<ServiceFlowServices />} />
      <Route path="services/:serviceId" element={<ServiceDetails />} />
      <Route path="services/:serviceId/:section" element={<ServiceDetails />} />
      <Route path="coupons" element={<ServiceFlowCoupons />} />
      <Route path="coupons/create" element={<CreateCoupon />} />
      <Route path="territories" element={<ServiceFlowTerritories />} />
      <Route path="analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
      <Route path="online-booking" element={<ServiceFlowOnlineBooking />} />
      <Route path="embed" element={<ServiceFlowWebsiteEmbed />} />
      <Route path="createjob" element={<CreateJobPage />} />
      <Route path="bookable-estimate" element={<ServiceFlowEstimatePage />} />
      <Route path="whats-new" element={<WhatsNewPage />} />
      <Route path="help" element={<HelpPage />} />
      {/* Settings Routes */}
      <Route path="settings" element={<ServiceFlowSettings />} />
      <Route path="settings/account" element={<AccountDetails />} />
      <Route path="settings/billing" element={<BillingSettings />} />
      <Route path="settings/branding" element={<BrandingSettings />} />
      <Route path="settings/feedback-reviews" element={<FeedbackReviews />} />
      <Route path="settings/client-team-notifications" element={<ClientTeamNotifications />} />
      <Route path="settings/client-team-notifications/quote-request-processing" element={<QuoteRequestProcessing />} />
      <Route path="settings/client-team-notifications/job-follow-up" element={<JobFollowUp />} />
      <Route path="settings/client-team-notifications/booking-request-acknowledgment" element={<BookingRequestAcknowledgment />} />
      <Route path="settings/client-team-notifications/appointment-cancelled" element={<AppointmentCancelled />} />
      <Route path="settings/client-team-notifications/enroute" element={<Enroute />} />
      <Route path="settings/client-team-notifications/recurring-booking-cancelled" element={<RecurringBookingCancelled />} />
      <Route path="settings/client-team-notifications/payment-receipt" element={<PaymentReceipt />} />
      <Route path="settings/client-team-notifications/invoice" element={<Invoice />} />
      <Route path="settings/client-team-notifications/contact-customer" element={<ContactCustomer />} />
      <Route path="settings/client-team-notifications/appointment-confirmation" element={<AppointmentConfirmation />} />
      <Route path="settings/client-team-notifications/estimate" element={<Estimate />} />
      <Route path="settings/client-team-notifications/appointment-rescheduled" element={<AppointmentRescheduled />} />
      <Route path="settings/client-team-notifications/appointment-reminder" element={<AppointmentReminder />} />
      <Route path="settings/client-team-notifications/assigned-job-cancelled" element={<AssignedJobCancelled />} />
      <Route path="settings/client-team-notifications/assigned-job-rescheduled" element={<AssignedJobRescheduled />} />
      <Route path="settings/client-team-notifications/team-member-invite" element={<TeamMemberInvite />} />
      <Route path="settings/client-team-notifications/recurring-assignment" element={<RecurringAssignment />} />
      <Route path="settings/client-team-notifications/job-offer" element={<JobOffer />} />
      <Route path="settings/client-team-notifications/job-assignment" element={<JobAssignmentTeam />} />
      <Route path="settings/job-assignment" element={<JobAssignment />} />
      <Route path="settings/availability" element={<Availability />} />
      <Route path="settings/availability/:location" element={<LocationAvailability />} />
      <Route path="settings/rescheduling-cancellation" element={<ReschedulingCancellation />} />
      <Route path="settings/developers" element={<Developers />} />
      <Route path="settings/calendar-syncing" element={<CalendarSyncing />} />
      <Route path="settings/taxes-fees" element={<TaxesFees />} />
      <Route path="settings/payments" element={<PaymentsSettings />} />
      <Route path="settings/service-areas" element={<ServiceAreas />} />
      <Route path="settings/booking-quote-requests" element={<BookingQuoteRequests />} />
      <Route path="settings/field-app" element={<FieldApp />} />
      
      {/* Public Booking Routes - No authentication required */}
      <Route path="book/:userSlug" element={<PublicBooking />} />
      <Route path="booking" element={<PublicBooking />} />
      <Route path="quote/:userSlug" element={<PublicQuote />} />
      <Route path="quote" element={<PublicQuote />} />
      <Route path="demo-public-pages" element={<DemoPublicPages />} />
      <Route path="customer-portal" element={<CustomerPortal />} />
      
      {/* Team Member Routes */}
      <Route path="team-member/login" element={<TeamMemberLogin />} />
      <Route path="team-member/signup" element={<TeamMemberSignup />} />
      <Route path="team-member/dashboard" element={<TeamMemberDashboard />} />
      <Route path="team-member/field-app" element={<TeamMemberFieldApp />} />
      
      {/* Demo Routes */}
      <Route path="dropdown-demo" element={<DropdownMultiselectDemo />} />
      
      {/* Catch-all route - redirect to dashboard for any unmatched routes */}
      <Route path="*" element={<ProtectedRoute><ServiceFlowDashboard /></ProtectedRoute>} />
      </Routes>
    </TeamMemberAuthProvider>
    </AuthProvider>
  </BrowserRouter>,
)

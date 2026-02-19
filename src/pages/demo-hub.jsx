import { Link } from "react-router-dom"
import {
  Briefcase, Users, DollarSign, Wrench, UserCheck,
  Map, Building2, Upload, ChevronRight, Layers,
  LayoutDashboard, Calendar, ClipboardList, Bell,
  FileText, RotateCcw, CreditCard, Wallet,
  UserCog, MapPin, BarChart2, Settings,
  FilePlus, Package, Tag, Globe, ArrowUpFromLine,
  ExternalLink,
} from "lucide-react"

// ─── Main app pages ───────────────────────────────────────────────────────────
const PAGE_GROUPS = [
  {
    id: "operations",
    label: "Operations",
    icon: LayoutDashboard,
    headerColor: "bg-slate-700",
    color: "bg-slate-50 border-slate-200",
    iconColor: "text-slate-600",
    pages: [
      { label: "Dashboard", path: "/dashboard", desc: "Overview of jobs, revenue, and team activity" },
      { label: "Schedule", path: "/schedule", desc: "Daily and weekly job scheduling view" },
      { label: "Calendar", path: "/calendar", desc: "Unified calendar across all team members" },
      { label: "Jobs", path: "/jobs", desc: "All jobs list with filters and search" },
      { label: "Requests", path: "/request", desc: "Incoming booking and quote requests" },
      { label: "Leads Pipeline", path: "/leads", desc: "Kanban pipeline for managing leads" },
      { label: "Notifications", path: "/notifications", desc: "System and customer notifications" },
    ],
  },
  {
    id: "finance",
    label: "Finance",
    icon: DollarSign,
    headerColor: "bg-yellow-600",
    color: "bg-yellow-50 border-yellow-200",
    iconColor: "text-yellow-600",
    pages: [
      { label: "Invoices", path: "/invoices", desc: "All customer invoices and payment status" },
      { label: "Estimates", path: "/estimates", desc: "Quotes and estimates sent to customers" },
      { label: "Payments", path: "/payments", desc: "Payment records and reconciliation" },
      { label: "Recurring", path: "/recurring", desc: "Recurring service subscriptions" },
      { label: "Payroll", path: "/payroll", desc: "Team member payroll and earnings" },
    ],
  },
  {
    id: "people",
    label: "People",
    icon: Users,
    headerColor: "bg-green-600",
    color: "bg-green-50 border-green-200",
    iconColor: "text-green-600",
    pages: [
      { label: "Customers", path: "/customers", desc: "Customer directory and history" },
      { label: "Team", path: "/team", desc: "Team member list and management" },
      { label: "Team Availability", path: "/team-availability", desc: "Availability calendar per team member" },
      { label: "Staff Locations", path: "/staff-locations", desc: "Real-time map of staff locations" },
    ],
  },
  {
    id: "business",
    label: "Business",
    icon: Building2,
    headerColor: "bg-purple-600",
    color: "bg-purple-50 border-purple-200",
    iconColor: "text-purple-600",
    pages: [
      { label: "Services", path: "/services", desc: "Service catalogue and pricing" },
      { label: "Territories", path: "/territories", desc: "Service area territories" },
      { label: "Coupons", path: "/coupons", desc: "Discount coupons and promo codes" },
      { label: "Online Booking", path: "/online-booking", desc: "Public booking page settings" },
      { label: "Analytics", path: "/analytics", desc: "Revenue, jobs, and performance charts" },
    ],
  },
  {
    id: "create",
    label: "Create & Import",
    icon: FilePlus,
    headerColor: "bg-blue-600",
    color: "bg-blue-50 border-blue-200",
    iconColor: "text-blue-600",
    pages: [
      { label: "Create Job", path: "/createjob", desc: "Create a new job from scratch" },
      { label: "Bookable Estimate", path: "/bookable-estimate", desc: "Create a bookable estimate" },
      { label: "Create Coupon", path: "/coupons/create", desc: "Create a new discount coupon" },
      { label: "Import Data", path: "/import-data", desc: "Import data from CSV or external sources" },
      { label: "Import Customers", path: "/import-customers", desc: "Bulk import customers from CSV" },
      { label: "Import Jobs", path: "/import-jobs", desc: "Bulk import jobs from CSV" },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
    headerColor: "bg-gray-600",
    color: "bg-gray-50 border-gray-200",
    iconColor: "text-gray-600",
    pages: [
      { label: "Settings", path: "/settings", desc: "Main settings hub" },
      { label: "Account", path: "/settings/account", desc: "Account details and profile" },
      { label: "Billing", path: "/settings/billing", desc: "Subscription and billing info" },
      { label: "Branding", path: "/settings/branding", desc: "Logo, colors, and brand settings" },
      { label: "Availability", path: "/settings/availability", desc: "Business hours and availability" },
      { label: "Payments Settings", path: "/settings/payments", desc: "Payment gateway configuration" },
      { label: "Booking & Quotes", path: "/settings/booking-quote-requests", desc: "Booking and quote request rules" },
      { label: "Job Assignment", path: "/settings/job-assignment", desc: "Auto-assignment rules" },
      { label: "Notifications Config", path: "/settings/client-team-notifications", desc: "Email and SMS notification templates" },
      { label: "Calendar Sync", path: "/settings/calendar-syncing", desc: "Google Calendar and iCal sync" },
      { label: "Service Areas", path: "/settings/service-areas", desc: "Zip code and radius service areas" },
      { label: "Field App", path: "/settings/field-app", desc: "Field app settings for team members" },
      { label: "Taxes & Fees", path: "/settings/taxes-fees", desc: "Tax rates and service fees" },
      { label: "Feedback & Reviews", path: "/settings/feedback-reviews", desc: "Review request automation" },
      { label: "Developers", path: "/settings/developers", desc: "API keys and webhook settings" },
    ],
  },
  {
    id: "public",
    label: "Public Pages",
    icon: Globe,
    headerColor: "bg-teal-600",
    color: "bg-teal-50 border-teal-200",
    iconColor: "text-teal-600",
    pages: [
      { label: "Public Booking", path: "/book/demo", desc: "Customer-facing booking page" },
      { label: "Public Quote", path: "/quote/demo", desc: "Customer-facing quote request page" },
      { label: "What's New", path: "/whats-new", desc: "Release notes and changelog" },
      { label: "Help", path: "/help", desc: "Help centre and documentation" },
    ],
  },
]

// ─── Modal categories (unchanged) ─────────────────────────────────────────────
const MODAL_CATEGORIES = [
  {
    id: "jobs",
    label: "Jobs & Scheduling",
    icon: Briefcase,
    color: "bg-blue-50 border-blue-200",
    iconColor: "text-blue-600",
    headerColor: "bg-blue-600",
    popups: [
      { id: "edit-job", label: "Edit Job", desc: "Edit core job information" },
      { id: "edit-job-details", label: "Edit Job Details", desc: "Edit duration, team size, and skill level" },
      { id: "duplicate-job", label: "Duplicate Job", desc: "Create a copy of an existing job" },
      { id: "assign-job", label: "Assign Job", desc: "Assign team members to a job" },
      { id: "scheduling-booking", label: "Scheduling & Booking", desc: "Book a new scheduling appointment" },
      { id: "create-recurring-option", label: "Create Recurring Option", desc: "Set up a recurring service option" },
      { id: "convert-to-recurring", label: "Convert to Recurring", desc: "Convert a one-time job to recurring" },
      { id: "recurring-frequency", label: "Recurring Frequency", desc: "Configure recurring frequency settings" },
    ],
  },
  {
    id: "customers",
    label: "Customers & Leads",
    icon: Users,
    color: "bg-green-50 border-green-200",
    iconColor: "text-green-600",
    headerColor: "bg-green-600",
    popups: [
      { id: "customer", label: "Customer", desc: "Add or edit a customer record" },
      { id: "convert-lead", label: "Convert Lead", desc: "Convert a lead into a customer" },
      { id: "service-address", label: "Service Address", desc: "Add or change a service address" },
      { id: "create-task", label: "Create Task", desc: "Create a follow-up task for a lead" },
    ],
  },
  {
    id: "finance",
    label: "Finance",
    icon: DollarSign,
    color: "bg-yellow-50 border-yellow-200",
    iconColor: "text-yellow-600",
    headerColor: "bg-yellow-600",
    popups: [
      { id: "estimate", label: "Estimate", desc: "Create or edit a customer estimate" },
      { id: "estimate-preview", label: "Estimate Preview", desc: "Preview an estimate before sending" },
      { id: "send-invoice", label: "Send Invoice", desc: "Send an invoice to a customer" },
      { id: "discount", label: "Discount", desc: "Apply a discount to a job or invoice" },
      { id: "payment-method", label: "Payment Method", desc: "Select or change the payment method" },
      { id: "create-custom-payment-method", label: "Custom Payment Method", desc: "Create a new custom payment method" },
    ],
  },
  {
    id: "services",
    label: "Services",
    icon: Wrench,
    color: "bg-purple-50 border-purple-200",
    iconColor: "text-purple-600",
    headerColor: "bg-purple-600",
    popups: [
      { id: "create-service", label: "Create Service", desc: "Create a new service offering" },
      { id: "simple-create-service", label: "Simple Create Service", desc: "Quick service creation flow" },
      { id: "service", label: "Service", desc: "Add or edit a service" },
      { id: "service-selection", label: "Service Selection", desc: "Select services for a job" },
      { id: "service-templates", label: "Service Templates", desc: "Browse and apply service templates" },
      { id: "modifier", label: "Modifier", desc: "Add or edit a service modifier" },
      { id: "create-modifier-group", label: "Create Modifier Group", desc: "Create a group of modifiers" },
      { id: "intake-question", label: "Intake Question", desc: "Create a customer intake question" },
    ],
  },
  {
    id: "team",
    label: "Team",
    icon: UserCheck,
    color: "bg-pink-50 border-pink-200",
    iconColor: "text-pink-600",
    headerColor: "bg-pink-600",
    popups: [
      { id: "add-team-member", label: "Add Team Member", desc: "Invite or add a new team member" },
      { id: "create-skill-tag", label: "Create Skill Tag", desc: "Create a skill tag for team members" },
      { id: "timeslot-template", label: "Timeslot Template", desc: "Create an availability timeslot template" },
      { id: "update-availability", label: "Update Availability", desc: "Update team member availability" },
    ],
  },
  {
    id: "territories",
    label: "Territories",
    icon: Map,
    color: "bg-orange-50 border-orange-200",
    iconColor: "text-orange-600",
    headerColor: "bg-orange-600",
    popups: [
      { id: "create-territory", label: "Create Territory", desc: "Create a new service territory" },
      { id: "territory-selection", label: "Territory Selection", desc: "Select a territory for a job or member" },
      { id: "territory-adjustment", label: "Territory Adjustment", desc: "Adjust territory pricing/settings" },
      { id: "territory-team-members", label: "Territory Team Members", desc: "Manage team members in a territory" },
    ],
  },
  {
    id: "business",
    label: "Business & Plans",
    icon: Building2,
    color: "bg-indigo-50 border-indigo-200",
    iconColor: "text-indigo-600",
    headerColor: "bg-indigo-600",
    popups: [
      { id: "business-details", label: "Business Details", desc: "View or edit business information" },
      { id: "plan-selection", label: "Plan Selection", desc: "Select or change a subscription plan" },
    ],
  },
  {
    id: "import-export",
    label: "Import & Export",
    icon: Upload,
    color: "bg-teal-50 border-teal-200",
    iconColor: "text-teal-600",
    headerColor: "bg-teal-600",
    popups: [
      { id: "export-jobs", label: "Export Jobs", desc: "Export job data to CSV/Excel" },
      { id: "export-customers", label: "Export Customers", desc: "Export customer data to CSV/Excel" },
      { id: "import-customers", label: "Import Customers", desc: "Import customers from a CSV file" },
    ],
  },
]

// ─── Component ────────────────────────────────────────────────────────────────
const DemoHub = () => {
  const totalPages = PAGE_GROUPS.reduce((sum, g) => sum + g.pages.length, 0)
  const totalModals = MODAL_CATEGORIES.reduce((sum, c) => sum + c.popups.length, 0)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gray-900 rounded-lg flex items-center justify-center">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Demo Hub</h1>
              <p className="text-sm text-gray-500">
                {totalPages} pages · {totalModals} modals
              </p>
            </div>
          </div>
          <Link
            to="/dashboard"
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            Back to App
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-14">

        {/* ── Pages section ───────────────────────────────────────── */}
        <div>
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Pages</h2>
            <span className="text-xs bg-gray-900 text-white rounded-full px-2 py-0.5 font-medium">
              {totalPages}
            </span>
          </div>

          <div className="space-y-8">
            {PAGE_GROUPS.map((group) => {
              const Icon = group.icon
              return (
                <section key={group.id}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-6 h-6 rounded flex items-center justify-center ${group.headerColor}`}>
                      <Icon className="w-3.5 h-3.5 text-white" />
                    </div>
                    <h3 className="text-sm font-semibold text-gray-700">{group.label}</h3>
                    <span className="text-xs text-gray-400">{group.pages.length}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {group.pages.map((page) => (
                      <Link
                        key={page.path}
                        to={page.path}
                        className={`group flex flex-col justify-between border rounded-lg p-4 hover:shadow-sm transition-all duration-150 ${group.color}`}
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900">{page.label}</p>
                          <p className="text-xs text-gray-500 mt-1 leading-relaxed">{page.desc}</p>
                        </div>
                        <div className="flex items-center justify-between mt-3">
                          <code className="text-[10px] text-gray-400 font-mono">{page.path}</code>
                          <ExternalLink className={`w-3 h-3 ${group.iconColor} opacity-0 group-hover:opacity-100 transition-opacity`} />
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              )
            })}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200" />

        {/* ── Modals section ───────────────────────────────────────── */}
        <div>
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Modals</h2>
            <span className="text-xs bg-gray-900 text-white rounded-full px-2 py-0.5 font-medium">
              {totalModals}
            </span>
          </div>

          <div className="space-y-8">
            {MODAL_CATEGORIES.map((category) => {
              const Icon = category.icon
              return (
                <section key={category.id}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-6 h-6 rounded flex items-center justify-center ${category.headerColor}`}>
                      <Icon className="w-3.5 h-3.5 text-white" />
                    </div>
                    <h3 className="text-sm font-semibold text-gray-700">{category.label}</h3>
                    <span className="text-xs text-gray-400">{category.popups.length}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {category.popups.map((popup) => (
                      <Link
                        key={popup.id}
                        to={`/demo/popup/${popup.id}`}
                        className={`group flex flex-col justify-between border rounded-lg p-4 hover:shadow-sm transition-all duration-150 ${category.color}`}
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900">{popup.label}</p>
                          <p className="text-xs text-gray-500 mt-1 leading-relaxed">{popup.desc}</p>
                        </div>
                        <div className="flex items-center justify-between mt-3">
                          <code className="text-[10px] text-gray-400 font-mono">/demo/popup/{popup.id}</code>
                          <ChevronRight className={`w-3.5 h-3.5 ${category.iconColor} opacity-0 group-hover:opacity-100 transition-opacity`} />
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              )
            })}
          </div>
        </div>

      </div>
    </div>
  )
}

export { MODAL_CATEGORIES }
export default DemoHub

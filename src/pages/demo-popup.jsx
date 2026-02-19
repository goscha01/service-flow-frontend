import { useState } from "react"
import { useParams, Link, useNavigate } from "react-router-dom"
import {
  ChevronRight, ChevronLeft, ExternalLink, Play, Home,
  Briefcase, Users, DollarSign, Wrench, UserCheck, Map, Building2, Upload
} from "lucide-react"

// ─── Modal imports ────────────────────────────────────────────────────────────
import CustomerModal from "../components/customer-modal"
import ConvertLeadModal from "../components/convert-lead-modal"
import ServiceAddressModal from "../components/service-address-modal"
import CreateTaskModal from "../components/create-task-modal"

import EditJobModal from "../components/edit-job-modal"
import EditJobDetailsModal from "../components/edit-job-details-modal"
import DuplicateJobModal from "../components/duplicate-job-modal"
import AssignJobModal from "../components/assign-job-modal"
import JobTemplateModal from "../components/job-template-modal"
import SchedulingBookingModal from "../components/scheduling-booking-modal"
import CreateRecurringOptionModal from "../components/create-recurring-option-modal"
import ConvertToRecurringModal from "../components/convert-to-recurring-modal"
import RecurringFrequencyModal from "../components/recurring-frequency-modal"

import EstimateModal from "../components/estimate-modal"
import EstimatePreviewModal from "../components/estimate-preview-modal"
import SendInvoiceModal from "../components/send-invoice-modal"
import DiscountModal from "../components/discount-modal"
import PaymentMethodModal from "../components/payment-method-modal"
import CreateCustomPaymentMethodModal from "../components/create-custom-payment-method-modal"

import CreateServiceModal from "../components/create-service-modal"
import SimpleCreateServiceModal from "../components/simple-create-service-modal"
import ServiceModal from "../components/service-modal"
import ServiceSelectionModal from "../components/service-selection-modal"
import ServiceTemplatesModal from "../components/service-templates-modal"
import ModifierModal from "../components/modifier-modal"
import CreateModifierGroupModal from "../components/create-modifier-group-modal"
import IntakeQuestionModal from "../components/intake-question-modal"

import AddTeamMemberModal from "../components/add-team-member-modal"
import CreateSkillTagModal from "../components/create-skill-tag-modal"
import TimeslotTemplateModal from "../components/timeslot-template-modal"
import UpdateAvailabilityModal from "../components/update-availability-modal"

import CreateTerritoryModal from "../components/create-territory-modal"
import TerritorySelectionModal from "../components/territory-selection-modal"
import TerritoryAdjustmentModal from "../components/territory-adjustment-modal"
import TerritoryTeamMembersModal from "../components/territory-team-members-modal"

import BusinessDetailsModal from "../components/business-details-modal"
import PlanSelectionModal from "../components/plan-selection-modal"

import ExportJobsModal from "../components/export-jobs-modal"
import ExportCustomersModal from "../components/export-customers-modal"
import ImportCustomersModal from "../components/import-customers-modal"

// ─── Mock data ────────────────────────────────────────────────────────────────
const MOCK_USER = { id: "demo-user-1", name: "Demo User", email: "demo@example.com" }

const MOCK_JOB = {
  _id: "demo-job-1",
  title: "House Deep Cleaning",
  status: "scheduled",
  date: new Date().toISOString(),
  customer: { name: "Jane Smith", email: "jane@example.com", phone: "555-1234" },
  address: "123 Main St, Springfield, IL 62701",
  services: [{ name: "Deep Clean", price: 120 }],
  price: 150,
  notes: "Client prefers eco-friendly products.",
  duration: 2,
  teamMembers: [],
  frequency: "weekly",
}

const MOCK_CUSTOMER = {
  _id: "demo-customer-1",
  name: "Jane Smith",
  email: "jane@example.com",
  phone: "555-1234",
  address: "123 Main St, Springfield, IL 62701",
}

const MOCK_LEAD = {
  _id: "demo-lead-1",
  name: "Bob Johnson",
  email: "bob@example.com",
  phone: "555-9012",
  service: "Office Cleaning",
  notes: "Needs weekly cleaning for a 2000 sqft office.",
  createdAt: new Date().toISOString(),
}

const MOCK_INVOICE = {
  _id: "demo-invoice-1",
  invoiceNumber: "INV-001",
  customer: { name: "Jane Smith", email: "jane@example.com" },
  total: 150,
  status: "pending",
}

const MOCK_ESTIMATE = {
  _id: "demo-estimate-1",
  estimateNumber: "EST-001",
  customer: { name: "Jane Smith", email: "jane@example.com" },
  services: [{ name: "Deep Clean", price: 120 }],
  subtotal: 120,
  total: 132,
  status: "draft",
  notes: "First-time customer discount applied.",
  expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
}

const noop = () => {}

// ─── Popup config map ─────────────────────────────────────────────────────────
// Each entry: { label, category, desc, render(isOpen, onClose) }
const POPUP_CONFIG = {
  // Jobs & Scheduling
  "edit-job": {
    label: "Edit Job",
    category: "jobs",
    desc: "Edit core job information such as title, status, address, date, and notes.",
    render: (isOpen, onClose) => (
      <EditJobModal isOpen={isOpen} onClose={onClose} job={MOCK_JOB} onSave={noop} />
    ),
  },
  "edit-job-details": {
    label: "Edit Job Details",
    category: "jobs",
    desc: "Edit specific job detail fields: duration, team size required, or skill level.",
    render: (isOpen, onClose) => (
      <EditJobDetailsModal
        isOpen={isOpen}
        onClose={onClose}
        onSave={noop}
        type="duration"
        currentValue={2}
        title="Duration (hours)"
        icon={Briefcase}
      />
    ),
  },
  "duplicate-job": {
    label: "Duplicate Job",
    category: "jobs",
    desc: "Create an exact copy of an existing job with one click.",
    render: (isOpen, onClose) => (
      <DuplicateJobModal isOpen={isOpen} onClose={onClose} job={MOCK_JOB} onDuplicate={noop} />
    ),
  },
  "assign-job": {
    label: "Assign Job",
    category: "jobs",
    desc: "Search and assign available team members to a job, with availability info.",
    render: (isOpen, onClose) => (
      <AssignJobModal isOpen={isOpen} onClose={onClose} job={MOCK_JOB} onAssign={noop} />
    ),
  },
  "job-template": {
    label: "Job Template",
    category: "jobs",
    desc: "Save or edit a reusable job template with pre-filled services and details.",
    render: (isOpen, onClose) => (
      <JobTemplateModal
        isOpen={isOpen}
        onClose={onClose}
        onSave={noop}
        editingTemplate={null}
        userId={MOCK_USER.id}
      />
    ),
  },
  "scheduling-booking": {
    label: "Scheduling & Booking",
    category: "jobs",
    desc: "Book a new scheduling appointment through the scheduling wizard.",
    render: (isOpen, onClose) => (
      <SchedulingBookingModal isOpen={isOpen} onClose={onClose} />
    ),
  },
  "create-recurring-option": {
    label: "Create Recurring Option",
    category: "jobs",
    desc: "Define a new recurring service option (daily, weekly, monthly, etc.).",
    render: (isOpen, onClose) => (
      <CreateRecurringOptionModal isOpen={isOpen} onClose={onClose} onSave={noop} />
    ),
  },
  "convert-to-recurring": {
    label: "Convert to Recurring",
    category: "jobs",
    desc: "Convert a one-time job into a recurring series with custom frequency.",
    render: (isOpen, onClose) => (
      <ConvertToRecurringModal
        isOpen={isOpen}
        onClose={onClose}
        job={MOCK_JOB}
        onConvert={noop}
        mode="convert"
      />
    ),
  },
  "recurring-frequency": {
    label: "Recurring Frequency",
    category: "jobs",
    desc: "Configure the frequency settings for a recurring job.",
    render: (isOpen, onClose) => (
      <RecurringFrequencyModal
        isOpen={isOpen}
        onClose={onClose}
        onSave={noop}
        currentFrequency="weekly"
        scheduledDate={new Date().toISOString()}
      />
    ),
  },

  // Customers & Leads
  customer: {
    label: "Customer",
    category: "customers",
    desc: "Add a new customer or edit an existing customer's contact and address details.",
    render: (isOpen, onClose) => (
      <CustomerModal
        isOpen={isOpen}
        onClose={onClose}
        onSave={noop}
        customer={MOCK_CUSTOMER}
        isEditing={true}
      />
    ),
  },
  "convert-lead": {
    label: "Convert Lead",
    category: "customers",
    desc: "Convert a lead into a full customer record, optionally creating a job.",
    render: (isOpen, onClose) => (
      <ConvertLeadModal isOpen={isOpen} onClose={onClose} lead={MOCK_LEAD} onConvert={noop} />
    ),
  },
  "service-address": {
    label: "Service Address",
    category: "customers",
    desc: "Add or update a service address with autocomplete search.",
    render: (isOpen, onClose) => (
      <ServiceAddressModal
        isOpen={isOpen}
        onClose={onClose}
        onSave={noop}
        currentAddress={null}
      />
    ),
  },
  "create-task": {
    label: "Create Task",
    category: "customers",
    desc: "Create a follow-up task assigned to a team member for a lead.",
    render: (isOpen, onClose) => (
      <CreateTaskModal
        isOpen={isOpen}
        onClose={onClose}
        onSubmit={noop}
        leadId="demo-lead-1"
        teamMembers={[]}
        leads={[MOCK_LEAD]}
        isEditing={false}
      />
    ),
  },

  // Finance
  estimate: {
    label: "Estimate",
    category: "finance",
    desc: "Create or edit a customer estimate with services, discounts, and taxes.",
    render: (isOpen, onClose) => (
      <EstimateModal
        isOpen={isOpen}
        onClose={onClose}
        onSave={noop}
        editingEstimate={null}
        userId={MOCK_USER.id}
      />
    ),
  },
  "estimate-preview": {
    label: "Estimate Preview",
    category: "finance",
    desc: "Preview a formatted estimate before sending it to the customer.",
    render: (isOpen, onClose) => (
      <EstimatePreviewModal
        isOpen={isOpen}
        onClose={onClose}
        estimate={MOCK_ESTIMATE}
        onSend={noop}
        onConvertToInvoice={noop}
      />
    ),
  },
  "send-invoice": {
    label: "Send Invoice",
    category: "finance",
    desc: "Send an invoice to a customer via email with a payment link.",
    render: (isOpen, onClose) => (
      <SendInvoiceModal
        isOpen={isOpen}
        onClose={onClose}
        invoice={MOCK_INVOICE}
        onSuccess={noop}
      />
    ),
  },
  discount: {
    label: "Discount",
    category: "finance",
    desc: "Apply a fixed amount or percentage discount to a job or invoice.",
    render: (isOpen, onClose) => (
      <DiscountModal
        isOpen={isOpen}
        onClose={onClose}
        onSave={noop}
        currentDiscount={0}
        currentDiscountType="fixed"
      />
    ),
  },
  "payment-method": {
    label: "Payment Method",
    category: "finance",
    desc: "Select or update the payment method for a job (cash, card, etc.).",
    render: (isOpen, onClose) => (
      <PaymentMethodModal
        isOpen={isOpen}
        onClose={onClose}
        onSave={noop}
        currentMethod="cash"
      />
    ),
  },
  "create-custom-payment-method": {
    label: "Custom Payment Method",
    category: "finance",
    desc: "Create a new custom payment method for your business.",
    render: (isOpen, onClose) => (
      <CreateCustomPaymentMethodModal
        isOpen={isOpen}
        onClose={onClose}
        onSave={noop}
        editingMethod={null}
      />
    ),
  },

  // Services
  "create-service": {
    label: "Create Service",
    category: "services",
    desc: "Multi-step wizard to create a new service offering with pricing and modifiers.",
    render: (isOpen, onClose) => (
      <CreateServiceModal
        isOpen={isOpen}
        onClose={onClose}
        onServiceCreated={noop}
        user={MOCK_USER}
      />
    ),
  },
  "simple-create-service": {
    label: "Simple Create Service",
    category: "services",
    desc: "Quick-choice modal: start from scratch or use an existing template.",
    render: (isOpen, onClose) => (
      <SimpleCreateServiceModal
        isOpen={isOpen}
        onClose={onClose}
        onCreateService={noop}
        onStartWithTemplate={noop}
      />
    ),
  },
  service: {
    label: "Service",
    category: "services",
    desc: "Add or edit a service directly with name, price, and duration.",
    render: (isOpen, onClose) => (
      <ServiceModal isOpen={isOpen} onClose={onClose} onSave={noop} />
    ),
  },
  "service-selection": {
    label: "Service Selection",
    category: "services",
    desc: "Browse categories and select services for a job, with modifier customisation.",
    render: (isOpen, onClose) => (
      <ServiceSelectionModal
        isOpen={isOpen}
        onClose={onClose}
        onServiceSelect={noop}
        selectedServices={[]}
        user={MOCK_USER}
      />
    ),
  },
  "service-templates": {
    label: "Service Templates",
    category: "services",
    desc: "Browse pre-built service templates to quickly create standard services.",
    render: (isOpen, onClose) => (
      <ServiceTemplatesModal isOpen={isOpen} onClose={onClose} onSelectTemplate={noop} />
    ),
  },
  modifier: {
    label: "Modifier",
    category: "services",
    desc: "Add or edit a service modifier option (e.g. add-on, upgrade).",
    render: (isOpen, onClose) => (
      <ModifierModal isOpen={isOpen} onClose={onClose} editingModifier={null} onSave={noop} />
    ),
  },
  "create-modifier-group": {
    label: "Create Modifier Group",
    category: "services",
    desc: "Create a named group of modifier options customers choose from.",
    render: (isOpen, onClose) => (
      <CreateModifierGroupModal
        isOpen={isOpen}
        onClose={onClose}
        onSave={noop}
        editingModifier={null}
      />
    ),
  },
  "intake-question": {
    label: "Intake Question",
    category: "services",
    desc: "Create a custom intake question shown to customers during booking.",
    render: (isOpen, onClose) => (
      <IntakeQuestionModal
        isOpen={isOpen}
        onClose={onClose}
        selectedQuestionType="text"
        onSave={noop}
        editingQuestion={null}
      />
    ),
  },

  // Team
  "add-team-member": {
    label: "Add Team Member",
    category: "team",
    desc: "Invite or add a new team member with role, pay rate, and territory details.",
    render: (isOpen, onClose) => (
      <AddTeamMemberModal
        isOpen={isOpen}
        onClose={onClose}
        onSuccess={noop}
        userId={MOCK_USER.id}
        member={null}
        isEditing={false}
      />
    ),
  },
  "create-skill-tag": {
    label: "Create Skill Tag",
    category: "team",
    desc: "Create a skill tag that can be assigned to team members.",
    render: (isOpen, onClose) => (
      <CreateSkillTagModal isOpen={isOpen} onClose={onClose} onSave={noop} />
    ),
  },
  "timeslot-template": {
    label: "Timeslot Template",
    category: "team",
    desc: "Create or edit a reusable availability timeslot template.",
    render: (isOpen, onClose) => (
      <TimeslotTemplateModal
        isOpen={isOpen}
        onClose={onClose}
        onSave={noop}
        existingTemplate={null}
      />
    ),
  },
  "update-availability": {
    label: "Update Availability",
    category: "team",
    desc: "Update a team member's availability for specific dates.",
    render: (isOpen, onClose) => (
      <UpdateAvailabilityModal
        isOpen={isOpen}
        onClose={onClose}
        onSave={noop}
        teamMemberName="Alex Johnson"
        selectedDates={[]}
        availability={[]}
      />
    ),
  },

  // Territories
  "create-territory": {
    label: "Create Territory",
    category: "territories",
    desc: "Define a new service territory with location, pricing, and schedule settings.",
    render: (isOpen, onClose) => (
      <CreateTerritoryModal
        isOpen={isOpen}
        onClose={onClose}
        onSuccess={noop}
        territory={null}
        isEditing={false}
        userId={MOCK_USER.id}
      />
    ),
  },
  "territory-selection": {
    label: "Territory Selection",
    category: "territories",
    desc: "Choose a territory from the list for a job or team member assignment.",
    render: (isOpen, onClose) => (
      <TerritorySelectionModal
        isOpen={isOpen}
        onClose={onClose}
        onSelect={noop}
        territories={[]}
        user={MOCK_USER}
      />
    ),
  },
  "territory-adjustment": {
    label: "Territory Adjustment",
    category: "territories",
    desc: "Adjust territory-level pricing overrides and scheduling rules.",
    render: (isOpen, onClose) => (
      <TerritoryAdjustmentModal isOpen={isOpen} onClose={onClose} onSave={noop} />
    ),
  },
  "territory-team-members": {
    label: "Territory Team Members",
    category: "territories",
    desc: "Manage which team members are assigned to a specific territory.",
    render: (isOpen, onClose) => (
      <TerritoryTeamMembersModal
        isOpen={isOpen}
        onClose={onClose}
        onSuccess={noop}
        territoryId="demo-territory-1"
        userId={MOCK_USER.id}
        currentTeamMembers={[]}
      />
    ),
  },

  // Business & Plans
  "business-details": {
    label: "Business Details",
    category: "business",
    desc: "View and edit your business name, logo, contact info, and settings.",
    render: (isOpen, onClose) => (
      <BusinessDetailsModal isOpen={isOpen} onClose={onClose} />
    ),
  },
  "plan-selection": {
    label: "Plan Selection",
    category: "business",
    desc: "Browse and select a subscription plan for your ServiceFlow account.",
    render: (isOpen, onClose) => (
      <PlanSelectionModal isOpen={isOpen} onClose={onClose} onPlanSelect={noop} />
    ),
  },

  // Import & Export
  "export-jobs": {
    label: "Export Jobs",
    category: "import-export",
    desc: "Export filtered job records to a CSV or Excel file.",
    render: (isOpen, onClose) => (
      <ExportJobsModal isOpen={isOpen} onClose={onClose} initialFilters={{}} />
    ),
  },
  "export-customers": {
    label: "Export Customers",
    category: "import-export",
    desc: "Export customer records to a CSV or Excel file.",
    render: (isOpen, onClose) => (
      <ExportCustomersModal isOpen={isOpen} onClose={onClose} />
    ),
  },
  "import-customers": {
    label: "Import Customers",
    category: "import-export",
    desc: "Import customers from a CSV file with column mapping.",
    render: (isOpen, onClose) => (
      <ImportCustomersModal isOpen={isOpen} onClose={onClose} onImportSuccess={noop} />
    ),
  },
}

// ─── Sidebar nav config (mirrors demo-hub categories + ids) ───────────────────
const SIDEBAR_CATEGORIES = [
  {
    id: "jobs",
    label: "Jobs & Scheduling",
    icon: Briefcase,
    color: "text-blue-600",
    ids: [
      "edit-job", "edit-job-details", "duplicate-job", "assign-job",
      "job-template", "scheduling-booking", "create-recurring-option",
      "convert-to-recurring", "recurring-frequency",
    ],
  },
  {
    id: "customers",
    label: "Customers & Leads",
    icon: Users,
    color: "text-green-600",
    ids: ["customer", "convert-lead", "service-address", "create-task"],
  },
  {
    id: "finance",
    label: "Finance",
    icon: DollarSign,
    color: "text-yellow-600",
    ids: [
      "estimate", "estimate-preview", "send-invoice",
      "discount", "payment-method", "create-custom-payment-method",
    ],
  },
  {
    id: "services",
    label: "Services",
    icon: Wrench,
    color: "text-purple-600",
    ids: [
      "create-service", "simple-create-service", "service", "service-selection",
      "service-templates", "modifier", "create-modifier-group", "intake-question",
    ],
  },
  {
    id: "team",
    label: "Team",
    icon: UserCheck,
    color: "text-pink-600",
    ids: ["add-team-member", "create-skill-tag", "timeslot-template", "update-availability"],
  },
  {
    id: "territories",
    label: "Territories",
    icon: Map,
    color: "text-orange-600",
    ids: [
      "create-territory", "territory-selection",
      "territory-adjustment", "territory-team-members",
    ],
  },
  {
    id: "business",
    label: "Business & Plans",
    icon: Building2,
    color: "text-indigo-600",
    ids: ["business-details", "plan-selection"],
  },
  {
    id: "import-export",
    label: "Import & Export",
    icon: Upload,
    color: "text-teal-600",
    ids: ["export-jobs", "export-customers", "import-customers"],
  },
]

// Flat ordered list of all popup ids for prev/next navigation
const ALL_IDS = SIDEBAR_CATEGORIES.flatMap((c) => c.ids)

// ─── Main component ───────────────────────────────────────────────────────────
const DemoPopup = () => {
  const { popupId } = useParams()
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const config = POPUP_CONFIG[popupId]
  const currentIndex = ALL_IDS.indexOf(popupId)
  const prevId = currentIndex > 0 ? ALL_IDS[currentIndex - 1] : null
  const nextId = currentIndex < ALL_IDS.length - 1 ? ALL_IDS[currentIndex + 1] : null

  const handleClose = () => setIsOpen(false)

  if (!config) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 text-sm mb-4">Modal not found: <code className="font-mono">{popupId}</code></p>
          <Link to="/demo" className="text-sm text-blue-600 hover:underline">
            Back to Demo Hub
          </Link>
        </div>
      </div>
    )
  }

  // Find current category
  const currentCategory = SIDEBAR_CATEGORIES.find((c) => c.ids.includes(popupId))

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* ── Sidebar ──────────────────────────────────────────────── */}
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 z-30
          flex flex-col overflow-hidden
          transition-transform duration-200
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0 lg:static lg:flex
        `}
      >
        {/* Sidebar header */}
        <div className="px-4 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <Link
            to="/demo"
            className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            <Home className="w-4 h-4" />
            Demo Hub
          </Link>
          <span className="text-xs text-gray-400">{ALL_IDS.length} modals</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3">
          {SIDEBAR_CATEGORIES.map((cat) => {
            const Icon = cat.icon
            return (
              <div key={cat.id} className="mb-1">
                <div className="flex items-center gap-1.5 px-4 py-1.5">
                  <Icon className={`w-3.5 h-3.5 ${cat.color}`} />
                  <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    {cat.label}
                  </span>
                </div>
                {cat.ids.map((id) => {
                  const pc = POPUP_CONFIG[id]
                  return (
                    <Link
                      key={id}
                      to={`/demo/popup/${id}`}
                      onClick={() => setSidebarOpen(false)}
                      className={`
                        block px-4 py-1.5 text-sm transition-colors
                        ${id === popupId
                          ? "bg-gray-100 text-gray-900 font-medium"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                        }
                      `}
                    >
                      {pc?.label ?? id}
                    </Link>
                  )
                })}
              </div>
            )
          })}
        </nav>
      </aside>

      {/* ── Main content ─────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            {/* Mobile sidebar toggle */}
            <button
              className="lg:hidden p-1.5 rounded-md hover:bg-gray-100"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Breadcrumb */}
            <nav className="flex items-center gap-1.5 text-sm">
              <Link to="/demo" className="text-gray-400 hover:text-gray-600">Demo</Link>
              <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
              {currentCategory && (
                <>
                  <span className="text-gray-400">{currentCategory.label}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                </>
              )}
              <span className="text-gray-900 font-medium">{config.label}</span>
            </nav>
          </div>

          {/* Prev / Next */}
          <div className="flex items-center gap-2">
            <button
              disabled={!prevId}
              onClick={() => prevId && navigate(`/demo/popup/${prevId}`)}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Prev
            </button>
            <span className="text-xs text-gray-400 font-mono tabular-nums">
              {currentIndex + 1} / {ALL_IDS.length}
            </span>
            <button
              disabled={!nextId}
              onClick={() => nextId && navigate(`/demo/popup/${nextId}`)}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* Body */}
        <main className="flex-1 px-6 py-10 flex flex-col items-center justify-center">
          <div className="w-full max-w-lg">
            {/* Card */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              {/* Card header */}
              <div className="px-6 py-5 border-b border-gray-100">
                <h1 className="text-lg font-semibold text-gray-900">{config.label}</h1>
                <p className="text-sm text-gray-500 mt-1">{config.desc}</p>
              </div>

              {/* Card body */}
              <div className="px-6 py-6 flex flex-col items-center gap-4">
                {/* Route badge */}
                <div className="w-full flex items-center gap-2 bg-gray-50 rounded-lg px-4 py-3">
                  <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <code className="text-xs text-gray-600 font-mono break-all">
                    /demo/popup/{popupId}
                  </code>
                </div>

                {/* Launch button */}
                <button
                  onClick={() => setIsOpen(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <Play className="w-4 h-4" />
                  Open Modal
                </button>
              </div>
            </div>

            {/* Navigation shortcuts */}
            <div className="mt-6 flex items-center justify-between text-xs text-gray-400">
              {prevId ? (
                <Link
                  to={`/demo/popup/${prevId}`}
                  className="flex items-center gap-1 hover:text-gray-600"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  {POPUP_CONFIG[prevId]?.label}
                </Link>
              ) : (
                <span />
              )}
              {nextId ? (
                <Link
                  to={`/demo/popup/${nextId}`}
                  className="flex items-center gap-1 hover:text-gray-600"
                >
                  {POPUP_CONFIG[nextId]?.label}
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              ) : (
                <span />
              )}
            </div>
          </div>
        </main>
      </div>

      {/* ── Render the actual modal ───────────────────────────────── */}
      {config.render(isOpen, handleClose)}
    </div>
  )
}

export default DemoPopup

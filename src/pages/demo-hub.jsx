import { Link } from "react-router-dom"
import {
  Briefcase, Users, DollarSign, Wrench, UserCheck,
  Map, Building2, Upload, ChevronRight, Layers
} from "lucide-react"

const CATEGORIES = [
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

const DemoHub = () => {
  const totalPopups = CATEGORIES.reduce((sum, c) => sum + c.popups.length, 0)

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
              <h1 className="text-xl font-semibold text-gray-900">Component Demo</h1>
              <p className="text-sm text-gray-500">{totalPopups} modals across {CATEGORIES.length} categories</p>
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

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-10">
        {CATEGORIES.map((category) => {
          const Icon = category.icon
          return (
            <section key={category.id}>
              {/* Category header */}
              <div className="flex items-center gap-2 mb-4">
                <div className={`w-7 h-7 rounded-md flex items-center justify-center ${category.headerColor}`}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-base font-semibold text-gray-900">{category.label}</h2>
                <span className="text-xs text-gray-400 font-medium ml-1">
                  {category.popups.length} modals
                </span>
              </div>

              {/* Modal cards grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {category.popups.map((popup) => (
                  <Link
                    key={popup.id}
                    to={`/demo/popup/${popup.id}`}
                    className={`group flex flex-col justify-between border rounded-lg p-4 hover:shadow-sm transition-all duration-150 ${category.color} hover:border-opacity-60`}
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900 group-hover:text-gray-700">
                        {popup.label}
                      </p>
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
  )
}

export { CATEGORIES }
export default DemoHub

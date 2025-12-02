"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import Sidebar from "../components/sidebar"
import MobileHeader from "../components/mobile-header"
import BusinessDetailsModal from "../components/business-details-modal"
import SchedulingBookingModal from "../components/scheduling-booking-modal"
import { useAuth } from "../context/AuthContext"
import { getUserRole, isWorker, canEditAccountOwnerSettings } from "../utils/roleUtils"
import {
  Building2,
  Palette,
  Calendar,
  CalendarCheck,
  CalendarX,
  MapPin,
  Users,
  MessageSquare,
  Bell,
  Star,
  CreditCard,
  Calculator,
  CalendarDays,
  Code,
  Smartphone,
  ChevronRight,
  Settings,
} from "lucide-react"

const ServiceFlowSettings = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [businessDetailsOpen, setBusinessDetailsOpen] = useState(false)
  const [schedulingBookingOpen, setSchedulingBookingOpen] = useState(false)
  const navigate = useNavigate()
  const { user } = useAuth()

  // Redirect team members to their profile editing page
  useEffect(() => {
    if (user && user.teamMemberId) {
      navigate(`/settings/account`)
    }
  }, [user, navigate])

  const handleSettingClick = (settingId) => {
    switch (settingId) {
      case "business-details":
        setBusinessDetailsOpen(true)
        break
      case "branding":
        navigate("/settings/branding")
        break
      case "availability":
        navigate("/settings/availability")
        break
      case "scheduling-policies":
        setSchedulingBookingOpen(true)
        break
      case "rescheduling-cancellation":
        navigate("/settings/rescheduling-cancellation")
        break
      case "service-areas":
        navigate("/settings/service-areas")
        break
      case "booking-quote-requests":
        navigate("/settings/booking-quote-requests")
        break
      case "job-assignment":
        navigate("/settings/job-assignment")
        break
      case "client-team-notifications":
        navigate("/settings/client-team-notifications")
        break
      case "sms-settings":
        navigate("/settings/sms-settings")
        break
      case "feedback-reviews":
        navigate("/settings/feedback-reviews")
        break
      case "payments":
        navigate("/settings/payments")
        break
      case "taxes-fees":
        navigate("/settings/taxes-fees")
        break
      case "calendar-syncing":
        navigate("/settings/calendar-syncing")
        break
      case "developers":
        navigate("/settings/developers")
        break
      case "field-app":
        navigate("/settings/field-app")
        break
      case "services":
        navigate("/services")
        break
      default:
        console.log(`Navigate to ${settingId}`)
    }
  }

  const settingsSections = [
    {
      title: "Business",
      items: [
        {
          id: "business-details",
          icon: Building2,
          title: "Business Details",
          description: "View and update your business details",
        },
        {
          id: "branding",
          icon: Palette,
          title: "Branding",
          description: "Customize your branding for emails, invoices, and your rescheduling page",
        },
        {
          id: "services",
          icon: Settings,
          title: "Services",
          description: "Configure default service settings and manage service categories",
        },
      ],
    },
    {
      title: "Scheduling & Booking",
      items: [
        {
          id: "availability",
          icon: Calendar,
          title: "Availability",
          description: "Set hours of operation and add unexpected schedule changes",
        },
        {
          id: "scheduling-policies",
          icon: CalendarCheck,
          title: "Scheduling Policies",
          description: "Customize scheduling rules and how availability is determined",
        },
        {
          id: "rescheduling-cancellation",
          icon: CalendarX,
          title: "Rescheduling & Cancellation",
          description: "Allow your customers to reschedule and cancel online",
        },
        {
          id: "service-areas",
          icon: MapPin,
          title: "Service Areas",
          description: "Customize the geographic areas you service",
        },
        {
          id: "booking-quote-requests",
          icon: MessageSquare,
          title: "Booking & Quote Requests",
          description: "Configure how customers submit booking and quote requests for your services",
        },
        {
          id: "job-assignment",
          icon: Users,
          title: "Job Assignment",
          description: "Configure job assignment and dispatch options for your service providers",
        },
      ],
    },
    {
      title: "Communications",
      items: [
        {
          id: "client-team-notifications",
          icon: Bell,
          title: "Client & Team Notifications",
          description: "Edit the emails and text messages that are sent to clients and team members",
        },
        {
          id: "sms-settings",
          icon: MessageSquare,
          title: "SMS Settings",
          description: "Configure Twilio SMS integration for customer notifications",
        },
        {
          id: "feedback-reviews",
          icon: Star,
          title: "Feedback & Reviews",
          description: "Collect feedback from customers and invite them to leave reviews",
        },
      ],
    },
    {
      title: "Invoicing & Payments",
      items: [
        {
          id: "payments",
          icon: CreditCard,
          title: "Payments",
          description: "Configure credit card capture when customers book online and enable tips",
        },
        {
          id: "taxes-fees",
          icon: Calculator,
          title: "Taxes & Fees",
          description: "Manage tax rates, fees, and adjustment rules for your services",
        },
      ],
    },
    {
      title: "Integrations & Advanced",
      items: [
        {
          id: "calendar-syncing",
          icon: CalendarDays,
          title: "Calendar Syncing",
          description: "Sync your Serviceflow schedule to external calendar apps",
        },
        {
          id: "developers",
          icon: Code,
          title: "Developers",
          description: "Manage webhooks and API credentials",
        },
        {
          id: "field-app",
          icon: Smartphone,
          title: "Field App",
          description: "Customize your mobile web app for service providers",
        },
      ],
    },
  ]

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Main Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0 lg:mx-44 xl:mx-48">
        {/* Mobile Header */}
        <MobileHeader onMenuClick={() => setSidebarOpen(true)} />

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">Settings</h1>

            {/* User Profile Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div 
                onClick={() => navigate("/settings/account")}
                className="bg-blue-50 rounded-lg p-4 flex items-center justify-between cursor-pointer hover:bg-blue-100 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-medium text-sm">
                      {user?.firstName?.charAt(0) || user?.email?.charAt(0) || 'U'}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {user?.firstName && user?.lastName 
                        ? `${user.firstName} ${user.lastName}`
                        : user?.firstName || user?.email || 'User'}
                    </h3>
                    <p className="text-sm text-gray-600">Manage your Serviceflow user account</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>

              {canEditAccountOwnerSettings(user) && (
                <div 
                  onClick={() => navigate("/settings/billing")}
                  className="bg-gray-50 rounded-lg p-4 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors"
                >
                  <div>
                    <h3 className="font-medium text-gray-900">Billing</h3>
                    <p className="text-sm text-gray-600">Manage your Serviceflow plan and billing information</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              )}
            </div>

            {/* Settings Sections */}
            <div className="space-y-8">
              {settingsSections.map((section, sectionIndex) => (
                <div key={sectionIndex}>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">{section.title}</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {section.items.map((item, itemIndex) => {
                      const Icon = item.icon
                      return (
                        <div
                          key={itemIndex}
                          onClick={() => handleSettingClick(item.id)}
                          className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
                        >
                          <div className="flex items-start space-x-3">
                            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Icon className="w-5 h-5 text-gray-600" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-medium text-gray-900 mb-1">{item.title}</h3>
                              <p className="text-sm text-gray-600">{item.description}</p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>

      {/* Modals */}
      <BusinessDetailsModal isOpen={businessDetailsOpen} onClose={() => setBusinessDetailsOpen(false)} />
      <SchedulingBookingModal isOpen={schedulingBookingOpen} onClose={() => setSchedulingBookingOpen(false)} />
      </div>
    </div>
  )
}

export default ServiceFlowSettings

"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import Sidebar from "../../components/sidebar"
import MobileHeader from "../../components/mobile-header"
import { ChevronLeft, ChevronRight } from "lucide-react"

const ClientTeamNotifications = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navigate = useNavigate()

  const customerNotifications = [
    {
      title: "Appointment Confirmation",
      description: "Sent automatically to the customer after a job is scheduled.",
      types: ["SMS", "Email"],
    },
    {
      title: "Appointment Rescheduled",
      description:
        "Sent if a customer reschedules their job. Can also be sent when a job is rescheduled from the Serviceflow admin.",
      types: ["SMS", "Email"],
    },
    {
      title: "Appointment Reminder",
      description:
        "Sent automatically to the customer to remind them of their upcoming appointment. You can edit how far in advance the notification is sent.",
      types: ["SMS", "Email"],
    },
    {
      title: "Job Follow-up",
      description: "Sent to customers after a job is marked as complete, prompting them to rate their service.",
      types: ["SMS", "Email"],
    },
    {
      title: "Appointment Cancelled",
      description:
        "Sent if a customer cancels their job. Can also be sent when a job is cancelled from the Serviceflow admin.",
      types: ["SMS", "Email"],
    },
    {
      title: "Enroute",
      description: "Notify your customer with an ETA when you or an employee is on the way.",
      types: ["SMS"],
    },
    {
      title: "Payment Receipt",
      description:
        "Sent to customer when they pay an invoice online. Can also be sent when a job is paid, and you select the send receipt option.",
      types: ["Email"],
    },
  ]

  const teamNotifications = [
    {
      title: "Assigned Job Cancelled",
      description: "Sent to a job's assigned provider(s) if the job has been cancelled.",
      types: ["SMS"],
    },
    {
      title: "Assigned Job Rescheduled",
      description: "Sent to a job's assigned provider(s) if the job has been rescheduled.",
      types: ["SMS"],
    },
    {
      title: "Team Member Invite",
      description: "Sent to newly added team members with account activation instructions.",
      types: ["SMS", "Email"],
    },
    {
      title: "Recurring Assignment",
      description: "Sent to service providers when they are assigned to a recurring booking.",
      types: ["SMS", "Email"],
    },
  ]

  const getNotificationRoute = (title) => {
    const routes = {
      // Customer Notifications
      "Appointment Confirmation": "/settings/client-team-notifications/appointment-confirmation",
      "Appointment Rescheduled": "/settings/client-team-notifications/appointment-rescheduled",
      "Appointment Reminder": "/settings/client-team-notifications/appointment-reminder",
      "Job Follow-up": "/settings/client-team-notifications/job-follow-up",
      "Appointment Cancelled": "/settings/client-team-notifications/appointment-cancelled",
      "Enroute": "/settings/client-team-notifications/enroute",
      "Payment Receipt": "/settings/client-team-notifications/payment-receipt",
      // Team Notifications
      "Assigned Job Cancelled": "/settings/client-team-notifications/assigned-job-cancelled",
      "Assigned Job Rescheduled": "/settings/client-team-notifications/assigned-job-rescheduled",
      "Team Member Invite": "/settings/client-team-notifications/team-member-invite",
      "Recurring Assignment": "/settings/client-team-notifications/recurring-assignment"
    }
    return routes[title] || null
  }

  const NotificationRow = ({ notification, isTeam = false }) => {
    const route = getNotificationRoute(notification.title)
    
    const content = (
      <div className="flex items-center justify-between py-4 border-b border-gray-100 last:border-b-0">
        <div className="flex-1">
          <h4 className="font-medium text-gray-900">{notification.title}</h4>
          <p className="text-sm text-gray-600 mt-1">{notification.description}</p>
        </div>
        <div className="flex items-center space-x-4 ml-4">
          {notification.types.map((type) => (
            <div key={type} className="flex items-center space-x-1">
              <span
                className={`w-2 h-2 rounded-full ${
                  type === "SMS" ? "bg-green-500" : type === "Email" ? "bg-blue-500" : "bg-purple-500"
                }`}
              ></span>
              <span className="text-xs text-gray-600">{type}</span>
            </div>
          ))}
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </div>
      </div>
    )

    if (route) {
      return (
        <button
          onClick={() => navigate(route)}
          className="w-full text-left hover:bg-gray-50 transition-colors"
        >
          {content}
        </button>
      )
    }

    return content
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 lg:ml-64 xl:ml-72">
        <MobileHeader onMenuClick={() => setSidebarOpen(true)} />

        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate("/settings")}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm">Settings</span>
            </button>
            <h1 className="text-2xl font-semibold text-gray-900">Client & Team Notifications</h1>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-6xl mx-auto p-6 space-y-8">
            {/* Customer Notifications */}
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Customer Notifications</h2>
                <p className="text-gray-600">
                  These notifications are sent out to the customer. Click on the notification template to edit the
                  content.
                </p>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100 px-6">
                {customerNotifications.map((notification, index) => (
                  <NotificationRow key={index} notification={notification} />
                ))}
              </div>
            </div>

            {/* Team Notifications */}
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Team Notifications</h2>
                <p className="text-gray-600">
                  These notifications are automatically sent out to team members. Click on the notification template to
                  edit the content.
                </p>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100 px-6">
                {teamNotifications.map((notification, index) => (
                  <NotificationRow key={index} notification={notification} isTeam />
                ))}
              </div>
            </div>

            {/* Notification Testing */}
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Notification Testing</h2>
                <p className="text-gray-600">
                  Test your email and SMS notifications to ensure they're working correctly. Send test messages to verify your notification setup.
                </p>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Test Notifications</h3>
                    <p className="text-gray-600 mt-1">
                      Send test emails and SMS messages to verify your notification configuration is working properly.
                    </p>
                  </div>
                  <button
                    onClick={() => navigate("/settings/client-team-notifications/notification-testing")}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center space-x-2"
                  >
                    <span>Test Notifications</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Custom Email Domain */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Custom Email Domain</h3>
              <p className="text-gray-600 mb-4">
                Customize the domain used when sending emails to customers and team members.{" "}
                <button className="text-blue-600 hover:text-blue-700">Learn about using custom email addresses</button>
              </p>

              <div className="flex items-center space-x-4">
                <div className="flex-1 max-w-md">
                  <div className="bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-600">
                    From: JustKen &lt;booking@justken.com&gt;
                  </div>
                  <div className="mt-2 text-xs text-gray-500">Subject</div>
                </div>
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
                  Add a Custom Address
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ClientTeamNotifications

"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import Sidebar from "../../components/sidebar"
import MobileHeader from "../../components/mobile-header"
import { ChevronLeft, ChevronDown } from "lucide-react"

const Switch = ({ checked, onChange }) => (
  <button
    onClick={onChange}
    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-2 ${
      checked ? "bg-primary-600" : "bg-gray-200"
    }`}
  >
    <span
      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
        checked ? "translate-x-5" : "translate-x-0"
      }`}
    />
  </button>
)

const ReschedulingCancellation = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navigate = useNavigate()
  const [settings, setSettings] = useState({
    onlineCancellationRescheduling: true,
    enforceAssignedProviderAvailability: true,
    recurringJobsLimit: 4,
  })

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
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
            <h1 className="text-2xl font-semibold text-gray-900">Rescheduling & Cancellation</h1>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-4xl mx-auto p-6 space-y-8">
            {/* Online Cancellation & Rescheduling */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Online Cancellation & Rescheduling</h3>
                  <p className="text-gray-600 mt-1">
                    Adds a link to your emails so customers can reschedule or cancel appointments on their own.
                  </p>
                </div>
                <Switch
                  checked={settings.onlineCancellationRescheduling}
                  onChange={() =>
                    setSettings({
                      ...settings,
                      onlineCancellationRescheduling: !settings.onlineCancellationRescheduling,
                    })
                  }
                />
              </div>

              <div className="mt-6">
                <h4 className="font-medium text-gray-900 mb-2">Reschedule/Cancellation Limit</h4>
                <p className="text-gray-600 text-sm mb-4">
                  How close to their appointment time can customers cancel/reschedule?
                </p>

                <div className="relative max-w-xs">
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-8 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none appearance-none">
                    <option>Customers can cancel or reschedule any time</option>
                    <option>24 hours before</option>
                    <option>48 hours before</option>
                    <option>1 week before</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Enforce Assigned Provider Availability */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Enforce Assigned Provider Availability</h3>
                  <p className="text-gray-600 mt-1">
                    Restrict rescheduling options to times when all assigned providers are available. This ensures that
                    clients continue with their assigned providers for service consistency.
                  </p>
                </div>
                <Switch
                  checked={settings.enforceAssignedProviderAvailability}
                  onChange={() =>
                    setSettings({
                      ...settings,
                      enforceAssignedProviderAvailability: !settings.enforceAssignedProviderAvailability,
                    })
                  }
                />
              </div>
            </div>

            {/* Recurring Bookings */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recurring Bookings</h3>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">
                  How many upcoming jobs in a recurring series should be automatically scheduled?
                </h4>
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <select
                      value={settings.recurringJobsLimit}
                      onChange={(e) =>
                        setSettings({ ...settings, recurringJobsLimit: Number.parseInt(e.target.value) })
                      }
                      className="border border-gray-300 rounded-lg px-3 py-2 pr-8 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none appearance-none"
                    >
                      <option value={4}>4 jobs</option>
                      <option value={2}>2 jobs</option>
                      <option value={6}>6 jobs</option>
                      <option value={8}>8 jobs</option>
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                  </div>
                  <p className="text-gray-600 text-sm">
                    Ex: a weekly recurring booking starting today would have 4 jobs automatically created. The 5th job
                    would be created in one week.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReschedulingCancellation

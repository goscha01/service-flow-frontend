"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import Sidebar from "../../components/sidebar"
import MobileHeader from "../../components/mobile-header"
import { ChevronLeft, Calendar, FileText } from "lucide-react"

const CalendarSyncing = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navigate = useNavigate()
  const [serviceProviderSync, setServiceProviderSync] = useState(false)

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
            <h1 className="text-2xl font-semibold text-gray-900">Calendar Syncing</h1>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-4xl mx-auto p-6 space-y-8">
            {/* Sync New Jobs to Your Calendar */}
            <div className="bg-white rounded-lg border border-gray-200 p-8">
              <div className="flex items-center space-x-2 mb-4">
                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded font-medium">BETA</span>
                <h2 className="text-xl font-semibold text-gray-900">Sync New Jobs to Your Calendar</h2>
              </div>
              <p className="text-gray-600 mb-6">
                Add your Zenbooker schedule to your Google Calendar, Outlook, or iCal...
              </p>

              <div className="flex items-center space-x-6 mb-6">
                {/* Calendar App Icons */}
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                  <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-lg">O</span>
                  </div>
                  <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center border">
                    <span className="text-gray-600 font-bold text-sm">17</span>
                    <span className="text-red-500 text-xs ml-1">Monday</span>
                  </div>
                </div>
              </div>

              <button className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 mb-4">
                Get Started
              </button>

              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <button className="text-blue-600 hover:text-blue-700 font-medium text-sm">
                  Learn more about calendar syncing
                </button>
              </div>
            </div>

            {/* Service Provider Calendar Sync */}
            <div className="bg-white rounded-lg border border-gray-200 p-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Service Provider Calendar Sync</h2>
                  <p className="text-gray-600 mt-2">
                    If enabled, allows your service providers to sync their assigned jobs to their Google Calendar,
                    Outlook, or iCal.
                  </p>
                </div>
                <button
                  onClick={() => setServiceProviderSync(!serviceProviderSync)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    serviceProviderSync ? "bg-blue-600" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      serviceProviderSync ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <button className="text-blue-600 hover:text-blue-700 font-medium text-sm">
                  How calendar syncing works for service providers
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CalendarSyncing

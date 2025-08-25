"use client"

import { useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import Sidebar from "../../components/sidebar"
import MobileHeader from "../../components/mobile-header"
import { ChevronLeft, HelpCircle, Calendar } from "lucide-react"

const LocationAvailability = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [viewMode, setViewMode] = useState("list")
  const navigate = useNavigate()
  const { location } = useParams()

  const weeklyHours = [
    { day: "Sunday", hours: "Closed" },
    { day: "Monday", hours: "9:00 AM - 6:00 PM" },
    { day: "Tuesday", hours: "9:00 AM - 6:00 PM" },
    { day: "Wednesday", hours: "9:00 AM - 6:00 PM" },
    { day: "Thursday", hours: "9:00 AM - 6:00 PM" },
    { day: "Friday", hours: "9:00 AM - 6:00 PM" },
    { day: "Saturday", hours: "Closed" },
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        <MobileHeader onMenuClick={() => setSidebarOpen(true)} />

        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate("/settings/availability")}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm">Availability</span>
            </button>
            <h1 className="text-2xl font-semibold text-gray-900">{location}</h1>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-6xl mx-auto p-6">
            {/* Hours of Operation */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Hours of Operation</h2>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setViewMode("list")}
                    className={`px-3 py-2 text-sm font-medium rounded ${
                      viewMode === "list" ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    List View
                  </button>
                  <button
                    onClick={() => setViewMode("calendar")}
                    className={`px-3 py-2 text-sm font-medium rounded ${
                      viewMode === "calendar" ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Calendar
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Recurring Hours */}
                <div>
                  <div className="flex items-center space-x-2 mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Recurring Hours</h3>
                    <button className="w-4 h-4 bg-gray-400 rounded-full flex items-center justify-center">
                      <HelpCircle className="w-3 h-3 text-white" />
                    </button>
                  </div>

                  <div className="bg-white rounded-lg border border-gray-200">
                    {weeklyHours.map((schedule, index) => (
                      <div
                        key={index}
                        className={`flex items-center justify-between p-4 ${
                          index !== weeklyHours.length - 1 ? "border-b border-gray-200" : ""
                        }`}
                      >
                        <span className="font-medium text-gray-900">{schedule.day}</span>
                        <span className="text-gray-600">{schedule.hours}</span>
                      </div>
                    ))}
                    <div className="p-4 border-t border-gray-200">
                      <button className="text-blue-600 hover:text-blue-700 font-medium text-sm">Edit Hours</button>
                    </div>
                  </div>
                </div>

                {/* Date Overrides */}
                <div>
                  <div className="flex items-center space-x-2 mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Date Overrides</h3>
                    <button className="w-4 h-4 bg-gray-400 rounded-full flex items-center justify-center">
                      <HelpCircle className="w-3 h-3 text-white" />
                    </button>
                  </div>

                  <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                    <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h4 className="font-medium text-gray-900 mb-2">Add a date override</h4>
                    <p className="text-gray-600 text-sm mb-6">
                      Update your hours to reflect schedule changes and closures during holidays, vacations, and other
                      special dates.
                    </p>
                    <button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700">
                      Add Date Override
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LocationAvailability 
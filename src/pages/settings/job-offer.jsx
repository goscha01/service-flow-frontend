"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import Sidebar from "../../components/sidebar"
import MobileHeader from "../../components/mobile-header"
import { ChevronLeft } from "lucide-react"

const JobOffer = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navigate = useNavigate()

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <MobileHeader onMenuClick={() => setSidebarOpen(true)} />
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate("/settings/client-team-notifications")}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm">Client & Team Notifications</span>
            </button>
            <h1 className="text-2xl font-semibold text-gray-900">Job Offer</h1>
            <span className="bg-orange-100 text-orange-600 text-sm px-3 py-1 rounded-md">
              Team Notification Template
            </span>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-6">
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Job Offer Notifications</h2>
            <p className="text-gray-600 mb-4">
              Configure notifications sent to service providers when a new job is offered to them.
            </p>
            <p className="text-sm text-gray-500">
              Template configuration interface would go here...
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default JobOffer 
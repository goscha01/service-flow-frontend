"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import Sidebar from "../components/sidebar"
import MobileHeader from "../components/mobile-header"
import { Plus, RotateCcw } from "lucide-react"

const ZenbookerRecurring = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navigate = useNavigate()

  const handleCreateNew = () => {
    navigate("/recurring/create")
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Main Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} activePage="recurring" />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        {/* Mobile Header */}
        <MobileHeader onMenuClick={() => setSidebarOpen(true)} />

        {/* Desktop Header */}
        <div className="hidden lg:flex bg-white border-b border-gray-200 px-6 py-4 items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Recurring Bookings</h1>
          <button 
            onClick={handleCreateNew}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create New</span>
          </button>
        </div>

        {/* Mobile Header Content */}
        <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-900">Recurring Bookings</h1>
            <button 
              onClick={handleCreateNew}
              className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center space-x-1"
            >
              <Plus className="w-4 h-4" />
              <span>Create New</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <RotateCcw className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Recurring bookings will show here</h3>
            <p className="text-gray-600 mb-6 leading-relaxed">
              This is where you can manage recurring bookings once scheduled.
            </p>
            <button className="text-blue-600 hover:text-blue-700 font-medium">Learn more</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ZenbookerRecurring

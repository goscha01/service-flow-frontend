"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import Sidebar from "../../components/sidebar"
import MobileHeader from "../../components/mobile-header"
import { ChevronLeft, Plus } from "lucide-react"

const TaxesFees = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navigate = useNavigate()

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
            <h1 className="text-2xl font-semibold text-gray-900">Taxes & Fees</h1>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <div className="flex">
            {/* Left Panel */}
            <div className="flex-1 p-6 space-y-8">
              {/* Tax Rates */}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Tax Rates</h2>
                <p className="text-gray-600 mb-6">
                  Create your tax rates, and select which services and territories the tax applies to
                </p>

                <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                  <p className="text-gray-500 mb-4">No tax rates created yet</p>
                  <button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700">
                    Create Tax
                  </button>
                </div>
              </div>

              {/* Price Adjustments */}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Price Adjustments</h2>
                <p className="text-gray-600 mb-6">Price adjustments allow you to add fees or discounts jobs</p>

                <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                  <p className="text-gray-500 mb-4">No price adjustments created yet</p>
                  <button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700">
                    Create Price Adjustment
                  </button>
                </div>
              </div>

              {/* Adjustment Rules */}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Adjustment Rules</h2>
                <p className="text-gray-600 mb-6">
                  Adjustment rules allow you to automatically apply price adjustments when certain conditions are met
                </p>

                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700">
                  Create Rule
                </button>
              </div>
            </div>

            {/* Right Panel - Preview */}
            <div className="w-96 bg-gray-100 p-6">
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h4 className="font-medium text-gray-900 mb-4">BOOKING CONDITIONS</h4>

                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <input type="radio" name="condition" defaultChecked />
                    <span className="text-sm text-gray-700">Day of week is...</span>
                  </div>

                  <div className="grid grid-cols-7 gap-1 text-xs">
                    <div className="text-center py-1">Sun</div>
                    <div className="text-center py-1">Mon</div>
                    <div className="text-center py-1 bg-blue-100 text-blue-700 rounded">Tue</div>
                    <div className="text-center py-1">Wed</div>
                    <div className="text-center py-1">Thu</div>
                    <div className="text-center py-1">Fri</div>
                    <div className="text-center py-1">Sat</div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input type="radio" name="condition" />
                    <span className="text-sm text-gray-700">Job start time is between...</span>
                  </div>

                  <div className="flex items-center space-x-2 text-sm">
                    <select className="border border-gray-300 rounded px-2 py-1 text-xs">
                      <option>12:00 PM</option>
                    </select>
                    <span>-</span>
                    <select className="border border-gray-300 rounded px-2 py-1 text-xs">
                      <option>12:30 PM</option>
                    </select>
                    <button className="text-red-500">🗑</button>
                  </div>

                  <button className="text-blue-600 text-sm flex items-center space-x-1">
                    <Plus className="w-3 h-3" />
                    <span>Add Hours</span>
                  </button>

                  <button className="text-blue-600 text-sm flex items-center space-x-1">
                    <Plus className="w-3 h-3" />
                    <span>Add Condition</span>
                  </button>

                  <div className="border-t pt-4 mt-6">
                    <h5 className="font-medium text-gray-900 mb-2">ADJUSTMENTS TO APPLY</h5>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="text-sm">Surge Pricing</span>
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded">5%</span>
                    </div>
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

export default TaxesFees

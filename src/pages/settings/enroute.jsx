"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import Sidebar from "../../components/sidebar"
import MobileHeader from "../../components/mobile-header"
import { ChevronLeft, MessageSquare } from "lucide-react"

const Enroute = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [enableSMS, setEnableSMS] = useState(true)
  const navigate = useNavigate()

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        <MobileHeader onMenuClick={() => setSidebarOpen(true)} />

        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate("/settings/client-team-notifications")}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm">Client & Team Notifications</span>
            </button>
            <h1 className="text-2xl font-semibold text-gray-900">Enroute</h1>
            <span className="bg-gray-100 text-gray-600 text-sm px-3 py-1 rounded-md">
              Customer Notification Template
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Settings Panel */}
              <div className="space-y-6">
                {/* Enable SMS Toggle */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <MessageSquare className="w-5 h-5 text-green-400" />
                      <div>
                        <h3 className="font-medium text-gray-900">Enable Enroute SMS</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Notify your customer with an ETA when you or an employee is on the way.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <button
                        onClick={() => setEnableSMS(!enableSMS)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          enableSMS ? "bg-green-500" : "bg-gray-200"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            enableSMS ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                      <span className={`ml-2 text-sm font-medium ${enableSMS ? "text-green-600" : "text-gray-400"}`}>
                        {enableSMS ? "YES" : "NO"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* SMS Template */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-gray-900">SMS template</h3>
                      <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                        Edit SMS
                      </button>
                    </div>
                    <p className="text-sm text-gray-600">Customize the content of this SMS</p>
                  </div>
                </div>

                {/* ETA Settings */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="space-y-4">
                    <h3 className="font-medium text-gray-900">ETA Settings</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Default ETA (minutes)
                        </label>
                        <select className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                          <option>15 minutes</option>
                          <option>30 minutes</option>
                          <option>45 minutes</option>
                          <option>60 minutes</option>
                        </select>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" id="auto-eta" className="rounded border-gray-300" />
                        <label htmlFor="auto-eta" className="text-sm text-gray-700">
                          Automatically calculate ETA using GPS
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* SMS Preview */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="space-y-4">
                  <div className="border-b border-gray-200 pb-4">
                    <h3 className="font-medium text-gray-900">SMS Preview</h3>
                    <p className="text-sm text-gray-600">Preview how the SMS will appear to customers</p>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-6 min-h-96">
                    <div className="max-w-sm mx-auto">
                      {/* Phone mockup */}
                      <div className="bg-white rounded-2xl shadow-lg p-4 border-8 border-gray-800">
                        <div className="space-y-3">
                          <div className="flex justify-between items-center text-xs text-gray-600">
                            <span>9:41 AM</span>
                            <span>📶 📶 📶 🔋</span>
                          </div>
                          
                          <div className="space-y-3">
                            <div className="bg-green-100 rounded-2xl p-3 max-w-xs">
                              <p className="text-sm text-gray-900">
                                🚗 Hi John! We're on our way to your appointment. Our team will arrive in approximately 15 minutes. Please have the area ready for our Standard Home Cleaning service. - Just web Agency
                              </p>
                              <p className="text-xs text-gray-500 mt-1">Just web Agency • now</p>
                            </div>
                          </div>
                          
                          <div className="flex justify-center">
                            <div className="bg-blue-100 rounded-full px-3 py-1">
                              <p className="text-xs text-blue-600">📍 Location sharing enabled</p>
                            </div>
                          </div>
                        </div>
                      </div>
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

export default Enroute 
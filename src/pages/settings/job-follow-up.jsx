"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import Sidebar from "../../components/sidebar"
import MobileHeader from "../../components/mobile-header"
import { ChevronLeft, Mail } from "lucide-react"

const JobFollowUp = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [enableEmail, setEnableEmail] = useState(true)
  const [showLogo, setShowLogo] = useState(false)
  const navigate = useNavigate()

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 lg:ml-64 xl:ml-72">
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
            <h1 className="text-2xl font-semibold text-gray-900">Job Follow-up</h1>
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
                {/* Enable Email Toggle */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Mail className="w-5 h-5 text-gray-400" />
                      <div>
                        <h3 className="font-medium text-gray-900">Enable Job Follow-up Email</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Sent to customers after a job is marked as complete, prompting them to rate their service.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <button
                        onClick={() => setEnableEmail(!enableEmail)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          enableEmail ? "bg-green-500" : "bg-gray-200"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            enableEmail ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                      <span className={`ml-2 text-sm font-medium ${enableEmail ? "text-green-600" : "text-gray-400"}`}>
                        {enableEmail ? "YES" : "NO"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Logo Settings */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900">Show logo</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          You can add or change your logo in <span className="text-blue-600">Settings > Branding</span>
                        </p>
                      </div>
                      <button
                        onClick={() => setShowLogo(!showLogo)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          showLogo ? "bg-blue-500" : "bg-gray-200"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            showLogo ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Email Template */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-gray-900">Email template</h3>
                      <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                        Edit email
                      </button>
                    </div>
                    <p className="text-sm text-gray-600">Customize the content of this email</p>
                  </div>
                </div>
              </div>

              {/* Email Preview */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="space-y-4">
                  {/* Email Header */}
                  <div className="border-b border-gray-200 pb-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">To:</span>
                        <span className="text-gray-900">johnsmith@example.com</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">From:</span>
                        <span className="text-gray-900">Just web Agency</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Subject:</span>
                        <span className="text-gray-900">How was your service experience?</span>
                      </div>
                    </div>
                  </div>

                  {/* Email Content */}
                  <div className="bg-gray-50 rounded-lg p-6 min-h-96 overflow-auto">
                    <div className="bg-white rounded-lg p-8 shadow-sm">
                      <div className="space-y-6">
                        <h2 className="text-xl font-semibold text-gray-900">
                          Your Service is Complete!
                        </h2>
                        
                        <div className="space-y-4">
                          <p className="text-gray-900">Hi John Doe,</p>
                          
                          <p className="text-gray-700">
                            Thank you for choosing Just web Agency! We hope you're completely satisfied with the service we provided.
                          </p>
                          
                          <p className="text-gray-700">
                            We'd love to hear about your experience. Could you take a moment to leave us a review?
                          </p>
                          
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                            <button className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700">
                              Leave a Review
                            </button>
                          </div>
                          
                          <p className="text-gray-700">
                            Your feedback helps us improve our services and helps other customers make informed decisions.
                          </p>
                          
                          <p className="text-gray-700">Thank you for your business!</p>
                          <p className="text-gray-700">The Team at Just web Agency</p>
                        </div>
                      </div>
                      
                      <div className="mt-12 pt-6 border-t border-gray-200 text-center">
                        <p className="text-xs text-gray-500">© 2025 Just web Agency</p>
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

export default JobFollowUp 
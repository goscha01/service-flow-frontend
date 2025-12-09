"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import Sidebar from "../../components/sidebar"
import { ChevronLeft, Link2 } from "lucide-react"

const Developers = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navigate = useNavigate()

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">

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
            <h1 className="text-2xl font-semibold text-gray-900">Developers</h1>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-6xl mx-auto p-6 space-y-12">
            {/* Webhooks Section */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Webhooks</h2>
              <p className="text-gray-600 mb-6">
                Use webhooks to subscribe to events that happen inside of your Serviceflow account.
              </p>
              <button className="text-blue-600 hover:text-blue-700 font-medium text-sm mb-8">
                Learn more about using webhooks
              </button>

              <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Link2 className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Create your first webhook</h3>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">
                  Receive job details in real-time when something happens in Serviceflow.
                </p>
                <button className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700">
                  Create a Webhook
                </button>
              </div>
            </div>

            {/* API Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <div className="flex items-center space-x-2 mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">API</h2>
                  <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded font-medium">BETA</span>
                </div>
                <p className="text-gray-600 mb-6">
                  Use the Serviceflow API to access your account data, like jobs and customers.
                </p>

                <div className="space-y-4">
                  <button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 mr-4">
                    Create API Key
                  </button>
                  <button className="text-blue-600 hover:text-blue-700 font-medium">View Documentation</button>
                </div>
              </div>

              {/* Code Preview */}
              <div className="bg-gray-900 rounded-lg p-6 text-green-400 font-mono text-sm overflow-hidden">
                <div className="flex items-center space-x-2 mb-4">
                  <span className="bg-green-600 text-white px-2 py-1 rounded text-xs">POST</span>
                  <span className="text-gray-300">https://api.service-flow.com/v1/jobs/1d/assign</span>
                </div>
                <div className="space-y-1">
                  <div>{"{"}</div>
                  <div className="ml-4">"staff_id": "2b13-bb-1b8-d00e",</div>
                  <div className="ml-4">"service_schedule_id": 10</div>
                  <div>{"}"}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Developers

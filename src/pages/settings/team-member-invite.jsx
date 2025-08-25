"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import Sidebar from "../../components/sidebar"
import MobileHeader from "../../components/mobile-header"
import { ChevronLeft, Mail } from "lucide-react"

const TeamMemberInvite = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [enableEmail, setEnableEmail] = useState(true)
  const [showLogo, setShowLogo] = useState(false)
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
            <h1 className="text-2xl font-semibold text-gray-900">Team Member Invite</h1>
            <span className="bg-orange-100 text-orange-600 text-sm px-3 py-1 rounded-md">
              Team Notification Template
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
                        <h3 className="font-medium text-gray-900">Enable Team Member Invite Email</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Sent to newly added team members with account activation instructions.
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
                        <span className="text-gray-900">sarah.johnson@example.com</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">From:</span>
                        <span className="text-gray-900">Just web Agency</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Subject:</span>
                        <span className="text-gray-900">Welcome to the Just web Agency Team!</span>
                      </div>
                    </div>
                  </div>

                  {/* Email Content */}
                  <div className="bg-gray-50 rounded-lg p-6 min-h-96 overflow-auto">
                    <div className="bg-white rounded-lg p-8 shadow-sm">
                      <div className="space-y-6">
                        <h2 className="text-xl font-semibold text-gray-900">
                          Welcome to Just web Agency!
                        </h2>
                        
                        <div className="space-y-4">
                          <p className="text-gray-900">Hi Sarah Johnson,</p>
                          
                          <p className="text-gray-700">
                            Welcome to the team! You've been invited to join Just web Agency as a team member.
                          </p>
                          
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <h3 className="font-medium text-gray-900 mb-3">Your Account Details:</h3>
                            <div className="text-sm text-gray-700 space-y-1">
                              <p><strong>Email:</strong> sarah.johnson@example.com</p>
                              <p><strong>Role:</strong> Field Service Provider</p>
                              <p><strong>Team:</strong> Cleaning Team A</p>
                              <p><strong>Start Date:</strong> March 15, 2025</p>
                            </div>
                          </div>
                          
                          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                            <p className="text-sm text-gray-700 mb-3">Click the button below to activate your account and set up your password</p>
                            <button className="bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 mb-2">
                              Activate Account
                            </button>
                            <p className="text-xs text-gray-600">This link expires in 7 days</p>
                          </div>
                          
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <h3 className="font-medium text-gray-900 mb-2">Next Steps:</h3>
                            <ul className="text-sm text-gray-700 space-y-1">
                              <li>1. Activate your account using the link above</li>
                              <li>2. Download the Zenbooker mobile app</li>
                              <li>3. Complete your profile and training modules</li>
                              <li>4. Review your upcoming job assignments</li>
                            </ul>
                          </div>
                          
                          <p className="text-gray-700">
                            If you have any questions or need assistance, please don't hesitate to contact your team leader or the admin team.
                          </p>
                          
                          <p className="text-gray-700">We're excited to have you on board!</p>
                          <p className="text-gray-700">The Just web Agency Team</p>
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

export default TeamMemberInvite 
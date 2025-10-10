"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import Sidebar from "../../components/sidebar"
import MobileHeader from "../../components/mobile-header"
import NotificationTestButton from "../../components/NotificationTestButton"
import { ChevronLeft, Mail, MessageSquare, Bell } from "lucide-react"

const AssignedJobCancelled = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [enableEmail, setEnableEmail] = useState(true)
  const [enableSMS, setEnableSMS] = useState(true)
  const [enablePush, setEnablePush] = useState(true)
  const [showLogo, setShowLogo] = useState(false)
  const [activeTab, setActiveTab] = useState("email")
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
            <h1 className="text-2xl font-semibold text-gray-900">Assigned Job Cancelled</h1>
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
                {/* Notification Type Tabs */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex space-x-1 bg-gray-100 rounded-lg p-1 mb-6">
                    <button
                      onClick={() => setActiveTab("email")}
                      className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                        activeTab === "email"
                          ? "bg-white text-blue-600 shadow-sm"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      <Mail className="w-4 h-4" />
                      <span>Email</span>
                    </button>
                    <button
                      onClick={() => setActiveTab("sms")}
                      className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                        activeTab === "sms"
                          ? "bg-white text-green-600 shadow-sm"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>SMS</span>
                    </button>
                    <button
                      onClick={() => setActiveTab("push")}
                      className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                        activeTab === "push"
                          ? "bg-white text-purple-600 shadow-sm"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      <Bell className="w-4 h-4" />
                      <span>Push</span>
                    </button>
                  </div>

                  {/* Settings for each type */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900">
                          Enable Assigned Job Cancelled {activeTab === "email" ? "Email" : activeTab === "sms" ? "SMS" : "Push Notification"}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Sent to a job's assigned provider(s) if the job has been cancelled.
                        </p>
                      </div>
                      <div className="flex items-center">
                        <button
                          onClick={() => {
                            if (activeTab === "email") setEnableEmail(!enableEmail)
                            else if (activeTab === "sms") setEnableSMS(!enableSMS)
                            else setEnablePush(!enablePush)
                          }}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            (activeTab === "email" ? enableEmail : activeTab === "sms" ? enableSMS : enablePush) 
                              ? "bg-green-500" : "bg-gray-200"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              (activeTab === "email" ? enableEmail : activeTab === "sms" ? enableSMS : enablePush)
                                ? "translate-x-6" : "translate-x-1"
                            }`}
                          />
                        </button>
                        <span className={`ml-2 text-sm font-medium ${
                          (activeTab === "email" ? enableEmail : activeTab === "sms" ? enableSMS : enablePush)
                            ? "text-green-600" : "text-gray-400"
                        }`}>
                          {(activeTab === "email" ? enableEmail : activeTab === "sms" ? enableSMS : enablePush) ? "YES" : "NO"}
                        </span>
                      </div>
                    </div>
                    
                    {/* Test Button */}
                    <NotificationTestButton 
                      notificationType="Assigned Job Cancelled"
                      messageType={activeTab === "email" ? "email" : activeTab === "sms" ? "sms" : "both"}
                      templateContent={activeTab === "email" ? "<h2>Job Cancelled</h2><p>Hi Sarah,</p><p>Unfortunately, the job you were assigned to has been cancelled.</p><p><strong>Service:</strong> Home Cleaning</p><p><strong>Date:</strong> March 15, 2025</p><p><strong>Time:</strong> 10:00 AM - 12:00 PM</p><p><strong>Customer:</strong> John Doe</p><p>We apologize for any inconvenience. You will be notified of new job opportunities.</p><p>Best regards,<br />The Team at Just web Agency</p>" : activeTab === "sms" ? "Hi Sarah! The Home Cleaning job for March 15 at 10:00 AM has been cancelled. Customer: John Doe. We'll notify you of new opportunities. - Just web Agency" : ""}
                    />
                  </div>
                </div>

                {/* Logo Settings (Email only) */}
                {activeTab === "email" && (
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
                )}

                {/* Template Editor */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-gray-900">
                        {activeTab === "email" ? "Email template" : activeTab === "sms" ? "SMS template" : "Push notification template"}
                      </h3>
                      <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                        Edit {activeTab}
                      </button>
                    </div>
                    <p className="text-sm text-gray-600">Customize the content of this {activeTab}</p>
                  </div>
                </div>
              </div>

              {/* Preview Panel */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="space-y-4">
                  {activeTab === "email" ? (
                    <>
                      {/* Email Header */}
                      <div className="border-b border-gray-200 pb-4">
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">To:</span>
                            <span className="text-gray-900">sarah.johnson@justwebagency.com</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">From:</span>
                            <span className="text-gray-900">Just web Agency Admin</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Subject:</span>
                            <span className="text-gray-900">Job Cancelled - Standard Home Cleaning</span>
                          </div>
                        </div>
                      </div>

                      {/* Email Content */}
                      <div className="bg-gray-50 rounded-lg p-6 min-h-96 overflow-auto">
                        <div className="bg-white rounded-lg p-8 shadow-sm">
                          <div className="space-y-6">
                            <h2 className="text-xl font-semibold text-gray-900">
                              Job Assignment Cancelled
                            </h2>
                            
                            <div className="space-y-4">
                              <p className="text-gray-900">Hi Sarah,</p>
                              
                              <p className="text-gray-700">
                                We wanted to notify you that a job you were assigned to has been cancelled by the customer.
                              </p>
                              
                              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                <h3 className="font-medium text-red-900 mb-3">Cancelled Job Details:</h3>
                                <div className="text-sm text-red-700 space-y-2">
                                  <div className="flex justify-between">
                                    <span className="text-red-600">Job ID:</span>
                                    <span className="text-red-900">#JOB-2025-001</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-red-600">Service:</span>
                                    <span className="text-red-900">Standard Home Cleaning</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-red-600">Customer:</span>
                                    <span className="text-red-900">John Doe</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-red-600">Scheduled Date:</span>
                                    <span className="text-red-900">March 15, 2025 at 10:00 AM</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-red-600">Location:</span>
                                    <span className="text-red-900">123 Main St, Brooklyn, NY</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-red-600">Cancellation Reason:</span>
                                    <span className="text-red-900">Customer request</span>
                                  </div>
                                </div>
                              </div>
                              
                              <p className="text-gray-700">
                                This job has been removed from your schedule. You do not need to take any further action.
                              </p>
                              
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <p className="text-sm text-blue-800 font-medium mb-2">📅 Check Your Updated Schedule</p>
                                <p className="text-sm text-gray-700">
                                  Your schedule has been automatically updated. Please check the mobile app for any other assignments for this time slot.
                                </p>
                              </div>
                              
                              <p className="text-gray-700">
                                If you have any questions about this cancellation, please contact the admin team.
                              </p>
                              
                              <p className="text-gray-700">
                                Thank you for your understanding.
                              </p>
                              
                              <p className="text-gray-700">
                                Just web Agency Admin Team
                              </p>
                            </div>
                          </div>
                          
                          <div className="mt-12 pt-6 border-t border-gray-200 text-center">
                            <p className="text-xs text-gray-500">© 2025 Just web Agency</p>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : activeTab === "sms" ? (
                    <>
                      {/* SMS Preview */}
                      <div className="border-b border-gray-200 pb-4">
                        <h3 className="font-medium text-gray-900">SMS Preview</h3>
                        <p className="text-sm text-gray-600">Preview how the SMS will appear to team members</p>
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
                                <div className="bg-red-100 rounded-2xl p-3 max-w-xs">
                                  <p className="text-sm text-gray-900">
                                    ❌ Job Cancelled: Standard Home Cleaning for John Doe on March 15 at 10:00 AM has been cancelled. Check your updated schedule in the app. - Just web Agency
                                  </p>
                                  <p className="text-xs text-gray-500 mt-1">Just web Agency • now</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Push Notification Preview */}
                      <div className="border-b border-gray-200 pb-4">
                        <h3 className="font-medium text-gray-900">Push Notification Preview</h3>
                        <p className="text-sm text-gray-600">Preview how the push notification will appear in the mobile app</p>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-6 min-h-96">
                        <div className="max-w-sm mx-auto">
                          {/* Mobile notification mockup */}
                          <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4">
                            <div className="flex items-start space-x-3">
                              <div className="bg-red-500 rounded-full p-2">
                                <Bell className="w-4 h-4 text-white" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <h4 className="font-medium text-gray-900">Just web Agency</h4>
                                  <span className="text-xs text-gray-500">now</span>
                                </div>
                                <p className="text-sm text-gray-700 mt-1">
                                  Job Cancelled: Standard Home Cleaning for John Doe on March 15 at 10:00 AM
                                </p>
                                <p className="text-xs text-gray-500 mt-2">Tap to view updated schedule</p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="mt-4 text-center">
                            <p className="text-xs text-gray-500">Notification will appear on device lock screen and in notification center</p>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AssignedJobCancelled 
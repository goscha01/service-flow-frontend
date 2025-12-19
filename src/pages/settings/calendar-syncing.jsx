"use client"

import { useState, useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import Sidebar from "../../components/sidebar"
import CalendarSyncSettings from "../../components/CalendarSyncSettings"
import { ChevronLeft, Calendar, FileText, CheckCircle, AlertCircle } from "lucide-react"

const CalendarSyncing = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [serviceProviderSync, setServiceProviderSync] = useState(false)
  const [oauthMessage, setOauthMessage] = useState(null)

  useEffect(() => {
    // Check for OAuth callback parameters
    const success = searchParams.get('success')
    const error = searchParams.get('error')
    
    if (success === 'connected') {
      setOauthMessage({ type: 'success', text: 'Google account connected successfully! Refresh token saved. You can now sync jobs to Google Calendar.' });
      // Remove query params from URL
      navigate('/settings/calendar-syncing', { replace: true });
      setTimeout(() => setOauthMessage(null), 5000);
    } else if (success === 'connected_no_refresh') {
      setOauthMessage({ type: 'warning', text: 'Google account connected, but no refresh token was provided. You may need to disconnect and reconnect to get a refresh token.' });
      // Remove query params from URL
      navigate('/settings/calendar-syncing', { replace: true });
      setTimeout(() => setOauthMessage(null), 8000);
    } else if (error) {
      const errorMessages = {
        'user_not_authenticated': 'You must be logged in to connect your Google account.',
        'user_not_found': 'User account not found. Please try logging in again.',
        'update_failed': 'Failed to save Google account connection. Please try again.',
        'callback_failed': 'Google OAuth callback failed. Please try again.',
        'invalid_client_credentials': 'Google OAuth client credentials are invalid. Please check GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your backend environment variables.'
      };
      setOauthMessage({ 
        type: 'error', 
        text: errorMessages[error] || 'Failed to connect Google account. Please try again.' 
      });
      // Remove query params from URL
      navigate('/settings/calendar-syncing', { replace: true });
      setTimeout(() => setOauthMessage(null), 5000);
    }
  }, [searchParams, navigate]);

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
            <h1 className="text-2xl font-semibold text-gray-900">Calendar Syncing</h1>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-4xl mx-auto p-6 space-y-8">
            {/* OAuth Callback Messages */}
            {oauthMessage && (
              <div className={`p-4 rounded-lg border ${
                oauthMessage.type === 'success' 
                  ? 'bg-green-50 border-green-200' 
                  : oauthMessage.type === 'warning'
                  ? 'bg-yellow-50 border-yellow-200'
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-center space-x-2">
                  {oauthMessage.type === 'success' ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : oauthMessage.type === 'warning' ? (
                    <AlertCircle className="w-5 h-5 text-yellow-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  )}
                  <span className={`text-sm font-medium ${
                    oauthMessage.type === 'success' 
                      ? 'text-green-800' 
                      : oauthMessage.type === 'warning'
                      ? 'text-yellow-800'
                      : 'text-red-800'
                  }`}>
                    {oauthMessage.text}
                  </span>
                </div>
              </div>
            )}

            {/* Google Calendar Sync Settings */}
            <CalendarSyncSettings />

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

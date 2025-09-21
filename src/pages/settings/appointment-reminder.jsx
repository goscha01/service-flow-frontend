"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import Sidebar from "../../components/sidebar"
import MobileHeader from "../../components/mobile-header"
import { ChevronLeft, Mail, MessageSquare, Check, X } from "lucide-react"
import { notificationTemplatesAPI, notificationSettingsAPI } from "../../services/api"
import { useAuth } from "../../context/AuthContext"

const AppointmentReminder = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [enableEmail, setEnableEmail] = useState(true)
  const [enableSMS, setEnableSMS] = useState(true)
  const [showLogo, setShowLogo] = useState(false)
  const [activeTab, setActiveTab] = useState("email")
  const [emailTemplate, setEmailTemplate] = useState({
    subject: '',
    content: ''
  })
  const [smsTemplate, setSmsTemplate] = useState({
    content: ''
  })
  const navigate = useNavigate()
  const { user } = useAuth()

  // Load templates and settings on component mount
  useEffect(() => {
    if (user?.id) {
      loadTemplatesAndSettings();
    }
  }, [user?.id]);

  const loadTemplatesAndSettings = async () => {
    try {
      setLoading(true);
      
      // Load email template
      const emailTemplates = await notificationTemplatesAPI.getTemplates(
        user.id, 
        'email', 
        'appointment_reminder'
      );
      
      if (emailTemplates.length > 0) {
        const template = emailTemplates[0];
        setEmailTemplate({
          subject: template.subject || '',
          content: template.content || ''
        });
        setEnableEmail(template.is_enabled === 1);
      }

      // Load SMS template
      const smsTemplates = await notificationTemplatesAPI.getTemplates(
        user.id, 
        'sms', 
        'appointment_reminder'
      );
      
      if (smsTemplates.length > 0) {
        const template = smsTemplates[0];
        setSmsTemplate({
          content: template.content || ''
        });
        setEnableSMS(template.is_enabled === 1);
      }

      // Load notification settings
      const settings = await notificationSettingsAPI.getSettings(user.id);
      const reminderSetting = settings.find(s => s.notification_type === 'appointment_reminder');
      
      if (reminderSetting) {
        setEnableEmail(reminderSetting.email_enabled === 1);
        setEnableSMS(reminderSetting.sms_enabled === 1);
      }

    } catch (error) {
      console.error('Error loading templates:', error);
      setMessage({ type: 'error', text: 'Failed to load notification templates' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage({ type: '', text: '' });

      // Save email template
      await notificationTemplatesAPI.updateTemplate({
        userId: user.id,
        templateType: 'email',
        notificationName: 'appointment_reminder',
        subject: emailTemplate.subject,
        content: emailTemplate.content,
        isEnabled: enableEmail
      });

      // Save SMS template
      await notificationTemplatesAPI.updateTemplate({
        userId: user.id,
        templateType: 'sms',
        notificationName: 'appointment_reminder',
        subject: null,
        content: smsTemplate.content,
        isEnabled: enableSMS
      });

      // Save notification settings
      await notificationSettingsAPI.updateSetting({
        userId: user.id,
        notificationType: 'appointment_reminder',
        emailEnabled: enableEmail,
        smsEnabled: enableSMS,
        pushEnabled: false
      });

      setMessage({ type: 'success', text: 'Notification settings saved successfully!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Error saving templates:', error);
      setMessage({ type: 'error', text: 'Failed to save notification settings' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 lg:ml-64 xl:ml-72">
        <MobileHeader onMenuClick={() => setSidebarOpen(true)} />

        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          {/* Message */}
          {message.text && (
            <div className={`px-6 py-3 ${message.type === 'success' ? 'bg-green-50 border-l-4 border-green-400' : 'bg-red-50 border-l-4 border-red-400'}`}>
              <div className="flex items-center">
                {message.type === 'success' ? (
                  <Check className="w-5 h-5 text-green-400 mr-2" />
                ) : (
                  <X className="w-5 h-5 text-red-400 mr-2" />
                )}
                <span className={`text-sm ${message.type === 'success' ? 'text-green-700' : 'text-red-700'}`}>
                  {message.text}
                </span>
              </div>
            </div>
          )}
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate("/settings/client-team-notifications")}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm">Client & Team Notifications</span>
            </button>
            <h1 className="text-2xl font-semibold text-gray-900">Appointment Reminder</h1>
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
                  </div>

                  {/* Email Settings */}
                  {activeTab === "email" && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-gray-900">Enable Appointment Reminder Email</h3>
                          <p className="text-sm text-gray-600 mt-1">
                            Sent automatically to the customer to remind them of their upcoming appointment.
                          </p>
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
                  )}

                  {/* SMS Settings */}
                  {activeTab === "sms" && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-gray-900">Enable Appointment Reminder SMS</h3>
                          <p className="text-sm text-gray-600 mt-1">
                            Sent automatically to the customer to remind them of their upcoming appointment.
                          </p>
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
                  )}
                </div>

                {/* Reminder Timing */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="space-y-4">
                    <h3 className="font-medium text-gray-900">Reminder Timing</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Send reminder how far in advance?
                        </label>
                        <select className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                          <option>1 hour before</option>
                          <option>2 hours before</option>
                          <option>4 hours before</option>
                          <option>1 day before</option>
                          <option>2 days before</option>
                          <option>3 days before</option>
                          <option>1 week before</option>
                        </select>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" id="multiple-reminders" className="rounded border-gray-300" />
                        <label htmlFor="multiple-reminders" className="text-sm text-gray-700">
                          Send multiple reminders (24hrs and 2hrs before)
                        </label>
                      </div>
                    </div>
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
                        {activeTab === "email" ? "Email template" : "SMS template"}
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
                            <span className="text-gray-900">johnsmith@example.com</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">From:</span>
                            <span className="text-gray-900">Just web Agency</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Subject:</span>
                            <span className="text-gray-900">Reminder: Appointment Tomorrow</span>
                          </div>
                        </div>
                      </div>

                      {/* Email Content */}
                      <div className="bg-gray-50 rounded-lg p-6 min-h-96 overflow-auto">
                        <div className="bg-white rounded-lg p-8 shadow-sm">
                          <div className="space-y-6">
                            <div className="flex items-center space-x-2">
                              <h2 className="text-xl font-semibold text-gray-900">
                                Reminder: Your Appointment is Tomorrow!
                              </h2>
                              <span className="text-blue-500">⏰</span>
                            </div>
                            
                            <div className="space-y-4">
                              <p className="text-gray-900">Hi John Doe,</p>
                              
                              <p className="text-gray-700">
                                This is a friendly reminder that you have an appointment scheduled with us tomorrow. We're looking forward to serving you!
                              </p>
                              
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <h3 className="font-medium text-gray-900 mb-3">Appointment Details:</h3>
                                <div className="text-sm text-gray-700 space-y-2">
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Service:</span>
                                    <span className="text-gray-900">Standard Home Cleaning</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Date & Time:</span>
                                    <span className="text-gray-900 font-medium">March 15, 2025 at 10:00 AM</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Duration:</span>
                                    <span className="text-gray-900">2 hours</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Location:</span>
                                    <span className="text-gray-900">123 Main St, Brooklyn, NY</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Team Member:</span>
                                    <span className="text-gray-900">Sarah Johnson</span>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                <h3 className="font-medium text-gray-900 mb-2">Preparation Checklist:</h3>
                                <ul className="text-sm text-gray-700 space-y-1">
                                  <li>• Clear all surfaces that need to be cleaned</li>
                                  <li>• Secure or remove fragile items</li>
                                  <li>• Ensure pets are safely contained</li>
                                  <li>• Provide access to water and electrical outlets</li>
                                </ul>
                              </div>
                              
                              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <p className="text-sm text-green-800 font-medium mb-2">✓ Confirmed and Ready</p>
                                <p className="text-sm text-gray-700">
                                  Your appointment is confirmed. Our team will arrive promptly within the scheduled time window.
                                </p>
                              </div>
                              
                              <p className="text-gray-700">
                                Need to make any changes? Please contact us at least 2 hours before your appointment time.
                              </p>
                              
                              <div className="flex space-x-4">
                                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
                                  Reschedule
                                </button>
                                <button className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-300">
                                  Cancel
                                </button>
                              </div>
                              
                              <p className="text-gray-700">We can't wait to serve you!</p>
                              <p className="text-gray-700">The Team at Just web Agency</p>
                            </div>
                          </div>
                          
                          <div className="mt-12 pt-6 border-t border-gray-200 text-center">
                            <p className="text-xs text-gray-500">© 2025 Just web Agency</p>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* SMS Preview */}
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
                                <div className="bg-blue-100 rounded-2xl p-3 max-w-xs">
                                  <p className="text-sm text-gray-900">
                                    ⏰ Hi John! Reminder: Your Standard Home Cleaning is tomorrow (March 15) at 10:00 AM. Sarah will be your team member. Please prepare areas to be cleaned. Questions? Reply here. - Just web Agency
                                  </p>
                                  <p className="text-xs text-gray-500 mt-1">Just web Agency • now</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="mt-8 flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving || loading}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AppointmentReminder 
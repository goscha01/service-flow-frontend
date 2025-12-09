"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import Sidebar from "../../components/sidebar"
import CreateCustomPaymentMethodModal from "../../components/create-custom-payment-method-modal"
import { ChevronLeft, Edit, Trash2, HelpCircle, Check, AlertCircle } from "lucide-react"
import { paymentSettingsAPI, paymentMethodsAPI } from "../../services/api"
import { useAuth } from "../../context/AuthContext"

const Payments = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navigate = useNavigate()
  const { user } = useAuth()
  const [isPaymentMethodModalOpen, setIsPaymentMethodModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  
  const [settings, setSettings] = useState({
    onlineBookingTips: false,
    invoicePaymentTips: false,
    showServicePrices: true,
    showServiceDescriptions: false,
    paymentDueDays: 15,
    paymentDueUnit: "days",
    defaultMemo: "",
    invoiceFooter: "",
    paymentProcessor: null,
    paymentProcessorConnected: false
  })

  const [paymentMethods, setPaymentMethods] = useState([])
  const [editingMethod, setEditingMethod] = useState(null)

  useEffect(() => {
    if (user) {
      loadPaymentData()
    }
  }, [user])

  const loadPaymentData = async () => {
    try {
      setLoading(true)
      const [settingsData, methodsData] = await Promise.all([
        paymentSettingsAPI.getPaymentSettings(),
        paymentMethodsAPI.getPaymentMethods()
      ])
      
      setSettings(settingsData)
      setPaymentMethods(methodsData)
    } catch (error) {
      console.error('Error loading payment data:', error)
      setMessage({ type: 'error', text: 'Failed to load payment settings' })
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSettings = async () => {
    try {
      setSaving(true)
      await paymentSettingsAPI.updatePaymentSettings(settings)
      setMessage({ type: 'success', text: 'Payment settings saved successfully' })
    } catch (error) {
      console.error('Error saving payment settings:', error)
      setMessage({ type: 'error', text: 'Failed to save payment settings' })
    } finally {
      setSaving(false)
    }
  }

  const handleSetupPaymentProcessor = async () => {
    try {
      setSaving(true)
      const result = await paymentSettingsAPI.setupPaymentProcessor('stripe')
      setSettings(prev => ({
        ...prev,
        paymentProcessor: result.processor,
        paymentProcessorConnected: result.connected
      }))
      setMessage({ type: 'success', text: 'Payment processor connected successfully' })
    } catch (error) {
      console.error('Error setting up payment processor:', error)
      setMessage({ type: 'error', text: 'Failed to setup payment processor' })
    } finally {
      setSaving(false)
    }
  }

  const handleSavePaymentMethod = async (paymentMethod) => {
    try {
      if (editingMethod) {
        await paymentMethodsAPI.updatePaymentMethod(editingMethod.id, paymentMethod)
        setPaymentMethods(prev => 
          prev.map(method => 
            method.id === editingMethod.id 
              ? { ...method, ...paymentMethod }
              : method
          )
        )
        setEditingMethod(null)
      } else {
        const newMethod = await paymentMethodsAPI.createPaymentMethod(paymentMethod)
        setPaymentMethods(prev => [...prev, newMethod])
      }
      setIsPaymentMethodModalOpen(false)
      setMessage({ type: 'success', text: 'Payment method saved successfully' })
    } catch (error) {
      console.error('Error saving payment method:', error)
      setMessage({ type: 'error', text: 'Failed to save payment method' })
    }
  }

  const handleDeletePaymentMethod = async (id) => {
    if (window.confirm("Are you sure you want to delete this payment method?")) {
      try {
        await paymentMethodsAPI.deletePaymentMethod(id)
        setPaymentMethods(prev => prev.filter(method => method.id !== id))
        setMessage({ type: 'success', text: 'Payment method deleted successfully' })
      } catch (error) {
        console.error('Error deleting payment method:', error)
        setMessage({ type: 'error', text: 'Failed to delete payment method' })
      }
    }
  }

  const handleEditPaymentMethod = (method) => {
    setEditingMethod(method)
    setIsPaymentMethodModalOpen(true)
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex flex-col min-w-0 lg:ml-64 xl:ml-72">
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading payment settings...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 lg:ml-64 xl:ml-72">

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
            <h1 className="text-2xl font-semibold text-gray-900">Payments</h1>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-4xl mx-auto p-6 space-y-8">
            {/* Message Display */}
            {message.text && (
              <div className={`rounded-lg p-4 ${
                message.type === 'success' 
                  ? 'bg-green-50 border border-green-200 text-green-800' 
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}>
                <div className="flex items-center space-x-2">
                  {message.type === 'success' ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <AlertCircle className="w-5 h-5" />
                  )}
                  <span className="font-medium">{message.text}</span>
                </div>
              </div>
            )}

            {/* Payment Processing */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Payment Processing</h2>
              <p className="text-gray-600 mb-6">
                Serviceflow Payments lets you securely accept credit card payments online. Your customers can pay when they
                book or when they receive an invoice.
              </p>

              {settings.paymentProcessorConnected ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span className="text-sm font-medium text-green-800">
                      Payment processing connected ({settings.paymentProcessor})
                    </span>
                  </div>
                  <p className="text-sm text-green-700 mt-1">
                    Your customers can now pay online with credit cards
                  </p>
                </div>
              ) : (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                    <span className="text-sm font-medium text-orange-800">Payment processing not set up</span>
                  </div>
                  <p className="text-sm text-orange-700 mt-1">
                    Connect a payment processor to accept credit card payments online
                  </p>
                </div>
              )}

              <button 
                onClick={handleSetupPaymentProcessor}
                disabled={saving}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Setting up...' : settings.paymentProcessorConnected ? 'Change Payment Processor' : 'Set Up Payment Processing'}
              </button>
            </div>

            {/* Tips */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Tips</h2>
              <p className="text-gray-600 mb-6">
                Allow customers to add tips when booking online or paying invoices. Tips are added to the total amount
                charged to the customer.
              </p>

              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">Online Booking Tips</h4>
                    <p className="text-sm text-gray-600">Prompt customers to add tips when booking online</p>
                  </div>
                  <button
                    onClick={() => setSettings({ ...settings, onlineBookingTips: !settings.onlineBookingTips })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.onlineBookingTips ? "bg-blue-600" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.onlineBookingTips ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">Invoice Payment Tips</h4>
                    <p className="text-sm text-gray-600">Prompt customers to add tips when paying invoices online</p>
                  </div>
                  <button
                    onClick={() => setSettings({ ...settings, invoicePaymentTips: !settings.invoicePaymentTips })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.invoicePaymentTips ? "bg-blue-600" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.invoicePaymentTips ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Custom Payment Methods */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Custom Payment Methods</h2>
              <p className="text-gray-600 mb-6">
                Add other ways customers can pay you outside of Serviceflow. Custom payment methods can be selected by
                customers booking online.
              </p>

              <div className="space-y-3 mb-4">
                {paymentMethods.map((method) => (
                  <div key={method.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div>
                      <span className="font-medium text-gray-900">{method.name}</span>
                      {method.description && (
                        <p className="text-sm text-gray-600 mt-1">{method.description}</p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => handleEditPaymentMethod(method)}
                        className="p-1 text-gray-400 hover:text-gray-600"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeletePaymentMethod(method.id)}
                        className="p-1 text-gray-400 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <button 
                onClick={() => setIsPaymentMethodModalOpen(true)}
                className="text-blue-600 hover:text-blue-700 font-medium text-sm"
              >
                + Custom Payment Method
              </button>
            </div>

            {/* Invoice Template */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Invoice Template</h2>
              <p className="text-gray-600 mb-6">
                Personalize the default memo and footer message that appear on your invoices, as well as your default
                payment terms.
              </p>
              <button className="text-blue-600 hover:text-blue-700 text-sm mb-6">Learn more about invoices</button>

              <div className="space-y-6">
                {/* Default Memo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Default memo</label>
                  <textarea
                    value={settings.defaultMemo}
                    onChange={(e) => setSettings({ ...settings, defaultMemo: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    rows={3}
                    placeholder="We appreciate your business."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This memo will be added to all new invoices. You can always customize it for individual invoices
                    later.
                  </p>
                </div>

                {/* Footer */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Footer</label>
                  <textarea
                    value={settings.invoiceFooter}
                    onChange={(e) => setSettings({ ...settings, invoiceFooter: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    rows={2}
                    placeholder="This will appear on the bottom invoice page and when printing an invoice"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This section will appear at the bottom of all new invoices you create. Use it to provide contact
                    details, help information, or payment terms.
                  </p>
                </div>

                {/* Payment Due */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment due</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      value={settings.paymentDueDays}
                      onChange={(e) => setSettings({ ...settings, paymentDueDays: parseInt(e.target.value) || 0 })}
                      className="w-20 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                    <select
                      value={settings.paymentDueUnit}
                      onChange={(e) => setSettings({ ...settings, paymentDueUnit: e.target.value })}
                      className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    >
                      <option value="days">days</option>
                      <option value="weeks">weeks</option>
                      <option value="months">months</option>
                    </select>
                    <span className="text-gray-600">after service date</span>
                  </div>
                </div>

                {/* Service Options */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={settings.showServicePrices}
                      onChange={(e) => setSettings({ ...settings, showServicePrices: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label className="text-sm text-gray-700">
                      Show prices of service options in service line items
                    </label>
                  </div>

                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={settings.showServiceDescriptions}
                      onChange={(e) => setSettings({ ...settings, showServiceDescriptions: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label className="text-sm text-gray-700">Show service descriptions in invoice line items</label>
                  </div>
                </div>

                {/* Custom Fields */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium text-gray-900">Custom Fields</h4>
                      <HelpCircle className="w-4 h-4 text-gray-400" />
                    </div>
                    <button className="text-blue-600 hover:text-blue-700 font-medium text-sm">Manage Fields</button>
                  </div>
                  <p className="text-sm text-gray-600">
                    Add custom information that appears on all your invoices (VAT number, license, certifications, etc.)
                  </p>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                onClick={handleSaveSettings}
                disabled={saving}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {isPaymentMethodModalOpen && (
        <CreateCustomPaymentMethodModal
          isOpen={isPaymentMethodModalOpen}
          onClose={() => {
            setIsPaymentMethodModalOpen(false)
            setEditingMethod(null)
          }}
          onSave={handleSavePaymentMethod}
          editingMethod={editingMethod}
        />
      )}
    </div>
  )
}

export default Payments

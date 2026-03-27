"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import Sidebar from "../../components/sidebar"
import CreateCustomPaymentMethodModal from "../../components/create-custom-payment-method-modal"
import { ChevronLeft, Edit, Trash2, Check, AlertCircle } from "lucide-react"
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
    paymentProcessorConnected: false,
    tipCalculationMode: "automatic",
    paymentTypeFees: {}
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
      
      setSettings({
        ...settingsData,
        tipCalculationMode: settingsData.tipCalculationMode || 'automatic',
        paymentTypeFees: settingsData.paymentTypeFees || {}
      })
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
      const { fee, ...methodData } = paymentMethod
      if (editingMethod) {
        await paymentMethodsAPI.updatePaymentMethod(editingMethod.id, methodData)
        // Update fee in settings if name changed
        const oldName = editingMethod.name
        const newName = methodData.name
        setPaymentMethods(prev =>
          prev.map(method =>
            method.id === editingMethod.id
              ? { ...method, ...methodData }
              : method
          )
        )
        setSettings(prev => {
          const fees = { ...prev.paymentTypeFees }
          if (oldName !== newName) delete fees[oldName]
          fees[newName] = fee
          return { ...prev, paymentTypeFees: fees }
        })
        setEditingMethod(null)
      } else {
        const newMethod = await paymentMethodsAPI.createPaymentMethod(methodData)
        setPaymentMethods(prev => [...prev, newMethod])
        setSettings(prev => ({
          ...prev,
          paymentTypeFees: { ...prev.paymentTypeFees, [methodData.name]: fee }
        }))
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
      <div className="flex h-screen bg-[var(--sf-bg-page)] overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex flex-col min-w-0 lg:ml-64 xl:ml-72">
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-[var(--sf-text-secondary)]">Loading payment settings...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-[var(--sf-bg-page)] overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 lg:ml-64 xl:ml-72">

        {/* Header */}
        <div className="bg-white border-b border-[var(--sf-border-light)] px-6 py-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate("/settings")}
              className="flex items-center space-x-2 text-[var(--sf-text-secondary)] hover:text-[var(--sf-text-primary)]"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm">Settings</span>
            </button>
            <h1 className="text-2xl font-semibold text-[var(--sf-text-primary)]">Payments</h1>
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
            <div className="bg-white rounded-lg border border-[var(--sf-border-light)] p-6">
              <h2 className="text-xl font-semibold text-[var(--sf-text-primary)] mb-4">Payment Processing</h2>
              <p className="text-[var(--sf-text-secondary)] mb-6">
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
                className="bg-[var(--sf-blue-500)] text-white px-4 py-2 rounded-lg font-medium hover:bg-[var(--sf-blue-600)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Setting up...' : settings.paymentProcessorConnected ? 'Change Payment Processor' : 'Set Up Payment Processing'}
              </button>
            </div>

            {/* Tips */}
            <div className="bg-white rounded-lg border border-[var(--sf-border-light)] p-6">
              <h2 className="text-xl font-semibold text-[var(--sf-text-primary)] mb-4">Tips</h2>
              <p className="text-[var(--sf-text-secondary)] mb-6">
                Configure how tips are calculated when recording payments. Tips go to payroll, not revenue.
              </p>

              <div className="space-y-6">
                {/* Tip Calculation Mode */}
                <div>
                  <h4 className="font-medium text-[var(--sf-text-primary)] mb-3">Tip Calculation</h4>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setSettings({ ...settings, tipCalculationMode: 'automatic' })}
                      style={{
                        flex: 1,
                        padding: '12px',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: 500,
                        transition: 'all 0.2s',
                        cursor: 'pointer',
                        border: settings.tipCalculationMode === 'automatic' ? '2px solid var(--sf-blue-500)' : '1.5px solid var(--sf-border-light)',
                        background: settings.tipCalculationMode === 'automatic' ? 'var(--sf-blue-50)' : 'white',
                        color: settings.tipCalculationMode === 'automatic' ? 'var(--sf-blue-500)' : 'var(--sf-text-secondary)',
                        boxShadow: 'none'
                      }}
                    >
                      <div style={{ fontWeight: 600, marginBottom: '4px' }}>Automatic</div>
                      <div style={{ fontSize: '12px', fontWeight: 400, opacity: 0.8 }}>Tip = Amount Paid - Total Due - Fee</div>
                    </button>
                    <button
                      onClick={() => setSettings({ ...settings, tipCalculationMode: 'manual' })}
                      style={{
                        flex: 1,
                        padding: '12px',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: 500,
                        transition: 'all 0.2s',
                        cursor: 'pointer',
                        border: settings.tipCalculationMode === 'manual' ? '2px solid var(--sf-blue-500)' : '1.5px solid var(--sf-border-light)',
                        background: settings.tipCalculationMode === 'manual' ? 'var(--sf-blue-50)' : 'white',
                        color: settings.tipCalculationMode === 'manual' ? 'var(--sf-blue-500)' : 'var(--sf-text-secondary)',
                        boxShadow: 'none'
                      }}
                    >
                      <div style={{ fontWeight: 600, marginBottom: '4px' }}>Manual</div>
                      <div style={{ fontSize: '12px', fontWeight: 400, opacity: 0.8 }}>Enter tip amount manually each time</div>
                    </button>
                  </div>
                </div>

                {/* Payment Type Fees */}
                <div>
                  <h4 className="font-medium text-[var(--sf-text-primary)] mb-1">Processing Fees by Payment Type</h4>
                  <p className="text-xs text-[var(--sf-text-muted)] mb-3">
                    Set the processing fee percentage for each payment type. Fee is deducted before calculating tips. Set to 0 for no fee.
                  </p>
                  <div className="space-y-3">
                    {/* Built-in payment types */}
                    {[
                      { key: 'cash', label: 'Cash' },
                      { key: 'check', label: 'Check' },
                      { key: 'credit_card', label: 'Credit Card' },
                      { key: 'bank_transfer', label: 'Bank Transfer' },
                    ].map(({ key, label }) => (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-sm text-[var(--sf-text-primary)]">{label}</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            value={settings.paymentTypeFees?.[key] ?? 0}
                            onChange={(e) => setSettings(prev => ({
                              ...prev,
                              paymentTypeFees: {
                                ...prev.paymentTypeFees,
                                [key]: parseFloat(e.target.value) || 0
                              }
                            }))}
                            className="w-20 text-right border border-[var(--sf-border-light)] rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-[var(--sf-blue-500)] focus:border-[var(--sf-blue-500)] outline-none"
                          />
                          <span className="text-sm text-[var(--sf-text-muted)]">%</span>
                        </div>
                      </div>
                    ))}

                    {/* Custom payment methods with fee + edit/delete */}
                    {paymentMethods.map((method) => (
                      <div key={method.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-[var(--sf-text-primary)]">{method.name}</span>
                          <button
                            onClick={() => handleEditPaymentMethod(method)}
                            className="p-0.5 text-[var(--sf-text-muted)] hover:text-[var(--sf-text-secondary)]"
                            style={{ border: 'none', background: 'none', boxShadow: 'none', borderRadius: '4px', padding: '2px' }}
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeletePaymentMethod(method.id)}
                            className="p-0.5 text-[var(--sf-text-muted)] hover:text-red-600"
                            style={{ border: 'none', background: 'none', boxShadow: 'none', borderRadius: '4px', padding: '2px' }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            value={settings.paymentTypeFees?.[method.name] ?? 0}
                            onChange={(e) => setSettings(prev => ({
                              ...prev,
                              paymentTypeFees: {
                                ...prev.paymentTypeFees,
                                [method.name]: parseFloat(e.target.value) || 0
                              }
                            }))}
                            className="w-20 text-right border border-[var(--sf-border-light)] rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-[var(--sf-blue-500)] focus:border-[var(--sf-blue-500)] outline-none"
                          />
                          <span className="text-sm text-[var(--sf-text-muted)]">%</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add custom payment method */}
                  <button
                    onClick={() => { setEditingMethod(null); setIsPaymentMethodModalOpen(true) }}
                    className="mt-3 text-[var(--sf-blue-500)] font-medium text-sm"
                    style={{ border: 'none', background: 'none', boxShadow: 'none', padding: 0, borderRadius: 0 }}
                  >
                    + Custom Payment Method
                  </button>
                </div>

                {/* Online Booking/Invoice Tips */}
                <div className="border-t border-[var(--sf-border-light)] pt-6">
                  <h4 className="font-medium text-[var(--sf-text-primary)] mb-4">Customer-Facing Tips</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-medium text-[var(--sf-text-primary)]">Online Booking Tips</span>
                        <p className="text-xs text-[var(--sf-text-secondary)]">Prompt customers to add tips when booking online</p>
                      </div>
                      <button
                        onClick={() => setSettings({ ...settings, onlineBookingTips: !settings.onlineBookingTips })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          settings.onlineBookingTips ? "bg-[var(--sf-blue-500)]" : "bg-gray-300"
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings.onlineBookingTips ? "translate-x-6" : "translate-x-1"
                        }`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-medium text-[var(--sf-text-primary)]">Invoice Payment Tips</span>
                        <p className="text-xs text-[var(--sf-text-secondary)]">Prompt customers to add tips when paying invoices online</p>
                      </div>
                      <button
                        onClick={() => setSettings({ ...settings, invoicePaymentTips: !settings.invoicePaymentTips })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          settings.invoicePaymentTips ? "bg-[var(--sf-blue-500)]" : "bg-gray-300"
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings.invoicePaymentTips ? "translate-x-6" : "translate-x-1"
                        }`} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                onClick={handleSaveSettings}
                disabled={saving}
                className="bg-[var(--sf-blue-500)] text-white px-6 py-2 rounded-lg font-medium hover:bg-[var(--sf-blue-600)] disabled:opacity-50 disabled:cursor-not-allowed"
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
          initialFee={editingMethod ? (settings.paymentTypeFees?.[editingMethod.name] ?? 0) : 0}
        />
      )}
    </div>
  )
}

export default Payments

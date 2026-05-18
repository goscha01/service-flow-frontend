"use client"

import { useState, useEffect } from "react"
import CreateCustomPaymentMethodModal from "../../components/create-custom-payment-method-modal"
import StripeAPISetup from "../../components/StripeAPISetup"
import { Edit, Trash2, Check, AlertCircle, Plus } from "lucide-react"
import { paymentSettingsAPI, paymentMethodsAPI, stripeAPI } from "../../services/api"
import { useAuth } from "../../context/AuthContext"
import SettingsPageLayout from "../../components/settings-page-layout"

const Payments = () => {
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
  const [stripeStatus, setStripeStatus] = useState(null)

  useEffect(() => {
    if (user) {
      loadPaymentData()
      loadStripeStatus()
    }
  }, [user])

  const loadStripeStatus = async () => {
    try {
      const r = await stripeAPI.testConnection()
      setStripeStatus({ connected: !!r.connected, charges_enabled: r.charges_enabled })
    } catch {/* silent */}
  }

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
      <SettingsPageLayout title="Payments">
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-[var(--sf-text-secondary)]">Loading payment settings…</p>
          </div>
        </div>
      </SettingsPageLayout>
    )
  }

  return (
    <SettingsPageLayout
      title="Payments"
      subtitle="Configure payment processing, tip calculation, and processing fees"
    >
        {/* Content */}
        <div className="space-y-8">
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

            {/* Stripe account — moved from Billing. This is the
                merchant Stripe Connect setup, used to charge YOUR
                customers (not your ServiceFlow subscription). */}
            <div className="bg-white rounded-lg border border-[var(--sf-border-light)] p-6">
              <div className="flex items-start justify-between mb-2 flex-wrap gap-2">
                <div>
                  <h2 className="text-xl font-semibold text-[var(--sf-text-primary)]">Stripe account</h2>
                  <p className="text-[var(--sf-text-secondary)] text-sm mt-1">
                    Connect Stripe to accept card payments from your customers online and via invoices.
                  </p>
                </div>
                {stripeStatus?.connected && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-full" style={{ background: 'var(--sf-green-soft)', color: 'var(--sf-green-dark)' }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--sf-green)' }} />
                    Connected
                  </span>
                )}
              </div>
              {stripeStatus?.connected ? (
                <div className="rounded-md flex items-center gap-3 mt-4" style={{ padding: '12px 14px', background: 'var(--sf-green-soft)', border: '1px solid rgba(22,163,74,.25)', color: 'var(--sf-green-dark)' }}>
                  <Check size={16} />
                  <div>
                    <div className="text-[13px] font-semibold">Stripe account connected</div>
                    <div className="text-[11.5px]" style={{ opacity: 0.85 }}>
                      {stripeStatus.charges_enabled ? 'Ready to accept payments' : 'Account setup in progress'}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-4">
                  <StripeAPISetup
                    onSuccess={() => {
                      setMessage({ type: 'success', text: 'Stripe connected' })
                      loadStripeStatus()
                    }}
                    onError={() => setMessage({ type: 'error', text: 'Failed to connect Stripe' })}
                  />
                </div>
              )}
            </div>

            {/* Tips */}
            <div className="bg-white rounded-lg border border-[var(--sf-border-light)] p-6">
              <h2 className="text-xl font-semibold text-[var(--sf-text-primary)] mb-1">Tips</h2>
              <p className="text-[var(--sf-text-secondary)] text-sm mb-5">
                Configure how tips are calculated and whether customers see a tip prompt. Tips go to payroll, not revenue.
              </p>

              <div className="space-y-6">
                {/* Tip Calculation Mode */}
                <div>
                  <h4 className="font-medium text-[var(--sf-text-primary)] mb-3">Tip calculation</h4>
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
                      <div style={{ fontSize: '12px', fontWeight: 400, opacity: 0.8 }}>Tip = Amount paid − Total due − Fee</div>
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

                {/* Customer-Facing Tips */}
                <div className="border-t border-[var(--sf-border-light)] pt-6">
                  <h4 className="font-medium text-[var(--sf-text-primary)] mb-4">Customer-facing tips</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-medium text-[var(--sf-text-primary)]">Online booking tips</span>
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
                        <span className="text-sm font-medium text-[var(--sf-text-primary)]">Invoice payment tips</span>
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

            {/* Accepted payment methods */}
            <div className="bg-white rounded-lg border border-[var(--sf-border-light)] p-6">
              <div className="flex items-start justify-between mb-2 flex-wrap gap-2">
                <div>
                  <h2 className="text-xl font-semibold text-[var(--sf-text-primary)]">Accepted payment methods</h2>
                  <p className="text-[var(--sf-text-secondary)] text-sm mt-1">
                    Methods you can mark a payment as. Per-type fee % is deducted before calculating tips.
                  </p>
                </div>
                <button
                  onClick={() => { setEditingMethod(null); setIsPaymentMethodModalOpen(true) }}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md"
                  style={{
                    background: 'var(--sf-panel)',
                    border: '1px solid var(--sf-border-2, var(--sf-border-light))',
                    color: 'var(--sf-ink-2)',
                    cursor: 'pointer',
                  }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Custom method
                </button>
              </div>

              <div className="mt-4 divide-y divide-[var(--sf-border-light)]">
                {/* Built-in types */}
                {[
                  { key: 'cash', label: 'Cash' },
                  { key: 'check', label: 'Check' },
                  { key: 'credit_card', label: 'Credit card' },
                  { key: 'bank_transfer', label: 'Bank transfer' },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between py-3">
                    <span className="text-sm font-medium text-[var(--sf-text-primary)]">{label}</span>
                    <FeeInput
                      value={settings.paymentTypeFees?.[key] ?? 0}
                      onChange={(v) => setSettings((p) => ({
                        ...p,
                        paymentTypeFees: { ...p.paymentTypeFees, [key]: v },
                      }))}
                    />
                  </div>
                ))}

                {/* Custom methods */}
                {paymentMethods.map((method) => (
                  <div key={method.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-medium text-[var(--sf-text-primary)] truncate">{method.name}</span>
                      <button
                        onClick={() => handleEditPaymentMethod(method)}
                        className="p-1 text-[var(--sf-text-muted)] hover:text-[var(--sf-text-secondary)]"
                        style={{ border: 'none', background: 'none', cursor: 'pointer' }}
                        aria-label="Edit"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeletePaymentMethod(method.id)}
                        className="p-1 text-[var(--sf-text-muted)] hover:text-red-600"
                        style={{ border: 'none', background: 'none', cursor: 'pointer' }}
                        aria-label="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <FeeInput
                      value={settings.paymentTypeFees?.[method.name] ?? 0}
                      onChange={(v) => setSettings((p) => ({
                        ...p,
                        paymentTypeFees: { ...p.paymentTypeFees, [method.name]: v },
                      }))}
                    />
                  </div>
                ))}
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
    </SettingsPageLayout>
  )
}

const FeeInput = ({ value, onChange }) => (
  <div className="flex items-center gap-1 flex-shrink-0">
    <input
      type="number"
      step="0.1"
      min="0"
      max="100"
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      className="w-20 text-right border border-[var(--sf-border-light)] rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-[var(--sf-blue-500)] focus:border-[var(--sf-blue-500)] outline-none"
    />
    <span className="text-sm text-[var(--sf-text-muted)]">%</span>
  </div>
)

export default Payments

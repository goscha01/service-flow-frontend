"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import Sidebar from "../../components/sidebar"
import MobileHeader from "../../components/mobile-header"
import PlanSelectionModal from "../../components/plan-selection-modal"
import { ChevronLeft, Lock, Check, X } from "lucide-react"
import { billingAPI } from "../../services/api"
import { useAuth } from "../../context/AuthContext"

const BillingSettings = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const navigate = useNavigate()
  
  const [billingDetails, setBillingDetails] = useState({
    currentPlan: "Standard",
    isTrial: true,
    trialDaysLeft: 14,
    trialEndDate: "July 4",
    monthlyPrice: 29,
    cardNumber: ""
  })

  const [cardData, setCardData] = useState({
    cardNumber: "",
    expiryMonth: "",
    expiryYear: "",
    cvc: ""
  })

  const { user } = useAuth()

  useEffect(() => {
    if (user?.id) {
      loadBillingData()
    } else if (user === null) {
      navigate('/signin')
    }
  }, [user?.id, navigate])

  const loadBillingData = async () => {
    try {
      setLoading(true)
      const billing = await billingAPI.getBilling(user.id)
      setBillingDetails(billing)
    } catch (error) {
      console.error('Error loading billing data:', error)
      setMessage({ type: 'error', text: 'Failed to load billing information' })
    } finally {
      setLoading(false)
    }
  }

  const handleStartSubscription = async () => {
    if (!cardData.cardNumber || !cardData.expiryMonth || !cardData.expiryYear || !cardData.cvc) {
      setMessage({ type: 'error', text: 'Please fill in all card details' })
      return
    }

    if (cardData.cardNumber.length < 13) {
      setMessage({ type: 'error', text: 'Please enter a valid card number' })
      return
    }

    try {
      setSaving(true)
      await billingAPI.createSubscription({
        userId: user.id,
        plan: billingDetails.currentPlan,
        cardNumber: cardData.cardNumber,
        expiryMonth: cardData.expiryMonth,
        expiryYear: cardData.expiryYear,
        cvc: cardData.cvc
      })
      
      setMessage({ type: 'success', text: 'Subscription created successfully!' })
      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
      loadBillingData() // Reload billing data
    } catch (error) {
      console.error('Error creating subscription:', error)
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to create subscription' })
    } finally {
      setSaving(false)
    }
  }

  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
    const matches = v.match(/\d{4,16}/g)
    const match = matches && matches[0] || ''
    const parts = []
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4))
    }
    if (parts.length) {
      return parts.join(' ')
    } else {
      return v
    }
  }

  const handleCardNumberChange = (e) => {
    const formatted = formatCardNumber(e.target.value)
    setCardData(prev => ({ ...prev, cardNumber: formatted }))
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
          <MobileHeader onMenuClick={() => setSidebarOpen(true)} />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading billing information...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        <MobileHeader onMenuClick={() => setSidebarOpen(true)} />

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
            <h1 className="text-2xl font-semibold text-gray-900">Zenbooker Account</h1>
          </div>
        </div>

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

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-4xl mx-auto p-6">
            {/* Current Plan Section */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-600">Current plan</h3>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-xl font-semibold text-gray-900">{billingDetails.currentPlan}</span>
                    {billingDetails.isTrial && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-sm rounded">Trial</span>
                    )}
                  </div>
                </div>
                <button 
                  onClick={() => setIsPlanModalOpen(true)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Change Plan
                </button>
              </div>
              
              {billingDetails.isTrial && (
              <div>
                <h3 className="text-sm font-medium text-gray-600">Trial status</h3>
                <p className="text-gray-900 mt-1">{billingDetails.trialDaysLeft} days left</p>
              </div>
              )}
            </div>

            {/* Subscription Card */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                  Subscribe to Zenbooker for ${billingDetails.monthlyPrice}/month USD
                </h2>
                <h3 className="text-lg text-gray-700 mb-4">
                  to keep using your account.
                </h3>
                <p className="text-gray-600">
                  You can cancel any time and you won't be charged until after<br />
                  your trial ends on {billingDetails.trialEndDate}
                </p>
              </div>

              {/* Card Input */}
              <div className="max-w-lg mx-auto">
                <div className="mb-6">
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                    Card number
                    <Lock className="w-4 h-4 text-gray-400 ml-1" />
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Card number"
                      className="w-full px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={cardData.cardNumber}
                      onChange={handleCardNumberChange}
                      maxLength="19"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center">
                      <input
                        type="text"
                        placeholder="MM"
                        className="w-16 px-3 py-2 border-t border-b border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={cardData.expiryMonth}
                        onChange={(e) => setCardData(prev => ({ ...prev, expiryMonth: e.target.value }))}
                        maxLength="2"
                      />
                      <span className="px-1 text-gray-400">/</span>
                      <input
                        type="text"
                        placeholder="YY"
                        className="w-16 px-3 py-2 border-t border-b border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={cardData.expiryYear}
                        onChange={(e) => setCardData(prev => ({ ...prev, expiryYear: e.target.value }))}
                        maxLength="2"
                      />
                      <input
                        type="text"
                        placeholder="CVC"
                        className="w-16 px-3 py-2 border border-gray-300 rounded-r-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={cardData.cvc}
                        onChange={(e) => setCardData(prev => ({ ...prev, cvc: e.target.value }))}
                        maxLength="4"
                      />
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleStartSubscription}
                  disabled={saving}
                  className="w-full px-4 py-3 bg-blue-500 text-white rounded-md font-medium hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Processing...' : `Start Subscription on ${billingDetails.trialEndDate}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Plan Selection Modal */}
      <PlanSelectionModal 
        isOpen={isPlanModalOpen}
        onClose={() => setIsPlanModalOpen(false)}
      />
    </div>
  )
}

export default BillingSettings
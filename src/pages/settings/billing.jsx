import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import Sidebar from "../../components/sidebar"
import MobileHeader from "../../components/mobile-header"
import PlanSelectionModal from "../../components/plan-selection-modal"
import { ChevronLeft, Lock, Check, X, CreditCard, Calendar, AlertCircle } from "lucide-react"
import { billingAPI } from "../../services/api"
import { useAuth } from "../../context/AuthContext"
import { loadStripe } from "@stripe/stripe-js"
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js"

// Initialize Stripe (you'll need to add your publishable key to .env)
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || 'pk_test_51QKpqSCEs5M0Zlj5PlrkzA9w688adVtvGVskrKoIJdQxHLkBjawv3TBaxN0MIqSwZDT9Ph0dnf4IrB4SGafAGHUd00i2ADTJe8')

const PaymentForm = ({ onSuccess, plan, loading, setLoading }) => {
  const stripe = useStripe()
  const elements = useElements()
  const { user } = useAuth()
  const [clientSecret, setClientSecret] = useState('')
  const [error, setError] = useState('')

    

  useEffect(() => {
    // Create setup intent when component mounts
    const createSetupIntent = async () => {
      try {
        const response = await billingAPI.createSetupIntent({
          userId: user.id,
          email: user.email,
          name: user.name || user.email
        })
        setClientSecret(response.setup_intent)
      } catch (error) {
        console.error('Error creating setup intent:', error)
        setError('Failed to initialize payment form')
      }
    }

    if (user?.id) {
      createSetupIntent()
    }
  }, [user])

  const handleSubmit = async (event) => {
    event.preventDefault()
    
    if (!stripe || !elements || !clientSecret) {
      return
    }

    setLoading(true)
    setError('')

    const cardElement = elements.getElement(CardElement)

    try {
      // Confirm the setup intent
      const { error: stripeError, setupIntent } = await stripe.confirmCardSetup(
        clientSecret,
        {
          payment_method: {
            card: cardElement,
            billing_details: {
              name: user.name || user.email,
              email: user.email,
            },
          }
        }
      )

      if (stripeError) {
        setError(stripeError.message)
        return
      }

      // Create subscription using the payment method
      await billingAPI.createSubscription({
        userId: user.id,
        plan: plan,
        paymentMethodId: setupIntent.payment_method
      })

      onSuccess()
    } catch (error) {
      console.error('Payment error:', error)
      setError(error.response?.data?.error || 'Payment failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#374151',
        '::placeholder': {
          color: '#9CA3AF',
        },
      },
      invalid: {
        color: '#EF4444',
      },
    },
    hidePostalCode: true,
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg mx-auto">
      <div className="mb-6">
        <label className="flex items-center text-sm font-medium text-gray-700 mb-3">
          <CreditCard className="w-4 h-4 mr-2" />
          Card Details
          <Lock className="w-4 h-4 text-gray-400 ml-2" />
        </label>
        <div className="border border-gray-300 rounded-md p-3 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
          <CardElement options={cardElementOptions} />
        </div>
        {error && (
          <div className="mt-2 flex items-center text-sm text-red-600">
            <AlertCircle className="w-4 h-4 mr-1" />
            {error}
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full px-4 py-3 bg-blue-500 text-white rounded-md font-medium hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Processing...' : `Start ${plan} Subscription`}
      </button>
    </form>
  )
}

const BillingSettings = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [paymentMethods, setPaymentMethods] = useState([])
  const navigate = useNavigate()
  
  const [billingDetails, setBillingDetails] = useState({
    currentPlan: "Standard",
    isTrial: true,
    trialDaysLeft: 14,
    trialEndDate: "July 4",
    monthlyPrice: 29,
    cardNumber: "",
    subscriptionStatus: 'trialing'
  })

  const { user } = useAuth()

  useEffect(() => {
    if (user?.id) {
      loadBillingData()
      loadPaymentMethods()
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

  const loadPaymentMethods = async () => {
    try {
      const methods = await billingAPI.getPaymentMethods(user.id)
      setPaymentMethods(methods.payment_methods || [])
    } catch (error) {
      console.error('Error loading payment methods:', error)
    }
  }

  const handleSubscriptionSuccess = () => {
    setMessage({ type: 'success', text: 'Subscription created successfully!' })
    setTimeout(() => setMessage({ type: '', text: '' }), 3000)
    loadBillingData()
    loadPaymentMethods()
  }

  const handleCancelSubscription = async () => {
    if (!window.confirm('Are you sure you want to cancel your subscription? You\'ll continue to have access until the end of your current billing period.')) {
      return
    }

    try {
      setSaving(true)
      await billingAPI.cancelSubscription(user.id)
      setMessage({ type: 'success', text: 'Subscription cancelled successfully. You\'ll continue to have access until the end of your billing period.' })
      setTimeout(() => setMessage({ type: '', text: '' }), 5000)
      loadBillingData()
    } catch (error) {
      console.error('Error cancelling subscription:', error)
      setMessage({ type: 'error', text: 'Failed to cancel subscription' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex flex-col min-w-0 lg:ml-64 xl:ml-72">
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

      <div className="flex-1 flex flex-col min-w-0 lg:ml-64 xl:ml-72">
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
            <h1 className="text-2xl font-semibold text-gray-900">Billing & Subscription</h1>
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
                    {billingDetails.subscriptionStatus === 'canceled' && (
                      <span className="px-2 py-1 bg-red-100 text-red-600 text-sm rounded">Cancelled</span>
                    )}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button 
                    onClick={() => setIsPlanModalOpen(true)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Change Plan
                  </button>
                  {billingDetails.subscriptionStatus === 'active' && (
                    <button
                      onClick={handleCancelSubscription}
                      disabled={saving}
                      className="px-4 py-2 text-sm font-medium text-red-700 bg-white border border-red-300 rounded-md hover:bg-red-50 disabled:opacity-50"
                    >
                      {saving ? 'Cancelling...' : 'Cancel'}
                    </button>
                  )}
                </div>
              </div>
              
              {billingDetails.isTrial && (
                <div>
                  <h3 className="text-sm font-medium text-gray-600">Trial status</h3>
                  <p className="text-gray-900 mt-1">{billingDetails.trialDaysLeft} days left</p>
                </div>
              )}
            </div>

            {/* Payment Methods Section */}
            {paymentMethods.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Methods</h3>
                <div className="space-y-3">
                  {paymentMethods.map((method) => (
                    <div key={method.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <CreditCard className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {method.brand.toUpperCase()} •••• {method.last4}
                          </p>
                          <p className="text-sm text-gray-500">
                            Expires {method.exp_month}/{method.exp_year}
                          </p>
                        </div>
                      </div>
                      <span className="text-sm text-blue-600">Default</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Subscription Setup Card */}
            {billingDetails.isTrial && paymentMethods.length === 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                    Subscribe to Serviceflow for ${billingDetails.monthlyPrice}/month USD
                  </h2>
                  <h3 className="text-lg text-gray-700 mb-4">
                    to keep using your account.
                  </h3>
                  <p className="text-gray-600">
                    You can cancel any time and you won't be charged until after<br />
                    your trial ends on {billingDetails.trialEndDate}
                  </p>
                </div>

                <Elements stripe={stripePromise}>
                  <PaymentForm 
                    onSuccess={handleSubscriptionSuccess}
                    plan={billingDetails.currentPlan}
                    loading={saving}
                    setLoading={setSaving}
                  />
                </Elements>
              </div>
            )}

            {/* Active Subscription Info */}
            {!billingDetails.isTrial && paymentMethods.length > 0 && (
              <div className="bg-green-50 rounded-lg border border-green-200 p-6">
                <div className="flex items-center space-x-3">
                  <Check className="w-6 h-6 text-green-500" />
                  <div>
                    <h3 className="text-lg font-medium text-green-900">
                      Your {billingDetails.currentPlan} subscription is active
                    </h3>
                    <p className="text-green-700">
                      Next billing date: {billingDetails.trialEndDate}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Plan Selection Modal */}
      <PlanSelectionModal 
        isOpen={isPlanModalOpen}
        onClose={() => setIsPlanModalOpen(false)}
        onPlanSelect={(plan) => {
          setBillingDetails(prev => ({ ...prev, currentPlan: plan.name, monthlyPrice: plan.price }))
          setIsPlanModalOpen(false)
        }}
      />
    </div>
  )
}

export default BillingSettings
import { useState } from 'react'
import api from '../services/api'

const StripeConnectOnboarding = ({ onSuccess, onError }) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleConnectAccount = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await api.post('/stripe/connect/account-link', {
        return_url: `${window.location.origin}/dashboard?stripe_connect=success`,
        refresh_url: `${window.location.origin}/dashboard?stripe_connect=refresh`,
      })

      const { url } = response.data
      window.location.href = url
    } catch (error) {
      console.error('Stripe Connect error:', error)
      setError('Failed to connect Stripe account. Please try again.')
      onError?.(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="text-center mb-6">
        <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Connect Your Stripe Account
        </h3>
        <p className="text-gray-600 text-sm">
          Connect your Stripe account to start accepting payments and manage your business finances.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          <div className="text-sm text-gray-600">
            <p>Accept payments from customers worldwide</p>
          </div>
        </div>

        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          <div className="text-sm text-gray-600">
            <p>Manage your business finances in one place</p>
          </div>
        </div>

        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          <div className="text-sm text-gray-600">
            <p>Access detailed reporting and analytics</p>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <button
          onClick={handleConnectAccount}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-medium py-3 px-4 rounded-lg transition-colors"
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Connecting...
            </div>
          ) : (
            'Connect Stripe Account'
          )}
        </button>
      </div>

      <div className="mt-4 text-center">
        <p className="text-xs text-gray-500">
          By connecting your account, you agree to Stripe's{' '}
          <a href="https://stripe.com/connect-account/legal" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
            Terms of Service
          </a>
        </p>
      </div>
    </div>
  )
}

export default StripeConnectOnboarding

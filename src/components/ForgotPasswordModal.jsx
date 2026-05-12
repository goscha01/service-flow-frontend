import { useState } from "react"
import { X } from "lucide-react"

const API_BASE = process.env.REACT_APP_API_URL || 'https://service-flow-backend-production-4568.up.railway.app/api'

export default function ForgotPasswordModal({ open, onClose }) {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [isError, setIsError] = useState(false)

  if (!open) return null

  const close = () => {
    setEmail("")
    setMessage("")
    setIsError(false)
    setLoading(false)
    onClose?.()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const trimmed = email.trim()
    if (!trimmed) {
      setMessage("Please enter your email address")
      setIsError(true)
      return
    }

    setLoading(true)
    setMessage("")
    setIsError(false)

    try {
      const response = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed })
      })
      const data = await response.json().catch(() => ({}))

      if (response.ok) {
        setMessage(data.message || "If an account with that email exists, password reset instructions have been sent.")
        setIsError(false)
        setEmail("")
      } else {
        setMessage(data.error || "Failed to send reset email. Please try again.")
        setIsError(true)
      }
    } catch (err) {
      console.error('Forgot password error:', err)
      setMessage("Network error. Please check your connection and try again.")
      setIsError(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      role="dialog"
      aria-modal="true"
      onClick={(e) => { if (e.target === e.currentTarget) close() }}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Reset Password</h3>
          <button
            type="button"
            onClick={close}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Enter your email address and we'll send you instructions to reset your password. If you have both an owner account and a team-member account on the same email, you'll get a separate email for each.
        </p>

        {message && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${
            isError
              ? "bg-red-50 text-red-800 border border-red-200"
              : "bg-green-50 text-green-800 border border-green-200"
          }`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="forgot-password-email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              id="forgot-password-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="flex space-x-3">
            <button
              type="button"
              onClick={close}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Sending..." : "Send Reset Email"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

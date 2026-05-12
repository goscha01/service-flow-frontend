import { useState } from "react"
import { X, CheckCircle2, Mail } from "lucide-react"

const API_BASE = process.env.REACT_APP_API_URL || 'https://service-flow-backend-production-4568.up.railway.app/api'

export default function ForgotPasswordModal({ open, onClose }) {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  const [sent, setSent] = useState(false)
  const [submittedTo, setSubmittedTo] = useState("")

  if (!open) return null

  const close = () => {
    setEmail("")
    setErrorMsg("")
    setSent(false)
    setSubmittedTo("")
    setLoading(false)
    onClose?.()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const trimmed = email.trim()
    if (!trimmed) {
      setErrorMsg("Please enter your email address")
      return
    }

    setLoading(true)
    setErrorMsg("")

    try {
      const response = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed })
      })
      const data = await response.json().catch(() => ({}))

      if (response.ok) {
        setSent(true)
        setSubmittedTo(trimmed)
        setEmail("")
      } else {
        setErrorMsg(data.error || "Failed to send reset email. Please try again.")
      }
    } catch (err) {
      console.error('Forgot password error:', err)
      setErrorMsg("Network error. Please check your connection and try again.")
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
          <h3 className="text-lg font-semibold text-gray-900">
            {sent ? "Check your email" : "Reset Password"}
          </h3>
          <button
            type="button"
            onClick={close}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {sent ? (
          <div className="text-center py-2">
            <div className="mx-auto w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <p className="text-sm text-gray-700 mb-2">
              If an account exists for <strong className="break-all">{submittedTo}</strong>, we've sent reset instructions to that address.
            </p>
            <p className="text-sm text-gray-600 mb-1">
              If you have both an owner account and a team-member account on this email, you'll receive a separate message for each.
            </p>
            <p className="text-xs text-gray-500 mb-6">
              The link expires in 1 hour. If you don't see it, check spam/promotions.
            </p>
            <button
              type="button"
              onClick={close}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
            >
              Got it
            </button>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-600 mb-4 flex items-start gap-2">
              <Mail className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <span>Enter your email and we'll send instructions to reset your password.</span>
            </p>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-lg text-sm bg-red-50 text-red-800 border border-red-200">
                {errorMsg}
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
          </>
        )}
      </div>
    </div>
  )
}

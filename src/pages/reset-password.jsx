import { useState, useMemo } from "react"
import { useNavigate, useSearchParams, Link } from "react-router-dom"
import { Eye, EyeOff, Lock, CheckCircle2, AlertTriangle } from "lucide-react"

const API_BASE = process.env.REACT_APP_API_URL || 'https://service-flow-backend-production-4568.up.railway.app/api'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = useMemo(() => searchParams.get('token') || '', [searchParams])

  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  const [success, setSuccess] = useState(false)
  const [accountType, setAccountType] = useState(null)

  const passwordTooShort = password.length > 0 && password.length < 6
  const passwordsMismatch = confirm.length > 0 && password !== confirm
  const canSubmit = !!token && password.length >= 6 && password === confirm && !loading

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!token) {
      setErrorMsg("Missing reset token. Please use the link from your email.")
      return
    }
    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters.")
      return
    }
    if (password !== confirm) {
      setErrorMsg("Passwords don't match.")
      return
    }

    setLoading(true)
    setErrorMsg("")

    try {
      const response = await fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password })
      })
      const data = await response.json().catch(() => ({}))

      if (response.ok) {
        setSuccess(true)
        setAccountType(data.accountType || null)
        setPassword("")
        setConfirm("")
      } else {
        setErrorMsg(data.error || "Failed to reset password. Please try again.")
      }
    } catch (err) {
      console.error('Reset password error:', err)
      setErrorMsg("Network error. Please check your connection and try again.")
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Invalid reset link</h1>
          <p className="text-sm text-gray-600 mb-6">
            This page expects a token from the password reset email. Please open the link from your email, or request a new one.
          </p>
          <Link
            to="/signin"
            className="inline-block bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    )
  }

  if (success) {
    const signInPath = accountType === 'team_member' ? '/team-member/login' : '/signin'
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-3" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Password updated</h1>
          <p className="text-sm text-gray-600 mb-6">
            Your password has been reset. You can now sign in with your new password.
          </p>
          <button
            onClick={() => navigate(signInPath)}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700"
          >
            Go to sign in
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <h1 className="text-xl font-semibold text-gray-900 mb-2 text-center">Choose a new password</h1>
          <p className="text-sm text-gray-600 mb-6 text-center">
            Enter your new password below. It must be at least 6 characters.
          </p>

          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-600 text-sm font-medium">{errorMsg}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                  <Lock className="w-4 h-4 text-gray-400" />
                </div>
                <input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    passwordTooShort ? "border-red-400" : "border-gray-300"
                  }`}
                  placeholder="At least 6 characters"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {passwordTooShort && (
                <p className="mt-1 text-xs text-red-600">Password must be at least 6 characters.</p>
              )}
            </div>

            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                  <Lock className="w-4 h-4 text-gray-400" />
                </div>
                <input
                  id="confirm-password"
                  type={showPassword ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    passwordsMismatch ? "border-red-400" : "border-gray-300"
                  }`}
                  placeholder="Re-enter your new password"
                  required
                  minLength={6}
                />
              </div>
              {passwordsMismatch && (
                <p className="mt-1 text-xs text-red-600">Passwords don't match.</p>
              )}
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                canSubmit
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-gray-200 text-gray-500 cursor-not-allowed"
              }`}
            >
              {loading ? "Updating..." : "Update password"}
            </button>
          </form>
        </div>

        <div className="text-center mt-6">
          <Link to="/signin" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  )
}

"use client"

import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { Eye, EyeOff, User, Lock, Smartphone, X } from "lucide-react"
import { useTeamMemberAuth } from "../context/TeamMemberAuthContext"

const TeamMemberLogin = () => {
  const navigate = useNavigate()
  const { login, loading, error } = useTeamMemberAuth()
  const [formData, setFormData] = useState({
    username: "",
    password: ""
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [resetEmail, setResetEmail] = useState("")
  const [resetLoading, setResetLoading] = useState(false)
  const [resetMessage, setResetMessage] = useState("")

  // Refs for autofill sync
  const usernameRef = useRef(null)
  const passwordRef = useRef(null)

  // On mount, sync autofilled values into state
  useEffect(() => {
    // Timeout allows browser autofill to populate fields first
    setTimeout(() => {
      const username = usernameRef.current?.value || ""
      const password = passwordRef.current?.value || ""
      if (username || password) {
        setFormData({ username, password })
      }
    }, 100)

    // Listen for autofill events
    const handleAutofill = () => {
      setTimeout(() => {
        const username = usernameRef.current?.value || ""
        const password = passwordRef.current?.value || ""
        if (username || password) {
          setFormData({ username, password })
        }
      }, 50)
    }

    // Add event listeners for autofill detection
    const usernameInput = usernameRef.current
    const passwordInput = passwordRef.current

    if (usernameInput) {
      usernameInput.addEventListener('animationstart', handleAutofill)
      usernameInput.addEventListener('change', handleAutofill)
    }
    if (passwordInput) {
      passwordInput.addEventListener('animationstart', handleAutofill)
      passwordInput.addEventListener('change', handleAutofill)
    }

    return () => {
      if (usernameInput) {
        usernameInput.removeEventListener('animationstart', handleAutofill)
        usernameInput.removeEventListener('change', handleAutofill)
      }
      if (passwordInput) {
        passwordInput.removeEventListener('animationstart', handleAutofill)
        passwordInput.removeEventListener('change', handleAutofill)
      }
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    const result = await login(formData.username, formData.password)
    if (result.success) {
      navigate('/team-member/field-app')
    }
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleForgotPassword = async (e) => {
    e.preventDefault()
    if (!resetEmail.trim()) {
      setResetMessage("Please enter your email address")
      return
    }

    setResetLoading(true)
    setResetMessage("")

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'https://service-flow-backend-production-4568.up.railway.app/api'}/team-members/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: resetEmail })
      })

      if (response.ok) {
        setResetMessage("Password reset instructions have been sent to your email address.")
        setResetEmail("")
        setTimeout(() => {
          setShowForgotPassword(false)
          setResetMessage("")
        }, 3000)
      } else {
        const errorData = await response.json()
        setResetMessage(errorData.error || "Failed to send reset email. Please try again.")
      }
    } catch (error) {
      console.error('Reset password error:', error)
      setResetMessage("Network error. Please check your connection and try again.")
    } finally {
      setResetLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mb-4">
            <Smartphone className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Team Member Login</h1>
          <p className="text-gray-600">Access your job assignments and schedule</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <form 
            onSubmit={handleSubmit} 
            className="space-y-6"
            autoComplete="on"
            method="post"
          >
            {/* Username/Email Field */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                Username or Email
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                  <User className="w-4 h-4 text-gray-400" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  value={formData.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  ref={usernameRef}
                  autoComplete="username"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your username or email"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                  <Lock className="w-4 h-4 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  ref={passwordRef}
                  autoComplete="current-password"
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>

            {/* Forgot Password Link */}
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Forgot your password?
              </button>
            </div>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Need help? Contact your manager
            </p>
          </div>
        </div>

        {/* Back to main app */}
        <div className="text-center mt-6">
          <button
            onClick={() => navigate('/')}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            ← Back to main app
          </button>
        </div>

        {/* Forgot Password Modal */}
        {showForgotPassword && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Reset Password</h3>
                <button
                  onClick={() => {
                    setShowForgotPassword(false)
                    setResetMessage("")
                    setResetEmail("")
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-sm text-gray-600 mb-4">
                Enter your email address and we'll send you instructions to reset your password.
              </p>

              {resetMessage && (
                <div className={`mb-4 p-3 rounded-lg text-sm ${
                  resetMessage.includes("sent") 
                    ? "bg-green-50 text-green-800 border border-green-200" 
                    : "bg-red-50 text-red-800 border border-red-200"
                }`}>
                  {resetMessage}
                </div>
              )}

              <form onSubmit={handleForgotPassword}>
                <div className="mb-4">
                  <label htmlFor="resetEmail" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    id="resetEmail"
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your email address"
                    required
                  />
                </div>

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotPassword(false)
                      setResetMessage("")
                      setResetEmail("")
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={resetLoading || !resetEmail.trim()}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {resetLoading ? "Sending..." : "Send Reset Email"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default TeamMemberLogin 
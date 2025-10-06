import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import GoogleOAuth from "../components/GoogleOAuth"

export default function SignInForm() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  })
  const [error, setError] = useState("")

  const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [apiError, setApiError] = useState("")

  const handleInputChange = (e) => {
    const { name, value } = e.target
    console.log('🔍 Input change:', { name, value })
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Clear field-specific error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ""
      }))
    }
    
    // Clear API error when user starts typing
    if (apiError) {
      setApiError("")
    }
  }

  const validateForm = () => {
    const newErrors = {}
    
    if (!formData.email.trim()) {
      newErrors.email = "Email is required"
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address"
    }
    
    if (!formData.password.trim()) {
      newErrors.password = "Password is required"
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters"
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Debug: Log form data
    console.log('🔍 Signin formData:', formData)
    
    // Validate form
    if (!validateForm()) {
      return
    }
    
    setIsLoading(true)
    setApiError("")
    
    try {
      await login(formData)
      navigate('/dashboard')
    } catch (error) {
      console.error('Signin error:', error)
      
      if (error.response) {
        const { status, data } = error.response
        
        switch (status) {
          case 401:
            setApiError("Invalid email or password")
            break
          case 404:
            setApiError("User not found")
            break
          case 500:
            setApiError("Server error. Please try again later.")
            break
          default:
            setApiError(data?.error || "An error occurred. Please try again.")
        }
      } else if (error.request) {
        setApiError("Network error. Please check your connection.")
      } else {
        setApiError("An unexpected error occurred.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgotPassword = () => {
    // Add forgot password logic here
    console.log("Forgot password clicked")
  }

  const handleSignUp = () => {
    navigate('/signup')
  }

  const isFormValid = formData.email.trim() !== "" && formData.password.trim() !== ""

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-8 mb-6">
          <div className="flex justify-center mb-8">
             <Link to="/" className="flex items-center">
            <img src="/logo.svg" alt="ServiceFlow" className="h-10 w-auto" />
          </Link>
          </div>

          {/* API Error Display */}
          {apiError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{apiError}</p>
            </div>
          )}


          {/* Sign In Form */}
          <form
            id="signin-form"
            method="post"
            autoComplete="on"
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            {/* Email Input */}
            <div>
              <label htmlFor="email" className="sr-only">Email Address</label>
              <div className="relative">
              <input
                id="email"
                type="email"
                name="email"
                autoComplete="email"
                  placeholder={formData.email ? "" : "Email"}
                value={formData.email}
                onChange={handleInputChange}
                  onFocus={() => console.log('📧 Email field focused')}
                  onBlur={() => console.log('📧 Email field blurred')}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                    errors.email 
                      ? "border-red-500 bg-red-50" 
                      : formData.email
                        ? "border-blue-500 bg-blue-50" 
                        : "border-gray-300 bg-white hover:border-gray-400"
                  }`}
                required
                disabled={isLoading}
              />
                {formData.email && (
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  </div>
                )}
              </div>
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">{errors.email}</p>
              )}
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <div className="relative">
              <input
                id="password"
                type="password"
                name="password"
                  placeholder={formData.password ? "" : "Password"}
                value={formData.password}
                onChange={handleInputChange}
                  onFocus={() => console.log('🔒 Password field focused')}
                  onBlur={() => console.log('🔒 Password field blurred')}
                autoComplete="current-password"
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                    errors.password 
                      ? "border-red-500 bg-red-50" 
                      : formData.password
                        ? "border-blue-500 bg-blue-50" 
                        : "border-gray-300 bg-white hover:border-gray-400"
                }`}
                required
                disabled={isLoading}
                />
                {formData.password && (
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  </div>
                )}
              </div>
              {errors.password && (
                <p className="text-red-500 text-sm mt-1">{errors.password}</p>
              )}
            </div>

            {/* Sign In Button */}
            <div>
              <button
                type="submit"
                disabled={!isFormValid || isLoading}
                className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                  isFormValid && !isLoading
                    ? "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                    : "bg-gray-200 text-gray-500 cursor-not-allowed"
                }`}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Signing In...
                  </div>
                ) : (
                  "Sign In"
                )}
              </button>
            </div>

            {/* Forgot Password Link */}
            <div className="text-center">
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={isLoading}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors disabled:opacity-50"
              >
                Forgot Password?
              </button>
            </div>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or continue with</span>
            </div>
          </div>

          {/* Google OAuth */}
          <div className="mt-4">
            <GoogleOAuth 
              onSuccess={(result) => {
                console.log('✅ Google OAuth success:', result);
                navigate('/dashboard');
              }}
              onError={(error) => {
                console.error('❌ Google OAuth error:', error);
                setError(error.response?.data?.error || 'Google sign-in failed');
              }}
            />
          </div>

          {/* Error Display */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>

        {/* Sign Up Section */}
        <div className="text-center">
          <span className="text-gray-600 text-sm">
            {"Don't have an account? "}
            <button 
              onClick={handleSignUp} 
              disabled={isLoading}
              className="text-blue-600 hover:text-blue-800 font-medium transition-colors disabled:opacity-50"
            >
              Sign Up
            </button>
          </span>
        </div>
      </div>
    </div>
  )
}
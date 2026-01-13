import { useState, useEffect, useRef } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import GoogleOAuth from "../components/GoogleOAuth"
// import { Button } from "../components/ui/button"
// import { Input } from "../components/ui/input"

export default function SignupForm() {
  const navigate = useNavigate()
  const { signup } = useAuth()
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    businessName: ""
  })
  const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [apiError, setApiError] = useState("")

  // Refs for autofill sync
  const emailRef = useRef(null)
  const passwordRef = useRef(null)

  // Simplified autofill detection
  useEffect(() => {
    const syncAutofill = () => {
      const email = emailRef.current?.value || ""
      const password = passwordRef.current?.value || ""
      
      if (email && email !== formData.email) {
        console.log('📧 Email autofill detected')
        setFormData(prev => ({ ...prev, email }))
      }
      
      if (password && password !== formData.password) {
        console.log('🔒 Password autofill detected')
        setFormData(prev => ({ ...prev, password }))
      }
    }

    // Check immediately on mount
    setTimeout(syncAutofill, 100)
    
    // Check periodically for the first 3 seconds
    const intervals = [200, 500, 1000, 2000, 3000].map(delay => 
      setTimeout(syncAutofill, delay)
    )

    return () => {
      intervals.forEach(clearTimeout)
    }
  }, [formData.email, formData.password])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Real-time validation for confirm password
    if (name === 'confirmPassword') {
      if (value.trim() && value !== formData.password) {
        setErrors(prev => ({
          ...prev,
          confirmPassword: 'Passwords do not match'
        }))
      } else {
        setErrors(prev => ({
          ...prev,
          confirmPassword: ""
        }))
      }
    } else if (name === 'password') {
      // Also check confirmPassword when password changes
      if (formData.confirmPassword.trim() && formData.confirmPassword !== value) {
        setErrors(prev => ({
          ...prev,
          confirmPassword: 'Passwords do not match'
        }))
      } else if (formData.confirmPassword.trim() && formData.confirmPassword === value) {
        setErrors(prev => ({
          ...prev,
          confirmPassword: ""
        }))
      }
    } else {
      // Clear field-specific error when user starts typing
      if (errors[name]) {
        setErrors(prev => ({
          ...prev,
          [name]: ""
        }))
      }
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
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters"
    }
    
    if (!formData.confirmPassword.trim()) {
      newErrors.confirmPassword = "Please confirm your password"
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match"
    }
    
    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required"
    }
    
    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required"
    }
    
    if (!formData.businessName.trim()) {
      newErrors.businessName = "Business name is required"
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Always read from refs as fallback for autofill
    const emailFromRef = emailRef.current?.value || ""
    const passwordFromRef = passwordRef.current?.value || ""
    
    // Use ref values if they exist and formData is empty (autofill case)
    const finalEmail = emailFromRef || formData.email
    const finalPassword = passwordFromRef || formData.password
    
    // Update formData with final values
    const finalFormData = {
      ...formData,
      email: finalEmail,
      password: finalPassword
    }
    
    // Validate with final values
    const newErrors = {}
    
    if (!finalEmail.trim()) {
      newErrors.email = "Email is required"
    } else if (!/\S+@\S+\.\S+/.test(finalEmail)) {
      newErrors.email = "Please enter a valid email address"
    }
    
    if (!finalPassword.trim()) {
      newErrors.password = "Password is required"
    } else if (finalPassword.length < 6) {
      newErrors.password = "Password must be at least 6 characters"
    }
    
    if (!formData.confirmPassword.trim()) {
      newErrors.confirmPassword = "Please confirm your password"
    } else if (finalPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match"
    }
    
    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required"
    }
    
    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required"
    }
    
    if (!formData.businessName.trim()) {
      newErrors.businessName = "Business name is required"
    }
    
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) {
      return
    }
    
    setIsLoading(true)
    setApiError("")
    
    try {
      await signup(finalFormData)
      navigate('/dashboard')
    } catch (error) {
      console.error('Signup error:', error)
      
      if (error.response) {
        const { status, data } = error.response
        
        switch (status) {
          case 400:
            if (data?.error?.includes('already exists')) {
              setApiError("An account with this email already exists")
            } else {
              setApiError(data?.error || "Please check your information and try again")
            }
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

  const handleSignIn = () => {
    navigate('/signin')
  }

  const isFormValid = Object.entries(formData).every(([key, value]) => {
    // Don't check password match here - just check if confirmPassword is filled
    // Password match validation will show error but won't disable button
    return value.trim() !== ""
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#002D7A] to-[#002D7A] flex items-center justify-center p-4">
      <div className="w-full max-w-6xl flex flex-col lg:flex-row items-center justify-center gap-8">
        {/* Left side - Form */}
        <div className="w-full max-w-lg">
          <div className="bg-white rounded-3xl shadow-2xl p-8 lg:p-10">
            {/* Logo */}
            <div className="text-center mb-8">
              <Link to="/" className="flex items-center">
                         <img src="/logo.svg" alt="ServiceFlow" className="h-10 w-auto" />
                       </Link>
            </div>

            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">Start your free trial</h1>
              <div className="w-32 h-2 bg-green-400 rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600 text-lg leading-relaxed">
                Try Serviceflow free for 14 days.
                <br />
                No credit card required.
              </p>
            </div>

            {/* API Error Display */}
            {apiError && (
              <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{apiError}</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* First Name */}
              <div>
                <label htmlFor="firstName" className="block text-sm font-semibold text-gray-700 mb-2">
                  First Name
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  placeholder="Your first name"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className={`w-full h-12 px-4 bg-gray-50 border rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.firstName ? "border-red-500 bg-red-50" : "border-gray-200"
                  }`}
                  required
                  disabled={isLoading}
                />
                {errors.firstName && (
                  <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>
                )}
              </div>

              {/* Last Name */}
              <div>
                <label htmlFor="lastName" className="block text-sm font-semibold text-gray-700 mb-2">
                  Last Name
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  placeholder="Your last name"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className={`w-full h-12 px-4 bg-gray-50 border rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.lastName ? "border-red-500 bg-red-50" : "border-gray-200"
                  }`}
                  required
                  disabled={isLoading}
                />
                {errors.lastName && (
                  <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>
                )}
              </div>

              {/* Business Name */}
              <div>
                <label htmlFor="businessName" className="block text-sm font-semibold text-gray-700 mb-2">
                  Business Name
                </label>
                <input
                  id="businessName"
                  name="businessName"
                  type="text"
                  placeholder="Your business name"
                  value={formData.businessName}
                  onChange={handleInputChange}
                  className={`w-full h-12 px-4 bg-gray-50 border rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.businessName ? "border-red-500 bg-red-50" : "border-gray-200"
                  }`}
                  required
                  disabled={isLoading}
                />
                {errors.businessName && (
                  <p className="text-red-500 text-sm mt-1">{errors.businessName}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="username email"
                  placeholder="Your business email"
                  defaultValue={formData.email}
                  onChange={handleInputChange}
                  ref={emailRef}
                  className={`w-full h-12 px-4 bg-gray-50 border rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.email ? "border-red-500 bg-red-50" : "border-gray-200"
                  }`}
                  required
                  disabled={isLoading}
                />
                {errors.email && (
                  <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                  Password <span className="text-red-500">*</span>
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Choose a password"
                  defaultValue={formData.password}
                  onChange={handleInputChange}
                  ref={passwordRef}
                  className={`w-full h-12 px-4 bg-gray-50 border rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.password ? "border-red-500 bg-red-50" : "border-gray-200"
                  }`}
                  required
                  disabled={isLoading}
                />
                {errors.password && (
                  <p className="text-red-500 text-sm mt-1">{errors.password}</p>
                )}
                {!errors.password && (
                  <p className="text-sm text-gray-500 mt-2">Password must be at least 8 characters</p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-2">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className={`w-full h-12 px-4 bg-gray-50 border rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.confirmPassword ? "border-red-500 bg-red-50" : "border-gray-200"
                  }`}
                  required
                  disabled={isLoading}
                />
                {errors.confirmPassword && (
                  <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={!isFormValid || isLoading}
                className={`w-full h-12 font-bold text-base rounded-lg transition-colors duration-200 ${
                  isFormValid && !isLoading
                    ? "bg-green-500 hover:bg-green-600 text-white cursor-pointer"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Creating Account...
                  </div>
                ) : (
                  "Continue"
                )}
              </button>
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
            <div className="mb-6 flex justify-center">
              <div className="w-full max-w-sm">
                <GoogleOAuth 
                  buttonText="signup_with"
                  onSuccess={(result) => {
                    console.log('✅ Google OAuth signup success:', result);
                    navigate('/dashboard');
                  }}
                  onError={(error) => {
                    console.error('❌ Google OAuth signup error:', error);
                    setApiError(error.response?.data?.error || 'Google signup failed');
                  }}
                />
              </div>
            </div>

            {/* Sign in link */}
            <div className="text-center mt-6">
              <span className="text-gray-600 text-sm">Already using Serviceflow? </span>
              <button 
                onClick={handleSignIn} 
                disabled={isLoading}
                className="text-blue-200 hover:text-blue-100 text-sm font-semibold transition-colors duration-200 disabled:opacity-50"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>

        {/* Right side - Background Image */}
        <div className="hidden lg:block w-full max-w-lg">
          <div className="relative">
            <img
              src="/images/signup-bg.avif"
              alt="Serviceflow Dashboard"
              className="w-full h-auto rounded-2xl"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-blue-900/20 to-transparent rounded-2xl"></div>
          </div>
        </div>
      </div>
    </div>
  )
}

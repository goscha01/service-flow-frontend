"use client"

import { X, MapPin, Search } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import AddressAutocomplete from "./address-autocomplete"

const CustomerModal = ({ isOpen, onClose, onSave, customer, isEditing = false }) => {
  const navigate = useNavigate()
  const modalRef = useRef(null)
  const [customerData, setCustomerData] = useState({
    firstName: "",
    lastName: "",
    address: "",
    suite: "",
    phone: "",
    email: "",
    notes: "",
    city: "",
    state: "",
    zipCode: ""
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [validationErrors, setValidationErrors] = useState({})
  const [isValidatingEmail, setIsValidatingEmail] = useState(false)
  const [isValidatingPhone, setIsValidatingPhone] = useState(false)

  // Refs for autofill detection
  const addressRef = useRef(null)
  const emailRef = useRef(null)
  const phoneRef = useRef(null)

  // API base URL - using backend proxy for Google Places API to avoid CORS issues
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://service-flow-backend-production-4568.up.railway.app/api'

  // Function to parse combined address into street address and suite
  const parseCombinedAddress = (combinedAddress) => {
    if (!combinedAddress) return { address: "", suite: "" }
    
    // Common patterns for suite indicators
    const suitePatterns = [
      /,\s*(apt|apartment|unit|suite|ste|#|no|number)\s*\.?\s*([^,]+)/i,
      /,\s*([^,]+)\s*(apt|apartment|unit|suite|ste|#|no|number)\s*\.?\s*([^,]+)/i,
      /,\s*([^,]+)$/ // Last part after comma
    ]
    
    // Try to match suite patterns
    for (const pattern of suitePatterns) {
      const match = combinedAddress.match(pattern)
      if (match) {
        // Extract the suite part and the rest as address
        const suitePart = match[0].replace(/^,\s*/, '') // Remove leading comma and space
        const addressPart = combinedAddress.replace(match[0], '').trim()
        return {
          address: addressPart,
          suite: suitePart
        }
      }
    }
    
    // If no pattern matches, check if there's a comma (common separator)
    const commaIndex = combinedAddress.lastIndexOf(',')
    if (commaIndex > 0) {
      const addressPart = combinedAddress.substring(0, commaIndex).trim()
      const suitePart = combinedAddress.substring(commaIndex + 1).trim()
      
      // Only split if the part after comma looks like a suite
      if (suitePart && suitePart.length < 20) { // Reasonable length for suite
        return {
          address: addressPart,
          suite: suitePart
        }
      }
    }
    
    // If no clear separation, return the whole thing as address
    return {
      address: combinedAddress,
      suite: ""
    }
  }

  useEffect(() => {
    if (!isOpen) {
      // Clear form data when modal closes
      setCustomerData({
        firstName: "",
        lastName: "",
        address: "",
        suite: "",
        phone: "",
        email: "",
        notes: "",
        city: "",
        state: "",
        zipCode: ""
      })
      setError("")
      setValidationErrors({})
      setIsValidatingEmail(false)
      setIsValidatingPhone(false)
    } else if (isOpen && !isEditing) {
      // Clear form data when opening for new customer (not editing)
      setCustomerData({
        firstName: "",
        lastName: "",
        address: "",
        suite: "",
        phone: "",
        email: "",
        notes: "",
        city: "",
        state: "",
        zipCode: ""
      })
      setError("")
      setValidationErrors({})
      setIsValidatingEmail(false)
      setIsValidatingPhone(false)
    } else if (isEditing && customer) {
      // Populate form with existing customer data for editing
      
      // Parse the combined address if it exists (for backward compatibility)
      const parsedAddress = parseCombinedAddress(customer.address)
      
      setCustomerData({
        firstName: customer.first_name || "",
        lastName: customer.last_name || "",
        address: customer.suite ? customer.address : parsedAddress.address,
        suite: customer.suite || parsedAddress.suite,
        phone: customer.phone || "",
        email: customer.email || "",
        notes: customer.notes || "",
        city: customer.city || "",
        state: customer.state || "",
        zipCode: customer.zip_code || ""
      })
    }
  }, [isOpen, isEditing, customer])

  // Enhanced autofill detection for production
  useEffect(() => {
    const syncAutofill = () => {
      const address = addressRef.current?.value || ""
      const email = emailRef.current?.value || ""
      const phone = phoneRef.current?.value || ""
      
      
      if (address || email || phone) {
        setCustomerData(prev => ({
          ...prev,
          address: address || prev.address,
          email: email || prev.email,
          phone: phone || prev.phone
        }))
      }
    }

    // CSS animation detection (Chrome's autofill trigger)
    const handleAnimationStart = (event) => {
      setTimeout(syncAutofill, 100)
    }

    // Enhanced event listeners for better detection
    const handleInput = (event) => {
      setTimeout(syncAutofill, 50)
    }

    const handleChange = (event) => {
      setTimeout(syncAutofill, 50)
    }

    // Multiple timeout checks to catch browser autofill at different speeds
    const timeouts = [50, 100, 200, 500, 1000].map(delay => 
      setTimeout(() => {
        syncAutofill()
      }, delay)
    )

    // Add comprehensive event listeners
    const addressInput = addressRef.current
    const emailInput = emailRef.current
    const phoneInput = phoneRef.current

    const inputs = [
      { ref: addressInput, name: 'address' },
      { ref: emailInput, name: 'email' },
      { ref: phoneInput, name: 'phone' }
    ]

    inputs.forEach(({ ref, name }) => {
      if (ref) {
        ref.addEventListener('animationstart', handleAnimationStart)
        ref.addEventListener('input', handleInput)
        ref.addEventListener('change', handleChange)
      }
    })

    return () => {
      timeouts.forEach(clearTimeout)
      inputs.forEach(({ ref, name }) => {
        if (ref) {
          ref.removeEventListener('animationstart', handleAnimationStart)
          ref.removeEventListener('input', handleInput)
          ref.removeEventListener('change', handleChange)
        }
      })
    }
  }, [isOpen])

  // Add click-outside handler to close modal (excluding Google Places autocomplete)
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        // Don't close if clicking on Google Places autocomplete suggestions
        if (event.target.closest('.pac-container') || 
            event.target.closest('[data-autocomplete-suggestions]') ||
            event.target.closest('.autocomplete-suggestions') ||
            event.target.closest('[role="listbox"]') ||
            event.target.closest('.pac-item')) {
          return
        }
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  const validateEmail = async (email) => {
    if (!email) return true // Email is optional
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const isValidFormat = emailRegex.test(email)
    
    if (!isValidFormat) return false
    
    // Additional validation: check for common disposable email domains
    const disposableDomains = [
      '10minutemail.com', 'tempmail.org', 'guerrillamail.com', 'mailinator.com',
      'yopmail.com', 'throwaway.email', 'temp-mail.org', 'fakeinbox.com'
    ]
    
    const domain = email.split('@')[1]?.toLowerCase()
    if (disposableDomains.includes(domain)) {
      return false
    }
    
    return true
  }

  const validatePhone = (phone) => {
    if (!phone) return true // Phone is optional
    // Remove all formatting characters (spaces, dashes, parentheses)
    const cleaned = phone.replace(/[\s\-()]/g, '')
    // More flexible validation: allow common phone number formats
    const phoneRegex = /^[\+]?[1-9][\d]{6,15}$/
    return phoneRegex.test(cleaned)
  }

  const validateField = async (field, value) => {
    const errors = { ...validationErrors }
    
    switch (field) {
      case 'email':
        if (value) {
          setIsValidatingEmail(true)
          const isValid = await validateEmail(value)
          if (!isValid) {
            errors.email = 'Please enter a valid email address'
          } else {
            delete errors.email
          }
          setIsValidatingEmail(false)
        } else {
          delete errors.email
        }
        break
      case 'phone':
        if (value) {
          setIsValidatingPhone(true)
          const isValid = validatePhone(value)
          if (!isValid) {
            errors.phone = 'Please enter a valid phone number (must start with a digit 1-9)'
          } else {
            delete errors.phone
          }
          setIsValidatingPhone(false)
        } else {
          delete errors.phone
        }
        break
      case 'firstName':
        if (!value.trim()) {
          errors.firstName = 'First name is required'
        } else {
          delete errors.firstName
        }
        break
      case 'lastName':
        if (!value.trim()) {
          errors.lastName = 'Last name is required'
        } else {
          delete errors.lastName
        }
        break
      default:
        // No validation needed for other fields
        break
    }
    
    setValidationErrors(errors)
  }

  const formatPhone = (phone) => {
    if (!phone) return phone
    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '')
    
    // Format based on length
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0,3)}) ${cleaned.slice(3,6)}-${cleaned.slice(6)}`
    } else if (cleaned.length === 11 && cleaned[0] === '1') {
      return `+1 (${cleaned.slice(1,4)}) ${cleaned.slice(4,7)}-${cleaned.slice(7)}`
    } else if (cleaned.length > 10) {
      // International format
      return `+${cleaned}`
    }
    return phone
  }

  const handlePhoneChange = async (e) => {
    const value = e.target.value
    const formatted = formatPhone(value)
    setCustomerData({ ...customerData, phone: formatted })
    // Validate phone in real-time as user types
    if (formatted) {
      await validateField('phone', formatted)
    } else {
      // Clear phone validation error if field is empty
      setValidationErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors.phone
        return newErrors
      })
    }
  }

  const handleEmailChange = async (e) => {
    const value = e.target.value
    setCustomerData({ ...customerData, email: value })
    // Validate email in real-time as user types
    if (value) {
      await validateField('email', value)
    } else {
      // Clear email validation error if field is empty
      setValidationErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors.email
        return newErrors
      })
    }
  }

  const handleNameChange = (e) => {
    const value = e.target.value
    setCustomerData({ ...customerData, name: value })
    validateField('name', value)
  }

  const handleAddressSelect = (addressData) => {
    setCustomerData({
      ...customerData,
      address: addressData.formattedAddress,
      city: addressData.components.city,
      state: addressData.components.state,
      zipCode: addressData.components.zipCode
    })
  }

  const handleAddressChange = (value) => {
    setCustomerData(prev => ({ 
      ...prev, 
      address: value,
      // Clear city, state, zipCode when address is manually changed
      city: "",
      state: "",
      zipCode: ""
    }))
  }


  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Clear previous errors
    setError("")
    
    // Validate required fields
    if (!customerData.firstName.trim()) {
      setError('First name is required')
      return
    }
    
    if (!customerData.lastName.trim()) {
      setError('Last name is required')
      return
    }
    
    // Validate email if provided
    if (customerData.email && !(await validateEmail(customerData.email))) {
      setError('Please enter a valid email address')
      return
    }
    
    // Validate phone if provided
    if (customerData.phone && !validatePhone(customerData.phone)) {
      setError('Please enter a valid phone number (must start with a digit 1-9)')
      return
    }
    
    setLoading(true)
    
    try {
      // Format phone number for server (remove all formatting, keep only digits and +)
      const formattedPhone = customerData.phone ? customerData.phone.replace(/[\s\-()]/g, '') : ''
      
      const customerToSave = {
        firstName: customerData.firstName.trim(),
        lastName: customerData.lastName.trim(),
        address: customerData.address,
        suite: customerData.suite,
        phone: formattedPhone,
        email: customerData.email,
        notes: customerData.notes,
        city: customerData.city,
        state: customerData.state,
        zipCode: customerData.zipCode
      }
      
      const result = await onSave(customerToSave)
      
      // Close modal
      onClose()
      // Do NOT navigate away. The parent will select the new customer.
    } catch (error) {
      console.error('Error in customer modal submit:', error)
      setError(error.message || 'Failed to save customer. Please try again.')
      // Don't close the modal on error - keep it open so user can fix the issue
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-start sm:items-center justify-center z-50 p-4 overflow-y-auto"
    >
      <div 
        ref={modalRef}
        className="bg-white rounded-xl w-full max-w-md relative my-4 sm:my-6 max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)] overflow-hidden flex flex-col"
      >
        {/* Header - Fixed */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">{isEditing ? 'Edit Customer' : 'New Customer'}</h2>
          <button
            onClick={(e) => {
              e.preventDefault()
              onClose()
            }}
            className="text-gray-400 hover:text-gray-500 hover:bg-gray-100 p-1 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <form id="customer-form" onSubmit={handleSubmit} className="space-y-6" noValidate>
            {/* Customer Name */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="First name"
                  value={customerData.firstName}
                  onChange={(e) => {
                    setCustomerData({ ...customerData, firstName: e.target.value })
                    validateField('firstName', e.target.value)
                  }}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 text-sm ${
                    validationErrors.firstName ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300'
                  }`}
                  required
                />
                {validationErrors.firstName && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.firstName}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Last name"
                  value={customerData.lastName}
                  onChange={(e) => {
                    setCustomerData({ ...customerData, lastName: e.target.value })
                    validateField('lastName', e.target.value)
                  }}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 text-sm ${
                    validationErrors.lastName ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300'
                  }`}
                  required
                />
                {validationErrors.lastName && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.lastName}</p>
                )}
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address
              </label>
              <AddressAutocomplete
                ref={addressRef}
                value={customerData.address}
                onChange={handleAddressChange}
                onAddressSelect={handleAddressSelect}
                placeholder="Street Address"
                className="w-full"
                showValidationResults={true}
              />
            </div>

            {/* Apartment/Unit */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Apartment/Unit
              </label>
              <input
                type="text"
                placeholder="Apt, Unit, Suite, Floor, etc."
                value={customerData.suite}
                onChange={(e) => setCustomerData({ ...customerData, suite: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 text-sm"
              />
            </div>

            {/* City, State, Zip Code */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City
                </label>
                <input
                  type="text"
                  placeholder="City"
                  value={customerData.city}
                  onChange={(e) => setCustomerData({ ...customerData, city: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State
                </label>
                <input
                  type="text"
                  placeholder="State"
                  value={customerData.state}
                  onChange={(e) => setCustomerData({ ...customerData, state: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Zip Code
                </label>
                <input
                  type="text"
                  placeholder="12345"
                  value={customerData.zipCode}
                  onChange={(e) => setCustomerData({ ...customerData, zipCode: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 text-sm"
                />
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <div className="relative">
                <input
                  ref={phoneRef}
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={customerData.phone}
                  onChange={handlePhoneChange}
                  maxLength={20}
                  autoComplete="tel"
                  list="phone-suggestions"
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 text-sm ${
                    validationErrors.phone ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300'
                  }`}
                />
                <datalist id="phone-suggestions">
                  <option value="(555) 123-4567" />
                  <option value="(555) 987-6543" />
                  <option value="+1 (555) 123-4567" />
                  <option value="555-123-4567" />
                </datalist>
                {isValidatingPhone && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500"></div>
                  </div>
                )}
              </div>
              {validationErrors.phone && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.phone}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <div className="relative">
                <input
                  ref={emailRef}
                  type="email"
                  placeholder="email@example.com"
                  value={customerData.email}
                  onChange={handleEmailChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 text-sm ${
                    validationErrors.email ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300'
                  }`}
                />
                {isValidatingEmail && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500"></div>
                  </div>
                )}
              </div>
              {validationErrors.email && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.email}</p>
              )}
              {!customerData.email && (
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-blue-800">
                        <strong>Recommended:</strong> Add an email address to automatically send job confirmations and updates to your customer.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                placeholder="Customer notes..."
                value={customerData.notes}
                onChange={(e) => setCustomerData({ ...customerData, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 text-sm"
                rows="3"
              />
            </div>

          </form>
        </div>

        {/* Footer - Fixed */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              onClose()
            }}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="customer-form"
            disabled={loading || Object.keys(validationErrors).length > 0}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Saving..." : "Save Customer"}
          </button>
        </div>
      </div>
    </div>
  )
}

export default CustomerModal 
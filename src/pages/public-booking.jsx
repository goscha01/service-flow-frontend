"use client"

import React, { useState, useEffect } from "react"
import { useParams } from "react-router-dom"
import { 
  MapPin, 
  ChevronRight, 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  Mail, 
  CreditCard,
  CheckCircle,
  ArrowLeft,
  Star
} from "lucide-react"
import axios from "axios"
import IntakeQuestionsForm from "../components/intake-questions-form"
import ServiceModifiersForm from "../components/service-modifiers-form"

// Create axios instance for public API calls
const publicApi = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'https://zenbookapi.now2code.online/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// API base URL for Google Places API proxy
const API_BASE_URL = 'https://zenbookapi.now2code.online'

const PublicBooking = () => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [settings, setSettings] = useState(null)
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState({
    postalCode: "",
    service: "",
    date: "",
    time: "",
    name: "",
    email: "",
    phone: "",
    address: "",
    notes: ""
  })
  const [couponCode, setCouponCode] = useState("")
  const [couponDiscount, setCouponDiscount] = useState(null)
  const [couponError, setCouponError] = useState("")
  const [validatingCoupon, setValidatingCoupon] = useState(false)
  const [availableServices, setAvailableServices] = useState([])
  const [availableSlots, setAvailableSlots] = useState([])
  const [addressSuggestions, setAddressSuggestions] = useState([])
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false)
  const [intakeAnswers, setIntakeAnswers] = useState({})
  const [selectedServiceQuestions, setSelectedServiceQuestions] = useState([])
  const [serviceModifiers, setServiceModifiers] = useState({})
  const [modifiersError, setModifiersError] = useState("")

  // Get business slug from URL parameters
  const { userSlug } = useParams()
  // Try to extract user ID from slug, or use fallback
  const businessSlug = userSlug || '1' // Use user ID directly as fallback
  
  // Debug: Log the business slug
  console.log('Business slug:', businessSlug)
  console.log('URL params:', useParams())

  // Load business settings and services
  useEffect(() => {
    const loadBusinessData = async () => {
      try {
        setLoading(true)
        
        // Load business settings
        const settingsResponse = await publicApi.get(`/public/business/${businessSlug}/settings`)
        setSettings(settingsResponse.data)
        
        // Load available services
        const servicesResponse = await publicApi.get(`/public/business/${businessSlug}/services`)
        setAvailableServices(servicesResponse.data)
        
      } catch (error) {
        console.error('Error loading business data:', error)
        setError('Business not found or unavailable')
      } finally {
        setLoading(false)
      }
    }

    loadBusinessData()
  }, [businessSlug])

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // If service is selected, load intake questions
    if (field === 'service') {
      const selectedService = availableServices.find(s => s.id === value)
      if (selectedService && selectedService.intake_questions) {
        try {
          const questions = JSON.parse(selectedService.intake_questions)
          setSelectedServiceQuestions(questions)
        } catch (error) {
          console.error('Error parsing intake questions:', error)
          setSelectedServiceQuestions([])
        }
      } else {
        setSelectedServiceQuestions([])
      }
      // Clear previous answers when service changes
      setIntakeAnswers({})
    }
  }

  const handleAddressChange = async (e) => {
    const value = e.target.value
    setFormData(prev => ({ ...prev, address: value }))
    
    if (value.length > 3) {
      try {
        const response = await fetch(
          `${API_BASE_URL}/places/autocomplete?input=${encodeURIComponent(value)}`
        )
        const data = await response.json()
        
        if (data.predictions) {
          setAddressSuggestions(data.predictions)
          setShowAddressSuggestions(true)
        }
      } catch (error) {
        console.error('Error fetching address suggestions:', error)
      }
    } else {
      setAddressSuggestions([])
      setShowAddressSuggestions(false)
    }
  }

  const handleAddressSelect = async (suggestion) => {
    try {
      // Get detailed place information
      const response = await fetch(
        `${API_BASE_URL}/places/details?place_id=${suggestion.place_id}`
      )
      const data = await response.json()
      
      if (data.result) {
        const place = data.result
        let city = ""
        let state = ""
        let zipCode = ""
        
        // Extract address components
        place.address_components.forEach(component => {
          if (component.types.includes('locality')) {
            city = component.long_name
          } else if (component.types.includes('administrative_area_level_1')) {
            state = component.short_name
          } else if (component.types.includes('postal_code')) {
            zipCode = component.long_name
          }
        })
        
        setFormData(prev => ({
          ...prev,
          address: suggestion.description,
          city: city,
          state: state,
          zipCode: zipCode
        }))
      } else {
        // Fallback if detailed info not available
        setFormData(prev => ({ ...prev, address: suggestion.description }))
      }
    } catch (error) {
      console.error('Error fetching place details:', error)
      // Fallback to just the description
      setFormData(prev => ({ ...prev, address: suggestion.description }))
    }
    
    setShowAddressSuggestions(false)
  }

  const handleIntakeAnswersChange = (answers) => {
    setIntakeAnswers(answers)
  }

  const handleModifiersChange = (modifiers) => {
    setServiceModifiers(modifiers)
  }

  const handleNextStep = () => {
    if (currentStep < 7) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleServiceSelect = (service) => {
    handleInputChange('service', service.id)
    
    // Check if this service has modifiers or intake questions
    let hasModifiers = false;
    let hasIntakeQuestions = false;
    
    if (service.modifiers) {
      try {
        const modifiers = JSON.parse(service.modifiers);
        hasModifiers = modifiers && modifiers.length > 0;
      } catch (error) {
        console.error('Error parsing modifiers:', error);
      }
    }
    
    if (service.intake_questions) {
      try {
        const questions = JSON.parse(service.intake_questions);
        hasIntakeQuestions = questions && questions.length > 0;
      } catch (error) {
        console.error('Error parsing intake questions:', error);
      }
    }
    
    // Determine next step based on what the service has
    if (hasModifiers) {
      setCurrentStep(3); // Go to modifiers
    } else if (hasIntakeQuestions) {
      setCurrentStep(4); // Go to intake questions
    } else {
      setCurrentStep(5); // Skip to date/time
    }
  }

  const handleSubmit = async () => {
    try {
      const bookingData = {
        ...formData,
        intakeAnswers: intakeAnswers,
        serviceModifiers: serviceModifiers
      }
      const response = await publicApi.post(`/public/business/${businessSlug}/book`, bookingData)
      setCurrentStep(7) // Success step
    } catch (error) {
      setError('Failed to submit booking. Please try again.')
    }
  }

  const validateCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError("Please enter a coupon code")
      return
    }

    const selectedService = availableServices.find(s => s.id === formData.service)
    if (!selectedService) {
      setCouponError("Please select a service first")
      return
    }

    try {
      setValidatingCoupon(true)
      setCouponError("")
      
      const response = await publicApi.post('/coupons/validate', {
        code: couponCode,
        businessSlug: businessSlug,
        serviceId: selectedService.id,
        totalAmount: selectedService.price || 0
      })

      setCouponDiscount(response.data.coupon)
      setCouponError("")
    } catch (error) {
      console.error('Coupon validation error:', error)
      setCouponError(error.response?.data?.error || "Invalid coupon code")
      setCouponDiscount(null)
    } finally {
      setValidatingCoupon(false)
    }
  }

  const removeCoupon = () => {
    setCouponCode("")
    setCouponDiscount(null)
    setCouponError("")
  }

  const getSelectedServicePrice = () => {
    const selectedService = availableServices.find(s => s.id === formData.service)
    if (!selectedService) return 0
    
    const price = selectedService.price
    // Handle different price formats
    if (typeof price === 'number') return price
    if (typeof price === 'string') {
      const parsed = parseFloat(price)
      return isNaN(parsed) ? 0 : parsed
    }
    return 0
  }

  const getFinalPrice = () => {
    const basePrice = getSelectedServicePrice()
    if (couponDiscount && typeof couponDiscount.finalAmount === 'number') {
      return couponDiscount.finalAmount
    }
    return basePrice
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: settings?.branding?.headerBackground || '#ffffff' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: settings?.branding?.primaryColor || '#4CAF50' }}></div>
          <p className="text-gray-600">Loading booking page...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-600 text-2xl">!</span>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Booking Unavailable</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: settings?.branding?.headerBackground || '#ffffff' }}>
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {settings?.branding?.logo ? (
              <img 
                src={settings.branding.logo}
                onError={(e) => {
                  console.error('Failed to load logo:', settings.branding.logo);
                  e.target.style.display = 'none';
                }} 
                alt="Logo" 
                className="h-8 object-contain"
              />
            ) : (
              <h1 className="text-xl font-semibold" style={{ color: settings?.branding?.primaryColor || '#4CAF50' }}>
                {settings?.content?.heading || 'Book Online'}
              </h1>
            )}
            
            {!settings?.branding?.hideZenbookerBranding && (
              <div className="flex items-center space-x-1 text-xs text-gray-500">
                <span>Powered by</span>
                <div className="w-4 h-4 bg-blue-600 rounded flex items-center justify-center">
                  <span className="text-white font-bold text-xs">Z</span>
                </div>
                <span>zenbooker</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hero Section */}
      {settings?.branding?.heroImage && (
        <div className="relative h-48 bg-cover bg-center" style={{ backgroundImage: `url(${settings.branding.heroImage})` }}>
          <div className="absolute inset-0 bg-black bg-opacity-40"></div>
          <div className="relative h-full flex items-center justify-center">
            <div className="text-center text-white">
              <h2 className="text-2xl font-bold mb-2">{settings?.content?.heading || 'Book Online'}</h2>
              <p className="text-lg">{settings?.content?.text || "Let's get started by entering your postal code."}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Booking Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg p-6">
              {/* Progress Steps */}
              <div className="flex items-center justify-between mb-8">
                {[1, 2, 3, 4, 5, 6].map((step) => (
                  <div key={step} className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      step <= currentStep 
                        ? 'text-white' 
                        : 'text-gray-500 bg-gray-200'
                    }`} style={{ 
                      backgroundColor: step <= currentStep ? (settings?.branding?.primaryColor || '#4CAF50') : undefined 
                    }}>
                      {step < currentStep ? <CheckCircle className="w-4 h-4" /> : step}
                    </div>
                    {step < 6 && (
                      <div className={`w-12 h-1 mx-2 ${
                        step < currentStep ? 'bg-green-500' : 'bg-gray-200'
                      }`}></div>
                    )}
                  </div>
                ))}
              </div>

              {/* Step 1: Location */}
              {currentStep === 1 && (
                <div>
                  <h3 className="text-xl font-semibold mb-4">Enter Your Location</h3>
                  <div className="space-y-4">
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="text"
                        placeholder="Postal Code"
                        value={formData.postalCode}
                        onChange={(e) => handleInputChange('postalCode', e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
                        style={{ '--tw-ring-color': settings?.branding?.primaryColor || '#4CAF50' }}
                      />
                    </div>
                    <button
                      onClick={handleNextStep}
                      disabled={!formData.postalCode.trim()}
                      className="w-full py-3 px-4 rounded-lg text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ backgroundColor: settings?.branding?.primaryColor || '#4CAF50' }}
                    >
                      Continue
                      <ChevronRight className="w-4 h-4 inline ml-2" />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Service Selection */}
              {currentStep === 2 && (
                <div>
                  <h3 className="text-xl font-semibold mb-4">Select a Service</h3>
                  <div className="space-y-4">
                    {availableServices.map((service) => (
                      <div
                        key={service.id}
                        onClick={() => handleServiceSelect(service)}
                        className="border border-gray-200 rounded-lg p-4 cursor-pointer hover:border-gray-300 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900">{service.name}</h4>
                            <p className="text-sm text-gray-600">{service.description}</p>
                            {settings?.general?.showPrices && (
                              <p className="text-lg font-semibold mt-2" style={{ color: settings?.branding?.primaryColor || '#4CAF50' }}>
                                ${service.price}
                              </p>
                            )}
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 3: Service Modifiers */}
              {currentStep === 3 && (
                <div>
                  <h3 className="text-xl font-semibold mb-4">Customize Your Service</h3>
                  <div className="mb-6">
                    <p className="text-gray-600">Select any additional options to customize your service.</p>
                  </div>
                  
                  {(() => {
                    const selectedService = availableServices.find(s => s.id === formData.service);
                    if (!selectedService?.modifiers) return null;
                    
                    try {
                      const modifiers = JSON.parse(selectedService.modifiers);
                      if (!modifiers || modifiers.length === 0) {
                        setCurrentStep(4); // Skip to next step if no modifiers
                        return null;
                      }
                      
                      return (
                        <ServiceModifiersForm 
                          modifiers={modifiers}
                          onModifiersChange={handleModifiersChange}
                        />
                      );
                    } catch (error) {
                      console.error('Error parsing modifiers:', error);
                      setCurrentStep(4); // Skip to next step if error
                      return null;
                    }
                  })()}
                  
                  <div className="flex space-x-4 mt-6">
                    <button
                      onClick={handlePrevStep}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      <ArrowLeft className="w-4 h-4 inline mr-2" />
                      Back
                    </button>
                    <button
                      onClick={() => {
                        // Check if next step should be intake questions or date/time
                        const selectedService = availableServices.find(s => s.id === formData.service);
                        if (selectedService?.intake_questions) {
                          try {
                            const questions = JSON.parse(selectedService.intake_questions);
                            if (questions && questions.length > 0) {
                              setSelectedServiceQuestions(questions);
                              setCurrentStep(4); // Go to intake questions
                              return;
                            }
                          } catch (error) {
                            console.error('Error parsing intake questions:', error);
                          }
                        }
                        setSelectedServiceQuestions([]);
                        setCurrentStep(5); // Skip to date/time
                      }}
                      className="px-4 py-2 rounded-lg text-white font-medium"
                      style={{ backgroundColor: settings?.branding?.primaryColor || '#4CAF50' }}
                    >
                      Continue
                      <ChevronRight className="w-4 h-4 inline ml-2" />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 4: Intake Questions */}
              {currentStep === 4 && (
                <div>
                  <h3 className="text-xl font-semibold mb-4">Additional Information</h3>
                  <div className="mb-6">
                    <p className="text-gray-600">Please provide additional details to help us serve you better.</p>
                  </div>
                  
                  {selectedServiceQuestions.length > 0 ? (
                    <>
                      <IntakeQuestionsForm 
                        questions={selectedServiceQuestions}
                        onAnswersChange={handleIntakeAnswersChange}
                      />
                      <div className="flex space-x-4 mt-6">
                        <button
                          onClick={handlePrevStep}
                          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                        >
                          <ArrowLeft className="w-4 h-4 inline mr-2" />
                          Back
                        </button>
                        <button
                          onClick={handleNextStep}
                          className="px-4 py-2 rounded-lg text-white font-medium"
                          style={{ backgroundColor: settings?.branding?.primaryColor || '#4CAF50' }}
                        >
                          Continue
                          <ChevronRight className="w-4 h-4 inline ml-2" />
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <h3 className="text-xl font-semibold mb-4">No Additional Questions</h3>
                      <p className="text-gray-600 mb-6">This service doesn't require any additional information.</p>
                      <div className="flex space-x-4 justify-center">
                        <button
                          onClick={handlePrevStep}
                          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                        >
                          <ArrowLeft className="w-4 h-4 inline mr-2" />
                          Back
                        </button>
                        <button
                          onClick={handleNextStep}
                          className="px-4 py-2 rounded-lg text-white font-medium"
                          style={{ backgroundColor: settings?.branding?.primaryColor || '#4CAF50' }}
                        >
                          Continue
                          <ChevronRight className="w-4 h-4 inline ml-2" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 5: Date & Time Selection */}
              {currentStep === 5 && (
                <div>
                  <h3 className="text-xl font-semibold mb-4">Select Date & Time</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                      <input
                        type="date"
                        value={formData.date}
                        onChange={(e) => handleInputChange('date', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
                        style={{ '--tw-ring-color': settings?.branding?.primaryColor || '#4CAF50' }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
                      <select
                        value={formData.time}
                        onChange={(e) => handleInputChange('time', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
                        style={{ '--tw-ring-color': settings?.branding?.primaryColor || '#4CAF50' }}
                      >
                        <option value="">Select time</option>
                        <option value="09:00">9:00 AM</option>
                        <option value="10:00">10:00 AM</option>
                        <option value="11:00">11:00 AM</option>
                        <option value="12:00">12:00 PM</option>
                        <option value="13:00">1:00 PM</option>
                        <option value="14:00">2:00 PM</option>
                        <option value="15:00">3:00 PM</option>
                        <option value="16:00">4:00 PM</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex space-x-4 mt-6">
                    <button
                      onClick={handlePrevStep}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      <ArrowLeft className="w-4 h-4 inline mr-2" />
                      Back
                    </button>
                    <button
                      onClick={handleNextStep}
                      disabled={!formData.date || !formData.time}
                      className="px-4 py-2 rounded-lg text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ backgroundColor: settings?.branding?.primaryColor || '#4CAF50' }}
                    >
                      Continue
                      <ChevronRight className="w-4 h-4 inline ml-2" />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 6: Customer Information */}
              {currentStep === 6 && (
                <div>
                  <h3 className="text-xl font-semibold mb-4">Your Information</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter your full name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter your email address"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter your phone number"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Service Address <span className="text-red-500">*</span>
                      </label>
                        <input
                          type="text"
                          value={formData.address}
                        onChange={(e) => handleInputChange('address', e.target.value)}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter your service address"
                      />
                          </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Additional Notes
                      </label>
                      <textarea
                        value={formData.notes}
                        onChange={(e) => handleInputChange('notes', e.target.value)}
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Any additional information or special requests..."
                      />
                    </div>
                  </div>

                  <div className="flex space-x-4 mt-6">
                    <button
                      onClick={handlePrevStep}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      <ArrowLeft className="w-4 h-4 inline mr-2" />
                      Back
                    </button>
                    <button
                      onClick={handleSubmit}
                      className="px-4 py-2 rounded-lg text-white font-medium"
                      style={{ backgroundColor: settings?.branding?.primaryColor || '#4CAF50' }}
                    >
                      Book Appointment
                    </button>
                  </div>
                </div>
              )}

              {/* Step 7: Success */}
              {currentStep === 7 && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Booking Confirmed!</h3>
                  <p className="text-gray-600 mb-6">
                    Thank you for your booking. We'll send you a confirmation email shortly.
                  </p>
                  <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 rounded-lg text-white font-medium"
                    style={{ backgroundColor: settings?.branding?.primaryColor || '#4CAF50' }}
                  >
                    Book Another Service
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6 sticky top-4">
              <h3 className="font-semibold text-gray-900 mb-4">Why Choose Us?</h3>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <Star className="w-5 h-5 text-yellow-400 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-gray-900">Professional Service</h4>
                    <p className="text-sm text-gray-600">Experienced team with attention to detail</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Star className="w-5 h-5 text-yellow-400 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-gray-900">Reliable & Trusted</h4>
                    <p className="text-sm text-gray-600">Serving customers with excellence</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Star className="w-5 h-5 text-yellow-400 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-gray-900">Easy Booking</h4>
                    <p className="text-sm text-gray-600">Quick and convenient online booking</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PublicBooking 
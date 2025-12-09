import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, User, Mail, Phone, MapPin, Clock, Settings, Plus, X, Trash2, Save } from 'lucide-react'
import Sidebar from '../components/sidebar'
import ErrorPopup from '../components/ErrorPopup'
import AddressValidation from '../components/address-validation'
import AddressAutocomplete from '../components/address-autocomplete'
import { teamAPI, territoriesAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'

const AddTeamMember = () => {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [emailWarning, setEmailWarning] = useState('')
  const [checkingEmail, setCheckingEmail] = useState(false)
  const [phoneWarning, setPhoneWarning] = useState('')
  const [checkingPhone, setCheckingPhone] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  
  // Error popup state
  const [showErrorPopup, setShowErrorPopup] = useState(false)
  const [errorPopupData, setErrorPopupData] = useState({
    title: '',
    message: '',
    type: 'error'
  })
  
  // Form data
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    role: '',
    hourly_rate: '',
    location: '',
    city: '',
    state: '',
    zip_code: '',
    color: '#2563EB'
  })

  // Google Places Autocomplete
  const [addressSuggestions, setAddressSuggestions] = useState([])
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false)
  const [addressLoading, setAddressLoading] = useState(false)
  const addressRef = useRef(null)


  // Territories management
  const [territories, setTerritories] = useState([])
  const [showAddTerritoryModal, setShowAddTerritoryModal] = useState(false)
  const [availableTerritories, setAvailableTerritories] = useState([])
  const [territoriesLoading, setTerritoriesLoading] = useState(false)

  // Availability management
  const [workingHours, setWorkingHours] = useState({
    sunday: { available: false, hours: '' },
    monday: { available: true, hours: '9:00 AM - 6:00 PM' },
    tuesday: { available: true, hours: '9:00 AM - 6:00 PM' },
    wednesday: { available: true, hours: '9:00 AM - 6:00 PM' },
    thursday: { available: true, hours: '9:00 AM - 6:00 PM' },
    friday: { available: true, hours: '9:00 AM - 6:00 PM' },
    saturday: { available: false, hours: '' }
  })

  const [customAvailability, setCustomAvailability] = useState([])

  // Settings management
  const [settings, setSettings] = useState({
    isServiceProvider: true,
    canEditAvailability: true,
    limitJobsPerDay: false,
    canAutoAssign: true,
    canClaimJobs: true,
    emailNotifications: true,
    smsNotifications: true
  })

  // Fetch available territories
  const fetchAvailableTerritories = async () => {
    try {
      setTerritoriesLoading(true)
      let userId = user?.id
      
      if (!userId) {
        console.error('No userId available for fetching territories')
        setAvailableTerritories([])
        return
      }
      
      const response = await territoriesAPI.getAll(userId)
      console.log('Territories API response:', response)
      
      // Ensure we always have an array
      if (Array.isArray(response)) {
        console.log('Response is array, setting territories:', response)
        setAvailableTerritories(response)
      } else if (response && Array.isArray(response.territories)) {
        console.log('Response has territories property:', response.territories)
        setAvailableTerritories(response.territories)
      } else if (response && response.data && Array.isArray(response.data)) {
        console.log('Response has data property:', response.data)
        setAvailableTerritories(response.data)
      } else {
        console.log('No valid territories found, setting empty array')
        setAvailableTerritories([])
      }
    } catch (error) {
      console.error('Error fetching territories:', error)
      setAvailableTerritories([])
    } finally {
      setTerritoriesLoading(false)
    }
  }

  // Google Places Autocomplete
  const handleLocationChange = async (e) => {
    const value = e.target.value
    setFormData(prev => ({ ...prev, location: value }))
    
    if (value.length < 3) {
      setAddressSuggestions([])
      setShowAddressSuggestions(false)
      return
    }

    try {
      setAddressLoading(true)
      const response = await fetch(`https://service-flow-backend-production-4568.up.railway.app/api/places/autocomplete?input=${encodeURIComponent(value)}`)
      const data = await response.json()
      
      if (data.predictions) {
        setAddressSuggestions(data.predictions)
        setShowAddressSuggestions(true)
      }
    } catch (error) {
      console.error('Error fetching address suggestions:', error)
    } finally {
      setAddressLoading(false)
    }
  }

  const handleAddressSelect = async (suggestion) => {
    try {
      const response = await fetch(`https://service-flow-backend-production-4568.up.railway.app/api/places/details?place_id=${suggestion.place_id}`)
      const data = await response.json()
      
      if (data.result) {
        const place = data.result
        let city = ''
        let state = ''
        let zipCode = ''
        
        // Extract address components
        if (place.address_components) {
          place.address_components.forEach(component => {
            if (component.types.includes('locality')) {
              city = component.long_name
            }
            if (component.types.includes('administrative_area_level_1')) {
              state = component.short_name
            }
            if (component.types.includes('postal_code')) {
              zipCode = component.long_name
            }
          })
        }
        
        setFormData(prev => ({
          ...prev,
          location: suggestion.description,
          city: city,
          state: state,
          zip_code: zipCode
        }))
      }
    } catch (error) {
      console.error('Error fetching place details:', error)
    } finally {
      setShowAddressSuggestions(false)
      setAddressSuggestions([])
    }
  }

  // Click outside to close address suggestions
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (addressRef.current && !addressRef.current.contains(event.target)) {
        setShowAddressSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])


  // Territories management
  const handleAddTerritory = () => {
    setShowAddTerritoryModal(true)
  }

  const handleSaveTerritory = async (territoryId) => {
    const territory = availableTerritories.find(t => t.id === territoryId)
    if (territory && !territories.some(t => t.id === territoryId)) {
      setTerritories(prev => [...prev, territory])
    }
    setShowAddTerritoryModal(false)
  }

  const handleRemoveTerritory = async (index) => {
    setTerritories(prev => prev.filter((_, i) => i !== index))
  }

  // Form submission
  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    if (!user?.id) {
      setError('User not authenticated. Please log in again.')
      setSaving(false)
      return
    }

    // Check for email warning
    if (emailWarning) {
      setError('Please use a different email address. The current email is already registered.')
      setSaving(false)
      return
    }

    // Check for phone warning
    if (phoneWarning) {
      setError('Please use a different phone number. The current phone number is already registered.')
      setSaving(false)
      return
    }

    try {
      const teamMemberData = {
        userId: user.id, // Backend expects 'userId', not 'user_id'
        firstName: formData.first_name, // Backend expects 'firstName'
        lastName: formData.last_name, // Backend expects 'lastName'
        email: formData.email,
        phone: formData.phone,
        role: formData.role,
        hourlyRate: formData.hourly_rate,
        location: formData.location,
        city: formData.city,
        state: formData.state,
        zipCode: formData.zip_code, // Backend expects 'zipCode'
        color: formData.color, // Include color in submission
        territories: JSON.stringify(territories.map(t => t.id)),
        availability: JSON.stringify({
          workingHours,
          customAvailability
        }),
        permissions: JSON.stringify(settings)
      }

      console.log('Submitting team member data:', teamMemberData)

      const response = await teamAPI.create(teamMemberData)
      console.log('✅ Team member created successfully:', response)
      
      // Show success modal
      setShowSuccessModal(true)
    } catch (error) {
      console.error('❌ Error creating team member:', error)
      console.error('❌ Error response:', error.response)
      console.error('❌ Error status:', error.response?.status)
      console.error('❌ Error data:', error.response?.data)
      
      // Handle enhanced error messages from backend
      const errorData = error.response?.data
      let errorTitle = 'Registration Failed'
      let errorMessage = 'An error occurred while creating the team member.'
      let errorType = 'error'
      
      if (errorData) {
        if (errorData.conflictType && errorData.message) {
          // Show specific conflict message
          errorTitle = 'Conflict Detected'
          errorMessage = errorData.message
          
          // Highlight the specific field that has a conflict
          if (errorData.field === 'email') {
            setEmailWarning(errorData.message)
          } else if (errorData.field === 'phone') {
            setPhoneWarning(errorData.message)
          }
        } else if (errorData.error) {
          errorMessage = errorData.error
        } else if (errorData.details) {
          // Handle server errors with specific details
          errorTitle = 'Server Error'
          errorMessage = `Server error: ${errorData.details}`
        } else {
          errorMessage = 'Error creating team member'
        }
      } else {
        errorMessage = 'Network error. Please check your connection and try again.'
      }
      
      // Show error popup
      setErrorPopupData({
        title: errorTitle,
        message: errorMessage,
        type: errorType
      })
      setShowErrorPopup(true)
      
      // Also set the banner error for backward compatibility
      setError(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  // Check if email already exists
  const checkEmailExists = async (email) => {
    if (!email || !user?.id) {
      setEmailWarning('')
      return
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setEmailWarning('')
      return
    }

    try {
      setCheckingEmail(true)
      setEmailWarning('')
      
      // Check if email exists by trying to get team members with this email
      const response = await teamAPI.getAll(user.id, {
        search: email,
        status: '',
        sortBy: 'first_name',
        sortOrder: 'ASC',
        page: 1,
        limit: 10
      })
      
      const existingMembers = response.teamMembers || []
      const emailExists = existingMembers.some(member => 
        member.email && member.email.toLowerCase() === email.toLowerCase()
      )
      
      if (emailExists) {
        setEmailWarning('This email address is already registered with another team member.')
      }
    } catch (error) {
      console.error('Error checking email:', error)
      // Don't show error to user for email check
    } finally {
      setCheckingEmail(false)
    }
  }

  // Check if phone number already exists
  const checkPhoneExists = async (phone) => {
    if (!phone || !user?.id) {
      setPhoneWarning('')
      return
    }

    // Basic phone validation - remove formatting
    const cleanedPhone = phone.replace(/[\s\-()]/g, '')
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/
    if (!phoneRegex.test(cleanedPhone)) {
      setPhoneWarning('')
      return
    }

    try {
      setCheckingPhone(true)
      setPhoneWarning('')
      
      // Check if phone exists by trying to get team members with this phone
      const response = await teamAPI.getAll(user.id, {
        search: phone,
        status: '',
        sortBy: 'first_name',
        sortOrder: 'ASC',
        page: 1,
        limit: 10
      })
      
      const existingMembers = response.teamMembers || []
      const phoneExists = existingMembers.some(member => 
        member.phone && member.phone.replace(/[\s\-()]/g, '') === cleanedPhone
      )
      
      if (phoneExists) {
        setPhoneWarning('This phone number is already registered with another team member.')
      }
    } catch (error) {
      console.error('Error checking phone:', error)
      // Don't show error to user for phone check
    } finally {
      setCheckingPhone(false)
    }
  }

  // Debounced email check
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (formData.email) {
        checkEmailExists(formData.email)
      } else {
        setEmailWarning('')
      }
    }, 500) // Wait 500ms after user stops typing

    return () => clearTimeout(timeoutId)
  }, [formData.email, user?.id])

  // Debounced phone check
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (formData.phone) {
        checkPhoneExists(formData.phone)
      } else {
        setPhoneWarning('')
      }
    }, 500) // Wait 500ms after user stops typing

    return () => clearTimeout(timeoutId)
  }, [formData.phone, user?.id])

  // Load available territories on component mount
  useEffect(() => {
    if (!authLoading && user?.id) {
      fetchAvailableTerritories()
    } else if (!authLoading && !user?.id) {
      // Redirect to signin if no user after auth has loaded
      navigate('/signin')
    }
  }, [authLoading, user?.id])

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64 xl:ml-72">
        
        <div className="flex-1 overflow-auto">
          <div className="px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="mb-8">
              <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => navigate("/team")}
                    className="flex items-center text-sm text-gray-500 hover:text-gray-700"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Back to Team
                  </button>
                  <div className="h-6 w-px bg-gray-300" />
                  <h1 className="text-2xl font-bold text-gray-900">Add New Team Member</h1>
                </div>
              </div>
            </div>

            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800">{error}</p>
              </div>
            )}

            {/* Invitation Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">Invitation Process</h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>When you add a team member, they will receive an invitation email with a link to create their account. They'll be able to set their own username and password during the signup process.</p>
                  </div>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Basic Information */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center mb-6">
                  <User className="w-5 h-5 text-blue-600 mr-2" />
                  <h2 className="text-lg font-semibold text-gray-900">Basic Information</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      First Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.first_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.last_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email *
                    </label>
                    <div className="relative">
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          emailWarning ? 'border-orange-300 focus:border-orange-500' : 'border-gray-300'
                        }`}
                      />
                      {checkingEmail && (
                        <div className="absolute right-3 top-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        </div>
                      )}
                    </div>
                    {emailWarning && (
                      <div className="mt-1 flex items-center text-sm text-orange-600">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {emailWarning}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone *
                    </label>
                    <div className="relative">
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          phoneWarning ? 'border-orange-300 focus:border-orange-500' : 'border-gray-300'
                        }`}
                      />
                      {checkingPhone && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        </div>
                      )}
                    </div>
                    {phoneWarning && (
                      <div className="mt-1 flex items-center text-sm text-orange-600">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {phoneWarning}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Role *
                    </label>
                    <select
                      required
                      value={formData.role}
                      onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select Role</option>
                      <option value="Manager">Manager</option>
                      <option value="Technician">Technician</option>
                      <option value="Helper">Helper</option>
                      <option value="Admin">Admin</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Color
                    </label>
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-8 h-8 rounded border border-gray-300 flex-shrink-0"
                        style={{ backgroundColor: formData.color || '#2563EB' }}
                      />
                      <select
                        value={formData.color || '#2563EB'}
                        onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="#2563EB">Blue</option>
                        <option value="#DC2626">Red</option>
                        <option value="#059669">Green</option>
                        <option value="#D97706">Orange</option>
                        <option value="#7C3AED">Purple</option>
                        <option value="#DB2777">Pink</option>
                        <option value="#6B7280">Gray</option>
                        <option value="#F59E0B">Yellow</option>
                        <option value="#10B981">Emerald</option>
                        <option value="#8B5CF6">Violet</option>
                        <option value="#EF4444">Rose</option>
                        <option value="#14B8A6">Teal</option>
                      </select>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">This color will be used in the calendar and schedule views</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Hourly Rate
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.hourly_rate}
                      onChange={(e) => setFormData(prev => ({ ...prev, hourly_rate: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Location
                    </label>
                    <AddressAutocomplete
                        value={formData.location}
                      onChange={(value) => setFormData(prev => ({ ...prev, location: value }))}
                      onAddressSelect={(addressData) => {
                        setFormData(prev => ({
                          ...prev,
                          location: addressData.formattedAddress,
                          city: addressData.components.city,
                          state: addressData.components.state,
                          zipCode: addressData.components.zipCode
                        }));
                      }}
                        placeholder="Start typing an address..."
                      showValidationResults={true}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      City
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      State
                    </label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ZIP Code
                    </label>
                    <input
                      type="text"
                      value={formData.zip_code}
                      onChange={(e) => setFormData(prev => ({ ...prev, zip_code: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                </div>
              </div>


              {/* Territories */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <MapPin className="w-5 h-5 text-blue-600 mr-2" />
                    <h2 className="text-lg font-semibold text-gray-900">Territories</h2>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddTerritory}
                    className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Territory
                  </button>
                </div>

                {territoriesLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading territories...</p>
                  </div>
                ) : territories.length > 0 ? (
                  <div className="space-y-3">
                    {territories.map((territory, index) => (
                      <div key={territory.id || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <span className="font-medium text-gray-900">{territory.name}</span>
                          {territory.description && (
                            <p className="text-sm text-gray-500 mt-1">{territory.description}</p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveTerritory(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No territories assigned yet</p>
                )}
              </div>

              {/* Submit Button */}
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => navigate('/team')}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || emailWarning || phoneWarning}
                  className={`px-6 py-3 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center ${
                    emailWarning || phoneWarning
                      ? 'bg-orange-500 hover:bg-orange-600' 
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating...
                    </>
                  ) : emailWarning || phoneWarning ? (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      Fix {emailWarning ? 'Email' : 'Phone'} Issue
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Create Team Member
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>


      {/* Add Territory Modal */}
      {showAddTerritoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Add Territory</h3>
            
            {territoriesLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-gray-600">Loading territories...</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-60 overflow-auto">
                {Array.isArray(availableTerritories) && availableTerritories.length > 0 ? (
                  availableTerritories.map((territory) => (
                    <div
                      key={territory.id}
                      onClick={() => handleSaveTerritory(territory.id)}
                      className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                    >
                      <div className="font-medium text-gray-900">{territory.name}</div>
                      {territory.description && (
                        <div className="text-sm text-gray-500 mt-1">{territory.description}</div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No territories available</p>
                    <p className="text-sm text-gray-400 mt-1">Create territories first in the Territories section</p>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end mt-6">
              <button
                type="button"
                onClick={() => setShowAddTerritoryModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Team Member Invited Successfully!
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                An invitation email has been sent to <strong>{formData.email}</strong>. 
                They will receive instructions to create their account.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowSuccessModal(false)
                    navigate('/team')
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Go to Team
                </button>
                <button
                  onClick={() => {
                    setShowSuccessModal(false)
                    // Reset form for adding another team member
                    setFormData({
                      first_name: '',
                      last_name: '',
                      email: '',
                      phone: '',
                      role: '',
                      hourly_rate: '',
                      location: '',
                      city: '',
                      state: '',
                      zip_code: '',
                    })
                    setTerritories([])
                    setEmailWarning('')
                    setPhoneWarning('')
                    setError('')
                  }}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                >
                  Add Another
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Error Popup */}
      <ErrorPopup
        isOpen={showErrorPopup}
        onClose={() => setShowErrorPopup(false)}
        title={errorPopupData.title}
        message={errorPopupData.message}
        type={errorPopupData.type}
        autoClose={true}
        autoCloseDelay={8000}
      />
    </div>
  )
}

export default AddTeamMember 
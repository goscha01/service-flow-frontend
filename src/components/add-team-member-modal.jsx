"use client"

import { useState, useEffect } from "react"
import { X, UserPlus, Edit, Calendar, DollarSign, Tag, MapPin, Search, CheckCircle } from "lucide-react"
import { teamAPI, territoriesAPI } from "../services/api"
import AddressValidation from "./address-validation"
import AddressAutocomplete from "./address-autocomplete"

// API base URL for Google Places API proxy
const API_BASE_URL = 'https://service-flow-backend-production.up.railway.app/api'

const AddTeamMemberModal = ({ isOpen, onClose, onSuccess, userId, member = null, isEditing = false }) => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    location: "",
    city: "",
    state: "",
    zipCode: "",
    role: "worker",
    isServiceProvider: true,
    isActive: true,
    color: "#2563EB",
    territories: [],
    availability: {
      monday: { start: "09:00", end: "17:00", available: true },
      tuesday: { start: "09:00", end: "17:00", available: true },
      wednesday: { start: "09:00", end: "17:00", available: true },
      thursday: { start: "09:00", end: "17:00", available: true },
      friday: { start: "09:00", end: "17:00", available: true },
      saturday: { start: "09:00", end: "17:00", available: false },
      sunday: { start: "09:00", end: "17:00", available: false }
    },
    permissions: {
      viewCustomerNotes: true,
      modifyJobStatus: true,
      editJobDetails: true,
      rescheduleJobs: true,
      editAvailability: true
    }
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [addressSuggestions, setAddressSuggestions] = useState([])
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false)
  const [territories, setTerritories] = useState([])
  const [loadingTerritories, setLoadingTerritories] = useState(false)

  useEffect(() => {
    if (isOpen && member && isEditing) {
      console.log('Setting form data for editing member:', member)
      console.log('Member territories:', member.territories)
      
      let parsedTerritories = []
      if (member.territories) {
        try {
          parsedTerritories = JSON.parse(member.territories)
          console.log('Parsed territories:', parsedTerritories)
        } catch (error) {
          console.error('Error parsing territories:', error)
          parsedTerritories = []
        }
      }
      
      // Parse availability data
      let parsedAvailability = {
        monday: { start: "09:00", end: "17:00", available: true },
        tuesday: { start: "09:00", end: "17:00", available: true },
        wednesday: { start: "09:00", end: "17:00", available: true },
        thursday: { start: "09:00", end: "17:00", available: true },
        friday: { start: "09:00", end: "17:00", available: true },
        saturday: { start: "09:00", end: "17:00", available: false },
        sunday: { start: "09:00", end: "17:00", available: false }
      }
      
      if (member.availability) {
        try {
          parsedAvailability = JSON.parse(member.availability)
        } catch (error) {
          console.error('Error parsing availability:', error)
        }
      }
      
      setFormData({
        firstName: member.first_name || "",
        lastName: member.last_name || "",
        email: member.email || "",
        phone: member.phone || "",
        location: member.location || "",
        city: member.city || "",
        state: member.state || "",
        zipCode: member.zip_code || "",
        role: member.role || "worker",
        isServiceProvider: member.is_service_provider !== false,
        color: member.color || "#2563EB",
        territories: parsedTerritories,
        availability: parsedAvailability,
        permissions: member.permissions ? JSON.parse(member.permissions) : {
          viewCustomerNotes: true,
          modifyJobStatus: true,
          editJobDetails: true,
          rescheduleJobs: true,
          editAvailability: true
        }
      })
    } else if (isOpen && !isEditing) {
      // Reset form for new member
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        location: "",
        city: "",
        state: "",
        zipCode: "",
        role: "worker",
        isServiceProvider: true,
        color: "#2563EB",
        territories: [],
        permissions: {
          viewCustomerNotes: true,
          modifyJobStatus: true,
          editJobDetails: true,
          rescheduleJobs: true,
          editAvailability: true
        }
      })
    }
  }, [isOpen, member, isEditing])

  // Fetch territories when modal opens
  useEffect(() => {
    if (isOpen && userId) {
      fetchTerritories()
    }
  }, [isOpen, userId])

  const fetchTerritories = async () => {
    try {
      setLoadingTerritories(true)
      console.log('Fetching territories for userId:', userId)
      const response = await territoriesAPI.getAll(userId, { status: 'active' })
      console.log('Territories response:', response)
      console.log('Available territories:', response.territories || [])
      setTerritories(response.territories || [])
    } catch (error) {
      console.error('Error fetching territories:', error)
      setTerritories([])
    } finally {
      setLoadingTerritories(false)
    }
  }

  const validateEmail = (email) => {
    if (!email) return false // Email is required
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const validatePhone = (phone) => {
    if (!phone) return true // Phone is optional
    // Remove all formatting characters (spaces, dashes, parentheses)
    const cleaned = phone.replace(/[\s\-\(\)]/g, '')
    // Server validation: must start with + or digit 1-9, then 0-15 more digits
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/
    return phoneRegex.test(cleaned)
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

  const handlePhoneChange = (e) => {
    const value = e.target.value
    const formatted = formatPhone(value)
    handleInputChange('phone', formatted)
  }

  const handleLocationChange = async (e) => {
    const value = e.target.value
    setFormData({ ...formData, location: value })
    
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

  const handleLocationSelect = async (suggestion) => {
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
        
        setFormData({
          ...formData,
          location: suggestion.description,
          city: city,
          state: state,
          zipCode: zipCode
        })
      } else {
        // Fallback if detailed info not available
        setFormData({ ...formData, location: suggestion.description })
      }
    } catch (error) {
      console.error('Error fetching place details:', error)
      // Fallback to just the description
      setFormData({ ...formData, location: suggestion.description })
    }
    
    setShowAddressSuggestions(false)
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleAvailabilityChange = (day, field, value) => {
    setFormData(prev => ({
      ...prev,
      availability: {
        ...prev.availability,
        [day]: {
          ...prev.availability[day],
          [field]: value
        }
      }
    }))
  }

  const handleTerritoryToggle = (territoryId) => {
    console.log('Toggling territory:', territoryId)
    setFormData(prev => {
      const currentTerritories = prev.territories || []
      const isSelected = currentTerritories.includes(territoryId)
      
      console.log('Current territories:', currentTerritories)
      console.log('Is selected:', isSelected)
      
      if (isSelected) {
        const newTerritories = currentTerritories.filter(id => id !== territoryId)
        console.log('Removing territory, new list:', newTerritories)
        return {
          ...prev,
          territories: newTerritories
        }
      } else {
        const newTerritories = [...currentTerritories, territoryId]
        console.log('Adding territory, new list:', newTerritories)
        return {
          ...prev,
          territories: newTerritories
        }
      }
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.firstName || !formData.lastName) {
      setError("Full name is required")
      return
    }
    
    if (!formData.email) {
      setError("Email is required")
      return
    }
    
    // Validate email if provided
    if (formData.email && !validateEmail(formData.email)) {
      setError("Please enter a valid email address")
      return
    }
    
    // Validate phone if provided
    if (formData.phone && !validatePhone(formData.phone)) {
      setError("Please enter a valid phone number")
      return
    }

    setLoading(true)
    setError("")

    try {
      const memberData = {
        userId,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        location: formData.location,
        city: formData.city,
        state: formData.state,
        zipCode: formData.zipCode,
        role: formData.role,
        isServiceProvider: formData.isServiceProvider,
        territories: formData.territories,
        permissions: formData.permissions,
        color: formData.color || '#2563EB'
      }
      
      console.log('Sending member data:', memberData)

      if (isEditing && member) {
        await teamAPI.update(member.id, memberData)
      } else {
        await teamAPI.create(memberData)
      }

      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error saving team member:', error)
      setError(error.response?.data?.error || "Failed to save team member. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start sm:items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl w-full max-w-lg sm:max-w-md relative my-4 sm:my-6 max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)] overflow-hidden flex flex-col">
        {/* Header - Fixed */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
          <div className="flex items-center">
            {isEditing ? (
              <Edit className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 mr-2" />
            ) : (
              <UserPlus className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 mr-2" />
            )}
            <h3 className="text-base sm:text-lg font-medium text-gray-900">
              {isEditing ? "Edit Team Member" : "Add Team Member"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <X className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* Error Message */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <form id="team-member-form" onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            {/* Basic Information */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                value={`${formData.firstName} ${formData.lastName}`.trim()}
                onChange={(e) => {
                  const names = e.target.value.split(' ')
                  handleInputChange('firstName', names[0] || '')
                  handleInputChange('lastName', names.slice(1).join(' ') || '')
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Full Name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Email Address"
                required
              />
              <p className="mt-1 text-sm text-gray-500">
                An email will be sent with instructions to log into their Zenbooker account.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mobile Phone Number
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={handlePhoneChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Optional"
              />
            </div>

            {/* Location Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location
              </label>
              <AddressAutocomplete
                  value={formData.location}
                onChange={(value) => handleInputChange('location', value)}
                onAddressSelect={(addressData) => {
                  // Update form data with structured address information
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
              <p className="mt-1 text-sm text-gray-500">
                The location this team member starts work from. Select from suggestions as you type.
              </p>
            </div>

            {/* Color Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Color
              </label>
              <div className="flex items-center space-x-3">
                <div 
                  className="w-8 h-8 rounded border border-gray-300 flex-shrink-0"
                  style={{ backgroundColor: formData.color || '#2563EB' }}
                />
                <select
                  value={formData.color || '#2563EB'}
                  onChange={(e) => handleInputChange('color', e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
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
              <p className="mt-1 text-sm text-gray-500">
                This color will be used in the calendar and schedule views
              </p>
            </div>

            {/* Activation Toggle */}
            <div className="border-t border-gray-200 pt-4 sm:pt-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Account Status</h3>
                  <p className="text-sm text-gray-500">Is this team member active and able to work?</p>
                </div>
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={() => handleInputChange('isActive', !formData.isActive)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                      formData.isActive ? 'bg-green-600' : 'bg-red-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        formData.isActive ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <span className="ml-2 text-sm font-medium text-gray-900">
                    {formData.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </div>
              </div>
            </div>

            {/* Availability Section */}
            <div className="border-t border-gray-200 pt-4 sm:pt-6">
              <h3 className="text-sm font-medium text-gray-900 mb-3">AVAILABILITY</h3>
              {/* Compact Availability List - Similar to Screenshot */}
              <div className="bg-white rounded-lg border border-gray-200">
                {formData.availability ? Object.entries(formData.availability).map(([day, schedule], index) => (
                  <div key={day}>
                    <div className="flex items-center justify-between p-3 min-w-0">
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={schedule.available}
                          onChange={(e) => handleAvailabilityChange(day, 'available', e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="text-sm font-medium text-gray-900 capitalize min-w-[80px]">
                          {day}
                        </span>
                      </div>
                      
                      {schedule.available ? (
                        <div className="flex-1 flex items-center justify-end min-w-0">
                          <div className="flex items-center space-x-2 flex-wrap">
                            <select
                              value={schedule.start}
                              onChange={(e) => handleAvailabilityChange(day, 'start', e.target.value)}
                              className="text-sm border border-gray-300 rounded px-2 py-1 min-w-0 flex-shrink-0"
                            >
                              {Array.from({ length: 24 }, (_, i) => (
                                <option key={i} value={`${i.toString().padStart(2, '0')}:00`}>
                                  {i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i - 12}:00 PM`}
                                </option>
                              ))}
                            </select>
                            <span className="text-sm text-gray-500 flex-shrink-0">to</span>
                            <select
                              value={schedule.end}
                              onChange={(e) => handleAvailabilityChange(day, 'end', e.target.value)}
                              className="text-sm border border-gray-300 rounded px-2 py-1 min-w-0 flex-shrink-0"
                            >
                              {Array.from({ length: 24 }, (_, i) => (
                                <option key={i} value={`${i.toString().padStart(2, '0')}:00`}>
                                  {i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i - 12}:00 PM`}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">
                          Unavailable
                        </div>
                      )}
                    </div>
                    {index < Object.entries(formData.availability).length - 1 && (
                      <div className="border-b border-gray-100"></div>
                    )}
                  </div>
                )) : (
                  <div className="p-4 text-center text-gray-500">
                    Loading availability...
                  </div>
                )}
              </div>
            </div>

            {/* Territories Section */}
            <div className="border-t border-gray-200 pt-4 sm:pt-6">
              <h3 className="text-sm font-medium text-gray-900 mb-3">TERRITORIES</h3>
              {loadingTerritories ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-sm text-gray-500">Loading territories...</span>
                </div>
              ) : territories.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500">No territories available</p>
                  <p className="text-xs text-gray-400 mt-1">Create territories in the Territories section first</p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {territories.map((territory) => {
                    const isSelected = formData.territories.includes(territory.id)
                    return (
                      <button
                        key={territory.id}
                        type="button"
                        onClick={() => handleTerritoryToggle(territory.id)}
                        className={`inline-flex items-center px-3 py-1.5 border rounded-full text-sm font-medium transition-colors ${
                          isSelected
                            ? 'border-blue-500 bg-blue-100 text-blue-800 hover:bg-blue-200'
                            : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-400'
                        }`}
                      >
                        <MapPin className="w-4 h-4 mr-1" />
                        {territory.name}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* User Role and Permissions */}
            <div className="border-t border-gray-200 pt-4 sm:pt-6">
              <h3 className="text-sm font-medium text-gray-900 mb-3">User Role and Permissions</h3>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="role"
                    value="worker"
                    checked={formData.role === 'worker'}
                    onChange={(e) => handleInputChange('role', e.target.value)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                  />
                  <div className="ml-3">
                    <span className="text-sm font-medium text-gray-900">Worker</span>
                    <p className="text-sm text-gray-500">Can view and update job status</p>
                  </div>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="role"
                    value="supervisor"
                    checked={formData.role === 'supervisor'}
                    onChange={(e) => handleInputChange('role', e.target.value)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                  />
                  <div className="ml-3">
                    <span className="text-sm font-medium text-gray-900">Supervisor</span>
                    <p className="text-sm text-gray-500">Can manage jobs and team members</p>
                  </div>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="role"
                    value="manager"
                    checked={formData.role === 'manager'}
                    onChange={(e) => handleInputChange('role', e.target.value)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                  />
                  <div className="ml-3">
                    <span className="text-sm font-medium text-gray-900">Manager</span>
                    <p className="text-sm text-gray-500">Full access to all features</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Permissions Section */}
            <div className="border-t border-gray-200 pt-4 sm:pt-6">
              <h3 className="text-sm font-medium text-gray-900 mb-3">PERMISSIONS</h3>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.permissions.viewCustomerNotes}
                    onChange={(e) => handleInputChange('permissions', {
                      ...formData.permissions,
                      viewCustomerNotes: e.target.checked
                    })}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <span className="ml-3 text-sm text-gray-900">View Customer Notes</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.permissions.modifyJobStatus}
                    onChange={(e) => handleInputChange('permissions', {
                      ...formData.permissions,
                      modifyJobStatus: e.target.checked
                    })}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <span className="ml-3 text-sm text-gray-900">Modify Job Status</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.permissions.editJobDetails}
                    onChange={(e) => handleInputChange('permissions', {
                      ...formData.permissions,
                      editJobDetails: e.target.checked
                    })}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <span className="ml-3 text-sm text-gray-900">Edit Job Details</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.permissions.rescheduleJobs}
                    onChange={(e) => handleInputChange('permissions', {
                      ...formData.permissions,
                      rescheduleJobs: e.target.checked
                    })}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <span className="ml-3 text-sm text-gray-900">Reschedule Jobs</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.permissions.editAvailability}
                    onChange={(e) => handleInputChange('permissions', {
                      ...formData.permissions,
                      editAvailability: e.target.checked
                    })}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <span className="ml-3 text-sm text-gray-900">Edit Availability</span>
                </label>
              </div>
            </div>
          </form>
        </div>

        {/* Footer - Fixed */}
        <div className="flex items-center justify-end space-x-3 p-4 sm:p-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="team-member-form"
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                {isEditing ? <Edit className="w-4 h-4 mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
                {isEditing ? "Update" : "Add"} Team Member
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default AddTeamMemberModal 
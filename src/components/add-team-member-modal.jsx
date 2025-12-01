"use client"

import { useState, useEffect } from "react"
import { X, UserPlus, Edit, Calendar, DollarSign, Tag, MapPin, Search, CheckCircle, AlertCircle } from "lucide-react"
import { teamAPI, territoriesAPI } from "../services/api"
import AddressValidation from "./address-validation"
import AddressAutocomplete from "./address-autocomplete"
import Notification from "./notification"

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
      editAvailability: true,
      viewCustomerContact: false,
      viewCustomerNotes: false,
      markJobStatus: true,
      resetJobStatuses: false,
      editJobDetails: true,
      viewEditJobPrice: false,
      processPayments: false,
      rescheduleJobs: true,
      seeOtherProviders: true
    }
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showErrorNotification, setShowErrorNotification] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [addressSuggestions, setAddressSuggestions] = useState([])
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false)
  const [territories, setTerritories] = useState([])
  const [loadingTerritories, setLoadingTerritories] = useState(false)
  const [fullNameInput, setFullNameInput] = useState("") // Local state for full name input to preserve spaces

  useEffect(() => {
    if (isOpen && member && isEditing) {
      console.log('Setting form data for editing member:', member)
      console.log('Member territories:', member.territories)
      
      let parsedTerritories = []
      if (member.territories) {
        try {
          if (typeof member.territories === 'string') {
            parsedTerritories = JSON.parse(member.territories)
          } else if (Array.isArray(member.territories)) {
            parsedTerritories = member.territories
          }
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
          if (typeof member.availability === 'string') {
          parsedAvailability = JSON.parse(member.availability)
          } else if (typeof member.availability === 'object' && member.availability !== null) {
            parsedAvailability = member.availability
          }
        } catch (error) {
          console.error('Error parsing availability:', error)
        }
      }
      
      const firstName = member.first_name || ""
      const lastName = member.last_name || ""
      setFullNameInput(`${firstName} ${lastName}`.trim()) // Set full name input for editing
      setFormData({
        firstName: firstName,
        lastName: lastName,
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
        permissions: (() => {
          if (!member.permissions) {
            return {
              editAvailability: true,
              viewCustomerContact: false,
              viewCustomerNotes: false,
              markJobStatus: true,
              resetJobStatuses: false,
              editJobDetails: true,
              viewEditJobPrice: false,
              processPayments: false,
              rescheduleJobs: true,
              seeOtherProviders: true
            }
          }
          
          try {
            if (typeof member.permissions === 'string') {
              return JSON.parse(member.permissions)
            } else if (typeof member.permissions === 'object' && member.permissions !== null) {
              return member.permissions
            }
          } catch (error) {
            console.error('Error parsing permissions:', error)
          }
          
          // Default permissions based on role
          const defaultPerms = {
            editAvailability: true,
            viewCustomerContact: false,
            viewCustomerNotes: false,
            markJobStatus: true,
            resetJobStatuses: false,
            editJobDetails: true,
            viewEditJobPrice: false,
            processPayments: false,
            rescheduleJobs: true,
            seeOtherProviders: true
          }
          
          // If role is scheduler, set scheduler-specific defaults
          if (member.role === 'scheduler') {
            defaultPerms.editAvailability = true
            defaultPerms.processPayments = false
          }
          
          return defaultPerms
        })()
      })
    } else if (isOpen && !isEditing) {
      // Reset form for new member
      setFullNameInput("") // Reset full name input
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
          editAvailability: true,
          viewCustomerContact: false,
          viewCustomerNotes: false,
          markJobStatus: true,
          resetJobStatuses: false,
          editJobDetails: true,
          viewEditJobPrice: false,
          processPayments: false,
          rescheduleJobs: true,
          seeOtherProviders: true
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
    const cleaned = phone.replace(/[\s\-()]/g, '')
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
    setFormData(prev => {
      const updated = {
        ...prev,
        [field]: value
      }
      
      // When role changes, update default permissions
      if (field === 'role') {
        if (value === 'scheduler') {
          // Scheduler defaults: editAvailability checked, processPayments unchecked
          updated.permissions = {
            editAvailability: true,
            viewCustomerContact: true,
            viewCustomerNotes: true,
            markJobStatus: true,
            resetJobStatuses: true,
            editJobDetails: true,
            viewEditJobPrice: true,
            processPayments: false, // Default unchecked for scheduler
            rescheduleJobs: true,
            seeOtherProviders: true
          }
        } else if (value === 'manager') {
          // Manager has full access, so all permissions are enabled
          updated.permissions = {
            editAvailability: true,
            viewCustomerContact: true,
            viewCustomerNotes: true,
            markJobStatus: true,
            resetJobStatuses: true,
            editJobDetails: true,
            viewEditJobPrice: true,
            processPayments: true,
            rescheduleJobs: true,
            seeOtherProviders: true
          }
        } else if (value === 'worker') {
          // Reset to worker defaults if switching from another role
          updated.permissions = {
            editAvailability: true,
            viewCustomerContact: false,
            viewCustomerNotes: false,
            markJobStatus: true,
            resetJobStatuses: false,
            editJobDetails: true,
            viewEditJobPrice: false,
            processPayments: false,
            rescheduleJobs: true,
            seeOtherProviders: true
          }
        }
      }
      
      return updated
    })
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
    console.log('🔄 Toggling territory:', territoryId)
    console.log('🔄 Territory type:', typeof territoryId)
    setFormData(prev => {
      const currentTerritories = prev.territories || []
      const isSelected = currentTerritories.includes(territoryId)
      
      console.log('📋 Current territories before toggle:', currentTerritories)
      console.log('✅ Is territory selected:', isSelected)
      console.log('🔍 Territory ID to toggle:', territoryId)
      
      if (isSelected) {
        const newTerritories = currentTerritories.filter(id => {
          console.log('🔍 Comparing:', id, 'with', territoryId, 'types:', typeof id, typeof territoryId)
          return id !== territoryId
        })
        console.log('❌ Removing territory, new list:', newTerritories)
        return {
          ...prev,
          territories: newTerritories
        }
      } else {
        const newTerritories = [...currentTerritories, territoryId]
        console.log('➕ Adding territory, new list:', newTerritories)
        return {
          ...prev,
          territories: newTerritories
        }
      }
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Names are optional - trim them but don't require them
    const trimmedFirstName = formData.firstName?.trim() || ''
    const trimmedLastName = formData.lastName?.trim() || ''
    
    // Update formData with trimmed values (allow empty strings)
    if (formData.firstName !== trimmedFirstName || formData.lastName !== trimmedLastName) {
      setFormData(prev => ({
        ...prev,
        firstName: trimmedFirstName,
        lastName: trimmedLastName
      }))
    }
    
    if (!formData.email) {
      const errorMsg = "Email is required"
      setError(errorMsg)
      setErrorMessage(errorMsg)
      setShowErrorNotification(true)
      return
    }
    
    // Validate email if provided
    if (formData.email && !validateEmail(formData.email)) {
      const errorMsg = "Please enter a valid email address"
      setError(errorMsg)
      setErrorMessage(errorMsg)
      setShowErrorNotification(true)
      return
    }
    
    // Validate phone if provided
    if (formData.phone && !validatePhone(formData.phone)) {
      const errorMsg = "Please enter a valid phone number"
      setError(errorMsg)
      setErrorMessage(errorMsg)
      setShowErrorNotification(true)
      return
    }

    setLoading(true)
    setError("")
    setShowErrorNotification(false)

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
        permissions: typeof formData.permissions === 'string' 
          ? formData.permissions 
          : JSON.stringify(formData.permissions || {}),
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
      const errorMsg = error.response?.data?.error || error.message || "Failed to save team member. Please try again."
      setError(errorMsg)
      setErrorMessage(errorMsg)
      setShowErrorNotification(true)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Error Toast Notification */}
      <Notification
        message={errorMessage}
        type="error"
        duration={5000}
        show={showErrorNotification}
        onClose={() => setShowErrorNotification(false)}
      />
      
      <div className="fixed inset-0 bg-black/50 flex items-start sm:items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl w-full max-w-2xl sm:max-w-md relative my-4 sm:my-6 max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)] overflow-hidden flex flex-col">
        {/* Header - Fixed */}
        <div className="flex items-center justify-center p-4 sm:p-6 border-b border-gray-200">
          <div className="flex items-center">
            {/* {isEditing ? (
              <Edit className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 mr-2" />
            ) : (
              <UserPlus className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 mr-2" />
            )} */}
            <h3 className="text-md sm:text-md font-semibold text-gray-900">
              {isEditing ? "Edit Team Member" : "Add Team Member"}
            </h3>
          </div>
          
        </div>
        <button
            onClick={onClose}
            className="text-black cursor-pointer bg-gray-100 rounded-sm hover:bg-gray-200 p-1 absolute top-4 right-4"
          >
            <X className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">

          <form id="team-member-form" onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            {/* Basic Information */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={fullNameInput}
                onChange={(e) => {
                  const value = e.target.value
                  setFullNameInput(value) // Update local state to preserve spaces while typing
                  // Split by spaces and filter out empty strings (handles multiple spaces)
                  const trimmedValue = value.trim()
                  const names = trimmedValue.split(/\s+/).filter(name => name.length > 0)
                  handleInputChange('firstName', names[0] || '')
                  handleInputChange('lastName', names.slice(1).join(' ') || '')
                }}
                onBlur={() => {
                  // Trim the input when user leaves the field
                  const trimmed = fullNameInput.trim()
                  setFullNameInput(trimmed)
                  const names = trimmed.split(/\s+/).filter(name => name.length > 0)
                  handleInputChange('firstName', names[0] || '')
                  handleInputChange('lastName', names.slice(1).join(' ') || '')
                }}
                className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Full Name"
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
                className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Email Address"
                required
              />
              <p className="mt-1 text-xs text-gray-500">
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
                className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Optional"
              />
              <p className="mt-1 text-xs text-gray-500">
              Service providers can be notified via SMS when new jobs are assigned to them</p>
            </div>

            {/* Location Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Location
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
                className="w-full text-xs"
              />
              <p className="mt-1 text-xs text-gray-500">
                The location this team member starts work from.
              </p>
            </div>

            {/* Service Provider Toggle */}
            <div className="border border-gray-200 p-2 rounded-lg">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Service Provider</h3>
                  <p className="text-xs text-gray-500">Can this team member be assigned to jobs?</p>
                </div>
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={() => handleInputChange('isServiceProvider', !formData.isServiceProvider)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                      formData.isServiceProvider ? 'bg-green-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        formData.isServiceProvider ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <span className="ml-2 text-sm font-medium text-gray-900">
                    {formData.isServiceProvider ? 'YES' : 'NO'}
                  </span>
                </div>
              </div>
            </div>

            {/* User Role and Permissions */}
            <div className="border-t border-gray-200 pt-4 sm:pt-6">
              <h3 className="text-md font-semibold text-black mb-3">User Role and Permissions</h3>
              <div className="space-y-4 ">
                {/* Worker Role */}
                <label className="flex divide-y items-start flex-col border border-gray-200 rounded-lg cursor-pointer">
                <div className="flex p-3 space-x-2">  
                  <input
                    type="radio"
                    name="role"
                    value="worker"
                    checked={formData.role === 'worker'}
                    onChange={(e) => handleInputChange('role', e.target.value)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 mt-0.5"
                  />
                  <div className="flex flex-col">
                   <span className="text-sm font-medium text-gray-900">Worker</span>
                    <p className="text-xs text-gray-500 mt-1">
                      Can only view jobs assigned to them. You can customize what job details they can see and edit.
                    </p>
                    </div>
                    </div>
                       
                    {/* Worker-specific permissions - only show when Worker is selected */}
                    {formData.role === 'worker' && (
                  <div className="p-3 flex w-full bg-gray-50">
                   
                 
                      <div className="mt-2 space-y-3 pl-0 w-full">
                          
                          
                          <div className="ml-6 mt-2 space-y-2">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={formData.permissions.editAvailability !== false}
                              onChange={(e) => handleInputChange('permissions', {
                                ...formData.permissions,
                                editAvailability: e.target.checked
                              })}
                              className="h-3 w-3 rounded-sm text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                            />
                            <span className="ml-2 text-xs text-gray-800">Edit their own availability</span>
                          </label>
                            <p className="text-[10px] font-medium text-gray-400 mb-2">
                              For jobs assigned to this team member, allow them to:
                            </p>
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={formData.permissions.viewCustomerContact || false}
                                onChange={(e) => handleInputChange('permissions', {
                                  ...formData.permissions,
                                  viewCustomerContact: e.target.checked
                                })}
                                className="h-3 w-3 rounded-sm text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                              />
                              <span className="ml-2 text-xs text-gray-700">View contact info for customer</span>
                            </label>
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={formData.permissions.viewCustomerNotes || false}
                                onChange={(e) => handleInputChange('permissions', {
                                  ...formData.permissions,
                                  viewCustomerNotes: e.target.checked
                                })}
                                className="h-3 w-3 rounded-sm text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                              />
                              <span className="ml-2 text-xs text-gray-700">View customer notes</span>
                            </label>
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={formData.permissions.markJobStatus !== false}
                                onChange={(e) => handleInputChange('permissions', {
                                  ...formData.permissions,
                                  markJobStatus: e.target.checked
                                })}
                                className="h-3 w-3 rounded-sm text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                              />
                              <span className="ml-2 text-xs text-gray-700">Mark jobs as 'en-route', 'in-progress' & 'complete'</span>
                            </label>
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={formData.permissions.resetJobStatuses || false}
                                onChange={(e) => handleInputChange('permissions', {
                                  ...formData.permissions,
                                  resetJobStatuses: e.target.checked
                                })}
                                className="h-3 w-3 rounded-sm text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                              />
                              <span className="ml-2 text-xs text-gray-700">Reset job statuses</span>
                            </label>
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={formData.permissions.editJobDetails !== false}
                                onChange={(e) => handleInputChange('permissions', {
                                  ...formData.permissions,
                                  editJobDetails: e.target.checked
                                })}
                                className="h-3 w-3 rounded-sm text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                              />
                              <span className="ml-2 text-xs text-gray-700">Edit job details</span>
                            </label>
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={formData.permissions.viewEditJobPrice || false}
                                onChange={(e) => handleInputChange('permissions', {
                                  ...formData.permissions,
                                  viewEditJobPrice: e.target.checked
                                })}
                                    className="h-3 w-3 rounded-sm text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                              />
                              <span className="ml-2 text-xs text-gray-700">View & edit job price, invoice, and line items</span>
                            </label>
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={formData.permissions.processPayments || false}
                                onChange={(e) => handleInputChange('permissions', {
                                  ...formData.permissions,
                                  processPayments: e.target.checked
                                })}
                                className="h-3 w-3 rounded-sm text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                              />
                              <span className="ml-2 text-xs text-gray-700">Process payments and mark jobs as paid</span>
                            </label>
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={formData.permissions.rescheduleJobs !== false}
                                onChange={(e) => handleInputChange('permissions', {
                                  ...formData.permissions,
                                  rescheduleJobs: e.target.checked
                                })}
                                className="h-3 w-3 rounded-sm text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                              />
                              <span className="ml-2 text-xs text-gray-700">Reschedule jobs</span>
                            </label>
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={formData.permissions.seeOtherProviders !== false}
                                onChange={(e) => handleInputChange('permissions', {
                                  ...formData.permissions,
                                  seeOtherProviders: e.target.checked
                                })}
                                  className="h-3 w-3 rounded-sm text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                              />
                              <span className="ml-2 text-xs text-gray-700">See other providers assigned</span>
                            </label>
                          </div>
                      </div>
                  </div>
                  
                )}
                </label>

                {/* Scheduler Role */}
                <label className="flex divide-y items-start flex-col border border-gray-200 rounded-lg cursor-pointer">
                  
                <div className="flex p-3 space-x-2">  
                  <input
                    type="radio"
                    name="role"
                    value="scheduler"
                    checked={formData.role === 'scheduler'}
                    onChange={(e) => handleInputChange('role', e.target.value)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 mt-0.5"
                  />
                  <div className="ml-3 flex-1">
                    <span className="text-sm font-medium text-gray-900">Scheduler</span>
                    <p className="text-xs text-gray-500 mt-1">
                      Full access to all job and client details. Schedulers can create, dispatch, reschedule, and edit jobs.
                    </p>
                    </div>
                    </div>
                    {/* Scheduler-specific permissions - only show when Scheduler is selected */}
                    {formData.role === 'scheduler' && (
                       <div className="p-3 flex w-full bg-gray-50">
                 
                          <div className="space-y-3 p-3">
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={formData.permissions.editAvailability !== false}
                                onChange={(e) => handleInputChange('permissions', {
                                  ...formData.permissions,
                                  editAvailability: e.target.checked
                                })}
                                className="h-3 w-3 rounded-sm text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                              <span className="ml-2 text-xs text-gray-700">Edit their own availability</span>
                            </label>
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={formData.permissions.processPayments || false}
                                onChange={(e) => handleInputChange('permissions', {
                                  ...formData.permissions,
                                  processPayments: e.target.checked
                                })}
                                className="h-3 w-3 rounded-sm text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                              <span className="ml-2 text-xs text-gray-700">Process payments and mark jobs as paid</span>
                            </label>
                      </div>
                      </div>
                    )}
                </label>

                {/* Manager Role */}
                <label className="flex items-start cursor-pointer border border-gray-200 rounded-lg p-3">
                  <input
                    type="radio"
                    name="role"
                    value="manager"
                    checked={formData.role === 'manager'}
                    onChange={(e) => handleInputChange('role', e.target.value)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 mt-0.5"
                  />
                  <div className="ml-3 flex-1">
                    <span className="text-sm font-medium text-gray-900">Manager</span>
                    <p className="text-xs text-gray-500 mt-1">
                      Managers have full access to all areas of the business, including adding or removing users.
                    </p>
                  </div>
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
            type="button"
            onClick={(e) => {
              e.preventDefault()
              handleSubmit(e)
            }}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
    </>
  )
}

export default AddTeamMemberModal 
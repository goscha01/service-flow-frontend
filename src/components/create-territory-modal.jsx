"use client"

import { useState, useEffect, useRef } from "react"
import { X, MapPin, Clock, Users, DollarSign, Settings, Globe, Target, Plus, Minus } from "lucide-react"
import { territoriesAPI } from "../services/api"
import AddressAutocomplete from "./address-autocomplete"

// API base URL for Google Places API proxy
const API_BASE_URL = 'https://service-flow-backend-production-4568.up.railway.app/api'

const CreateTerritoryModal = ({ isOpen, onClose, onSuccess, territory = null, isEditing = false, userId }) => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    location: "",
    zipCodes: [],
    radiusMiles: 25,
    timezone: "America/New_York",
    status: "active",
    businessHours: {
      monday: { start: "09:00", end: "17:00", enabled: true },
      tuesday: { start: "09:00", end: "17:00", enabled: true },
      wednesday: { start: "09:00", end: "17:00", enabled: true },
      thursday: { start: "09:00", end: "17:00", enabled: true },
      friday: { start: "09:00", end: "17:00", enabled: true },
      saturday: { start: "09:00", end: "15:00", enabled: false },
      sunday: { start: "09:00", end: "12:00", enabled: false }
    },
    teamMembers: [],
    services: [],
    pricingMultiplier: 1.00
  })
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [newZipCode, setNewZipCode] = useState("")
  const [availableTeamMembers, setAvailableTeamMembers] = useState([])
  const [availableServices, setAvailableServices] = useState([])

  useEffect(() => {
    if (isOpen && territory && isEditing) {
      // Default business hours structure
      const defaultBusinessHours = {
        monday: { start: "09:00", end: "17:00", enabled: true },
        tuesday: { start: "09:00", end: "17:00", enabled: true },
        wednesday: { start: "09:00", end: "17:00", enabled: true },
        thursday: { start: "09:00", end: "17:00", enabled: true },
        friday: { start: "09:00", end: "17:00", enabled: true },
        saturday: { start: "09:00", end: "15:00", enabled: false },
        sunday: { start: "09:00", end: "12:00", enabled: false }
      }

      // Parse business hours from territory, ensuring complete structure
      let businessHours = defaultBusinessHours
      if (territory.business_hours) {
        try {
          const parsedHours = typeof territory.business_hours === 'string' 
            ? JSON.parse(territory.business_hours) 
            : territory.business_hours
          
          // Merge with defaults to ensure all days have complete structure
          businessHours = {
            ...defaultBusinessHours,
            ...parsedHours
          }
        } catch (error) {
          console.error('Error parsing business hours:', error)
          businessHours = defaultBusinessHours
        }
      }

      setFormData({
        name: territory.name || "",
        description: territory.description || "",
        location: territory.location || "",
        zipCodes: territory.zip_codes || [],
        radiusMiles: territory.radius_miles || 25,
        timezone: territory.timezone || "America/New_York",
        status: territory.status || "active",
        businessHours: businessHours,
        teamMembers: territory.team_members || [],
        services: territory.services || [],
        pricingMultiplier: territory.pricing_multiplier || 1.00
      })
    } else if (isOpen && !isEditing) {
      // Reset form for new territory
      setFormData({
        name: "",
        description: "",
        location: "",
        zipCodes: [],
        radiusMiles: 25,
        timezone: "America/New_York",
        status: "active",
        businessHours: {
          monday: { start: "09:00", end: "17:00", enabled: true },
          tuesday: { start: "09:00", end: "17:00", enabled: true },
          wednesday: { start: "09:00", end: "17:00", enabled: true },
          thursday: { start: "09:00", end: "17:00", enabled: true },
          friday: { start: "09:00", end: "17:00", enabled: true },
          saturday: { start: "09:00", end: "15:00", enabled: false },
          sunday: { start: "09:00", end: "12:00", enabled: false }
        },
        teamMembers: [],
        services: [],
        pricingMultiplier: 1.00
      })
    }
  }, [isOpen, territory, isEditing])


  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleLocationSelect = (addressData) => {
    setFormData(prev => ({
      ...prev,
      location: addressData.formattedAddress
    }))
    
    // Auto-add the ZIP code if found
    if (addressData.components.zipCode && !formData.zipCodes.includes(addressData.components.zipCode)) {
      setFormData(prev => ({
        ...prev,
        zipCodes: [...prev.zipCodes, addressData.components.zipCode]
      }))
    }
  }


  const handleBusinessHoursChange = (day, field, value) => {
    setFormData(prev => ({
      ...prev,
      businessHours: {
        ...prev.businessHours,
        [day]: {
          ...prev.businessHours[day],
          [field]: value
        }
      }
    }))
  }

  const addZipCode = () => {
    if (newZipCode && !formData.zipCodes.includes(newZipCode)) {
      handleInputChange('zipCodes', [...formData.zipCodes, newZipCode])
      setNewZipCode("")
    }
  }

  const removeZipCode = (zipCode) => {
    handleInputChange('zipCodes', formData.zipCodes.filter(zip => zip !== zipCode))
  }

  const toggleTeamMember = (memberId) => {
    const isSelected = formData.teamMembers.includes(memberId)
    if (isSelected) {
      handleInputChange('teamMembers', formData.teamMembers.filter(id => id !== memberId))
    } else {
      handleInputChange('teamMembers', [...formData.teamMembers, memberId])
    }
  }

  const toggleService = (serviceId) => {
    const isSelected = formData.services.includes(serviceId)
    if (isSelected) {
      handleInputChange('services', formData.services.filter(id => id !== serviceId))
    } else {
      handleInputChange('services', [...formData.services, serviceId])
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.name || !formData.location) {
      setError("Name and location are required")
      return
    }

    setLoading(true)
    setError("")

    try {
      const territoryData = {
        userId: userId, // Use the userId prop
        name: formData.name,
        description: formData.description,
        location: formData.location,
        zipCodes: formData.zipCodes,
        radiusMiles: formData.radiusMiles,
        timezone: formData.timezone,
        status: formData.status,
        businessHours: formData.businessHours,
        teamMembers: formData.teamMembers,
        services: formData.services,
        pricingMultiplier: formData.pricingMultiplier
      }

      console.log('Sending territory data:', territoryData)

      if (isEditing && territory) {
        await territoriesAPI.update(territory.id, territoryData)
      } else {
        await territoriesAPI.create(territoryData)
      }

      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error saving territory:', error)
      setError(error.response?.data?.error || "Failed to save territory. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const days = [
    { key: 'monday', label: 'Monday' },
    { key: 'tuesday', label: 'Tuesday' },
    { key: 'wednesday', label: 'Wednesday' },
    { key: 'thursday', label: 'Thursday' },
    { key: 'friday', label: 'Friday' },
    { key: 'saturday', label: 'Saturday' },
    { key: 'sunday', label: 'Sunday' }
  ]

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start sm:items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl w-full max-w-4xl relative my-4 sm:my-6 max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)] overflow-hidden flex flex-col">
        {/* Header - Fixed */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <MapPin className="h-6 w-6 text-blue-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">
              {isEditing ? "Edit Territory" : "Create Territory"}
            </h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Error Message */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Territory Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Downtown Area"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location *
                </label>
                <AddressAutocomplete
                  value={formData.location}
                  onChange={(value) => handleInputChange('location', value)}
                  onAddressSelect={handleLocationSelect}
                  placeholder="Enter address or location..."
                  className="w-full"
                  showValidationResults={true}
                />
                <p className="mt-1 text-sm text-gray-500">
                  Start typing to get address suggestions. ZIP codes will be automatically added.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Optional description of this territory"
              />
            </div>

            {/* Geographic Settings */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Geographic Settings</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Service Radius (miles)
                  </label>
                  <input
                    type="number"
                    value={formData.radiusMiles}
                    onChange={(e) => handleInputChange('radiusMiles', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min="1"
                    max="100"
                    step="0.5"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Timezone
                  </label>
                  <select
                    value={formData.timezone}
                    onChange={(e) => handleInputChange('timezone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="America/New_York">Eastern Time</option>
                    <option value="America/Chicago">Central Time</option>
                    <option value="America/Denver">Mountain Time</option>
                    <option value="America/Los_Angeles">Pacific Time</option>
                  </select>
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ZIP Codes
                </label>
                <div className="flex space-x-2 mb-2">
                  <input
                    type="text"
                    value={newZipCode}
                    onChange={(e) => setNewZipCode(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter ZIP code"
                  />
                  <button
                    type="button"
                    onClick={addZipCode}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.zipCodes.map((zipCode) => (
                    <span
                      key={zipCode}
                      className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                    >
                      {zipCode}
                      <button
                        type="button"
                        onClick={() => removeZipCode(zipCode)}
                        className="ml-2 text-blue-600 hover:text-blue-800"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Business Hours */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Business Hours</h3>
              
              <div className="space-y-3">
                {days.map((day) => (
                  <div key={day.key} className="flex items-center space-x-4">
                    <div className="w-24">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.businessHours[day.key].enabled}
                          onChange={(e) => handleBusinessHoursChange(day.key, 'enabled', e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm font-medium text-gray-900">{day.label}</span>
                      </label>
                    </div>
                    
                    {formData.businessHours[day.key].enabled && (
                      <>
                        <input
                          type="time"
                          value={formData.businessHours[day.key].start}
                          onChange={(e) => handleBusinessHoursChange(day.key, 'start', e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <span className="text-gray-500">to</span>
                        <input
                          type="time"
                          value={formData.businessHours[day.key].end}
                          onChange={(e) => handleBusinessHoursChange(day.key, 'end', e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Pricing */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Pricing</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price Multiplier
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    value={formData.pricingMultiplier}
                    onChange={(e) => handleInputChange('pricingMultiplier', parseFloat(e.target.value))}
                    className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min="0.1"
                    max="5.0"
                    step="0.1"
                  />
                  <span className="text-sm text-gray-500">x base price</span>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  This multiplier will be applied to all service prices in this territory.
                </p>
              </div>
            </div>

            {/* Status */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Status</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Territory Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>
          </form>
        </div>

        {/* Footer - Fixed */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Saving..." : (isEditing ? "Update Territory" : "Create Territory")}
          </button>
        </div>
      </div>
    </div>
  )
}

export default CreateTerritoryModal 
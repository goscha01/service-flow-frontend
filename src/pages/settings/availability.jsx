"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { ChevronLeft, MapPin, ChevronRight, Check, X } from "lucide-react"
import TimeslotTemplateModal from "../../components/timeslot-template-modal"
import { availabilityAPI, teamAPI } from "../../services/api"
import { useAuth } from "../../context/AuthContext"
import { isWorker } from "../../utils/roleUtils"

const Availability = () => {
  const [isTimeslotTemplateModalOpen, setIsTimeslotTemplateModalOpen] = useState(false)
  const [editingTemplateIndex, setEditingTemplateIndex] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const navigate = useNavigate()

  // Debug counter to track renders
  const renderCount = useMemo(() => {
    console.log('🔄 Availability component rendered')
    return Date.now()
  }, [])

  const [availabilityData, setAvailabilityData] = useState({
    businessHours: {
      monday: { start: '09:00', end: '17:00', enabled: true },
      tuesday: { start: '09:00', end: '17:00', enabled: true },
      wednesday: { start: '09:00', end: '17:00', enabled: true },
      thursday: { start: '09:00', end: '17:00', enabled: true },
      friday: { start: '09:00', end: '17:00', enabled: true },
      saturday: { start: '09:00', end: '17:00', enabled: false },
      sunday: { start: '09:00', end: '17:00', enabled: false }
    },
    drivingTime: 0,
    timeslotTemplates: []
  })

  // Business hours editor state
  const [showBusinessHoursEditor, setShowBusinessHoursEditor] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)

  // Get current user with useMemo to prevent infinite re-renders
  const { user } = useAuth()

  // Stabilize navigate function
  const handleNavigate = useCallback(() => {
    navigate('/signin')
  }, [navigate])

  const loadAvailabilityData = useCallback(async () => {
    try {
      setLoading(true)
      setMessage({ type: '', text: '' })
      
      console.log('🔄 Loading availability data for user:', user.id, 'isWorker:', isWorker(user), 'teamMemberId:', user?.teamMemberId)
      
      let availability
      let businessHours = null
      let loadedTimeslotTemplates = []
      let loadedDrivingTime = 0
      
      // Workers should load their own team member availability
      if (isWorker(user) && user?.teamMemberId) {
        availability = await teamAPI.getAvailability(user.teamMemberId)
        console.log('✅ Worker availability data loaded:', availability)
        
        // Parse worker availability - convert workingHours to businessHours format
        let availData = availability?.availability
        if (typeof availData === 'string') {
          try {
            availData = JSON.parse(availData)
          } catch (e) {
            console.error('Error parsing availability string:', e)
            availData = {}
          }
        }
        
        // Convert workingHours to businessHours format
        if (availData?.workingHours) {
          const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
          businessHours = {}
          
          days.forEach(day => {
            const dayWorkingHours = availData.workingHours[day]
            if (dayWorkingHours) {
              const isAvailable = dayWorkingHours.available !== false
              let start = '09:00'
              let end = '17:00'
              
              if (isAvailable) {
                // Get time slots
                if (dayWorkingHours.timeSlots && Array.isArray(dayWorkingHours.timeSlots) && dayWorkingHours.timeSlots.length > 0) {
                  const firstSlot = dayWorkingHours.timeSlots[0]
                  start = firstSlot.start || '09:00'
                  end = firstSlot.end || '17:00'
                } else if (dayWorkingHours.start && dayWorkingHours.end) {
                  start = dayWorkingHours.start
                  end = dayWorkingHours.end
                }
              }
              
              businessHours[day] = {
                start: start,
                end: end,
                enabled: isAvailable
              }
            } else {
              // Default for days not set
              businessHours[day] = {
                start: '09:00',
                end: '17:00',
                enabled: day !== 'saturday' && day !== 'sunday'
              }
            }
          })
        }
        loadedTimeslotTemplates = availData?.timeslotTemplates || []
        loadedDrivingTime = availData?.drivingTime ?? 0
      } else {
        // Account owners/managers load their own availability
        availability = await availabilityAPI.getAvailability(user.id)
        console.log('✅ Availability data loaded:', availability)
        
        // Parse business hours - handle different response formats
        businessHours = availability?.businessHours || availability?.business_hours
        
        // If businessHours is a string, parse it
        if (typeof businessHours === 'string') {
          try {
            businessHours = JSON.parse(businessHours)
          } catch (e) {
            console.error('Error parsing businessHours string:', e)
            businessHours = null
          }
        }
        loadedTimeslotTemplates = availability?.timeslotTemplates || availability?.timeslot_templates || []
        const bh = availability?.businessHours || availability?.business_hours
        loadedDrivingTime = (typeof bh === 'object' && bh?.drivingTime != null) ? bh.drivingTime : 0
      }
      
      // If no business hours, use defaults
      if (!businessHours || typeof businessHours !== 'object') {
        businessHours = {
          monday: { start: '09:00', end: '17:00', enabled: true },
          tuesday: { start: '09:00', end: '17:00', enabled: true },
          wednesday: { start: '09:00', end: '17:00', enabled: true },
          thursday: { start: '09:00', end: '17:00', enabled: true },
          friday: { start: '09:00', end: '17:00', enabled: true },
          saturday: { start: '09:00', end: '17:00', enabled: false },
          sunday: { start: '09:00', end: '17:00', enabled: false }
        }
      }
      
      // Ensure all days have the correct structure
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
      const normalizedBusinessHours = {}
      days.forEach(day => {
        if (businessHours[day]) {
          normalizedBusinessHours[day] = {
            start: businessHours[day].start || '09:00',
            end: businessHours[day].end || '17:00',
            enabled: businessHours[day].enabled !== undefined ? businessHours[day].enabled : true
          }
        } else {
          normalizedBusinessHours[day] = {
            start: '09:00',
            end: '17:00',
            enabled: day === 'saturday' || day === 'sunday' ? false : true
          }
        }
      })
      
      setAvailabilityData({
        businessHours: normalizedBusinessHours,
        drivingTime: loadedDrivingTime ?? (businessHours?.drivingTime || 0),
        timeslotTemplates: loadedTimeslotTemplates
      })
    } catch (error) {
      console.error('❌ Error loading availability data:', error)
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        stack: error.stack
      })
      
      // Set default data on error
      setAvailabilityData({
        businessHours: {
          monday: { start: '09:00', end: '17:00', enabled: true },
          tuesday: { start: '09:00', end: '17:00', enabled: true },
          wednesday: { start: '09:00', end: '17:00', enabled: true },
          thursday: { start: '09:00', end: '17:00', enabled: true },
          friday: { start: '09:00', end: '17:00', enabled: true },
          saturday: { start: '09:00', end: '17:00', enabled: false },
          sunday: { start: '09:00', end: '17:00', enabled: false }
        },
        drivingTime: 0,
        timeslotTemplates: []
      })
      
      // Show more detailed error message
      const errorMessage = error.response?.data?.error || error.message || 'Unknown error'
      if (error.response?.status === 404) {
        setMessage({ type: 'error', text: 'Availability settings not found. Using default settings.' })
      } else if (error.response?.status === 500) {
        setMessage({ type: 'error', text: `Server error: ${errorMessage}. Using default availability settings.` })
      } else if (error.message?.includes('Network') || error.code === 'NETWORK_ERROR') {
        setMessage({ type: 'error', text: 'Network error. Please check your connection and try again.' })
      } else {
        setMessage({ type: 'error', text: `Failed to load availability settings: ${errorMessage}. Using defaults.` })
      }
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    console.log('🔄 Availability useEffect triggered:', { user: !!user, userId: user?.id, hasLoaded })
    
    if (user?.id && !hasLoaded) {
      console.log('✅ Loading availability data...')
      setHasLoaded(true)
      loadAvailabilityData()
    } else if (user === null) {
      console.log('❌ No current user, redirecting to signin')
      handleNavigate()
    } else {
      console.log('⏭️ Skipping load - already loaded or no user')
    }
  }, [user?.id, hasLoaded, handleNavigate, loadAvailabilityData, user])

  const handleSaveTimeslotTemplate = async (template) => {
    try {
      setSaving(true)

      let updatedTemplates
      if (editingTemplateIndex !== null) {
        updatedTemplates = [...availabilityData.timeslotTemplates]
        updatedTemplates[editingTemplateIndex] = template
      } else {
        updatedTemplates = [...availabilityData.timeslotTemplates, template]
      }

      const newDrivingTime = template.drivingTime ?? availabilityData.drivingTime ?? 0

      if (isWorker(user) && user?.teamMemberId) {
        // Team members: save templates to their own team member availability (not user/owner)
        const currentAvailability = await teamAPI.getAvailability(user.teamMemberId)
        let availData = currentAvailability?.availability
        if (typeof availData === 'string') {
          try {
            availData = JSON.parse(availData)
          } catch (e) {
            availData = { workingHours: {}, customAvailability: [] }
          }
        }
        if (!availData) availData = { workingHours: {}, customAvailability: [] }
        if (!availData.workingHours) availData.workingHours = {}
        // Merge current businessHours from UI into workingHours so we don't lose them
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
        days.forEach(day => {
          const h = availabilityData.businessHours[day]
          if (h?.enabled) {
            availData.workingHours[day] = {
              available: true,
              timeSlots: [{ start: h.start || '09:00', end: h.end || '17:00' }]
            }
          } else {
            availData.workingHours[day] = { available: false, timeSlots: [] }
          }
        })
        availData.timeslotTemplates = updatedTemplates
        availData.drivingTime = newDrivingTime
        await teamAPI.updateAvailability(user.teamMemberId, availData)
      } else {
        // Account owners: save to user_availability
        await availabilityAPI.updateAvailability({
          userId: user.id,
          businessHours: { ...availabilityData.businessHours, drivingTime: newDrivingTime },
          timeslotTemplates: updatedTemplates
        })
      }

      setAvailabilityData(prev => ({
        ...prev,
        drivingTime: newDrivingTime,
        timeslotTemplates: updatedTemplates
      }))

      setMessage({ type: 'success', text: editingTemplateIndex !== null ? 'Template updated successfully!' : 'Timeslot template saved successfully!' })
      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
      setIsTimeslotTemplateModalOpen(false)
      setEditingTemplateIndex(null)
    } catch (error) {
      console.error('Error saving timeslot template:', error)
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to save timeslot template' })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteTimeslotTemplate = async (indexToDelete) => {
    try {
      setSaving(true)
      const updatedTemplates = availabilityData.timeslotTemplates.filter((_, i) => i !== indexToDelete)

      if (isWorker(user) && user?.teamMemberId) {
        const currentAvailability = await teamAPI.getAvailability(user.teamMemberId)
        let availData = currentAvailability?.availability
        if (typeof availData === 'string') {
          try {
            availData = JSON.parse(availData)
          } catch (e) {
            availData = { workingHours: {}, customAvailability: [] }
          }
        }
        if (!availData) availData = { workingHours: {}, customAvailability: [] }
        availData.timeslotTemplates = updatedTemplates
        if (availabilityData.drivingTime != null) availData.drivingTime = availabilityData.drivingTime
        await teamAPI.updateAvailability(user.teamMemberId, availData)
      } else {
        await availabilityAPI.updateAvailability({
          userId: user.id,
          businessHours: { ...availabilityData.businessHours, drivingTime: availabilityData.drivingTime || 0 },
          timeslotTemplates: updatedTemplates
        })
      }

      setAvailabilityData(prev => ({
        ...prev,
        timeslotTemplates: updatedTemplates
      }))

      setMessage({ type: 'success', text: 'Template deleted successfully!' })
      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
    } catch (error) {
      console.error('Error deleting timeslot template:', error)
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to delete timeslot template' })
    } finally {
      setSaving(false)
    }
  }

  const handleEditTemplate = (index) => {
    setEditingTemplateIndex(index)
    setIsTimeslotTemplateModalOpen(true)
  }

  const handleSaveBusinessHours = async () => {
    try {
      setSaving(true)
      setMessage({ type: '', text: '' })
      
      console.log('💾 Saving business hours:', {
        userId: user.id,
        isWorker: isWorker(user),
        teamMemberId: user?.teamMemberId,
        businessHours: availabilityData.businessHours,
        timeslotTemplates: availabilityData.timeslotTemplates
      })
      
      // Workers should save to their team member availability
      if (isWorker(user) && user?.teamMemberId) {
        // Get current availability
        const currentAvailability = await teamAPI.getAvailability(user.teamMemberId)
        let availData = currentAvailability?.availability
        
        if (typeof availData === 'string') {
          try {
            availData = JSON.parse(availData)
          } catch (e) {
            console.error('Error parsing availability:', e)
            availData = { workingHours: {}, customAvailability: [] }
          }
        }
        
        if (!availData) {
          availData = { workingHours: {}, customAvailability: [] }
        }
        
        // Convert businessHours format to workingHours format
        const workingHours = {}
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
        
        days.forEach(day => {
          const dayBusinessHours = availabilityData.businessHours[day]
          if (dayBusinessHours.enabled) {
            workingHours[day] = {
              available: true,
              timeSlots: [{
                start: dayBusinessHours.start,
                end: dayBusinessHours.end
              }]
            }
          } else {
            workingHours[day] = {
              available: false,
              timeSlots: []
            }
          }
        })
        
        // Update availability with new workingHours
        availData.workingHours = workingHours
        
        // Save to team member availability (pass object so backend stringifies once)
        await teamAPI.updateAvailability(user.teamMemberId, availData)
        
        console.log('✅ Worker availability saved successfully')
        setMessage({ type: 'success', text: 'Availability hours saved successfully!' })
      } else {
        // Account owners/managers save to their own availability
        const response = await availabilityAPI.updateAvailability({
          userId: user.id,
          businessHours: { ...availabilityData.businessHours, drivingTime: availabilityData.drivingTime || 0 },
          timeslotTemplates: availabilityData.timeslotTemplates
        })
        
        console.log('✅ Save response:', response)
        setMessage({ type: 'success', text: 'Business hours saved successfully!' })
      }
      
      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
      setShowBusinessHoursEditor(false)
      
      // Refresh data to ensure it's in sync
      await loadAvailabilityData()
    } catch (error) {
      console.error('❌ Error saving business hours:', error)
      const errorMessage = error.response?.data?.error || error.message || 'Failed to save business hours'
      setMessage({ type: 'error', text: errorMessage })
    } finally {
      setSaving(false)
    }
  }

  const handleBusinessHoursChange = (day, field, value) => {
    setAvailabilityData(prev => ({
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

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading availability settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => {
                // For workers, go to availability page instead of settings
                if (isWorker(user) && user?.teamMemberId) {
                  navigate("/availability")
                } else {
                  navigate("/settings")
                }
              }}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm">{isWorker(user) && user?.teamMemberId ? "Availability" : "Settings"}</span>
            </button>
            <h1 className="text-2xl font-semibold text-gray-900">Availability</h1>
          </div>
        </div>

        {/* Message */}
        {message.text && (
          <div className={`px-6 py-3 ${message.type === 'success' ? 'bg-green-50 border-l-4 border-green-400' : 'bg-red-50 border-l-4 border-red-400'}`}>
            <div className="flex items-center">
              {message.type === 'success' ? (
                <Check className="w-5 h-5 text-green-400 mr-2" />
              ) : (
                <X className="w-5 h-5 text-red-400 mr-2" />
              )}
              <span className={`text-sm ${message.type === 'success' ? 'text-green-700' : 'text-red-700'}`}>
                {message.text}
              </span>
            </div>
        </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-6xl mx-auto p-6 space-y-8">
            {/* Hours of Operation */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900">Hours of Operation</h2>
              <p className="text-gray-600 mt-2 mb-4">
                This section allows you to set your typical business hours for your locations. Business hours affect the
                time slots that customers can book online.
              </p>

              {!showBusinessHoursEditor ? (
                <div className="space-y-3">
                  {Object.entries(availabilityData.businessHours).map(([day, hours]) => (
                    <div key={day} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${hours.enabled ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                        <span className="font-medium capitalize">{day}</span>
                      </div>
                      <div className="text-sm text-gray-600">
                        {hours.enabled ? `${hours.start} - ${hours.end}` : 'Closed'}
                      </div>
                    </div>
                  ))}
                  <button 
                    onClick={() => setShowBusinessHoursEditor(true)}
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700"
                  >
                    Edit Business Hours
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(availabilityData.businessHours).map(([day, hours]) => (
                    <div key={day} className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200">
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={hours.enabled}
                          onChange={(e) => handleBusinessHoursChange(day, 'enabled', e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span className="font-medium capitalize">{day}</span>
                      </div>
                      {hours.enabled && (
                        <div className="flex items-center space-x-2">
                          <input
                            type="time"
                            value={hours.start}
                            onChange={(e) => handleBusinessHoursChange(day, 'start', e.target.value)}
                            className="border border-gray-300 rounded px-2 py-1 text-sm"
                          />
                          <span>to</span>
                          <input
                            type="time"
                            value={hours.end}
                            onChange={(e) => handleBusinessHoursChange(day, 'end', e.target.value)}
                            className="border border-gray-300 rounded px-2 py-1 text-sm"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                  <div className="flex space-x-3">
                    <button 
                      onClick={handleSaveBusinessHours}
                      disabled={saving}
                      className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save Hours'}
                    </button>
                    <button 
                      onClick={() => setShowBusinessHoursEditor(false)}
                      className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Timeslot Templates - for both account owners and team members (team members save to their own availability) */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Timeslot Templates</h2>
                  <p className="text-gray-600 mt-1">
                    Override your default hours of operation, timeslot settings, and driving time for specific services.
                  </p>
                </div>
              </div>

              {availabilityData.timeslotTemplates.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <p className="text-gray-500 mb-4">No timeslot templates created yet</p>
                <button
                  onClick={() => { setEditingTemplateIndex(null); setIsTimeslotTemplateModalOpen(true) }}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700"
                >
                  New Timeslot Template
                </button>
              </div>
              ) : (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Timeslot Templates</h3>
                    <button
                      onClick={() => { setEditingTemplateIndex(null); setIsTimeslotTemplateModalOpen(true) }}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700"
                    >
                      New Template
                    </button>
                  </div>
                  <div className="space-y-3">
                    {availabilityData.timeslotTemplates.map((template, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">
                            {template.name || `Template ${index + 1}`}
                          </h4>
                          {template.description && (
                            <p className="text-sm text-gray-600">{template.description}</p>
                          )}
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                            <span>{template.timeslotType || 'Arrival windows'}</span>
                            {template.arrivalWindowLength && (
                              <span>{template.arrivalWindowLength >= 60 ? `${template.arrivalWindowLength / 60}h` : `${template.arrivalWindowLength}m`} window</span>
                            )}
                            {(template.drivingTime > 0) && (
                              <span className="text-amber-600">{template.drivingTime} min interval</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => handleEditTemplate(index)}
                            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteTimeslotTemplate(index)}
                            className="text-red-600 hover:text-red-700 text-sm font-medium"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

      <TimeslotTemplateModal
        isOpen={isTimeslotTemplateModalOpen}
        onClose={() => { setIsTimeslotTemplateModalOpen(false); setEditingTemplateIndex(null) }}
        onSave={handleSaveTimeslotTemplate}
        existingTemplate={editingTemplateIndex !== null ? availabilityData.timeslotTemplates[editingTemplateIndex] : null}
      />
    </div>
  )
}

export default Availability

"use client"

import { useState, useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { X, Plus, ChevronLeft, ChevronRight } from "lucide-react"
import { teamAPI, availabilityAPI } from "../services/api"
import { useAuth } from "../context/AuthContext"
import { isWorker } from "../utils/roleUtils"
import MobileHeader from "../components/mobile-header"

const EditSingleDateAvailability = () => {
  const { date } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  
  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (date) {
      // Parse date string manually to avoid timezone issues
      const [year, month, day] = date.split('-').map(Number)
      if (year && month && day) {
        return new Date(year, month - 1, 1)
      }
    }
    return new Date()
  })
  const [selectedDate, setSelectedDate] = useState(() => {
    if (date) {
      // Parse date string manually to avoid timezone issues
      const [year, month, day] = date.split('-').map(Number)
      if (year && month && day) {
        return new Date(year, month - 1, day)
      }
    }
    return null
  })
  
  // Availability state
  const [timeSlots, setTimeSlots] = useState([])
  const [isUnavailable, setIsUnavailable] = useState(false)
  
  // Redirect if not a worker
  useEffect(() => {
    if (user && !isWorker(user)) {
      navigate('/dashboard')
    }
  }, [user, navigate])
  
  // Load existing availability for the date
  useEffect(() => {
    const loadAvailability = async () => {
      if (!user || !selectedDate) return
      
      try {
        setLoading(true)
        const dateStr = formatDate(selectedDate)
        
        // Load availability from team member or user availability
        let availability
        if (user?.teamMemberId) {
          availability = await teamAPI.getAvailability(user.teamMemberId)
        } else {
          availability = await availabilityAPI.getAvailability(user.id)
        }
        
        // Parse availability data
        let availData = availability?.availability
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
        
        // Check custom availability for this date
        const customAvail = availData.customAvailability?.find(item => item.date === dateStr)
        
        if (customAvail) {
          if (customAvail.available === false || customAvail.hours === 'Unavailable' || 
              !customAvail.hours || (Array.isArray(customAvail.hours) && customAvail.hours.length === 0)) {
            setIsUnavailable(true)
            setTimeSlots([])
          } else {
            setIsUnavailable(false)
            // Parse hours - could be string like "09:00-18:00" or array of time slots
            if (Array.isArray(customAvail.hours)) {
              setTimeSlots(customAvail.hours.map(slot => ({
                start: slot.start || slot[0] || '09:00',
                end: slot.end || slot[1] || '18:00'
              })))
            } else if (typeof customAvail.hours === 'string') {
              // Parse "09:00-18:00" or "09:00-12:00, 13:00-18:00"
              const slots = customAvail.hours.split(',').map(slot => {
                const [start, end] = slot.trim().split('-')
                return { start: start?.trim() || '09:00', end: end?.trim() || '18:00' }
              })
              setTimeSlots(slots)
            } else {
              setTimeSlots([])
            }
          }
        } else {
          // No custom availability - check working hours for the day of week
          const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][selectedDate.getDay()]
          const dayWorkingHours = availData.workingHours?.[dayOfWeek]
          
          if (dayWorkingHours && dayWorkingHours.enabled !== false && dayWorkingHours.available !== false) {
            setIsUnavailable(false)
            if (dayWorkingHours.timeSlots && Array.isArray(dayWorkingHours.timeSlots) && dayWorkingHours.timeSlots.length > 0) {
              setTimeSlots(dayWorkingHours.timeSlots.map(slot => ({
                start: slot.start || '09:00',
                end: slot.end || '18:00'
              })))
            } else if (dayWorkingHours.start && dayWorkingHours.end) {
              setTimeSlots([{ start: dayWorkingHours.start, end: dayWorkingHours.end }])
            } else {
              setTimeSlots([{ start: '09:00', end: '18:00' }])
            }
          } else {
            setIsUnavailable(true)
            setTimeSlots([])
          }
        }
      } catch (error) {
        console.error('Error loading availability:', error)
        setMessage({ type: 'error', text: 'Failed to load availability' })
      } finally {
        setLoading(false)
      }
    }
    
    if (user && selectedDate) {
      loadAvailability()
    }
  }, [user, selectedDate])
  
  // Set selected date from URL param
  useEffect(() => {
    if (date) {
      // Parse date string manually to avoid timezone issues
      // Date format is YYYY-MM-DD
      const [year, month, day] = date.split('-').map(Number)
      if (year && month && day) {
        // Create date in local timezone (month is 0-indexed in Date constructor)
        const dateObj = new Date(year, month - 1, day)
        if (!isNaN(dateObj.getTime())) {
          setSelectedDate(dateObj)
          setCurrentMonth(new Date(year, month - 1, 1))
        }
      }
    }
  }, [date])
  
  const formatDate = (date) => {
    if (!date) return ''
    const d = new Date(date)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  
  const handleDateClick = (date) => {
    if (date.getMonth() === currentMonth.getMonth()) {
      setSelectedDate(new Date(date))
      navigate(`/availability/edit/${formatDate(date)}`, { replace: true })
    }
  }
  
  const handleAddTimeSlot = () => {
    setTimeSlots(prev => [...prev, { start: '09:00', end: '18:00' }])
    setIsUnavailable(false)
  }
  
  const handleRemoveTimeSlot = (index) => {
    setTimeSlots(prev => {
      const updated = prev.filter((_, i) => i !== index)
      if (updated.length === 0) {
        setIsUnavailable(true)
      }
      return updated
    })
  }
  
  const handleSave = async () => {
    if (!user || !selectedDate) return
    
    try {
      setSaving(true)
      setMessage({ type: '', text: '' })
      
      const dateStr = formatDate(selectedDate)
      
      // Load current availability
      let availability
      if (user?.teamMemberId) {
        availability = await teamAPI.getAvailability(user.teamMemberId)
      } else {
        availability = await availabilityAPI.getAvailability(user.id)
      }
      
      let availData = availability?.availability
      if (typeof availData === 'string') {
        try {
          availData = JSON.parse(availData)
        } catch (e) {
          availData = { workingHours: {}, customAvailability: [] }
        }
      }
      
      if (!availData) {
        availData = { workingHours: {}, customAvailability: [] }
      }
      
      if (!availData.customAvailability) {
        availData.customAvailability = []
      }
      
      // Create or update custom availability for this date
      // If unavailable is true OR timeSlots is empty, mark as unavailable
      const isDateUnavailable = isUnavailable || timeSlots.length === 0
      
      const customItem = {
        date: dateStr,
        available: !isDateUnavailable
      }
      
      // Only add hours if available
      if (!isDateUnavailable && timeSlots.length > 0) {
        customItem.hours = timeSlots.map(slot => ({
          start: slot.start,
          end: slot.end
        }))
      }
      
      // Update or add to customAvailability
      const existingIndex = availData.customAvailability.findIndex(item => item.date === dateStr)
      if (existingIndex >= 0) {
        availData.customAvailability[existingIndex] = customItem
      } else {
        availData.customAvailability.push(customItem)
      }
      
      // Save to API
      if (user?.teamMemberId) {
        await teamAPI.updateAvailability(user.teamMemberId, JSON.stringify(availData))
      } else {
        await availabilityAPI.updateAvailability({
          userId: user.id,
          businessHours: availData.businessHours || {},
          customAvailability: availData.customAvailability
        })
      }
      
      setMessage({ type: 'success', text: 'Availability updated successfully!' })
      setTimeout(() => {
        navigate('/availability')
      }, 1500)
    } catch (error) {
      console.error('Error saving availability:', error)
      setMessage({ type: 'error', text: 'Failed to save availability' })
    } finally {
      setSaving(false)
    }
  }
  
  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())
    
    const days = []
    const currentDate = new Date(startDate)
    
    for (let i = 0; i < 42; i++) {
      days.push(new Date(currentDate))
      currentDate.setDate(currentDate.getDate() + 1)
    }
    
    return days
  }
  
  const isSelected = (date) => {
    if (!selectedDate) return false
    return formatDate(date) === formatDate(selectedDate)
  }
  
  const isCurrentMonth = (date) => {
    return date.getMonth() === currentMonth.getMonth()
  }
  
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
  
  const getUserDisplayName = () => {
    const firstName = user?.firstName || user?.first_name || ''
    const lastName = user?.lastName || user?.last_name || ''
    if (firstName || lastName) {
      return `${firstName} ${lastName}`.trim()
    }
    return user?.business_name || user?.businessName || user?.email || 'User'
  }
  
  if (!user || !isWorker(user)) {
    return null
  }
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-gray-50 pb-24 lg:pb-0">
      {/* Mobile Header */}
      <MobileHeader pageTitle="Update Availability" />
      
      {/* Desktop Header */}
      <div className="hidden lg:block bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/availability')}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
            
            <div className="flex-1 text-center">
              <h2 className="text-xl font-semibold text-gray-900 mb-1">Update Availability</h2>
              <p className="text-sm text-gray-600">{getUserDisplayName()}</p>
            </div>
            
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
      
      {/* Message */}
      {message.text && (
        <div className={`px-4 py-3 ${message.type === 'success' ? 'bg-green-50 border-l-4 border-green-400' : 'bg-red-50 border-l-4 border-red-400'}`}>
          <span className={`text-sm ${message.type === 'success' ? 'text-green-700' : 'text-red-700'}`}>
            {message.text}
          </span>
        </div>
      )}
      
      {/* Content */}
      <div className="max-w-4xl mx-auto p-4 lg:p-6">
        {/* Dates Section */}
        <div className="mb-8">
          <h3 className="text-base font-semibold text-gray-900 mb-2">Dates</h3>
          <p className="text-sm text-gray-600 mb-6">
            Select the date(s) you want to assign specific hours
          </p>
          
          {/* Calendar */}
          <div className="border border-gray-200 rounded-lg p-5 bg-white">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1))}
                className="p-1.5 hover:bg-gray-100 rounded transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <h4 className="text-base font-semibold text-gray-900">
                {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </h4>
              <button
                onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1))}
                className="p-1.5 hover:bg-gray-100 rounded transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            
            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {/* Day headers */}
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="p-2 text-center text-xs font-medium text-gray-500">
                  {day}
                </div>
              ))}
              
              {/* Calendar days */}
              {generateCalendarDays().map((date, index) => {
                const isSelectedDate = isSelected(date)
                const isCurrentMonthDate = isCurrentMonth(date)
                
                return (
                  <button
                    key={index}
                    onClick={() => handleDateClick(date)}
                    disabled={!isCurrentMonthDate}
                    className={`
                      p-2 text-sm rounded transition-all
                      ${isSelectedDate
                        ? 'bg-blue-600 text-white font-semibold'
                        : isCurrentMonthDate
                          ? 'text-gray-900 hover:bg-gray-100'
                          : 'text-gray-300 cursor-not-allowed'
                      }
                    `}
                  >
                    {date.getDate()}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
        
        {/* Availability Section */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-base font-semibold text-gray-900 mb-2">Availability</h3>
          <p className="text-sm text-gray-600 mb-6">
            Edit your available hours for the selected date
          </p>
          
          {selectedDate ? (
            <div className="space-y-4">
              {/* Unavailable State - Show with Add Hours button */}
              {isUnavailable && timeSlots.length === 0 ? (
                <div className="space-y-3">
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <span className="text-sm text-gray-600">Unavailable</span>
                  </div>
                  {/* Add Hours Button for unavailable days */}
                  <button
                    onClick={() => {
                      setIsUnavailable(false)
                      // Add first time slot
                      setTimeSlots([{ start: '09:00', end: '18:00' }])
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                    type="button"
                  >
                    <Plus className="w-4 h-4" />
                    Add Hours
                  </button>
                </div>
              ) : (
                <>
                  {/* Existing Time Slots */}
                  {timeSlots.length > 0 && (
                    <div className="space-y-2">
                      {timeSlots.map((slot, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg"
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="time"
                              value={slot.start}
                              onChange={(e) => {
                                const updatedSlots = [...timeSlots]
                                updatedSlots[index].start = e.target.value
                                setTimeSlots(updatedSlots)
                                setIsUnavailable(false)
                              }}
                              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-gray-500 text-sm">-</span>
                            <input
                              type="time"
                              value={slot.end}
                              onChange={(e) => {
                                const updatedSlots = [...timeSlots]
                                updatedSlots[index].end = e.target.value
                                setTimeSlots(updatedSlots)
                                setIsUnavailable(false)
                              }}
                              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <button
                            onClick={() => handleRemoveTimeSlot(index)}
                            className="text-gray-400 hover:text-red-600 transition-colors ml-2"
                            type="button"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Add Hours Button - show if no slots or to add more */}
                  <button
                    onClick={() => {
                      if (timeSlots.length === 0) {
                        // Add first time slot
                        setTimeSlots([{ start: '09:00', end: '18:00' }])
                      } else {
                        // Add another time slot
                        handleAddTimeSlot()
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                    type="button"
                  >
                    <Plus className="w-4 h-4" />
                    {timeSlots.length === 0 ? 'Add Hours' : 'Add More Hours'}
                  </button>
                </>
              )}
              
              {/* Save Button - Always visible when date is selected */}
              <div className="pt-4 border-t border-gray-200 mt-4">
                <button
                  onClick={handleSave}
                  disabled={saving || !selectedDate}
                  className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg text-base font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
              <span className="text-sm text-gray-500">Please select a date from the calendar above</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default EditSingleDateAvailability


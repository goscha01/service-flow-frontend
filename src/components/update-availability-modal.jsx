import React, { useState, useEffect } from 'react'
import { X, Plus, ChevronLeft, ChevronRight } from 'lucide-react'

const UpdateAvailabilityModal = ({ isOpen, onClose, onSave, teamMemberName = '', selectedDates = [], availability = [] }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(null) // Single date selection
  const [timeSlots, setTimeSlots] = useState([]) // Array of { start, end }
  const [newTimeSlot, setNewTimeSlot] = useState({ start: '09:00', end: '17:00' })
  const [isUnavailable, setIsUnavailable] = useState(true)

  useEffect(() => {
    if (isOpen) {
      // Reset state when modal opens
      setSelectedDate(null)
      setTimeSlots([])
      setIsUnavailable(true)
      setNewTimeSlot({ start: '09:00', end: '17:00' })
    }
  }, [isOpen])

  // Load existing availability for selected date
  useEffect(() => {
    if (selectedDate) {
      const dateStr = formatDate(selectedDate)
      const existingAvailability = availability.find(item => item.date === dateStr)
      
      if (existingAvailability) {
        if (existingAvailability.hours === 'Unavailable' || !existingAvailability.available) {
          setIsUnavailable(true)
          setTimeSlots([])
        } else {
          setIsUnavailable(false)
          // Parse hours string like "09:00-17:00" or "09:00-12:00, 13:00-17:00"
          const hoursStr = existingAvailability.hours
          const slots = hoursStr.split(',').map(slot => {
            const [start, end] = slot.trim().split('-')
            return { start: start.trim(), end: end.trim() }
          })
          setTimeSlots(slots)
        }
      } else {
        setIsUnavailable(true)
        setTimeSlots([])
      }
    }
  }, [selectedDate, availability])

  const handleDateClick = (date) => {
    // Only allow selecting dates from current month
    if (date.getMonth() === currentMonth.getMonth()) {
      setSelectedDate(new Date(date))
    }
  }

  const handleAddTimeSlot = () => {
    if (newTimeSlot.start && newTimeSlot.end) {
      setTimeSlots(prev => [...prev, { ...newTimeSlot }])
      setNewTimeSlot({ start: '09:00', end: '17:00' })
      setIsUnavailable(false)
    }
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

  const handleSave = () => {
    if (!selectedDate) {
      alert('Please select a date')
      return
    }

    const dateStr = formatDate(selectedDate)
    const availabilityData = {
      date: dateStr,
      available: !isUnavailable && timeSlots.length > 0,
      hours: isUnavailable || timeSlots.length === 0 
        ? 'Unavailable' 
        : timeSlots.map(slot => `${slot.start}-${slot.end}`).join(', ')
    }
    
    onSave(availabilityData)
    onClose()
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
    
    // Generate 6 weeks of days (42 days)
    for (let i = 0; i < 42; i++) {
      days.push(new Date(currentDate))
      currentDate.setDate(currentDate.getDate() + 1)
    }
    
    return days
  }

  const formatDate = (date) => {
    return date.toISOString().split('T')[0]
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

  const getInitials = (name) => {
    if (!name) return 'EC'
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
          
          <div className="flex-1 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-1">Update Availability</h2>
            {teamMemberName && (
              <div className="flex items-center justify-center gap-2">
                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                  {getInitials(teamMemberName)}
                </div>
                <span className="text-sm text-gray-600">{teamMemberName}</span>
              </div>
            )}
          </div>
          
          <button 
            onClick={handleSave}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Save
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Panel - Dates Selection */}
            <div>
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

            {/* Right Panel - Calendar View (duplicate for visual balance) */}
            <div className="hidden lg:block">
              {/* Empty space for visual balance */}
            </div>
          </div>

          {/* Bottom Panel - Availability Input */}
          <div className="mt-8 border-t border-gray-200 pt-6">
            <h3 className="text-base font-semibold text-gray-900 mb-2">Availability</h3>
            <p className="text-sm text-gray-600 mb-6">
              Edit your available hours for the selected date
            </p>
            
            {selectedDate ? (
              <div className="space-y-4">
                {/* Availability Display */}
                {isUnavailable && timeSlots.length === 0 ? (
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg mb-4">
                    <span className="text-sm text-gray-600">Unavailable</span>
                  </div>
                ) : (
                  <div className="space-y-2 mb-4">
                    {/* Existing time slots */}
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
                            }}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                          <span className="text-gray-500 text-sm">-</span>
                          <input
                            type="time"
                            value={slot.end}
                            onChange={(e) => {
                              const updatedSlots = [...timeSlots]
                              updatedSlots[index].end = e.target.value
                              setTimeSlots(updatedSlots)
                            }}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                    
                    {/* New time slot input (shown when not unavailable but no slots yet, or when adding) */}
                    {!isUnavailable && (
                      <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <input
                          type="time"
                          value={newTimeSlot.start}
                          onChange={(e) => setNewTimeSlot(prev => ({ ...prev, start: e.target.value }))}
                          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <span className="text-gray-500 text-sm">-</span>
                        <input
                          type="time"
                          value={newTimeSlot.end}
                          onChange={(e) => setNewTimeSlot(prev => ({ ...prev, end: e.target.value }))}
                          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Add Hours Button */}
                <button
                  onClick={() => {
                    if (isUnavailable && timeSlots.length === 0) {
                      // First time adding hours - replace "Unavailable" with time inputs
                      setIsUnavailable(false)
                    } else if (!isUnavailable) {
                      // Add the current time slot and reset for next one
                      handleAddTimeSlot()
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                  type="button"
                >
                  <Plus className="w-4 h-4" />
                  Add Hours
                </button>
              </div>
            ) : (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
                <span className="text-sm text-gray-500">Please select a date from the calendar above</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default UpdateAvailabilityModal

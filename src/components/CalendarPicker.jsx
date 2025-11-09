import { useState, useRef, useEffect } from "react"
import { ChevronLeft, ChevronRight, X, Clock } from "lucide-react"
import { jobsAPI } from "../services/api"

const CalendarPicker = ({ 
  selectedDate, 
  selectedTime = "09:00",
  onDateTimeSelect, 
  isOpen, 
  onClose, 
  duration = 120, // Default 2 hours in minutes
  workerId = null,
  serviceId = null
}) => {
  const [currentDate, setCurrentDate] = useState(selectedDate || new Date())
  const [activeTab, setActiveTab] = useState('available') // 'available' or 'custom'
  const [customTime, setCustomTime] = useState(selectedTime || "09:00")
  const [arrivalWindow, setArrivalWindow] = useState(false)
  const [availableSlots, setAvailableSlots] = useState([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedDateForSlots, setSelectedDateForSlots] = useState(null)
  const [closedDays, setClosedDays] = useState([]) // Array of day numbers (0-6) that are closed
  const [holidays, setHolidays] = useState([]) // Array of date strings that are holidays
  const calendarRef = useRef(null)

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target)) {
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

  // Fetch available slots when date is selected in Available Times tab
  useEffect(() => {
    if (selectedDateForSlots && activeTab === 'available') {
      fetchAvailableSlots(selectedDateForSlots)
    }
  }, [selectedDateForSlots, activeTab])

  // Fetch business hours and holidays on mount
  useEffect(() => {
    if (isOpen) {
      fetchBusinessSettings()
    }
  }, [isOpen])

  const fetchBusinessSettings = async () => {
    try {
      // TODO: Implement actual API call to get business hours and holidays
      // const response = await businessAPI.getSettings()
      // setClosedDays(response.closedDays || [0]) // Array of day numbers (0=Sunday, 6=Saturday)
      // setHolidays(response.holidays || []) // Array of date strings like "2025-12-25"
      
      // For now, assume Sunday (0) is closed
      setClosedDays([0])
      setHolidays([]) // Array of date strings like "2025-12-25"
    } catch (error) {
      console.error('Error fetching business settings:', error)
    }
  }

  const fetchAvailableSlots = async (date) => {
    setLoadingSlots(true)
    try {
      // Format date for API
      const dateStr = date.toISOString().split('T')[0]
      
      // Call the backend API
      const response = await jobsAPI.getAvailableSlots({
        date: dateStr,
        duration: duration,
        workerId: workerId,
        serviceId: serviceId
      })
      
      if (response && response.slots) {
        setAvailableSlots(response.slots)
      } else {
        setAvailableSlots([])
      }
      
    } catch (error) {
      console.error('Error fetching available slots:', error)
      // Fallback to empty array on error
      setAvailableSlots([])
    } finally {
      setLoadingSlots(false)
    }
  }

  const navigateMonth = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      newDate.setMonth(prev.getMonth() + direction)
      return newDate
    })
  }

  const generateCalendarDays = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())
    
    const days = []
    const current = new Date(startDate)
    
    for (let i = 0; i < 42; i++) {
      days.push(new Date(current))
      current.setDate(current.getDate() + 1)
    }
    
    return days
  }

  const isDateDisabled = (date) => {
    // Check if it's a past date
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (date < today) return true

    // Check if it's a closed day
    if (closedDays.includes(date.getDay())) return true

    // Check if it's a holiday
    const dateStr = date.toISOString().split('T')[0]
    if (holidays.includes(dateStr)) return true

    return false
  }

  const handleDateClick = (date) => {
    if (isDateDisabled(date)) return

    if (activeTab === 'available') {
      setSelectedDateForSlots(date)
    } else {
      // For custom time tab, directly select the date
      setSelectedDateForSlots(date)
    }
  }

  const handleTimeSlotClick = (slot) => {
    const selectedDateTime = new Date(selectedDateForSlots)
    const [hours, minutes] = slot.time.split(':')
    selectedDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0)
    
    onDateTimeSelect(selectedDateTime, slot.time)
    onClose()
  }

  const handleCustomTimeConfirm = () => {
    if (!selectedDateForSlots) return

    const selectedDateTime = new Date(selectedDateForSlots)
    const [hours, minutes] = customTime.split(':')
    selectedDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0)
    
    onDateTimeSelect(selectedDateTime, customTime, arrivalWindow)
    onClose()
  }

  const formatTimeRange = (startTime, endTime) => {
    const formatTime = (time) => {
      const [hours, minutes] = time.split(':')
      const hour = parseInt(hours)
      const ampm = hour >= 12 ? 'PM' : 'AM'
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
      return `${displayHour}:${minutes} ${ampm}`
    }

    return `${formatTime(startTime)} - ${formatTime(endTime)}`
  }

  const generateTimeOptions = () => {
    const times = []
    for (let hour = 6; hour <= 20; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        const displayTime = new Date(`2000-01-01 ${time}`).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        })
        times.push({ value: time, display: displayTime })
      }
    }
    return times
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div 
        ref={calendarRef}
        className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
        style={{ fontFamily: 'ProximaNova-Regular' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex gap-6">
            <button
              onClick={() => setActiveTab('available')}
              className={`text-sm font-medium pb-2 border-b-2 transition-colors ${
                activeTab === 'available' 
                  ? 'text-blue-600 border-blue-600' 
                  : 'text-gray-500 border-transparent hover:text-gray-700'
              }`}
              style={{ fontFamily: activeTab === 'available' ? 'ProximaNova-Semibold' : 'ProximaNova-Regular' }}
            >
              Available Times
            </button>
            <button
              onClick={() => setActiveTab('custom')}
              className={`text-sm font-medium pb-2 border-b-2 transition-colors ${
                activeTab === 'custom' 
                  ? 'text-blue-600 border-blue-600' 
                  : 'text-gray-500 border-transparent hover:text-gray-700'
              }`}
              style={{ fontFamily: activeTab === 'custom' ? 'ProximaNova-Semibold' : 'ProximaNova-Regular' }}
            >
              Custom Time
            </button>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex h-[500px]">
          {/* Calendar Section */}
          <div className="flex-1 p-6 border-r border-gray-200">
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => navigateMonth(-1)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <h2 className="text-lg font-semibold text-gray-900" style={{ fontFamily: 'ProximaNova-Semibold' }}>
                {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h2>
              <button
                onClick={() => navigateMonth(1)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Calendar Grid */}
            <div className="space-y-2">
              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-1 text-center">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="py-2 text-sm font-medium text-gray-500">
                    {day}
                  </div>
                ))}
              </div>

              {/* Date Grid */}
              <div className="grid grid-cols-7 gap-1">
                {generateCalendarDays().map((date, index) => {
                  const isCurrentMonth = date.getMonth() === currentDate.getMonth()
                  const isToday = date.toDateString() === new Date().toDateString()
                  const isSelected = selectedDateForSlots && date.toDateString() === selectedDateForSlots.toDateString()
                  const isDisabled = isDateDisabled(date)
                  
                  return (
                    <button
                      key={index}
                      onClick={() => handleDateClick(date)}
                      disabled={isDisabled}
                      className={`
                        aspect-square flex items-center justify-center rounded-lg text-sm
                        transition-colors relative
                        ${!isCurrentMonth ? 'text-gray-300' : ''}
                        ${isDisabled ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-gray-100'}
                        ${isToday && !isSelected ? 'font-semibold' : ''}
                        ${isSelected ? 'bg-blue-600 text-white hover:bg-blue-700' : ''}
                        ${!isSelected && !isDisabled && isCurrentMonth ? 'text-gray-700' : ''}
                      `}
                    >
                      <span className={`${isToday && !isSelected ? 'text-blue-600' : ''}`}>
                        {date.getDate()}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Right Side - Time Selection */}
          <div className="flex-1 p-6">
            {activeTab === 'available' ? (
              <div className="h-full">
                {selectedDateForSlots ? (
                  <div className="h-full flex flex-col">
                    <h3 className="text-sm font-medium text-gray-700 mb-4" style={{ fontFamily: 'ProximaNova-Medium' }}>
                      Available times for {selectedDateForSlots.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </h3>
                    
                    {loadingSlots ? (
                      <div className="flex-1 flex items-center justify-center">
                        <div className="text-gray-500">Loading available times...</div>
                      </div>
                    ) : availableSlots.length > 0 ? (
                      <div className="flex-1 overflow-y-auto space-y-2">
                        {availableSlots.map((slot, index) => (
                          <button
                            key={index}
                            onClick={() => handleTimeSlotClick(slot)}
                            className="w-full p-3 text-left bg-white hover:bg-gray-50 border border-gray-200 rounded-lg transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium" style={{ fontFamily: 'ProximaNova-Medium' }}>
                                {formatTimeRange(slot.time, slot.endTime)}
                              </span>
                              <span className="text-xs text-gray-500 flex items-center gap-1">
                                {slot.availableWorkers} worker free
                                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center justify-center">
                        <div className="text-center text-gray-500">
                          <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                          <p>No available times for this date</p>
                          <p className="text-sm mt-2">Please select another date</p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-gray-500">Select a date to see available timeslots</p>
                  </div>
                )}
              </div>
            ) : (
              // Custom Time Tab
              <div className="space-y-6">
                {selectedDateForSlots && (
                  <>
                    <h3 className="text-sm font-medium text-gray-700" style={{ fontFamily: 'ProximaNova-Medium' }}>
                      Enter a custom time for {selectedDateForSlots.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </h3>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'ProximaNova-Medium' }}>
                          Time
                        </label>
                        <select
                          value={customTime}
                          onChange={(e) => setCustomTime(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          style={{ fontFamily: 'ProximaNova-Regular' }}
                        >
                          {generateTimeOptions().map(option => (
                            <option key={option.value} value={option.value}>
                              {option.display}
                            </option>
                          ))}
                        </select>
                      </div>

                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={arrivalWindow}
                          onChange={(e) => setArrivalWindow(e.target.checked)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700" style={{ fontFamily: 'ProximaNova-Regular' }}>
                          Arrival window
                        </span>
                      </label>
                    </div>

                    <button
                      onClick={handleCustomTimeConfirm}
                      className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                      style={{ fontFamily: 'ProximaNova-Medium' }}
                    >
                      Confirm
                    </button>
                  </>
                )}

                {!selectedDateForSlots && (
                  <div className="flex items-center justify-center h-64">
                    <p className="text-gray-500">Please select a date first</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CalendarPicker
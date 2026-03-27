import { useState, useRef, useEffect, useCallback } from "react"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, X, Clock } from "lucide-react"
import { jobsAPI } from "../services/api"

const CalendarPicker = ({ 
  selectedDate, 
  selectedTime = "09:00",
  onDateTimeSelect, 
  onDateSelect, // Simple date-only selection callback
  isOpen, 
  onClose, 
  duration = 120, // Default 2 hours in minutes
  workerId = null,
  serviceId = null,
  position = "center" // Position for popup: "center", "bottom-left", etc.
}) => {
  // If onDateSelect is provided, use simple date picker mode (no time selection)
  const isSimpleDatePicker = !!onDateSelect
  
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


  const fetchBusinessSettings = useCallback(async () => {
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
  }, [])

  // Fetch business hours and holidays on mount
  useEffect(() => {
    if (isOpen) {
      fetchBusinessSettings()
    }
  }, [isOpen, fetchBusinessSettings])

  const fetchAvailableSlots = useCallback(async (date) => {
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
        // Process slots to ensure they're actual free time slots that can fit the job duration
        const processedSlots = []
        const requiredDuration = duration || 120 // Job duration in minutes
        
        // First, collect all time ranges (either from slots or availability windows)
        const timeRanges = []
        
        response.slots.forEach(slot => {
          // If slot already has time and endTime
          if (slot.time && slot.endTime) {
            const slotStart = timeToMinutes(slot.time)
            const slotEnd = timeToMinutes(slot.endTime)
            timeRanges.push({
              start: slotStart,
              end: slotEnd,
              availableWorkers: slot.availableWorkers || slot.workers || 0
            })
          }
          // If slot has start and end (availability window)
          else if (slot.start && slot.end) {
            const startMinutes = timeToMinutes(slot.start)
            const endMinutes = timeToMinutes(slot.end)
            timeRanges.push({
              start: startMinutes,
              end: endMinutes,
              availableWorkers: slot.availableWorkers || slot.workers || 0
            })
          }
        })
        
        // Sort time ranges by start time
        timeRanges.sort((a, b) => a.start - b.start)
        
        // Merge overlapping or adjacent time ranges
        const mergedRanges = []
        if (timeRanges.length > 0) {
          let currentRange = { ...timeRanges[0] }
          
          for (let i = 1; i < timeRanges.length; i++) {
            const nextRange = timeRanges[i]
            
            // If ranges overlap or are adjacent (within 30 minutes), merge them
            if (nextRange.start <= currentRange.end + 30) {
              currentRange.end = Math.max(currentRange.end, nextRange.end)
              currentRange.availableWorkers = Math.max(
                currentRange.availableWorkers,
                nextRange.availableWorkers
              )
            } else {
              // No overlap, save current range and start a new one
              mergedRanges.push(currentRange)
              currentRange = { ...nextRange }
            }
          }
          mergedRanges.push(currentRange)
        }
        
        // Generate free time slots from merged ranges that can fit the job duration
        mergedRanges.forEach(range => {
          const rangeDuration = range.end - range.start
          
          // Only process ranges that are at least as long as the required duration
          if (rangeDuration >= requiredDuration) {
            // Generate slots at 30-minute intervals that can fit the job
            let currentStart = range.start
            
            // Round start to nearest 30-minute interval
            const remainder = currentStart % 30
            if (remainder !== 0) {
              currentStart = currentStart + (30 - remainder)
            }
            
            // Generate slots until we can't fit another one
            while (currentStart + requiredDuration <= range.end) {
              const slotEnd = currentStart + requiredDuration
              processedSlots.push({
                time: minutesToTime(currentStart),
                endTime: minutesToTime(slotEnd),
                availableWorkers: range.availableWorkers
              })
              // Move to next 30-minute interval
              currentStart += 30
            }
          }
        })
        
        setAvailableSlots(processedSlots)
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
  }, [duration, workerId, serviceId])
  
  // Helper function to convert time string to minutes (handles both 12h and 24h format)
  const timeToMinutes = (timeStr) => {
    if (!timeStr) return 0
    
    // Handle 24-hour format (HH:MM)
    if (timeStr.includes(':') && !timeStr.includes('AM') && !timeStr.includes('PM')) {
      const [hours, minutes] = timeStr.split(':').map(Number)
      return hours * 60 + minutes
    }
    
    // Handle 12-hour format (HH:MM AM/PM)
    const parts = timeStr.split(' ')
    if (parts.length >= 2) {
      const [time, period] = parts
      const [hours, minutes] = time.split(':').map(Number)
      let totalMinutes = hours * 60 + minutes
      if (period === 'PM' && hours !== 12) totalMinutes += 12 * 60
      if (period === 'AM' && hours === 12) totalMinutes -= 12 * 60
      return totalMinutes
    }
    
    return 0
  }
  
  // Helper function to convert minutes to time string (24-hour format for API)
  const minutesToTime = (minutes) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
  }
  
  // Helper function to format time for display (12-hour format)
  const formatTimeForDisplay = (timeStr) => {
    const minutes = timeToMinutes(timeStr)
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    const period = hours >= 12 ? 'PM' : 'AM'
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
    return `${displayHours}:${mins.toString().padStart(2, '0')} ${period}`
  }

  // Fetch available slots when date is selected in Available Times tab
  useEffect(() => {
    if (selectedDateForSlots && activeTab === 'available') {
      fetchAvailableSlots(selectedDateForSlots)
    }
  }, [selectedDateForSlots, activeTab, fetchAvailableSlots])

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
    // For simple date picker, allow past dates
    if (isSimpleDatePicker) {
      // Only disable closed days and holidays
      if (closedDays.includes(date.getDay())) return true
      const dateStr = date.toISOString().split('T')[0]
      if (holidays.includes(dateStr)) return true
      return false
    }
    
    // For scheduling mode, check if it's a past date
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

    // Simple date picker mode - directly select and close
    if (isSimpleDatePicker && onDateSelect) {
      onDateSelect(date)
      onClose()
      return
    }

    // Scheduling mode - show time selection
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
      if (!time) return ''
      
      // Handle 24-hour format (HH:MM)
      let hours, minutes
      if (time.includes(' ')) {
        // 12-hour format with AM/PM
        const [timePart, period] = time.split(' ')
        const [h, m] = timePart.split(':')
        hours = parseInt(h)
        minutes = m || '00'
        if (period === 'PM' && hours !== 12) hours += 12
        if (period === 'AM' && hours === 12) hours = 0
      } else {
        // 24-hour format
        [hours, minutes] = time.split(':').map(Number)
      }
      
      const hour = parseInt(hours)
      const ampm = hour >= 12 ? 'PM' : 'AM'
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
      return `${displayHour}:${String(minutes || 0).padStart(2, '0')} ${ampm}`
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

  // Determine popup position
  const positionClasses = {
    'center': 'flex items-center justify-center',
    'bottom-left': 'flex items-end justify-start',
    'bottom-right': 'flex items-end justify-end',
    'top-left': 'flex items-start justify-start',
    'top-right': 'flex items-start justify-end'
  }

  return (
    <div className={`fixed inset-0 z-50 ${positionClasses[position] || positionClasses.center} bg-black/50 backdrop-blur-sm p-4`}>
      <div 
        ref={calendarRef}
        className={`bg-white rounded-xl shadow-xl ${isSimpleDatePicker ? 'w-full max-w-sm' : 'w-full max-w-4xl'} max-h-[90vh] overflow-hidden`}
        style={{ fontFamily: 'Montserrat', fontWeight: 400 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--sf-border-light)]">
          {!isSimpleDatePicker && (
            <div className="flex gap-6">
              <button
                onClick={() => setActiveTab('available')}
                className={`text-sm font-medium pb-2 border-b-2 transition-colors ${
                  activeTab === 'available' 
                    ? 'text-[var(--sf-blue-500)] border-[var(--sf-blue-500)]' 
                    : 'text-[var(--sf-text-muted)] border-transparent hover:text-[var(--sf-text-primary)]'
                }`}
                style={{ fontFamily: 'Montserrat', fontWeight: activeTab === 'available' ? 600 : 400 }}
              >
                Available Times
              </button>
              <button
                onClick={() => setActiveTab('custom')}
                className={`text-sm font-medium pb-2 border-b-2 transition-colors ${
                  activeTab === 'custom' 
                    ? 'text-[var(--sf-blue-500)] border-[var(--sf-blue-500)]' 
                    : 'text-[var(--sf-text-muted)] border-transparent hover:text-[var(--sf-text-primary)]'
                }`}
                style={{ fontFamily: 'Montserrat', fontWeight: activeTab === 'custom' ? 600 : 400 }}
              >
                Custom Time
              </button>
            </div>
          )}
          {isSimpleDatePicker && (
            <h3 className="text-lg font-semibold text-[var(--sf-text-primary)]">Select Date</h3>
          )}
          <button onClick={onClose} className="text-[var(--sf-text-muted)] hover:text-[var(--sf-text-secondary)]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className={isSimpleDatePicker ? "p-6" : "flex h-[500px]"}>
          {/* Calendar Section */}
          <div className={`flex-1 p-6 ${!isSimpleDatePicker ? 'border-r border-[var(--sf-border-light)]' : ''}`}>
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <button
                  onClick={() => setCurrentDate(prev => {
                    const d = new Date(prev)
                    d.setFullYear(d.getFullYear() - 1)
                    return d
                  })}
                  className="p-2 hover:bg-[var(--sf-bg-hover)] rounded-lg transition-colors"
                  title="Previous year"
                >
                  <ChevronsLeft className="w-5 h-5 text-[var(--sf-text-secondary)]" />
                </button>
                <button
                  onClick={() => navigateMonth(-1)}
                  className="p-2 hover:bg-[var(--sf-bg-hover)] rounded-lg transition-colors"
                  title="Previous month"
                >
                  <ChevronLeft className="w-5 h-5 text-[var(--sf-text-secondary)]" />
                </button>
              </div>
              <h2 className="text-lg font-semibold text-[var(--sf-text-primary)]" style={{ fontFamily: 'Montserrat', fontWeight: 600 }}>
                {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h2>
              <div className="flex items-center">
                <button
                  onClick={() => navigateMonth(1)}
                  className="p-2 hover:bg-[var(--sf-bg-hover)] rounded-lg transition-colors"
                  title="Next month"
                >
                  <ChevronRight className="w-5 h-5 text-[var(--sf-text-secondary)]" />
                </button>
                <button
                  onClick={() => setCurrentDate(prev => {
                    const d = new Date(prev)
                    d.setFullYear(d.getFullYear() + 1)
                    return d
                  })}
                  className="p-2 hover:bg-[var(--sf-bg-hover)] rounded-lg transition-colors"
                  title="Next year"
                >
                  <ChevronsRight className="w-5 h-5 text-[var(--sf-text-secondary)]" />
                </button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="space-y-2">
              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-1 text-center">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="py-2 text-sm font-medium text-[var(--sf-text-muted)]">
                    {day}
                  </div>
                ))}
              </div>

              {/* Date Grid */}
              <div className="grid grid-cols-7 gap-1">
                {generateCalendarDays().map((date, index) => {
                  const isCurrentMonth = date.getMonth() === currentDate.getMonth()
                  const isToday = date.toDateString() === new Date().toDateString()
                  // For simple date picker, check against selectedDate prop
                  const isSelected = isSimpleDatePicker 
                    ? selectedDate && date.toDateString() === new Date(selectedDate).toDateString()
                    : selectedDateForSlots && date.toDateString() === selectedDateForSlots.toDateString()
                  const isDisabled = isDateDisabled(date)
                  
                  return (
                    <button
                      key={index}
                      onClick={() => handleDateClick(date)}
                      disabled={isDisabled}
                      className={`
                        aspect-square flex items-center justify-center rounded-lg text-sm
                        transition-colors relative
                        ${!isCurrentMonth ? 'text-[var(--sf-text-muted)]' : ''}
                        ${isDisabled ? 'text-[var(--sf-text-muted)] cursor-not-allowed' : 'hover:bg-[var(--sf-bg-hover)]'}
                        ${isToday && !isSelected ? 'font-semibold' : ''}
                        ${isSelected ? 'bg-[var(--sf-blue-500)] text-white hover:bg-[var(--sf-blue-600)]' : ''}
                        ${!isSelected && !isDisabled && isCurrentMonth ? 'text-[var(--sf-text-primary)]' : ''}
                      `}
                    >
                      <span className={`${isToday && !isSelected ? 'text-[var(--sf-blue-500)]' : ''}`}>
                        {date.getDate()}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Right Side - Time Selection (only for scheduling mode) */}
          {!isSimpleDatePicker && (
          <div className="flex-1 p-6">
            {activeTab === 'available' ? (
              <div className="h-full">
                {selectedDateForSlots ? (
                  <div className="h-full flex flex-col">
                    <h3 className="text-sm font-medium text-[var(--sf-text-primary)] mb-4" style={{ fontFamily: 'Montserrat', fontWeight: 500 }}>
                      Available times for {selectedDateForSlots.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </h3>
                    
                    {loadingSlots ? (
                      <div className="flex-1 flex items-center justify-center">
                        <div className="text-[var(--sf-text-muted)]">Loading available times...</div>
                      </div>
                    ) : availableSlots.length > 0 ? (
                      <div className="flex-1 overflow-y-auto space-y-2">
                        {availableSlots.map((slot, index) => (
                          <button
                            key={index}
                            onClick={() => handleTimeSlotClick(slot)}
                            className="w-full p-3 text-left bg-white hover:bg-[var(--sf-bg-hover)] border border-[var(--sf-border-light)] rounded-lg transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium" style={{ fontFamily: 'Montserrat', fontWeight: 500 }}>
                                {formatTimeRange(slot.time, slot.endTime)}
                              </span>
                              <span className="text-xs text-[var(--sf-text-muted)] flex items-center gap-1">
                                {slot.availableWorkers} worker free
                                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center justify-center">
                        <div className="text-center text-[var(--sf-text-muted)]">
                          <Clock className="w-12 h-12 mx-auto mb-3 text-[var(--sf-text-muted)]" />
                          <p>No available times for this date</p>
                          <p className="text-sm mt-2">Please select another date</p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-[var(--sf-text-muted)]">Select a date to see available timeslots</p>
                  </div>
                )}
              </div>
            ) : (
              // Custom Time Tab
              <div className="space-y-6">
                {selectedDateForSlots && (
                  <>
                    <h3 className="text-sm font-medium text-[var(--sf-text-primary)]" style={{ fontFamily: 'Montserrat', fontWeight: 500 }}>
                      Enter a custom time for {selectedDateForSlots.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </h3>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-[var(--sf-text-primary)] mb-2" style={{ fontFamily: 'Montserrat', fontWeight: 500 }}>
                          Time
                        </label>
                        <select
                          value={customTime}
                          onChange={(e) => setCustomTime(e.target.value)}
                          className="w-full px-3 py-2 border border-[var(--sf-border-light)] rounded-lg focus:ring-2 focus:ring-[var(--sf-blue-500)] focus:border-[var(--sf-blue-500)]"
                          style={{ fontFamily: 'Montserrat', fontWeight: 400 }}
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
                          className="w-4 h-4 text-[var(--sf-blue-500)] border-[var(--sf-border-light)] rounded focus:ring-[var(--sf-blue-500)]"
                        />
                        <span className="text-sm text-[var(--sf-text-primary)]" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
                          Arrival window
                        </span>
                      </label>
                    </div>

                    <button
                      onClick={handleCustomTimeConfirm}
                      className="w-full py-3 bg-[var(--sf-blue-500)] text-white rounded-lg hover:bg-[var(--sf-blue-600)] transition-colors font-medium"
                      style={{ fontFamily: 'Montserrat', fontWeight: 500 }}
                    >
                      Confirm
                    </button>
                  </>
                )}

                {!selectedDateForSlots && (
                  <div className="flex items-center justify-center h-64">
                    <p className="text-[var(--sf-text-muted)]">Please select a date first</p>
                  </div>
                )}
              </div>
            )}
          </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CalendarPicker
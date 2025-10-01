import { useState, useRef, useEffect } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

const CalendarPicker = ({ 
  selectedDate, 
  onDateSelect, 
  isOpen, 
  onClose, 
  className = "",
  position = "bottom-left" // bottom-left, bottom-center, bottom-right
}) => {
  const [currentDate, setCurrentDate] = useState(selectedDate || new Date())
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

  // Update currentDate when selectedDate changes
  useEffect(() => {
    if (selectedDate) {
      setCurrentDate(selectedDate)
    }
  }, [selectedDate])

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

  const handleDateClick = (date) => {
    onDateSelect(date)
    onClose()
  }

  const handleTodayClick = () => {
    const today = new Date()
    setCurrentDate(today)
    onDateSelect(today)
    onClose()
  }

  const getPositionClasses = () => {
    switch (position) {
      case 'bottom-center':
        return 'left-1/2 transform -translate-x-1/2'
      case 'bottom-right':
        return 'right-0'
      default:
        return 'left-0'
    }
  }

  if (!isOpen) return null

  return (
    <div 
      ref={calendarRef}
      className={`absolute top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-3 sm:p-4 min-w-[280px] sm:min-w-[320px] max-w-[90vw] sm:max-w-none ${getPositionClasses()} ${className}`}
    >
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => navigateMonth(-1)}
          className="p-2 sm:p-1 hover:bg-gray-100 rounded transition-colors"
          title="Previous month"
        >
          <ChevronLeft className="w-5 h-5 sm:w-4 sm:h-4" />
        </button>
        <span className="font-medium text-sm sm:text-base">
          {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </span>
        <button
          onClick={() => navigateMonth(1)}
          className="p-2 sm:p-1 hover:bg-gray-100 rounded transition-colors"
          title="Next month"
        >
          <ChevronRight className="w-5 h-5 sm:w-4 sm:h-4" />
        </button>
      </div>
      
      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1 text-xs">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="p-1 sm:p-1 text-center text-gray-500 font-medium text-xs sm:text-sm">
            {day}
          </div>
        ))}
        
        {generateCalendarDays().map((date, index) => {
          if (!date) return <div key={index} className="p-1" />
          
          const isCurrentMonth = date.getMonth() === currentDate.getMonth()
          const isToday = date.toDateString() === new Date().toDateString()
          const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString()
          
          return (
            <button
              key={index}
              onClick={() => handleDateClick(date)}
              className={`p-2 sm:p-1 rounded text-xs sm:text-sm transition-colors ${
                !isCurrentMonth 
                  ? 'text-gray-300' 
                  : isToday 
                    ? 'bg-blue-100 text-blue-700 font-semibold' 
                    : isSelected 
                      ? 'bg-gray-200 text-gray-900 font-semibold'
                      : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              {date.getDate()}
            </button>
          )
        })}
      </div>
      
      {/* Quick Actions */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
        <button
          onClick={handleTodayClick}
          className="text-xs sm:text-sm text-blue-600 hover:text-blue-700 font-medium px-2 py-1 rounded hover:bg-blue-50"
        >
          Today
        </button>
        <button
          onClick={onClose}
          className="text-xs sm:text-sm text-gray-500 hover:text-gray-700 font-medium px-2 py-1 rounded hover:bg-gray-50"
        >
          Close
        </button>
      </div>
    </div>
  )
}

export default CalendarPicker

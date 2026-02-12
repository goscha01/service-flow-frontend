"use client"

import { useState, useEffect } from "react"
import { X, ChevronDown } from "lucide-react"

const RecurringFrequencyModal = ({ isOpen, onClose, onSave, currentFrequency = "", scheduledDate = null }) => {
  const [isCustomSelected, setIsCustomSelected] = useState(false)
  const [repeatType, setRepeatType] = useState("weekly") // daily, weekly, monthly
  const [everyValue, setEveryValue] = useState(1)
  const [showRepeatDropdown, setShowRepeatDropdown] = useState(false)
  
  // Weekly options
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState("friday") // sun, mon, tue, wed, thu, fri, sat
  
  // Monthly options
  const [monthlyOption, setMonthlyOption] = useState("onDay") // "onDay" or "onThe"
  const [dayOfMonth, setDayOfMonth] = useState(12) // 1-31
  const [ordinal, setOrdinal] = useState("2nd") // 1st, 2nd, 3rd, 4th, last
  const [weekdayForMonthly, setWeekdayForMonthly] = useState("friday") // day of week for "on the" option
  const [showOrdinalDropdown, setShowOrdinalDropdown] = useState(false)
  const [showWeekdayDropdown, setShowWeekdayDropdown] = useState(false)

  const weekdays = [
    { value: "sunday", label: "Sun" },
    { value: "monday", label: "Mon" },
    { value: "tuesday", label: "Tue" },
    { value: "wednesday", label: "Wed" },
    { value: "thursday", label: "Thu" },
    { value: "friday", label: "Fri" },
    { value: "saturday", label: "Sat" }
  ]

  const ordinals = ["1st", "2nd", "3rd", "4th", "last"]

  useEffect(() => {
    if (currentFrequency) {
      setIsCustomSelected(true)
      const freq = currentFrequency.toLowerCase().trim()
      
      // Parse daily: "daily" or "X days"
      if (freq.includes('day') && !freq.includes('week') && !freq.includes('month')) {
        setRepeatType('daily')
        const dayMatch = freq.match(/(\d+)\s*days?/)
        setEveryValue(dayMatch ? parseInt(dayMatch[1]) : 1)
      } 
      // Parse weekly: "weekly-friday" or "X weeks-friday"
      else if (freq.includes('week')) {
        setRepeatType('weekly')
        const parts = freq.split('-')
        // Extract week number from first part
        const weekMatch = parts[0].match(/(\d+)\s*weeks?/) || parts[0].match(/weekly/)
        setEveryValue(weekMatch && weekMatch[1] ? parseInt(weekMatch[1]) : 1)
        // Extract day of week from second part
        if (parts.length > 1) {
          const dayPart = parts[parts.length - 1]
          const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
          const foundDay = dayNames.find(day => dayPart.includes(day))
          if (foundDay) {
            setSelectedDayOfWeek(foundDay)
          } else if (scheduledDate) {
            const date = new Date(scheduledDate)
            const dayIndex = date.getDay()
            setSelectedDayOfWeek(dayNames[dayIndex])
          }
        } else if (scheduledDate) {
          const date = new Date(scheduledDate)
          const dayIndex = date.getDay()
          const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
          setSelectedDayOfWeek(dayNames[dayIndex])
        }
      } 
      // Parse monthly: "monthly-day-12" or "monthly-2nd-friday" or "X months-day-12"
      else if (freq.includes('month')) {
        setRepeatType('monthly')
        const parts = freq.split('-')
        // Extract month number from first part
        const monthMatch = parts[0].match(/(\d+)\s*months?/) || parts[0].match(/monthly/)
        setEveryValue(monthMatch && monthMatch[1] ? parseInt(monthMatch[1]) : 1)
        
        // Check if it's "day" format or "ordinal-weekday" format
        if (parts.includes('day') && parts.length > 2) {
          // Format: monthly-day-12 or X months-day-12
          setMonthlyOption('onDay')
          const dayValue = parseInt(parts[parts.length - 1])
          if (dayValue && dayValue >= 1 && dayValue <= 31) {
            setDayOfMonth(dayValue)
          } else if (scheduledDate) {
            const date = new Date(scheduledDate)
            setDayOfMonth(date.getDate())
          }
        } else if (parts.length > 2) {
          // Format: monthly-2nd-friday or X months-2nd-friday
          setMonthlyOption('onThe')
          const ordinalsList = ["1st", "2nd", "3rd", "4th", "last"]
          const foundOrdinal = ordinalsList.find(ord => parts.includes(ord.toLowerCase()))
          if (foundOrdinal) {
            setOrdinal(foundOrdinal)
          }
          const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
          const foundDay = dayNames.find(day => parts.includes(day))
          if (foundDay) {
            setWeekdayForMonthly(foundDay)
          }
        } else if (scheduledDate) {
          // Fallback to scheduled date
          const date = new Date(scheduledDate)
          setDayOfMonth(date.getDate())
          setMonthlyOption('onDay')
        }
      }
    } else {
      setIsCustomSelected(false)
      setRepeatType('weekly')
      setEveryValue(1)
      if (scheduledDate) {
        const date = new Date(scheduledDate)
        const dayIndex = date.getDay()
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
        setSelectedDayOfWeek(dayNames[dayIndex])
      }
    }
  }, [currentFrequency, scheduledDate])

  const handleSave = () => {
    if (!isCustomSelected) {
      onSave({
        frequency: "",
        endDate: null
      })
      onClose()
      return
    }

    let frequency = ""
    
    if (repeatType === 'daily') {
      frequency = everyValue === 1 ? "daily" : `${everyValue} days`
    } else if (repeatType === 'weekly') {
      const weekdayLabel = weekdays.find(w => w.value === selectedDayOfWeek)?.label || 'Fri'
      frequency = everyValue === 1 ? `weekly-${selectedDayOfWeek}` : `${everyValue} weeks-${selectedDayOfWeek}`
    } else if (repeatType === 'monthly') {
      if (monthlyOption === 'onDay') {
        frequency = everyValue === 1 ? `monthly-day-${dayOfMonth}` : `${everyValue} months-day-${dayOfMonth}`
      } else {
        frequency = everyValue === 1 ? `monthly-${ordinal}-${weekdayForMonthly}` : `${everyValue} months-${ordinal}-${weekdayForMonthly}`
      }
    }
    
    onSave({
      frequency,
      endDate: null
    })
    onClose()
  }

  const getPreviewText = () => {
    if (!isCustomSelected) return ""
    
    if (repeatType === 'daily') {
      const unit = 'day'
      if (everyValue === 1) {
        return `every ${unit}`
      } else {
        return `every ${everyValue} ${unit}s`
      }
    } else if (repeatType === 'weekly') {
      const weekdayLabel = weekdays.find(w => w.value === selectedDayOfWeek)?.label || 'Friday'
      if (everyValue === 1) {
        return `every week on ${weekdayLabel}`
      } else {
        return `every ${everyValue} weeks on ${weekdayLabel}`
      }
    } else if (repeatType === 'monthly') {
      if (monthlyOption === 'onDay') {
        // Get ordinal for day (1st, 2nd, 3rd, etc.)
        const getOrdinal = (n) => {
          const s = ["th", "st", "nd", "rd"]
          const v = n % 100
          return n + (s[(v - 20) % 10] || s[v] || s[0])
        }
        if (everyValue === 1) {
          return `every month on the ${getOrdinal(dayOfMonth)}`
        } else {
          return `every ${everyValue} months on the ${getOrdinal(dayOfMonth)}`
        }
      } else {
        const weekdayLabel = weekdays.find(w => w.value === weekdayForMonthly)?.label || 'Friday'
        if (everyValue === 1) {
          return `every month on the ${ordinal} ${weekdayLabel}`
        } else {
          return `every ${everyValue} months on the ${ordinal} ${weekdayLabel}`
        }
      }
    }
    return ""
  }

  const getUnitText = () => {
    if (repeatType === 'daily') return 'day'
    if (repeatType === 'weekly') return 'week'
    if (repeatType === 'monthly') return 'month'
    return 'day'
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md shadow-xl" style={{ fontFamily: 'Montserrat' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 600 }}>
            Frequency
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Section Header */}
          <div className="mb-4">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider" style={{ fontFamily: 'Montserrat', fontWeight: 700 }}>
              SELECT RECURRING PLAN
            </h3>
          </div>

          {/* Custom Frequency Option */}
          <div className="mb-6">
            <div 
              className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                isCustomSelected 
                  ? 'border-blue-600 bg-blue-50' 
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
              onClick={() => setIsCustomSelected(true)}
            >
              <div className="flex items-center gap-3">
                {/* Radio Button */}
                <div className="flex-shrink-0">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    isCustomSelected 
                      ? 'border-blue-600 bg-blue-600' 
                      : 'border-gray-300 bg-white'
                  }`}>
                    {isCustomSelected && (
                      <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
                    )}
                  </div>
                </div>
                <span className="text-sm text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
                  Custom frequency...
                </span>
              </div>

              {/* Frequency Configuration - Only show when selected */}
              {isCustomSelected && (
                <div className="mt-4 space-y-4 pl-8 border-t border-gray-200 pt-4">
                  {/* Repeat Dropdown */}
                  <div className="flex items-center gap-3">
                    <label className="text-sm text-gray-700 whitespace-nowrap" style={{ fontFamily: 'Montserrat', fontWeight: 500 }}>
                      Repeat
                    </label>
                    <div className="relative flex-1">
                      <button
                        type="button"
                        onClick={() => setShowRepeatDropdown(!showRepeatDropdown)}
                        className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        style={{ fontFamily: 'Montserrat', fontWeight: 400 }}
                      >
                        <span className="capitalize">{repeatType}</span>
                        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showRepeatDropdown ? 'transform rotate-180' : ''}`} />
                      </button>
                      {showRepeatDropdown && (
                        <>
                          <div 
                            className="fixed inset-0 z-10" 
                            onClick={() => setShowRepeatDropdown(false)}
                          ></div>
                          <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
                            {['daily', 'weekly', 'monthly'].map((type) => (
                              <button
                                key={type}
                                type="button"
                                onClick={() => {
                                  setRepeatType(type)
                                  setShowRepeatDropdown(false)
                                  setEveryValue(1)
                                }}
                                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg ${
                                  repeatType === type ? 'bg-blue-50 text-blue-600' : 'text-gray-900'
                                }`}
                                style={{ fontFamily: 'Montserrat', fontWeight: repeatType === type ? 600 : 400 }}
                              >
                                <span className="capitalize">{type}</span>
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Every Input */}
                  <div className="flex items-center gap-3">
                    <label className="text-sm text-gray-700 whitespace-nowrap" style={{ fontFamily: 'Montserrat', fontWeight: 500 }}>
                      Every
                    </label>
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="number"
                        min="1"
                        max={repeatType === 'daily' ? 365 : repeatType === 'weekly' ? 52 : 12}
                        value={everyValue}
                        onChange={(e) => setEveryValue(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-16 px-3 py-2 border border-gray-300 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                        style={{ fontFamily: 'Montserrat', fontWeight: 400 }}
                      />
                      <span className="text-sm text-gray-700" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
                        {getUnitText()}{everyValue !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  {/* Weekly: Day of Week Selection */}
                  {repeatType === 'weekly' && (
                    <div className="flex items-center gap-3">
                      <label className="text-sm text-gray-700 whitespace-nowrap" style={{ fontFamily: 'Montserrat', fontWeight: 500 }}>
                        On
                      </label>
                      <div className="flex-1 flex gap-1">
                        {weekdays.map((day) => (
                          <button
                            key={day.value}
                            type="button"
                            onClick={() => setSelectedDayOfWeek(day.value)}
                            className={`flex-1 px-2 py-2 text-xs font-medium rounded-lg transition-colors ${
                              selectedDayOfWeek === day.value
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                            style={{ fontFamily: 'Montserrat', fontWeight: selectedDayOfWeek === day.value ? 600 : 400 }}
                          >
                            {day.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Monthly: Day Selection Options */}
                  {repeatType === 'monthly' && (
                    <div className="space-y-3">
                      {/* On day option */}
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          id="onDay"
                          name="monthlyOption"
                          checked={monthlyOption === 'onDay'}
                          onChange={() => setMonthlyOption('onDay')}
                          className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <label htmlFor="onDay" className="text-sm text-gray-700 whitespace-nowrap" style={{ fontFamily: 'Montserrat', fontWeight: 500 }}>
                          On day
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="31"
                          value={dayOfMonth}
                          onChange={(e) => setDayOfMonth(Math.max(1, Math.min(31, parseInt(e.target.value) || 1)))}
                          className="w-16 px-3 py-2 border border-gray-300 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                          style={{ fontFamily: 'Montserrat', fontWeight: 400 }}
                        />
                      </div>

                      {/* On the option */}
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          id="onThe"
                          name="monthlyOption"
                          checked={monthlyOption === 'onThe'}
                          onChange={() => setMonthlyOption('onThe')}
                          className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <label htmlFor="onThe" className="text-sm text-gray-700 whitespace-nowrap" style={{ fontFamily: 'Montserrat', fontWeight: 500 }}>
                          On the
                        </label>
                        <div className="flex-1 flex gap-2">
                          <div className="relative flex-1">
                            <button
                              type="button"
                              onClick={() => setShowOrdinalDropdown(!showOrdinalDropdown)}
                              className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              style={{ fontFamily: 'Montserrat', fontWeight: 400 }}
                            >
                              <span>{ordinal}</span>
                              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showOrdinalDropdown ? 'transform rotate-180' : ''}`} />
                            </button>
                            {showOrdinalDropdown && (
                              <>
                                <div 
                                  className="fixed inset-0 z-10" 
                                  onClick={() => setShowOrdinalDropdown(false)}
                                ></div>
                                <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
                                  {ordinals.map((ord) => (
                                    <button
                                      key={ord}
                                      type="button"
                                      onClick={() => {
                                        setOrdinal(ord)
                                        setShowOrdinalDropdown(false)
                                      }}
                                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg ${
                                        ordinal === ord ? 'bg-blue-50 text-blue-600' : 'text-gray-900'
                                      }`}
                                      style={{ fontFamily: 'Montserrat', fontWeight: ordinal === ord ? 600 : 400 }}
                                    >
                                      {ord}
                                    </button>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                          <div className="relative flex-1">
                            <button
                              type="button"
                              onClick={() => setShowWeekdayDropdown(!showWeekdayDropdown)}
                              className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              style={{ fontFamily: 'Montserrat', fontWeight: 400 }}
                            >
                              <span className="capitalize">{weekdays.find(w => w.value === weekdayForMonthly)?.label || 'Friday'}</span>
                              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showWeekdayDropdown ? 'transform rotate-180' : ''}`} />
                            </button>
                            {showWeekdayDropdown && (
                              <>
                                <div 
                                  className="fixed inset-0 z-10" 
                                  onClick={() => setShowWeekdayDropdown(false)}
                                ></div>
                                <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
                                  {weekdays.map((day) => (
                                    <button
                                      key={day.value}
                                      type="button"
                                      onClick={() => {
                                        setWeekdayForMonthly(day.value)
                                        setShowWeekdayDropdown(false)
                                      }}
                                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg ${
                                        weekdayForMonthly === day.value ? 'bg-blue-50 text-blue-600' : 'text-gray-900'
                                      }`}
                                      style={{ fontFamily: 'Montserrat', fontWeight: weekdayForMonthly === day.value ? 600 : 400 }}
                                    >
                                      {day.label}
                                    </button>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Preview Text */}
                  <div className="pt-2">
                    <p className="text-xs text-gray-500" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
                      {getPreviewText()}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            style={{ fontFamily: 'Montserrat', fontWeight: 500 }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            style={{ fontFamily: 'Montserrat', fontWeight: 500 }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

export default RecurringFrequencyModal

import React, { useState, useEffect } from 'react'
import { X, Plus, Clock, Calendar } from 'lucide-react'

const UpdateAvailabilityModal = ({ isOpen, onClose, onSave, selectedDates = [], availability = [] }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDatesState, setSelectedDatesState] = useState(selectedDates)
  const [availabilityType, setAvailabilityType] = useState('unavailable') // 'unavailable' or 'time_period'
  const [timeSlots, setTimeSlots] = useState([])
  const [newTimeSlot, setNewTimeSlot] = useState({ start: '09:00', end: '17:00' })
  const [dateRangeMode, setDateRangeMode] = useState(false) // For vacation periods
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  useEffect(() => {
    if (isOpen) {
      setSelectedDatesState(selectedDates)
    }
  }, [isOpen, selectedDates])

  const handleDateClick = (date) => {
    const dateStr = date.toISOString().split('T')[0]
    setSelectedDatesState(prev => 
      prev.includes(dateStr) 
        ? prev.filter(d => d !== dateStr)
        : [...prev, dateStr]
    )
  }

  const handleDateRangeSelect = () => {
    if (startDate && endDate) {
      const start = new Date(startDate)
      const end = new Date(endDate)
      const dates = []
      
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        dates.push(d.toISOString().split('T')[0])
      }
      
      setSelectedDatesState(prev => [...prev, ...dates.filter(date => !prev.includes(date))])
      setStartDate('')
      setEndDate('')
    }
  }

  const clearAllDates = () => {
    setSelectedDatesState([])
  }

  const handleAddTimeSlot = () => {
    setTimeSlots(prev => [...prev, { ...newTimeSlot, id: Date.now() }])
    setNewTimeSlot({ start: '09:00', end: '17:00' })
  }

  const handleRemoveTimeSlot = (id) => {
    setTimeSlots(prev => prev.filter(slot => slot.id !== id))
  }

  const handleSave = () => {
    const availabilityData = {
      dates: selectedDatesState,
      type: availabilityType,
      timeSlots: availabilityType === 'time_period' ? timeSlots : []
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
    return selectedDatesState.includes(formatDate(date))
  }

  const isCurrentMonth = (date) => {
    return date.getMonth() === currentMonth.getMonth()
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Update Availability</h2>
          <div className="flex items-center space-x-3">
            <button 
              onClick={handleSave}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              Save
            </button>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Dates Section */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Dates</h3>
            <p className="text-sm text-gray-600 mb-4">Select the date(s) you want to assign specific hours</p>
            
            {/* Date Range Picker for Vacation Periods */}
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center space-x-2 mb-3">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Quick Date Range Selection (for vacation periods)</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={handleDateRangeSelect}
                    disabled={!startDate || !endDate}
                    className="w-full px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Add Range
                  </button>
                </div>
              </div>
            </div>

            {/* Selected Dates Summary */}
            {selectedDatesState.length > 0 && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">
                      {selectedDatesState.length} date{selectedDatesState.length !== 1 ? 's' : ''} selected
                    </span>
                  </div>
                  <button
                    onClick={clearAllDates}
                    className="text-red-600 hover:text-red-700 text-sm font-medium"
                  >
                    Clear All
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {selectedDatesState.slice(0, 5).map(date => (
                    <span key={date} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                      {new Date(date).toLocaleDateString()}
                    </span>
                  ))}
                  {selectedDatesState.length > 5 && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                      +{selectedDatesState.length - 5} more
                    </span>
                  )}
                </div>
              </div>
            )}
            
            {/* Calendar */}
            <div className="border border-gray-200 rounded-lg p-4">
              {/* Calendar Header */}
              <div className="flex items-center justify-between mb-4">
                <button 
                  onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1))}
                  className="p-2 hover:bg-gray-100 rounded"
                >
                  ←
                </button>
                <h4 className="text-lg font-medium">
                  {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </h4>
                <button 
                  onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1))}
                  className="p-2 hover:bg-gray-100 rounded"
                >
                  →
                </button>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1">
                {/* Day headers */}
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
                    {day}
                  </div>
                ))}
                
                {/* Calendar days */}
                {generateCalendarDays().map((date, index) => (
                  <button
                    key={index}
                    onClick={() => handleDateClick(date)}
                    className={`p-2 text-sm rounded hover:bg-gray-100 ${
                      isSelected(date) 
                        ? 'bg-blue-600 text-white hover:bg-blue-700' 
                        : isCurrentMonth(date) 
                          ? 'text-gray-900' 
                          : 'text-gray-400'
                    }`}
                  >
                    {date.getDate()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Availability Section */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Availability</h3>
            <p className="text-sm text-gray-600 mb-4">Edit your available hours for the selected dates</p>
            
            {/* Availability Type Selection */}
            <div className="space-y-4">
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="availabilityType"
                    value="unavailable"
                    checked={availabilityType === 'unavailable'}
                    onChange={(e) => setAvailabilityType(e.target.value)}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">Unavailable</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="availabilityType"
                    value="time_period"
                    checked={availabilityType === 'time_period'}
                    onChange={(e) => setAvailabilityType(e.target.value)}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">Time Period</span>
                </label>
              </div>

              {/* Time Period Configuration */}
              {availabilityType === 'time_period' && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <input
                      type="time"
                      value={newTimeSlot.start}
                      onChange={(e) => setNewTimeSlot(prev => ({ ...prev, start: e.target.value }))}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-gray-500">to</span>
                    <input
                      type="time"
                      value={newTimeSlot.end}
                      onChange={(e) => setNewTimeSlot(prev => ({ ...prev, end: e.target.value }))}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={handleAddTimeSlot}
                      className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Hours</span>
                    </button>
                  </div>

                  {/* Time Slots List */}
                  {timeSlots.length > 0 && (
                    <div className="space-y-2">
                      {timeSlots.map((slot) => (
                        <div key={slot.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-2">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-medium">
                              {slot.start} - {slot.end}
                            </span>
                          </div>
                          <button
                            onClick={() => handleRemoveTimeSlot(slot.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Unavailable Display */}
              {availabilityType === 'unavailable' && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <X className="w-5 h-5 text-red-600" />
                    <span className="text-sm font-medium text-red-800">Unavailable</span>
                  </div>
                  <p className="text-xs text-red-600 mt-1">
                    Selected dates will be marked as unavailable
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UpdateAvailabilityModal

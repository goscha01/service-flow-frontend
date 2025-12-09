"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { ChevronLeft, ChevronRight, Settings, RefreshCw, Clock, User } from "lucide-react"
import { availabilityAPI } from "../services/api"
import { useAuth } from "../context/AuthContext"

const WorkerAvailability = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  
  // Current month/year state
  const [currentDate, setCurrentDate] = useState(new Date())
  const currentMonth = currentDate.getMonth()
  const currentYear = currentDate.getFullYear()
  
  // Availability data - store per day
  const [availabilityData, setAvailabilityData] = useState({})
  
  // Get days in current month
  const daysInMonth = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1)
    const lastDay = new Date(currentYear, currentMonth + 1, 0)
    const days = []
    
    // Add days from start of month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const date = new Date(currentYear, currentMonth, i)
      days.push({
        date: i,
        dayOfWeek: date.getDay(),
        fullDate: date.toISOString().split('T')[0],
        dateObj: date
      })
    }
    
    return days
  }, [currentMonth, currentYear])
  
  const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                     'July', 'August', 'September', 'October', 'November', 'December']
  
  const loadAvailabilityData = useCallback(async () => {
    if (!user?.id) return
    
    try {
      setLoading(true)
      setMessage({ type: '', text: '' })
      
      // Load availability for the current month
      const startDate = new Date(currentYear, currentMonth, 1).toISOString().split('T')[0]
      const endDate = new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0]
      
      // For now, we'll use the existing API - may need worker-specific endpoint later
      const availability = await availabilityAPI.getAvailability(user.id)
      
      // Parse availability data - this might need adjustment based on API response
      // For now, we'll create a structure that matches the UI
      const data = {}
      
      // Initialize all days with default availability
      daysInMonth.forEach(day => {
        const dayOfWeek = day.dayOfWeek
        // Default: weekdays available 9 AM - 6 PM, weekends unavailable
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
        data[day.fullDate] = {
          available: !isWeekend,
          timeRange: isWeekend ? null : { start: '09:00', end: '18:00' },
          allDay: isWeekend
        }
      })
      
      // If API returns specific availability data, merge it
      if (availability?.dailyAvailability) {
        Object.keys(availability.dailyAvailability).forEach(date => {
          const dayData = availability.dailyAvailability[date]
          if (dayData) {
            data[date] = {
              available: dayData.available !== false,
              timeRange: dayData.timeRange || (dayData.start && dayData.end ? { start: dayData.start, end: dayData.end } : null),
              allDay: dayData.allDay || (!dayData.start && !dayData.end)
            }
          }
        })
      }
      
      setAvailabilityData(data)
    } catch (error) {
      console.error('Error loading availability:', error)
      setMessage({ type: 'error', text: 'Failed to load availability. Using defaults.' })
      
      // Set defaults on error
      const data = {}
      daysInMonth.forEach(day => {
        const dayOfWeek = day.dayOfWeek
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
        data[day.fullDate] = {
          available: !isWeekend,
          timeRange: isWeekend ? null : { start: '09:00', end: '18:00' },
          allDay: isWeekend
        }
      })
      setAvailabilityData(data)
    } finally {
      setLoading(false)
    }
  }, [user?.id, currentYear, currentMonth, daysInMonth])
  
  useEffect(() => {
    if (user?.id) {
      loadAvailabilityData()
    }
  }, [user?.id, currentYear, currentMonth, loadAvailabilityData])
  
  const handlePreviousMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1))
  }
  
  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1))
  }
  
  const toggleDayAvailability = async (date) => {
    if (saving) return
    
    try {
      setSaving(true)
      const current = availabilityData[date] || { available: false, timeRange: null, allDay: true }
      const newState = {
        available: !current.available,
        timeRange: current.timeRange,
        allDay: current.allDay || !current.available
      }
      
      setAvailabilityData(prev => ({
        ...prev,
        [date]: newState
      }))
      
      // Save to API - for workers, we'll use team member availability endpoint if available
      // Otherwise, use the user availability endpoint
      try {
        // Try team member availability endpoint first (if user has teamMemberId)
        if (user.teamMemberId) {
          // This would use teamAPI.updateAvailability if available
          // For now, we'll use the user availability endpoint
          await availabilityAPI.updateAvailability({
            userId: user.id,
            dailyAvailability: {
              [date]: newState
            }
          })
        } else {
          await availabilityAPI.updateAvailability({
            userId: user.id,
            dailyAvailability: {
              [date]: newState
            }
          })
        }
      } catch (error) {
        // If API call fails, we'll still update the UI optimistically
        console.error('Error saving availability:', error)
        throw error
      }
      
      setMessage({ type: 'success', text: 'Availability updated!' })
      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
    } catch (error) {
      console.error('Error updating availability:', error)
      setMessage({ type: 'error', text: 'Failed to update availability' })
      // Revert on error
      loadAvailabilityData()
    } finally {
      setSaving(false)
    }
  }
  
  const formatTime = (time) => {
    if (!time) return ''
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours, 10)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading availability...</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-gray-50 pb-24 lg:pb-0">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Profile Icon */}
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
              <span className="text-orange-600 font-semibold text-sm">
                {user?.firstName?.[0] || user?.email?.[0] || 'U'}
                {user?.lastName?.[0] || ''}
              </span>
            </div>
            
            {/* Title */}
            <h1 className="text-xl font-semibold text-gray-900 flex-1 text-center">
              My Availability
            </h1>
            
            {/* Settings Icon - Gear with clock */}
            <button
              onClick={() => navigate('/settings/availability')}
              className="w-10 h-10 flex items-center justify-center text-gray-600 hover:text-gray-900 relative"
            >
              <Settings className="w-5 h-5" />
              <Clock className="w-3 h-3 absolute bottom-0 right-0" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Month Navigation */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="flex items-center justify-between">
          <button
            onClick={handlePreviousMonth}
            className="p-2 text-gray-600 hover:text-gray-900"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <h2 className="text-lg font-semibold text-gray-900">
            {monthNames[currentMonth]} {currentYear}
          </h2>
          
          <button
            onClick={handleNextMonth}
            className="p-2 text-gray-600 hover:text-gray-900"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
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
      
      {/* Availability List */}
      <div className="px-4 py-4 space-y-3">
        {daysInMonth.map((day) => {
          const dayData = availabilityData[day.fullDate] || { available: false, timeRange: null, allDay: true }
          const isAvailable = dayData.available
          const timeRange = dayData.timeRange
          const isAllDay = dayData.allDay || !timeRange
          
          return (
            <div
              key={day.fullDate}
              className="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between"
            >
              <div className="flex items-center space-x-3 flex-1">
                {/* Checkbox-like circle */}
                <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex-shrink-0" />
                
                <div className="flex flex-col min-w-[60px]">
                  <span className="text-xs font-semibold text-gray-500 uppercase">
                    {dayNames[day.dayOfWeek]}
                  </span>
                  <span className="text-lg font-bold text-gray-900">
                    {day.date}
                  </span>
                </div>
                
                <div className="flex-1">
                  <div className={`text-sm font-medium ${isAvailable ? 'text-green-600' : 'text-gray-500'}`}>
                    {isAvailable ? 'Available' : 'Unavailable'}
                  </div>
                  {isAvailable && !isAllDay && timeRange && (
                    <div className="text-xs text-gray-600 mt-1">
                      {formatTime(timeRange.start)} - {formatTime(timeRange.end)}
                    </div>
                  )}
                  {(isAllDay || (!isAvailable && !timeRange)) && (
                    <div className="text-xs text-gray-600 mt-1">
                      All day
                    </div>
                  )}
                </div>
              </div>
              
              <button
                onClick={() => toggleDayAvailability(day.fullDate)}
                disabled={saving}
                className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default WorkerAvailability


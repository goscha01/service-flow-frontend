"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { ChevronLeft, ChevronRight, Settings, RefreshCw, Clock, User, X, Plus, Trash2, RotateCw, Calendar } from "lucide-react"
import { availabilityAPI, teamAPI } from "../services/api"
import { useAuth } from "../context/AuthContext"
import { getImageUrl } from "../utils/imageUtils"
import { isWorker } from "../utils/roleUtils"
import MobileHeader from "../components/mobile-header"

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
  
  // Selected day state
  const [selectedDay, setSelectedDay] = useState(null)
  
  // Weekly hours editing modal state
  const [showEditWeeklyHoursModal, setShowEditWeeklyHoursModal] = useState(false)
  const [editingDayOfWeek, setEditingDayOfWeek] = useState(null) // e.g., 'wednesday'
  const [workingHours, setWorkingHours] = useState({
    sunday: { available: false, timeSlots: [] },
    monday: { available: true, timeSlots: [{ id: 1, start: '09:00', end: '18:00' }] },
    tuesday: { available: true, timeSlots: [{ id: 2, start: '09:00', end: '18:00' }] },
    wednesday: { available: true, timeSlots: [{ id: 3, start: '09:00', end: '18:00' }] },
    thursday: { available: true, timeSlots: [{ id: 4, start: '09:00', end: '18:00' }] },
    friday: { available: true, timeSlots: [{ id: 5, start: '09:00', end: '18:00' }] },
    saturday: { available: false, timeSlots: [] }
  })
  const [savingWeeklyHours, setSavingWeeklyHours] = useState(false)
  
  // Single date editing modal state
  const [showEditSingleDateModal, setShowEditSingleDateModal] = useState(false)
  const [editingDate, setEditingDate] = useState(null)
  const [singleDateHours, setSingleDateHours] = useState([])
  
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
  const dayNamesFull = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const dayNamesLower = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                     'July', 'August', 'September', 'October', 'November', 'December']
  
  // Generate time options for time inputs
  const generateTimeOptions = () => {
    const options = []
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        const displayHour = hour % 12 || 12
        const ampm = hour >= 12 ? 'PM' : 'AM'
        options.push({
          value: time,
          label: `${displayHour}:${minute.toString().padStart(2, '0')} ${ampm}`
        })
      }
    }
    return options
  }
  
  const timeOptions = generateTimeOptions()
  
  // Load working hours from team member availability
  // For workers, if they don't have availability set, inherit business hours (9-6 default)
  const loadWorkingHours = useCallback(async () => {
    // For non-workers (account owners/managers), they might not have teamMemberId
    // In that case, use user availability API instead
    if (!user?.teamMemberId && !user?.id) return
    
    try {
      // First, try to load business hours as default (for workers)
      let businessHours = null
      if (user?.teamMemberId) {
        // For workers, try to get business hours from account owner
        try {
          const ownerAvailability = await availabilityAPI.getAvailability(user.id)
          if (ownerAvailability?.businessHours) {
            businessHours = typeof ownerAvailability.businessHours === 'string' 
              ? JSON.parse(ownerAvailability.businessHours)
              : ownerAvailability.businessHours
          }
        } catch (e) {
          console.log('Could not load business hours as fallback:', e)
        }
      }
      
      // Try team member availability first if user has teamMemberId
      // Otherwise fall back to user availability
      let availability
      if (user?.teamMemberId) {
        availability = await teamAPI.getAvailability(user.teamMemberId)
      } else {
        // For account owners/managers without teamMemberId, use user availability
        availability = await availabilityAPI.getAvailability(user.id)
      }
      
      if (user?.teamMemberId && availability?.availability) {
        // Team member format - workingHours
        let availData = availability.availability
        if (typeof availData === 'string') {
          try {
            availData = JSON.parse(availData)
          } catch (e) {
            console.error('Error parsing availability:', e)
          }
        }
        
        if (availData?.workingHours && Object.keys(availData.workingHours).length > 0) {
          // Convert to our format - worker has their own schedule
          const newWorkingHours = {}
          Object.keys(dayNamesLower).forEach((dayIdx) => {
            const dayName = dayNamesLower[dayIdx]
            const dayData = availData.workingHours[dayName]
            
            if (dayData) {
              // Preserve timeSlots from API; ensure each slot has an id for UI (add/remove)
              const rawSlots = dayData.timeSlots || (dayData.hours ? [{
                start: dayData.hours.split(' - ')[0]?.replace(' AM', '').replace(' PM', '')?.trim() || '09:00',
                end: dayData.hours.split(' - ')[1]?.replace(' AM', '').replace(' PM', '')?.trim() || '18:00'
              }] : [])
              const timeSlots = rawSlots.map((slot, i) => ({
                ...slot,
                id: slot.id != null ? slot.id : Date.now() + dayIdx * 100 + i
              }))
              newWorkingHours[dayName] = {
                available: dayData.available !== false,
                timeSlots
              }
            } else {
              // Day not set - check if business hours available, otherwise use default
              const dayBusinessHours = businessHours?.[dayName]
              if (dayBusinessHours && dayBusinessHours.enabled) {
                newWorkingHours[dayName] = {
                  available: true,
                  timeSlots: [{ 
                    id: Date.now() + dayIdx, 
                    start: dayBusinessHours.start || '09:00', 
                    end: dayBusinessHours.end || '18:00' 
                  }]
                }
              } else {
                // Default: weekdays 9-6, weekends unavailable
                newWorkingHours[dayName] = {
                  available: dayIdx !== 0 && dayIdx !== 6, // Not Sunday or Saturday
                  timeSlots: dayIdx !== 0 && dayIdx !== 6 ? [{ id: Date.now() + dayIdx, start: '09:00', end: '18:00' }] : []
                }
              }
            }
          })
          
          setWorkingHours(newWorkingHours)
        } else {
          // Worker has no availability set - inherit business hours (9-6 default)
          const newWorkingHours = {}
          Object.keys(dayNamesLower).forEach((dayIdx) => {
            const dayName = dayNamesLower[dayIdx]
            const dayBusinessHours = businessHours?.[dayName]
            
            if (dayBusinessHours && dayBusinessHours.enabled) {
              // Use business hours
              newWorkingHours[dayName] = {
                available: true,
                timeSlots: [{ 
                  id: Date.now() + dayIdx, 
                  start: dayBusinessHours.start || '09:00', 
                  end: dayBusinessHours.end || '18:00' 
                }]
              }
            } else {
              // Default: weekdays 9-6, weekends unavailable
              newWorkingHours[dayName] = {
                available: dayIdx !== 0 && dayIdx !== 6, // Not Sunday or Saturday
                timeSlots: dayIdx !== 0 && dayIdx !== 6 ? [{ id: Date.now() + dayIdx, start: '09:00', end: '18:00' }] : []
              }
            }
          })
          
          setWorkingHours(newWorkingHours)
        }
      } else if (!user?.teamMemberId && availability?.businessHours) {
        // User availability format - businessHours
        let businessHours = availability.businessHours
        if (typeof businessHours === 'string') {
          try {
            businessHours = JSON.parse(businessHours)
          } catch (e) {
            console.error('Error parsing businessHours:', e)
          }
        }
        
        if (businessHours) {
          // Convert businessHours format to workingHours format
          const newWorkingHours = {}
          Object.keys(dayNamesLower).forEach((dayIdx) => {
            const dayName = dayNamesLower[dayIdx]
            const dayData = businessHours[dayName]
            
            if (dayData && dayData.enabled) {
              newWorkingHours[dayName] = {
                available: true,
                timeSlots: [{
                  id: Date.now() + dayIdx,
                  start: dayData.start || '09:00',
                  end: dayData.end || '18:00'
                }]
              }
            } else {
              newWorkingHours[dayName] = {
                available: false,
                timeSlots: []
              }
            }
          })
          
          setWorkingHours(newWorkingHours)
        }
      }
    } catch (error) {
      console.error('Error loading working hours:', error)
    }
  }, [user?.teamMemberId, user?.id])
  
  useEffect(() => {
    if ((user?.teamMemberId || user?.id) && showEditWeeklyHoursModal) {
      loadWorkingHours()
    }
  }, [user?.teamMemberId, user?.id, showEditWeeklyHoursModal, loadWorkingHours])
  
  const loadAvailabilityData = useCallback(async () => {
    if (!user?.id) return
    
    try {
      setLoading(true)
      setMessage({ type: '', text: '' })
      
      // Load availability for the current month
      const startDate = new Date(currentYear, currentMonth, 1).toISOString().split('T')[0]
      const endDate = new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0]
      
      // Use appropriate API based on user type
      let availability
      let accountOwnerAvailability = null
      if (user?.teamMemberId) {
        // Workers: use team member availability endpoint - MUST use the logged-in worker's teamMemberId
        console.log('Loading worker availability for teamMemberId:', user.teamMemberId)
        availability = await teamAPI.getAvailability(user.teamMemberId, startDate, endDate)
        console.log('Worker availability loaded:', availability)
        // Also try to get account owner's business hours as fallback
        try {
          accountOwnerAvailability = await availabilityAPI.getAvailability(user.id)
        } catch (e) {
          // Ignore errors - this is just a fallback
          console.log('Could not load account owner availability as fallback')
        }
      } else {
        // Account owners/managers: use user availability endpoint
        availability = await availabilityAPI.getAvailability(user.id)
      }
      
      // Parse availability data - this might need adjustment based on API response
      // For now, we'll create a structure that matches the UI
      const data = {}
      
      // Initialize all days with default availability (weekdays available, weekends unavailable)
      daysInMonth.forEach(day => {
        const dayOfWeek = day.dayOfWeek
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
        data[day.fullDate] = {
          available: !isWeekend,
          timeRange: !isWeekend ? { start: '09:00', end: '18:00' } : null,
          allDay: isWeekend
        }
      })
      
      // If API returns specific availability data, merge it
      if (user?.teamMemberId && availability?.availability) {
        // Team member format - parse availability string
        let availData = availability.availability
        if (typeof availData === 'string') {
          try {
            availData = JSON.parse(availData)
          } catch (e) {
            console.error('Error parsing availability:', e)
            availData = {}
          }
        }
        
        // Parse business hours for fallback
        let businessHours = null
        if (accountOwnerAvailability?.businessHours) {
          businessHours = accountOwnerAvailability.businessHours
          if (typeof businessHours === 'string') {
            try {
              businessHours = JSON.parse(businessHours)
            } catch (e) {
              console.error('Error parsing businessHours:', e)
              businessHours = null
            }
          }
        }
        
        // Apply working hours to all days of that day of week
        // If a day doesn't have workingHours, fall back to businessHours
        daysInMonth.forEach(day => {
          const dayOfWeek = day.dayOfWeek
          const dayName = dayNamesLower[dayOfWeek]
          const dayWorkingHours = availData?.workingHours?.[dayName]
          
          if (dayWorkingHours) {
            // Day has working hours defined - use them
            const isAvailable = dayWorkingHours.available !== false
            let timeRange = null
            
            if (isAvailable) {
              // Get time slots
              if (dayWorkingHours.timeSlots && Array.isArray(dayWorkingHours.timeSlots) && dayWorkingHours.timeSlots.length > 0) {
                // Use first time slot
                const firstSlot = dayWorkingHours.timeSlots[0]
                timeRange = { start: firstSlot.start, end: firstSlot.end }
              } else if (dayWorkingHours.start && dayWorkingHours.end) {
                // Legacy format with start/end
                timeRange = { start: dayWorkingHours.start, end: dayWorkingHours.end }
              } else if (dayWorkingHours.hours) {
                // Legacy format with hours string - need to convert AM/PM to 24-hour
                const parts = dayWorkingHours.hours.split(' - ')
                const convertTo24Hour = (timeStr) => {
                  const trimmed = timeStr.trim()
                  const isPM = trimmed.includes('PM')
                  const isAM = trimmed.includes('AM')
                  let time = trimmed.replace(/[AP]M/i, '').trim()
                  const [hours, minutes] = time.split(':')
                  let hour24 = parseInt(hours, 10)
                  if (isPM && hour24 !== 12) hour24 += 12
                  if (isAM && hour24 === 12) hour24 = 0
                  return `${hour24.toString().padStart(2, '0')}:${minutes || '00'}`
                }
                timeRange = { 
                  start: convertTo24Hour(parts[0] || '09:00 AM'), 
                  end: convertTo24Hour(parts[1] || '06:00 PM') 
                }
              }
            }
            
            data[day.fullDate] = {
              available: isAvailable,
              timeRange: timeRange,
              allDay: !timeRange
            }
          } else if (businessHours?.[dayName]) {
            // No workingHours for this day, fall back to businessHours
            const dayBusinessHours = businessHours[dayName]
            const isEnabled = dayBusinessHours.enabled !== false
            data[day.fullDate] = {
              available: isEnabled,
              timeRange: isEnabled && dayBusinessHours.start && dayBusinessHours.end
                ? { start: dayBusinessHours.start, end: dayBusinessHours.end }
                : null,
              allDay: !isEnabled || !dayBusinessHours.start || !dayBusinessHours.end
            }
          }
          // If neither workingHours nor businessHours exist for this day, keep the default
        })
        
        // Apply custom availability overrides (these override working hours for specific dates)
        // Custom availability always takes precedence - it's an explicit date override
        if (availData?.customAvailability) {
          availData.customAvailability.forEach(customItem => {
            const itemDate = customItem.date
            if (itemDate && data[itemDate] !== undefined) {
              if (customItem.available && customItem.hours && customItem.hours.length > 0) {
                // Custom availability makes this date available
                const firstHour = customItem.hours[0]
                data[itemDate] = {
                  available: true,
                  timeRange: firstHour.start && firstHour.end 
                    ? { start: firstHour.start, end: firstHour.end }
                    : null,
                  allDay: !firstHour.start || !firstHour.end
                }
              } else {
                // Custom availability makes this date unavailable
                data[itemDate] = {
                  available: false,
                  timeRange: null,
                  allDay: true
                }
              }
            }
          })
        }
      } else if (!user?.teamMemberId && availability?.dailyAvailability) {
        // User availability format
        Object.keys(availability.dailyAvailability).forEach(date => {
          const dayData = availability.dailyAvailability[date]
          if (dayData && data[date] !== undefined) {
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
  }, [user?.id, user?.teamMemberId, currentYear, currentMonth, daysInMonth])
  
  useEffect(() => {
    if (user?.id) {
      loadAvailabilityData()
    }
  }, [user?.id, currentYear, currentMonth, loadAvailabilityData])
  
  // Redirect if not a worker - must be after all hooks
  useEffect(() => {
    if (user && !isWorker(user)) {
      navigate('/dashboard')
    }
  }, [user, navigate])
  
  const handlePreviousMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1))
    setSelectedDay(null)
  }
  
  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1))
    setSelectedDay(null)
  }
  
  // Handle day click to show bottom modal
  const handleDayClick = (day, event) => {
    event.stopPropagation()
    setSelectedDay(day)
  }
  
  // Handle "Edit [Day]" - e.g., "Edit Wednesdays" - navigate to settings/availability
  const handleEditDayOfWeek = (day) => {
    setSelectedDay(null)
    navigate('/settings/availability')
  }
  
  // Handle "Edit 1 Date" - navigate to single date edit page
  const handleEditSingleDate = (day) => {
    setSelectedDay(null)
    navigate(`/availability/edit/${day.fullDate}`)
  }
  
  // Save weekly hours
  const handleSaveWeeklyHours = async () => {
    if (!user?.teamMemberId && !user?.id) return
    
    try {
      setSavingWeeklyHours(true)
      
      // Convert workingHours to API format
      const workingHoursForAPI = {}
      Object.keys(workingHours).forEach(day => {
        const dayData = workingHours[day]
        if (dayData.available && dayData.timeSlots.length > 0) {
          workingHoursForAPI[day] = {
            available: true,
            timeSlots: dayData.timeSlots.map(slot => ({
              start: slot.start,
              end: slot.end
            }))
          }
        } else {
          workingHoursForAPI[day] = {
            available: false,
            timeSlots: []
          }
        }
      })
      
      // Save to appropriate endpoint based on user type
      if (user?.teamMemberId) {
        // Workers: use team member availability endpoint (pass object so backend stringifies once)
        const availabilityData = {
          workingHours: workingHoursForAPI,
          customAvailability: []
        }
        await teamAPI.updateAvailability(user.teamMemberId, availabilityData)
      } else {
        // Account owners/managers: use user availability endpoint
        // Convert to businessHours format for user availability
        const businessHours = {}
        Object.keys(workingHoursForAPI).forEach(day => {
          const dayData = workingHoursForAPI[day]
          if (dayData.available && dayData.timeSlots.length > 0) {
            // Take the first time slot for business hours format
            const firstSlot = dayData.timeSlots[0]
            businessHours[day] = {
              enabled: true,
              start: firstSlot.start,
              end: firstSlot.end
            }
          } else {
            businessHours[day] = {
              enabled: false,
              start: '09:00',
              end: '17:00'
            }
          }
        })
        
        await availabilityAPI.updateAvailability({
          userId: user.id,
          businessHours: businessHours,
          timeslotTemplates: []
        })
      }
      
      setShowEditWeeklyHoursModal(false)
      setMessage({ type: 'success', text: 'Weekly hours saved successfully!' })
      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
      
      // Reload availability data
      await loadAvailabilityData()
      await loadWorkingHours()
    } catch (error) {
      console.error('Error saving weekly hours:', error)
      setMessage({ type: 'error', text: 'Failed to save weekly hours' })
    } finally {
      setSavingWeeklyHours(false)
    }
  }
  
  // Add time slot to a day
  const handleAddTimeSlot = (day) => {
    setWorkingHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        timeSlots: [
          ...(prev[day]?.timeSlots || []),
          {
            id: Date.now(),
            start: '09:00',
            end: '18:00'
          }
        ]
      }
    }))
  }
  
  // Remove time slot from a day
  const handleRemoveTimeSlot = (day, slotId) => {
    setWorkingHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        timeSlots: (prev[day]?.timeSlots || []).filter(slot => slot.id !== slotId)
      }
    }))
  }
  
  // Update time slot
  const handleTimeSlotChange = (day, slotId, field, value) => {
    setWorkingHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        timeSlots: (prev[day]?.timeSlots || []).map(slot =>
          slot.id === slotId ? { ...slot, [field]: value } : slot
        )
      }
    }))
  }
  
  const toggleDayAvailability = async (date) => {
    if (saving) return
    
    try {
      setSaving(true)
      const current = availabilityData[date] || { available: false, timeRange: null, allDay: true }
      
      // Determine new state - toggle availability
      const willBeAvailable = !current.available
      
      // If toggling to available and no timeRange exists, get default from working hours
      let timeRange = current.timeRange
      if (willBeAvailable && !timeRange) {
        // Get day of week for this date (parse YYYY-MM-DD format manually to avoid timezone issues)
        const [year, month, day] = date.split('-').map(Number)
        const dateObj = new Date(year, month - 1, day) // month is 0-indexed
        const dayOfWeek = dateObj.getDay()
        const dayName = dayNamesLower[dayOfWeek]
        
        // Try to get from workingHours state first
        const dayWorkingHours = workingHours[dayName]
        
        // Use working hours if available, otherwise default to 9 AM - 6 PM
        if (dayWorkingHours?.available && dayWorkingHours.timeSlots?.length > 0) {
          const firstSlot = dayWorkingHours.timeSlots[0]
          timeRange = { start: firstSlot.start, end: firstSlot.end }
        } else {
          // Default time range when toggling to available
          timeRange = { start: '09:00', end: '18:00' }
        }
      }
      
      const newState = {
        available: willBeAvailable,
        timeRange: willBeAvailable ? timeRange : null,
        allDay: !willBeAvailable || !timeRange
      }
      
      setAvailabilityData(prev => ({
        ...prev,
        [date]: newState
      }))
      
      // Save to API - for workers, use team member availability endpoint
      // Otherwise, use the user availability endpoint
      try {
        if (user?.teamMemberId) {
          // Workers: get current availability, update customAvailability, then save
          const currentAvailability = await teamAPI.getAvailability(user.teamMemberId)
          let availData = currentAvailability?.availability
          
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
          
          // Update or add custom availability for the date
          const existingIndex = availData.customAvailability.findIndex(item => item.date === date)
          
          if (newState.available && newState.timeRange) {
            const customItem = {
              date: date,
              available: true,
              hours: [{
                start: newState.timeRange.start,
                end: newState.timeRange.end
              }]
            }
            
            if (existingIndex >= 0) {
              availData.customAvailability[existingIndex] = customItem
            } else {
              availData.customAvailability.push(customItem)
            }
          } else {
            // Mark as unavailable
            const customItem = {
              date: date,
              available: false
            }
            
            if (existingIndex >= 0) {
              availData.customAvailability[existingIndex] = customItem
            } else {
              availData.customAvailability.push(customItem)
            }
          }
          
          // Save using teamAPI (pass object so backend stringifies once)
          await teamAPI.updateAvailability(user.teamMemberId, availData)
        } else {
          // Account owners/managers: use user availability endpoint
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
  
  // Get user's team member data for display
  const getUserInitials = () => {
    const firstName = user?.firstName || user?.first_name || ''
    const lastName = user?.lastName || user?.last_name || ''
    if (firstName && lastName) {
      return (firstName[0] + lastName[0]).toUpperCase()
    }
    if (firstName) {
      return firstName.substring(0, 2).toUpperCase()
    }
    return (user?.email?.[0] || 'U').toUpperCase()
  }
  
  const getUserDisplayName = () => {
    const firstName = user?.firstName || user?.first_name || ''
    const lastName = user?.lastName || user?.last_name || ''
    if (firstName || lastName) {
      return `${firstName} ${lastName}`.trim()
    }
    return user?.email || 'User'
  }
  
  // Check if user is worker - after all hooks
  if (!user || !isWorker(user)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
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
    <>
      <div className="min-h-screen bg-gray-50 pb-24 lg:pb-0">
        {/* Mobile Header */}
        <MobileHeader pageTitle="My Availability" />
        
        {/* Desktop Header */}
        <div className="hidden lg:block bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="px-4 py-4">
            <div className="flex items-center justify-between">
              {/* Profile Icon */}
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <span className="text-blue-600 font-semibold text-sm">
                  {getUserInitials()}
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

        {/* Weekly Hours Section - Same as Desktop */}
        <div className="px-4 py-4 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-gray-900">Regular Schedule</h3>
              <p className="text-sm text-gray-600 mt-1">
                Set your weekly availability. This applies to all weeks unless overridden by a specific date.
              </p>
            </div>
            <button
              onClick={() => setShowEditWeeklyHoursModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              Edit Weekly Hours
            </button>
          </div>
          
          {/* Weekly Hours Preview */}
          <div className="space-y-2">
            {dayNamesLower.map((day, index) => {
              const dayData = workingHours[day] || { available: false, timeSlots: [] }
              const dayName = dayNamesFull[index]
              
              return (
                <div key={day} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${dayData.available ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    <span className="text-sm font-medium text-gray-900 capitalize">{day}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {dayData.available && dayData.timeSlots.length > 0 ? (
                      dayData.timeSlots.map((slot, slotIndex) => (
                        <span key={slotIndex}>
                          {slotIndex > 0 && ', '}
                          {formatTime(slot.start)} - {formatTime(slot.end)}
                        </span>
                      ))
                    ) : (
                      'Unavailable'
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Calendar Section */}
        <div className="px-4 py-4">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-gray-900">One-Time Dates</h3>
            <p className="text-sm text-gray-600 mt-1">
              Override your regular schedule for specific dates (vacations, birthdays, part of day, etc.)
            </p>
          </div>
        </div>

        {/* Availability List */}
        <div className="px-4 py-4 space-y-3">
          {daysInMonth.map((day) => {
            const dayData = availabilityData[day.fullDate] || { available: false, timeRange: null, allDay: true }
            const isAvailable = dayData.available
            const timeRange = dayData.timeRange
            const isAllDay = dayData.allDay || !timeRange
            const isSelected = selectedDay?.fullDate === day.fullDate
            
            return (
              <div
                key={day.fullDate}
                onClick={(e) => handleDayClick(day, e)}
                className={`bg-white rounded-lg border-2 p-4 flex items-center justify-between cursor-pointer transition-colors ${
                  isSelected ? 'border-blue-500' : 'border-gray-200'
                }`}
              >
                <div className="flex items-center space-x-3 flex-1">
                  {/* Checkbox-like circle */}
                  <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                    isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                  }`}>
                    {isSelected && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                  
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
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleDayAvailability(day.fullDate)
                  }}
                  disabled={saving}
                  className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                >
                  <RotateCw className="w-5 h-5" />
                </button>
              </div>
            )
          })}
        </div>
        
        {/* Bottom Modal - shown when date is selected */}
        {selectedDay && (
          <div className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-end justify-center"
            onClick={() => setSelectedDay(null)}
          >
            <div 
              className="bg-white rounded-t-2xl w-full max-w-full"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {dayNamesFull[selectedDay.dayOfWeek]}, {monthNames[currentMonth]} {selectedDay.date}
                </h3>
                <button
                  onClick={() => setSelectedDay(null)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
              
              {/* Modal Actions */}
              <div className="px-6 py-4 space-y-3">
                <button
                  onClick={() => handleEditDayOfWeek(selectedDay)}
                  className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <RotateCw className="w-5 h-5 text-gray-600" />
                    <span className="text-base font-medium text-gray-900">
                      Edit {dayNamesFull[selectedDay.dayOfWeek]}s
                    </span>
                  </div>
                </button>
                
                <button
                  onClick={() => handleEditSingleDate(selectedDay)}
                  className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <Calendar className="w-5 h-5 text-gray-600" />
                    <span className="text-base font-medium text-gray-900">
                      Edit 1 Date
                    </span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Edit Weekly Hours Modal */}
      {showEditWeeklyHoursModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-end justify-center lg:items-center">
          <div className="bg-white rounded-t-2xl lg:rounded-2xl w-full lg:w-[600px] max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <button
                onClick={() => setShowEditWeeklyHoursModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
              
              <h2 className="text-lg font-semibold text-gray-900">Edit Weekly Hours</h2>
              
              <button
                onClick={handleSaveWeeklyHours}
                disabled={savingWeeklyHours}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingWeeklyHours ? 'Saving...' : 'Save'}
              </button>
            </div>
            
            {/* Service/User Identifier */}
            <div className="px-6 py-3 border-b border-gray-200 flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <span className="text-blue-600 font-semibold text-xs">
                  {getUserInitials()}
                </span>
              </div>
              <span className="text-sm text-gray-700">{getUserDisplayName()}</span>
            </div>
            
            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                {dayNamesLower.map((day, index) => {
                  const dayData = workingHours[day] || { available: false, timeSlots: [] }
                  
                  return (
                    <div key={day} className="space-y-2">
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={dayData.available}
                          onChange={(e) => {
                            setWorkingHours(prev => ({
                              ...prev,
                              [day]: {
                                ...prev[day],
                                available: e.target.checked,
                                timeSlots: e.target.checked && prev[day]?.timeSlots.length === 0
                                  ? [{ id: Date.now(), start: '09:00', end: '18:00' }]
                                  : prev[day]?.timeSlots || []
                              }
                            }))
                          }}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                        />
                        <span className="text-sm font-medium text-gray-900 capitalize">
                          {day}
                        </span>
                      </div>
                      
                      {dayData.available && (
                        <div className="ml-7 space-y-2">
                          {dayData.timeSlots.length === 0 ? (
                            <button
                              onClick={() => handleAddTimeSlot(day)}
                              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                            >
                              + Add Hours
                            </button>
                          ) : (
                            <>
                              {dayData.timeSlots.map((slot, slotIndex) => (
                                <div key={slot.id} className="flex items-center space-x-2">
                                  <select
                                    value={slot.start}
                                    onChange={(e) => handleTimeSlotChange(day, slot.id, 'start', e.target.value)}
                                    className="text-sm border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  >
                                    {timeOptions.map(opt => (
                                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                  </select>
                                  <span className="text-sm text-gray-500">-</span>
                                  <select
                                    value={slot.end}
                                    onChange={(e) => handleTimeSlotChange(day, slot.id, 'end', e.target.value)}
                                    className="text-sm border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  >
                                    {timeOptions.map(opt => (
                                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                  </select>
                                  <button
                                    onClick={() => handleRemoveTimeSlot(day, slot.id)}
                                    className="p-1 text-red-600 hover:text-red-700 transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                  {slotIndex === dayData.timeSlots.length - 1 && (
                                    <button
                                      onClick={() => handleAddTimeSlot(day)}
                                      className="text-sm text-blue-600 hover:text-blue-700 font-medium px-2"
                                    >
                                      + Add More
                                    </button>
                                  )}
                                </div>
                              ))}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default WorkerAvailability
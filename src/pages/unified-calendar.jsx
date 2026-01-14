"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { ChevronLeft, ChevronRight, Calendar, CalendarDays, Clock, Users, Filter, Edit, X, Check, AlertCircle, List, Grid, Phone, Mail, DollarSign } from "lucide-react"
import { teamAPI, jobsAPI, leadsAPI } from "../services/api"
import { useAuth } from "../context/AuthContext"
import { getImageUrl } from "../utils/imageUtils"
import TaskCard from "../components/task-card"
import CreateTaskModal from "../components/create-task-modal"
import MobileHeader from "../components/mobile-header"

const UnifiedCalendar = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  
  // View mode: 'worker-availability' | 'tasks-list' | 'tasks-calendar'
  const [viewMode, setViewMode] = useState('tasks-list')
  // Calendar view: 'month' | 'week' | 'day'
  const [calendarView, setCalendarView] = useState('month')
  const [loading, setLoading] = useState(true)
  const [teamMembers, setTeamMembers] = useState([])
  const [selectedTeamMemberId, setSelectedTeamMemberId] = useState(null) // Single selected team member
  const [availabilityData, setAvailabilityData] = useState({})
  const [assignedJobs, setAssignedJobs] = useState([]) // Jobs assigned to selected team member
  const [tasks, setTasks] = useState([])
  const [leads, setLeads] = useState([])
  const [showCalendarPicker, setShowCalendarPicker] = useState(false)
  const calendarPickerRef = useRef(null)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedMember, setSelectedMember] = useState(null)
  const [selectedDate, setSelectedDate] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingAvailability, setEditingAvailability] = useState(null)
  const [saving, setSaving] = useState(false)
  const [filterStatus, setFilterStatus] = useState("all")
  const [taskFilter, setTaskFilter] = useState('all') // Default to 'all' tasks
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [selectedTask, setSelectedTask] = useState(null)
  const [showTaskDetails, setShowTaskDetails] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  const currentMonth = currentDate.getMonth()
  const currentYear = currentDate.getFullYear()

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                     'July', 'August', 'September', 'October', 'November', 'December']
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const dayNamesFull = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1)
    const lastDay = new Date(currentYear, currentMonth + 1, 0)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())
    
    const days = []
    const currentDate = new Date(startDate)
    
    for (let i = 0; i < 42; i++) {
      days.push({
        date: new Date(currentDate),
        isCurrentMonth: currentDate.getMonth() === currentMonth,
        isToday: currentDate.toDateString() === new Date().toDateString()
      })
      currentDate.setDate(currentDate.getDate() + 1)
    }
    
    return days
  }, [currentMonth, currentYear])

  // Helper to convert time string to minutes since midnight
  const timeToMinutes = (timeStr) => {
    if (!timeStr) return 0
    const [hours, minutes] = timeStr.split(':').map(Number)
    return hours * 60 + minutes
  }

  // Helper to convert minutes since midnight to time string
  const minutesToTime = (minutes) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
  }


  // Helper to convert 12-hour to 24-hour format
  const convertTo24Hour = (hour, minute, ampm) => {
    let h = parseInt(hour)
    if (ampm === 'PM' && h !== 12) h += 12
    if (ampm === 'AM' && h === 12) h = 0
    return `${h.toString().padStart(2, '0')}:${minute.padStart(2, '0')}`
  }

  // Fetch team members
  const fetchTeamMembers = useCallback(async () => {
    if (!user?.id) return
    
    try {
      setLoading(true)
      const response = await teamAPI.getAll(user.id, {
        status: filterStatus === "all" ? "" : filterStatus,
        page: 1,
        limit: 100
      })
      
      const members = response.teamMembers || response || []
      setTeamMembers(members)
      
      // Default to showing all team members (selectedTeamMemberId stays null)
    } catch (error) {
      console.error('Error fetching team members:', error)
      setMessage({ type: 'error', text: 'Failed to load team members' })
    } finally {
      setLoading(false)
    }
  }, [user?.id, filterStatus])

  // Fetch jobs and availability for a specific team member
  const fetchMemberData = useCallback(async (memberId) => {
    if (!user?.id || !memberId) return
    
    try {
      setLoading(true)
      const startDate = new Date(currentYear, currentMonth, 1).toISOString().split('T')[0]
      const endDate = new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0]
      
      // Fetch jobs assigned to this member
      let jobs = []
      try {
        const jobsResponse = await jobsAPI.getAll(
          user.id, '', '', 1, 1000, '', `${startDate},${endDate}`, 'scheduled_date', 'ASC',
          memberId.toString(), '', '', '', '', null
        )
        jobs = jobsResponse.jobs || jobsResponse || []
        setAssignedJobs(jobs)
      } catch (jobError) {
        console.error('Error fetching jobs:', jobError)
        setAssignedJobs([])
        // Continue even if jobs fail
      }
      
      // Fetch availability for this team member
      // First check if availability is already in the team member object
      let availability = null
      const member = teamMembers.find(m => m.id === memberId)
      
      if (member?.availability) {
        // Use availability from team member object (from team_members.availability column)
        console.log('📅 Using availability from team member object for member:', memberId)
        console.log('📅 Raw availability type:', typeof member.availability)
        console.log('📅 Raw availability value:', member.availability)
        
        let availData = member.availability
        
        // Handle different formats from database JSONB column
        // It might be: string (JSON), object (already parsed), or null
        if (typeof availData === 'string') {
          try {
            availData = JSON.parse(availData)
            console.log('📅 Parsed availability JSON string:', availData)
          } catch (e) {
            console.error('Error parsing availability from member object:', e, 'Raw value:', availData)
            availData = null
          }
        } else if (availData && typeof availData === 'object') {
          // Already an object (JSONB is parsed by Supabase/PostgreSQL)
          console.log('📅 Availability is already an object:', availData)
          // No need to parse, use as-is
        }
        
        // Wrap in the expected format: { availability: {...} }
        availability = { availability: availData }
      } else {
        console.log('📅 No availability in member object, fetching from API for member:', memberId)
        // If not in member object, fetch from API
      try {
        availability = await teamAPI.getAvailability(memberId, startDate, endDate)
      } catch (availError) {
        console.error('Error fetching availability:', availError)
        // Continue with empty availability
        availability = { availability: null }
        }
      }
      
      // Process availability data - even if null, we still want to show jobs
      const processedData = {}
      
      // Check if team member has any availability configured
      const hasAvailabilityConfigured = availability?.availability !== null && availability?.availability !== undefined
      
      // Always create day data structure, even if availability is null
      const firstDay = new Date(currentYear, currentMonth, 1)
      const lastDay = new Date(currentYear, currentMonth + 1, 0)
      const startDateObj = new Date(firstDay)
      startDateObj.setDate(startDateObj.getDate() - firstDay.getDay())
      
      const currentDate = new Date(startDateObj)
      for (let i = 0; i < 42; i++) {
        if (currentDate.getMonth() === currentMonth) {
          const dateStr = currentDate.toISOString().split('T')[0]
          processedData[dateStr] = {
            available: false, // Default to false, will be set to true only if availability is configured and day is available
            hours: null,
            hasAvailabilityConfigured: hasAvailabilityConfigured // Track if availability is configured at all
          }
        }
        currentDate.setDate(currentDate.getDate() + 1)
      }
      
      if (availability?.availability) {
        let availData = availability.availability
        
        // Handle different formats from database JSONB column
        // Supabase/PostgreSQL returns JSONB as objects, but might be string in some cases
        if (typeof availData === 'string') {
          try {
            availData = JSON.parse(availData)
            console.log('📅 Parsed availability string to object:', availData)
          } catch (e) {
            console.error('Error parsing availability string:', e, 'Raw value:', availData)
            availData = null
          }
        }
        
        // If availData is null or invalid, skip processing
        if (!availData || typeof availData !== 'object') {
          console.warn('📅 Invalid availability data:', availData)
          availData = null
        }
        
        // Extract workingHours and customAvailability from the parsed data
        // Structure: { workingHours: {...}, customAvailability: [...] }
        // Note: workingHours might be at root level or nested
        const workingHours = availData?.workingHours || (availData && !availData.customAvailability ? availData : {})
        const customAvailability = Array.isArray(availData?.customAvailability) ? availData.customAvailability : []
        
        console.log('📅 Extracted availability structure:', {
          hasWorkingHours: !!workingHours,
          workingHoursKeys: workingHours ? Object.keys(workingHours) : [],
          customAvailabilityCount: customAvailability.length,
          sampleWorkingHours: workingHours?.monday || workingHours?.Monday
        })
        
        // Helper to parse hours string like "9:00 AM - 5:00 PM" to time slots
        const parseHoursString = (hoursStr) => {
          if (!hoursStr || typeof hoursStr !== 'string') return []
          
          // Try to match formats like "9:00 AM - 5:00 PM" or "09:00 - 17:00"
          const hoursMatch = hoursStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?\s*-\s*(\d{1,2}):(\d{2})\s*(AM|PM)?/i)
          if (hoursMatch) {
            let startHour = parseInt(hoursMatch[1])
            const startMin = hoursMatch[2]
            let endHour = parseInt(hoursMatch[4])
            const endMin = hoursMatch[5]
            
            // Convert to 24-hour format if AM/PM is present
            if (hoursMatch[3]) {
              const period = hoursMatch[3].toUpperCase()
              if (period === 'PM' && startHour !== 12) startHour += 12
              if (period === 'AM' && startHour === 12) startHour = 0
            }
            if (hoursMatch[6]) {
              const period = hoursMatch[6].toUpperCase()
              if (period === 'PM' && endHour !== 12) endHour += 12
              if (period === 'AM' && endHour === 12) endHour = 0
            }
            
            return [{
              start: `${startHour.toString().padStart(2, '0')}:${startMin}`,
              end: `${endHour.toString().padStart(2, '0')}:${endMin}`
            }]
          }
          return []
        }
        
        // Update processedData with actual availability
        Object.keys(processedData).forEach(dateStr => {
          // Parse date string to avoid timezone issues
          const [year, month, day] = dateStr.split('-').map(Number)
          const date = new Date(year, month - 1, day) // month is 0-indexed in JS
          const dayOfWeek = date.getDay() // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
          // Map to lowercase day name matching availability format: 'sunday', 'monday', etc.
          const dayName = dayNamesFull[dayOfWeek].toLowerCase()
          const dayNameCapitalized = dayNamesFull[dayOfWeek] // "Monday", "Tuesday", etc.
          
          const dateOverride = customAvailability.find(item => item.date === dateStr)
          // Try both lowercase and capitalized day names (database might use either)
          const dayWorkingHours = workingHours[dayName] || workingHours[dayNameCapitalized] || workingHours[dayName.charAt(0).toUpperCase() + dayName.slice(1)]
          
          console.log(`📅 Processing ${dateStr} (${dayName}):`, {
            hasDateOverride: !!dateOverride,
            hasWorkingHours: !!dayWorkingHours,
            dayWorkingHoursAvailable: dayWorkingHours?.available,
            dayWorkingHoursHours: dayWorkingHours?.hours,
            dayWorkingHoursTimeSlots: dayWorkingHours?.timeSlots?.length
          })
          
          let dayData = {
            available: false,
            hours: null,
            assignedJobs: [],
            hasAvailabilityConfigured: hasAvailabilityConfigured
          }
          
          if (dateOverride) {
            // Handle custom availability override
            if (dateOverride.available === false) {
              dayData.available = false
              dayData.hours = null
            } else if (dateOverride.available === true) {
              dayData.available = true
            if (dateOverride.hours) {
                if (typeof dateOverride.hours === 'string') {
                  // Handle formats like "09:00-19:00" or "Unavailable"
                  if (dateOverride.hours.toLowerCase() === 'unavailable' || dateOverride.hours.trim() === '') {
                    dayData.available = false
                    dayData.hours = null
                  } else {
                    // Parse time range like "09:00-19:00"
                    const timeRangeMatch = dateOverride.hours.match(/(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})/)
                    if (timeRangeMatch) {
                      dayData.hours = [{
                        start: `${timeRangeMatch[1].padStart(2, '0')}:${timeRangeMatch[2]}`,
                        end: `${timeRangeMatch[3].padStart(2, '0')}:${timeRangeMatch[4]}`
                      }]
                    } else {
                      // Try parsing as "9:00 AM - 6:00 PM" format
                      dayData.hours = parseHoursString(dateOverride.hours)
                    }
                  }
                } else if (Array.isArray(dateOverride.hours)) {
                dayData.hours = dateOverride.hours.map(slot => {
                  if (typeof slot === 'string') {
                    const parsed = parseHoursString(slot)
                    return parsed.length > 0 ? parsed[0] : null
                  }
                  return slot
                }).filter(Boolean)
              } else {
                dayData.hours = [dateOverride.hours]
                }
              }
            }
          } else {
            // No date override, use working hours for the day
            // Check both 'enabled' and 'available' properties (database uses 'enabled')
            const isDayEnabled = dayWorkingHours?.enabled === true || dayWorkingHours?.available === true
            
            if (dayWorkingHours && isDayEnabled) {
              dayData.available = true
              if (dayWorkingHours.timeSlots && Array.isArray(dayWorkingHours.timeSlots) && dayWorkingHours.timeSlots.length > 0) {
                // Already in time slot format - filter enabled slots
                const enabledSlots = dayWorkingHours.timeSlots.filter(slot => slot.enabled !== false)
                if (enabledSlots.length > 0) {
                  dayData.hours = enabledSlots.map(slot => ({
                    start: slot.start,
                    end: slot.end
                  }))
                } else {
                  // All slots disabled, but day is marked enabled - show as available without hours
                  dayData.hours = []
                }
              } else if (dayWorkingHours.hours && typeof dayWorkingHours.hours === 'string' && dayWorkingHours.hours.trim() !== '') {
                // Parse hours string format like "9:00 AM - 6:00 PM"
                dayData.hours = parseHoursString(dayWorkingHours.hours)
              } else {
                // Enabled but no hours specified - show as available without hours
                dayData.available = true
                dayData.hours = []
              }
              
              console.log(`📅 ${dateStr} set to available:`, {
                available: dayData.available,
                hoursCount: dayData.hours?.length || 0,
                hours: dayData.hours,
                dayEnabled: isDayEnabled
              })
            } else {
              // Day is explicitly disabled (enabled: false) or not configured
              dayData.available = false
              dayData.hours = null
              console.log(`📅 ${dateStr} set to unavailable:`, {
                hasDayWorkingHours: !!dayWorkingHours,
                enabledValue: dayWorkingHours?.enabled,
                availableValue: dayWorkingHours?.available
              })
            }
          }
          
          // Add jobs for this date
          const dayJobs = jobs.filter(job => {
            if (!job.scheduled_date && !job.scheduledDate) return false
            let jobDate
            if (typeof job.scheduled_date === 'string' && job.scheduled_date.includes(' ')) {
              const [datePart] = job.scheduled_date.split(' ')
              jobDate = new Date(datePart)
            } else {
              jobDate = new Date(job.scheduled_date || job.scheduledDate)
            }
            return jobDate.toISOString().split('T')[0] === dateStr
          })
          
          dayData.assignedJobs = dayJobs
          
          // Subtract job times from availability hours
          // If they have jobs, they're not available during those times
          if (dayJobs.length > 0 && dayData.hours && dayData.hours.length > 0) {
            // Get job time ranges in minutes
            const jobTimeRanges = dayJobs.map(job => {
              let jobStartTime = null
              let jobDuration = 0
              
              // Parse job scheduled time
              if (job.scheduled_date && typeof job.scheduled_date === 'string') {
                if (job.scheduled_date.includes(' ')) {
                  const [datePart, timePart] = job.scheduled_date.split(' ')
                  const [hours, minutes] = timePart.split(':').map(Number)
                  jobStartTime = hours * 60 + minutes
                } else {
                  const jobDate = new Date(job.scheduled_date)
                  jobStartTime = jobDate.getHours() * 60 + jobDate.getMinutes()
                }
              }
              
              // Get job duration in minutes
              jobDuration = job.duration || job.service_duration || job.estimated_duration || 60 // default 1 hour
              if (typeof jobDuration === 'string') {
                jobDuration = parseInt(jobDuration) || 60
              }
              
              if (jobStartTime !== null) {
                return {
                  start: jobStartTime,
                  end: jobStartTime + jobDuration
                }
              }
              return null
            }).filter(Boolean)
            
            // Subtract job times from availability hours
            let remainingHours = []
            dayData.hours.forEach(availSlot => {
              const availStart = timeToMinutes(availSlot.start)
              const availEnd = timeToMinutes(availSlot.end)
              
              // Find gaps between jobs within this availability slot
              let currentStart = availStart
              
              // Sort job time ranges by start time
              const sortedJobRanges = jobTimeRanges
                .filter(jobRange => 
                  jobRange.start < availEnd && jobRange.end > availStart
                )
                .sort((a, b) => a.start - b.start)
              
              sortedJobRanges.forEach(jobRange => {
                // If there's a gap before this job, add it
                if (currentStart < jobRange.start) {
                  remainingHours.push({
                    start: minutesToTime(currentStart),
                    end: minutesToTime(jobRange.start)
                  })
                }
                // Move current start to after this job
                currentStart = Math.max(currentStart, jobRange.end)
              })
              
              // If there's remaining time after all jobs, add it
              if (currentStart < availEnd) {
                remainingHours.push({
                  start: minutesToTime(currentStart),
                  end: minutesToTime(availEnd)
                })
              }
            })
            
            // Update availability hours to show only remaining time
            if (remainingHours.length > 0) {
              dayData.hours = remainingHours
            } else {
              // All availability is covered by jobs - mark as unavailable
              dayData.available = false
              dayData.hours = null
            }
          }
          
          processedData[dateStr] = dayData
        })
      } else if (!hasAvailabilityConfigured) {
        // No availability configured - apply default: Monday-Friday 8:00 AM - 6:00 PM
        // All days get the default availability (no unavailable days)
        Object.keys(processedData).forEach(dateStr => {
          // Get jobs for this date
          const dayJobs = jobs.filter(job => {
            if (!job.scheduled_date && !job.scheduledDate) return false
            let jobDate
            if (typeof job.scheduled_date === 'string' && job.scheduled_date.includes(' ')) {
              const [datePart] = job.scheduled_date.split(' ')
              jobDate = new Date(datePart)
            } else {
              jobDate = new Date(job.scheduled_date || job.scheduledDate)
            }
            return jobDate.toISOString().split('T')[0] === dateStr
          })
          
          // Default: All days are available 8:00 AM - 6:00 PM
          // (Monday-Friday are the primary work days, but weekends also get default hours)
          let defaultHours = [{ start: '08:00', end: '18:00' }]
          let isAvailable = true
          
          // Subtract job times from default availability
          if (dayJobs.length > 0) {
            // Get job time ranges in minutes
            const jobTimeRanges = dayJobs.map(job => {
              let jobStartTime = null
              let jobDuration = 0
              
              // Parse job scheduled time
              if (job.scheduled_date && typeof job.scheduled_date === 'string') {
                if (job.scheduled_date.includes(' ')) {
                  const [datePart, timePart] = job.scheduled_date.split(' ')
                  const [hours, minutes] = timePart.split(':').map(Number)
                  jobStartTime = hours * 60 + minutes
                } else {
                  const jobDate = new Date(job.scheduled_date)
                  jobStartTime = jobDate.getHours() * 60 + jobDate.getMinutes()
                }
              }
              
              // Get job duration in minutes
              jobDuration = job.duration || job.service_duration || job.estimated_duration || 60 // default 1 hour
              if (typeof jobDuration === 'string') {
                jobDuration = parseInt(jobDuration) || 60
              }
              
              if (jobStartTime !== null) {
                return {
                  start: jobStartTime,
                  end: jobStartTime + jobDuration
                }
              }
              return null
            }).filter(Boolean)
            
            // Subtract job times from default availability hours
            let remainingHours = []
            defaultHours.forEach(availSlot => {
              const availStart = timeToMinutes(availSlot.start)
              const availEnd = timeToMinutes(availSlot.end)
              
              // Find gaps between jobs within this availability slot
              let currentStart = availStart
              
              // Sort job time ranges by start time
              const sortedJobRanges = jobTimeRanges
                .filter(jobRange => 
                  jobRange.start < availEnd && jobRange.end > availStart
                )
                .sort((a, b) => a.start - b.start)
              
              sortedJobRanges.forEach(jobRange => {
                // If there's a gap before this job, add it as available time
                if (currentStart < jobRange.start) {
                  remainingHours.push({
                    start: minutesToTime(currentStart),
                    end: minutesToTime(jobRange.start)
                  })
                }
                // Move current start to after this job
                currentStart = Math.max(currentStart, jobRange.end)
              })
              
              // If there's remaining time after all jobs, add it
              if (currentStart < availEnd) {
                remainingHours.push({
                  start: minutesToTime(currentStart),
                  end: minutesToTime(availEnd)
                })
              }
            })
            
            // Update availability hours to show only remaining time (when not working)
            if (remainingHours.length > 0) {
              defaultHours = remainingHours
            } else {
              // All availability is covered by jobs - they're fully booked, mark as unavailable
              isAvailable = false
              defaultHours = null
            }
          }
          
          processedData[dateStr] = {
            available: isAvailable,
            hours: defaultHours,
            assignedJobs: dayJobs,
            hasAvailabilityConfigured: false // Still marked as not configured (using defaults)
          }
        })
      }
      
      // Always set availability data (even if empty/default)
      // Use 'user' as key for account owner, memberId for team members
      setAvailabilityData({ [memberId]: processedData })
    } catch (error) {
      console.error('Error fetching member data:', error)
      const errorMessage = error.response?.data?.error || error.message || 'Failed to load team member data'
      // Only show error if it's a critical error, not if it's just availability
      if (errorMessage.includes('Team member not found') || errorMessage.includes('Failed to fetch')) {
        setMessage({ type: 'error', text: errorMessage })
        setTimeout(() => setMessage({ type: '', text: '' }), 5000)
      }
      // Still set empty data so UI doesn't break - jobs might still load
      // Jobs are already set above, so we don't need to reset them here
      // Set default availability so calendar still renders
      // If availability fetch failed or returned null, apply default availability
      const defaultData = {}
      const firstDay = new Date(currentYear, currentMonth, 1)
      const startDateObj = new Date(firstDay)
      startDateObj.setDate(startDateObj.getDate() - firstDay.getDay())
      const currentDate = new Date(startDateObj)
      for (let i = 0; i < 42; i++) {
        if (currentDate.getMonth() === currentMonth) {
          const dateStr = currentDate.toISOString().split('T')[0]
          // Apply default availability: All days 8:00 AM - 6:00 PM
          defaultData[dateStr] = { 
            available: true, 
            hours: [{ start: '08:00', end: '18:00' }],
            hasAvailabilityConfigured: false // Mark as not configured (using defaults)
          }
        }
        currentDate.setDate(currentDate.getDate() + 1)
      }
      setAvailabilityData({ [memberId]: defaultData })
    } finally {
      setLoading(false)
    }
  }, [user?.id, currentYear, currentMonth, teamMembers])

  // Fetch tasks
  const fetchTasks = useCallback(async () => {
    if (!user?.id) {
      setLoading(false)
      return
    }
    
    try {
      // Only set loading to true if we're in tasks view
      if (viewMode === 'tasks-list' || viewMode === 'tasks-calendar') {
        setLoading(true)
      }
      const params = {}
      if (taskFilter === 'overdue') {
        params.overdue = 'true'
      } else if (taskFilter !== 'all') {
        params.status = taskFilter
      }
      
      const data = await leadsAPI.getAllTasks(params)
      setTasks(data || [])
      setMessage({ type: '', text: '' }) // Clear any previous errors
    } catch (error) {
      console.error('Error fetching tasks:', error)
      
      // Check for specific backend routing error
      const errorDetails = error.response?.data
      if (errorDetails?.message?.includes('invalid input syntax for type integer')) {
        // Backend routing issue - the /leads/tasks endpoint is being matched by /leads/:id
        console.error('Backend routing error: /leads/tasks endpoint not properly configured')
        setMessage({ 
          type: 'error', 
          text: 'Tasks endpoint configuration error. Please contact support.' 
        })
      } else {
        // Provide a more user-friendly error message
        let errorMessage = 'Failed to load tasks'
        if (error.response?.data?.error) {
          const apiError = error.response.data.error
          // If the API returns a generic "Failed to fetch lead" error, make it task-specific
          if (apiError.includes('Failed to fetch') || apiError.includes('lead')) {
            errorMessage = 'Failed to load tasks. Please try again.'
          } else {
            errorMessage = apiError
          }
        } else if (error.response?.status === 500) {
          errorMessage = 'Server error loading tasks. Please try again later.'
        } else if (error.message) {
          // Handle network errors
          if (error.message.includes('Network') || error.message.includes('fetch')) {
            errorMessage = 'Network error. Please check your connection and try again.'
          } else {
            errorMessage = error.message
          }
        }
        setMessage({ type: 'error', text: errorMessage })
      }
      setTasks([]) // Set empty array on error
    } finally {
      // Only set loading to false if we're in tasks view
      if (viewMode === 'tasks-list' || viewMode === 'tasks-calendar') {
        setLoading(false)
      }
    }
  }, [user?.id, taskFilter, viewMode])

  // OLD - Not used anymore, keeping for reference
  const _fetchAllAvailability_OLD = async (members) => {
    if (!members || members.length === 0) return
    
    const startDate = new Date(currentYear, currentMonth, 1).toISOString().split('T')[0]
    const endDate = new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0]
    
    const availabilityPromises = members.map(async (member) => {
      try {
        // Use availability from team member object if available, otherwise fetch it
        let availability = null
        if (member.availability) {
          console.log(`📅 Processing availability for member ${member.id}, type:`, typeof member.availability)
          let availData = member.availability
          
          // Handle different formats from database JSONB column
          // It might be: string (JSON), object (already parsed), or null
          if (typeof availData === 'string') {
            try {
              availData = JSON.parse(availData)
              console.log(`📅 Parsed availability JSON string for member ${member.id}:`, availData)
            } catch (e) {
              console.error(`Error parsing availability for member ${member.id}:`, e, 'Raw value:', availData)
              availData = null
            }
          } else if (availData && typeof availData === 'object') {
            // Already an object (JSONB is parsed by Supabase/PostgreSQL)
            console.log(`📅 Availability is already an object for member ${member.id}:`, availData)
            // No need to parse, use as-is
          }
          
          // Return in the same format as the API endpoint
          availability = { availability: availData }
        } else {
          // If not in member object, fetch from API
          availability = await teamAPI.getAvailability(member.id, startDate, endDate)
        }
        
        // Fetch jobs assigned to this team member for the month
        let assignedJobs = []
        try {
          const jobsResponse = await jobsAPI.getAll(
            user.id, '', '', 1, 1000, '', `${startDate},${endDate}`, 'scheduled_date', 'ASC',
            member.id.toString(), '', '', '', '', null
          )
          assignedJobs = jobsResponse.jobs || jobsResponse || []
          console.log(`📅 Fetched ${assignedJobs.length} jobs for member ${member.id}`)
        } catch (jobError) {
          console.error(`Error fetching jobs for member ${member.id}:`, jobError)
          assignedJobs = []
        }
        
        return { memberId: member.id, availability, assignedJobs }
      } catch (error) {
        console.error(`Error fetching availability for member ${member.id}:`, error)
        return { memberId: member.id, availability: null, assignedJobs: [] }
      }
    })
    
    const results = await Promise.all(availabilityPromises)
    
    const processedData = {}
    results.forEach(({ memberId, availability, assignedJobs }) => {
      processedData[memberId] = {}
      
      // Check if team member has any availability configured
      const hasAvailabilityConfigured = availability?.availability !== null && availability?.availability !== undefined
      
      if (availability?.availability) {
        let availData = availability.availability
        if (typeof availData === 'string') {
          try {
            availData = JSON.parse(availData)
          } catch (e) {
            console.error('Error parsing availability:', e)
          }
        }
        
        // Extract workingHours and customAvailability from the parsed data
        // Structure: { workingHours: {...}, customAvailability: [...] }
        // Note: workingHours might be at root level or nested
        const workingHours = availData?.workingHours || (availData && !availData.customAvailability ? availData : {})
        const customAvailability = Array.isArray(availData?.customAvailability) ? availData.customAvailability : []
        
        console.log('📅 Extracted availability structure (all members):', {
          hasWorkingHours: !!workingHours,
          workingHoursKeys: workingHours ? Object.keys(workingHours) : [],
          customAvailabilityCount: customAvailability.length,
          sampleWorkingHours: workingHours?.monday || workingHours?.Monday
        })
        
        // Helper to parse hours string like "9:00 AM - 5:00 PM" to time slots
        const parseHoursString = (hoursStr) => {
          if (!hoursStr || typeof hoursStr !== 'string') return []
          
          // Try to match formats like "9:00 AM - 5:00 PM" or "09:00 - 17:00"
          const hoursMatch = hoursStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?\s*-\s*(\d{1,2}):(\d{2})\s*(AM|PM)?/i)
          if (hoursMatch) {
            let startHour = parseInt(hoursMatch[1])
            const startMin = hoursMatch[2]
            let endHour = parseInt(hoursMatch[4])
            const endMin = hoursMatch[5]
            
            // Convert to 24-hour format if AM/PM is present
            if (hoursMatch[3]) {
              const period = hoursMatch[3].toUpperCase()
              if (period === 'PM' && startHour !== 12) startHour += 12
              if (period === 'AM' && startHour === 12) startHour = 0
            }
            if (hoursMatch[6]) {
              const period = hoursMatch[6].toUpperCase()
              if (period === 'PM' && endHour !== 12) endHour += 12
              if (period === 'AM' && endHour === 12) endHour = 0
            }
            
            return [{
              start: `${startHour.toString().padStart(2, '0')}:${startMin}`,
              end: `${endHour.toString().padStart(2, '0')}:${endMin}`
            }]
          }
          return []
        }
        
        calendarDays.forEach(({ date }) => {
          if (!date.isCurrentMonth) return
          
          const dateStr = date.date.toISOString().split('T')[0]
          // Parse date components to avoid timezone issues
          const [year, month, day] = dateStr.split('-').map(Number)
          const dateObj = new Date(year, month - 1, day) // month is 0-indexed in JS
          const dayOfWeek = dateObj.getDay() // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
          // Map to lowercase day name matching availability format: 'sunday', 'monday', etc.
          const dayName = dayNamesFull[dayOfWeek].toLowerCase()
          const dayNameCapitalized = dayNamesFull[dayOfWeek] // "Monday", "Tuesday", etc.
          
          const dateOverride = customAvailability.find(item => item.date === dateStr)
          // Try both lowercase and capitalized day names (database might use either)
          const dayWorkingHours = workingHours[dayName] || workingHours[dayNameCapitalized] || workingHours[dayName.charAt(0).toUpperCase() + dayName.slice(1)]
          
          let dayData = {
            available: false,
            hours: null,
            assignedJobs: [],
            hasAvailabilityConfigured: hasAvailabilityConfigured
          }
          
          let baseHours = []
          if (dateOverride) {
            // Handle custom availability override
            if (dateOverride.available === false) {
              dayData.available = false
            } else if (dateOverride.available === true) {
              dayData.available = true
              if (dateOverride.hours) {
                if (typeof dateOverride.hours === 'string') {
                  // Handle formats like "09:00-19:00" or "Unavailable"
                  if (dateOverride.hours.toLowerCase() === 'unavailable' || dateOverride.hours.trim() === '') {
                    dayData.available = false
                  } else {
                    // Parse time range like "09:00-19:00"
                    const timeRangeMatch = dateOverride.hours.match(/(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})/)
                    if (timeRangeMatch) {
                      baseHours = [{
                        start: `${timeRangeMatch[1].padStart(2, '0')}:${timeRangeMatch[2]}`,
                        end: `${timeRangeMatch[3].padStart(2, '0')}:${timeRangeMatch[4]}`
                      }]
                    } else {
                      // Try parsing as "9:00 AM - 6:00 PM" format
                      baseHours = parseHoursString(dateOverride.hours)
                    }
                  }
                } else if (Array.isArray(dateOverride.hours)) {
                baseHours = dateOverride.hours.map(slot => {
                  if (typeof slot === 'string') {
                    const parsed = parseHoursString(slot)
                    return parsed.length > 0 ? parsed[0] : null
                  }
                  return slot
                }).filter(Boolean)
              } else {
                baseHours = [dateOverride.hours]
                }
              }
            }
          } else {
            // No date override, use working hours for the day
            // Check both 'enabled' and 'available' properties (database uses 'enabled')
            const isDayEnabled = dayWorkingHours?.enabled === true || dayWorkingHours?.available === true
            
            if (dayWorkingHours && isDayEnabled) {
              dayData.available = true
              if (dayWorkingHours.timeSlots && Array.isArray(dayWorkingHours.timeSlots) && dayWorkingHours.timeSlots.length > 0) {
                // Already in time slot format - filter enabled slots
                const enabledSlots = dayWorkingHours.timeSlots.filter(slot => slot.enabled !== false)
                if (enabledSlots.length > 0) {
                  baseHours = enabledSlots.map(slot => ({
                    start: slot.start,
                    end: slot.end
                  }))
                } else {
                  // All slots disabled, but day is marked enabled - show as available without hours
                  baseHours = []
                }
              } else if (dayWorkingHours.hours && typeof dayWorkingHours.hours === 'string' && dayWorkingHours.hours.trim() !== '') {
                // Parse hours string format like "9:00 AM - 6:00 PM"
                baseHours = parseHoursString(dayWorkingHours.hours)
              } else {
                // Enabled but no hours specified - show as available without hours
                baseHours = []
              }
            } else {
              // Day is explicitly disabled (enabled: false) or not configured
              dayData.available = false
              baseHours = []
            }
          }
          
          // Set hasAvailabilityConfigured flag
          dayData.hasAvailabilityConfigured = hasAvailabilityConfigured
          
          dayData.hours = baseHours
          
          // Add jobs for this date
          const dayJobs = assignedJobs.filter(job => {
            if (!job.scheduled_date && !job.scheduledDate) return false
            let jobDate
            if (typeof job.scheduled_date === 'string' && job.scheduled_date.includes(' ')) {
              const [datePart] = job.scheduled_date.split(' ')
              jobDate = new Date(datePart)
            } else {
              jobDate = new Date(job.scheduled_date || job.scheduledDate)
            }
            return jobDate.toISOString().split('T')[0] === dateStr
          })
          
          dayData.assignedJobs = dayJobs
          
          // Subtract job times from availability hours
          // Days with jobs should show only the times they're NOT working
          if (dayJobs.length > 0 && dayData.hours && dayData.hours.length > 0) {
            // Get job time ranges in minutes
            const jobTimeRanges = dayJobs.map(job => {
              let jobStartTime = null
              let jobDuration = 0
              
              // Parse job scheduled time
              if (job.scheduled_date && typeof job.scheduled_date === 'string') {
                if (job.scheduled_date.includes(' ')) {
                  const [datePart, timePart] = job.scheduled_date.split(' ')
                  const [hours, minutes] = timePart.split(':').map(Number)
                  jobStartTime = hours * 60 + minutes
                } else {
                  const jobDate = new Date(job.scheduled_date)
                  jobStartTime = jobDate.getHours() * 60 + jobDate.getMinutes()
                }
              }
              
              // Get job duration in minutes
              jobDuration = job.duration || job.service_duration || job.estimated_duration || 60 // default 1 hour
              if (typeof jobDuration === 'string') {
                jobDuration = parseInt(jobDuration) || 60
              }
              
              if (jobStartTime !== null) {
                return {
                  start: jobStartTime,
                  end: jobStartTime + jobDuration
                }
              }
              return null
            }).filter(Boolean)
            
            // Subtract job times from availability hours
            let remainingHours = []
            dayData.hours.forEach(availSlot => {
              const availStart = timeToMinutes(availSlot.start)
              const availEnd = timeToMinutes(availSlot.end)
              
              // Find gaps between jobs within this availability slot
              let currentStart = availStart
              
              // Sort job time ranges by start time
              const sortedJobRanges = jobTimeRanges
                .filter(jobRange => 
                  jobRange.start < availEnd && jobRange.end > availStart
                )
                .sort((a, b) => a.start - b.start)
              
              sortedJobRanges.forEach(jobRange => {
                // If there's a gap before this job, add it as available time
                if (currentStart < jobRange.start) {
                  remainingHours.push({
                    start: minutesToTime(currentStart),
                    end: minutesToTime(jobRange.start)
                  })
                }
                // Move current start to after this job
                currentStart = Math.max(currentStart, jobRange.end)
              })
              
              // If there's remaining time after all jobs, add it
              if (currentStart < availEnd) {
                remainingHours.push({
                  start: minutesToTime(currentStart),
                  end: minutesToTime(availEnd)
                })
              }
            })
            
            // Update availability hours to show only remaining time (when not working)
            if (remainingHours.length > 0) {
              dayData.hours = remainingHours
            } else {
              // All availability is covered by jobs - they're fully booked, mark as unavailable
              dayData.available = false
              dayData.hours = null
            }
          }
          
          processedData[memberId][dateStr] = dayData
        })
      } else if (!hasAvailabilityConfigured) {
        // No availability configured - apply default: Monday-Friday 8:00 AM - 6:00 PM
        // All days get the default availability (no unavailable days)
        calendarDays.forEach(({ date }) => {
          if (!date.isCurrentMonth) return
          
          const dateStr = date.date.toISOString().split('T')[0]
          
          const dayJobs = assignedJobs.filter(job => {
            if (!job.scheduled_date && !job.scheduledDate) return false
            let jobDate
            if (typeof job.scheduled_date === 'string' && job.scheduled_date.includes(' ')) {
              const [datePart] = job.scheduled_date.split(' ')
              jobDate = new Date(datePart)
            } else {
              jobDate = new Date(job.scheduled_date || job.scheduledDate)
            }
            return jobDate.toISOString().split('T')[0] === dateStr
          })
          
          // Default: All days are available 8:00 AM - 6:00 PM
          // (Monday-Friday are the primary work days, but weekends also get default hours)
          let defaultHours = [{ start: '08:00', end: '18:00' }]
          let isAvailable = true
          
          // Subtract job times from default availability
          if (dayJobs.length > 0) {
            // Get job time ranges in minutes
            const jobTimeRanges = dayJobs.map(job => {
              let jobStartTime = null
              let jobDuration = 0
              
              // Parse job scheduled time
              if (job.scheduled_date && typeof job.scheduled_date === 'string') {
                if (job.scheduled_date.includes(' ')) {
                  const [datePart, timePart] = job.scheduled_date.split(' ')
                  const [hours, minutes] = timePart.split(':').map(Number)
                  jobStartTime = hours * 60 + minutes
                } else {
                  const jobDate = new Date(job.scheduled_date)
                  jobStartTime = jobDate.getHours() * 60 + jobDate.getMinutes()
                }
              }
              
              // Get job duration in minutes
              jobDuration = job.duration || job.service_duration || job.estimated_duration || 60 // default 1 hour
              if (typeof jobDuration === 'string') {
                jobDuration = parseInt(jobDuration) || 60
              }
              
              if (jobStartTime !== null) {
                return {
                  start: jobStartTime,
                  end: jobStartTime + jobDuration
                }
              }
              return null
            }).filter(Boolean)
            
            // Subtract job times from default availability hours
            let remainingHours = []
            defaultHours.forEach(availSlot => {
              const availStart = timeToMinutes(availSlot.start)
              const availEnd = timeToMinutes(availSlot.end)
              
              // Find gaps between jobs within this availability slot
              let currentStart = availStart
              
              // Sort job time ranges by start time
              const sortedJobRanges = jobTimeRanges
                .filter(jobRange => 
                  jobRange.start < availEnd && jobRange.end > availStart
                )
                .sort((a, b) => a.start - b.start)
              
              sortedJobRanges.forEach(jobRange => {
                // If there's a gap before this job, add it as available time
                if (currentStart < jobRange.start) {
                  remainingHours.push({
                    start: minutesToTime(currentStart),
                    end: minutesToTime(jobRange.start)
                  })
                }
                // Move current start to after this job
                currentStart = Math.max(currentStart, jobRange.end)
              })
              
              // If there's remaining time after all jobs, add it
              if (currentStart < availEnd) {
                remainingHours.push({
                  start: minutesToTime(currentStart),
                  end: minutesToTime(availEnd)
                })
              }
            })
            
            // Update availability hours to show only remaining time (when not working)
            if (remainingHours.length > 0) {
              defaultHours = remainingHours
            } else {
              // All availability is covered by jobs - they're fully booked, mark as unavailable
              isAvailable = false
              defaultHours = null
            }
          }
          
          processedData[memberId][dateStr] = {
            available: isAvailable,
            hours: defaultHours,
            assignedJobs: dayJobs,
            hasAvailabilityConfigured: false // Still marked as not configured (using defaults)
          }
        })
      }
    })
    
    setAvailabilityData(processedData)
  }

  // Fetch leads
  const fetchLeads = useCallback(async () => {
    if (!user?.id) return
    
    try {
      const data = await leadsAPI.getAll()
      setLeads(data || [])
    } catch (err) {
      console.error('Error loading leads:', err)
    }
  }, [user?.id])

  // Fetch team members and tasks
  useEffect(() => {
    // Always fetch team members and tasks for tasks view
    fetchTeamMembers()
    fetchTasks()
    fetchLeads() // Fetch leads for task creation
  }, [viewMode, fetchTeamMembers, fetchTasks, fetchLeads])

  // Refetch tasks when team member filter or task filter changes
  useEffect(() => {
    if (viewMode === 'tasks-list' || viewMode === 'tasks-calendar') {
      fetchTasks()
    }
  }, [selectedTeamMemberId, taskFilter, viewMode, fetchTasks])

  // No longer needed - availability view removed

  // Close calendar picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (calendarPickerRef.current && !calendarPickerRef.current.contains(event.target)) {
        setShowCalendarPicker(false)
      }
    }

    if (showCalendarPicker) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showCalendarPicker])

  const handlePreviousMonth = () => {
    if (calendarView === 'day') {
      const newDate = new Date(currentDate)
      newDate.setDate(newDate.getDate() - 1)
      setCurrentDate(newDate)
    } else if (calendarView === 'week') {
      const newDate = new Date(currentDate)
      newDate.setDate(newDate.getDate() - 7)
      setCurrentDate(newDate)
    } else {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1))
    }
  }

  const handleNextMonth = () => {
    if (calendarView === 'day') {
      const newDate = new Date(currentDate)
      newDate.setDate(newDate.getDate() + 1)
      setCurrentDate(newDate)
    } else if (calendarView === 'week') {
      const newDate = new Date(currentDate)
      newDate.setDate(newDate.getDate() + 7)
      setCurrentDate(newDate)
    } else {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1))
    }
  }

  const getWeekStartDate = () => {
    const date = new Date(currentDate)
    const day = date.getDay()
    const diff = date.getDate() - day + (day === 0 ? -6 : 1) // Adjust when day is Sunday
    return new Date(date.setDate(diff))
  }

  const getWeekDates = () => {
    const start = getWeekStartDate()
    const dates = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(start)
      date.setDate(start.getDate() + i)
      dates.push(date)
    }
    return dates
  }

  const generateCalendarPickerDays = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())
    
    const days = []
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + i)
      days.push(date)
    }
    return days
  }

  const handleCalendarDateChange = (newDate) => {
    setCurrentDate(newDate)
    setShowCalendarPicker(false)
  }

  const handleDayClick = (day, member) => {
    setSelectedDate(day.date)
    setSelectedMember(member)
    const dateStr = day.date.toISOString().split('T')[0]
    const memberAvailability = availabilityData[member.id]?.[dateStr] || { available: false, hours: null, assignedJobs: [] }
    setEditingAvailability({
      date: dateStr,
      available: memberAvailability.available,
      hours: memberAvailability.hours || []
    })
    setShowEditModal(true)
  }

  const handleSaveAvailability = async () => {
    if (!selectedMember || !editingAvailability) return
    
    try {
      setSaving(true)
      
      const currentAvailability = await teamAPI.getAvailability(selectedMember.id)
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
      
      const existingIndex = availData.customAvailability.findIndex(item => item.date === editingAvailability.date)
      
      if (editingAvailability.available && editingAvailability.hours && editingAvailability.hours.length > 0) {
        const customItem = {
          date: editingAvailability.date,
          available: true,
          hours: editingAvailability.hours
        }
        
        if (existingIndex >= 0) {
          availData.customAvailability[existingIndex] = customItem
        } else {
          availData.customAvailability.push(customItem)
        }
      } else {
        const customItem = {
          date: editingAvailability.date,
          available: false
        }
        
        if (existingIndex >= 0) {
          availData.customAvailability[existingIndex] = customItem
        } else {
          availData.customAvailability.push(customItem)
        }
      }
      
      await teamAPI.updateAvailability(selectedMember.id, JSON.stringify(availData))
      
      setMessage({ type: 'success', text: 'Availability updated successfully!' })
      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
      
      await fetchTeamMembers()
      setShowEditModal(false)
    } catch (error) {
      console.error('Error saving availability:', error)
      setMessage({ type: 'error', text: 'Failed to save availability' })
    } finally {
      setSaving(false)
    }
  }

  const getMemberColor = (memberId) => {
    const member = teamMembers.find(m => m.id === memberId)
    return member?.color || '#3B82F6'
  }

  const getMemberInitials = (member) => {
    const firstName = member?.first_name || ''
    const lastName = member?.last_name || ''
    if (firstName && lastName) {
      return (firstName[0] + lastName[0]).toUpperCase()
    }
    if (firstName) {
      return firstName.substring(0, 2).toUpperCase()
    }
    return 'TM'
  }

  const formatTime = (time) => {
    if (!time) return ''
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours, 10)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }

  const getAvailabilityDisplay = (memberId, dateStr) => {
    const memberData = availabilityData[memberId]?.[dateStr]
    if (!memberData) return { status: 'unknown', text: 'No data' }
    
    // Only show unavailable if explicitly set to false AND availability is configured
    // If using defaults (hasAvailabilityConfigured: false), show the default hours
    if (!memberData.available && memberData.hasAvailabilityConfigured) {
      return { status: 'unavailable', text: 'Unavailable' }
    }
    
    if (memberData.hours && memberData.hours.length > 0) {
      const firstSlot = memberData.hours[0]
      return { 
        status: 'available', 
        text: `${formatTime(firstSlot.start)} - ${formatTime(firstSlot.end)}` 
      }
    }
    
    return { status: 'available', text: 'Available' }
  }

  // Get tasks for a specific date (timezone-safe)
  const getTasksForDate = (date) => {
    // Get date string in local timezone (YYYY-MM-DD)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${day}`
    
    // Use filtered tasks (already filtered by team member and status)
    const filtered = getFilteredTasks()
    return filtered.filter(task => {
      if (!task.due_date) return false
      
      // Parse task due_date in local timezone to avoid timezone shifts
      const taskDateObj = new Date(task.due_date)
      // Check if date is valid
      if (isNaN(taskDateObj.getTime())) return false
      
      // Get date string in local timezone
      const taskYear = taskDateObj.getFullYear()
      const taskMonth = String(taskDateObj.getMonth() + 1).padStart(2, '0')
      const taskDay = String(taskDateObj.getDate()).padStart(2, '0')
      const taskDateStr = `${taskYear}-${taskMonth}-${taskDay}`
      
      return taskDateStr === dateStr
    })
  }

  // Helper to check if a task is assigned to a team member
  const isTaskAssignedTo = useCallback((task, teamMemberId) => {
    if (!teamMemberId || teamMemberId === 'all') return true
    
    const targetId = Number(teamMemberId)
    
    // Check assigned_to field
    if (task.assigned_to) {
      const assignedId = typeof task.assigned_to === 'object' && task.assigned_to.id 
        ? Number(task.assigned_to.id)
        : Number(task.assigned_to)
      if (assignedId === targetId) {
        return true
      }
    }
    
    // Check team_members relation (nested object)
    if (task.team_members) {
      let memberId = null
      if (typeof task.team_members === 'object' && task.team_members.id) {
        memberId = Number(task.team_members.id)
      } else if (typeof task.team_members === 'number') {
        memberId = task.team_members
      } else if (typeof task.team_members === 'string') {
        memberId = Number(task.team_members)
      }
      if (memberId === targetId) {
        return true
      }
    }
    
    return false
  }, [])

  // Filter tasks
  const getFilteredTasks = () => {
    let filtered = tasks
    
    // Apply team member filter if one is selected
    if (selectedTeamMemberId && selectedTeamMemberId !== 'all') {
      filtered = filtered.filter(task => isTaskAssignedTo(task, selectedTeamMemberId))
    }
    
    // Apply status filter
    if (taskFilter === 'overdue') {
      const now = new Date()
      filtered = filtered.filter(task => 
        task.due_date && 
        new Date(task.due_date) < now && 
        task.status !== 'completed'
      )
    } else if (taskFilter !== 'all') {
      filtered = filtered.filter(task => task.status === taskFilter)
    }
    
    return filtered
  }

  const handleEditTask = (task) => {
    setEditingTask(task)
    setShowCreateTaskModal(true)
  }

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) {
      return
    }
    
    try {
      await leadsAPI.deleteTask(taskId)
      setMessage({ type: 'success', text: 'Task deleted successfully!' })
      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
      fetchTasks()
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to delete task'
      setMessage({ type: 'error', text: errorMessage })
    }
  }

  const handleTaskStatusChange = async (taskId, newStatus) => {
    try {
      await leadsAPI.updateTask(taskId, { status: newStatus })
      fetchTasks()
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to update task status'
      setMessage({ type: 'error', text: errorMessage })
    }
  }

  // Only show loading spinner on initial load
  if (loading && teamMembers.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading calendar...</p>
        </div>
      </div>
    )
  }

  const handleSelectTeamMember = (memberId) => {
    setSelectedTeamMemberId(memberId)
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar - Always Collapsed */}
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <MobileHeader pageTitle="Tasks" />
        
        {/* View Mode Switcher - Tasks Only */}
        <div className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  setViewMode('tasks-calendar')
                  setCalendarView('month')
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === 'tasks-calendar'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Calendar
              </button>
              <button
                onClick={() => setViewMode('tasks-list')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === 'tasks-list'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                List
              </button>
            </div>
          </div>
        </div>
        
        <div className="flex-1 flex min-w-0">
        {/* Filter Sidebar - Show for Tasks View */}
        {(viewMode === 'tasks-calendar' || viewMode === 'tasks-list') && (
          <div className="hidden lg:flex w-56 bg-white border-r border-gray-200 flex-shrink-0 flex-col h-screen">
            {/* Fixed Header */}
            <div className="p-4 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center justify-between">
                <h2 style={{fontFamily: 'Montserrat', fontWeight: 700}} className="text-2xl font-bold text-gray-900">Filters</h2>
              </div>
            </div>
            
            {/* Scrollable Filter Content */}
            <div className="flex-1 bg-gray-100 overflow-y-auto p-2 scrollbar-hide">
              {/* Tasks Filter - Only show team members with active tasks */}
              <div className="mb-6">
                <h3 className="text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wider">TASKS</h3>
                
                <button
                  onClick={() => handleSelectTeamMember(null)}
                  className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-2 ${
                    selectedTeamMemberId === null
                      ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                      : 'bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span className="truncate">All Tasks</span>
                </button>
                
                {(() => {
                  // Get all active tasks (not completed)
                  const activeTasks = tasks.filter(task => task.status !== 'completed')
                  
                  // Get unique team member IDs who have active tasks
                  const memberIdsWithTasks = new Set()
                  activeTasks.forEach(task => {
                    if (task.assigned_to) {
                      const assignedId = typeof task.assigned_to === 'object' && task.assigned_to.id 
                        ? Number(task.assigned_to.id)
                        : Number(task.assigned_to)
                      if (assignedId) memberIdsWithTasks.add(assignedId)
                    }
                    if (task.team_members) {
                      let memberId = null
                      if (typeof task.team_members === 'object' && task.team_members.id) {
                        memberId = Number(task.team_members.id)
                      } else if (typeof task.team_members === 'number') {
                        memberId = task.team_members
                      } else if (typeof task.team_members === 'string') {
                        memberId = Number(task.team_members)
                      }
                      if (memberId) memberIdsWithTasks.add(memberId)
                    }
                  })
                  
                  // Filter team members to only those with active tasks
                  const membersWithTasks = teamMembers.filter(member => memberIdsWithTasks.has(member.id))
                  
                  return membersWithTasks.map((member) => {
                    const isSelected = selectedTeamMemberId === member.id
                    const memberColor = member.color || '#3B82F6'
                    // Count active tasks for this member
                    const memberTaskCount = activeTasks.filter(task => {
                      if (task.assigned_to) {
                        const assignedId = typeof task.assigned_to === 'object' && task.assigned_to.id 
                          ? Number(task.assigned_to.id)
                          : Number(task.assigned_to)
                        if (assignedId === member.id) return true
                      }
                      if (task.team_members) {
                        let taskMemberId = null
                        if (typeof task.team_members === 'object' && task.team_members.id) {
                          taskMemberId = Number(task.team_members.id)
                        } else if (typeof task.team_members === 'number') {
                          taskMemberId = task.team_members
                        } else if (typeof task.team_members === 'string') {
                          taskMemberId = Number(task.team_members)
                        }
                        if (taskMemberId === member.id) return true
                      }
                      return false
                    }).length
                    
                    return (
                      <button
                        key={member.id}
                        onClick={() => handleSelectTeamMember(member.id)}
                        className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-2 ${
                          isSelected 
                            ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                            : 'bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      >
                        <div 
                          className="w-4 h-4 rounded-full flex-shrink-0"
                          style={{ backgroundColor: memberColor }}
                        />
                        <span className="truncate flex-1 text-left">{member.first_name} {member.last_name}</span>
                        {memberTaskCount > 0 && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                            {memberTaskCount}
                          </span>
                        )}
                      </button>
                    )
                  })
                })()}
                </div>
            </div>
          </div>
        )}

        {/* Calendar Content */}
        <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto scrollbar-hide bg-gray-50">
      {/* Message */}
      {message.text && (
        <div className={`px-4 py-3 ${message.type === 'success' ? 'bg-green-50 border-l-4 border-green-400' : 'bg-red-50 border-l-4 border-red-400'}`}>
          <span className={`text-sm ${message.type === 'success' ? 'text-green-700' : 'text-red-700'}`}>
            {message.text}
          </span>
        </div>
      )}

      {/* Tasks List View */}
      {viewMode === 'tasks-list' && (
        <div className="px-4 py-6 lg:px-6">
          <div className="bg-white rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Tasks</h2>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      setViewMode('tasks-calendar')
                      setCalendarView('month')
                    }}
                    className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors flex items-center space-x-2"
                  >
                    <Calendar className="w-4 h-4" />
                    <span>Calendar View</span>
                  </button>
                  <select
                    value={taskFilter}
                    onChange={(e) => setTaskFilter(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Tasks</option>
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="overdue">Overdue</option>
                  </select>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      console.log('Add Task button clicked')
                      setEditingTask(null)
                      setShowCreateTaskModal(true)
                      console.log('showCreateTaskModal set to:', true)
                    }}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 active:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors cursor-pointer"
                  >
                    + Add Task
                  </button>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              {getFilteredTasks().length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium mb-2">No tasks found</p>
                  <p className="text-sm mb-4">
                    {taskFilter !== 'all' ? `No ${taskFilter} tasks` : 'Get started by creating your first task'}
                  </p>
                  {taskFilter === 'all' && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        console.log('Create Task button clicked')
                        setEditingTask(null)
                        setShowCreateTaskModal(true)
                        console.log('showCreateTaskModal set to:', true)
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 active:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors cursor-pointer"
                    >
                      Create Task
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {getFilteredTasks().map((task) => (
                    <div
                      key={task.id}
                      onClick={() => {
                        setSelectedTask(task)
                        setShowTaskDetails(true)
                      }}
                      className="cursor-pointer"
                    >
                      <TaskCard
                        task={task}
                        onEdit={handleEditTask}
                        onDelete={handleDeleteTask}
                        onStatusChange={handleTaskStatusChange}
                        showLeadInfo={true}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Tasks Calendar View or Availability Calendar */}
          {viewMode === 'tasks-calendar' && (
        <>
              {/* Top Header Bar */}
              <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between">
                  {/* Left - View Switcher and Date Navigation */}
                  <div className="flex items-center space-x-4">
                    {/* Tasks View Switcher (List/Calendar) - Only show in tasks mode */}
                    {viewMode === 'tasks-calendar' && (
                      <div className="flex items-center bg-gray-100 rounded-lg p-1">
                        <button
                          onClick={() => setViewMode('tasks-list')}
                          className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                            viewMode === 'tasks-list'
                              ? 'bg-white text-blue-600 shadow-sm'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          <List className="w-4 h-4 inline mr-1" />
                          List
                        </button>
                        <button
                          onClick={() => {
                            setViewMode('tasks-calendar')
                            setCalendarView('month')
                          }}
                          className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                            viewMode === 'tasks-calendar'
                              ? 'bg-white text-blue-600 shadow-sm'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          <Calendar className="w-4 h-4 inline mr-1" />
                          Calendar
                        </button>
                      </div>
                    )}
                    {/* Calendar View Switcher (Day/Week/Month) */}
                    <div className="flex items-center bg-gray-100 rounded-lg p-1">
                      <button
                        onClick={() => setCalendarView('day')}
                        className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                          calendarView === 'day'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        Day
                      </button>
                      <button
                        onClick={() => setCalendarView('week')}
                        className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                          calendarView === 'week'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        Week
                      </button>
                      <button
                        onClick={() => setCalendarView('month')}
                        className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                          calendarView === 'month'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        Month
                      </button>
                    </div>
                    
                    {/* Date Navigation (Pill Shape) */}
                    <div className="flex items-center space-x-2 relative">
                      <div className="flex items-center bg-gray-200 rounded-full px-3 py-1.5">
              <button
                onClick={handlePreviousMonth}
                          className="p-1 hover:bg-gray-300 rounded-full transition-colors"
              >
                          <ChevronLeft className="w-4 h-4 text-gray-700" />
              </button>
                        <button
                          onClick={() => setShowCalendarPicker(!showCalendarPicker)}
                          className="text-sm font-semibold text-gray-900 mx-3 hover:text-blue-600 transition-colors cursor-pointer min-w-[140px] text-center"
                        >
                          {calendarView === 'day' 
                            ? currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
                            : calendarView === 'week'
                            ? `Week of ${getWeekStartDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                            : `${monthNames[currentMonth]} ${currentYear}`
                          }
                        </button>
                        <button
                          onClick={handleNextMonth}
                          className="p-1 hover:bg-gray-300 rounded-full transition-colors"
                        >
                          <ChevronRight className="w-4 h-4 text-gray-700" />
                        </button>
                      </div>

                      {/* Calendar Picker Popup */}
                      {showCalendarPicker && (
                        <div ref={calendarPickerRef} className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-4 w-72 sm:w-80">
                          <div className="grid grid-cols-7 gap-1">
                            {/* Calendar Header */}
                            <div className="col-span-7 flex items-center justify-between mb-2">
                              <button 
                                onClick={() => {
                                  const newDate = new Date(currentDate)
                                  newDate.setMonth(newDate.getMonth() - 1)
                                  setCurrentDate(newDate)
                                }}
                                className="p-1 hover:bg-gray-100 rounded"
                              >
                                <ChevronLeft className="w-4 h-4" />
                              </button>
                              <span className="text-sm font-medium">
                                {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                              </span>
                              <button 
                                onClick={() => {
                                  const newDate = new Date(currentDate)
                                  newDate.setMonth(newDate.getMonth() + 1)
                                  setCurrentDate(newDate)
                                }}
                                className="p-1 hover:bg-gray-100 rounded"
                              >
                                <ChevronRight className="w-4 h-4" />
                              </button>
                            </div>

                            {/* Day Headers */}
                            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                              <div key={day} className="text-xs font-medium text-gray-500 text-center py-1">
                                {day}
                              </div>
                            ))}

                            {/* Calendar Days */}
                            {generateCalendarPickerDays().map((day, index) => {
                              const isCurrentMonth = day.getMonth() === currentDate.getMonth()
                              const isSelected = day.toDateString() === currentDate.toDateString()
                              const isToday = day.toDateString() === new Date().toDateString()
                              
                              return (
              <button
                                  key={index}
                                  onClick={() => handleCalendarDateChange(day)}
                                  className={`text-xs p-2 rounded hover:bg-gray-100 transition-colors ${
                                    isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                                  } ${
                                    isSelected ? 'bg-blue-600 text-white hover:bg-blue-700' : ''
                                  } ${
                                    isToday && !isSelected ? 'bg-blue-50 text-blue-600' : ''
                                  }`}
                                >
                                  {day.getDate()}
              </button>
                              )
                            })}
                          </div>
                        </div>
                      )}
            </div>
          </div>

                  {/* Right - Actions */}
                  <div className="flex items-center space-x-2">
                    {viewMode === 'tasks-calendar' || viewMode === 'tasks-list' ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          console.log('Add Task button (header) clicked')
                          setEditingTask(null)
                          setShowCreateTaskModal(true)
                          console.log('showCreateTaskModal set to:', true)
                        }}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 active:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors cursor-pointer"
                      >
                        <span>+ Add Task</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => navigate('/schedule')}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                        title="Open Schedule"
                      >
                        <Calendar className="w-4 h-4" />
                        <span>Schedule</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

          {/* Day View */}
          {calendarView === 'day' && (
            <div className="px-4 py-4 lg:px-6">
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="border-b border-gray-200 p-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {(selectedDate || currentDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                  </h3>
                </div>
                <div className="p-4">
                  {(() => {
                    const dateToShow = selectedDate || currentDate
                    const tasksForDate = getTasksForDate(dateToShow)
                    
                    if (tasksForDate.length === 0) {
                      return (
                        <div className="text-center py-8">
                          <div className="text-gray-500 text-lg font-medium">No tasks for this date</div>
                        </div>
                      )
                    }
                    
                    return (
                      <div className="space-y-3">
                        {tasksForDate.map((task) => (
                          <div
                            key={task.id}
                            onClick={() => {
                              setSelectedTask(task)
                              setShowTaskDetails(true)
                            }}
                            className="cursor-pointer"
                          >
                            <TaskCard
                              task={task}
                              onEdit={handleEditTask}
                              onDelete={handleDeleteTask}
                              onStatusChange={handleTaskStatusChange}
                              showLeadInfo={true}
                            />
                          </div>
                        ))}
                      </div>
                    )
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* Week View */}
          {calendarView === 'week' && (
            <div className="px-4 py-4 lg:px-6 overflow-x-auto">
              <div className="min-w-max w-full">
                {/* Day Headers */}
                <div className="grid grid-cols-7 gap-2 mb-2">
                  {getWeekDates().map((date, idx) => (
                    <div key={idx} className="p-2 text-center">
                      <div className="text-xs font-medium text-gray-500">
                        {dayNames[date.getDay()]}
                      </div>
                      <div className={`text-lg font-semibold mt-1 ${
                        date.toDateString() === new Date().toDateString()
                          ? 'text-blue-600'
                          : 'text-gray-900'
                      }`}>
                        {date.getDate()}
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Week Days */}
                <div className="grid grid-cols-7 gap-2">
                  {getWeekDates().map((date, idx) => {
                    const tasksForDate = getTasksForDate(date)
                    const isToday = date.toDateString() === new Date().toDateString()
                    const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString()
                    
                    return (
                      <div
                        key={idx}
                        className={`border rounded-lg p-3 min-h-[200px] cursor-pointer transition-colors ${
                          isToday
                            ? 'bg-white border-blue-500 ring-2 ring-blue-500'
                            : isSelected
                            ? 'bg-blue-50 border-blue-300'
                            : 'bg-white border-gray-200 hover:bg-gray-50'
                        }`}
                        onClick={() => {
                          setSelectedDate(date)
                          setCurrentDate(date)
                        }}
                      >
                        <div className="space-y-1">
                          {tasksForDate.length === 0 ? (
                            <div className="text-center py-4">
                              <div className="text-xs text-gray-400">No tasks</div>
                            </div>
                          ) : (
                            tasksForDate.map((task) => (
                              <div
                                key={task.id}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedTask(task)
                                  setShowTaskDetails(true)
                                }}
                                className={`px-2 py-1 rounded text-xs border cursor-pointer hover:opacity-80 transition-opacity ${
                                  task.status === 'completed'
                                    ? 'bg-green-100 text-green-800 border-green-200'
                                    : task.priority === 'urgent'
                                    ? 'bg-red-100 text-red-800 border-red-200'
                                    : task.priority === 'high'
                                    ? 'bg-orange-100 text-orange-800 border-orange-200'
                                    : 'bg-blue-100 text-blue-800 border-blue-200'
                                }`}
                              >
                                <div className="truncate font-medium">{task.title}</div>
                                {task.leads && (
                                  <div className="text-xs opacity-75 truncate">
                                    {task.leads.first_name} {task.leads.last_name}
                                  </div>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Month View */}
          {calendarView === 'month' && (
          <div className=" ">
            <div className="grid grid-cols-7">
              {/* Month header */}
              {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
                <div key={day} className="text-center text-xs border-[0.5px] border-gray-200 font-medium text-gray-600 py-3">
                  {day}
                </div>
              ))}
              {/* Month days */}
              {calendarDays.map((day, index) => {
                const dateStr = day.date.toISOString().split('T')[0]
                const isToday = day.date.toDateString() === new Date().toDateString()
                const isCurrentMonth = day.isCurrentMonth
                const isSelected = selectedDate && day.date.toDateString() === selectedDate.toDateString()
                
                return (
                  <div
                    key={index}
                    className={`border p-1 min-h-[100px] cursor-pointer transition-colors ${
                      !isCurrentMonth 
                        ? 'bg-gray-50 text-gray-400 border-gray-100' 
                        : isSelected 
                          ? 'border-blue-500 bg-blue-50' 
                          : isToday 
                            ? 'border-blue-300 bg-blue-50/50' 
                            : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                    onClick={() => {
                      setSelectedDate(day.date)
                      // Update currentDate for day view when a date is clicked
                      if (calendarView === 'day') {
                        setCurrentDate(day.date)
                      }
                    }}
                  >
                    <div className={`text-md text-right right-3 font-medium mb-1 ${
                      isSelected && isCurrentMonth ? 'text-blue-900 font-semibold' : ''
                    }`}>
                      {day.date.getDate()}
                    </div>
                      
                    {/* Tasks Calendar View */}
                    {viewMode === 'tasks-calendar' && (
                      <div className="space-y-1">
                        {getTasksForDate(day.date).map((task) => (
                          <div
                            key={task.id}
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedTask(task)
                              setShowTaskDetails(true)
                            }}
                            className={`px-2 py-1 rounded text-xs border cursor-pointer hover:opacity-80 transition-opacity ${
                              task.status === 'completed'
                                ? 'bg-green-100 text-green-800 border-green-200'
                                : task.priority === 'urgent'
                                ? 'bg-red-100 text-red-800 border-red-200'
                                : task.priority === 'high'
                                ? 'bg-orange-100 text-orange-800 border-orange-200'
                                : 'bg-blue-100 text-blue-800 border-blue-200'
                            }`}
                          >
                            <div className="truncate font-medium">{task.title}</div>
                            {task.leads && (
                              <div className="text-xs opacity-75 truncate">
                                {task.leads.first_name} {task.leads.last_name}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    
                  </div>
                )
              })}
            </div>
          </div>
        )}
        </>
      )}
        </div>
        </div>
      </div>
      
      {/* Edit Availability Modal */}
      {showEditModal && selectedMember && editingAvailability && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-end justify-center lg:items-center">
          <div className="bg-white rounded-t-2xl lg:rounded-2xl w-full lg:w-[600px] max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center space-x-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                  style={{ backgroundColor: getMemberColor(selectedMember.id) }}
                >
                  {getMemberInitials(selectedMember)}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {selectedMember.first_name} {selectedMember.last_name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {new Date(editingAvailability.date).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                {/* Available Toggle */}
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={editingAvailability.available}
                    onChange={(e) => setEditingAvailability({
                      ...editingAvailability,
                      available: e.target.checked,
                      hours: e.target.checked && (!editingAvailability.hours || editingAvailability.hours.length === 0)
                        ? [{ start: '09:00', end: '17:00' }]
                        : editingAvailability.hours
                    })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                  />
                  <label className="text-sm font-medium text-gray-900">Available on this date</label>
                </div>
                
                {/* Time Slots */}
                {editingAvailability.available && (
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-900">Working Hours</label>
                    {editingAvailability.hours && editingAvailability.hours.length > 0 ? (
                      editingAvailability.hours.map((slot, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <input
                            type="time"
                            value={slot.start}
                            onChange={(e) => {
                              const newHours = [...editingAvailability.hours]
                              newHours[index] = { ...slot, start: e.target.value }
                              setEditingAvailability({ ...editingAvailability, hours: newHours })
                            }}
                            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <span className="text-gray-500">to</span>
                          <input
                            type="time"
                            value={slot.end}
                            onChange={(e) => {
                              const newHours = [...editingAvailability.hours]
                              newHours[index] = { ...slot, end: e.target.value }
                              setEditingAvailability({ ...editingAvailability, hours: newHours })
                            }}
                            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          {editingAvailability.hours.length > 1 && (
                            <button
                              onClick={() => {
                                const newHours = editingAvailability.hours.filter((_, i) => i !== index)
                                setEditingAvailability({ ...editingAvailability, hours: newHours })
                              }}
                              className="p-2 text-red-600 hover:text-red-700"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))
                    ) : (
                      <button
                        onClick={() => setEditingAvailability({
                          ...editingAvailability,
                          hours: [{ start: '09:00', end: '17:00' }]
                        })}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        + Add Hours
                      </button>
                    )}
                    
                    {editingAvailability.hours && editingAvailability.hours.length > 0 && (
                      <button
                        onClick={() => setEditingAvailability({
                          ...editingAvailability,
                          hours: [...editingAvailability.hours, { start: '09:00', end: '17:00' }]
                        })}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        + Add Another Time Slot
                      </button>
                    )}
                  </div>
                )}

              </div>
            </div>
            
            {/* Footer */}
            <div className="flex items-center justify-end space-x-3 px-6 py-4 border-t border-gray-200 flex-shrink-0">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAvailability}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Details Modal */}
      {showTaskDetails && selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{selectedTask.title}</h3>
                <button
                  onClick={() => {
                    setShowTaskDetails(false)
                    setSelectedTask(null)
                  }}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                {selectedTask.description && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Description</h4>
                    <p className="text-sm text-gray-900">{selectedTask.description}</p>
                  </div>
                )}
                {selectedTask.due_date && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Due Date</h4>
                    <p className="text-sm text-gray-900">
                      {new Date(selectedTask.due_date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                )}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Status</h4>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                    selectedTask.status === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : selectedTask.status === 'in_progress'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {selectedTask.status === 'completed' ? 'Completed' :
                     selectedTask.status === 'in_progress' ? 'In Progress' :
                     'Pending'}
                  </span>
                </div>
                {selectedTask.priority && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Priority</h4>
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                      selectedTask.priority === 'urgent'
                        ? 'bg-red-100 text-red-800'
                        : selectedTask.priority === 'high'
                        ? 'bg-orange-100 text-orange-800'
                        : selectedTask.priority === 'medium'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {selectedTask.priority.charAt(0).toUpperCase() + selectedTask.priority.slice(1)}
                    </span>
                  </div>
                )}
                {selectedTask.leads && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Related Lead</h4>
                    <p className="text-sm text-gray-900">
                      {selectedTask.leads.first_name} {selectedTask.leads.last_name}
                    </p>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowTaskDetails(false)
                    setEditingTask(selectedTask)
                    setShowCreateTaskModal(true)
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Edit Task
                </button>
                <button
                  onClick={() => {
                    setShowTaskDetails(false)
                    setSelectedTask(null)
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Task Modal */}
      <CreateTaskModal
        isOpen={showCreateTaskModal}
          onClose={() => {
            setShowCreateTaskModal(false)
            setEditingTask(null)
          }}
          onSubmit={async (taskData) => {
            try {
              if (editingTask) {
                // Update existing task
                await leadsAPI.updateTask(editingTask.id, {
                  title: taskData.title,
                  description: taskData.description,
                  dueDate: taskData.dueDate,
                  priority: taskData.priority,
                  assignedTo: taskData.assignedTo,
                  status: taskData.status
                })
                setMessage({ type: 'success', text: 'Task updated successfully!' })
              } else {
                // Create new task - leadId is optional
                const taskLeadId = taskData.leadId || null
                
                if (taskLeadId) {
                  // Create task with selected lead
                  await leadsAPI.createTask(taskLeadId, {
                    title: taskData.title,
                    description: taskData.description,
                    dueDate: taskData.dueDate,
                    priority: taskData.priority,
                    assignedTo: taskData.assignedTo ? Number(taskData.assignedTo) : null,
                    status: taskData.status
                  })
                } else {
                  // Create task without lead - create a placeholder lead first
                  try {
                    // Get pipeline to get first stage
                    const pipeline = await leadsAPI.getPipeline()
                    const firstStageId = pipeline?.stages?.[0]?.id
                    
                    if (!firstStageId) {
                      setMessage({ type: 'error', text: 'Please set up your pipeline first or assign this task to a lead.' })
                      return
                    }
                    
                    // Create a placeholder lead for the task
                    const placeholderLead = await leadsAPI.create({
                      firstName: 'Task',
                      lastName: 'Placeholder',
                      email: `task-${Date.now()}@placeholder.local`,
                      stageId: firstStageId
                    })
                    
                    // Create task with the placeholder lead
                    await leadsAPI.createTask(placeholderLead.id, {
                      title: taskData.title,
                      description: taskData.description,
                      dueDate: taskData.dueDate,
                      priority: taskData.priority,
                      assignedTo: taskData.assignedTo ? Number(taskData.assignedTo) : null,
                      status: taskData.status
                    })
                    
                    // Refresh leads list
                    fetchLeads()
                  } catch (leadError) {
                    console.error('Error creating placeholder lead:', leadError)
                    setMessage({ type: 'error', text: 'Failed to create task. Please assign it to a lead or set up your pipeline.' })
                    return
                  }
                }
                
                setMessage({ type: 'success', text: 'Task created successfully!' })
              }
              setTimeout(() => setMessage({ type: '', text: '' }), 3000)
              setShowCreateTaskModal(false)
              setEditingTask(null)
              fetchTasks()
            } catch (err) {
              const errorMessage = err.response?.data?.error || err.message || 'Failed to save task'
              setMessage({ type: 'error', text: errorMessage })
            }
          }}
          leadId={editingTask?.lead_id || null}
          teamMembers={teamMembers}
          leads={leads}
          initialData={editingTask}
          initialDate={editingTask ? null : selectedDate}
          isEditing={!!editingTask}
        />
    </div>
  )
}

export default UnifiedCalendar



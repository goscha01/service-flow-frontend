"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { ChevronLeft, ChevronRight, Calendar, Clock, Users, Filter, Edit, X, Check, AlertCircle, List, Grid, Phone, Mail, DollarSign } from "lucide-react"
import { teamAPI, jobsAPI, leadsAPI } from "../services/api"
import { useAuth } from "../context/AuthContext"
import { getImageUrl } from "../utils/imageUtils"
import TaskCard from "../components/task-card"
import CreateTaskModal from "../components/create-task-modal"

const UnifiedCalendar = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  
  // View mode: 'worker-availability' | 'tasks-list' | 'tasks-calendar'
  const [viewMode, setViewMode] = useState('worker-availability')
  const [loading, setLoading] = useState(true)
  const [teamMembers, setTeamMembers] = useState([])
  const [selectedTeamMemberId, setSelectedTeamMemberId] = useState(null) // Selected team member for calendar view
  const [availabilityData, setAvailabilityData] = useState({})
  const [assignedJobs, setAssignedJobs] = useState([]) // Jobs assigned to selected team member
  const [tasks, setTasks] = useState([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedMember, setSelectedMember] = useState(null)
  const [selectedDate, setSelectedDate] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingAvailability, setEditingAvailability] = useState(null)
  const [saving, setSaving] = useState(false)
  const [filterStatus, setFilterStatus] = useState("all")
  const [taskFilter, setTaskFilter] = useState('all')
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
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
      
      // Set default: account owner (null) if no team members, otherwise first team member
      // Don't auto-select if user has already made a selection
      if (selectedTeamMemberId === undefined) {
        if (members.length > 0) {
          const defaultMember = user?.teamMemberId 
            ? members.find(m => m.id === user.teamMemberId) || members[0]
            : members[0]
          setSelectedTeamMemberId(defaultMember.id)
        } else {
          // No team members, default to account owner
          setSelectedTeamMemberId(null)
        }
      }
    } catch (error) {
      console.error('Error fetching team members:', error)
      setMessage({ type: 'error', text: 'Failed to load team members' })
    } finally {
      setLoading(false)
    }
  }, [user?.id, filterStatus])

  // Fetch jobs and availability for a specific team member or account owner
  const fetchMemberData = useCallback(async (memberId) => {
    // memberId can be null for account owner
    if (!user?.id) return
    
    try {
      setLoading(true)
      const startDate = new Date(currentYear, currentMonth, 1).toISOString().split('T')[0]
      const endDate = new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0]
      
      // Fetch jobs assigned to this member (or account owner if memberId is null)
      let jobs = []
      try {
        if (memberId) {
          // Team member - fetch jobs assigned to this member
          const jobsResponse = await jobsAPI.getAll(
            user.id, '', '', 1, 1000, '', `${startDate},${endDate}`, 'scheduled_date', 'ASC',
            memberId.toString(), '', '', '', '', null
          )
          jobs = jobsResponse.jobs || jobsResponse || []
        } else {
          // Account owner - fetch jobs assigned to the user (not to any specific team member)
          const jobsResponse = await jobsAPI.getAll(
            user.id, '', '', 1, 1000, '', `${startDate},${endDate}`, 'scheduled_date', 'ASC',
            '', '', '', '', '', null
          )
          // Filter to only jobs not assigned to any team member (account owner's jobs)
          jobs = (jobsResponse.jobs || jobsResponse || []).filter(job => !job.team_member_id)
        }
        setAssignedJobs(jobs)
      } catch (jobError) {
        console.error('Error fetching jobs:', jobError)
        setAssignedJobs([])
        // Continue even if jobs fail
      }
      
      // Fetch availability
      let availability = null
      try {
        if (memberId) {
          // Team member - fetch team member availability
          availability = await teamAPI.getAvailability(memberId, startDate, endDate)
        } else {
          // Account owner - fetch user availability
          const { userProfileAPI } = await import('../services/api')
          const userAvail = await userProfileAPI.getAvailability(user.id)
          // Convert user availability format to team member format for processing
          if (userAvail?.business_hours) {
            const businessHours = typeof userAvail.business_hours === 'string' 
              ? JSON.parse(userAvail.business_hours) 
              : userAvail.business_hours
            availability = { availability: { workingHours: businessHours, customAvailability: [] } }
          } else {
            availability = { availability: null }
          }
        }
      } catch (availError) {
        console.error('Error fetching availability:', availError)
        // Continue with empty availability
        availability = { availability: null }
      }
      
      // Process availability data - even if null, we still want to show jobs
      const processedData = {}
      
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
            available: true, // Default to available if no data
            hours: null
          }
        }
        currentDate.setDate(currentDate.getDate() + 1)
      }
      
      if (availability?.availability) {
        let availData = availability.availability
        if (typeof availData === 'string') {
          try {
            availData = JSON.parse(availData)
          } catch (e) {
            console.error('Error parsing availability:', e)
          }
        }
        
        const workingHours = availData.workingHours || availData || {}
        const customAvailability = availData.customAvailability || []
        
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
          
          const dateOverride = customAvailability.find(item => item.date === dateStr)
          
          let dayData = {
            available: false,
            hours: null
          }
          
          if (dateOverride) {
            dayData.available = dateOverride.available !== false
            if (dateOverride.hours) {
              if (Array.isArray(dateOverride.hours)) {
                dayData.hours = dateOverride.hours.map(slot => {
                  if (typeof slot === 'string') {
                    // If it's a string, try to parse it
                    const parsed = parseHoursString(slot)
                    return parsed.length > 0 ? parsed[0] : null
                  }
                  return slot
                }).filter(Boolean)
              } else if (typeof dateOverride.hours === 'string') {
                dayData.hours = parseHoursString(dateOverride.hours)
              } else {
                dayData.hours = [dateOverride.hours]
              }
            }
          } else {
            const dayWorkingHours = workingHours[dayName]
            if (dayWorkingHours && dayWorkingHours.available !== false) {
              dayData.available = true
              if (dayWorkingHours.timeSlots && dayWorkingHours.timeSlots.length > 0) {
                // Already in time slot format
                dayData.hours = dayWorkingHours.timeSlots.map(slot => ({
                  start: slot.start,
                  end: slot.end
                }))
              } else if (dayWorkingHours.hours) {
                // Parse hours string format
                dayData.hours = parseHoursString(dayWorkingHours.hours)
              }
            }
          }
          
          processedData[dateStr] = dayData
        })
      }
      
      // Always set availability data (even if empty/default)
      // Use 'user' as key for account owner, memberId for team members
      const dataKey = memberId || 'user'
      setAvailabilityData({ [dataKey]: processedData })
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
      const defaultData = {}
      const firstDay = new Date(currentYear, currentMonth, 1)
      const startDateObj = new Date(firstDay)
      startDateObj.setDate(startDateObj.getDate() - firstDay.getDay())
      const currentDate = new Date(startDateObj)
      for (let i = 0; i < 42; i++) {
        if (currentDate.getMonth() === currentMonth) {
          const dateStr = currentDate.toISOString().split('T')[0]
          defaultData[dateStr] = { available: true, hours: null }
        }
        currentDate.setDate(currentDate.getDate() + 1)
      }
      setAvailabilityData({ [memberId]: defaultData })
    } finally {
      setLoading(false)
    }
  }, [user?.id, currentYear, currentMonth])

  // Fetch tasks
  const fetchTasks = useCallback(async () => {
    if (!user?.id) return
    
    try {
      const params = {}
      if (taskFilter === 'overdue') {
        params.overdue = 'true'
      } else if (taskFilter !== 'all') {
        params.status = taskFilter
      }
      
      const data = await leadsAPI.getAllTasks(params)
      setTasks(data || [])
    } catch (error) {
      console.error('Error fetching tasks:', error)
      setMessage({ type: 'error', text: 'Failed to load tasks' })
    }
  }, [user?.id, taskFilter])

  // OLD - Not used anymore, keeping for reference
  const _fetchAllAvailability_OLD = async (members) => {
    if (!members || members.length === 0) return
    
    const startDate = new Date(currentYear, currentMonth, 1).toISOString().split('T')[0]
    const endDate = new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0]
    
    const availabilityPromises = members.map(async (member) => {
      try {
        const availability = await teamAPI.getAvailability(member.id, startDate, endDate)
        
        return { memberId: member.id, availability, assignedJobs: [] }
      } catch (error) {
        console.error(`Error fetching availability for member ${member.id}:`, error)
        return { memberId: member.id, availability: null, assignedJobs: [] }
      }
    })
    
    const results = await Promise.all(availabilityPromises)
    
    const processedData = {}
    results.forEach(({ memberId, availability, assignedJobs }) => {
      processedData[memberId] = {}
      
      if (availability?.availability) {
        let availData = availability.availability
        if (typeof availData === 'string') {
          try {
            availData = JSON.parse(availData)
          } catch (e) {
            console.error('Error parsing availability:', e)
          }
        }
        
        const workingHours = availData.workingHours || availData || {}
        const customAvailability = availData.customAvailability || []
        
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
          
          const dateOverride = customAvailability.find(item => item.date === dateStr)
          
          let dayData = {
            available: false,
            hours: null,
            assignedJobs: []
          }
          
          let baseHours = []
          if (dateOverride) {
            if (dateOverride.available === false) {
              dayData.available = false
            } else if (dateOverride.hours) {
              dayData.available = true
              if (Array.isArray(dateOverride.hours)) {
                baseHours = dateOverride.hours.map(slot => {
                  if (typeof slot === 'string') {
                    const parsed = parseHoursString(slot)
                    return parsed.length > 0 ? parsed[0] : null
                  }
                  return slot
                }).filter(Boolean)
              } else if (typeof dateOverride.hours === 'string') {
                baseHours = parseHoursString(dateOverride.hours)
              } else {
                baseHours = [dateOverride.hours]
              }
            }
          } else {
            const dayWorkingHours = workingHours[dayName]
            if (dayWorkingHours) {
              if (dayWorkingHours.available !== false) {
                dayData.available = true
                if (dayWorkingHours.timeSlots && dayWorkingHours.timeSlots.length > 0) {
                  baseHours = dayWorkingHours.timeSlots.map(slot => ({
                    start: slot.start,
                    end: slot.end
                  }))
                } else if (dayWorkingHours.hours) {
                  baseHours = parseHoursString(dayWorkingHours.hours)
                }
              }
            }
          }
          
          dayData.hours = baseHours
          
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
          
          processedData[memberId][dateStr] = dayData
        })
      }
    })
    
    setAvailabilityData(processedData)
  }

  useEffect(() => {
    if (viewMode === 'worker-availability') {
      fetchTeamMembers()
    } else if (viewMode === 'tasks-list' || viewMode === 'tasks-calendar') {
      fetchTasks()
    }
  }, [viewMode, fetchTeamMembers, fetchTasks, currentMonth, currentYear])

  // Fetch member data when selected member or month changes
  useEffect(() => {
    if ((selectedTeamMemberId || selectedTeamMemberId === null) && viewMode === 'worker-availability') {
      // Clear previous data when switching members or months
      setAssignedJobs([])
      setAvailabilityData({})
      // Fetch new data - null means account owner
      fetchMemberData(selectedTeamMemberId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTeamMemberId, currentMonth, currentYear, viewMode])

  const handlePreviousMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1))
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
    
    if (!memberData.available) {
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

  // Get tasks for a specific date
  const getTasksForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0]
    return tasks.filter(task => {
      if (!task.due_date) return false
      const taskDate = new Date(task.due_date).toISOString().split('T')[0]
      return taskDate === dateStr
    })
  }

  // Filter tasks
  const getFilteredTasks = () => {
    if (taskFilter === 'all') return tasks
    if (taskFilter === 'overdue') {
      const now = new Date()
      return tasks.filter(task => 
        task.due_date && 
        new Date(task.due_date) < now && 
        task.status !== 'completed'
      )
    }
    return tasks.filter(task => task.status === taskFilter)
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

  if (loading && teamMembers.length === 0 && tasks.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading calendar...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24 lg:pb-0">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-4 lg:px-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/team')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-xl lg:text-2xl font-semibold text-gray-900">Calendar</h1>
                <p className="text-sm text-gray-500 mt-1">
                  {viewMode === 'worker-availability' && 'View team member availability'}
                  {viewMode === 'tasks-list' && 'View and manage all tasks'}
                  {viewMode === 'tasks-calendar' && 'Tasks organized by due date'}
                </p>
              </div>
            </div>
            
            {/* View Mode Switcher - Only for Tasks */}
            {(viewMode === 'tasks-list' || viewMode === 'tasks-calendar') && (
              <div className="flex items-center space-x-2 flex-wrap">
                <div className="flex items-center bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('tasks-list')}
                    className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                      viewMode === 'tasks-list'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <List className="w-4 h-4 inline mr-1" />
                    List
                  </button>
                  <button
                    onClick={() => setViewMode('tasks-calendar')}
                    className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                      viewMode === 'tasks-calendar'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Calendar
                  </button>
                </div>
              </div>
            )}
            
            {viewMode.startsWith('tasks') && (
              <button
                onClick={() => {
                  setEditingTask(null)
                  setShowCreateTaskModal(true)
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                + New Task
              </button>
            )}
            
            {viewMode === 'worker-availability' && (
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-gray-400" />
                <select
                  value={selectedTeamMemberId === null ? 'user' : (selectedTeamMemberId || '')}
                  onChange={(e) => {
                    const value = e.target.value
                    setSelectedTeamMemberId(value === 'user' ? null : parseInt(value))
                  }}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
                >
                  <option value="user">Me (Account Owner)</option>
                  {teamMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.first_name} {member.last_name}
                    </option>
                  ))}
                </select>
              </div>
            )}
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

      {/* Tasks List View */}
      {viewMode === 'tasks-list' && (
        <div className="px-4 py-6 lg:px-6">
          <div className="bg-white rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Tasks</h2>
                <div className="flex items-center space-x-2">
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
                      onClick={() => {
                        setEditingTask(null)
                        setShowCreateTaskModal(true)
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                      Create Task
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {getFilteredTasks().map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onEdit={handleEditTask}
                      onDelete={handleDeleteTask}
                      onStatusChange={handleTaskStatusChange}
                      showLeadInfo={true}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tasks Calendar View or Availability Calendar */}
      {(viewMode === 'tasks-calendar' || viewMode === 'worker-availability') && (
        <>
          {/* Month Navigation */}
          <div className="bg-white border-b border-gray-200 px-4 py-4 lg:px-6">
            <div className="flex items-center justify-between">
              <button
                onClick={handlePreviousMonth}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              
              <h2 className="text-lg lg:text-xl font-semibold text-gray-900">
                {monthNames[currentMonth]} {currentYear}
              </h2>
              
              <button
                onClick={handleNextMonth}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>


          {/* Calendar Grid */}
          <div className="px-4 py-4 lg:px-6 overflow-x-auto">
            <div className="min-w-max">
              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-2 mb-2">
                {dayNames.map(day => (
                  <div key={day} className="p-2 text-center text-sm font-medium text-gray-500 w-32">
                    {day}
                  </div>
                ))}
              </div>
              
              {/* Calendar Days */}
              <div className="grid grid-cols-7 gap-2">
                {calendarDays.map((day, index) => {
                  const dateStr = day.date.toISOString().split('T')[0]
                  
                  return (
                    <div
                      key={index}
                      className={`w-32 border rounded-lg p-2 min-h-[120px] ${
                        (() => {
                          if (!day.isCurrentMonth) return 'bg-gray-50 border-gray-200'
                          const memberAvailability = selectedTeamMemberId ? availabilityData[selectedTeamMemberId]?.[dateStr] : null
                          const isUnavailable = memberAvailability && !memberAvailability.available
                          if (isUnavailable) return 'bg-gray-100 border-gray-300 opacity-60'
                          if (day.isToday) return 'bg-white border-blue-500 ring-2 ring-blue-500'
                          return 'bg-white border-gray-200'
                        })()
                      }`}
                    >
                      <div className={`text-sm font-semibold mb-2 ${
                        day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                      } ${day.isToday ? 'text-blue-600' : ''}`}>
                        {day.date.getDate()}
                      </div>
                      
                      {/* Tasks Calendar View */}
                      {viewMode === 'tasks-calendar' && (
                        <div className="space-y-1">
                          {getTasksForDate(day.date).map((task) => (
                            <div
                              key={task.id}
                              className={`px-2 py-1 rounded text-xs border ${
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
                      
                      {/* Calendar View - Show UNASSIGNED/FREE time during availability (opposite of Schedule) */}
                      {viewMode === 'worker-availability' && (selectedTeamMemberId || selectedTeamMemberId === null) && (
                        <>
                          {(() => {
                            // Get availability for this day
                            // Use 'user' as key for account owner, selectedTeamMemberId for team members
                            const dataKey = selectedTeamMemberId || 'user'
                            const memberAvailability = availabilityData[dataKey]?.[dateStr]
                            const isUnavailable = memberAvailability && !memberAvailability.available
                            
                            // Disable day if unavailable or not current month
                            const dayDisabled = !day.isCurrentMonth || isUnavailable
                            
                            // Get availability hours
                            const availabilityHours = memberAvailability?.hours || []
                            
                            return (
                              <div className={`space-y-1 ${dayDisabled ? 'opacity-50 pointer-events-none' : ''}`}>
                                {isUnavailable && day.isCurrentMonth ? (
                                  <div className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-500 border border-gray-200 text-center">
                                    Unavailable
                                  </div>
                                ) : availabilityHours.length > 0 ? (
                                  // Show availability time slots
                                  availabilityHours.slice(0, 2).map((slot, idx) => {
                                    const startTime = formatTime(slot.start)
                                    const endTime = formatTime(slot.end)
                                    return (
                                      <div
                                        key={idx}
                                        className="px-2 py-1 rounded text-xs bg-blue-50 text-blue-700 border border-blue-200 text-center"
                                        title={`Available: ${startTime} - ${endTime}`}
                                      >
                                        <div className="font-medium text-xs">{startTime} - {endTime}</div>
                                      </div>
                                    )
                                  }).concat(
                                    availabilityHours.length > 2 ? (
                                      <div key="more" className="text-xs text-blue-600 text-center py-0.5">
                                        +{availabilityHours.length - 2}
                                      </div>
                                    ) : null
                                  )
                                ) : memberAvailability?.available && day.isCurrentMonth ? (
                                  // Available but no specific time slots
                                  <div className="text-xs text-blue-600 text-center py-1">
                                    Available
                                  </div>
                                ) : day.isCurrentMonth ? (
                                  <div className="text-xs text-gray-400 text-center py-1">
                                    -
                                  </div>
                                ) : null}
                              </div>
                            )
                          })()}
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </>
      )}

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

      {/* Create/Edit Task Modal */}
      {showCreateTaskModal && (
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
                  due_date: taskData.dueDate,
                  priority: taskData.priority,
                  assigned_to: taskData.assignedTo,
                  status: taskData.status
                })
                setMessage({ type: 'success', text: 'Task updated successfully!' })
              } else {
                // For now, we need a lead to create a task
                // You can modify this to create a default lead or handle differently
                setMessage({ type: 'error', text: 'Please create tasks from the Leads page. Task creation without a lead is not yet supported.' })
                setShowCreateTaskModal(false)
                setEditingTask(null)
                return
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
          initialData={editingTask}
          isEditing={!!editingTask}
        />
      )}
    </div>
  )
}

export default UnifiedCalendar



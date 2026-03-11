import { useState, useEffect, useMemo, useRef } from "react"
import { Plus, ChevronLeft, ChevronRight, Calendar, MapPin, Clock, DollarSign, User, Filter, AlertTriangle, RefreshCw, Map, Users } from "lucide-react"
import ScheduleSidebar from "../components/schedule-sidebar"
import { useNavigate } from "react-router-dom"


import { useAuth } from "../context/AuthContext"
import { jobsAPI, teamAPI } from "../services/api"

const ServiceFlowSchedule = () => {
  const { user } = useAuth()
  const [currentView, setCurrentView] = useState("day") // day, week, month
  const [currentDate, setCurrentDate] = useState(new Date()) // Current date
  const [allJobs, setAllJobs] = useState([]) // Store ALL jobs
  const [jobs, setJobs] = useState([]) // Filtered jobs for current view
  const [showMap, setShowMap] = useState(false)
  const [filters, setFilters] = useState({
    status: "all",
    teamMember: "all",
    timeRange: "all",
    territory: "all"
  })


  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [teamMembers, setTeamMembers] = useState([])
  const [expandedDays, setExpandedDays] = useState(new Set())
  const [isNavigating, setIsNavigating] = useState(false)
  const [showCalendarPicker, setShowCalendarPicker] = useState(false) // Calendar picker visibility
  const [scheduleSidebarOpen, setScheduleSidebarOpen] = useState(false) // Mobile filter sidebar state
  const [availabilityData, setAvailabilityData] = useState({}) // Store availability for all team members
  const [loadingAvailability, setLoadingAvailability] = useState(false)
  const [selectedTeamMemberId, setSelectedTeamMemberId] = useState(null) // null = all team members
  const navigate = useNavigate()

  // Navigation timeout
  const navigationTimeoutRef = useRef(null)
  const silentRefreshIntervalRef = useRef(null)
  const calendarRef = useRef(null)

  // Function to handle expanding/collapsing days
  const toggleDayExpansion = (dateString) => {
    setExpandedDays(prev => {
      const newSet = new Set(prev)
      if (newSet.has(dateString)) {
        newSet.delete(dateString)
      } else {
        newSet.add(dateString)
      }
      return newSet
    })
  }

  // Get current user with useMemo to prevent infinite re-renders
  const currentUser = useMemo(() => user, [user])

  useEffect(() => {
    if (currentUser?.id) {
      // Only fetch all jobs once when user changes or on initial load
      if (allJobs.length === 0) {
        loadAllJobs()
      }
      loadTeamMembers()
      
      // Start silent refresh every 30 seconds
      silentRefreshIntervalRef.current = setInterval(() => {
        refreshJobsSilently()
      }, 30000) // 30 seconds
      
      // Cleanup interval on unmount
      return () => {
        if (silentRefreshIntervalRef.current) {
          clearInterval(silentRefreshIntervalRef.current)
        }
      }
    } else if (!currentUser) {
      navigate('/signin')
    }
  }, [currentUser, navigate]) // eslint-disable-line react-hooks/exhaustive-deps

  // Separate useEffect for filtering jobs when view/date/filters change
  useEffect(() => {
    if (allJobs.length > 0) {
      filterJobsForCurrentView()
    }
  }, [allJobs, currentView, currentDate, filters]) // eslint-disable-line react-hooks/exhaustive-deps

  // Handle clicking outside calendar picker to close it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target)) {
        setShowCalendarPicker(false)
      }
    }

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setShowCalendarPicker(false)
      }
    }

    if (showCalendarPicker) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [showCalendarPicker])

  const loadTeamMembers = async () => {
    if (!currentUser?.id) return
    try {
      const response = await teamAPI.getAll(currentUser.id)
      // response may be { teamMembers: [...] } or just an array
      const members = Array.isArray(response) ? response : (response.teamMembers || response || [])
      
      // Add sample territories for testing if none exist
      const membersWithTerritories = members.map(member => ({
        ...member,
        territory: member.territory || (member.id % 3 === 0 ? 'Jacksonville' : member.id % 3 === 1 ? 'St. Petersburg' : 'Tampa')
      }))
      
      console.log('👥 Team members loaded:', membersWithTerritories)
      setTeamMembers(membersWithTerritories)
    } catch (error) {
      console.error('❌ Error loading team members:', error)
      setTeamMembers([])
    }
  }

  // Load availability for all team members for the current week
  const loadAllAvailability = async () => {
    if (!currentUser?.id || teamMembers.length === 0) return
    
    setLoadingAvailability(true)
    try {
      // Get start and end of current week
      const startOfWeek = new Date(currentDate)
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay())
      startOfWeek.setHours(0, 0, 0, 0)
      
      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(startOfWeek.getDate() + 6)
      endOfWeek.setHours(23, 59, 59, 999)
      
      const startDateStr = startOfWeek.toISOString().split('T')[0]
      const endDateStr = endOfWeek.toISOString().split('T')[0]
      
      // Fetch availability for all team members in parallel
      const availabilityPromises = teamMembers.map(async (member) => {
        try {
          const availability = await teamAPI.getAvailability(member.id, startDateStr, endDateStr)
          return { memberId: member.id, availability }
        } catch (error) {
          console.error(`Error fetching availability for member ${member.id}:`, error)
          return { memberId: member.id, availability: null }
        }
      })
      
      const results = await Promise.all(availabilityPromises)
      const availabilityMap = {}
      
      results.forEach(({ memberId, availability }) => {
        if (availability?.availability) {
          // Process availability data similar to unified-calendar
          const processedData = {}
          const availData = typeof availability.availability === 'string' 
            ? JSON.parse(availability.availability) 
            : availability.availability
          
          if (availData && typeof availData === 'object') {
            Object.keys(availData).forEach(dateStr => {
              const dayData = availData[dateStr]
              processedData[dateStr] = {
                available: dayData.available !== false,
                hours: dayData.hours || [],
                hasAvailabilityConfigured: dayData.hasAvailabilityConfigured !== false
              }
            })
          }
          
          availabilityMap[memberId] = processedData
        }
      })
      
      setAvailabilityData(availabilityMap)
    } catch (error) {
      console.error('Error loading availability:', error)
    } finally {
      setLoadingAvailability(false)
    }
  }

  // Load availability when view changes to availability or when currentDate changes
  useEffect(() => {
    if (currentView === 'availability' && teamMembers.length > 0) {
      loadAllAvailability()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentView, currentDate, teamMembers.length])

  // Get unique territories from team members
  const getTerritories = () => { // eslint-disable-line no-unused-vars
    const territories = new Set()
    teamMembers.forEach(member => {
      if (member.territory) {
        territories.add(member.territory)
      }
    })
    return Array.from(territories).sort()
  }

  const loadAllJobs = async () => {
    if (!currentUser?.id) return
    
    try {
      setLoading(true)
      setError("")
      
      // Get ALL jobs without date filtering - we'll filter client-side
      const response = await jobsAPI.getAll(
        currentUser.id, 
        "", // status (empty to get all)
        "", // search
        1, // page
        1000, // limit
        "", // dateFilter (empty to get all dates)
        "", // dateRange
        "scheduled_date", // sortBy
        "ASC", // sortOrder
        undefined, // teamMember (empty to get all)
        undefined, // invoiceStatus
        undefined, // customerId
        undefined, // territoryId
      )
      
      const allJobsData = response.jobs || response || []
      console.log('📋 Jobs loaded:', allJobsData.length, 'jobs')
      console.log('📋 Sample job data:', allJobsData[0])
      setAllJobs(allJobsData)
    } catch (error) {
      if (error.response?.status === 403) {
        setError("Authentication required. Please log in again.")
        navigate('/signin')
      } else if (error.response?.status === 404) {
        setError("Jobs not found. Please try again.")
      } else {
        setError("Failed to load jobs. Please try again.")
      }
      setAllJobs([])
    } finally {
      setLoading(false)
    }
  }

  const filterJobsForCurrentView = () => {
    if (allJobs.length === 0) return
    
    // Apply NON-DATE filters to allJobs (keep allJobs unfiltered for date views)
    let filteredJobs = [...allJobs]
    
    console.log('🔍 Filtering jobs with filters:', filters)
    console.log('🔍 Total jobs before filtering:', filteredJobs.length)
    
    // Apply status filter
    if (filters.status !== "all") {
      // Debug: Log all unique status values in jobs
      const uniqueStatuses = [...new Set(filteredJobs.map(job => job.status))]
      console.log('🔍 Available job statuses:', uniqueStatuses)
      console.log('🔍 Filtering for status:', filters.status)
      
      filteredJobs = filteredJobs.filter(job => {
        // Try exact match first
        let matches = job.status === filters.status
        
        // If no exact match, try case-insensitive match
        if (!matches) {
          matches = job.status?.toLowerCase() === filters.status.toLowerCase()
        }
        
        // If still no match, try common variations
        if (!matches) {
          const statusVariations = {
            'in-progress': ['in progress', 'in-progress', 'in_progress', 'inprogress', 'active', 'started'],
            'pending': ['pending', 'scheduled', 'booked'],
            'confirmed': ['confirmed', 'accepted', 'approved'],
            'completed': ['completed', 'done', 'finished'],
            'cancelled': ['cancelled', 'canceled', 'cancelled']
          }
          
          const variations = statusVariations[filters.status] || []
          matches = variations.includes(job.status?.toLowerCase())
        }
        
        console.log(`🔍 Job ${job.id}: status="${job.status}" matches="${matches}"`)
        return matches
      })
      console.log(`🔍 After status filter (${filters.status}):`, filteredJobs.length)
    }
    
    // Apply team member filter
    if (filters.teamMember !== "all") {
      if (filters.teamMember === "unassigned") {
        filteredJobs = filteredJobs.filter(job => !job.team_member_id || job.team_member_id === null)
        console.log(`🔍 After unassigned filter:`, filteredJobs.length)
      } else {
        // Filter by specific team member ID - use loose equality for string/number comparison
        filteredJobs = filteredJobs.filter(job => {
          const jobTeamMemberId = job.team_member_id
          const filterTeamMemberId = filters.teamMember
          console.log(`🔍 Comparing job team_member_id: ${jobTeamMemberId} (${typeof jobTeamMemberId}) with filter: ${filterTeamMemberId} (${typeof filterTeamMemberId})`)
          return String(jobTeamMemberId) === String(filterTeamMemberId)
        })
        console.log(`🔍 After team member filter (${filters.teamMember}):`, filteredJobs.length)
      }
    }
    
    // Apply territory filter
    if (filters.territory !== "all") {
      filteredJobs = filteredJobs.filter(job => {
        // Check if job has territory_id or if team member has territory
        const teamMember = teamMembers.find(tm => String(tm.id) === String(job.team_member_id))
        return String(job.territory_id) === String(filters.territory) ||
               (teamMember && teamMember.territory === filters.territory)
      })
      console.log(`🔍 After territory filter (${filters.territory}):`, filteredJobs.length)
    }
    
    // Apply time range filter
    if (filters.timeRange !== "all") {
      filteredJobs = filteredJobs.filter(job => {
        if (!job.scheduled_date) return false
        
        // Extract time from scheduled_date
        let timePart = ''
        if (job.scheduled_date.includes('T')) {
          timePart = job.scheduled_date.split('T')[1]
        } else {
          timePart = job.scheduled_date.split(' ')[1]
        }
        
        if (!timePart) return false
        
        const [hours] = timePart.split(':')
        const hour = parseInt(hours, 10)
        
        switch (filters.timeRange) {
          case 'morning':
            return hour < 12
          case 'afternoon':
            return hour >= 12 && hour < 17
          case 'evening':
            return hour >= 17
          default:
            return true
        }
      })
      console.log(`🔍 After time range filter (${filters.timeRange}):`, filteredJobs.length)
    }
    
    console.log('🔍 Final filtered jobs:', filteredJobs.length)
    setJobs(filteredJobs)
  }

  const formatDate = (date, view) => {
    // Use the stored date directly without creating Date objects to avoid timezone conversion
    const year = date.getFullYear()
    const month = date.getMonth()
    const day = date.getDate()
    
    // Create weekday and month names arrays
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    
    // Calculate weekday using Zeller's congruence to avoid Date object
    let adjustedMonth = month + 1 // Convert to 1-based month
    let adjustedYear = year
    if (adjustedMonth < 3) {
      adjustedMonth = adjustedMonth + 12
      adjustedYear = year - 1
    }
    
    const k = adjustedYear % 100
    const j = Math.floor(adjustedYear / 100)
    const h = (day + Math.floor((13 * (adjustedMonth + 1)) / 5) + k + Math.floor(k / 4) + Math.floor(j / 4) - 2 * j) % 7
    
    const weekdayIndex = ((h + 5) % 7) // Adjust for Sunday = 0
    const weekday = weekdays[weekdayIndex]
    const monthName = months[month]
    const fullMonthName = monthNames[month]
    
    if (view === 'day') {
      return `${weekday}, ${monthName} ${day}, ${year}`
    } else if (view === 'week') {
      // Calculate start and end of week without Date objects
      const dayOfWeek = ((h + 5) % 7) // 0 = Sunday, 1 = Monday, etc.
      const startDay = day - dayOfWeek
      const endDay = startDay + 6
      
      // Handle month/year boundaries
      let startMonth = month
      let startYear = year
      let endMonth = month
      let endYear = year
      
      if (startDay < 1) {
        startMonth = month - 1
        if (startMonth < 0) {
          startMonth = 11
          startYear = year - 1
        }
        const daysInPrevMonth = new Date(startYear, startMonth + 1, 0).getDate()
        const actualStartDay = daysInPrevMonth + startDay
        return `${months[startMonth]} ${actualStartDay} - ${months[endMonth]} ${endDay}, ${endYear}`
      } else if (endDay > new Date(year, month + 1, 0).getDate()) {
        endMonth = month + 1
        if (endMonth > 11) {
          endMonth = 0
          endYear = year + 1
        }
        const actualEndDay = endDay - new Date(year, month + 1, 0).getDate()
        return `${months[startMonth]} ${startDay} - ${months[endMonth]} ${actualEndDay}, ${endYear}`
      }
      
      return `${months[startMonth]} ${startDay} - ${months[endMonth]} ${endDay}, ${year}`
    } else {
      return `${fullMonthName} ${year}`
    }
  }

  const formatTime = (dateString) => {
    if (!dateString) return 'Time placeholder'
    
    // Handle both ISO format (2025-08-20T09:00:00) and space format (2025-08-20 09:00:00)
    let timePart = ''
    if (dateString.includes('T')) {
      // ISO format: 2025-08-20T09:00:00
      timePart = dateString.split('T')[1]
    } else {
      // Space format: 2025-08-20 09:00:00
      timePart = dateString.split(' ')[1]
    }
    
    if (!timePart) return 'Time placeholder'
    
    const [hours, minutes] = timePart.split(':')
    const hour = parseInt(hours, 10)
    const minute = parseInt(minutes, 10)
    
    if (isNaN(hour) || isNaN(minute)) return 'Time placeholder'
    
    // Convert to 12-hour format
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    const displayMinute = minute.toString().padStart(2, '0')
    
    return `${displayHour}:${displayMinute} ${ampm}`
  }

  // Universal function to get jobs for a specific date
  const getJobsForDate = (date) => {
    const dateString = date.toLocaleDateString('en-CA') // Returns YYYY-MM-DD format
    
    return jobs.filter(job => {
      // Handle both ISO format (2025-08-20T09:00:00) and space format (2025-08-20 09:00:00)
      let jobDateString = ''
      if (job.scheduled_date) {
        if (job.scheduled_date.includes('T')) {
          // ISO format: 2025-08-20T09:00:00
          jobDateString = job.scheduled_date.split('T')[0]
        } else {
          // Space format: 2025-08-20 09:00:00
          jobDateString = job.scheduled_date.split(' ')[0]
        }
      }
      return jobDateString === dateString
    })
  }

  // Universal function to get team member color for a job
  const getTeamMemberColor = (job) => {
    const teamMember = teamMembers.find(tm => tm.id === job.team_member_id)
    return teamMember?.color || '#2563EB'
  }

  // Universal function to get status color for a job
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'confirmed': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }

  // Function to get filtered jobs for Day view (with date filtering)
  const getFilteredJobs = () => {
    return getJobsForDate(currentDate)
  }

  const navigateDate = (direction) => {
    // Prevent rapid navigation clicks
    if (isNavigating) {
      return
    }
    
    setIsNavigating(true)
    
    // Clear any existing navigation timeout
    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current)
    }
    
    const newDate = new Date(currentDate)
    
    if (currentView === 'day') {
      newDate.setDate(currentDate.getDate() + direction)
    } else if (currentView === 'week') {
      newDate.setDate(currentDate.getDate() + (direction * 7))
    } else {
      newDate.setMonth(currentDate.getMonth() + direction)
    }
    
    setCurrentDate(newDate)
    
    // Allow navigation again after 500ms (faster since no API call)
    navigationTimeoutRef.current = setTimeout(() => {
      setIsNavigating(false)
    }, 500)
  }

  // Function to generate calendar days for the date picker
  const generateCalendarDays = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    
    const firstDay = new Date(year, month, 1)
    const startDate = new Date(firstDay)
    startDate.setDate(firstDay.getDate() - firstDay.getDay())
    
    const days = []
    const date = new Date(startDate)
    
    // Generate 42 days (6 weeks) to ensure we cover the entire month
    for (let i = 0; i < 42; i++) {
      days.push(new Date(date))
      date.setDate(date.getDate() + 1)
    }
    
    return days
  }

  // Function to navigate months in the calendar picker
  const navigateMonth = (direction) => {
    const newDate = new Date(currentDate)
    newDate.setMonth(newDate.getMonth() + direction)
    setCurrentDate(newDate)
  }

  // Function to refresh jobs silently in background
  const refreshJobsSilently = async () => {
    if (!currentUser?.id) return
    
    try {
      const response = await jobsAPI.getAll(
        currentUser.id, 
        "", // status (empty to get all)
        "", // search
        1, // page
        1000, // limit
        "", // dateFilter (empty to get all dates)
        "", // dateRange
        "scheduled_date", // sortBy
        "ASC", // sortOrder
        undefined, // teamMember (empty to get all)
        undefined, // invoiceStatus
        undefined, // customerId
        undefined, // territoryId
      )
      
      const allJobsData = response.jobs || response || []
      setAllJobs(allJobsData)
    } catch (error) {
      // Don't show error to user for silent refresh
    }
  }

  const handleCreateJob = () => {
    navigate('/createjob')
  }

  const handleViewJob = (job) => {
    navigate(`/job/${job.id}`)
  }

  const handleViewCustomer = (customerId) => { // eslint-disable-line no-unused-vars
    navigate(`/customer/${customerId}`)
  }



  // Calculate job summary statistics
  const getJobSummary = () => {
    const filteredJobs = getFilteredJobs()
    
    const totalJobs = filteredJobs.length
    const completedJobs = filteredJobs.filter(job => job.status === 'completed').length
    const inProgressJobs = filteredJobs.filter(job => job.status === 'in_progress').length
    const pendingJobs = filteredJobs.filter(job => job.status === 'pending').length
    const confirmedJobs = filteredJobs.filter(job => job.status === 'confirmed').length
    const cancelledJobs = filteredJobs.filter(job => job.status === 'cancelled').length
    
    const totalRevenue = filteredJobs.reduce((sum, job) => sum + (parseFloat(job.service_price) || 0), 0)
    const totalDuration = filteredJobs.reduce((sum, job) => sum + (parseFloat(job.duration) || 0), 0)
    
    const assignedJobs = filteredJobs.filter(job => job.team_member_id).length
    const unassignedJobs = totalJobs - assignedJobs
    
    return {
      totalJobs,
      completedJobs,
      inProgressJobs,
      pendingJobs,
      confirmedJobs,
      cancelledJobs,
      totalRevenue,
      totalDuration,
      assignedJobs,
      unassignedJobs
    }
  }



  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }))
  }

  // Jobs Summary Component
  const JobsSummary = () => {
    const summary = getJobSummary()
    
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Day Summary - {formatDate(currentDate, 'day')}
          </h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowMap(!showMap)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                showMap ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Map className="w-4 h-4 inline mr-1" />
              {showMap ? 'Hide Map' : 'Show Map'}
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{summary.totalJobs}</div>
            <div className="text-sm text-gray-600">Total Jobs</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{summary.completedJobs}</div>
            <div className="text-sm text-gray-600">Completed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{summary.inProgressJobs}</div>
            <div className="text-sm text-gray-600">In Progress</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{summary.pendingJobs}</div>
            <div className="text-sm text-gray-600">Pending</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">${summary.totalRevenue.toFixed(2)}</div>
            <div className="text-sm text-gray-600">Revenue</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{summary.assignedJobs}</div>
            <div className="text-sm text-gray-600">Assigned</div>
          </div>
        </div>

        {/* Additional metrics row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
          <div className="text-center">
            <div className="text-lg font-semibold text-orange-600">{summary.confirmedJobs}</div>
            <div className="text-sm text-gray-600">Confirmed</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-red-600">{summary.cancelledJobs}</div>
            <div className="text-sm text-gray-600">Cancelled</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-600">{summary.unassignedJobs}</div>
            <div className="text-sm text-gray-600">Unassigned</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-blue-600">
              {summary.totalDuration > 0 ? `${Math.round(summary.totalDuration / 60)}h ${summary.totalDuration % 60}m` : '0h 0m'}
            </div>
            <div className="text-sm text-gray-600">Total Duration</div>
          </div>
        </div>

        {/* Progress bar for completion rate */}
        {summary.totalJobs > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Completion Rate</span>
              <span className="text-sm text-gray-600">
                {Math.round((summary.completedJobs / summary.totalJobs) * 100)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(summary.completedJobs / summary.totalJobs) * 100}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Jobs Map Component
  const JobsMap = () => {
    // Filter jobs that have location data
    const jobsWithLocation = getFilteredJobs().filter(job => 
      job.customer_address || (job.service_address_street && job.service_address_city)
    )

    if (jobsWithLocation.length === 0) {
      return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="text-center">
            <Map className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No locations available</h3>
            <p className="text-gray-500">Jobs need addresses to be displayed on the map.</p>
          </div>
        </div>
      )
    }

    // Create a custom map URL that shows all job locations
    const createMultiLocationMap = () => {
      if (jobsWithLocation.length === 1) {
        // Single job - use place mode
        const address = jobsWithLocation[0].customer_address || `${jobsWithLocation[0].service_address_street}, ${jobsWithLocation[0].service_address_city}`
        return `https://www.google.com/maps/embed/v1/place?key=AIzaSyC_CrJWTsTHOTBd7TSzTuXOfutywZ2AyOQ&q=${encodeURIComponent(address)}&zoom=14`
      } else {
        // Multiple jobs - use a custom approach with search mode
        const addresses = jobsWithLocation.map(job => 
          job.customer_address || `${job.service_address_street}, ${job.service_address_city}`
        ).join('|')
        
        // Use search mode to show multiple locations
        return `https://www.google.com/maps/embed/v1/search?key=AIzaSyC_CrJWTsTHOTBd7TSzTuXOfutywZ2AyOQ&q=${encodeURIComponent(addresses)}&zoom=10`
      }
    }

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Job Locations</h3>
        <p className="text-sm text-gray-600 mb-4">
          {jobsWithLocation.length === 1 
            ? "Map shows the job location." 
            : `Map shows all ${jobsWithLocation.length} job locations. Job details are listed below.`
          }
        </p>
        
        {/* Google Maps iframe with all job locations */}
        <div className="h-80 bg-gray-100 rounded-lg overflow-hidden mb-4 relative">
          <iframe
            width="100%"
            height="100%"
            frameBorder="0"
            style={{ border: 0 }}
            src={createMultiLocationMap()}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Job Locations Map"
            onLoad={() => {
              // Map loaded successfully
            }}
          />
          <div className="absolute top-2 right-2 bg-white px-2 py-1 rounded text-xs text-gray-600 shadow-sm">
            {jobsWithLocation.length} job{jobsWithLocation.length !== 1 ? 's' : ''}
          </div>
        </div>
        
        {/* Job list below map with numbered markers */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {jobsWithLocation.slice(0, 6).map((job, index) => (
            <div 
              key={job.id} 
              className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer border-l-4 border-blue-500"
              onClick={() => navigate(`/job/${job.id}`)}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                  {index + 1}
                </div>
                <div className="font-medium text-sm text-gray-900">{job.service_name || 'Service placeholder'}</div>
              </div>
              <div className="text-xs text-gray-600 truncate mt-1">
                {job.customer_address || `${job.service_address_street}, ${job.service_address_city}`}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                                        {formatTime(job.scheduled_date)}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {job.customer_first_name && job.customer_last_name 
                  ? `${job.customer_first_name} ${job.customer_last_name}`
                  : job.customer_first_name || job.customer_last_name || 'Client placeholder'
                }
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Status: {job.status || 'Status placeholder'}
              </div>
            </div>
          ))}
        </div>
        
        {jobsWithLocation.length > 6 && (
          <div 
            className="text-center text-sm text-blue-600 mt-3 cursor-pointer hover:text-blue-800 hover:underline transition-colors"
            onClick={() => {
              // For now, just show all jobs - could be enhanced to show a modal or expand the map
            }}
          >
            +{jobsWithLocation.length - 6} more jobs with locations
          </div>
        )}
      </div>
    )
  }

  // Day View Component
  const DayView = () => (
    <div className="flex-1 bg-gray-50 overflow-y-auto">
      <div className="max-w-6xl mx-auto p-4 sm:p-6">
        <JobsSummary />
        {showMap && <JobsMap />}
        {loading ? (
          <div className="text-center py-16">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 sm:p-12">
              <RefreshCw className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4 animate-spin" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Loading jobs...</h3>
              <p className="text-gray-500 mb-6">Please wait while we fetch the scheduled jobs.</p>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 sm:p-12">
              <AlertTriangle className="w-12 h-12 sm:w-16 sm:h-16 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Error: {error}</h3>
              <p className="text-gray-500 mb-6">Failed to load jobs. Please try again later.</p>
              <button 
                onClick={loadAllJobs}
                className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 transition-all duration-200 transform hover:scale-[1.02] focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
          </div>
        ) : getFilteredJobs().length > 0 ? (
          <div className="space-y-4 pb-8 min-h-0">
            {getFilteredJobs().map((job) => {
              const memberColor = getTeamMemberColor(job)
              return (
                <div 
                  key={job.id} 
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 hover:shadow-lg hover:border-blue-300 transition-all duration-200 cursor-pointer"
                  onClick={() => navigate(`/job/${job.id}`)}
                >
                  <div className="flex flex-col space-y-4 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
                    <div className="flex-1">
                      <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-3 mb-4">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: memberColor }}>
                          <span className="text-white font-semibold text-sm">
                            {job.team_member_first_name?.charAt(0) || job.service_name?.charAt(0) || 'J'}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-gray-900 mb-1 truncate">
                            {job.service_name || 'Service'}
                          </h3>
                          <div 
                            className="text-sm text-gray-600 truncate block hover:text-blue-600 hover:underline cursor-pointer transition-colors"
                            onClick={(e) => {
                              e.stopPropagation()
                              if (job.customer_id) {
                                navigate(`/customer/${job.customer_id}`)
                              }
                            }}
                          >
                            {job.customer_first_name && job.customer_last_name 
                              ? `${job.customer_first_name} ${job.customer_last_name}`
                              : job.customer_first_name || job.customer_last_name || 'Client name placeholder'
                            }
                          </div>
                        </div>
                        <div className="flex flex-col items-end space-y-2">
                          <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getStatusColor(job.status)} flex-shrink-0`}>
                            {job.status ? job.status.replace('_', ' ') : 'Status - sign placeholder'}
                          </span>
                          <div className="flex items-center space-x-2 text-xs text-gray-500">
                            <User className="w-3 h-3" />
                            <span>
                              {job.team_member_first_name && job.team_member_last_name 
                                ? `${job.team_member_first_name} ${job.team_member_last_name}`
                                : job.team_member_first_name || job.team_member_last_name || 'Team placeholder'
                              }
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                        <div className="flex items-center space-x-2 text-gray-600">
                          <Clock className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">
                            {formatTime(job.scheduled_date)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 text-gray-600">
                          <User className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">
                            {job.team_member_first_name && job.team_member_last_name 
                              ? `${job.team_member_first_name} ${job.team_member_last_name}`
                              : job.team_member_first_name || job.team_member_last_name || 'Unassigned'
                            }
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 text-gray-600 sm:col-span-2">
                          <MapPin className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{job.customer_address || 'Address not provided'}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-gray-600">
                          <DollarSign className="w-4 h-4 flex-shrink-0" />
                          <span className="font-medium text-green-600">${job.service_price || '0'}</span>
                        </div>
                      </div>
                      
                      {job.notes && (
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <p className="text-sm text-gray-600 italic">"{job.notes}"</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2 sm:ml-4">
                      <button 
                        onClick={() => handleViewJob(job)}
                        className="px-3 py-2 text-sm font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
                      >
                        View
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 pb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 sm:p-12">
              <Calendar className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {jobs.length > 0 ? 'No jobs match your filters' : 'No scheduled jobs'}
              </h3>
              <p className="text-gray-500 mb-6">
                {jobs.length > 0 
                  ? 'Try adjusting your filters to see more jobs.'
                  : `No jobs scheduled for ${formatDate(currentDate, 'day')}`
                }
              </p>
              <button 
                onClick={handleCreateJob}
                className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 transition-all duration-200 transform hover:scale-[1.02] focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )

  // Week View Component
  const WeekView = () => {
    const startOfWeek = new Date(currentDate)
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay())
    
    const weekDays = []
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek)
      day.setDate(startOfWeek.getDate() + i)
      weekDays.push(day)
    }

    const getJobsForDay = (date) => {
      return getJobsForDate(date)
    }

    return (
      <div className="flex-1 bg-gray-50 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 pb-8">
          <div className="grid grid-cols-1 sm:grid-cols-7 gap-4">
            {weekDays.map((day, index) => {
              const dayJobs = getJobsForDay(day)
              const isToday = day.toDateString() === new Date().toDateString()
              
              return (
                <div key={index} className={`bg-white rounded-lg border ${isToday ? 'border-blue-300 shadow-md' : 'border-gray-200'} p-4`}>
                  <div className="text-center mb-3">
                    <div className={`text-sm font-medium ${isToday ? 'text-blue-600' : 'text-gray-500'}`}>
                      {day.toLocaleDateString('en-US', { weekday: 'short' })}
                    </div>
                    <div className={`text-2xl font-bold ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                      {day.getDate()}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    {dayJobs.map(job => {
                      const memberColor = getTeamMemberColor(job)
                      
                      return (
                        <div 
                          key={job.id} 
                          className="p-2 rounded text-xs cursor-pointer hover:opacity-80 transition-all border-l-4"
                          style={{ 
                            backgroundColor: `${memberColor}15`, // 15% opacity
                            borderLeftColor: memberColor
                          }}
                          onClick={() => navigate(`/job/${job.id}`)}
                        >
                          <div className="font-medium truncate text-gray-900">{job.service_name || 'Service placeholder'}</div>
                          <div 
                            className="text-gray-600 truncate hover:text-blue-600 hover:underline cursor-pointer transition-colors"
                            onClick={(e) => {
                              e.stopPropagation()
                              if (job.customer_id) {
                                navigate(`/customer/${job.customer_id}`)
                              }
                            }}
                          >
                            {job.customer_first_name && job.customer_last_name 
                              ? `${job.customer_first_name} ${job.customer_last_name}`
                              : job.customer_first_name || job.customer_last_name || 'Client name placeholder'
                            }
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="text-gray-500">
                              {formatTime(job.scheduled_date)}
                            </div>
                            <div className="flex items-center space-x-1">
                              <span className={`px-1 py-0.5 text-xs rounded ${getStatusColor(job.status)}`}>
                                {job.status ? job.status.replace('_', ' ') : 'Status - sign placeholder'}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-1 text-gray-500 mt-1">
                            <User className="w-3 h-3" />
                            <span className="text-xs">
                              {job.team_member_first_name && job.team_member_last_name 
                                ? `${job.team_member_first_name} ${job.team_member_last_name}`
                                : job.team_member_first_name || job.team_member_last_name || 'Team placeholder'
                              }
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // Month View Component
  const MonthView = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    
    const isToday = (date) => date.toDateString() === new Date().toDateString()
    const isCurrentMonth = (date) => date.getMonth() === month
    
    const generateDaysArray = () => {
      const firstDay = new Date(year, month, 1)
      const startDate = new Date(firstDay)
      startDate.setDate(firstDay.getDate() - firstDay.getDay())
      
      const days = []
      for (let i = 0; i < 42; i++) {
        const date = new Date(startDate)
        date.setDate(startDate.getDate() + i)
        days.push(date)
      }
      return days
    }

    const getJobsForDay = (date) => {
      return getJobsForDate(date)
    }

    const days = generateDaysArray()

    return (
      <div className="flex-1 bg-gray-50 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 pb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="grid grid-cols-7 gap-px bg-gray-200">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="bg-gray-50 p-2 text-center">
                  <div className="text-sm font-medium text-gray-900">{day}</div>
                </div>
              ))}
              
              {days.map((date, index) => {
                const dayJobs = getJobsForDay(date)
                const isCurrentMonthDay = isCurrentMonth(date)
                const isTodayDate = isToday(date)
                
                return (
                  <div key={index} className={`bg-white min-h-[100px] p-2 ${!isCurrentMonthDay ? 'bg-gray-50' : ''}`}>
                    <div className={`text-sm font-medium mb-1 ${isTodayDate ? 'text-blue-600' : isCurrentMonthDay ? 'text-gray-900' : 'text-gray-400'}`}>
                      {date.getDate()}
                    </div>
                    
                    <div className="space-y-1">
                      {dayJobs.slice(0, expandedDays.has(date.toISOString().split('T')[0]) ? dayJobs.length : 3).map(job => {
                        const memberColor = getTeamMemberColor(job)
                        
                        return (
                          <div 
                            key={job.id} 
                            className="p-1 rounded text-xs truncate cursor-pointer hover:opacity-80 transition-all border-l-2"
                            style={{ 
                              backgroundColor: `${memberColor}15`, // 15% opacity
                              borderLeftColor: memberColor
                            }}
                            onClick={() => navigate(`/job/${job.id}`)}
                          >
                            <div className="font-medium truncate text-gray-900">{job.service_name || 'Service placeholder'}</div>
                            <div 
                              className="text-gray-600 truncate hover:text-blue-600 hover:underline cursor-pointer transition-colors"
                              onClick={(e) => {
                                e.stopPropagation()
                                if (job.customer_id) {
                                  navigate(`/customer/${job.customer_id}`)
                                }
                              }}
                            >
                              {job.customer_first_name && job.customer_last_name 
                                ? `${job.customer_first_name} ${job.customer_last_name}`
                                : job.customer_first_name || job.customer_last_name || 'Client name placeholder'
                              }
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="text-gray-500 text-xs">
                                {formatTime(job.scheduled_date)}
                              </div>
                              <div className="flex items-center space-x-1">
                                <span className={`px-1 py-0.5 text-xs rounded ${getStatusColor(job.status)}`}>
                                  {job.status ? job.status.replace('_', ' ') : 'Status - sign placeholder'}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-1 text-gray-500">
                              <User className="w-3 h-3" />
                              <span className="text-xs">
                                {job.team_member_first_name && job.team_member_last_name 
                                  ? `${job.team_member_first_name} ${job.team_member_last_name}`
                                  : job.team_member_first_name || job.team_member_last_name || 'Team placeholder'
                                }
                              </span>
                            </div>
                          </div>
                        )
                      })}
                      {dayJobs.length > 3 && !expandedDays.has(date.toISOString().split('T')[0]) && (
                        <div 
                          className="text-xs text-blue-600 text-center cursor-pointer hover:text-blue-800 hover:underline transition-colors"
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleDayExpansion(date.toISOString().split('T')[0])
                          }}
                        >
                          +{dayJobs.length - 3} more
                        </div>
                      )}
                      {expandedDays.has(date.toISOString().split('T')[0]) && (
                        <div 
                          className="text-xs text-gray-500 text-center cursor-pointer hover:text-gray-700 hover:underline transition-colors"
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleDayExpansion(date.toISOString().split('T')[0])
                          }}
                        >
                          Show less
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Get week dates
  const getWeekDates = () => {
    const startOfWeek = new Date(currentDate)
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay())
    startOfWeek.setHours(0, 0, 0, 0)
    
    const days = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek)
      date.setDate(startOfWeek.getDate() + i)
      days.push(date)
    }
    return days
  }

  // Format time from time string (HH:MM format)
  const formatTimeString = (timeStr) => {
    if (!timeStr) return ''
    // If it's already a formatted time string, return as is
    if (typeof timeStr === 'string' && timeStr.includes(':')) {
      const [hours, minutes] = timeStr.split(':')
      const hour = parseInt(hours, 10)
      const ampm = hour >= 12 ? 'PM' : 'AM'
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
      return `${displayHour}:${minutes} ${ampm}`
    }
    return timeStr
  }

  // Get availability display for a team member on a specific date
  const getAvailabilityDisplay = (memberId, dateStr) => {
    const memberData = availabilityData[memberId]?.[dateStr]
    if (!memberData) return { status: 'unknown', text: 'No data', hours: [] }
    
    if (!memberData.available && memberData.hasAvailabilityConfigured) {
      return { status: 'unavailable', text: 'Unavailable', hours: [] }
    }
    
    if (memberData.hours && memberData.hours.length > 0) {
      const hoursText = memberData.hours.map(slot => 
        `${formatTimeString(slot.start)} - ${formatTimeString(slot.end)}`
      ).join(', ')
      return { status: 'available', text: hoursText, hours: memberData.hours }
    }
    
    return { status: 'available', text: 'Available', hours: [] }
  }

  // Availability View Component
  const AvailabilityView = () => {
    const weekDates = getWeekDates()
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    
    return (
      <div className="flex-1 bg-gray-50 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 pb-8">
          {loadingAvailability ? (
            <div className="text-center py-16">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 sm:p-12">
                <RefreshCw className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4 animate-spin" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Loading availability...</h3>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider sticky left-0 bg-gray-50 z-10 border-r border-gray-200">
                        Team Member
                      </th>
                      {weekDates.map((date, idx) => {
                        const isToday = date.toDateString() === new Date().toDateString()
                        return (
                          <th key={idx} className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider min-w-[200px]">
                            <div className={`${isToday ? 'text-blue-600 font-bold' : ''}`}>
                              {dayNames[date.getDay()]}
                            </div>
                            <div className={`text-sm mt-1 ${isToday ? 'text-blue-600 font-bold' : 'text-gray-900'}`}>
                              {date.getDate()}/{date.getMonth() + 1}
                            </div>
                          </th>
                        )
                      })}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {teamMembers
                      .filter(member => !selectedTeamMemberId || selectedTeamMemberId === member.id)
                      .map((member) => {
                      const memberColor = member.color || '#2563EB'
                      return (
                        <tr key={member.id} className="hover:bg-gray-50">
                          <td className="px-4 py-4 whitespace-nowrap sticky left-0 bg-white z-10 border-r border-gray-200">
                            <div className="flex items-center space-x-3">
                              <div 
                                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0"
                                style={{ backgroundColor: memberColor }}
                              >
                                {member.first_name?.charAt(0) || member.last_name?.charAt(0) || 'T'}
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {member.first_name} {member.last_name}
                                </div>
                                {member.territory && (
                                  <div className="text-xs text-gray-500">{member.territory}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          {weekDates.map((date, dateIdx) => {
                            const dateStr = date.toISOString().split('T')[0]
                            const availability = getAvailabilityDisplay(member.id, dateStr)
                            const dayJobs = getJobsForDate(date).filter(job => 
                              String(job.team_member_id) === String(member.id)
                            )
                            const isToday = date.toDateString() === new Date().toDateString()
                            
                            return (
                              <td 
                                key={dateIdx} 
                                className={`px-4 py-4 align-top ${isToday ? 'bg-blue-50' : ''}`}
                              >
                                <div className="space-y-2">
                                  {/* Availability */}
                                  <div className={`p-2 rounded text-xs ${
                                    availability.status === 'available'
                                      ? 'bg-green-50 text-green-800 border border-green-200'
                                      : availability.status === 'unavailable'
                                      ? 'bg-gray-100 text-gray-600 border border-gray-200'
                                      : 'bg-gray-50 text-gray-500 border border-gray-200'
                                  }`}>
                                    <div className="font-medium mb-1">Availability</div>
                                    <div className="text-xs">{availability.text}</div>
                                  </div>
                                  
                                  {/* Jobs */}
                                  {dayJobs.length > 0 && (
                                    <div className="space-y-1">
                                      <div className="text-xs font-medium text-gray-700 mb-1">
                                        Jobs ({dayJobs.length})
                                      </div>
                                      {dayJobs.slice(0, 3).map((job) => (
                                        <div
                                          key={job.id}
                                          onClick={() => navigate(`/job/${job.id}`)}
                                          className="p-2 rounded text-xs bg-blue-50 text-blue-800 border border-blue-200 cursor-pointer hover:bg-blue-100 transition-colors"
                                          style={{ borderLeftColor: memberColor, borderLeftWidth: '3px' }}
                                        >
                                          <div className="font-medium truncate">{job.service_name || 'Service'}</div>
                                          <div className="text-xs opacity-75">{formatTime(job.scheduled_date)}</div>
                                          {job.customer_first_name && (
                                            <div className="text-xs opacity-75 truncate">
                                              {job.customer_first_name} {job.customer_last_name}
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                      {dayJobs.length > 3 && (
                                        <div className="text-xs text-blue-600 text-center">
                                          +{dayJobs.length - 3} more
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderView = () => {
    switch (currentView) {
      case "day":
        return <DayView />
      case "week":
        return <WeekView />
      case "month":
        return <MonthView />
      case "availability":
        return <AvailabilityView />
      default:
        return <DayView />
    }
  }

  // Handle team member selection for availability view
  const handleSelectTeamMember = (memberId) => {
    setSelectedTeamMemberId(memberId)
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      
      <div className="flex-1 flex min-w-0 lg:ml-64 xl:ml-72 h-full">
        {/* Schedule Sidebar - Hidden on mobile, visible on desktop */}
        
        {/* Team Member Filter Sidebar - Only show in availability view */}
        {currentView === 'availability' && (
          <div className="hidden lg:block w-64 bg-gray-50 border-r border-gray-200 flex-shrink-0 overflow-y-auto">
            <div className="p-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">TEAM MEMBERS</h3>
              <div className="space-y-1">
                <button
                  onClick={() => handleSelectTeamMember(null)}
                  className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-2 ${
                    selectedTeamMemberId === null
                      ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                      : 'bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span className="truncate">All Team Members</span>
                </button>
                
                {teamMembers.map((member) => {
                  const isSelected = selectedTeamMemberId === member.id
                  const memberColor = member.color || '#3B82F6'
                  
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
                      <span className="truncate">{member.first_name} {member.last_name}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}
        
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden h-full">
          
          <div className="flex-1 flex flex-col overflow-hidden">
          <div className="border-b border-gray-200 bg-white flex-shrink-0">
            <div className="px-4 sm:px-6 py-4">
              <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                <div className="flex items-center space-x-4 relative">
                  <button
                    onClick={handleCreateJob}
                    className="w-10 h-10 bg-primary-600 text-white rounded-full flex items-center justify-center hover:bg-primary-700 transition-all duration-200 transform hover:scale-[1.02] focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                  <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Schedule</h1>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => navigateDate(-1)}
                      disabled={isNavigating}
                      className={`p-1 rounded transition-colors ${
                        isNavigating 
                          ? 'text-gray-300 cursor-not-allowed' 
                          : 'hover:bg-gray-100 text-gray-500'
                      }`}
                      title={isNavigating ? 'Please wait...' : 'Previous'}
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    
                    <button
                      onClick={() => setShowCalendarPicker(!showCalendarPicker)}
                      className="font-medium text-sm sm:text-base hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded transition-colors cursor-pointer"
                    >
                      {formatDate(currentDate, currentView)}
                    </button>
                    
                    <button
                      onClick={() => navigateDate(1)}
                      disabled={isNavigating}
                      className={`p-1 rounded transition-colors ${
                        isNavigating 
                          ? 'text-gray-300 cursor-not-allowed' 
                          : 'hover:bg-gray-100 text-gray-500'
                      }`}
                      title={isNavigating ? 'Please wait...' : 'Next'}
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                  
                  {/* Calendar Picker Dropdown */}
                  {showCalendarPicker && (
                    <div 
                      ref={calendarRef}
                      className="absolute top-full left-1/2 transform -translate-x-1/2 sm:left-0 sm:transform-none mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-3 sm:p-4 min-w-[280px] sm:min-w-[320px] max-w-[90vw] sm:max-w-none"
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
                          const isSelected = date.toDateString() === currentDate.toDateString()
                          
                          return (
                            <button
                              key={index}
                              onClick={() => {
                                setCurrentDate(date)
                                setShowCalendarPicker(false)
                              }}
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
                          onClick={() => {
                            setCurrentDate(new Date())
                            setShowCalendarPicker(false)
                          }}
                          className="text-xs sm:text-sm text-blue-600 hover:text-blue-700 font-medium px-2 py-1 rounded hover:bg-blue-50"
                        >
                          Today
                        </button>
                        <button
                          onClick={() => setShowCalendarPicker(false)}
                          className="text-xs sm:text-sm text-gray-500 hover:text-gray-700 font-medium px-2 py-1 rounded hover:bg-gray-50"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center space-x-2 sm:space-x-4">
                  {/* Mobile Filter Button - Show for availability view or when filters are active */}
                  {(currentView === 'availability' || (filters.status !== 'all' || filters.teamMember !== 'all' || filters.timeRange !== 'all' || filters.territory !== 'all')) && (
                    <button
                      onClick={() => setScheduleSidebarOpen(true)}
                      className={`lg:hidden p-2 rounded-lg transition-colors relative ${
                        currentView === 'availability' || (filters.status !== 'all' || filters.teamMember !== 'all' || filters.timeRange !== 'all' || filters.territory !== 'all')
                          ? 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                      title="Open filters"
                    >
                      <Filter className="w-5 h-5" />
                      {currentView === 'availability' && selectedTeamMemberId && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-600 rounded-full"></span>
                      )}
                      {(currentView !== 'availability' && (filters.status !== 'all' || filters.teamMember !== 'all' || filters.timeRange !== 'all' || filters.territory !== 'all')) && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-600 rounded-full"></span>
                      )}
                    </button>
                  )}
                  
                  {/* Desktop Filter Button - Only show for non-availability views */}
                  {currentView !== 'availability' && (
                    <button
                      onClick={() => setScheduleSidebarOpen(true)}
                      className={`lg:hidden p-2 rounded-lg transition-colors relative ${
                        (filters.status !== 'all' || filters.teamMember !== 'all' || filters.timeRange !== 'all' || filters.territory !== 'all')
                          ? 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                      title="Open filters"
                    >
                    <Filter className="w-5 h-5" />
                    {(filters.status !== 'all' || filters.teamMember !== 'all' || filters.timeRange !== 'all' || filters.territory !== 'all') && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-600 rounded-full"></span>
                    )}
                  </button>
                  )}

                  <div className="flex items-center space-x-1 sm:space-x-2">
                    <button
                      onClick={() => setCurrentView("day")}
                      className={`px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors ${
                        currentView === "day" ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      Day
                    </button>
                    <button
                      onClick={() => setCurrentView("week")}
                      className={`px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors ${
                        currentView === "week" ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      Week
                    </button>
                    <button
                      onClick={() => setCurrentView("month")}
                      className={`px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors ${
                        currentView === "month" ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      Month
                    </button>
                    <button
                      onClick={() => setCurrentView("availability")}
                      className={`px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors ${
                        currentView === "availability" ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      Availability
                    </button>
                  </div>
                  

                </div>
              </div>
            </div>
          </div>
          
          {renderView()}
        </div>
      </div>
      
      {/* Mobile Filter Sidebar Overlay */}
      {scheduleSidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setScheduleSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 flex max-w-xs w-full">
            <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
              <div className="absolute top-0 right-0 -mr-12 pt-2">
                <button
                  type="button"
                  className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                  onClick={() => setScheduleSidebarOpen(false)}
                >
                  <span className="sr-only">Close sidebar</span>
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
                <p className="text-sm text-gray-500">Filter your schedule view</p>
              </div>
              <div className="flex-1 overflow-y-auto">
                {currentView === 'availability' ? (
                  <div className="p-4">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">TEAM MEMBERS</h3>
                    <div className="space-y-1">
                      <button
                        onClick={() => {
                          handleSelectTeamMember(null)
                          setTimeout(() => setScheduleSidebarOpen(false), 300)
                        }}
                        className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-2 ${
                          selectedTeamMemberId === null
                            ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                            : 'bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      >
                        <Users className="w-4 h-4" />
                        <span className="truncate">All Team Members</span>
                      </button>
                      
                      {teamMembers.map((member) => {
                        const isSelected = selectedTeamMemberId === member.id
                        const memberColor = member.color || '#3B82F6'
                        
                        return (
                          <button
                            key={member.id}
                            onClick={() => {
                              handleSelectTeamMember(member.id)
                              setTimeout(() => setScheduleSidebarOpen(false), 300)
                            }}
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
                            <span className="truncate">{member.first_name} {member.last_name}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <ScheduleSidebar 
                    filters={filters}
                    onFilterChange={(filterType, value) => {
                      handleFilterChange(filterType, value)
                      // Auto-close sidebar on mobile after filter change
                      setTimeout(() => setScheduleSidebarOpen(false), 300)
                    }}
                    teamMembers={teamMembers}
                  />
                )}
              </div>
              <div className="flex-shrink-0 p-4 border-t border-gray-200">
                <button
                  onClick={() => setScheduleSidebarOpen(false)}
                  className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Close Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>


    </div>
  )
}

export default ServiceFlowSchedule
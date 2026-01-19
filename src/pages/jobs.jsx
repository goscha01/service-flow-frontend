import { useState, useEffect, useRef } from "react"
import Sidebar from "../components/sidebar"
import JobsEmptyState from "../components/jobs-empty-state"
import ExportJobsModal from "../components/export-jobs-modal"

import { Plus, AlertCircle, Loader2, Eye, Calendar, Clock, MapPin, Users, DollarSign, Phone, Mail, FileText, CheckCircle, XCircle, PlayCircle, PauseCircle, MoreVertical, Download, Upload, ChevronDown, Search, ChevronUp, User, SlidersHorizontal, Home, Briefcase, Megaphone, Bell, Menu, UserX, X, RotateCw } from "lucide-react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { jobsAPI, invoicesAPI, territoriesAPI, teamAPI } from "../services/api"
import { useAuth } from "../context/AuthContext"
import { canCreateJobs } from "../utils/roleUtils"
import { getImageUrl } from "../utils/imageUtils"
import MobileBottomNav from "../components/mobile-bottom-nav"
import MobileHeader from "../components/mobile-header"
import RecurringIndicator from "../components/recurring-indicator"

const ServiceFlowJobs = () => {
  const { user, loading: authLoading } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const tabFromUrl = searchParams.get('tab')
  const [activeTab, setActiveTab] = useState(tabFromUrl || "all")
  const width = window.innerWidth;
  const navigate = useNavigate()

  // Update activeTab when URL parameter changes
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab')
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  // API State
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState("")
  const [page, setPage] = useState(1)
  const [totalJobs, setTotalJobs] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [limit] = useState(50)
  const [showLoadMore, setShowLoadMore] = useState(true)
  const [territories, setTerritories] = useState([])
  const [teamMembers, setTeamMembers] = useState([])
  const [filters, setFilters] = useState({
    status: "",
    dateRange: "",
    dateFrom: "",
    dateTo: "",
    teamMember: "",
    customer: "",
    search: "",
    invoiceStatus: "",
    sortBy: "scheduled_date",
    sortOrder: "ASC", // Default to "Soonest"
    territoryId: "",
    paymentMethod: "",
    tag: "",
    recurring: ""
  })
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [showFilterModal, setShowFilterModal] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const searchInputRef = useRef(null)
  
  // Dropdown state
  const [openDropdown, setOpenDropdown] = useState(null)
  const tagDropdownRef = useRef(null)
  const paymentMethodDropdownRef = useRef(null)
  const invoiceStatusDropdownRef = useRef(null)
  const territoryDropdownRef = useRef(null)
  const assignedDropdownRef = useRef(null)
  const sortDropdownRef = useRef(null)
  const recurringDropdownRef = useRef(null)
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openDropdown) {
        const refs = {
          tag: tagDropdownRef,
          paymentMethod: paymentMethodDropdownRef,
          invoiceStatus: invoiceStatusDropdownRef,
          territory: territoryDropdownRef,
          assigned: assignedDropdownRef,
          sort: sortDropdownRef,
          recurring: recurringDropdownRef
        }
        const ref = refs[openDropdown]
        if (ref && ref.current && !ref.current.contains(event.target)) {
          setOpenDropdown(null)
        }
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [openDropdown])
  
  // Get initials from name
  const getInitials = (name) => {
    if (!name) return '?'
    const parts = name.trim().split(' ')
    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase()
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  const getFilterLabel = (type) => {
    switch (type) {
      case 'tag':
        return filters.tag || 'Tag'
      case 'paymentMethod':
        return filters.paymentMethod ? filters.paymentMethod.charAt(0).toUpperCase() + filters.paymentMethod.slice(1) : 'Payment method'
      case 'invoiceStatus':
        return filters.invoiceStatus ? filters.invoiceStatus.charAt(0).toUpperCase() + filters.invoiceStatus.slice(1) : 'Any invoice status'
      case 'territory':
        if (filters.territoryId) {
          const territory = territories.find(t => t.id.toString() === filters.territoryId)
          return territory ? territory.name : 'Territory'
        }
        return 'Territory'
      case 'assigned':
        if (filters.teamMember === 'unassigned') return 'Unassigned'
        if (filters.teamMember) {
          const member = teamMembers.find(m => m.id.toString() === filters.teamMember)
          if (member) {
            return member.name || `${member.first_name || ''} ${member.last_name || ''}`.trim() || `Member ${member.id}`
          }
        }
        return 'Assigned All'
      case 'sort':
        if (filters.sortBy === 'scheduled_date' && filters.sortOrder === 'ASC') return 'Sort by: Soonest'
        if (filters.sortBy === 'scheduled_date' && filters.sortOrder === 'DESC') return 'Sort by: Recent'
        if (filters.sortBy === 'total_amount' && filters.sortOrder === 'DESC') return 'Sort by: Highest Amount'
        if (filters.sortBy === 'total_amount' && filters.sortOrder === 'ASC') return 'Sort by: Lowest Amount'
        return 'Sort by: Soonest'
      case 'recurring':
        if (filters.recurring === 'recurring') return 'Recurring Only'
        if (filters.recurring === 'one-time') return 'One-Time Only'
        return 'All Jobs'
      default:
        return ''
    }
  }

  // Reset page and jobs when filters or tab change (except search which is debounced)
  useEffect(() => {
    setPage(1)
    setJobs([])
    setHasMore(true)
    setShowLoadMore(true)
  }, [activeTab, filters.status, filters.teamMember, filters.invoiceStatus, filters.sortBy, filters.sortOrder, filters.territoryId, filters.paymentMethod, filters.tag, filters.dateFrom, filters.dateTo, filters.recurring])

  // Load more button handler
  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      setPage(prev => prev + 1)
    }
  }

  // Infinite scroll handler (optional - disabled for now, using button instead)
  // useEffect(() => {
  //   const handleScroll = (e) => {
  //     const target = e.target
  //     if (!target) return

  //     const { scrollTop, scrollHeight, clientHeight } = target

  //     // Load more when scrolled to bottom (with 100px threshold)
  //     if (scrollHeight - scrollTop - clientHeight < 100 && !loadingMore && hasMore) {
  //       setPage(prev => prev + 1)
  //     }
  //   }

  //   const scrollContainer = document.querySelector('.jobs-scroll-container')
  //   if (scrollContainer) {
  //     scrollContainer.addEventListener('scroll', handleScroll)
  //     return () => scrollContainer.removeEventListener('scroll', handleScroll)
  //   }
  // }, [loadingMore, hasMore])

  // Fetch territories and team members
  useEffect(() => {
    if (!authLoading && user?.id) {
      const fetchTerritoriesData = async () => {
        try {
          const territoriesResponse = await territoriesAPI.getAll(user.id, { page: 1, limit: 1000 })
          const territoriesList = territoriesResponse.territories || territoriesResponse || []
          setTerritories(Array.isArray(territoriesList) ? territoriesList : [])
        } catch (error) {
          console.error('Error fetching territories:', error)
          setTerritories([])
        }
      }

      const fetchTeamMembersData = async () => {
        try {
          const teamResponse = await teamAPI.getAll(user.id, { page: 1, limit: 1000 })
          const members = teamResponse.teamMembers || teamResponse || []
          // Filter to only active team members
          const activeMembers = Array.isArray(members) 
            ? members.filter(member => member.status === 'active' || !member.status || member.status !== 'inactive')
            : []
          setTeamMembers(activeMembers)
        } catch (error) {
          console.error('Error fetching team members:', error)
          setTeamMembers([])
        }
      }

      fetchTerritoriesData()
      fetchTeamMembersData()
    }
  }, [user?.id, authLoading])

  // Track previous search value to detect search-only changes
  const prevSearchRef = useRef(filters.search)

  // Fetch jobs when filters, tab, or page changes
  useEffect(() => {
    if (!authLoading && user?.id) {
      const isSearchOnlyChange = prevSearchRef.current !== filters.search && 
        prevSearchRef.current !== undefined
      
      // Debounce only search changes, apply other filters immediately
      const delay = isSearchOnlyChange ? 300 : 0
      
      prevSearchRef.current = filters.search
      
      const timeoutId = setTimeout(() => {
        fetchJobs()
      }, delay)

      return () => clearTimeout(timeoutId)
    } else if (!authLoading && !user?.id) {
      // If auth is done loading but no user, redirect to signin
      navigate('/signin')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, filters, user?.id, authLoading, page])

  const fetchJobs = async () => {
    if (!user?.id) return
    // Don't check hasMore here - let the API call determine if there are more results
    // hasMore check should only apply when loading more pages (page > 1)

    try {
      if (page === 1) {
        setLoading(true)
      } else {
        setLoadingMore(true)
      }
      setError("")

      // Map tab to status filter and date logic
      let statusFilter = ""
      let dateFilter = ""

      // Build date range from filters (will be overridden by tab-specific logic if needed)
      let dateRangeForAPI = filters.dateRange
      if (filters.dateFrom || filters.dateTo) {
        // Use the date range picker values
        dateRangeForAPI = filters.dateFrom && filters.dateTo 
          ? `${filters.dateFrom} to ${filters.dateTo}`
          : filters.dateFrom || filters.dateTo
      }

      // If "Soonest" sort is selected, filter for today's jobs
      if (filters.sortBy === 'scheduled_date' && filters.sortOrder === 'ASC') {
        const today = new Date()
        const todayStr = today.toISOString().split('T')[0]
        dateRangeForAPI = `${todayStr} to ${todayStr}` // Filter for today only
      }

      switch (activeTab) {
        case "upcoming":
          statusFilter = "confirmed,in_progress"
          dateFilter = "future" // Jobs scheduled for today and future
          break
        case "past":
          // For past tab, don't filter by status - show all past jobs regardless of status
          statusFilter = ""
          dateFilter = "past" // Jobs before today (yesterday and earlier)
          break
        case "complete":
          statusFilter = "completed"
          break
        case "incomplete":
          statusFilter = "confirmed,in_progress"
          break
        case "canceled":
          statusFilter = "cancelled"
          break
        case "daterange":
          // Date range will be handled by filters.dateRange (already set above)
          statusFilter = ""
          break
        case "all":
        default:
          statusFilter = ""
          break
      }
      
      // Call jobsAPI with individual parameters
      const response = await jobsAPI.getAll(
        user.id,
        statusFilter,
        filters.search,
        page,
        limit,
        dateFilter,
        dateRangeForAPI,
        filters.sortBy,
        filters.sortOrder,
        filters.teamMember,
        filters.invoiceStatus,
        undefined, // customerId
        filters.territoryId, // pass territoryId to API
        filters.recurring // pass recurring filter to API
      )

      const newJobs = response.jobs || []
      // Backend returns total in pagination object
      const total = response.pagination?.total || response.total || response.jobs?.length || 0

      // Append new jobs to existing ones
      if (page === 1) {
        setJobs(newJobs)
      } else {
        setJobs(prev => [...prev, ...newJobs])
      }

      setTotalJobs(total)
      // Fix pagination: check if we have more jobs to load
      const currentTotal = page === 1 ? newJobs.length : jobs.length + newJobs.length
      const hasMoreJobs = currentTotal < total && newJobs.length === limit
      setHasMore(hasMoreJobs)
      setShowLoadMore(hasMoreJobs)
    } catch (error) {
      console.error('Error fetching jobs:', error)
      setError("Failed to load jobs. Please try again.")
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  const handleCreateJob = () => {
    console.log('🔄 Jobs: Create job button clicked');
    navigate('/createjob')
  }

  const handleImportJobs = () => {
    navigate('/import-jobs')
  }

  const handleExportJobs = () => {
    setIsExportModalOpen(true)
  }

  const handleViewJob = (job) => {
    navigate(`/job/${job.id}`)
  }

  const handleViewCustomer = (customerId) => {
    navigate(`/customer/${customerId}`)
  }

  const handleRetry = () => {
    setError("")
    fetchJobs()
  }

  const formatDate = (dateString) => {
    if (!dateString) {
      return { weekday: undefined, monthName: undefined, day: undefined, year: undefined, isValid: false }
    }

    try {
      // Extract date part only (YYYY-MM-DD) to avoid timezone issues
      let jobDateString = ''
      if (dateString.includes('T')) {
        // ISO format: 2025-08-20T09:00:00
        jobDateString = dateString.split('T')[0]
      } else {
        // Space format: 2025-08-20 09:00:00
        jobDateString = dateString.split(' ')[0]
      }

      // Use the stored date directly without creating Date objects to avoid timezone conversion
      const [year, month, day] = jobDateString.split('-')

      // Validate that we have all three parts
      if (!year || !month || !day) {
        return { weekday: undefined, monthName: undefined, day: undefined, year: undefined, isValid: false }
      }

      // Create weekday names array
      const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

      // Calculate weekday using Zeller's congruence to avoid Date object
      const y = parseInt(year, 10)
      const m = parseInt(month, 10)
      const d = parseInt(day, 10)

      // Validate parsed values
      if (isNaN(y) || isNaN(m) || isNaN(d) || m < 1 || m > 12 || d < 1 || d > 31) {
        return { weekday: undefined, monthName: undefined, day: undefined, year: undefined, isValid: false }
      }

      // Adjust month for Zeller's congruence (March = 1, February = 12)
      let adjustedMonth = m
      let adjustedYear = y
      if (m < 3) {
        adjustedMonth = m + 12
        adjustedYear = y - 1
      }

      const k = adjustedYear % 100
      const j = Math.floor(adjustedYear / 100)
      const h = (d + Math.floor((13 * (adjustedMonth + 1)) / 5) + k + Math.floor(k / 4) + Math.floor(j / 4) - 2 * j) % 7

      const weekdayIndex = ((h + 5) % 7) // Adjust for Sunday = 0
      const weekday = weekdays[weekdayIndex]
      const monthName = months[m - 1]

      // Validate that we got valid values
      if (!weekday || !monthName || isNaN(d) || isNaN(y)) {
        return { weekday: undefined, monthName: undefined, day: undefined, year: undefined, isValid: false }
      }

      return { weekday, monthName, day: d, year: y, isValid: true }
    } catch (error) {
      console.error('Error formatting date:', dateString, error)
      return { weekday: undefined, monthName: undefined, day: undefined, year: undefined, isValid: false }
    }
  }

  const formatTime = (dateString) => {
    if (!dateString) return 'Time not set'

    try {
      // Handle both ISO format (2025-08-20T09:00:00) and space format (2025-08-20 09:00:00)
      let timePart = ''
      if (dateString.includes('T')) {
        // ISO format: 2025-08-20T09:00:00
        timePart = dateString.split('T')[1]
      } else {
        // Space format: 2025-08-20 09:00:00 or 12/20/2025 02:00 PM:00
        const parts = dateString.split(' ')
        // Find the time part (usually the second part, but could be later if date has spaces)
        // Look for pattern like "HH:MM" or "HH:MM:SS" or "HH:MM AM/PM"
        for (let i = 1; i < parts.length; i++) {
          if (parts[i].match(/^\d{1,2}:\d{2}/)) {
            timePart = parts.slice(i).join(' ')
            break
          }
        }
      }

      if (!timePart) return 'Time not set'

      // Check if time already has AM/PM (incorrectly stored format like "02:00 PM:00")
      const ampmMatch = timePart.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm|AM|PM)/i)
      if (ampmMatch) {
        // Already has AM/PM, just clean it up and return
        const hour = parseInt(ampmMatch[1], 10)
        const minute = ampmMatch[2]
        const ampm = ampmMatch[4].toUpperCase()
        return `${hour}:${minute} ${ampm}`
      }

      // Normal format: HH:MM:SS or HH:MM
      const timeParts = timePart.split(':')
      if (timeParts.length < 2) return 'Time not set'

      const hour = parseInt(timeParts[0], 10)
      const minute = parseInt(timeParts[1], 10)

      if (isNaN(hour) || isNaN(minute)) return 'Time not set'

      // Convert to 12-hour format
      const ampm = hour >= 12 ? 'PM' : 'AM'
      const displayHour = hour % 12 || 12
      const displayMinute = minute.toString().padStart(2, '0')

      return `${displayHour}:${displayMinute} ${ampm}`
    } catch (error) {
      console.error('Error formatting time:', dateString, error)
      return 'Time not set'
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-50 text-green-700 border-green-200'
      case 'in_progress': return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'confirmed': return 'bg-purple-50 text-purple-700 border-purple-200'
      case 'cancelled': return 'bg-red-50 text-red-700 border-red-200'
      default: return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  const isJobPast = (job) => {
    if (!job.scheduled_date) return false
    const scheduledDate = new Date(job.scheduled_date)
    const now = new Date()
    return scheduledDate < now
  }

  const getStatusLabel = (status, job = null) => {
    // If job is past scheduled time and not completed, show "Late"
    if (job && isJobPast(job) && status !== 'completed' && status !== 'cancelled') {
      return 'Late'
    }
    return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0)
  }

  // Group jobs by date for mobile view
  const groupJobsByDate = (jobs) => {
    const groups = {}
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    jobs.forEach(job => {
      if (!job.scheduled_date) {
        if (!groups['No Date']) groups['No Date'] = []
        groups['No Date'].push(job)
        return
      }

      try {
        const jobDate = new Date(job.scheduled_date)
        if (isNaN(jobDate.getTime())) {
          // Invalid date
          if (!groups['No Date']) groups['No Date'] = []
          groups['No Date'].push(job)
          return
        }
        
        jobDate.setHours(0, 0, 0, 0)
        
        let dateKey = ''
        if (jobDate.getTime() === today.getTime()) {
          dateKey = 'TODAY'
        } else if (jobDate.getTime() === yesterday.getTime()) {
          const dateInfo = formatDate(job.scheduled_date)
          // Check if formatDate returned an object with the expected properties
          if (typeof dateInfo === 'object' && dateInfo !== null && dateInfo.monthName && dateInfo.day !== undefined) {
            dateKey = `YESTERDAY, ${dateInfo.monthName.toUpperCase()} ${dateInfo.day}`
          } else {
            // Fallback to formatted date string
            dateKey = 'YESTERDAY'
          }
        } else {
          const dateInfo = formatDate(job.scheduled_date)
          // Check if formatDate returned an object with the expected properties
          if (typeof dateInfo === 'object' && dateInfo !== null && dateInfo.weekday && dateInfo.monthName && dateInfo.day !== undefined) {
            dateKey = `${dateInfo.weekday.toUpperCase()}, ${dateInfo.monthName.toUpperCase()} ${dateInfo.day}`
          } else {
            // Fallback: use a formatted date string
            const fallbackDate = jobDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
            dateKey = fallbackDate.toUpperCase()
          }
        }

        if (!groups[dateKey]) groups[dateKey] = []
        groups[dateKey].push(job)
      } catch (error) {
        // If there's any error parsing the date, add to "No Date" group
        console.error('Error parsing date for job:', job.id, error)
        if (!groups['No Date']) groups['No Date'] = []
        groups['No Date'].push(job)
      }
    })

    return groups
  }

  // Format time range for mobile view
  const formatTimeRange = (dateString) => {
    if (!dateString) return 'Time not set'
    const time = formatTime(dateString)
    // For now, just show the time. You can extend this to show a range if you have end time
    return time
  }

  // Get assigned team member name
  const getAssignedMemberName = (job) => {
    if (job.team_assignments && job.team_assignments.length > 0) {
      const member = job.team_assignments[0]
      if (member.first_name && member.last_name) {
        return `${member.first_name} ${member.last_name}`
      } else if (member.name) {
        return member.name
      } else if (member.first_name) {
        return member.first_name
      } else if (member.email) {
        return member.email
      }
    }
    return null
  }

  // Get assigned count
  const getAssignedCount = (job) => {
    const assigned = job.team_assignments?.length || 0
    const needed = job.workers_needed || 1
    return `${assigned}/${needed}`
  }

  // Show loading spinner while auth is loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  const tabs = [
    { id: "all", label: "All Jobs" },
    { id: "upcoming", label: "Upcoming" },
    { id: "past", label: "Past" },
    { id: "complete", label: "Complete" },
    { id: "incomplete", label: "Incomplete" },
    { id: "canceled", label: "Canceled" },
    { id: "daterange", label: "Date Range" }
  ]

  return (
    <div className="flex h-screen overflow-hidden" style={{ maxWidth: '100vw', width: '100%', overflowX: 'hidden' }}>
    
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
        {/* Mobile Header */}
        <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-white">
          <MobileHeader pageTitle="Jobs" />
        </div>

        {/* Desktop Header */}
        <div className="hidden lg:flex bg-white border-b border-gray-200 px-4 pt-2 pb-2 items-center justify-between">
          <h1 className="text-3xl font-semibold text-gray-900" style={{fontFamily: 'Montserrat', fontWeight: 700}}>Jobs</h1>
          <div className="flex items-center gap-2">
            {canCreateJobs(user) && (
              <>
                <button
                  onClick={handleImportJobs}
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                  style={{fontFamily: 'Montserrat', fontWeight: 500}}
                >
                  <Upload className="w-4 h-4" />
                  Import
                </button>
                <button
                  onClick={handleExportJobs}
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                  style={{fontFamily: 'Montserrat', fontWeight: 500}}
                >
                  <Download className="w-4 h-4" />
                  Export
                </button>
              </>
            )}
            {canCreateJobs(user) && (
              <button
                onClick={handleCreateJob}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                style={{fontFamily: 'Montserrat', fontWeight: 500}}
              >
                Create Job
              </button>
            )}
          </div>
        </div>

        {/* Mobile Header Content */}
        <div className="lg:hidden bg-white border-b border-gray-200 fixed top-[73px] left-0 right-0 z-20">
          <div className="flex items-center justify-between px-4 py-3">
            {/* Title - Centered */}
            <h1 className="text-xl font-bold text-gray-900 flex-1 text-center" style={{fontFamily: 'Montserrat', fontWeight: 700}}>Jobs</h1>
            
            {/* Search and Filter Icons */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setShowSearch(true)
                  setTimeout(() => {
                    if (searchInputRef.current) {
                      searchInputRef.current.focus()
                    }
                  }, 100)
                }}
                className="p-2 text-gray-600 hover:text-gray-900"
              >
                <Search className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowFilterModal(true)}
                className="p-2 text-gray-600 hover:text-gray-900"
              >
                <SlidersHorizontal className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border-b border-red-200 px-6 py-4">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <p className="text-red-700">{error}</p>
              </div>
              <button
                onClick={handleRetry}
                className="mt-2 text-red-600 hover:text-red-700 text-sm font-medium"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {/* Mobile Search Bar */}
        {showSearch && (
          <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 sticky top-[73px] z-10">
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search jobs..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  style={{fontFamily: 'Montserrat', fontWeight: 400}}
                />
              </div>
              <button
                onClick={() => {
                  setShowSearch(false)
                  setFilters(prev => ({ ...prev, search: '' }))
                }}
                className="text-sm text-gray-600 font-medium px-2"
                style={{fontFamily: 'Montserrat', fontWeight: 500}}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className={`bg-white border-b border-gray-200 lg:hidden sticky ${showSearch ? 'top-[133px]' : 'top-[73px]'} z-10 w-full transition-all`} style={{ maxWidth: '100vw', overflowX: 'auto' }}>
          <div className="flex space-x-2 overflow-x-auto scrollbar-hide px-4" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch', maxWidth: '100%' }}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id)
                  setSearchParams({ tab: tab.id })
                }}
                className={`py-3 border-b-2 font-medium text-sm transition-colors whitespace-nowrap flex-shrink-0 ${
                  activeTab === tab.id
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
                }`}
                style={{fontFamily: 'Montserrat', fontWeight: 700}}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Desktop Tabs */}
        <div className="hidden lg:block bg-white border-b border-gray-200 px-4">
          <div className="flex space-x-2 overflow-x-auto scrollbar-hide -mx-4 px-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id)
                  setSearchParams({ tab: tab.id })
                }}
                className={`py-3 border-b-2 font-medium text-sm transition-colors whitespace-nowrap flex-shrink-0 ${
                  activeTab === tab.id
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
                }`}
                style={{fontFamily: 'Montserrat', fontWeight: 700}}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search and Filters - Desktop Only */}
        <div className="hidden lg:block bg-white border-b border-gray-200 px-4 lg:px-8 py-4">
          <div className="flex w-full items-center flex-col justify-between gap-4">
            {/* Search */}
            <div className="flex w-full">
            <div className="flex-1 w-full relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search jobs..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Date Range Picker - Show when Date Range tab is active */}
            {activeTab === 'daterange' && (
              <div className="mb-4 flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <label className="text-sm font-medium text-gray-700">From:</label>
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">To:</label>
                  <input
                    type="date"
                    value={filters.dateTo}
                    min={filters.dateFrom}
                    onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                {(filters.dateFrom || filters.dateTo) && (
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, dateFrom: '', dateTo: '' }))}
                    className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800"
                  >
                    Clear
                  </button>
                )}
              </div>
            )}
            </div>
            {/* Filter Buttons */}
            <div className="w-full lg:flex flex flex-row flex-wrap items-center gap-2 pb-2 lg:pb-0">
              {/* Tag Filter */}
              <div className="relative" ref={tagDropdownRef}>
                <button
                  onClick={() => setOpenDropdown(openDropdown === 'tag' ? null : 'tag')}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full text-sm font-medium hover:bg-gray-200 transition-colors flex items-center gap-2 whitespace-nowrap"
                >
                  {getFilterLabel('tag')}
                  {openDropdown === 'tag' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {openDropdown === 'tag' && (
                  <div className="absolute top-full mt-1 right-0 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[160px] z-50">
                    <button
                      onClick={() => {
                        setFilters(prev => ({ ...prev, tag: '' }))
                        setOpenDropdown(null)
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${!filters.tag ? 'text-blue-600 font-medium' : 'text-gray-700'}`}
                    >
                      Tag
                    </button>
                  </div>
                )}
              </div>

              {/* Payment Method Filter */}
              <div className="relative" ref={paymentMethodDropdownRef}>
                <button
                  onClick={() => setOpenDropdown(openDropdown === 'paymentMethod' ? null : 'paymentMethod')}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full text-sm font-medium hover:bg-gray-200 transition-colors flex items-center gap-2 whitespace-nowrap"
                >
                  {getFilterLabel('paymentMethod')}
                  {openDropdown === 'paymentMethod' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {openDropdown === 'paymentMethod' && (
                  <div className="absolute top-full mt-1 right-0 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[180px] z-50">
                    <button
                      onClick={() => {
                        setFilters(prev => ({ ...prev, paymentMethod: '' }))
                        setOpenDropdown(null)
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${!filters.paymentMethod ? 'text-blue-600 font-medium' : 'text-gray-700'}`}
                    >
                      Payment method
                    </button>
                    <button
                      onClick={() => {
                        setFilters(prev => ({ ...prev, paymentMethod: 'card' }))
                        setOpenDropdown(null)
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${filters.paymentMethod === 'card' ? 'text-blue-600 font-medium' : 'text-gray-700'}`}
                    >
                      Card
                    </button>
                    <button
                      onClick={() => {
                        setFilters(prev => ({ ...prev, paymentMethod: 'cash' }))
                        setOpenDropdown(null)
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${filters.paymentMethod === 'cash' ? 'text-blue-600 font-medium' : 'text-gray-700'}`}
                    >
                      Cash
                    </button>
                    <button
                      onClick={() => {
                        setFilters(prev => ({ ...prev, paymentMethod: 'check' }))
                        setOpenDropdown(null)
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${filters.paymentMethod === 'check' ? 'text-blue-600 font-medium' : 'text-gray-700'}`}
                    >
                      Check
                    </button>
                  </div>
                )}
              </div>

              {/* Invoice Status Filter */}
              <div className="relative" ref={invoiceStatusDropdownRef}>
                <button
                  onClick={() => setOpenDropdown(openDropdown === 'invoiceStatus' ? null : 'invoiceStatus')}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full text-sm font-medium hover:bg-gray-200 transition-colors flex items-center gap-2 whitespace-nowrap"
                >
                  {getFilterLabel('invoiceStatus')}
                  {openDropdown === 'invoiceStatus' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {openDropdown === 'invoiceStatus' && (
                  <div className="absolute top-full mt-1 right-0 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[200px] z-50">
                    <button
                      onClick={() => {
                        setFilters(prev => ({ ...prev, invoiceStatus: '' }))
                        setOpenDropdown(null)
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${!filters.invoiceStatus ? 'text-blue-600 font-medium' : 'text-gray-700'}`}
                    >
                      Any invoice status
                    </button>
                    <button
                      onClick={() => {
                        setFilters(prev => ({ ...prev, invoiceStatus: 'unpaid' }))
                        setOpenDropdown(null)
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${filters.invoiceStatus === 'unpaid' ? 'text-blue-600 font-medium' : 'text-gray-700'}`}
                    >
                      Unpaid
                    </button>
                    <button
                      onClick={() => {
                        setFilters(prev => ({ ...prev, invoiceStatus: 'paid' }))
                        setOpenDropdown(null)
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${filters.invoiceStatus === 'paid' ? 'text-blue-600 font-medium' : 'text-gray-700'}`}
                    >
                      Paid
                    </button>
                  </div>
                )}
              </div>

              {/* Territory Filter */}
              <div className="relative" ref={territoryDropdownRef}>
                <button
                  onClick={() => setOpenDropdown(openDropdown === 'territory' ? null : 'territory')}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full text-sm font-medium hover:bg-gray-200 transition-colors flex items-center gap-2 whitespace-nowrap"
                >
                  {getFilterLabel('territory')}
                  {openDropdown === 'territory' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {openDropdown === 'territory' && (
                  <div className="absolute top-full mt-1 right-0 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[180px] z-50 max-h-60 overflow-y-auto">
                    <button
                      onClick={() => {
                        setFilters(prev => ({ ...prev, territoryId: '' }))
                        setOpenDropdown(null)
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${!filters.territoryId ? 'text-blue-600 font-medium' : 'text-gray-700'}`}
                    >
                      All
                    </button>
                    {territories.map((territory) => (
                      <button
                        key={territory.id}
                        onClick={() => {
                          setFilters(prev => ({ ...prev, territoryId: territory.id.toString() }))
                          setOpenDropdown(null)
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${filters.territoryId === territory.id.toString() ? 'text-blue-600 font-medium' : 'text-gray-700'}`}
                      >
                        {territory.name || `Territory ${territory.id}`}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Recurring Filter */}
              <div className="relative" ref={recurringDropdownRef}>
                <button
                  onClick={() => setOpenDropdown(openDropdown === 'recurring' ? null : 'recurring')}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full text-sm font-medium hover:bg-gray-200 transition-colors flex items-center gap-2 whitespace-nowrap"
                >
                  {getFilterLabel('recurring')}
                  {openDropdown === 'recurring' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {openDropdown === 'recurring' && (
                  <div className="absolute top-full mt-1 right-0 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[180px] z-50">
                    <button
                      onClick={() => {
                        setFilters(prev => ({ ...prev, recurring: '' }))
                        setOpenDropdown(null)
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${!filters.recurring ? 'text-blue-600 font-medium' : 'text-gray-700'}`}
                    >
                      All Jobs
                    </button>
                    <button
                      onClick={() => {
                        setFilters(prev => ({ ...prev, recurring: 'recurring' }))
                        setOpenDropdown(null)
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${filters.recurring === 'recurring' ? 'text-blue-600 font-medium' : 'text-gray-700'}`}
                    >
                      Recurring Only
                    </button>
                    <button
                      onClick={() => {
                        setFilters(prev => ({ ...prev, recurring: 'one-time' }))
                        setOpenDropdown(null)
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${filters.recurring === 'one-time' ? 'text-blue-600 font-medium' : 'text-gray-700'}`}
                    >
                      One-Time Only
                    </button>
                  </div>
                )}
              </div>

              {/* Assigned Filter */}
              <div className="relative" ref={assignedDropdownRef}>
                <button
                  onClick={() => setOpenDropdown(openDropdown === 'assigned' ? null : 'assigned')}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full text-sm font-medium hover:bg-gray-200 transition-colors flex items-center gap-2 whitespace-nowrap"
                >
                  {getFilterLabel('assigned')}
                  {openDropdown === 'assigned' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {openDropdown === 'assigned' && (
                  <div className="absolute top-full mt-1 right-0 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[180px] z-50 max-h-60 overflow-y-auto">
                    <button
                      onClick={() => {
                        setFilters(prev => ({ ...prev, teamMember: '' }))
                        setOpenDropdown(null)
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${!filters.teamMember ? 'text-blue-600 font-medium' : 'text-gray-700'}`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => {
                        setFilters(prev => ({ ...prev, teamMember: 'unassigned' }))
                        setOpenDropdown(null)
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${filters.teamMember === 'unassigned' ? 'text-blue-600 font-medium' : 'text-gray-700'}`}
                    >
                      Unassigned
                    </button>
                    {teamMembers.map((member) => {
                      const memberName = member.name || `${member.first_name || ''} ${member.last_name || ''}`.trim() || `Member ${member.id}`
                      return (
                        <button
                          key={member.id}
                          onClick={() => {
                            setFilters(prev => ({ ...prev, teamMember: member.id.toString() }))
                            setOpenDropdown(null)
                          }}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${filters.teamMember === member.id.toString() ? 'text-blue-600 font-medium' : 'text-gray-700'}`}
                        >
                          {memberName}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Sort Filter */}
              <div className="relative" ref={sortDropdownRef}>
                <button
                  onClick={() => setOpenDropdown(openDropdown === 'sort' ? null : 'sort')}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full text-sm font-medium hover:bg-gray-200 transition-colors flex items-center gap-2 whitespace-nowrap"
                >
                  {getFilterLabel('sort')}
                  {openDropdown === 'sort' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {openDropdown === 'sort' && (
                  <div className="absolute top-full mt-1 right-0 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[200px] z-50">
                    <button
                      onClick={() => {
                        setFilters(prev => ({ ...prev, sortBy: 'scheduled_date', sortOrder: 'ASC' }))
                        setOpenDropdown(null)
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${filters.sortBy === 'scheduled_date' && filters.sortOrder === 'ASC' ? 'text-blue-600 font-medium' : 'text-gray-700'}`}
                    >
                      Sort by: Soonest
                    </button>
                    <button
                      onClick={() => {
                        setFilters(prev => ({ ...prev, sortBy: 'scheduled_date', sortOrder: 'DESC' }))
                        setOpenDropdown(null)
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${filters.sortBy === 'scheduled_date' && filters.sortOrder === 'DESC' ? 'text-blue-600 font-medium' : 'text-gray-700'}`}
                    >
                      Sort by: Recent
                    </button>
                    <button
                      onClick={() => {
                        setFilters(prev => ({ ...prev, sortBy: 'total_amount', sortOrder: 'DESC' }))
                        setOpenDropdown(null)
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${filters.sortBy === 'total_amount' && filters.sortOrder === 'DESC' ? 'text-blue-600 font-medium' : 'text-gray-700'}`}
                    >
                      Sort by: Highest Amount
                    </button>
                    <button
                      onClick={() => {
                        setFilters(prev => ({ ...prev, sortBy: 'total_amount', sortOrder: 'ASC' }))
                        setOpenDropdown(null)
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${filters.sortBy === 'total_amount' && filters.sortOrder === 'ASC' ? 'text-blue-600 font-medium' : 'text-gray-700'}`}
                    >
                      Sort by: Lowest Amount
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Jobs List */}
        <div className="flex-1 overflow-auto bg-white lg:bg-gray-50 jobs-scroll-container pb-28 lg:pb-0 pt-[140px] lg:pt-0" style={{ maxWidth: '100%', width: '100%' }}>
          <div className="" style={{ maxWidth: '100%' }}>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Loading jobs...</span>
              </div>
            ) : jobs.length === 0 ? (
              <JobsEmptyState activeTab={activeTab} onCreateJob={handleCreateJob} />
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden lg:block bg-white border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                    <thead style={{fontFamily: 'Montserrat', fontWeight: 700}} className="bg-white">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Job
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Customer
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Assignee(s)
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Job Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {jobs.map((job) => {
                        const dateInfo = formatDate(job.scheduled_date)
                        // Format date string safely
                        const dateDisplay = (dateInfo.isValid && dateInfo.weekday && dateInfo.monthName && dateInfo.day !== undefined && dateInfo.year !== undefined)
                          ? `${dateInfo.weekday} - ${dateInfo.monthName} ${dateInfo.day}, ${dateInfo.year}`
                          : (job.scheduled_date ? 'Invalid date' : 'Date not set')
                        
                        return (
                          <tr
                            key={job.id}
                            className="hover:bg-gray-50 cursor-pointer transition-colors"
                            onClick={() => handleViewJob(job)}
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex flex-col">
                                <span style={{fontFamily: 'Montserrat', fontWeight: 500}} className="text-sm  font-medium text-blue-500">
                                  {dateDisplay}
                                </span>
                                <span style={{fontFamily: 'Montserrat', fontWeight: 500}} className="text-xs text-gray-600">
                                  {job.scheduled_date ? formatTime(job.scheduled_date) : 'Time not set'}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                  <span style={{fontFamily: 'Montserrat', fontWeight: 500}} className="text-sm capitalize font-medium text-gray-900">
                                    {job.service_name || 'Service'}
                                  </span>
                                  <RecurringIndicator
                                    isRecurring={job.is_recurring === true || job.is_recurring === 'true' || job.is_recurring === 1 || job.is_recurring === '1'}
                                    frequency={job.recurring_frequency}
                                    scheduledDate={job.scheduled_date}
                                    size="sm"
                                    showText={false}
                                  />
                                </div>
                                <span style={{fontFamily: 'Montserrat', fontWeight: 500}} className="text-xs text-gray-500">
                                  Job #{job.id}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex flex-col">
                                <span style={{fontFamily: 'Montserrat', fontWeight: 500}} className="text-sm font-medium text-gray-900">
                                  {job.customer_first_name && job.customer_last_name
                                    ? `${job.customer_first_name} ${job.customer_last_name}`
                                    : job.customer_email
                                    ? job.customer_email
                                    : 'Customer Name'
                                  }
                                </span>
                                <span style={{fontFamily: 'Montserrat', fontWeight: 500}} className="text-xs text-gray-500">
                                  {job.customer_city && job.customer_state
                                    ? `${job.customer_city}, ${job.customer_state}`
                                    : 'Location not specified'
                                  }
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-gray-400" />
                                <span style={{fontFamily: 'Montserrat', fontWeight: 500}} className="text-xs text-gray-600">
                                  {getAssignedCount(job)} assigned
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span style={{fontFamily: 'Montserrat', fontWeight: 500}} className={`inline-flex items-center px-3 py-1 rounded-l-sm rounded-r-xl text-xs font-medium border ${getStatusLabel(job.status || 'scheduled', job) === 'Late' ? 'bg-orange-50 text-orange-700 border-orange-200' : getStatusColor(job.status)}`}>
                                {getStatusLabel(job.status || 'scheduled', job)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex flex-row space-x-1 items-center">
                                <span style={{fontFamily: 'Montserrat', fontWeight: 500}} className="text-sm font-semibold text-gray-900">
                                  {formatCurrency(job.total_amount || job.service_price || 0)}
                                </span>
                                <span style={{fontFamily: 'Montserrat', fontWeight: 500}} className="flex px-2 text-xs text-gray-700 bg-gray-100 px-2 py-1 rounded-sm">
                                  {job.invoice_status === 'paid' ? 'Paid' :
                                   job.invoice_status === 'unpaid' ? 'Unpaid' :
                                   job.invoice_status === 'invoiced' ? 'Invoiced' :
                                   'No invoice'}
                                </span>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  </div>
                </div>

                {/* Mobile Card View */}
                <div className="lg:hidden bg-white pb-28">
                  {(() => {
                    const groupedJobs = groupJobsByDate(jobs)
                    const dateKeys = Object.keys(groupedJobs).sort((a, b) => {
                      if (a === 'TODAY') return -1
                      if (b === 'TODAY') return 1
                      if (a === 'YESTERDAY') return -1
                      if (b === 'YESTERDAY') return 1
                      if (a === 'No Date') return 1
                      if (b === 'No Date') return -1
                      return a.localeCompare(b)
                    })

                    return dateKeys.map((dateKey) => (
                      <div key={dateKey} className="mb-6">
                        {/* Date Header */}
                        <div className="px-4 py-2 bg-gray-50">
                          <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider" style={{fontFamily: 'Montserrat', fontWeight: 700}}>
                            {dateKey}
                          </h3>
                        </div>

                        {/* Job Cards */}
                        <div className="space-y-0">
                          {groupedJobs[dateKey].map((job) => {
                            const assignedMember = getAssignedMemberName(job)
                            const assignedCount = getAssignedCount(job)
                            const statusLabel = getStatusLabel(job.status || 'scheduled', job)
                            const isLate = statusLabel === 'Late'
                            
                            // Get time range - if we have duration, calculate end time
                            let timeRange = formatTime(job.scheduled_date)
                            if (job.scheduled_date && job.service_duration) {
                              try {
                                const startTime = new Date(job.scheduled_date)
                                // Check if startTime is valid
                                if (!isNaN(startTime.getTime())) {
                                  const endTime = new Date(startTime.getTime() + (job.service_duration * 60000))
                                  // Check if endTime is valid before calling toISOString
                                  if (!isNaN(endTime.getTime())) {
                                    timeRange = `${formatTime(job.scheduled_date)} - ${formatTime(endTime.toISOString())}`
                                  }
                                }
                              } catch (error) {
                                // If there's any error, just use the start time
                                console.error('Error calculating end time for job:', job.id, error)
                              }
                            }

                            return (
                              <div
                                key={job.id}
                                onClick={() => handleViewJob(job)}
                                className="px-4 py-4 border-b border-gray-100 active:bg-gray-50 cursor-pointer"
                              >
                                {/* Job Header */}
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <span className="text-xs font-medium text-gray-500" style={{fontFamily: 'Montserrat', fontWeight: 500}}>
                                      JOB #{job.id}
                                    </span>
                                    {isLate && (
                                      <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs font-medium" style={{fontFamily: 'Montserrat', fontWeight: 500}}>
                                        Late
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-sm font-medium text-gray-700 ml-2 whitespace-nowrap" style={{fontFamily: 'Montserrat', fontWeight: 500}}>
                                    {timeRange}
                                  </span>
                                </div>

                                {/* Job Title */}
                                <div className="flex items-center gap-2 mb-3">
                                  <h4 className="text-base font-semibold text-gray-900" style={{fontFamily: 'Montserrat', fontWeight: 600}}>
                                    {job.service_name || 'Service'}
                                  </h4>
                                  <RecurringIndicator
                                    isRecurring={job.is_recurring === true || job.is_recurring === 'true' || job.is_recurring === 1 || job.is_recurring === '1'}
                                    frequency={job.recurring_frequency}
                                    scheduledDate={job.scheduled_date}
                                    size="sm"
                                    showText={true}
                                  />
                                </div>

                                {/* Job Details */}
                                <div className="space-y-2">
                                  {/* Assigned Member */}
                                  {assignedMember && (
                                    <div className="flex items-center gap-2">
                                      <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                      <span className="text-sm text-gray-700" style={{fontFamily: 'Montserrat', fontWeight: 400}}>
                                        {assignedMember}
                                      </span>
                                    </div>
                                  )}

                                  {/* Location */}
                                  {(job.service_address_city || job.service_address_state) && (
                                    <div className="flex items-center gap-2">
                                      <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                      <span className="text-sm text-gray-700 uppercase" style={{fontFamily: 'Montserrat', fontWeight: 400}}>
                                        {[job.service_address_city, job.service_address_state].filter(Boolean).join(', ')}
                                      </span>
                                    </div>
                                  )}

                                  {/* Duration and Assignment */}
                                  <div className="flex items-center gap-4">
                                    {job.service_duration && (
                                      <div className="flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                        <span className="text-sm text-gray-700" style={{fontFamily: 'Montserrat', fontWeight: 400}}>
                                          {(() => {
                                            const hours = Math.floor(job.service_duration / 60)
                                            const minutes = job.service_duration % 60
                                            if (hours > 0 && minutes > 0) {
                                              return `${hours} hr ${minutes} min`
                                            } else if (hours > 0) {
                                              return `${hours} hr`
                                            } else {
                                              return `${minutes} min`
                                            }
                                          })()}
                                        </span>
                                      </div>
                                    )}
                                    
                                    {/* Assignment Status */}
                                    <div className="flex items-center gap-2">
                                      {job.team_assignments && job.team_assignments.length > 0 ? (
                                        <>
                                          <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                            <span className="text-xs text-blue-700 font-semibold uppercase">
                                              {(() => {
                                                const member = job.team_assignments[0]
                                                if (member.first_name && member.last_name) {
                                                  return `${member.first_name[0]}${member.last_name[0]}`
                                                } else if (member.name) {
                                                  const nameParts = member.name.trim().split(' ')
                                                  return nameParts.length > 1 
                                                    ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`
                                                    : nameParts[0][0]
                                                } else if (member.first_name) {
                                                  return member.first_name[0]
                                                } else if (member.email) {
                                                  return member.email[0].toUpperCase()
                                                }
                                                return 'AA'
                                              })()}
                                            </span>
                                          </div>
                                          <span className="text-sm text-gray-700" style={{fontFamily: 'Montserrat', fontWeight: 400}}>
                                            {assignedCount} assigned
                                          </span>
                                        </>
                                      ) : (
                                        <span className="text-sm text-gray-700" style={{fontFamily: 'Montserrat', fontWeight: 400}}>
                                          {assignedCount} assigned
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))
                  })()}
                </div>

                {/* Load More Button - Desktop */}
                {!loadingMore && showLoadMore && hasMore && jobs.length > 0 && (
                  <div className="hidden lg:block bg-white px-6 py-4 border-t border-gray-200">
                    <div className="flex flex-col items-center gap-3">
                      <div className="text-center text-sm text-gray-600">
                        Showing {jobs.length} of {totalJobs} jobs
                      </div>
                      <button
                        onClick={handleLoadMore}
                        disabled={loadingMore || !hasMore}
                        className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        style={{fontFamily: 'Montserrat', fontWeight: 500}}
                      >
                        Load More Jobs
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Load More Button - Mobile */}
                {!loadingMore && showLoadMore && hasMore && jobs.length > 0 && (
                  <div className="lg:hidden bg-gray-50 px-4 py-4">
                    <div className="flex flex-col items-center gap-3">
                      <div className="text-center text-sm text-gray-600">
                        Showing {jobs.length} of {totalJobs} jobs
                      </div>
                      <button
                        onClick={handleLoadMore}
                        disabled={loadingMore || !hasMore}
                        className="w-full px-6 py-3 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        style={{fontFamily: 'Montserrat', fontWeight: 500}}
                      >
                        Load More Jobs
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Loading More Indicator - Desktop */}
                {loadingMore && (
                  <div className="hidden lg:block bg-white px-6 py-4 border-t border-gray-200">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      <span className="text-sm text-gray-600">Loading more jobs...</span>
                    </div>
                  </div>
                )}

                {/* Loading More Indicator - Mobile */}
                {loadingMore && (
                  <div className="lg:hidden bg-gray-50 px-4 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      <span className="text-sm text-gray-600">Loading more jobs...</span>
                    </div>
                  </div>
                )}

                {/* Show total count when all loaded - Desktop */}
                {!loadingMore && !hasMore && jobs.length > 0 && (
                  <div className="hidden lg:block bg-white px-6 py-3 border-t border-gray-200">
                    <div className="text-center text-sm text-gray-600">
                      Showing all {jobs.length} of {totalJobs} jobs
                      <span className="ml-2 text-gray-500">• All jobs loaded</span>
                    </div>
                  </div>
                )}

                {/* Pagination Footer - Mobile */}
                {!loadingMore && jobs.length > 0 && (
                  <div className="lg:hidden bg-white border-t border-gray-200 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600" style={{fontFamily: 'Montserrat', fontWeight: 500}}>
                        {(() => {
                          const start = (page - 1) * limit + 1
                          const end = Math.min(page * limit, totalJobs)
                          return `${start}-${end} of ${totalJobs}`
                        })()}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          disabled={page === 1}
                          className="p-2 rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                          onClick={() => {
                            if (page > 1) {
                              setPage(prev => prev - 1)
                              setJobs([])
                              setHasMore(true)
                            }
                          }}
                        >
                          <ChevronDown className="w-4 h-4 text-gray-600 rotate-90" />
                        </button>
                        <button
                          disabled={!hasMore}
                          className="p-2 rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                          onClick={() => {
                            if (hasMore) {
                              setPage(prev => prev + 1)
                            }
                          }}
                        >
                          <ChevronDown className="w-4 h-4 text-gray-600 -rotate-90" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Floating Action Button - Mobile Only */}
      {canCreateJobs(user) && (
        <button
          onClick={handleCreateJob}
          className="lg:hidden fixed bottom-24 right-4 w-14 h-14 bg-blue-600 rounded-full shadow-lg flex items-center justify-center text-white hover:bg-blue-700 transition-colors z-40"
          aria-label="Create Job"
        >
          <div className="relative">
            <Calendar className="w-6 h-6" />
            <Plus className="w-4 h-4 absolute -top-1 -right-1" />
          </div>
        </button>
      )}

      {/* Bottom Navigation Bar - Mobile Only */}
      <MobileBottomNav teamMembers={teamMembers} />

      {/* Filter Modal - Mobile Only */}
      {showFilterModal && (
        <div className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-end justify-center" onClick={() => setShowFilterModal(false)}>
          <div className="bg-white rounded-t-2xl w-full max-h-[70vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900" style={{fontFamily: 'Montserrat', fontWeight: 700}}>Filter Jobs</h2>
              <button
                onClick={() => setShowFilterModal(false)}
                className="p-2 -mr-2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="px-4 py-6 space-y-6">
              {/* Assignee Section */}
              <div>
                <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-4" style={{fontFamily: 'Montserrat', fontWeight: 700}}>
                  ASSIGNEE
                </h3>
                <div className="space-y-3">
                  {/* All Jobs */}
                  <button
                    onClick={() => {
                      setFilters(prev => ({ ...prev, teamMember: '' }))
                    }}
                    className="w-full flex items-center justify-between py-3 px-2 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Users className="w-5 h-5 text-gray-600" />
                      <span className="text-sm font-medium text-gray-900" style={{fontFamily: 'Montserrat', fontWeight: 500}}>
                        All Jobs
                      </span>
                    </div>
                    {!filters.teamMember && (
                      <div className="w-5 h-5 rounded-full border-2 border-blue-600 flex items-center justify-center">
                        <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                      </div>
                    )}
                    {filters.teamMember && (
                      <div className="w-5 h-5 rounded-full border-2 border-gray-300"></div>
                    )}
                  </button>

                  {/* Unassigned */}
                  <button
                    onClick={() => {
                      setFilters(prev => ({ ...prev, teamMember: 'unassigned' }))
                    }}
                    className="w-full flex items-center justify-between py-3 px-2 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <UserX className="w-5 h-5 text-gray-600" />
                      <span className="text-sm font-medium text-gray-900" style={{fontFamily: 'Montserrat', fontWeight: 500}}>
                        Unassigned
                      </span>
                    </div>
                    {filters.teamMember === 'unassigned' && (
                      <div className="w-5 h-5 rounded-full border-2 border-blue-600 flex items-center justify-center">
                        <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                      </div>
                    )}
                    {filters.teamMember !== 'unassigned' && (
                      <div className="w-5 h-5 rounded-full border-2 border-gray-300"></div>
                    )}
                  </button>

                  {/* Team Members */}
                  {teamMembers.map((member) => {
                    const memberName = member.name || `${member.first_name || ''} ${member.last_name || ''}`.trim() || `Member ${member.id}`
                    const initials = memberName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) || 'AA'
                    const isSelected = filters.teamMember === member.id.toString()
                    
                    return (
                      <button
                        key={member.id}
                        onClick={() => {
                          setFilters(prev => ({ ...prev, teamMember: member.id.toString() }))
                        }}
                        className="w-full flex items-center justify-between py-3 px-2 hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs text-blue-700 font-semibold">{initials}</span>
                          </div>
                          <span className="text-sm font-medium text-gray-900" style={{fontFamily: 'Montserrat', fontWeight: 500}}>
                            {memberName}
                          </span>
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full border-2 border-blue-600 flex items-center justify-center">
                            <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                          </div>
                        )}
                        {!isSelected && (
                          <div className="w-5 h-5 rounded-full border-2 border-gray-300"></div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Sort By Section */}
              <div>
                <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-4" style={{fontFamily: 'Montserrat', fontWeight: 700}}>
                  SORT BY
                </h3>
                <div className="space-y-3">
                  {/* Latest */}
                  <button
                    onClick={() => {
                      setFilters(prev => ({ ...prev, sortBy: 'scheduled_date', sortOrder: 'DESC' }))
                    }}
                    className="w-full flex items-center justify-between py-3 px-2 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <span className="text-sm font-medium text-gray-900" style={{fontFamily: 'Montserrat', fontWeight: 500}}>
                      Latest
                    </span>
                    {filters.sortBy === 'scheduled_date' && filters.sortOrder === 'DESC' && (
                      <div className="w-5 h-5 rounded-full border-2 border-blue-600 flex items-center justify-center">
                        <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                      </div>
                    )}
                    {!(filters.sortBy === 'scheduled_date' && filters.sortOrder === 'DESC') && (
                      <div className="w-5 h-5 rounded-full border-2 border-gray-300"></div>
                    )}
                  </button>

                  {/* Soonest */}
                  <button
                    onClick={() => {
                      setFilters(prev => ({ ...prev, sortBy: 'scheduled_date', sortOrder: 'ASC' }))
                    }}
                    className="w-full flex items-center justify-between py-3 px-2 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <span className="text-sm font-medium text-gray-900" style={{fontFamily: 'Montserrat', fontWeight: 500}}>
                      Soonest
                    </span>
                    {filters.sortBy === 'scheduled_date' && filters.sortOrder === 'ASC' && (
                      <div className="w-5 h-5 rounded-full border-2 border-blue-600 flex items-center justify-center">
                        <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                      </div>
                    )}
                    {!(filters.sortBy === 'scheduled_date' && filters.sortOrder === 'ASC') && (
                      <div className="w-5 h-5 rounded-full border-2 border-gray-300"></div>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export Jobs Modal */}
      <ExportJobsModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        initialFilters={{
          status: activeTab !== 'all' ? activeTab : filters.status,
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
          teamMemberId: filters.teamMember,
          territoryId: filters.territoryId,
          invoiceStatus: filters.invoiceStatus,
          paymentMethod: filters.paymentMethod
        }}
      />
    </div>
  )
}

export default ServiceFlowJobs

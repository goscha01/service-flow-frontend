import { useState, useEffect, useRef } from "react"
import Sidebar from "../components/sidebar"
import MobileHeader from "../components/mobile-header"
import JobsEmptyState from "../components/jobs-empty-state"
import ExportJobsModal from "../components/export-jobs-modal"

import { Plus, AlertCircle, Loader2, Eye, Calendar, Clock, MapPin, Users, DollarSign, Phone, Mail, FileText, CheckCircle, XCircle, PlayCircle, PauseCircle, MoreVertical, Download, Upload, ChevronDown, Search, ChevronUp } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"
import { jobsAPI, invoicesAPI, territoriesAPI, teamAPI } from "../services/api"
import { useAuth } from "../context/AuthContext"

const ServiceFlowJobs = () => {
  const { user, loading: authLoading } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("all")

  const navigate = useNavigate()

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
    sortOrder: "DESC",
    territoryId: "",
    paymentMethod: "",
    tag: ""
  })
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  
  // Dropdown state
  const [openDropdown, setOpenDropdown] = useState(null)
  const tagDropdownRef = useRef(null)
  const paymentMethodDropdownRef = useRef(null)
  const invoiceStatusDropdownRef = useRef(null)
  const territoryDropdownRef = useRef(null)
  const assignedDropdownRef = useRef(null)
  const sortDropdownRef = useRef(null)
  
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
          sort: sortDropdownRef
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
        if (filters.sortBy === 'scheduled_date' && filters.sortOrder === 'DESC') return 'Sort by: Recent'
        if (filters.sortBy === 'scheduled_date' && filters.sortOrder === 'ASC') return 'Sort by: Oldest'
        if (filters.sortBy === 'total_amount' && filters.sortOrder === 'DESC') return 'Sort by: Highest Amount'
        if (filters.sortBy === 'total_amount' && filters.sortOrder === 'ASC') return 'Sort by: Lowest Amount'
        return 'Sort by: Recent'
      default:
        return ''
    }
  }

  // Reset page and jobs when filters or tab change
  useEffect(() => {
    setPage(1)
    setJobs([])
    setHasMore(true)
    setShowLoadMore(true)
  }, [activeTab, filters.search, filters.status, filters.teamMember, filters.invoiceStatus, filters.sortBy, filters.sortOrder, filters.territoryId, filters.paymentMethod, filters.tag, filters.dateFrom, filters.dateTo])

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

  // Debounced search to prevent too many API calls
  useEffect(() => {
    if (!authLoading && user?.id) {
      const timeoutId = setTimeout(() => {
        fetchJobs()
      }, 300) // 300ms delay

      return () => clearTimeout(timeoutId)
    } else if (!authLoading && !user?.id) {
      // If auth is done loading but no user, redirect to signin
      navigate('/signin')
    }
  }, [activeTab, filters, user?.id, authLoading, page])

  const fetchJobs = async () => {
    if (!user?.id || !hasMore) return

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

      switch (activeTab) {
        case "upcoming":
          statusFilter = "pending,confirmed,in_progress"
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
          statusFilter = "pending,confirmed,in_progress"
          break
        case "canceled":
          statusFilter = "cancelled"
          break
        case "daterange":
          // Date range will be handled by filters.dateRange
          statusFilter = ""
          break
        case "all":
        default:
          statusFilter = ""
          break
      }

      // Build date range from filters
      let dateRangeForAPI = filters.dateRange
      if (filters.dateFrom || filters.dateTo) {
        // Use the date range picker values
        dateRangeForAPI = filters.dateFrom && filters.dateTo 
          ? `${filters.dateFrom} to ${filters.dateTo}`
          : filters.dateFrom || filters.dateTo
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
        filters.territoryId // pass territoryId to API
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
    if (!dateString) return 'Date not set'

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

    // Create weekday names array
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

    // Calculate weekday using Zeller's congruence to avoid Date object
    const y = parseInt(year)
    const m = parseInt(month)
    const d = parseInt(day)

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

    return { weekday, monthName, day: d, year: y }
  }

  const formatTime = (dateString) => {
    if (!dateString) return 'Time not set'

    // Handle both ISO format (2025-08-20T09:00:00) and space format (2025-08-20 09:00:00)
    let timePart = ''
    if (dateString.includes('T')) {
      // ISO format: 2025-08-20T09:00:00
      timePart = dateString.split('T')[1]
    } else {
      // Space format: 2025-08-20 09:00:00
      timePart = dateString.split(' ')[1]
    }

    if (!timePart) return 'Time not set'

    const [hours, minutes] = timePart.split(':')
    const hour = parseInt(hours, 10)
    const minute = parseInt(minutes, 10)

    if (isNaN(hour) || isNaN(minute)) return 'Time not set'

    // Convert to 12-hour format
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    const displayMinute = minute.toString().padStart(2, '0')

    return `${displayHour}:${displayMinute} ${ampm}`
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-50 text-green-700 border-green-200'
      case 'in_progress': return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'confirmed': return 'bg-purple-50 text-purple-700 border-purple-200'
      case 'cancelled': return 'bg-red-50 text-red-700 border-red-200'
      case 'pending': return 'bg-gray-50 text-gray-700 border-gray-200'
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
    <div className="flex h-screen overflow-hidden">
     

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 ">
        {/* Mobile Header */}
        <MobileHeader onMenuClick={() => setSidebarOpen(true)} />

        {/* Desktop Header */}
        <div className="hidden lg:flex bg-white border-b border-gray-200 px-4 pt-4 pb-2 items-center justify-between">
          <h1 className="text-3xl font-semibold text-gray-900 " style={{fontFamily: 'Montserrat', fontWeight: 700}}>Jobs</h1>
          <div className="flex items-center gap-2">
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
            <button
              onClick={handleCreateJob}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              style={{fontFamily: 'Montserrat', fontWeight: 500}}
            >
              Create Job
            </button>
          </div>
        </div>

        {/* Mobile Header Content */}
        <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-semibold text-gray-900 " style={{fontFamily: 'Montserrat', fontWeight: 700}}>Jobs</h1>
            <button
              onClick={handleCreateJob}
              className="px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1"
              style={{fontFamily: 'Montserrat', fontWeight: 500}}
            >
              <Plus className="w-4 h-4" />
              Create
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleImportJobs}
              className="flex-1 px-3 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              style={{fontFamily: 'Montserrat', fontWeight: 500}}
            >
              <Upload className="w-4 h-4" />
              Import
            </button>
            <button
              onClick={handleExportJobs}
              className="flex-1 px-3 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              style={{fontFamily: 'Montserrat', fontWeight: 500}}
            >
              <Download className="w-4 h-4" />
              Export
            </button>
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

        {/* Tabs */}
        <div className="bg-white border-b border-gray-200 px-4">
          <div className="flex space-x-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 border-b-2 font-medium text-sm transition-colors ${
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

        {/* Search and Filters */}
        <div className="bg-white border-b border-gray-200 px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Search */}
            <div className="flex-1 max-w-md relative">
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

            {/* Filter Buttons */}
            <div className="flex items-center gap-2">
              {/* Tag Filter */}
              <div className="relative" ref={tagDropdownRef}>
                <button
                  onClick={() => setOpenDropdown(openDropdown === 'tag' ? null : 'tag')}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full text-sm font-medium hover:bg-gray-200 transition-colors flex items-center gap-2"
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
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full text-sm font-medium hover:bg-gray-200 transition-colors flex items-center gap-2"
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
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full text-sm font-medium hover:bg-gray-200 transition-colors flex items-center gap-2"
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
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full text-sm font-medium hover:bg-gray-200 transition-colors flex items-center gap-2"
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

              {/* Assigned Filter */}
              <div className="relative" ref={assignedDropdownRef}>
                <button
                  onClick={() => setOpenDropdown(openDropdown === 'assigned' ? null : 'assigned')}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full text-sm font-medium hover:bg-gray-200 transition-colors flex items-center gap-2"
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
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full text-sm font-medium hover:bg-gray-200 transition-colors flex items-center gap-2"
                >
                  {getFilterLabel('sort')}
                  {openDropdown === 'sort' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {openDropdown === 'sort' && (
                  <div className="absolute top-full mt-1 right-0 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[200px] z-50">
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
                        setFilters(prev => ({ ...prev, sortBy: 'scheduled_date', sortOrder: 'ASC' }))
                        setOpenDropdown(null)
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${filters.sortBy === 'scheduled_date' && filters.sortOrder === 'ASC' ? 'text-blue-600 font-medium' : 'text-gray-700'}`}
                    >
                      Sort by: Oldest
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
        <div className="flex-1 overflow-auto bg-gray-50 jobs-scroll-container">
          <div className="">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Loading jobs...</span>
              </div>
            ) : jobs.length === 0 ? (
              <JobsEmptyState onCreateJob={handleCreateJob} />
            ) : (
              <div className="bg-white border border-gray-200 overflow-hidden">
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
                        return (
                          <tr
                            key={job.id}
                            className="hover:bg-gray-50 cursor-pointer transition-colors"
                            onClick={() => handleViewJob(job)}
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex flex-col">
                                <span style={{fontFamily: 'Montserrat', fontWeight: 500}} className="text-sm  font-medium text-blue-500">
                                  {job.scheduled_date ? `${dateInfo.weekday} - ${dateInfo.monthName} ${dateInfo.day}, ${dateInfo.year}` : 'Date not set'}
                                </span>
                                <span style={{fontFamily: 'Montserrat', fontWeight: 500}} className="text-xs text-gray-600">
                                  {job.scheduled_date ? formatTime(job.scheduled_date) : 'Time not set'}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex flex-col">
                                <span style={{fontFamily: 'Montserrat', fontWeight: 500}} className="text-sm capitalize font-medium text-gray-900">
                                  {job.service_name || 'Service'}
                                </span>
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
                                  {job.team_assignments && job.team_assignments.length > 0
                                    ? `${job.team_assignments.length} / ${job.team_assignments.length} assigned`
                                    : '0 / 1 assigned'
                                  }
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span style={{fontFamily: 'Montserrat', fontWeight: 500}} className={`inline-flex items-center px-3 py-1 rounded-l-sm rounded-r-xl text-xs font-medium border ${getStatusLabel(job.status || 'pending', job) === 'Late' ? 'bg-orange-50 text-orange-700 border-orange-200' : getStatusColor(job.status)}`}>
                                {getStatusLabel(job.status || 'pending', job)}
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

                {/* Load More Button */}
                {!loadingMore && showLoadMore && hasMore && jobs.length > 0 && (
                  <div className="bg-white px-6 py-4 border-t border-gray-200">
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

                {/* Loading More Indicator */}
                {loadingMore && (
                  <div className="bg-white px-6 py-4 border-t border-gray-200">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      <span className="text-sm text-gray-600">Loading more jobs...</span>
                    </div>
                  </div>
                )}

                {/* Show total count when all loaded */}
                {!loadingMore && !hasMore && jobs.length > 0 && (
                  <div className="bg-white px-6 py-3 border-t border-gray-200">
                    <div className="text-center text-sm text-gray-600">
                      Showing all {jobs.length} of {totalJobs} jobs
                      <span className="ml-2 text-gray-500">• All jobs loaded</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

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

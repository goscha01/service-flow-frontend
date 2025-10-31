import { useState, useEffect } from "react"
import Sidebar from "../components/sidebar"
import MobileHeader from "../components/mobile-header"
import JobsEmptyState from "../components/jobs-empty-state"

import { Plus, AlertCircle, Loader2, Eye, Calendar, Clock, MapPin, Users, DollarSign, Phone, Mail, FileText, CheckCircle, XCircle, PlayCircle, PauseCircle, MoreVertical, Download, Upload, ChevronDown, Search } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"
import { jobsAPI, invoicesAPI } from "../services/api"
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
  const [filters, setFilters] = useState({
    status: "",
    dateRange: "",
    teamMember: "",
    customer: "",
    search: "",
    invoiceStatus: "",
    sortBy: "scheduled_date",
    sortOrder: "DESC",
    territoryId: ""
  })

  // Reset page and jobs when filters or tab change
  useEffect(() => {
    setPage(1)
    setJobs([])
    setHasMore(true)
  }, [activeTab, filters.search, filters.status, filters.teamMember, filters.invoiceStatus, filters.sortBy, filters.sortOrder])

  // Infinite scroll handler
  useEffect(() => {
    const handleScroll = (e) => {
      const target = e.target
      if (!target) return

      const { scrollTop, scrollHeight, clientHeight } = target

      // Load more when scrolled to bottom (with 100px threshold)
      if (scrollHeight - scrollTop - clientHeight < 100 && !loadingMore && hasMore) {
        setPage(prev => prev + 1)
      }
    }

    const scrollContainer = document.querySelector('.jobs-scroll-container')
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll)
      return () => scrollContainer.removeEventListener('scroll', handleScroll)
    }
  }, [loadingMore, hasMore])

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
          statusFilter = "completed,cancelled,pending,confirmed,in_progress"
          dateFilter = "past" // Jobs from yesterday and earlier
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

      // Call jobsAPI with individual parameters
      const response = await jobsAPI.getAll(
        user.id,
        statusFilter,
        filters.search,
        page,
        limit,
        dateFilter,
        filters.dateRange,
        filters.sortBy,
        filters.sortOrder,
        filters.teamMember,
        filters.invoiceStatus,
        undefined, // customerId
        filters.territoryId // pass territoryId to API
      )

      const newJobs = response.jobs || []
      const total = response.total || response.jobs?.length || 0

      // Append new jobs to existing ones
      if (page === 1) {
        setJobs(newJobs)
      } else {
        setJobs(prev => [...prev, ...newJobs])
      }

      setTotalJobs(total)
      setHasMore(newJobs.length === limit && jobs.length + newJobs.length < total)
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

  const getStatusLabel = (status) => {
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
    <div className="flex h-screen bg-white overflow-hidden">
      {/* Main Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64 xl:ml-72">
        {/* Mobile Header */}
        <MobileHeader onMenuClick={() => setSidebarOpen(true)} />

        {/* Desktop Header */}
        <div className="hidden lg:flex bg-white border-b border-gray-200 px-8 py-6 items-center justify-between">
          <h1 className="text-3xl font-semibold text-gray-900">Jobs</h1>
          <button
            onClick={handleCreateJob}
            className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Job
          </button>
        </div>

        {/* Mobile Header Content */}
        <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-900">Jobs</h1>
            <button
              onClick={handleCreateJob}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Job
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
        <div className="bg-white border-b border-gray-200 px-8">
          <div className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
                }`}
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

            {/* Filter Dropdowns */}
            <div className="flex items-center gap-3">
              {/* Payment Method Filter */}
              <select
                value={filters.paymentMethod || ""}
                onChange={(e) => setFilters(prev => ({ ...prev, paymentMethod: e.target.value }))}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="">Payment method</option>
                <option value="card">Card</option>
                <option value="cash">Cash</option>
                <option value="check">Check</option>
              </select>

              {/* Invoice Status Filter */}
              <select
                value={filters.invoiceStatus}
                onChange={(e) => setFilters(prev => ({ ...prev, invoiceStatus: e.target.value }))}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="">Any invoice status</option>
                <option value="paid">Paid</option>
                <option value="unpaid">Unpaid</option>
                <option value="invoiced">Invoiced</option>
              </select>

              {/* Team Member Filter */}
              <select
                value={filters.teamMember}
                onChange={(e) => setFilters(prev => ({ ...prev, teamMember: e.target.value }))}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="">Assigned All</option>
                <option value="unassigned">Unassigned</option>
              </select>

              {/* Sort By Filter */}
              <select
                value={`${filters.sortBy}-${filters.sortOrder}`}
                onChange={(e) => {
                  const [sortBy, sortOrder] = e.target.value.split('-')
                  setFilters(prev => ({ ...prev, sortBy, sortOrder }))
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="scheduled_date-DESC">Sort by: Newest</option>
                <option value="scheduled_date-ASC">Sort by: Oldest</option>
                <option value="total_amount-DESC">Sort by: Highest Amount</option>
                <option value="total_amount-ASC">Sort by: Lowest Amount</option>
              </select>
            </div>
          </div>
        </div>

        {/* Jobs List */}
        <div className="flex-1 overflow-auto bg-gray-50 jobs-scroll-container">
          <div className="px-8 py-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Loading jobs...</span>
              </div>
            ) : jobs.length === 0 ? (
              <JobsEmptyState onCreateJob={handleCreateJob} />
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-white">
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
                                <span className="text-sm font-medium text-blue-600">
                                  {job.scheduled_date ? `${dateInfo.weekday} - ${dateInfo.monthName} ${dateInfo.day}, ${dateInfo.year}` : 'Date not set'}
                                </span>
                                <span className="text-sm text-gray-600">
                                  {job.scheduled_date ? formatTime(job.scheduled_date) : 'Time not set'}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex flex-col">
                                <span className="text-sm font-medium text-gray-900">
                                  {job.service_name || 'Service'}
                                </span>
                                <span className="text-sm text-gray-500">
                                  Job #{job.id}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex flex-col">
                                <span className="text-sm font-medium text-gray-900">
                                  {job.customer_first_name && job.customer_last_name
                                    ? `${job.customer_first_name} ${job.customer_last_name}`
                                    : job.customer_email
                                    ? job.customer_email
                                    : 'Customer Name'
                                  }
                                </span>
                                <span className="text-sm text-gray-500">
                                  {job.customer_city && job.customer_state
                                    ? `${job.customer_city}, ${job.customer_state}`
                                    : job.customer_phone
                                    ? job.customer_phone
                                    : 'Location not specified'
                                  }
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-gray-400" />
                                <span className="text-sm text-gray-600">
                                  {job.team_assignments && job.team_assignments.length > 0
                                    ? `${job.team_assignments.length} / ${job.team_assignments.length} assigned`
                                    : '0 / 1 assigned'
                                  }
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-3 py-1 rounded-md text-xs font-medium border ${getStatusColor(job.status)}`}>
                                {getStatusLabel(job.status || 'pending')}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex flex-col">
                                <span className="text-sm font-semibold text-gray-900">
                                  {formatCurrency(job.total_amount || job.service_price || 0)}
                                </span>
                                <span className="text-sm text-gray-500">
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

                {/* Loading More Indicator */}
                {loadingMore && (
                  <div className="bg-white px-6 py-4 border-t border-gray-200">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      <span className="text-sm text-gray-600">Loading more jobs...</span>
                    </div>
                  </div>
                )}

                {/* Show total count */}
                {!loadingMore && jobs.length > 0 && (
                  <div className="bg-white px-6 py-3 border-t border-gray-200">
                    <div className="text-center text-sm text-gray-600">
                      Showing {jobs.length} of {totalJobs} jobs
                      {!hasMore && jobs.length >= totalJobs && (
                        <span className="ml-2 text-gray-500">• All jobs loaded</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ServiceFlowJobs

import { useState, useEffect } from "react"
import Sidebar from "../components/sidebar"
import MobileHeader from "../components/mobile-header"
import JobsTabs from "../components/jobs-tabs"
import JobsFilters from "../components/jobs-filters"
import JobsEmptyState from "../components/jobs-empty-state"
import JobsPagination from "../components/jobs-pagination"

import { Plus, AlertCircle, Loader2, Eye, Calendar, Clock, MapPin, Users, DollarSign, Phone, Mail, FileText, CheckCircle, XCircle, PlayCircle, PauseCircle, MoreVertical } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"
import { jobsAPI, invoicesAPI } from "../services/api"
import { useAuth } from "../context/AuthContext"

const ServiceFlowJobs = () => {
  const { user, loading: authLoading } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("upcoming")

  const [viewMode, setViewMode] = useState("table") // "table" or "cards"
  const navigate = useNavigate()
  
  // API State
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [filters, setFilters] = useState({
    status: "",
    dateRange: "",
    teamMember: "",
    customer: "",
    search: "",
    invoiceStatus: "",
    sortBy: "scheduled_date",
    sortOrder: "ASC",
    territoryId: ""
  })

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
  }, [activeTab, filters, user?.id, authLoading])

  const fetchJobs = async () => {
    if (!user?.id) return
    
    try {
      setLoading(true)
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
        1, // page
        50, // limit
        dateFilter,
        filters.dateRange,
        filters.sortBy,
        filters.sortOrder,
        filters.teamMember,
        filters.invoiceStatus,
        undefined, // customerId
        filters.territoryId // pass territoryId to API
      )
      

      
      setJobs(response.jobs || [])
    } catch (error) {
      console.error('Error fetching jobs:', error)
      setError("Failed to load jobs. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleCreateJob = () => {
    navigate('/createjob')
  }

  const handleJobUpdate = async () => {
    await fetchJobs()
  }

  const handleViewJob = (job) => {
    navigate(`/job/${job.id}`)
  }

  const handleViewCustomer = (customerId) => {
    navigate(`/customer/${customerId}`)
  }

  const handleSendInvoice = async (job) => {
    try {
      // Create invoice for the job using the proper API
      const invoiceData = {
        userId: user.id,
        customerId: job.customer_id,
        jobId: job.id,
        totalAmount: job.total_amount || job.service_price,
        status: 'sent'
      }
      
      await invoicesAPI.create(invoiceData)
      
        // Update job invoice status
        await jobsAPI.update(job.id, { invoiceStatus: 'invoiced' })
        await fetchJobs() // Refresh jobs list
        alert('Invoice created and sent successfully!')
    } catch (error) {
      console.error('Error sending invoice:', error)
      alert('Error sending invoice')
    }
  }

  const handleAssignJob = (job) => {
    // Open team member assignment modal or navigate to assignment page
    handleViewJob(job) // For now, open job details where assignment can be done
  }

  const handlePrintJob = (job) => {
    // Open print dialog or generate PDF
    const printWindow = window.open('', '_blank')
    printWindow.document.write(`
      <html>
        <head><title>Job #${job.id}</title></head>
        <body>
          <h1>Job Details</h1>
          <p><strong>Job ID:</strong> ${job.id}</p>
          <p><strong>Service:</strong> ${job.service_name}</p>
          <p><strong>Customer:</strong> ${job.customer_first_name} ${job.customer_last_name}</p>
          <p><strong>Date:</strong> ${formatDate(job.scheduled_date)}</p>
          <p><strong>Time:</strong> ${formatTime(job.scheduled_date)}</p>
          <p><strong>Amount:</strong> ${formatCurrency(job.total_amount)}</p>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }

  const handleStatusChange = async (job, newStatus) => {
    try {

      await jobsAPI.updateStatus(job.id, newStatus)
      
      // Update the job in the local state immediately for better UX
      setJobs(prevJobs => prevJobs.map(j => 
        j.id === job.id ? { ...j, status: newStatus } : j
      ));
      
      // Show success message
      
      // Refresh the jobs list after a short delay to ensure consistency
      setTimeout(() => {
        fetchJobs();
      }, 500);
    } catch (error) {
      console.error('Error updating job status:', error)
      // Revert the local state change on error
      setJobs(prevJobs => prevJobs.map(j => 
        j.id === job.id ? { ...j, status: job.status } : j
      ));
      alert('Failed to update job status. Please try again.');
    }
  }

  const handleFilterChange = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
  }

  const handleRetry = () => {
    setError("")
    fetchJobs()
  }

  const getJobCount = (status) => {
    return jobs.filter(job => {
      switch (status) {
        case "upcoming":
          return ["pending", "confirmed", "in_progress"].includes(job.status)
        case "in-progress":
          return job.status === "in_progress"
        case "completed":
          return job.status === "completed"
        case "cancelled":
          return job.status === "cancelled"
        default:
          return true
      }
    }).length
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
    
    // Create date from YYYY-MM-DD string to avoid timezone conversion
    const [year, month, day] = jobDateString.split('-')
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
    
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    })
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
      case 'completed': return 'bg-green-100 text-green-800'
      case 'in_progress': return 'bg-blue-100 text-blue-800'
      case 'confirmed': return 'bg-yellow-100 text-yellow-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      case 'pending': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status) => {
    return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />
      case 'in_progress': return <PlayCircle className="w-4 h-4" />
      case 'confirmed': return <Clock className="w-4 h-4" />
      case 'cancelled': return <XCircle className="w-4 h-4" />
      case 'pending': return <PauseCircle className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0)
  }

  const getRelativeTime = (dateString) => {
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
    
    // Get today's date in YYYY-MM-DD format
    const today = new Date()
    const todayString = today.toLocaleDateString('en-CA') // Returns YYYY-MM-DD format
    
    // Get tomorrow's date in YYYY-MM-DD format
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)
    const tomorrowString = tomorrow.toLocaleDateString('en-CA')
    
    // Get yesterday's date in YYYY-MM-DD format
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)
    const yesterdayString = yesterday.toLocaleDateString('en-CA')
    
    if (jobDateString === todayString) {
      return 'Today'
    } else if (jobDateString === tomorrowString) {
      return 'Tomorrow'
    } else if (jobDateString === yesterdayString) {
      return 'Yesterday'
    } else {
      // Calculate difference in days for other dates
      const jobDate = new Date(jobDateString)
      const diffTime = jobDate.getTime() - today.getTime()
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))
      
      if (diffDays < 0) {
        return `${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''} ago`
      } else if (diffDays <= 7) {
        return `In ${diffDays} days`
      } else {
        return `In ${Math.ceil(diffDays / 7)} week${Math.ceil(diffDays / 7) !== 1 ? 's' : ''}`
      }
    }
  }

  // Show loading spinner while auth is loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Main Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64 xl:ml-72">
        {/* Mobile Header */}
        <MobileHeader onMenuClick={() => setSidebarOpen(true)} />

        {/* Desktop Header */}
        <div className="hidden lg:flex bg-white border-b border-gray-200 px-6 py-5 items-center justify-between shadow-sm">
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
            <h1 className="text-2xl font-display font-semibold text-gray-900">Jobs</h1>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode("table")}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    viewMode === "table" 
                      ? "bg-white text-gray-900 shadow-sm" 
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Table
                </button>
                <button
                  onClick={() => setViewMode("cards")}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    viewMode === "cards" 
                      ? "bg-white text-gray-900 shadow-sm" 
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Cards
                </button>
              </div>
              <button 
                onClick={handleCreateJob}
                className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 transition-all duration-200 transform hover:scale-[1.02] focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Header Content */}
        <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-display font-semibold text-gray-900">Jobs</h1>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode("table")}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                    viewMode === "table" 
                      ? "bg-white text-gray-900 shadow-sm" 
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Table
                </button>
                <button
                  onClick={() => setViewMode("cards")}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                    viewMode === "cards" 
                      ? "bg-white text-gray-900 shadow-sm" 
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Cards
                </button>
              </div>
              <button 
                onClick={handleCreateJob}
                className="w-9 h-9 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 transition-all duration-200"
              >
                <Plus className="w-5 h-5" />
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

        {/* Tabs */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto">
            <JobsTabs 
              activeTab={activeTab} 
              onTabChange={setActiveTab}
              counts={{
                upcoming: getJobCount("upcoming"),
                "in-progress": getJobCount("in-progress"),
                completed: getJobCount("completed"),
                cancelled: getJobCount("cancelled")
              }}
            />
          </div>
        </div>

        {/* Filters */}
        <JobsFilters filters={filters} onFilterChange={handleFilterChange} activeTab={activeTab} />

        {/* Jobs List */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto px-6 py-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Loading jobs...</span>
              </div>
            ) : jobs.length === 0 ? (
              <JobsEmptyState onCreateJob={handleCreateJob} />
            ) : (
              <>

                
                {viewMode === "table" ? (
              // Table View
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
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
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {jobs.map((job) => (
                        <tr 
                          key={job.id} 
                          className="hover:bg-gray-50 cursor-pointer transition-colors"
                          onClick={() => handleViewJob(job)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {job.scheduled_date ? formatDate(job.scheduled_date) : 'Date not set'}
                              </span>
                              <span className="text-gray-500">
                                {job.scheduled_date ? formatTime(job.scheduled_date) : 'Time not set'}
                              </span>
                              {job.scheduled_date && (
                                <span className="text-xs text-gray-400">
                                  {getRelativeTime(job.scheduled_date)}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-8 w-8">
                                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                                  <span className="text-sm font-medium text-blue-600">
                                    {job.service_name?.[0] || 'J'}
                                  </span>
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {job.service_name || 'Service'}
                                </div>
                                <div className="text-sm text-gray-500">
                                  Job #{job.id}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div 
                              className="text-sm text-blue-600 hover:text-blue-800 font-medium cursor-pointer transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewCustomer(job.customer_id);
                              }}
                            >
                              {job.customer_first_name && job.customer_last_name 
                                ? `${job.customer_first_name} ${job.customer_last_name}`
                                : job.customer_email 
                                ? job.customer_email 
                                : 'Customer Name'
                              }
                            </div>
                            <div className="text-sm text-gray-500">
                              {job.customer_city && job.customer_state 
                                ? `${job.customer_city}, ${job.customer_state}`
                                : job.customer_phone 
                                ? job.customer_phone 
                                : 'Location not specified'
                              }
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {job.team_assignments && job.team_assignments.length > 0 ? (
                              <div className="space-y-1">
                                {job.team_assignments.map((assignment, index) => {
                                  const memberName = assignment.first_name && assignment.last_name 
                                    ? `${assignment.first_name} ${assignment.last_name}`
                                    : assignment.email || 'Unknown Member';
                                  return (
                                    <div key={assignment.team_member_id} className="flex items-center">
                                      <div className="flex-shrink-0 h-6 w-6">
                                        <div className={`h-6 w-6 rounded-full flex items-center justify-center ${
                                          assignment.is_primary ? 'bg-green-100' : 'bg-blue-100'
                                        }`}>
                                          <span className={`text-xs font-medium ${
                                            assignment.is_primary ? 'text-green-600' : 'text-blue-600'
                                          }`}>
                                            {memberName.split(' ').map(n => n[0]).join('').toUpperCase()}
                                          </span>
                                        </div>
                                      </div>
                                      <div className="ml-2 text-sm text-gray-900">
                                        {memberName}
                                        {assignment.is_primary && (
                                          <span className="ml-1 text-xs text-green-600">(Primary)</span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                                <div className="text-xs text-gray-500">
                                  {job.team_assignments.length} member{job.team_assignments.length !== 1 ? 's' : ''}
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-6 w-6">
                                  <div className="h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center">
                                    <Users className="w-3 h-3 text-gray-400" />
                                  </div>
                                </div>
                                <div className="ml-2 text-sm text-gray-500">
                                  <span className="cursor-pointer hover:text-blue-600 transition-colors" onClick={(e) => {
                                    e.stopPropagation();
                                    handleAssignJob(job);
                                  }}>
                                    Assign Team Member
                                  </span>
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                              {getStatusIcon(job.status)}
                              <span className="ml-1">{getStatusLabel(job.status || 'pending')}</span>
                            </span>
                            {job.status === 'pending' && (
                              <div className="mt-1 text-xs text-gray-500">
                                Awaiting confirmation
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div className="flex flex-col">
                              <span className="font-medium">{formatCurrency(job.total_amount || job.service_price || 0)}</span>
                              <span className={`text-xs px-2 py-1 rounded-full inline-block ${
                                job.invoice_status === 'paid' ? 'bg-green-100 text-green-800' :
                                job.invoice_status === 'unpaid' ? 'bg-red-100 text-red-800' :
                                job.invoice_status === 'invoiced' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {job.invoice_status || 'No invoice'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewJob(job);
                              }}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              // Simplified Cards View - No Expandable Details
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {jobs.map((job) => (
                  <div
                    key={job.id}
                    className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => handleViewJob(job)}
                  >
                    {/* Job Header */}
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${
                            job.status === 'completed' ? 'bg-green-500' :
                            job.status === 'in_progress' ? 'bg-blue-500' :
                            job.status === 'cancelled' ? 'bg-red-500' :
                            'bg-yellow-500'
                          }`} />
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                              {job.service_name || 'Service'}
                            </h3>
                            <p className="text-sm text-gray-500">Job #{job.id}</p>
                          </div>
                        </div>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(job.status)}`}>
                          {getStatusIcon(job.status)}
                          <span className="ml-1">{getStatusLabel(job.status)}</span>
                        </span>
                      </div>
                      
                      {/* Basic Job Info */}
                      <div className="space-y-3 mb-6">
                        <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">
                            Due {job.scheduled_date ? formatDate(job.scheduled_date) : 'Date not set'}
                          </p>
                          <p className="text-sm text-gray-600">
                            {job.scheduled_date ? formatTime(job.scheduled_date) : 'Time not set'}
                          </p>
                          {job.scheduled_date && (
                            <p className="text-xs text-gray-400">
                              {getRelativeTime(job.scheduled_date)}
                            </p>
                          )}
                        </div>
                                                 <div className="text-right">
                            <p className="text-sm text-gray-600">Amount</p>
                           <p className="text-lg font-semibold text-gray-900">{formatCurrency(job.total_amount || job.service_price || 0)}</p>
                         </div>
                      </div>
                      
                        {/* Customer Info */}
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Users className="w-4 h-4" />
                          <span 
                            className="text-blue-600 hover:text-blue-800 cursor-pointer transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewCustomer(job.customer_id);
                            }}
                          >
                            {job.customer_first_name && job.customer_last_name 
                              ? `${job.customer_first_name} ${job.customer_last_name}`
                              : job.customer_email 
                              ? job.customer_email 
                              : 'Customer Name'
                            }
                          </span>
                        </div>
                        
                        {/* Team Members */}
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <Users className="w-4 h-4" />
                          {job.team_assignments && job.team_assignments.length > 0 ? (
                            <div className="flex flex-col">
                              <span>
                                {job.team_assignments.length} member{job.team_assignments.length !== 1 ? 's' : ''} assigned
                              </span>
                              <div className="text-xs text-gray-500">
                                {job.team_assignments.map((assignment, index) => {
                                  const memberName = assignment.first_name && assignment.last_name 
                                    ? `${assignment.first_name} ${assignment.last_name}`
                                    : assignment.email || 'Unknown Member';
                                  return (
                                    <span key={assignment.team_member_id}>
                                      {memberName}{assignment.is_primary && ' (Primary)'}
                                      {index < job.team_assignments.length - 1 ? ', ' : ''}
                                    </span>
                                  );
                                })}
                              </div>
                          </div>
                          ) : (
                            <span 
                              className="text-blue-600 hover:text-blue-800 cursor-pointer transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAssignJob(job);
                              }}
                            >
                              Assign Team Member
                            </span>
                          )}
                        </div>
                        
                        {/* Invoice Status */}
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Invoice Status</span>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                             job.invoice_status === 'paid' ? 'bg-green-100 text-green-800' :
                             job.invoice_status === 'unpaid' ? 'bg-red-100 text-red-800' :
                             job.invoice_status === 'invoiced' ? 'bg-blue-100 text-blue-800' :
                             'bg-gray-100 text-gray-800'
                          }`}>
                           {job.invoice_status || 'No invoice'}
                          </span>
                      </div>
                    </div>
                    
                      {/* Action Buttons */}
                      <div className="flex items-center justify-between">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewJob(job);
                          }}
                          className="flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Job Details
                        </button>
                        <div className="flex items-center space-x-2">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAssignJob(job);
                            }}
                            className="p-2 text-gray-400 hover:text-gray-600"
                            title="Assign Job"
                          >
                            <Users className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSendInvoice(job);
                            }}
                            className="p-2 text-gray-400 hover:text-gray-600"
                            title="Send Invoice"
                          >
                            <DollarSign className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusChange(job, 'completed');
                            }}
                            className="p-2 text-gray-400 hover:text-gray-600"
                            title="Mark as Complete"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
              </>
            )}

            {/* Pagination */}
            {jobs.length > 0 && <JobsPagination />}
          </div>
        </div>
      </div>


    </div>
  )
}

export default ServiceFlowJobs

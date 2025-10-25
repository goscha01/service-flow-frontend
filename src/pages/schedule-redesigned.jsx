"use client"

import { useState, useEffect, useRef } from "react"
import Sidebar from "../components/sidebar-collapsible"
import MobileHeader from "../components/mobile-header"
import { teamAPI, territoriesAPI } from "../services/api"
import { 
  Plus, 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Users,
  ChevronLeft, 
  ChevronRight, 
  Maximize2,
  MessageCircle,
  X,
  Filter,
  AlertTriangle,
  CheckCircle,
  Play,
  XCircle
} from "lucide-react"
import { useAuth } from "../context/AuthContext"
import { jobsAPI } from "../services/api"
import { normalizeAPIResponse } from "../utils/dataHandler"

const ScheduleRedesigned = () => {
  const { user } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [viewMode, setViewMode] = useState('day') // day, week, month
  const [jobs, setJobs] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedJob, setSelectedJob] = useState(null)
  const [mapView, setMapView] = useState('roadmap') // roadmap, satellite
  const [showJobDetails, setShowJobDetails] = useState(false)
  const [teamMembers, setTeamMembers] = useState([])
  const [territories, setTerritories] = useState([])
  const [selectedFilter, setSelectedFilter] = useState('all') // all, unassigned, or team member ID
  const [statusFilter, setStatusFilter] = useState('all') // all, pending, in_progress, completed, cancelled
  const [timeRangeFilter, setTimeRangeFilter] = useState('all') // all, today, tomorrow, this_week, this_month
  const [territoryFilter, setTerritoryFilter] = useState('all') // all or territory ID
  const [filteredJobs, setFilteredJobs] = useState([])
  const [showCalendar, setShowCalendar] = useState(false)
  const calendarRef = useRef(null)
  const [expandedDays, setExpandedDays] = useState(new Set())

  useEffect(() => {
    if (user?.id) {
      fetchJobs()
      fetchTeamMembers()
      fetchTerritories()
    }
  }, [user, selectedDate, viewMode])

  useEffect(() => {
    applyFilters()
  }, [jobs, selectedFilter, statusFilter, timeRangeFilter, territoryFilter])

  // Click outside to close calendar
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target)) {
        setShowCalendar(false)
      }
    }

    if (showCalendar) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showCalendar])

  const fetchJobs = async () => {
    try {
      setIsLoading(true)
      // Calculate date range based on view mode
      let startDate, endDate
      if (viewMode === 'day') {
        startDate = new Date(selectedDate)
        endDate = new Date(selectedDate)
      } else if (viewMode === 'week') {
        const startOfWeek = new Date(selectedDate)
        startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay())
        startDate = startOfWeek
        endDate = new Date(startOfWeek)
        endDate.setDate(startOfWeek.getDate() + 6)
      } else if (viewMode === 'month') {
        startDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
        endDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0)
      }
      
      const jobsResponse = await jobsAPI.getAll(
        user.id, 
        "", // status
        "", // search
        1, // page
        1000, // limit
        null, // dateFilter
        null, // dateRange
        null, // sortBy
        null, // sortOrder
        null, // teamMember
        null, // invoiceStatus
        null, // customerId
        null, // territoryId
        null // signal
      )
      
      const allJobs = normalizeAPIResponse(jobsResponse, 'jobs')
      
      // Filter jobs by date range
      const filteredJobs = allJobs.filter(job => {
        if (!job.scheduled_date) return false
        
        let jobDate = new Date(job.scheduled_date)
        if (job.scheduled_date.includes('T')) {
          jobDate = new Date(job.scheduled_date.split('T')[0])
        } else {
          jobDate = new Date(job.scheduled_date.split(' ')[0])
        }
        
        // Normalize dates to compare only date parts (ignore time)
        const jobDateOnly = new Date(jobDate.getFullYear(), jobDate.getMonth(), jobDate.getDate())
        const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())
        const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate())
        
        return jobDateOnly >= startDateOnly && jobDateOnly <= endDateOnly
      })
      
      setJobs(filteredJobs)
    } catch (error) {
      console.error('❌ Error fetching jobs:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchTeamMembers = async () => {
    try {
      const teamResponse = await teamAPI.getAll(user.id, { page: 1, limit: 1000 })
      const members = teamResponse.teamMembers || teamResponse || []
      setTeamMembers(members)
    } catch (error) {
      console.error('❌ Error fetching team members:', error)
      setTeamMembers([])
    }
  }

  const fetchTerritories = async () => {
    try {
      const territoriesResponse = await territoriesAPI.getAll(user.id, { page: 1, limit: 1000 })
      const territoriesList = territoriesResponse.territories || territoriesResponse || []
      setTerritories(territoriesList)
    } catch (error) {
      console.error('❌ Error fetching territories:', error)
      setTerritories([])
    }
  }

  const applyFilters = () => {
    let filtered = [...jobs]
    
    // Team member assignment filter
    if (selectedFilter === 'unassigned') {
      filtered = filtered.filter(job => !job.assigned_team_member_id && !job.team_member_id)
    } else if (selectedFilter !== 'all') {
      filtered = filtered.filter(job => 
        job.assigned_team_member_id === selectedFilter || 
        job.team_member_id === selectedFilter
      )
    }
    
    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(job => job.status === statusFilter)
    }
    
    // Time range filter
    if (timeRangeFilter !== 'all') {
      filtered = filtered.filter(job => {
        if (!job.scheduled_date) return false
        
        // Extract time from scheduled_date
        let jobTime = null
        if (job.scheduled_date.includes('T')) {
          // ISO format: 2025-08-20T09:00:00
          const timePart = job.scheduled_date.split('T')[1]
          jobTime = new Date(`2000-01-01T${timePart}`)
        } else if (job.scheduled_date.includes(' ')) {
          // Space format: 2025-08-20 09:00:00
          const timePart = job.scheduled_date.split(' ')[1]
          jobTime = new Date(`2000-01-01T${timePart}`)
        }
        
        if (!jobTime) return true
        
        const hour = jobTime.getHours()
        
        switch (timeRangeFilter) {
          case 'morning':
            return hour < 12 // Before 12 PM
          case 'afternoon':
            return hour >= 12 && hour < 17 // 12 PM - 5 PM
          case 'evening':
            return hour >= 17 // After 5 PM
          default:
            return true
        }
      })
    }
    
    // Territory filter
    if (territoryFilter !== 'all') {
      filtered = filtered.filter(job => 
        job.territory_id === territoryFilter || 
        job.territory === territoryFilter
      )
    }
    
    setFilteredJobs(filtered)
  }

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    })
  }

  const handleDateChange = (newDate) => {
    setSelectedDate(newDate)
    setShowCalendar(false)
  }

  const generateCalendarDays = () => {
    const year = selectedDate.getFullYear()
    const month = selectedDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
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

  const toggleDayExpansion = (dayKey) => {
    const newExpanded = new Set(expandedDays)
    if (newExpanded.has(dayKey)) {
      newExpanded.delete(dayKey)
    } else {
      newExpanded.add(dayKey)
    }
    setExpandedDays(newExpanded)
  }

  const navigateDate = (direction) => {
    const newDate = new Date(selectedDate)
    if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() + direction)
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + (direction * 7))
    } else if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + direction)
    }
    setSelectedDate(newDate)
  }

  const getSummaryStats = () => {
    const totalJobs = filteredJobs.length
    const totalDuration = filteredJobs.reduce((sum, job) => {
      const duration = parseInt(job.service_duration || 0)
      return sum + duration
    }, 0)
    const totalEarnings = filteredJobs.reduce((sum, job) => {
      const price = parseFloat(job.total || job.price || job.service_price || 0)
      return sum + price
    }, 0)

    return {
      jobs: totalJobs,
      duration: `${Math.floor(totalDuration / 60)}h ${totalDuration % 60}m`,
      earnings: `$${totalEarnings.toFixed(0)}`
    }
  }

  const getWeekDays = () => {
    const startOfWeek = new Date(selectedDate)
    startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay())
    const days = []
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek)
      day.setDate(startOfWeek.getDate() + i)
      days.push(day)
    }
    return days
  }

  const getMonthDays = () => {
    const year = selectedDate.getFullYear()
    const month = selectedDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())
    
    const days = []
    const current = new Date(startDate)
    for (let i = 0; i < 42; i++) { // 6 weeks * 7 days
      days.push(new Date(current))
      current.setDate(current.getDate() + 1)
    }
    return days
  }

  const stats = getSummaryStats()

  return (
    <>
      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar - Always Collapsed */}
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)}
        forceCollapsed={true}
      />

      {/* Main Content */}
      <div className="flex-1 flex min-w-0 ml-20">
        {/* Filter Sidebar */}
        <div className="w-64 bg-white border-r border-gray-200 flex-shrink-0 flex flex-col h-screen">
          {/* Fixed Header */}
          <div className="p-4 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Schedule</h2>
              <button 
                onClick={() => {
                  // Navigate to create new job page
                  window.location.href = '/jobs/new'
                }}
                className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 transition-colors"
                title="Create New Job"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* Scrollable Filter Content */}
          <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
            
            {/* Assignment Filter */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">JOBS ASSIGNED TO</h3>
              
              {/* All Jobs Filter */}
              <button
                onClick={() => setSelectedFilter('all')}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-2 ${
                  selectedFilter === 'all' 
                    ? 'bg-blue-50 text-blue-700' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                  <Users className="w-4 h-4 text-blue-600" />
                </div>
                <span>All Jobs</span>
              </button>

              {/* Unassigned Filter */}
              <button
                onClick={() => setSelectedFilter('unassigned')}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-2 ${
                  selectedFilter === 'unassigned' 
                    ? 'bg-blue-50 text-blue-700' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-gray-600" />
                </div>
                <span>Unassigned</span>
              </button>

              {/* Team Members */}
              {teamMembers.map((member) => (
                <button
                  key={member.id}
                  onClick={() => setSelectedFilter(member.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-2 ${
                    selectedFilter === member.id 
                      ? 'bg-blue-50 text-blue-700' 
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">
                      {member.first_name?.charAt(0)}{member.last_name?.charAt(0)}
                    </span>
                  </div>
                  <span>{member.first_name} {member.last_name}</span>
                </button>
              ))}
            </div>

            {/* Status Filter */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">STATUS</h3>
              
              {/* All Statuses */}
              <button
                onClick={() => setStatusFilter('all')}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-2 ${
                  statusFilter === 'all' 
                    ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  statusFilter === 'all' ? 'bg-blue-100' : 'bg-gray-100'
                }`}>
                  <Filter className={`w-4 h-4 ${statusFilter === 'all' ? 'text-blue-600' : 'text-gray-600'}`} />
                </div>
                <span>All Statuses</span>
              </button>

              {/* Pending */}
              <button
                onClick={() => setStatusFilter('pending')}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-2 ${
                  statusFilter === 'pending' 
                    ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <div className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-yellow-600" />
                </div>
                <span>Pending</span>
              </button>

              {/* Confirmed */}
              <button
                onClick={() => setStatusFilter('confirmed')}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-2 ${
                  statusFilter === 'confirmed' 
                    ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-blue-600" />
                </div>
                <span>Confirmed</span>
              </button>

              {/* In Progress */}
              <button
                onClick={() => setStatusFilter('in_progress')}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-2 ${
                  statusFilter === 'in_progress' 
                    ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center">
                  <Play className="w-4 h-4 text-orange-600" />
                </div>
                <span>In Progress</span>
              </button>

              {/* Completed */}
              <button
                onClick={() => setStatusFilter('completed')}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-2 ${
                  statusFilter === 'completed' 
                    ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
                <span>Completed</span>
              </button>

              {/* Cancelled */}
              <button
                onClick={() => setStatusFilter('cancelled')}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-2 ${
                  statusFilter === 'cancelled' 
                    ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
                  <XCircle className="w-4 h-4 text-red-600" />
                </div>
                <span>Cancelled</span>
              </button>
            </div>

            {/* Territory Filter */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">TERRITORIES</h3>
              
              {/* All Territories */}
              <button
                onClick={() => setTerritoryFilter('all')}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-2 ${
                  territoryFilter === 'all' 
                    ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  territoryFilter === 'all' ? 'bg-blue-100' : 'bg-gray-100'
                }`}>
                  <MapPin className={`w-4 h-4 ${territoryFilter === 'all' ? 'text-blue-600' : 'text-gray-600'}`} />
                </div>
                <span>All Territories</span>
              </button>

              {/* Territory Options */}
              {territories.map((territory) => (
                <button
                  key={territory.id}
                  onClick={() => setTerritoryFilter(territory.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-2 ${
                    territoryFilter === territory.id 
                      ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    territoryFilter === territory.id ? 'bg-blue-100' : 'bg-gray-100'
                  }`}>
                    <MapPin className={`w-4 h-4 ${territoryFilter === territory.id ? 'text-blue-600' : 'text-gray-600'}`} />
                  </div>
                  <span>{territory.name}</span>
                </button>
              ))}
            </div>

            {/* Time Range Filter */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">TIME RANGE</h3>
              
              {/* All Day */}
              <button
                onClick={() => setTimeRangeFilter('all')}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-2 ${
                  timeRangeFilter === 'all' 
                    ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  timeRangeFilter === 'all' ? 'bg-blue-100' : 'bg-gray-100'
                }`}>
                  <Calendar className={`w-4 h-4 ${timeRangeFilter === 'all' ? 'text-blue-600' : 'text-gray-600'}`} />
                </div>
                <span>All Day</span>
              </button>

              {/* Morning */}
              <button
                onClick={() => setTimeRangeFilter('morning')}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-2 ${
                  timeRangeFilter === 'morning' 
                    ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  timeRangeFilter === 'morning' ? 'bg-blue-100' : 'bg-gray-100'
                }`}>
                  <Clock className={`w-4 h-4 ${timeRangeFilter === 'morning' ? 'text-blue-600' : 'text-gray-600'}`} />
                </div>
                <span>Morning (Before 12 PM)</span>
              </button>

              {/* Afternoon */}
              <button
                onClick={() => setTimeRangeFilter('afternoon')}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-2 ${
                  timeRangeFilter === 'afternoon' 
                    ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  timeRangeFilter === 'afternoon' ? 'bg-blue-100' : 'bg-gray-100'
                }`}>
                  <Clock className={`w-4 h-4 ${timeRangeFilter === 'afternoon' ? 'text-blue-600' : 'text-gray-600'}`} />
                </div>
                <span>Afternoon (12 PM - 5 PM)</span>
              </button>

              {/* Evening */}
              <button
                onClick={() => setTimeRangeFilter('evening')}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-2 ${
                  timeRangeFilter === 'evening' 
                    ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  timeRangeFilter === 'evening' ? 'bg-blue-100' : 'bg-gray-100'
                }`}>
                  <Clock className={`w-4 h-4 ${timeRangeFilter === 'evening' ? 'text-blue-600' : 'text-gray-600'}`} />
                </div>
                <span>Evening (After 5 PM)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Schedule Content */}
        <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto scrollbar-hide bg-gray-50">
          {/* Mobile Header */}
          <MobileHeader onMenuClick={() => setSidebarOpen(true)} />

        {/* Top Header Bar */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left side - Date navigation */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 relative">
                <button 
                  onClick={() => navigateDate(-1)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setShowCalendar(!showCalendar)}
                  className="text-sm font-medium text-gray-900 min-w-[140px] text-center hover:bg-gray-100 rounded px-2 py-1 transition-colors"
                >
                  {formatDate(selectedDate)}
                </button>
                <button 
                  onClick={() => navigateDate(1)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                {/* Calendar Popup */}
                {showCalendar && (
                  <div ref={calendarRef} className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-4">
                    <div className="grid grid-cols-7 gap-1 w-64">
                      {/* Calendar Header */}
                      <div className="col-span-7 flex items-center justify-between mb-2">
                        <button 
                          onClick={() => {
                            const newDate = new Date(selectedDate)
                            newDate.setMonth(newDate.getMonth() - 1)
                            setSelectedDate(newDate)
                          }}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-sm font-medium">
                          {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </span>
                        <button 
                          onClick={() => {
                            const newDate = new Date(selectedDate)
                            newDate.setMonth(newDate.getMonth() + 1)
                            setSelectedDate(newDate)
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
                      {generateCalendarDays().map((day, index) => {
                        const isCurrentMonth = day.getMonth() === selectedDate.getMonth()
                        const isSelected = day.toDateString() === selectedDate.toDateString()
                        const isToday = day.toDateString() === new Date().toDateString()
                        
                        return (
                          <button
                            key={index}
                            onClick={() => handleDateChange(day)}
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

            {/* Center - View mode selector */}
            <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('day')}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'day' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Day
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'week' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Week
              </button>
              <button
                onClick={() => setViewMode('month')}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'month' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Month
              </button>
            </div>

            {/* Right side - Full screen button */}
            <button className="p-2 hover:bg-gray-100 rounded">
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex">
          {/* Left Panel - Job Details or Calendar View */}
          <div className={`${viewMode === 'day' ? 'w-1/2' : 'w-full'} p-6 space-y-6 bg-gray-50`}>
            {/* Summary Statistics (only in day view) */}
            {viewMode === 'day' && (
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{stats.jobs}</div>
                    <div className="text-sm text-gray-600">On the schedule</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{stats.duration}</div>
                    <div className="text-sm text-gray-600">Est. duration</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{stats.earnings}</div>
                    <div className="text-sm text-gray-600">Est. earnings</div>
                  </div>
                </div>
              </div>
            )}

            {/* Calendar Grid Views */}
            {viewMode === 'week' && (
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Weekly View</h3>
                <div className="grid grid-cols-7 gap-2">
                  {getWeekDays().map((day, index) => {
                    const dayJobs = filteredJobs.filter(job => {
                      const jobDate = new Date(job.scheduled_date)
                      return jobDate.toDateString() === day.toDateString()
                    })
                    
                    return (
                      <div key={index} className="border border-gray-200 rounded-lg p-2 min-h-[120px]">
                        <div className="text-xs font-medium text-gray-600 mb-2">
                          {day.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </div>
                        {dayJobs.map((job, jobIndex) => (
                          <div key={jobIndex} className="bg-blue-50 border border-blue-200 rounded p-2 mb-1 text-xs">
                            <div className="font-medium text-blue-900">{job.id}</div>
                            <div className="text-blue-700">{new Date(job.scheduled_date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</div>
                            <div className="text-blue-600 truncate">{job.customer_name || 'Customer'}</div>
                          </div>
                        ))}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {viewMode === 'month' && (
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly View</h3>
                <div className="grid grid-cols-7 gap-1">
                  {/* Month header */}
                  {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
                    <div key={day} className="text-center text-xs font-medium text-gray-600 py-2">
                      {day}
                    </div>
                  ))}
                  {/* Month days */}
                  {getMonthDays().map((day, index) => {
                    const dayJobs = filteredJobs.filter(job => {
                      const jobDate = new Date(job.scheduled_date)
                      return jobDate.toDateString() === day.toDateString()
                    })
                    
                    const dayKey = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`
                    const isExpanded = expandedDays.has(dayKey)
                    const showJobs = isExpanded ? dayJobs : dayJobs.slice(0, 2)
                    
                    return (
                      <div key={index} className={`border border-gray-200 rounded p-1 min-h-[60px] ${
                        day.getMonth() !== selectedDate.getMonth() ? 'bg-gray-50 text-gray-400' : 'bg-white'
                      }`}>
                        <div className="text-xs font-medium mb-1">{day.getDate()}</div>
                        {showJobs.map((job, jobIndex) => (
                          <div key={jobIndex} className="bg-blue-50 border border-blue-200 rounded p-1 mb-1 text-xs">
                            <div className="font-medium text-blue-900 truncate">#{job.id}</div>
                            <div className="text-blue-700">{new Date(job.scheduled_date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</div>
                          </div>
                        ))}
                        {dayJobs.length > 2 && (
                          <button
                            onClick={() => toggleDayExpansion(dayKey)}
                            className="text-xs text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                          >
                            {isExpanded ? 'Show less' : `+${dayJobs.length - 2} more`}
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Job Details Card (only in day view) */}
            {viewMode === 'day' && filteredJobs.map((job) => {
              // Format job data
              const jobDate = new Date(job.scheduled_date)
              const timeString = jobDate.toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit',
                hour12: true 
              })
              const endTime = new Date(jobDate.getTime() + (job.service_duration || 0) * 60000)
              const endTimeString = endTime.toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit',
                hour12: true 
              })
              const duration = job.service_duration ? `${Math.floor(job.service_duration / 60)}h ${job.service_duration % 60}m` : 'N/A'
              const serviceName = job.service_name || job.service_type || 'Service'
              const customerName = job.customer_name || job.customer?.name || 'Customer'
              const address = job.customer_address || job.address || 'Address not provided'
              
              return (
                <div key={job.id} className="bg-white rounded-lg border border-gray-200 p-6 relative mb-4">
                  <div className="absolute top-4 right-4">
                    <span className="bg-gray-100 text-gray-800 text-xs font-medium px-3 py-1 rounded-full">
                      {job.status || 'Scheduled'}
                    </span>
                  </div>
                  
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">JOB #{job.id}</h3>
                  </div>

                  <div className="space-y-4">
                    {/* Time and Duration */}
                    <div className="flex items-center space-x-3">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900">{timeString} - {endTimeString}</span>
                      <span className="text-sm text-gray-500">{duration}</span>
                      <User className="w-4 h-4 text-gray-400" />
                    </div>

                    {/* Service Details */}
                    <div className="space-y-2">
                      <div className="text-base font-medium text-gray-900">{serviceName}</div>
                      <div className="text-sm text-gray-600">{customerName}</div>
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <MapPin className="w-4 h-4" />
                        <span>{address}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Empty state when no jobs (only in day view) */}
            {viewMode === 'day' && filteredJobs.length === 0 && !isLoading && (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No jobs scheduled</h3>
                <p className="text-gray-600">No jobs are scheduled for this date.</p>
              </div>
            )}
          </div>

          {/* Right Panel - Map (only in day view) */}
          {viewMode === 'day' && (
            <div className="w-1/2 bg-white border-l border-gray-200">
            {/* Map Header */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setMapView('roadmap')}
                    className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                      mapView === 'roadmap' 
                        ? 'bg-white text-gray-900 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Map
                  </button>
                  <button
                    onClick={() => setMapView('satellite')}
                    className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                      mapView === 'satellite' 
                        ? 'bg-white text-gray-900 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Satellite
                  </button>
                </div>
              </div>
            </div>

            {/* Map Container */}
            <div className="h-[calc(100vh-200px)] relative">
              {filteredJobs.length > 0 ? (
                <div className="h-full">
                  {(() => {
                    const firstJob = filteredJobs[0]
                    const jobDate = new Date(firstJob.scheduled_date)
                    const timeString = jobDate.toLocaleTimeString('en-US', { 
                      hour: 'numeric', 
                      minute: '2-digit',
                      hour12: true 
                    })
                    const serviceName = firstJob.service_name || firstJob.service_type || 'Service'
                    const customerName = firstJob.customer_name || firstJob.customer?.name || 'Customer'
                    const address = firstJob.customer_address || firstJob.address || 'Address not provided'
                    
                    // Use address for map if no coordinates
                    const mapQuery = firstJob.latitude && firstJob.longitude 
                      ? `${firstJob.latitude},${firstJob.longitude}`
                      : encodeURIComponent(address)
                    
                    return (
                      <>
                        <iframe
                          src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${mapQuery}&zoom=12&maptype=${mapView === 'satellite' ? 'satellite' : 'roadmap'}`}
                          width="100%"
                          height="100%"
                          style={{ border: 0 }}
                          allowFullScreen=""
                          loading="lazy"
                          referrerPolicy="no-referrer-when-downgrade"
                          title="Job Location Map"
                        />
                        
                        {/* Map Marker Popup */}
                        <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-3 max-w-xs">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-900">{timeString}</span>
                            <button 
                              onClick={() => setShowJobDetails(!showJobDetails)}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          {showJobDetails && (
                            <div className="text-xs text-gray-600">
                              <div className="font-medium">{serviceName}</div>
                              <div>{customerName}</div>
                              <div>{address}</div>
                            </div>
                          )}
                        </div>
                      </>
                    )
                  })()}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center bg-gray-50">
                  <div className="text-center">
                    <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No locations to show</h3>
                    <p className="text-gray-600">No jobs with locations for this date.</p>
                  </div>
                </div>
              )}

              {/* Floating Action Button */}
              <button className="absolute bottom-6 right-6 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors">
                <MessageCircle className="w-5 h-5" />
              </button>
            </div>
          </div>
          )}
        </div>
        </div>
      </div>
    </div>
    </>
  )
}

export default ScheduleRedesigned

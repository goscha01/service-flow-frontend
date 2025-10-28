"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import Sidebar from "../components/sidebar-collapsible"
import MobileHeader from "../components/mobile-header"
import { teamAPI, territoriesAPI } from "../services/api"
import api from "../services/api"
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
  XCircle,
  ChevronDown
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
  const [selectedJobDetails, setSelectedJobDetails] = useState(null)
  const [showJobDetailsOverlay, setShowJobDetailsOverlay] = useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const [showNotificationModal, setShowNotificationModal] = useState(false)
  const [notificationType, setNotificationType] = useState('confirmation')
  const [selectedNotificationMethod, setSelectedNotificationMethod] = useState('email')
  const [notificationEmail, setNotificationEmail] = useState('')
  const [notificationPhone, setNotificationPhone] = useState('')
  const [isSendingNotification, setIsSendingNotification] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [showEditCustomerModal, setShowEditCustomerModal] = useState(false)
  const [showEditAddressModal, setShowEditAddressModal] = useState(false)
  const [showRescheduleModal, setShowRescheduleModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [isUpdatingJob, setIsUpdatingJob] = useState(false)
  
  // Form data for editing
  const [editFormData, setEditFormData] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    service_address: '',
    scheduled_date: '',
    scheduled_time: '',
    notes: '',
    internal_notes: ''
  })


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

  const fetchJobs = useCallback(async () => {
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
      
        // Filter jobs by date range without timezone conversion
        const filteredJobs = allJobs.filter(job => {
          if (!job.scheduled_date) return false
          
          // Extract date part without timezone conversion
          let jobDateString = ''
          if (job.scheduled_date.includes('T')) {
            jobDateString = job.scheduled_date.split('T')[0] // YYYY-MM-DD
          } else if (job.scheduled_date.includes(' ')) {
            jobDateString = job.scheduled_date.split(' ')[0] // YYYY-MM-DD
          } else {
            jobDateString = job.scheduled_date // Already YYYY-MM-DD
          }
          
          // Format start and end dates as YYYY-MM-DD strings
          const startDateString = startDate.toISOString().split('T')[0]
          const endDateString = endDate.toISOString().split('T')[0]
          
          return jobDateString >= startDateString && jobDateString <= endDateString
        })
      
      setJobs(filteredJobs)
    } catch (error) {
      console.error('❌ Error fetching jobs:', error)
    } finally {
      setIsLoading(false)
    }
  }, [user, selectedDate, viewMode])

  const fetchTeamMembers = useCallback(async () => {
    try {
      const teamResponse = await teamAPI.getAll(user.id, { page: 1, limit: 1000 })
      const members = teamResponse.teamMembers || teamResponse || []
      setTeamMembers(members)
    } catch (error) {
      console.error('❌ Error fetching team members:', error)
      setTeamMembers([])
    }
  }, [user])

  const fetchTerritories = useCallback(async () => {
    try {
      const territoriesResponse = await territoriesAPI.getAll(user.id, { page: 1, limit: 1000 })
      const territoriesList = territoriesResponse.territories || territoriesResponse || []
      setTerritories(territoriesList)
    } catch (error) {
      console.error('❌ Error fetching territories:', error)
      setTerritories([])
    }
  }, [user])

  const applyFilters = useCallback(() => {
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
  }, [jobs, selectedFilter, statusFilter, timeRangeFilter, territoryFilter])

  useEffect(() => {
    if (user?.id) {
      fetchJobs()
      fetchTeamMembers()
      fetchTerritories()
    }
  }, [user, selectedDate, viewMode, fetchJobs, fetchTeamMembers, fetchTerritories])

  useEffect(() => {
    applyFilters()
  }, [jobs, selectedFilter, statusFilter, timeRangeFilter, territoryFilter, applyFilters])

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

  const handleJobClick = (job) => {
    setSelectedJobDetails(job)
    setShowJobDetailsOverlay(true)
  }

  const closeJobDetailsOverlay = () => {
    setShowJobDetailsOverlay(false)
    setSelectedJobDetails(null)
    setShowStatusMenu(false)
    setShowNotificationModal(false)
    setSuccessMessage('')
    setErrorMessage('')
  }

  const handleStatusChange = async (newStatus) => {
    if (!selectedJobDetails) return
    
    try {
      setIsUpdatingStatus(true)
      setErrorMessage('')
      
      await jobsAPI.updateStatus(selectedJobDetails.id, newStatus)
      
      // Update the job in local state
      setSelectedJobDetails(prev => ({ ...prev, status: newStatus }))
      
      // Update the job in the main jobs list
      setJobs(prevJobs => prevJobs.map(job => 
        job.id === selectedJobDetails.id ? { ...job, status: newStatus } : job
      ))
      
      // Update filtered jobs as well
      setFilteredJobs(prevFilteredJobs => prevFilteredJobs.map(job => 
        job.id === selectedJobDetails.id ? { ...job, status: newStatus } : job
      ))
      
      setSuccessMessage(`Job marked as ${newStatus.replace('_', ' ')}`)
      setTimeout(() => setSuccessMessage(''), 3000)
      setShowStatusMenu(false)
      
    } catch (error) {
      console.error('Error updating job status:', error)
      setErrorMessage('Failed to update job status')
      setTimeout(() => setErrorMessage(''), 3000)
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const handleSendNotification = async () => {
    if (!selectedJobDetails) return
    
    try {
      setIsSendingNotification(true)
      setErrorMessage('')
      
      const notificationData = {
        notificationType,
        customerEmail: selectedNotificationMethod === 'email' ? notificationEmail : selectedJobDetails.customer_email,
        jobId: selectedJobDetails.id,
        customerName: selectedJobDetails.customer_name || selectedJobDetails.customer?.name || 'Customer',
        serviceName: selectedJobDetails.service_name || selectedJobDetails.service_type || 'Service',
        scheduledDate: selectedJobDetails.scheduled_date,
        serviceAddress: selectedJobDetails.customer_address || selectedJobDetails.address || 'Address not provided'
      }
      
      await api.post('/send-appointment-notification', notificationData)
      
      setSuccessMessage(`${notificationType === 'confirmation' ? 'Confirmation' : 'Reminder'} sent successfully`)
      setTimeout(() => setSuccessMessage(''), 3000)
      setShowNotificationModal(false)
      
    } catch (error) {
      console.error('Error sending notification:', error)
      setErrorMessage('Failed to send notification')
      setTimeout(() => setErrorMessage(''), 3000)
    } finally {
      setIsSendingNotification(false)
    }
  }


  const handleEditCustomer = () => {
    if (!selectedJobDetails) return
    
    // Parse the current scheduled date and time without timezone conversion
    let currentDate = ''
    let currentTime = ''
    
    if (selectedJobDetails.scheduled_date) {
      // Handle different date formats without timezone conversion
      if (selectedJobDetails.scheduled_date.includes('T')) {
        // ISO format: 2025-10-23T09:00:00
        const [datePart, timePart] = selectedJobDetails.scheduled_date.split('T')
        currentDate = datePart // YYYY-MM-DD
        currentTime = timePart.substring(0, 5) // HH:MM
      } else if (selectedJobDetails.scheduled_date.includes(' ')) {
        // Space format: 2025-10-23 09:00:00
        const [datePart, timePart] = selectedJobDetails.scheduled_date.split(' ')
        currentDate = datePart // YYYY-MM-DD
        currentTime = timePart.substring(0, 5) // HH:MM
      } else {
        // Just date: 2025-10-23
        currentDate = selectedJobDetails.scheduled_date
        currentTime = '09:00' // Default time
      }
    }
    
    setEditFormData({
      customer_name: selectedJobDetails.customer_name || selectedJobDetails.customer?.name || '',
      customer_email: selectedJobDetails.customer_email || selectedJobDetails.customer?.email || '',
      customer_phone: selectedJobDetails.customer_phone || selectedJobDetails.customer?.phone || '',
      service_address: selectedJobDetails.customer_address || selectedJobDetails.address || '',
      scheduled_date: currentDate,
      scheduled_time: currentTime,
      notes: selectedJobDetails.notes || '',
      internal_notes: selectedJobDetails.internal_notes || ''
    })
    setShowEditCustomerModal(true)
  }

  const handleEditAddress = () => {
    if (!selectedJobDetails) return
    
    // Parse the current scheduled date and time without timezone conversion
    let currentDate = ''
    let currentTime = ''
    
    if (selectedJobDetails.scheduled_date) {
      // Handle different date formats without timezone conversion
      if (selectedJobDetails.scheduled_date.includes('T')) {
        // ISO format: 2025-10-23T09:00:00
        const [datePart, timePart] = selectedJobDetails.scheduled_date.split('T')
        currentDate = datePart // YYYY-MM-DD
        currentTime = timePart.substring(0, 5) // HH:MM
      } else if (selectedJobDetails.scheduled_date.includes(' ')) {
        // Space format: 2025-10-23 09:00:00
        const [datePart, timePart] = selectedJobDetails.scheduled_date.split(' ')
        currentDate = datePart // YYYY-MM-DD
        currentTime = timePart.substring(0, 5) // HH:MM
      } else {
        // Just date: 2025-10-23
        currentDate = selectedJobDetails.scheduled_date
        currentTime = '09:00' // Default time
      }
    }
    
    setEditFormData({
      customer_name: selectedJobDetails.customer_name || selectedJobDetails.customer?.name || '',
      customer_email: selectedJobDetails.customer_email || selectedJobDetails.customer?.email || '',
      customer_phone: selectedJobDetails.customer_phone || selectedJobDetails.customer?.phone || '',
      service_address: selectedJobDetails.customer_address || selectedJobDetails.address || '',
      scheduled_date: currentDate,
      scheduled_time: currentTime,
      notes: selectedJobDetails.notes || '',
      internal_notes: selectedJobDetails.internal_notes || ''
    })
    setShowEditAddressModal(true)
  }

  const handleReschedule = () => {
    if (!selectedJobDetails) return
    
    // Parse the current scheduled date and time without timezone conversion
    let currentDate = ''
    let currentTime = ''
    
    if (selectedJobDetails.scheduled_date) {
      console.log('Original scheduled_date:', selectedJobDetails.scheduled_date) // Debug log
      
      // Handle different date formats without timezone conversion
      if (selectedJobDetails.scheduled_date.includes('T')) {
        // ISO format: 2025-10-23T09:00:00
        const [datePart, timePart] = selectedJobDetails.scheduled_date.split('T')
        currentDate = datePart // YYYY-MM-DD
        currentTime = timePart.substring(0, 5) // HH:MM
      } else if (selectedJobDetails.scheduled_date.includes(' ')) {
        // Space format: 2025-10-23 09:00:00
        const [datePart, timePart] = selectedJobDetails.scheduled_date.split(' ')
        currentDate = datePart // YYYY-MM-DD
        currentTime = timePart.substring(0, 5) // HH:MM
      } else {
        // Just date: 2025-10-23
        currentDate = selectedJobDetails.scheduled_date
        currentTime = '09:00' // Default time
      }
      
      console.log('Extracted date:', currentDate, 'time:', currentTime) // Debug log
    }
    
    setEditFormData({
      customer_name: selectedJobDetails.customer_name || selectedJobDetails.customer?.name || '',
      customer_email: selectedJobDetails.customer_email || selectedJobDetails.customer?.email || '',
      customer_phone: selectedJobDetails.customer_phone || selectedJobDetails.customer?.phone || '',
      service_address: selectedJobDetails.customer_address || selectedJobDetails.address || '',
      scheduled_date: currentDate,
      scheduled_time: currentTime,
      notes: selectedJobDetails.notes || '',
      internal_notes: selectedJobDetails.internal_notes || ''
    })
    setShowRescheduleModal(true)
  }

  const handleOpenAssignModal = () => {
    setShowAssignModal(true)
  }

  const handleCancelJob = () => {
    setShowCancelModal(true)
  }

  const handleSaveCustomer = async () => {
    if (!selectedJobDetails) return
    
    try {
      setIsUpdatingJob(true)
      setErrorMessage('')
      
      const updateData = {
        customer_name: editFormData.customer_name,
        customer_email: editFormData.customer_email,
        customer_phone: editFormData.customer_phone
      }
      
      await jobsAPI.update(selectedJobDetails.id, updateData)
      
      // Update local state
      setSelectedJobDetails(prev => ({
        ...prev,
        customer_name: editFormData.customer_name,
        customer_email: editFormData.customer_email,
        customer_phone: editFormData.customer_phone
      }))
      
      // Update the job in the main jobs list
      setJobs(prevJobs => prevJobs.map(job => 
        job.id === selectedJobDetails.id ? { 
          ...job, 
          customer_name: editFormData.customer_name,
          customer_email: editFormData.customer_email,
          customer_phone: editFormData.customer_phone
        } : job
      ))
      
      // Update filtered jobs as well
      setFilteredJobs(prevFilteredJobs => prevFilteredJobs.map(job => 
        job.id === selectedJobDetails.id ? { 
          ...job, 
          customer_name: editFormData.customer_name,
          customer_email: editFormData.customer_email,
          customer_phone: editFormData.customer_phone
        } : job
      ))
      
      setSuccessMessage('Customer information updated successfully!')
      setTimeout(() => setSuccessMessage(''), 3000)
      setShowEditCustomerModal(false)
      
    } catch (error) {
      console.error('Error updating customer:', error)
      setErrorMessage('Failed to update customer information')
      setTimeout(() => setErrorMessage(''), 3000)
    } finally {
      setIsUpdatingJob(false)
    }
  }

  const handleSaveAddress = async () => {
    if (!selectedJobDetails) return
    
    try {
      setIsUpdatingJob(true)
      setErrorMessage('')
      
      const updateData = {
        service_address: editFormData.service_address,
        customer_address: editFormData.service_address
      }
      
      await jobsAPI.update(selectedJobDetails.id, updateData)
      
      // Update local state
      setSelectedJobDetails(prev => ({
        ...prev,
        service_address: editFormData.service_address,
        customer_address: editFormData.service_address
      }))
      
      // Update the job in the main jobs list
      setJobs(prevJobs => prevJobs.map(job => 
        job.id === selectedJobDetails.id ? { 
          ...job, 
          service_address: editFormData.service_address,
          customer_address: editFormData.service_address
        } : job
      ))
      
      // Update filtered jobs as well
      setFilteredJobs(prevFilteredJobs => prevFilteredJobs.map(job => 
        job.id === selectedJobDetails.id ? { 
          ...job, 
          service_address: editFormData.service_address,
          customer_address: editFormData.service_address
        } : job
      ))
      
      setSuccessMessage('Service address updated successfully!')
      setTimeout(() => setSuccessMessage(''), 3000)
      setShowEditAddressModal(false)
      
    } catch (error) {
      console.error('Error updating address:', error)
      setErrorMessage('Failed to update service address')
      setTimeout(() => setErrorMessage(''), 3000)
    } finally {
      setIsUpdatingJob(false)
    }
  }

  const handleSaveReschedule = async () => {
    if (!selectedJobDetails) return
    
    try {
      setIsUpdatingJob(true)
      setErrorMessage('')
      
      const newDateTime = `${editFormData.scheduled_date}T${editFormData.scheduled_time}:00`
      
      console.log('Rescheduling with data:', {
        scheduledDate: newDateTime
      }) // Debug log
      
      // Use the correct field name that the API expects
      const updateData = {
        scheduledDate: newDateTime
      }
      
      await jobsAPI.update(selectedJobDetails.id, updateData)
      
      // Update local state
      setSelectedJobDetails(prev => ({
        ...prev,
        scheduled_date: newDateTime
      }))
      
      // Update the job in the main jobs list
      setJobs(prevJobs => prevJobs.map(job => 
        job.id === selectedJobDetails.id ? { 
          ...job, 
          scheduled_date: newDateTime
        } : job
      ))
      
      // Update filtered jobs as well
      setFilteredJobs(prevFilteredJobs => prevFilteredJobs.map(job => 
        job.id === selectedJobDetails.id ? { 
          ...job, 
          scheduled_date: newDateTime
        } : job
      ))
      
      setSuccessMessage('Job rescheduled successfully!')
      setTimeout(() => setSuccessMessage(''), 3000)
      setShowRescheduleModal(false)
      
    } catch (error) {
      console.error('Error rescheduling job:', error)
      setErrorMessage('Failed to reschedule job')
      setTimeout(() => setErrorMessage(''), 3000)
    } finally {
      setIsUpdatingJob(false)
    }
  }

  const handleAssignTeamMember = async (teamMemberId) => {
    if (!selectedJobDetails) return
    
    try {
      setIsUpdatingJob(true)
      setErrorMessage('')
      
      await jobsAPI.assignToTeamMember(selectedJobDetails.id, teamMemberId)
      
      // Update local state
      setSelectedJobDetails(prev => ({
        ...prev,
        assigned_team_member_id: teamMemberId,
        team_member_id: teamMemberId
      }))
      
      // Update the job in the main jobs list
      setJobs(prevJobs => prevJobs.map(job => 
        job.id === selectedJobDetails.id ? { 
          ...job, 
          assigned_team_member_id: teamMemberId,
          team_member_id: teamMemberId
        } : job
      ))
      
      // Update filtered jobs as well
      setFilteredJobs(prevFilteredJobs => prevFilteredJobs.map(job => 
        job.id === selectedJobDetails.id ? { 
          ...job, 
          assigned_team_member_id: teamMemberId,
          team_member_id: teamMemberId
        } : job
      ))
      
      setSuccessMessage('Team member assigned successfully!')
      setTimeout(() => setSuccessMessage(''), 3000)
      setShowAssignModal(false)
      
    } catch (error) {
      console.error('Error assigning team member:', error)
      setErrorMessage('Failed to assign team member')
      setTimeout(() => setErrorMessage(''), 3000)
    } finally {
      setIsUpdatingJob(false)
    }
  }

  const handleCancelJobConfirm = async () => {
    if (!selectedJobDetails) return
    
    try {
      setIsUpdatingJob(true)
      setErrorMessage('')
      
      await jobsAPI.updateStatus(selectedJobDetails.id, 'cancelled')
      
      // Update local state
      setSelectedJobDetails(prev => ({ ...prev, status: 'cancelled' }))
      
      // Update the job in the main jobs list
      setJobs(prevJobs => prevJobs.map(job => 
        job.id === selectedJobDetails.id ? { ...job, status: 'cancelled' } : job
      ))
      
      // Update filtered jobs as well
      setFilteredJobs(prevFilteredJobs => prevFilteredJobs.map(job => 
        job.id === selectedJobDetails.id ? { ...job, status: 'cancelled' } : job
      ))
      
      setSuccessMessage('Job cancelled successfully!')
      setTimeout(() => setSuccessMessage(''), 3000)
      setShowCancelModal(false)
      
    } catch (error) {
      console.error('Error cancelling job:', error)
      setErrorMessage('Failed to cancel job')
      setTimeout(() => setErrorMessage(''), 3000)
    } finally {
      setIsUpdatingJob(false)
    }
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
      <div className="flex-1 flex min-w-0">
        {/* Filter Sidebar - Hidden on mobile */}
        <div className="hidden lg:flex w-64 bg-white border-r border-gray-200 flex-shrink-0 flex-col h-screen">
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
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            {/* Left side - Date navigation */}
            <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
              <div className="flex items-center space-x-2 relative">
                <button 
                  onClick={() => navigateDate(-1)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setShowCalendar(!showCalendar)}
                  className="text-xs sm:text-sm font-medium text-gray-900 min-w-[120px] sm:min-w-[140px] text-center hover:bg-gray-100 rounded px-2 py-1 transition-colors"
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
                  <div ref={calendarRef} className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-4 w-72 sm:w-80">
                    <div className="grid grid-cols-7 gap-1">
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
            <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1 w-full sm:w-auto justify-center">
              <button
                onClick={() => setViewMode('day')}
                className={`px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium rounded-md transition-colors flex-1 sm:flex-none ${
                  viewMode === 'day' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Day
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium rounded-md transition-colors flex-1 sm:flex-none ${
                  viewMode === 'week' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Week
              </button>
              <button
                onClick={() => setViewMode('month')}
                className={`px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium rounded-md transition-colors flex-1 sm:flex-none ${
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

        {/* Mobile Filter Bar */}
        <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex flex-wrap gap-2">
            {/* Assignment Filter */}
            <div className="flex items-center space-x-2">
              <span className="text-xs font-medium text-gray-600">ASSIGNED:</span>
              <select
                value={selectedFilter}
                onChange={(e) => setSelectedFilter(e.target.value)}
                className="text-xs border border-gray-300 rounded px-2 py-1 bg-white"
              >
                <option value="all">All Jobs</option>
                <option value="unassigned">Unassigned</option>
                {teamMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.first_name} {member.last_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center space-x-2">
              <span className="text-xs font-medium text-gray-600">STATUS:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs border border-gray-300 rounded px-2 py-1 bg-white"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Time Range Filter */}
            <div className="flex items-center space-x-2">
              <span className="text-xs font-medium text-gray-600">TIME:</span>
              <select
                value={timeRangeFilter}
                onChange={(e) => setTimeRangeFilter(e.target.value)}
                className="text-xs border border-gray-300 rounded px-2 py-1 bg-white"
              >
                <option value="all">All Time</option>
                <option value="morning">Morning</option>
                <option value="afternoon">Afternoon</option>
                <option value="evening">Evening</option>
              </select>
            </div>

            {/* Territory Filter */}
            <div className="flex items-center space-x-2">
              <span className="text-xs font-medium text-gray-600">AREA:</span>
              <select
                value={territoryFilter}
                onChange={(e) => setTerritoryFilter(e.target.value)}
                className="text-xs border border-gray-300 rounded px-2 py-1 bg-white"
              >
                <option value="all">All Areas</option>
                {territories.map((territory) => (
                  <option key={territory.id} value={territory.id}>
                    {territory.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex">
          {/* Left Panel - Job Details or Calendar View */}
          <div className={`${viewMode === 'day' ? 'w-full lg:w-1/2' : 'w-full'} p-4 sm:p-6 space-y-6 bg-gray-50`}>
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
                          <div key={jobIndex} className="bg-blue-50 border border-blue-200 rounded p-2 mb-1 text-xs cursor-pointer hover:bg-blue-100 transition-colors" onClick={() => handleJobClick(job)}>
                            <div className="font-medium text-blue-900">{job.id}</div>
                            <div className="text-blue-700">{new Date(job.scheduled_date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</div>
                            <div className="text-blue-600 truncate">{job.service_name || job.service_type || 'Service'}</div>
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
                          <div key={jobIndex} className="bg-blue-50 border border-blue-200 rounded p-1 mb-1 text-xs cursor-pointer hover:bg-blue-100 transition-colors" onClick={() => handleJobClick(job)}>
                            <div className="font-medium text-blue-900 truncate">#{job.id}</div>
                            <div className="text-blue-700">{new Date(job.scheduled_date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</div>
                            <div className="text-blue-600 truncate">{job.service_name || job.service_type || 'Service'}</div>
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
                <div key={job.id} className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 relative mb-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleJobClick(job)}>
                  <div className="absolute top-2 sm:top-4 right-2 sm:right-4">
                    <span className="bg-gray-100 text-gray-800 text-xs font-medium px-2 sm:px-3 py-1 rounded-full">
                      {job.status || 'Scheduled'}
                    </span>
                  </div>
                  
                  <div className="mb-3 sm:mb-4">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900">JOB #{job.id}</h3>
                  </div>

                  <div className="space-y-3 sm:space-y-4">
                    {/* Time and Duration */}
                    <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-3">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="text-xs sm:text-sm font-medium text-gray-900">{timeString} - {endTimeString}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs sm:text-sm text-gray-500">{duration}</span>
                        <User className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>

                    {/* Service Details */}
                    <div className="space-y-2">
                      <div className="text-sm sm:text-base font-medium text-gray-900">{serviceName}</div>
                      <div className="text-xs sm:text-sm text-gray-600">{customerName}</div>
                      <div className="flex items-start space-x-2 text-xs sm:text-sm text-gray-500">
                        <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span className="break-words">{address}</span>
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
            <div className="hidden lg:block w-1/2 bg-white border-l border-gray-200">
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

            {/* Map Container - Hidden on mobile */}
            <div className="hidden lg:block h-[calc(100vh-200px)] relative">
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

      {/* Job Details Overlay */}
      {showJobDetailsOverlay && selectedJobDetails && (
        <div className="hidden">
          {console.log('Selected job details:', selectedJobDetails)}
          {console.log('Job status:', selectedJobDetails?.status)}
        </div>
      )}
      {showJobDetailsOverlay && selectedJobDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end">
          <div className="bg-white w-full max-w-2xl h-full overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between shadow-sm">
              <div className="flex items-center space-x-4">
                <button
                  onClick={closeJobDetailsOverlay}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {selectedJobDetails.service_name || selectedJobDetails.service_type || 'Service'} for {selectedJobDetails.customer_name || selectedJobDetails.customer?.name || 'Customer'}
                  </h2>
                  <div className="flex items-center space-x-2 mt-1">
                    <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">+ Add Tag</button>
                    <span className="text-sm text-gray-500">Job #{selectedJobDetails.id}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                {/* Status Dropdown */}
                <div className="relative">
                  <button 
                    onClick={() => setShowStatusMenu(!showStatusMenu)}
                    disabled={isUpdatingStatus}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm flex items-center space-x-2 disabled:opacity-50"
                  >
                    <span>
                      {isUpdatingStatus ? 'Updating...' : 
                       (() => {
                         const status = selectedJobDetails?.status?.toLowerCase()?.replace(/[-_]/g, '_')
                         if (status === 'pending' || status === 'scheduled') return 'Mark as En Route'
                         if (status === 'confirmed' || status === 'en_route' || status === 'enroute') return 'Mark as Started'
                         if (status === 'in_progress' || status === 'in_prog' || status === 'started') return 'Mark as Complete'
                         if (status === 'completed' || status === 'complete') return 'Job Complete'
                         if (status === 'cancelled' || status === 'canceled') return 'Job Cancelled'
                         return 'Update Status'
                       })()
                      }
                    </span>
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  
                  {showStatusMenu && (
                    <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                      <div className="py-2">
                        {(() => {
                          const currentStatus = selectedJobDetails?.status || 'pending'
                          console.log('Current status:', currentStatus) // Debug log
                          
                          const nextActions = []
                          
                          // Normalize status for comparison
                          const normalizedStatus = currentStatus?.toLowerCase()?.replace(/[-_]/g, '_')
                          
                          // Define next logical actions based on current status
                          if (normalizedStatus === 'pending' || normalizedStatus === 'scheduled') {
                            nextActions.push(
                              { key: 'confirmed', label: 'Mark as En Route', color: 'bg-blue-500' },
                              { key: 'cancelled', label: 'Cancel Job', color: 'bg-red-500' }
                            )
                          } else if (normalizedStatus === 'confirmed' || normalizedStatus === 'en_route' || normalizedStatus === 'enroute') {
                            nextActions.push(
                              { key: 'in_progress', label: 'Mark as Started', color: 'bg-orange-500' },
                              { key: 'cancelled', label: 'Cancel Job', color: 'bg-red-500' }
                            )
                          } else if (normalizedStatus === 'in_progress' || normalizedStatus === 'in_prog' || normalizedStatus === 'started') {
                            nextActions.push(
                              { key: 'completed', label: 'Mark as Complete', color: 'bg-green-500' },
                              { key: 'cancelled', label: 'Cancel Job', color: 'bg-red-500' }
                            )
                          } else if (normalizedStatus === 'completed' || normalizedStatus === 'complete') {
                            nextActions.push(
                              { key: 'cancelled', label: 'Cancel Job', color: 'bg-red-500' }
                            )
                          } else if (normalizedStatus === 'cancelled' || normalizedStatus === 'canceled') {
                            nextActions.push(
                              { key: 'pending', label: 'Reactivate Job', color: 'bg-gray-400' }
                            )
                          }
                          
                          console.log('Next actions:', nextActions) // Debug log
                          
                          if (nextActions.length === 0) {
                            return (
                              <div className="px-4 py-2 text-sm text-gray-500">
                                No actions available
                              </div>
                            )
                          }
                          
                          return nextActions.map((action) => (
                            <button
                              key={action.key}
                              onClick={() => handleStatusChange(action.key)}
                              className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                              <div className={`w-3 h-3 rounded-full ${action.color}`}></div>
                              <span>{action.label}</span>
                            </button>
                          ))
                        })()}
                      </div>
                    </div>
                  )}
                </div>
                
                <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center space-x-2">
                {(() => {
                  const currentStatus = selectedJobDetails?.status || 'pending'
                  console.log('Progress bar - Current status:', currentStatus) // Debug log
                  
                  const statuses = [
                    { key: 'pending', label: 'Scheduled', color: 'bg-gray-400' },
                    { key: 'confirmed', label: 'En Route', color: 'bg-blue-500' },
                    { key: 'in_progress', label: 'Started', color: 'bg-orange-500' },
                    { key: 'completed', label: 'Complete', color: 'bg-green-500' },
                    { key: 'cancelled', label: 'Cancelled', color: 'bg-red-500' }
                  ]
                  
                  // Map status to progress index - handle different possible status values
                  const statusToIndex = {
                    'pending': 0,
                    'scheduled': 0,
                    'confirmed': 1,
                    'en_route': 1,
                    'enroute': 1,
                    'in_progress': 2,
                    'in-progress': 2,
                    'in_prog': 2,
                    'started': 2,
                    'completed': 3,
                    'complete': 3,
                    'cancelled': -1,
                    'canceled': -1
                  }
                  
                  // Normalize status for comparison
                  const normalizedStatus = currentStatus?.toLowerCase()?.replace(/[-_]/g, '_')
                  const currentIndex = statusToIndex[normalizedStatus] || 0
                  console.log('Progress bar - Normalized status:', normalizedStatus) // Debug log
                  console.log('Progress bar - Current index:', currentIndex) // Debug log
                  
                  return statuses.map((status, index) => {
                    // Skip cancelled status in progress bar unless job is cancelled
                    if (status.key === 'cancelled' && currentStatus !== 'cancelled') {
                      return null
                    }
                    
                    const isActive = currentStatus === 'cancelled' ? 
                      (status.key === 'cancelled') : 
                      (index <= currentIndex)
                    const isCurrent = currentStatus === 'cancelled' ? 
                      (status.key === 'cancelled') : 
                      (index === currentIndex)
                    
                    console.log(`Status ${status.key}: isActive=${isActive}, isCurrent=${isCurrent}`) // Debug log
                    
                    return (
                      <React.Fragment key={status.key}>
                        <div className="flex items-center space-x-2">
                          <div className={`w-3 h-3 rounded-full ${isActive ? status.color : 'bg-gray-300'}`}></div>
                          <span className={`text-sm ${isCurrent ? 'font-medium' : 'text-gray-500'} ${isActive ? 'text-gray-900' : 'text-gray-500'}`}>
                            {status.label}
                          </span>
                        </div>
                        {index < statuses.length - 1 && status.key !== 'cancelled' && (
                          <div className={`flex-1 h-1 rounded mx-2 ${isActive ? 'bg-gray-400' : 'bg-gray-300'}`}></div>
                        )}
                      </React.Fragment>
                    )
                  })
                })()}
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-8">
              {/* Job Location */}
              <div>
                <div className="flex items-center space-x-2 mb-4">
                  <MapPin className="w-5 h-5 text-gray-500" />
                  <h3 className="text-lg font-semibold text-gray-900">JOB LOCATION</h3>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 text-base">{selectedJobDetails.customer_address || selectedJobDetails.address || 'Address not provided'}</p>
                      <p className="text-sm text-gray-600 mt-1">{selectedJobDetails.city || 'City'}</p>
                    </div>
                    <div className="flex items-center space-x-3 ml-4">
                      <button className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center space-x-1">
                        <span>View directions</span>
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                      <button 
                        onClick={handleEditAddress}
                        className="text-gray-600 hover:text-gray-800 text-sm font-medium"
                      >
                        Edit Address
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Date & Time */}
              <div>
                <div className="flex items-center space-x-2 mb-4">
                  <Calendar className="w-5 h-5 text-gray-500" />
                  <h3 className="text-lg font-semibold text-gray-900">DATE & TIME</h3>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 text-base">
                        {new Date(selectedJobDetails.scheduled_date).toLocaleTimeString('en-US', { 
                          hour: 'numeric', 
                          minute: '2-digit',
                          hour12: true 
                        })} - {new Date(new Date(selectedJobDetails.scheduled_date).getTime() + (selectedJobDetails.service_duration || 0) * 60000).toLocaleTimeString('en-US', { 
                          hour: 'numeric', 
                          minute: '2-digit',
                          hour12: true 
                        })}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {new Date(selectedJobDetails.scheduled_date).toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}
                      </p>
                    </div>
                    <div className="flex items-center space-x-3 ml-4">
                      <button 
                        onClick={handleCancelJob}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={handleReschedule}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Reschedule
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Job Details */}
              <div>
                <div className="flex items-center space-x-2 mb-4">
                  <Clock className="w-5 h-5 text-gray-500" />
                  <h3 className="text-lg font-semibold text-gray-900">JOB DETAILS</h3>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 text-base">{selectedJobDetails.service_name || selectedJobDetails.service_type || 'Service'}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        {selectedJobDetails.service_duration ? `${Math.floor(selectedJobDetails.service_duration / 60)}h ${selectedJobDetails.service_duration % 60}m` : 'Duration not specified'}
                      </p>
                    </div>
                    <button className="text-gray-600 hover:text-gray-800 text-sm font-medium ml-4">Edit</button>
                  </div>
                </div>
              </div>

              {/* Invoice */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Invoice Draft</h3>
                  <span className="text-sm text-gray-500">Due {new Date(new Date().getTime() + 15 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Amount paid</p>
                      <p className="font-medium text-gray-900 text-lg">$0.00</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Amount due</p>
                      <p className="font-medium text-gray-900 text-lg">${selectedJobDetails.total || selectedJobDetails.price || selectedJobDetails.service_price || '0.00'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Customer */}
              <div>
                <div className="flex items-center space-x-2 mb-4">
                  <User className="w-5 h-5 text-gray-500" />
                  <h3 className="text-lg font-semibold text-gray-900">CUSTOMER</h3>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 text-base">
                        {selectedJobDetails.customer_name || selectedJobDetails.customer?.name || 'Customer'}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">{selectedJobDetails.customer_phone || selectedJobDetails.phone || 'Phone not provided'}</p>
                      <p className="text-sm text-gray-600">{selectedJobDetails.customer_email || selectedJobDetails.email || 'Email not provided'}</p>
                    </div>
                    <button 
                      onClick={handleEditCustomer}
                      className="text-gray-600 hover:text-gray-800 text-sm font-medium ml-4"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              </div>

              {/* Billing Address */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Billing Address</h3>
                  <button className="text-gray-600 hover:text-gray-800 text-sm font-medium">Edit</button>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <p className="text-gray-600">Same as service address</p>
                </div>
              </div>

              {/* Expected Payment Method */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Expected Payment Method</h3>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <p className="text-gray-600 mb-2">No payment method on file</p>
                  <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">Add a card to charge later</button>
                </div>
              </div>

              {/* Team */}
              <div>
                <div className="flex items-center space-x-2 mb-4">
                  <Users className="w-5 h-5 text-gray-500" />
                  <h3 className="text-lg font-semibold text-gray-900">TEAM</h3>
                </div>
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900">JOB REQUIREMENTS</h4>
                      <button className="text-gray-600 hover:text-gray-800 text-sm font-medium">Edit</button>
                    </div>
                    <p className="text-sm text-gray-600">Workers needed: 1 service provider</p>
                    <p className="text-sm text-gray-600">Skills needed: No skill tags required</p>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900">ASSIGNED</h4>
                      <button 
                        onClick={handleOpenAssignModal}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Assign
                      </button>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-gray-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">No service providers are assigned to this job</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes & Files */}
              <div>
                <div className="flex items-center space-x-2 mb-4">
                  <Clock className="w-5 h-5 text-gray-500" />
                  <h3 className="text-lg font-semibold text-gray-900">NOTES & FILES</h3>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <p className="text-sm text-gray-600 mb-2">No internal job or customer notes</p>
                  <p className="text-xs text-gray-500 mb-3">Notes and attachments are only visible to employees with appropriate permissions.</p>
                  <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">+ Add Note</button>
                </div>
              </div>

              {/* Customer Notifications */}
              <div>
                <div className="flex items-center space-x-2 mb-4">
                  <MessageCircle className="w-5 h-5 text-gray-500" />
                  <h3 className="text-lg font-semibold text-gray-900">CUSTOMER NOTIFICATIONS</h3>
                </div>
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900">NOTIFICATION PREFERENCES</h4>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Emails</span>
                        <div className="w-10 h-6 bg-blue-600 rounded-full flex items-center justify-end pr-1">
                          <div className="w-4 h-4 bg-white rounded-full"></div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Text messages</span>
                        <div className="w-10 h-6 bg-blue-600 rounded-full flex items-center justify-end pr-1">
                          <div className="w-4 h-4 bg-white rounded-full"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900">Confirmation</h4>
                      <button 
                        onClick={() => {
                          setNotificationType('confirmation')
                          setSelectedNotificationMethod('email')
                          setNotificationEmail(selectedJobDetails.customer_email || '')
                          setShowNotificationModal(true)
                        }}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Send
                      </button>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" checked className="w-4 h-4 text-blue-600 rounded" />
                      <span className="text-sm text-gray-600">Appointment Confirmation</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {selectedJobDetails.confirmation_sent ? 
                        `${selectedJobDetails.confirmation_sent_at ? new Date(selectedJobDetails.confirmation_sent_at).toLocaleString() : 'Recently'} - Email - Sent` :
                        'Not sent yet'
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* Customer Feedback */}
              <div>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <p className="text-sm text-gray-600">An email will be sent to the customer asking them to rate the service after the job is marked complete. <button className="text-blue-600 hover:text-blue-800 font-medium">Learn more</button></p>
                </div>
              </div>

              {/* Conversion Summary */}
              <div>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <p className="text-sm text-gray-600">Jobs created by team members from the Zenbooker admin won't have any conversion details associated. <button className="text-blue-600 hover:text-blue-800 font-medium">Learn more</button></p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notification Modal */}
      {showNotificationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-60 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Send {notificationType === 'confirmation' ? 'Confirmation' : 'Reminder'}
              </h3>
              <button
                onClick={() => setShowNotificationModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Notification Method Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Send via
                </label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="email"
                      checked={selectedNotificationMethod === 'email'}
                      onChange={(e) => setSelectedNotificationMethod(e.target.value)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="ml-2 text-sm text-gray-700">Email</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="sms"
                      checked={selectedNotificationMethod === 'sms'}
                      onChange={(e) => setSelectedNotificationMethod(e.target.value)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="ml-2 text-sm text-gray-700">SMS</span>
                  </label>
                </div>
              </div>

              {/* Contact Information */}
              {selectedNotificationMethod === 'email' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={notificationEmail}
                    onChange={(e) => setNotificationEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="customer@example.com"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={notificationPhone}
                    onChange={(e) => setNotificationPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="+1234567890"
                  />
                </div>
              )}

              {/* Success/Error Messages */}
              {successMessage && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm text-green-800">{successMessage}</p>
                </div>
              )}

              {errorMessage && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-800">{errorMessage}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => setShowNotificationModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendNotification}
                  disabled={isSendingNotification}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  {isSendingNotification ? 'Sending...' : 'Send'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Customer Modal */}
      {showEditCustomerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[100] flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Edit Customer</h3>
              <button
                onClick={() => setShowEditCustomerModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Customer Name</label>
                <input
                  type="text"
                  value={editFormData.customer_name}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, customer_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={editFormData.customer_email}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, customer_email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                <input
                  type="tel"
                  value={editFormData.customer_phone}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, customer_phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => setShowEditCustomerModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveCustomer}
                  disabled={isUpdatingJob}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  {isUpdatingJob ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Address Modal */}
      {showEditAddressModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[100] flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Edit Service Address</h3>
              <button
                onClick={() => setShowEditAddressModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Service Address</label>
                <textarea
                  value={editFormData.service_address}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, service_address: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => setShowEditAddressModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveAddress}
                  disabled={isUpdatingJob}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  {isUpdatingJob ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {showRescheduleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[100] flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Reschedule Job</h3>
              <button
                onClick={() => setShowRescheduleModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                <input
                  type="date"
                  value={editFormData.scheduled_date}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, scheduled_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
                <input
                  type="time"
                  value={editFormData.scheduled_time}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, scheduled_time: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => setShowRescheduleModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveReschedule}
                  disabled={isUpdatingJob}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  {isUpdatingJob ? 'Rescheduling...' : 'Reschedule'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assign Team Member Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[100] flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Assign Team Member</h3>
              <button
                onClick={() => setShowAssignModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="max-h-60 overflow-y-auto">
                {teamMembers.map((member) => (
                  <button
                    key={member.id}
                    onClick={() => handleAssignTeamMember(member.id)}
                    className="w-full flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {member.first_name?.charAt(0)}{member.last_name?.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium text-gray-900">
                        {member.first_name} {member.last_name}
                      </p>
                      <p className="text-xs text-gray-500">{member.email}</p>
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Job Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[100] flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Cancel Job</h3>
              <button
                onClick={() => setShowCancelModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Are you sure you want to cancel this job? This action cannot be undone.
              </p>

              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Keep Job
                </button>
                <button
                  onClick={handleCancelJobConfirm}
                  disabled={isUpdatingJob}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  {isUpdatingJob ? 'Cancelling...' : 'Cancel Job'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  )
}

export default ScheduleRedesigned

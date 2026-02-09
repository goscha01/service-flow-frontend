"use client"

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import Sidebar from "../components/sidebar-collapsible"
import { teamAPI, territoriesAPI, availabilityAPI, invoicesAPI, notificationAPI, notificationSettingsAPI } from "../services/api"
import api, { stripeAPI } from "../services/api"
import { 
  Plus, 
  Calendar, 
  CalendarDays,
  Clock, 
  MapPin, 
  User, 
  Users,
  UserX,
  ChevronLeft, 
  ChevronRight,
  ChevronDown, 
  Maximize2,
  MessageCircle,
  X,
  Filter,
  AlertTriangle,
  CheckCircle,
  Play,
  XCircle,
  Phone, Mail, NotepadText,
  RotateCw,
  Image,
  Paperclip,
  FileText,
  User as UserIcon,
  CreditCard,
  Target,
  Home,
  Briefcase,
  Megaphone,
  Bell,
  Menu,
  MoreVertical,
  Eye,
  Printer,
  Edit,
  Star,
} from "lucide-react"
import { useAuth } from "../context/AuthContext"
import { jobsAPI } from "../services/api"
import { normalizeAPIResponse } from "../utils/dataHandler"
import { getImageUrl } from "../utils/imageUtils"
import { formatRecurringFrequencyCompact } from "../utils/recurringUtils"
import RecurringIndicator from "../components/recurring-indicator"
import AssignJobModal from "../components/assign-job-modal"
import StatusHistoryTooltip from "../components/status-history-tooltip"
import MobileBottomNav from "../components/mobile-bottom-nav"
import MobileHeader from "../components/mobile-header"
import { canCreateJobs, isWorker } from "../utils/roleUtils"
import { 
  canMarkJobStatus, 
  canViewCustomerContact, 
  canViewCustomerNotes, 
  canEditJobDetails, 
  canViewEditJobPrice, 
  canProcessPayments, 
  canRescheduleJobs, 
  canSeeOtherProviders,
  canResetJobStatuses 
} from "../utils/permissionUtils"
import { formatPhoneNumber } from "../utils/phoneFormatter"
import AddressAutocomplete from "../components/address-autocomplete"
import JobsMap from "../components/jobs-map"

const ServiceFlowSchedule = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [dateUpdateKey, setDateUpdateKey] = useState(0) // Force re-renders on date change
  // Load viewMode from localStorage, default to 'month'
  const [viewMode, setViewMode] = useState(() => {
    const savedViewMode = localStorage.getItem('scheduleViewMode')
    return savedViewMode || 'month' // Default to 'month'
  })
  const [activeTab, setActiveTab] = useState('jobs') // jobs, availability
  const [availabilityMonth, setAvailabilityMonth] = useState(new Date()) // Current month for availability view
  const [userBusinessHours, setUserBusinessHours] = useState(null) // User's business hours from backend (Company Working Time)
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false)
  const [teamMemberAvailability, setTeamMemberAvailability] = useState({}) // Store team member personal availability
  const [jobs, setJobs] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [mapView, setMapView] = useState('roadmap') // roadmap, satellite
  const [showJobDetails, setShowJobDetails] = useState(false)
  const [teamMembers, setTeamMembers] = useState([])
  const [territories, setTerritories] = useState([])
  
  // Cache for jobs to speed up loading
  const jobsCacheRef = useRef(new Map()) // Map<cacheKey, { jobs: [], timestamp: number }>
  const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes cache duration
  const fetchingJobsRef = useRef(false) // Track if fetchJobs is currently running
  const fetchJobsAbortControllerRef = useRef(null) // AbortController for canceling in-flight requests
  // For workers, default to their own teamMemberId; for others, default to 'all'
  const [selectedFilter, setSelectedFilter] = useState(() => {
    // If user is a worker, set filter to their teamMemberId
    if (user?.teamMemberId && isWorker(user)) {
      return user.teamMemberId.toString();
    }
    return 'all'; // all, unassigned, or team member ID
  })
  const [statusFilter, setStatusFilter] = useState('all') // all, scheduled, confirmed, in_progress, completed, cancelled
  const [timeRangeFilter, setTimeRangeFilter] = useState('all') // all, today, tomorrow, this_week, this_month
  const [territoryFilter, setTerritoryFilter] = useState('all') // all or territory ID
  const [recurringFilter, setRecurringFilter] = useState('all') // all, recurring, one-time
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
  const [editingMemberId, setEditingMemberId] = useState(null)
  const [editingMemberName, setEditingMemberName] = useState('')
  const [showEditCustomerModal, setShowEditCustomerModal] = useState(false)
  const [showEditAddressModal, setShowEditAddressModal] = useState(false)
  const [showRescheduleModal, setShowRescheduleModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [showNotesModal, setShowNotesModal] = useState(false)
  const [isUpdatingJob, setIsUpdatingJob] = useState(false)
  const [noteType, setNoteType] = useState('job') // 'job' or 'customer'
  const [noteText, setNoteText] = useState('')
  const [noteAttachments, setNoteAttachments] = useState([]) // Array of { file, preview, type }
  const [uploadingFiles, setUploadingFiles] = useState(false)
  const [showTerritoryDropdown, setShowTerritoryDropdown] = useState(false)
  const territoryDropdownRef = useRef(null)
  const [showTerritoryModal, setShowTerritoryModal] = useState(false)
  const [selectedNewTerritory, setSelectedNewTerritory] = useState(null)
  const [openNotificationMenu, setOpenNotificationMenu] = useState(null) // 'confirmation' or 'reminder'
  const [showMessageViewer, setShowMessageViewer] = useState(false)
  const [viewingMessageType, setViewingMessageType] = useState(null) // 'confirmation' or 'reminder'
  const confirmationMenuRef = useRef(null)
  const reminderMenuRef = useRef(null)
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [smsNotifications, setSmsNotifications] = useState(false)
  const [invoiceExpanded, setInvoiceExpanded] = useState(false)
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false)
  const [showSendInvoiceModal, setShowSendInvoiceModal] = useState(false)
  const [showEditServiceModal, setShowEditServiceModal] = useState(false)
  const [showEditTeamMemberModal, setShowEditTeamMemberModal] = useState(false)
  const [editTeamMemberData, setEditTeamMemberData] = useState({ id: null, first_name: '', last_name: '' })
  const [includePaymentLink, setIncludePaymentLink] = useState(true)
  const [stripeConnected, setStripeConnected] = useState(false)
  const [manualEmail, setManualEmail] = useState('')
  const [paymentHistory, setPaymentHistory] = useState([])
  const [paymentFormData, setPaymentFormData] = useState({
    amount: '',
    paymentMethod: 'cash',
    paymentDate: new Date().toISOString().split('T')[0],
    notes: ''
  })
  
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
  const [selectedAddressData, setSelectedAddressData] = useState(null)


  // No click-outside handler - using backdrop overlay approach instead

  // Click outside to close territory dropdown, notification menus, and calendar popup
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (territoryDropdownRef.current && !territoryDropdownRef.current.contains(event.target)) {
        setShowTerritoryDropdown(false)
      }
      if (confirmationMenuRef.current && !confirmationMenuRef.current.contains(event.target)) {
        setOpenNotificationMenu(null)
      }
      if (reminderMenuRef.current && !reminderMenuRef.current.contains(event.target)) {
        setOpenNotificationMenu(null)
      }
      if (calendarRef.current && !calendarRef.current.contains(event.target)) {
        setShowCalendar(false)
      }
    }

    if (showTerritoryDropdown || openNotificationMenu || showCalendar) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showTerritoryDropdown, openNotificationMenu, showCalendar])

  // Check Stripe connection when send invoice modal opens
  useEffect(() => {
    if (showSendInvoiceModal) {
      const checkStripeConnection = async () => {
        try {
          const response = await stripeAPI.testConnection()
          setStripeConnected(response.connected)
        } catch (error) {
          console.error('Error checking Stripe connection:', error)
          setStripeConnected(false)
        }
      }
      checkStripeConnection()
    }
  }, [showSendInvoiceModal])

  // Fetch payment history when job is selected and invoice is expanded
  useEffect(() => {
    const fetchPaymentHistory = async () => {
      if (selectedJobDetails?.id && invoiceExpanded) {
        try {
          const response = await api.get(`/transactions/job/${selectedJobDetails.id}`)
          if (response.data) {
            const transactions = response.data.transactions || []
            const totalPaid = response.data.totalPaid || transactions.reduce((sum, tx) => sum + parseFloat(tx.amount || 0), 0)
            
            setPaymentHistory(transactions)
            // Update selectedJobDetails with payment info
            setSelectedJobDetails(prev => ({
              ...prev,
              total_paid_amount: totalPaid,
              invoice_paid_amount: totalPaid
            }))
          }
        } catch (error) {
          console.error('Error fetching payment history:', error)
          setPaymentHistory([])
        }
      }
    }
    fetchPaymentHistory()
  }, [selectedJobDetails?.id, invoiceExpanded])

  // Handle record payment
  const handleRecordPayment = async () => {
    if (!selectedJobDetails) return
    
    try {
      setIsUpdatingJob(true)
      setErrorMessage('')
      
      if (!paymentFormData.amount || parseFloat(paymentFormData.amount) <= 0) {
        setErrorMessage('Please enter a valid payment amount')
        setTimeout(() => setErrorMessage(''), 3000)
        return
      }
      
      const paymentData = {
        jobId: selectedJobDetails.id,
        invoiceId: selectedJobDetails.invoice_id || null,
        customerId: selectedJobDetails.customer_id || null,
        amount: parseFloat(paymentFormData.amount),
        paymentMethod: paymentFormData.paymentMethod,
        paymentDate: paymentFormData.paymentDate,
        notes: paymentFormData.notes || null
      }
      
      console.log('💳 Recording payment:', paymentData)
      
      const response = await api.post('/transactions/record-payment', paymentData)
      
      console.log('✅ Payment recorded:', response.data)
      
      // Reset form
      setPaymentFormData({
        amount: '',
        paymentMethod: 'cash',
        paymentDate: new Date().toISOString().split('T')[0],
        notes: ''
      })
      
      // Refresh payment history
      const historyResponse = await api.get(`/transactions/job/${selectedJobDetails.id}`)
      if (historyResponse.data) {
        const transactions = historyResponse.data.transactions || []
        const totalPaid = historyResponse.data.totalPaid || transactions.reduce((sum, tx) => sum + parseFloat(tx.amount || 0), 0)
        
        setPaymentHistory(transactions)
        
        // Update selectedJobDetails with payment info
        setSelectedJobDetails(prev => ({
          ...prev,
          total_paid_amount: totalPaid,
          invoice_paid_amount: totalPaid
        }))
      }
      
      // Refresh job data
      const jobData = await jobsAPI.getById(selectedJobDetails.id)
      const mappedJobData = normalizeCustomerData(jobData)
      setSelectedJobDetails(prev => ({
        ...mappedJobData,
        total_paid_amount: prev.total_paid_amount || mappedJobData.total_paid_amount || 0,
        invoice_paid_amount: prev.invoice_paid_amount || mappedJobData.invoice_paid_amount || 0
      }))
      
      setSuccessMessage('Payment recorded successfully!')
      setTimeout(() => setSuccessMessage(''), 3000)
      setShowAddPaymentModal(false)
    } catch (error) {
      console.error('Error recording payment:', error)
      setErrorMessage(error.response?.data?.error || 'Failed to record payment')
      setTimeout(() => setErrorMessage(''), 3000)
    } finally {
      setIsUpdatingJob(false)
    }
  }
  
  // Helper function to get time ago
  const getTimeAgo = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now - date) / 1000)
    
    if (diffInSeconds < 60) return 'Just now'
    if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60)
      return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`
    }
    if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600)
      return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`
    }
    const days = Math.floor(diffInSeconds / 86400)
    return `${days} ${days === 1 ? 'day' : 'days'} ago`
  }

  const fetchJobs = useCallback(async () => {
    // Prevent duplicate calls
    if (fetchingJobsRef.current) {
      console.log('⏸️ fetchJobs already in progress, skipping duplicate call')
      return
    }
    
    // Cancel any in-flight request
    if (fetchJobsAbortControllerRef.current) {
      fetchJobsAbortControllerRef.current.abort()
    }
    
    // Create new AbortController for this request
    const abortController = new AbortController()
    fetchJobsAbortControllerRef.current = abortController
    
    // Get current selectedFilter and territoryFilter values (need to access them from state)
    const currentFilter = selectedFilter;
    const currentTerritoryFilter = territoryFilter;
    try {
      fetchingJobsRef.current = true
      setIsLoading(true)
      // Calculate date range based on view mode
      // Normalize selectedDate first to avoid timezone issues
      const normalizedSelectedDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate())
      
      let startDate, endDate
      if (viewMode === 'day') {
        // For day view, use the selected date (same day for start and end)
        startDate = new Date(normalizedSelectedDate)
        endDate = new Date(normalizedSelectedDate)
      } else if (viewMode === 'week') {
        const startOfWeek = new Date(normalizedSelectedDate)
        startOfWeek.setDate(normalizedSelectedDate.getDate() - normalizedSelectedDate.getDay())
        startDate = startOfWeek
        endDate = new Date(startOfWeek)
        endDate.setDate(startOfWeek.getDate() + 6)
      } else if (viewMode === 'month') {
        // Get first day of month
        startDate = new Date(normalizedSelectedDate.getFullYear(), normalizedSelectedDate.getMonth(), 1)
        // Get last day of month
        endDate = new Date(normalizedSelectedDate.getFullYear(), normalizedSelectedDate.getMonth() + 1, 0)
      }
      
      // Format dates as YYYY-MM-DD strings for API (avoid timezone conversion)
      // Use local date formatting to prevent timezone shifts
      const formatDateLocal = (date) => {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      }
      
      const startDateString = formatDateLocal(startDate)
      const endDateString = formatDateLocal(endDate)
      const dateRange = `${startDateString} to ${endDateString}`
      
      // Build cache key based on query parameters
      let teamMemberFilter = null
      if (activeTab === 'availability' && currentTerritoryFilter && currentTerritoryFilter !== 'all') {
        teamMemberFilter = null
      } else if (activeTab === 'availability' && currentFilter === 'all-team-members') {
        teamMemberFilter = null
      } else if (currentFilter && currentFilter !== 'all' && currentFilter !== 'unassigned' && currentFilter !== 'all-team-members') {
        teamMemberFilter = currentFilter.toString()
      }
      
      const territoryIdForAPI = (activeTab === 'jobs' && currentTerritoryFilter && currentTerritoryFilter !== 'all') 
        ? currentTerritoryFilter 
        : null
      
      const cacheKey = `${user.id}_${viewMode}_${startDateString}_${endDateString}_${teamMemberFilter || 'all'}_${territoryIdForAPI || 'all'}_${activeTab}_${recurringFilter || 'all'}`
      
      // Check cache first
      const cachedData = jobsCacheRef.current.get(cacheKey)
      const now = Date.now()
      if (cachedData && (now - cachedData.timestamp) < CACHE_DURATION) {
        console.log(`💾 Using cached jobs for ${viewMode} view: ${dateRange} (cache key: ${cacheKey})`)
        setJobs(cachedData.jobs)
        setIsLoading(false)
        return
      }
      
      console.log(`📅 Fetching jobs for ${viewMode} view: ${dateRange}`)
      console.log(`📅 Selected date: ${formatDateLocal(normalizedSelectedDate)}, Date range: ${dateRange}`)
      
      // For month view, we need a higher limit or fetch all jobs in the date range
      // Use a very high limit to ensure we get all jobs for the month
      const limit = viewMode === 'month' ? 10000 : 1000
      
      console.log(`🔍 Schedule: Fetching jobs with teamMember filter: ${teamMemberFilter || 'none'}, territoryId: ${territoryIdForAPI || 'none'} (selectedFilter: ${currentFilter}, territoryFilter: ${currentTerritoryFilter}, activeTab: ${activeTab})`);
      
      const jobsResponse = await jobsAPI.getAll(
        user.id, 
        "", // status
        "", // search
        1, // page
        limit, // limit - increased for month view
        null, // dateFilter
        dateRange, // dateRange - pass the calculated date range to backend
        null, // sortBy
        null, // sortOrder
        teamMemberFilter, // teamMember - null for territory filter in availability tab, otherwise filter by team member
        null, // invoiceStatus
        null, // customerId
        territoryIdForAPI, // territoryId - only for jobs tab, null for availability tab
        recurringFilter !== 'all' ? recurringFilter : null // recurring - pass filter to backend
      )
      
      const allJobs = normalizeAPIResponse(jobsResponse, 'jobs')
      
      // Parse status_history for each job
      const jobsWithParsedHistory = allJobs.map(job => {
        if (job.status_history && typeof job.status_history === 'string') {
          try {
            job.status_history = JSON.parse(job.status_history);
          } catch (e) {
            console.error('Error parsing status_history:', e);
            job.status_history = [];
          }
        }
        return job;
      });
      
      // Filter by date range (client-side backup)
      let filteredJobs = jobsWithParsedHistory.filter(job => {
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
          
        // For day view, exact match is required
        if (viewMode === 'day') {
          return jobDateString === startDateString
        }
        
        // For week/month view, check range
          return jobDateString >= startDateString && jobDateString <= endDateString
        })
      
      // In availability tab, backend should have already filtered by team member
      // But we also do client-side filtering to catch any jobs with team_assignments that backend might miss
      // This is a safety net - backend filter should handle most cases (like unified-calendar)
      // However, if territory or "all-team-members" is selected, DON'T filter by team member - we need ALL jobs
      if (activeTab === 'availability' && !(currentTerritoryFilter && currentTerritoryFilter !== 'all') && currentFilter && currentFilter !== 'all' && currentFilter !== 'unassigned' && currentFilter !== 'all-team-members') {
        const beforeTeamFilter = filteredJobs.length
        filteredJobs = filteredJobs.filter(job => isJobAssignedTo(job, currentFilter))
        if (beforeTeamFilter !== filteredJobs.length) {
          console.log(`  ⚠️ Availability: Client-side filter found ${filteredJobs.length} jobs (backend returned ${beforeTeamFilter}) - some jobs with team_assignments may have been missed by backend`)
        }
      }
      
      console.log(`📅 Loaded ${allJobs.length} total jobs from API, ${filteredJobs.length} after client-side filter for ${viewMode} view (${startDateString} to ${endDateString})`)
      if (viewMode === 'day') {
        console.log(`📅 Day view - Looking for date: ${startDateString}`)
        if (filteredJobs.length === 0 && allJobs.length > 0) {
          console.log(`⚠️ Day view: No jobs found for ${startDateString}. Sample job dates from API:`, 
            allJobs.slice(0, 5).map(j => {
              const dateStr = j.scheduled_date?.includes('T') ? j.scheduled_date.split('T')[0] : 
                             j.scheduled_date?.includes(' ') ? j.scheduled_date.split(' ')[0] : 
                             j.scheduled_date || 'no date'
              return `${j.id}: ${dateStr}`
            }))
        } else if (filteredJobs.length > 0) {
          console.log(`✅ Day view: Found ${filteredJobs.length} jobs for ${startDateString}`)
        }
      }
      
      // Store in cache
      jobsCacheRef.current.set(cacheKey, {
        jobs: filteredJobs,
        timestamp: now
      })
      
      // Clean up old cache entries (keep only last 20 entries)
      if (jobsCacheRef.current.size > 20) {
        const entries = Array.from(jobsCacheRef.current.entries())
        entries.sort((a, b) => b[1].timestamp - a[1].timestamp) // Sort by timestamp, newest first
        jobsCacheRef.current.clear()
        entries.slice(0, 20).forEach(([key, value]) => {
          jobsCacheRef.current.set(key, value)
        })
      }
      
      // Check if request was aborted
      if (abortController.signal.aborted) {
        console.log('⏹️ fetchJobs was aborted')
        return
      }
      
      setJobs(filteredJobs)
    } catch (error) {
      // Don't log error if it was aborted
      if (error.name === 'AbortError' || abortController.signal.aborted) {
        console.log('⏹️ fetchJobs was aborted')
        return
      }
      console.error('❌ Error fetching jobs:', error)
    } finally {
      fetchingJobsRef.current = false
      setIsLoading(false)
      // Clear abort controller if this was the current request
      if (fetchJobsAbortControllerRef.current === abortController) {
        fetchJobsAbortControllerRef.current = null
      }
    }
  }, [user?.id, selectedDate, viewMode, selectedFilter, territoryFilter, activeTab, recurringFilter]) // Include territoryFilter and recurringFilter so jobs refetch when filters change
  
  // Function to invalidate cache (call this when jobs are updated/created/deleted)
  const invalidateJobsCache = useCallback(() => {
    console.log('🗑️ Invalidating jobs cache...')
    jobsCacheRef.current.clear()
  }, [])
  
  // NOTE: Removed redundant useEffect for selectedFilter change.
  // fetchJobs already includes selectedFilter in its dependency array,
  // so the main useEffect (below) already refetches when the filter changes.

  const fetchTeamMembers = useCallback(async () => {
    try {
      const teamResponse = await teamAPI.getAll(user.id, { page: 1, limit: 1000 })
      const members = teamResponse.teamMembers || teamResponse || []
      setTeamMembers(members)
    } catch (error) {
      console.error('❌ Error fetching team members:', error)
      setTeamMembers([])
    }
  }, [user?.id])

  const fetchTerritories = useCallback(async () => {
    try {
      const territoriesResponse = await territoriesAPI.getAll(user.id, { page: 1, limit: 1000 })
      const territoriesList = territoriesResponse.territories || territoriesResponse || []
      setTerritories(territoriesList)
    } catch (error) {
      console.error('❌ Error fetching territories:', error)
      setTerritories([])
    }
  }, [user?.id])
    
    // Helper function to check if a job is assigned to a team member ID
    // IMPORTANT: Checks ALL assignments, not just primary assignee
  // This handles jobs with multiple team members (team_assignments array)
  const isJobAssignedTo = useCallback((job, teamMemberId) => {
      const targetId = Number(teamMemberId)
      
      // Check direct assignment fields (handle both string and number types)
      const jobAssignedId = job.assigned_team_member_id ? Number(job.assigned_team_member_id) : null
      const jobTeamMemberId = job.team_member_id ? Number(job.team_member_id) : null
      
      if (jobAssignedId === targetId || jobTeamMemberId === targetId) {
        return true
      }
      
      // Check ALL assignments in team_assignments array (not just primary)
      // A team member should see jobs where they appear in ANY assignment
      if (job.team_assignments && Array.isArray(job.team_assignments)) {
        const found = job.team_assignments.some(ta => {
        // Check direct team_member_id field
          if (ta.team_member_id) {
          const assignmentId = typeof ta.team_member_id === 'string' ? Number(ta.team_member_id) : Number(ta.team_member_id)
          if (assignmentId === targetId) {
            return true
          }
          }
        // Check nested team_members object (from backend relation)
        if (ta.team_members) {
          let memberId = null
          if (typeof ta.team_members === 'object' && ta.team_members.id) {
            memberId = Number(ta.team_members.id)
          } else if (typeof ta.team_members === 'number') {
            memberId = ta.team_members
          } else if (typeof ta.team_members === 'string') {
            memberId = Number(ta.team_members)
          }
          if (memberId === targetId) {
            return true
          }
          }
          return false
        })
        if (found) {
            return true
        }
      }
      
    // Also check if job has a nested team_members relation (backward compatibility)
    if (job.team_members) {
      let memberId = null
      if (typeof job.team_members === 'object' && job.team_members.id) {
        memberId = Number(job.team_members.id)
      } else if (typeof job.team_members === 'number') {
        memberId = job.team_members
      } else if (typeof job.team_members === 'string') {
        memberId = Number(job.team_members)
      }
      if (memberId === targetId) {
        return true
      }
    }
    
    return false
  }, [])

  const applyFilters = useCallback(() => {
    let filtered = [...jobs]
    
    // 🔒 WORKER RESTRICTION: Workers can only see jobs assigned to them
    // Schedulers, Managers, and Account Owners can see ALL jobs (no filtering by assignment)
    if (isWorker(user) && user?.teamMemberId) {
      // Only filter for workers - they can only see their own assigned jobs
      filtered = filtered.filter(job => isJobAssignedTo(job, user.teamMemberId))
    } else {
      // For schedulers, managers, and account owners: show all jobs by default
      // They can optionally filter by team member assignment using the selectedFilter
      if (selectedFilter === 'unassigned') {
        filtered = filtered.filter(job => {
          // Job is unassigned if no team_member_id, no assigned_team_member_id, and no team_assignments
          const hasDirectAssignment = !!(job.assigned_team_member_id || job.team_member_id)
          const hasTeamAssignments = job.team_assignments && Array.isArray(job.team_assignments) && job.team_assignments.length > 0
          return !hasDirectAssignment && !hasTeamAssignments
        })
      } else if (selectedFilter !== 'all') {
        // Optional filter: show only jobs assigned to a specific team member
        // Use isJobAssignedTo to handle jobs with multiple team members
        filtered = filtered.filter(job => isJobAssignedTo(job, selectedFilter))
      }
      // If selectedFilter === 'all', no filtering is applied - show all jobs
    }
    
    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(job => job.status === statusFilter)
    } else {
      // When status filter is 'all', exclude cancelled jobs from schedule view
      filtered = filtered.filter(job => {
        const status = (job.status || '').toLowerCase().trim()
        return status !== 'cancelled' && status !== 'canceled'
      })
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
    
    // Recurring filter - handle boolean, string, and number types
    // IMPORTANT: A job is recurring ONLY if is_recurring is explicitly true
    // We should NOT use recurring_frequency alone to determine if a job is recurring
    // because some one-time jobs might have a frequency value stored
    if (recurringFilter === 'recurring') {
      filtered = filtered.filter(job => {
        // A job is recurring if is_recurring is explicitly true/1/'true'/'1'
        const isRecurring = job.is_recurring === true || 
                           job.is_recurring === 'true' || 
                           job.is_recurring === 1 || 
                           job.is_recurring === '1'
        return isRecurring
      })
    } else if (recurringFilter === 'one-time') {
      filtered = filtered.filter(job => {
        // A job is one-time if is_recurring is NOT true
        // This includes false, null, undefined, 0, '0', '', etc.
        const isRecurring = job.is_recurring === true || 
                           job.is_recurring === 'true' || 
                           job.is_recurring === 1 || 
                           job.is_recurring === '1'
        // One-time = NOT recurring (includes null, undefined, false, 0, empty string, etc.)
        return !isRecurring
      })
    }
    // If recurringFilter === 'all', show all jobs
    
    setFilteredJobs(filtered)
  }, [jobs, selectedFilter, statusFilter, timeRangeFilter, territoryFilter, recurringFilter, user, isJobAssignedTo])
  
  // Apply filters whenever jobs or filter values change
  useEffect(() => {
    applyFilters()
  }, [applyFilters])

  // Fetch user availability/business hours
  const fetchUserAvailability = useCallback(async () => {
    if (!user?.id) return
    
    try {
      setIsLoadingAvailability(true)
      const response = await availabilityAPI.getAvailability(user.id)
      const businessHours = response.businessHours || response.business_hours
      
      if (businessHours) {
        // Parse if it's a string
        const parsedHours = typeof businessHours === 'string' 
          ? JSON.parse(businessHours) 
          : businessHours
        setUserBusinessHours(parsedHours)
      } else {
        // Default business hours
        setUserBusinessHours({
          monday: { enabled: true, start: '09:00', end: '18:00' },
          tuesday: { enabled: true, start: '09:00', end: '18:00' },
          wednesday: { enabled: true, start: '09:00', end: '18:00' },
          thursday: { enabled: true, start: '09:00', end: '18:00' },
          friday: { enabled: true, start: '09:00', end: '18:00' },
          saturday: { enabled: false, start: '09:00', end: '18:00' },
          sunday: { enabled: false, start: '09:00', end: '18:00' }
        })
      }
    } catch (error) {
      console.error('Error fetching user availability:', error)
      // Default business hours on error
      setUserBusinessHours({
        monday: { enabled: true, start: '09:00', end: '18:00' },
        tuesday: { enabled: true, start: '09:00', end: '18:00' },
        wednesday: { enabled: true, start: '09:00', end: '18:00' },
        thursday: { enabled: true, start: '09:00', end: '18:00' },
        friday: { enabled: true, start: '09:00', end: '18:00' },
        saturday: { enabled: false, start: '09:00', end: '18:00' },
        sunday: { enabled: false, start: '09:00', end: '18:00' }
      })
    } finally {
      setIsLoadingAvailability(false)
    }
  }, [user?.id])

  // Fetch team members and territories once when user loads (they don't change with date/view/filters)
  useEffect(() => {
    if (user?.id) {
      fetchTeamMembers()
      fetchTerritories()
    }
  }, [user?.id, fetchTeamMembers, fetchTerritories])

  // Fetch jobs when date, view, or filters change
  useEffect(() => {
    if (user?.id) {
      const timeoutId = setTimeout(() => {
        if (!fetchingJobsRef.current) {
          fetchJobs()
        }
      }, 150)

      return () => clearTimeout(timeoutId)
    }
  }, [user?.id, selectedDate, viewMode, fetchJobs])

  // When switching to availability tab, set default filter and fetch business hours
  useEffect(() => {
    if (activeTab === 'availability') {
      // Fetch business hours if not loaded yet
      if (user?.id && !userBusinessHours) {
        fetchUserAvailability()
      }
      // Default filter to 'all-team-members' for availability view
      if (teamMembers.length > 0) {
        setSelectedFilter(prevFilter => {
          if (!prevFilter || prevFilter === 'unassigned' || prevFilter === 'all') {
            return 'all-team-members'
          }
          if (prevFilter === 'all-team-members') {
            return prevFilter
          }
          const isValidTeamMember = teamMembers.find(m => m.id.toString() === prevFilter)
          if (!isValidTeamMember) {
            return 'all-team-members'
          }
          return prevFilter
        })
      }
    }
  }, [activeTab, teamMembers, user?.id, userBusinessHours, fetchUserAvailability])

  // NOTE: Removed duplicate applyFilters useEffect.
  // The useEffect above with [applyFilters] already fires whenever any of its
  // dependencies change (jobs, selectedFilter, statusFilter, etc.) since those
  // are all in applyFilters' own dependency array.

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    })
  }

  // Get duration from job object - checks all possible fields
  const getJobDuration = (job) => {
    if (!job) return 0;
    
    // Debug: Log the job to see what fields are available
    // console.log('Job duration fields:', { 
    //   service_duration: job.service_duration,
    //   duration: job.duration,
    //   estimated_duration: job.estimated_duration,
    //   service: job.service,
    //   services: job.services
    // });
    
    // Check all possible duration fields in order of priority
    // Try estimated_duration first as it's often the most accurate
    let duration = job.estimated_duration || 
                   job.service_duration || 
                   job.duration ||
                   (job.service && (job.service.duration || job.service.service_duration || job.service.estimated_duration)) ||
                   (job.services && (job.services.duration || job.services.service_duration || job.services.estimated_duration)) ||
                   0;
    
    // Parse to integer, defaulting radix to 10
    duration = parseInt(duration, 10);
    
    // If duration is 0 or invalid, return 0 (don't use NaN)
    return isNaN(duration) ? 0 : duration;
  }

  // Format duration for display (compact format: "5h 30m" or "5h" or "30m")
  // Always shows minutes if they exist
  const formatDuration = (minutes) => {
    if (!minutes || minutes === 0) return '';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0 && mins > 0) {
      return `${hours}h ${mins}m`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else {
      return `${mins}m`;
    }
  }

  // Normalize status to a standard format
  const normalizeStatus = (status) => {
    if (!status) return 'scheduled'
    const normalized = status.toLowerCase().trim()
    // Map variations to standard statuses
    if (normalized === 'in-prog' || normalized === 'in_progress' || normalized === 'started' || normalized === 'enroute') {
      return 'in_progress'
    }
    if (normalized === 'completed' || normalized === 'done' || normalized === 'finished') {
      return 'completed'
    }
    if (normalized === 'cancelled' || normalized === 'canceled') {
      return 'cancelled'
    }
    if (normalized === 'confirmed' || normalized === 'scheduled') {
      return normalized
    }
    return normalized
  }

  // Format status for display
  const isJobPast = (job) => {
    if (!job.scheduled_date) return false
    const scheduledDate = new Date(job.scheduled_date)
    const now = new Date()
    return scheduledDate < now
  }

  const formatStatus = (status, job = null) => {
    // If job is past scheduled time and not completed, show "Late"
    if (job && isJobPast(job) && status !== 'completed' && status !== 'cancelled') {
      return 'Late'
    }
    
    const normalized = normalizeStatus(status)
    const statusMap = {
      'scheduled': 'Scheduled',
      'confirmed': 'Confirmed',
      'in_progress': 'In Progress',
      'completed': 'Completed',
      'cancelled': 'Cancelled'
    }
    return statusMap[normalized] || status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')
  }

  // Get status color
  const getStatusColor = (status, job = null) => {
    // If job is past scheduled time and not completed, show orange for "Late"
    if (job && isJobPast(job) && status !== 'completed' && status !== 'cancelled') {
      return 'bg-orange-100 text-orange-800 border-orange-200'
    }
    
    const normalized = normalizeStatus(status)
    const colorMap = {
      'scheduled': 'bg-blue-100 text-blue-800 border-blue-200',
      'scheduled': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'confirmed': 'bg-green-100 text-green-800 border-green-200',
      'in_progress': 'bg-purple-100 text-purple-800 border-purple-200',
      'completed': 'bg-gray-100 text-gray-800 border-gray-200',
      'cancelled': 'bg-red-100 text-red-800 border-red-200'
    }
    return colorMap[normalized] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  // Handle day click to navigate to that day
  const handleDayClick = (day) => {
    setSelectedDate(new Date(day))
    setViewMode('day')
    localStorage.setItem('scheduleViewMode', 'day')
  }

  // Get initials from name
  const getInitials = (name) => {
    if (!name) return '?'
    const parts = name.trim().split(' ')
    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase()
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  // Normalize customer data from API response - ensures customer fields are always in flat format
  const normalizeCustomerData = (job) => {
    if (!job) return job
    
    // Extract customer data from nested structures and ensure flat fields exist
    const normalized = { ...job }
    
    // Normalize customer name fields
    if (job.customers?.first_name || job.customers?.last_name) {
      normalized.customer_first_name = job.customers.first_name || normalized.customer_first_name || ''
      normalized.customer_last_name = job.customers.last_name || normalized.customer_last_name || ''
    }
    
    // Normalize customer contact fields
    if (job.customers?.email) {
      normalized.customer_email = job.customers.email || normalized.customer_email || ''
    }
    if (job.customers?.phone) {
      normalized.customer_phone = job.customers.phone || normalized.customer_phone || ''
    }
    
    // Normalize customer address fields
    if (job.customers?.address) {
      normalized.customer_address = job.customers.address || normalized.customer_address || ''
    }
    if (job.customers?.city) {
      normalized.customer_city = job.customers.city || normalized.customer_city || ''
    }
    if (job.customers?.state) {
      normalized.customer_state = job.customers.state || normalized.customer_state || ''
    }
    if (job.customers?.zip_code) {
      normalized.customer_zip_code = job.customers.zip_code || normalized.customer_zip_code || ''
    }
    
    // Also preserve nested structure for backward compatibility
    if (job.customers) {
      normalized.customers = job.customers
    }
    
    return normalized
  }

  // Get customer name from job object - checks multiple possible locations
  const getCustomerName = (job) => {
    if (!job) return ''
    
    // Try direct customer_name field
    if (job.customer_name) return job.customer_name
    
    // Try nested customer object
    if (job.customer?.name) return job.customer.name
    
    // Try customers object (nested)
    if (job.customers?.first_name || job.customers?.last_name) {
      const firstName = job.customers.first_name || ''
      const lastName = job.customers.last_name || ''
      return `${firstName} ${lastName}`.trim()
    }
    
    // Try direct first_name and last_name fields
    if (job.customer_first_name || job.customer_last_name) {
      const firstName = job.customer_first_name || ''
      const lastName = job.customer_last_name || ''
      return `${firstName} ${lastName}`.trim()
    }
    
    // If nothing found, return empty string (will be handled by caller)
    return ''
  }

  const handleDateChange = (newDate) => {
    setSelectedDate(newDate)
    setShowCalendar(false)
    // Sync availabilityMonth when in availability tab
    if (activeTab === 'availability' && (newDate.getMonth() !== availabilityMonth.getMonth() || newDate.getFullYear() !== availabilityMonth.getFullYear())) {
      setAvailabilityMonth(new Date(newDate.getFullYear(), newDate.getMonth(), 1))
    }
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

  const getWeekDays = () => {
    // Create a new date object to avoid mutating selectedDate
    const date = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate())
    const dayOfWeek = date.getDay()
    // Calculate the start of the week (Sunday)
    const startOfWeek = new Date(date)
    startOfWeek.setDate(date.getDate() - dayOfWeek)
    startOfWeek.setHours(0, 0, 0, 0)
    
    const days = []
    for (let i = 0; i < 7; i++) {
      const weekDay = new Date(startOfWeek)
      weekDay.setDate(startOfWeek.getDate() + i)
      weekDay.setHours(0, 0, 0, 0)
      days.push(weekDay)
    }
    return days
  }

  const getMonthDays = () => {
    return generateCalendarDays()
  }

  // Generate calendar days for availability view
  const generateAvailabilityCalendarDays = (month) => {
    const year = month.getFullYear()
    const monthIndex = month.getMonth()
    const firstDay = new Date(year, monthIndex, 1)
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

  // Get business hours - prioritize user availability, fallback to territory
  const getBusinessHours = () => {
    // First, try to use user's business hours from backend
    if (userBusinessHours) {
      return userBusinessHours
    }

    // If territory is selected and has business hours, use that
    if (territoryFilter !== 'all' && territoryFilter) {
      const territory = territories.find(t => t.id === territoryFilter || t.id === parseInt(territoryFilter))
      if (territory && territory.business_hours) {
        try {
          const hours = typeof territory.business_hours === 'string' 
            ? JSON.parse(territory.business_hours) 
            : territory.business_hours
          return hours
        } catch (error) {
          console.error('Error parsing territory business hours:', error)
        }
      }
    }

    // Default business hours (Monday-Friday 9 AM - 6 PM)
    return {
      monday: { enabled: true, start: '09:00', end: '18:00' },
      tuesday: { enabled: true, start: '09:00', end: '18:00' },
      wednesday: { enabled: true, start: '09:00', end: '18:00' },
      thursday: { enabled: true, start: '09:00', end: '18:00' },
      friday: { enabled: true, start: '09:00', end: '18:00' },
      saturday: { enabled: false, start: '09:00', end: '18:00' },
      sunday: { enabled: false, start: '09:00', end: '18:00' }
    }
  }

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

  // Check if a day has jobs scheduled
  // This function is used in both Jobs and Availability tabs
  // It should respect the selectedFilter for consistency
  // Matches the exact logic from unified-calendar.jsx
  const getDayJobs = (date) => {
    // Format date as YYYY-MM-DD (same as unified-calendar)
    const dateString = date.toISOString().split('T')[0]
    
    if (activeTab === 'availability') {
      console.log(`\n🔍 getDayJobs(${dateString}) - Availability tab:`)
      console.log(`  - Total jobs in state: ${jobs.length}`)
      console.log(`  - Selected filter: ${selectedFilter}`)
    }
    
    // Filter jobs by date - match unified-calendar logic exactly
    let filteredJobs = jobs.filter(job => {
      if (!job.scheduled_date && !job.scheduledDate) return false
      
      // Parse date exactly like unified-calendar does
      let jobDate
      if (typeof job.scheduled_date === 'string' && job.scheduled_date.includes(' ')) {
        const [datePart] = job.scheduled_date.split(' ')
        jobDate = new Date(datePart)
      } else {
        jobDate = new Date(job.scheduled_date || job.scheduledDate)
      }
      
      const jobDateString = jobDate.toISOString().split('T')[0]
      return jobDateString === dateString
    })

    if (activeTab === 'availability') {
      console.log(`  - Jobs matching date ${dateString}: ${filteredJobs.length}`)
      if (filteredJobs.length > 0) {
        console.log(`  - Sample jobs:`, filteredJobs.slice(0, 3).map(j => ({
          id: j.id,
          scheduled_date: j.scheduled_date,
          status: j.status,
          assigned_team_member_id: j.assigned_team_member_id,
          team_member_id: j.team_member_id,
          team_assignments: j.team_assignments
        })))
      }
    }

    // Apply team member filter if one is selected (works for both Jobs and Availability tabs)
    // This ensures consistency: same team member shows same jobs in both tabs
    if (selectedFilter && selectedFilter !== 'all' && selectedFilter !== 'unassigned') {
      const beforeFilter = filteredJobs.length
      const targetId = Number(selectedFilter)
      filteredJobs = filteredJobs.filter(job => {
        const isAssigned = isJobAssignedTo(job, selectedFilter)
        if (activeTab === 'availability') {
          if (isAssigned) {
            console.log(`  ✅ Job ${job.id} IS assigned to team member ${selectedFilter}`)
          } else if (beforeFilter <= 5) {
            // Only log first few to avoid spam
            console.log(`  ❌ Job ${job.id} NOT assigned to team member ${selectedFilter}:`, {
              job_assigned_id: job.assigned_team_member_id,
              job_team_member_id: job.team_member_id,
              target_id: targetId,
              team_assignments: job.team_assignments?.map(ta => ({
                team_member_id: ta.team_member_id,
                team_members_id: ta.team_members?.id
              }))
            })
          }
        }
        return isAssigned
      })
      if (activeTab === 'availability') {
        console.log(`  📋 Filtered ${beforeFilter} jobs to ${filteredJobs.length} for team member ${selectedFilter}`)
        if (filteredJobs.length > 0) {
          console.log(`  ✅ Final jobs for availability calculation:`, filteredJobs.map(j => ({
            id: j.id,
            scheduled_date: j.scheduled_date,
            duration: getJobDuration(j)
          })))
        }
      }
    } else if (selectedFilter === 'unassigned') {
      // Filter for unassigned jobs
      filteredJobs = filteredJobs.filter(job => {
        const hasDirectAssignment = !!(job.assigned_team_member_id || job.team_member_id)
        const hasTeamAssignments = job.team_assignments && Array.isArray(job.team_assignments) && job.team_assignments.length > 0
        return !hasDirectAssignment && !hasTeamAssignments
      })
    }
    // If selectedFilter === 'all', show all jobs (no additional filtering)

    return filteredJobs
  }

  // Helper to get Personal Cleaner Availability (#3) for a specific day
  // Personal Cleaner Availability: When a cleaner is willing to work (set in app/settings)
  // This is independent of booked jobs - it's when the cleaner is available at all
  const getPersonalAvailabilityForDay = (memberId, dayOfWeek) => {
    const member = teamMembers.find(m => m.id === memberId)
    if (!member) return null
    
    // Check if we have cached availability
    if (teamMemberAvailability[memberId]) {
      const avail = teamMemberAvailability[memberId]
      if (typeof avail === 'string') {
        try {
          const parsed = JSON.parse(avail)
          const workingHours = parsed.workingHours || {}
          const dayHours = workingHours[dayOfWeek]
          if (dayHours && dayHours.available !== false) {
            if (dayHours.timeSlots && dayHours.timeSlots.length > 0) {
              return dayHours.timeSlots[0] // Use first time slot
            } else if (dayHours.start && dayHours.end) {
              return { start: dayHours.start, end: dayHours.end }
            }
          }
        } catch (e) {
          console.error('Error parsing team member availability:', e)
        }
      } else if (avail && avail.workingHours) {
        const dayHours = avail.workingHours[dayOfWeek]
        if (dayHours && dayHours.available !== false) {
          if (dayHours.timeSlots && dayHours.timeSlots.length > 0) {
            return dayHours.timeSlots[0]
          } else if (dayHours.start && dayHours.end) {
            return { start: dayHours.start, end: dayHours.end }
          }
        }
      }
    }
    
    // If member has availability in their object
    if (member.availability) {
      try {
        const avail = typeof member.availability === 'string' ? JSON.parse(member.availability) : member.availability
        const workingHours = avail.workingHours || {}
        const dayHours = workingHours[dayOfWeek]
        if (dayHours && dayHours.available !== false) {
          if (dayHours.timeSlots && dayHours.timeSlots.length > 0) {
            return dayHours.timeSlots[0]
          } else if (dayHours.start && dayHours.end) {
            return { start: dayHours.start, end: dayHours.end }
          }
        }
      } catch (e) {
        console.error('Error parsing member availability:', e)
      }
    }
    
    return null // No personal availability set
  }

  // Get availability for a specific team member on a specific date
  // 
  // IMPORTANT: This implements the exact formula:
  // Cleaner Job Availability (#5) = (Company Working Time (#4) ∩ Personal Cleaner Availability (#3)) - Cleaner Job Schedule (#2)
  //
  // The five distinct concepts:
  // 1. Job Schedule: The actual start and end time of a booked job
  // 2. Cleaner Job Schedule: All job schedules assigned to a specific cleaner
  // 3. Personal Cleaner Availability: When a cleaner is willing to work (set in app/settings)
  // 4. Company Working Time: When the company operates (set in settings)
  // 5. Cleaner Job Availability: Calculated time slots where a new job can be assigned (THIS RESULT)
  //
  // Rules:
  // - Personal cleaner availability alone is NOT bookable time
  // - Company working time is a hard limit
  // - Scheduled jobs always block time, even if the cleaner is "available"
  // - Both company working time AND personal cleaner availability are REQUIRED
  const getDayAvailabilityForMember = (date, memberId) => {
    const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][date.getDay()]
    const dateString = date.toISOString().split('T')[0]
    
    // STEP 1: Get Company Working Time (#4)
    // This is a hard limit - defines when the company operates at all
    const companyHours = getBusinessHours()
    const companyDayHours = companyHours[dayOfWeek] || { enabled: false, start: '09:00', end: '18:00' }
    
    // If company is not open on this day, no availability
    if (!companyDayHours.enabled) {
      return { isOpen: false, hours: null, jobCount: 0, availableSlots: [] }
    }
    
    // STEP 2: Get Personal Cleaner Availability (#3)
    // This defines when the cleaner is willing to work (independent of booked jobs)
    const personalAvailability = getPersonalAvailabilityForDay(memberId, dayOfWeek)
    
    // STEP 3: Intersect Company Working Time (#4) with Personal Cleaner Availability (#3)
    // BOTH are required - if personal availability is not set, intersection is empty (no bookable time)
    let intersectionTimeSlots = []
    if (personalAvailability) {
      // Both exist - calculate intersection
      const companyStart = timeToMinutes(companyDayHours.start)
      const companyEnd = timeToMinutes(companyDayHours.end)
      const personalStart = timeToMinutes(personalAvailability.start)
      const personalEnd = timeToMinutes(personalAvailability.end)
      
      // Find intersection: max(start times) to min(end times)
      const intersectionStart = Math.max(companyStart, personalStart)
      const intersectionEnd = Math.min(companyEnd, personalEnd)
      
      if (intersectionStart < intersectionEnd) {
        intersectionTimeSlots = [{
          start: minutesToTime(intersectionStart),
          end: minutesToTime(intersectionEnd)
        }]
      } else {
        // No intersection - cleaner not available during company hours
        return { isOpen: false, hours: null, jobCount: 0, availableSlots: [] }
      }
    } else {
      // No personal availability set - intersection is empty
      // Personal cleaner availability alone is NOT bookable time - BOTH are required
      return { isOpen: false, hours: null, jobCount: 0, availableSlots: [] }
    }
    
    // STEP 4: Get Cleaner Job Schedule (#2)
    // This is the list of all job schedules already assigned to this specific cleaner
    const dayJobs = jobs.filter(job => {
      if (!job.scheduled_date && !job.scheduledDate) return false
      let jobDate
      if (typeof job.scheduled_date === 'string' && job.scheduled_date.includes(' ')) {
        const [datePart] = job.scheduled_date.split(' ')
        jobDate = new Date(datePart)
      } else {
        jobDate = new Date(job.scheduled_date || job.scheduledDate)
      }
      const jobDateString = jobDate.toISOString().split('T')[0]
      if (jobDateString !== dateString) return false
      
      // Filter by team member - only jobs assigned to this cleaner
      return isJobAssignedTo(job, memberId.toString())
    })
    
    // STEP 5: Subtract Cleaner Job Schedule (#2) from the intersection
    // Scheduled jobs always block time, even if the cleaner is "available"
    const formatTime = (time24) => {
      const [hours] = time24.split(':')
      const hour = parseInt(hours)
      const ampm = hour >= 12 ? 'PM' : 'AM'
      const hour12 = hour % 12 || 12
      return `${hour12} ${ampm}`
    }
    
    // Extract job time ranges (Job Schedule #1 for each job in Cleaner Job Schedule #2)
    const jobTimeRanges = dayJobs.map(job => {
      let jobStartTime = null
      let jobDuration = job.duration || job.service_duration || job.estimated_duration || 60
      if (typeof jobDuration === 'string') {
        jobDuration = parseInt(jobDuration) || 60
      }
      
      if (job.scheduled_date && typeof job.scheduled_date === 'string') {
        // Handle different date formats: "YYYY-MM-DD HH:MM:SS", "YYYY-MM-DDTHH:MM:SS", or Date object
        if (job.scheduled_date.includes(' ')) {
          // Format: "YYYY-MM-DD HH:MM:SS"
          const [datePart, timePart] = job.scheduled_date.split(' ')
          const [hours, minutes] = timePart.split(':').map(Number)
          jobStartTime = (hours || 0) * 60 + (minutes || 0)
        } else if (job.scheduled_date.includes('T')) {
          // Format: "YYYY-MM-DDTHH:MM:SS" (ISO format)
          const [datePart, timePart] = job.scheduled_date.split('T')
          const [hours, minutes] = (timePart || '').split(':').map(Number)
          jobStartTime = (hours || 0) * 60 + (minutes || 0)
        } else {
          // Try parsing as Date object
          const jobDate = new Date(job.scheduled_date)
          if (!isNaN(jobDate.getTime())) {
            jobStartTime = jobDate.getHours() * 60 + jobDate.getMinutes()
          }
        }
      } else if (job.scheduledDate) {
        // Handle scheduledDate as Date object
        const jobDate = new Date(job.scheduledDate)
        if (!isNaN(jobDate.getTime())) {
          jobStartTime = jobDate.getHours() * 60 + jobDate.getMinutes()
        }
      }
      
      if (jobStartTime !== null) {
        return {
          start: jobStartTime,
          end: jobStartTime + jobDuration
        }
      }
      return null
    }).filter(Boolean)
    
    // Subtract job time ranges from intersection time slots
    // This gives us Cleaner Job Availability (#5) - the final bookable time slots
    let remainingHours = []
    
    if (jobTimeRanges.length > 0) {
      intersectionTimeSlots.forEach(availSlot => {
        const availStart = timeToMinutes(availSlot.start)
        const availEnd = timeToMinutes(availSlot.end)
        let currentStart = availStart
        
        const sortedJobRanges = jobTimeRanges
          .filter(jobRange => jobRange.start < availEnd && jobRange.end > availStart)
          .sort((a, b) => a.start - b.start)
        
        sortedJobRanges.forEach((jobRange) => {
          if (currentStart < jobRange.start) {
            remainingHours.push({
              start: minutesToTime(currentStart),
              end: minutesToTime(jobRange.start)
            })
          }
          currentStart = Math.max(currentStart, jobRange.end)
        })
        
        if (currentStart < availEnd) {
          remainingHours.push({
            start: minutesToTime(currentStart),
            end: minutesToTime(availEnd)
          })
        }
      })
    } else {
      // No jobs scheduled - intersection time slots are fully available
      remainingHours = intersectionTimeSlots.map(slot => ({
        start: slot.start,
        end: slot.end
      }))
    }
    
    if (remainingHours.length > 0) {
      const formattedSlots = remainingHours.map(slot => 
        `${formatTime(slot.start)} - ${formatTime(slot.end)}`
      ).join(', ')
      return {
        isOpen: true,
        hours: formattedSlots,
        jobCount: dayJobs.length,
        hasJobs: dayJobs.length > 0,
        availableSlots: remainingHours
      }
    } else {
      return {
        isOpen: false,
        hours: null,
        jobCount: dayJobs.length,
        hasJobs: true,
        availableSlots: []
      }
    }
  }

  // Check if a day is open and get hours, considering jobs
  // Formula for availability tab: (Company Working Time ∩ Personal Cleaner Availability) - Scheduled Jobs
  const getDayAvailability = (date) => {
    const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][date.getDay()]
    
    // If in availability tab and "all-team-members" is selected, aggregate availability for ALL team members
    if (activeTab === 'availability' && selectedFilter === 'all-team-members') {
      if (teamMembers.length === 0) {
        return { isOpen: false, hours: null, jobCount: 0, availableSlots: [] }
      }
      
      // Aggregate availability for all team members
      // Combine all available time slots from all team members
      // Each member's availability already has their jobs subtracted by getDayAvailabilityForMember
      const allAvailableSlots = []
      let totalJobCount = 0
      
      console.log(`👥 All Team Members availability calculation for ${date.toDateString()}:`)
      console.log(`  - Total team members: ${teamMembers.length}`)
      console.log(`  - Total jobs in state: ${jobs.length}`)
      
      teamMembers.filter(m => m.status === 'active').forEach(member => {
        const memberAvailability = getDayAvailabilityForMember(date, Number(member.id))
        console.log(`  - Member ${member.first_name} ${member.last_name} (ID: ${member.id}):`)
        console.log(`    - Job count: ${memberAvailability.jobCount || 0}`)
        console.log(`    - Available slots: ${memberAvailability.availableSlots?.length || 0}`)
        if (memberAvailability.availableSlots && memberAvailability.availableSlots.length > 0) {
          allAvailableSlots.push(...memberAvailability.availableSlots)
        }
        totalJobCount += memberAvailability.jobCount || 0
      })
      
      console.log(`  - Total jobs across all members: ${totalJobCount}`)
      console.log(`  - Total available slots before merging: ${allAvailableSlots.length}`)
      
      // Merge overlapping time slots to show combined availability
      if (allAvailableSlots.length === 0) {
        return { isOpen: false, hours: null, jobCount: totalJobCount, availableSlots: [] }
      }
      
      // Sort slots by start time
      const sortedSlots = allAvailableSlots.sort((a, b) => 
        timeToMinutes(a.start) - timeToMinutes(b.start)
      )
      
      // Merge overlapping or adjacent slots
      const mergedSlots = []
      let currentSlot = { ...sortedSlots[0] }
      
      for (let i = 1; i < sortedSlots.length; i++) {
        const nextSlot = sortedSlots[i]
        const currentEnd = timeToMinutes(currentSlot.end)
        const nextStart = timeToMinutes(nextSlot.start)
        
        if (nextStart <= currentEnd) {
          // Slots overlap or are adjacent - merge them
          const nextEnd = timeToMinutes(nextSlot.end)
          if (nextEnd > currentEnd) {
            currentSlot.end = nextSlot.end
          }
        } else {
          // No overlap - save current slot and start a new one
          mergedSlots.push(currentSlot)
          currentSlot = { ...nextSlot }
        }
      }
      mergedSlots.push(currentSlot)
      
      // Format the merged slots for display
      const formatTime = (time24) => {
        const [hours] = time24.split(':')
        const hour = parseInt(hours)
        const ampm = hour >= 12 ? 'PM' : 'AM'
        const hour12 = hour % 12 || 12
        return `${hour12} ${ampm}`
      }
      
      const formattedSlots = mergedSlots.map(slot => 
        `${formatTime(slot.start)} - ${formatTime(slot.end)}`
      ).join(', ')
      
      return {
        isOpen: true,
        hours: formattedSlots,
        jobCount: totalJobCount,
        hasJobs: totalJobCount > 0,
        availableSlots: mergedSlots
      }
    }
    
    // If in availability tab and a territory is selected, aggregate availability for all team members in that territory
    if (activeTab === 'availability' && territoryFilter && territoryFilter !== 'all') {
      const territoryId = Number(territoryFilter)
      const territory = territories.find(t => t.id === territoryId)
      
      if (territory) {
        // Get team member IDs from territory's team_members field
        let teamMemberIds = []
        if (territory.team_members) {
          if (typeof territory.team_members === 'string') {
            try {
              teamMemberIds = JSON.parse(territory.team_members)
            } catch (e) {
              console.error('Error parsing territory team_members:', e)
              teamMemberIds = []
            }
          } else if (Array.isArray(territory.team_members)) {
            teamMemberIds = territory.team_members
          }
        }
        
        // Normalize IDs to numbers
        const normalizedTeamMemberIds = teamMemberIds.map(id => Number(id))
        
        // Get all team members in this territory
        const territoryTeamMembers = teamMembers.filter(member =>
          member.status === 'active' && normalizedTeamMemberIds.includes(Number(member.id))
        )
        
        if (territoryTeamMembers.length === 0) {
          return { isOpen: false, hours: null, jobCount: 0, availableSlots: [] }
        }
        
        // Aggregate availability for all team members in the territory
        // Combine all available time slots from all team members
        // Each member's availability already has their jobs subtracted by getDayAvailabilityForMember
        const allAvailableSlots = []
        let totalJobCount = 0
        
        console.log(`🌍 Territory availability calculation for ${date.toDateString()}:`)
        console.log(`  - Territory: ${territory.name} (ID: ${territoryId})`)
        console.log(`  - Team members in territory: ${territoryTeamMembers.length}`)
        console.log(`  - Total jobs in state: ${jobs.length}`)
        
        territoryTeamMembers.forEach(member => {
          const memberAvailability = getDayAvailabilityForMember(date, Number(member.id))
          console.log(`  - Member ${member.first_name} ${member.last_name} (ID: ${member.id}):`)
          console.log(`    - Job count: ${memberAvailability.jobCount || 0}`)
          console.log(`    - Available slots: ${memberAvailability.availableSlots?.length || 0}`)
          if (memberAvailability.availableSlots && memberAvailability.availableSlots.length > 0) {
            allAvailableSlots.push(...memberAvailability.availableSlots)
          }
          totalJobCount += memberAvailability.jobCount || 0
        })
        
        console.log(`  - Total jobs across all members: ${totalJobCount}`)
        console.log(`  - Total available slots before merging: ${allAvailableSlots.length}`)
        
        // Merge overlapping time slots to show combined availability
        if (allAvailableSlots.length === 0) {
          return { isOpen: false, hours: null, jobCount: totalJobCount, availableSlots: [] }
        }
        
        // Sort slots by start time
        const sortedSlots = allAvailableSlots.sort((a, b) => 
          timeToMinutes(a.start) - timeToMinutes(b.start)
        )
        
        // Merge overlapping or adjacent slots
        const mergedSlots = []
        let currentSlot = { ...sortedSlots[0] }
        
        for (let i = 1; i < sortedSlots.length; i++) {
          const nextSlot = sortedSlots[i]
          const currentEnd = timeToMinutes(currentSlot.end)
          const nextStart = timeToMinutes(nextSlot.start)
          
          if (nextStart <= currentEnd) {
            // Slots overlap or are adjacent - merge them
            const nextEnd = timeToMinutes(nextSlot.end)
            if (nextEnd > currentEnd) {
              currentSlot.end = nextSlot.end
            }
          } else {
            // No overlap - save current slot and start a new one
            mergedSlots.push(currentSlot)
            currentSlot = { ...nextSlot }
          }
        }
        mergedSlots.push(currentSlot)
        
        // Format the merged slots for display
        const formatTime = (time24) => {
          const [hours] = time24.split(':')
          const hour = parseInt(hours)
          const ampm = hour >= 12 ? 'PM' : 'AM'
          const hour12 = hour % 12 || 12
          return `${hour12} ${ampm}`
        }
        
        const formattedSlots = mergedSlots.map(slot => 
          `${formatTime(slot.start)} - ${formatTime(slot.end)}`
        ).join(', ')
        
        return {
          isOpen: true,
          hours: formattedSlots,
          jobCount: totalJobCount,
          hasJobs: totalJobCount > 0,
          availableSlots: mergedSlots
        }
      }
    }
    
    // If in availability tab and a specific team member is selected, use the member-specific calculation
    if (activeTab === 'availability' && selectedFilter && selectedFilter !== 'all' && selectedFilter !== 'unassigned' && selectedFilter !== 'all-team-members') {
      const memberId = Number(selectedFilter)
      return getDayAvailabilityForMember(date, memberId)
    }
    
    // For jobs tab or "all" filter, use company working hours
    const dayJobs = getDayJobs(date)
    const hours = getBusinessHours()
    const dayHours = hours[dayOfWeek] || { enabled: false, start: '09:00', end: '18:00' }
    
    if (!dayHours.enabled) {
      return { isOpen: false, hours: null, jobCount: dayJobs.length, availableSlots: [] }
    }

    // Format hours (e.g., "09:00" -> "9 AM", "18:00" -> "6 PM")
    const formatTime = (time24) => {
      const [hours] = time24.split(':')
      const hour = parseInt(hours)
      const ampm = hour >= 12 ? 'PM' : 'AM'
      const hour12 = hour % 12 || 12
      return `${hour12} ${ampm}`
    }

    // In availability tab, ALWAYS calculate available time slots by subtracting jobs
    // This matches the logic from unified-calendar.jsx
    if (activeTab === 'availability') {
      // Create availability slot from business hours
      const availabilitySlots = [{
        start: dayHours.start,
        end: dayHours.end
      }]
      
      console.log(`📅 Availability calculation for ${date.toDateString()}:`)
      console.log(`  - Business hours: ${dayHours.start} - ${dayHours.end}`)
      console.log(`  - Jobs found: ${dayJobs.length}`)
      if (selectedFilter && selectedFilter !== 'all' && selectedFilter !== 'unassigned') {
        console.log(`  - Filtered by team member: ${selectedFilter}`)
      }
      
      // Get job time ranges for this day (already filtered by selected team member)
      // Match unified-calendar.jsx logic exactly
      const jobTimeRanges = dayJobs.map(job => {
        let jobStartTime = null
        let jobDuration = 0
        
        // Parse job scheduled time - EXACT match to unified-calendar.jsx lines 426-434
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
        
        // Get job duration in minutes - EXACT match to unified-calendar.jsx lines 437-441
        jobDuration = job.duration || job.service_duration || job.estimated_duration || 60 // default 1 hour
        if (typeof jobDuration === 'string') {
          jobDuration = parseInt(jobDuration) || 60
        }
        
        if (jobStartTime !== null) {
          console.log(`  ✅ Job ${job.id}: ${minutesToTime(jobStartTime)} (${jobStartTime} min) for ${jobDuration} min → ends at ${minutesToTime(jobStartTime + jobDuration)}`)
          return {
            start: jobStartTime,
            end: jobStartTime + jobDuration
          }
        }
        
        console.log(`  ⚠️ Job ${job.id} has no scheduled time:`, {
          scheduled_time: job.scheduled_time,
          scheduled_date: job.scheduled_date
        })
        return null
      }).filter(Boolean) // Remove null entries

      console.log(`  - Job time ranges (${jobTimeRanges.length}):`, jobTimeRanges.map(r => `${minutesToTime(r.start)}-${minutesToTime(r.end)}`))

      // Subtract job times from availability hours (match unified-calendar logic)
      let remainingHours = []
      
      if (jobTimeRanges.length > 0) {
        console.log(`  🔄 Calculating available slots by subtracting ${jobTimeRanges.length} jobs...`)
        // For each availability slot, subtract jobs
        availabilitySlots.forEach(availSlot => {
          const availStart = timeToMinutes(availSlot.start)
          const availEnd = timeToMinutes(availSlot.end)
          
          console.log(`    Processing availability slot: ${availSlot.start} - ${availSlot.end} (${availStart} - ${availEnd} minutes)`)
          
          // Find gaps between jobs within this availability slot
          let currentStart = availStart
          
          // Sort job time ranges by start time and filter to those within this slot
          const sortedJobRanges = jobTimeRanges
            .filter(jobRange => {
              const overlaps = jobRange.start < availEnd && jobRange.end > availStart
              if (!overlaps) {
                console.log(`      Job range ${minutesToTime(jobRange.start)}-${minutesToTime(jobRange.end)} doesn't overlap with slot`)
              }
              return overlaps
            })
            .sort((a, b) => a.start - b.start)
          
          console.log(`    Found ${sortedJobRanges.length} overlapping job ranges`)
          
          sortedJobRanges.forEach((jobRange, idx) => {
            console.log(`      Job ${idx + 1}: ${minutesToTime(jobRange.start)}-${minutesToTime(jobRange.end)} (${jobRange.start}-${jobRange.end} min)`)
            // If there's a gap before this job, add it
            if (currentStart < jobRange.start) {
              const gap = {
                start: minutesToTime(currentStart),
                end: minutesToTime(jobRange.start)
              }
              console.log(`        ✅ Adding gap before job: ${gap.start} - ${gap.end}`)
              remainingHours.push(gap)
            } else {
              console.log(`        ⚠️ No gap before job (currentStart: ${currentStart}, jobStart: ${jobRange.start})`)
            }
            // Move current start to after this job
            const oldStart = currentStart
            currentStart = Math.max(currentStart, jobRange.end)
            console.log(`        Moving currentStart from ${oldStart} to ${currentStart} (after job ends at ${jobRange.end})`)
          })
          
          // If there's remaining time after all jobs, add it
          if (currentStart < availEnd) {
            const remaining = {
              start: minutesToTime(currentStart),
              end: minutesToTime(availEnd)
            }
            console.log(`        ✅ Adding remaining time after all jobs: ${remaining.start} - ${remaining.end}`)
            remainingHours.push(remaining)
          } else {
            console.log(`        ⚠️ No remaining time (currentStart: ${currentStart}, availEnd: ${availEnd})`)
          }
        })
      } else {
        // No jobs - show full business hours
        console.log(`  ℹ️ No jobs found, showing full business hours`)
        remainingHours = availabilitySlots.map(slot => ({
          start: slot.start,
          end: slot.end
        }))
      }

      // Format available slots for display
      if (remainingHours.length > 0) {
        const formattedSlots = remainingHours.map(slot => 
          `${formatTime(slot.start)} - ${formatTime(slot.end)}`
        ).join(', ')
        console.log(`  ✅ FINAL Available slots: ${formattedSlots}`)
        return {
          isOpen: true,
          hours: formattedSlots,
          jobCount: dayJobs.length,
          hasJobs: dayJobs.length > 0,
          availableSlots: remainingHours
        }
      } else {
        // All time is booked
        console.log(`  ❌ All time is booked - no available slots`)
        return {
          isOpen: false,
          hours: null,
          jobCount: dayJobs.length,
          hasJobs: true,
          availableSlots: []
        }
      }
    }

    // Default (for Jobs tab): show full business hours
    return {
      isOpen: true,
      hours: `${formatTime(dayHours.start)} - ${formatTime(dayHours.end)}`,
      jobCount: dayJobs.length,
      hasJobs: dayJobs.length > 0,
      availableSlots: [{
        start: dayHours.start,
        end: dayHours.end
      }]
    }
  }

  // Navigate availability month
  const navigateAvailabilityMonth = (direction) => {
    const newMonth = new Date(availabilityMonth)
    newMonth.setMonth(availabilityMonth.getMonth() + direction)
    setAvailabilityMonth(newMonth)
    // Sync selectedDate to first day of new month
    const firstDay = new Date(newMonth.getFullYear(), newMonth.getMonth(), 1)
    setSelectedDate(firstDay)
  }

  // Navigate availability date (day by day)
  const navigateAvailabilityDate = (direction) => {
    const newDate = new Date(selectedDate)
    newDate.setDate(selectedDate.getDate() + direction)
    setSelectedDate(newDate)
    // Sync availabilityMonth if we cross month boundary
    if (newDate.getMonth() !== availabilityMonth.getMonth() || newDate.getFullYear() !== availabilityMonth.getFullYear()) {
      setAvailabilityMonth(new Date(newDate.getFullYear(), newDate.getMonth(), 1))
    }
  }

  // Format date for display (e.g., "Wed, Nov 5, 2025")
  const formatDateDisplay = (date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    })
  }

  // Get selected territory name
  const getSelectedTerritoryName = () => {
    if (territoryFilter === 'all' || !territoryFilter) {
      return null
    }
    const territory = territories.find(t => t.id === territoryFilter || t.id === parseInt(territoryFilter))
    return territory?.name || null
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

  const handleJobClick = async (job) => {
    // Parse status_history if it's a string
    let parsedStatusHistory = job.status_history;
    if (parsedStatusHistory && typeof parsedStatusHistory === 'string') {
      try {
        parsedStatusHistory = JSON.parse(parsedStatusHistory);
      } catch (e) {
        console.error('Error parsing status_history:', e);
        parsedStatusHistory = [];
      }
    }
    
    // Set the job details immediately for quick display
    setSelectedJobDetails({ ...job, status_history: parsedStatusHistory })
    setShowJobDetailsOverlay(true)
    
    // If job has an assigned team member ID, ensure we have the member details
    const assignedMemberId = job.assigned_team_member_id || job.team_member_id
    if (assignedMemberId && teamMembers.length > 0) {
      const assignedMember = teamMembers.find(m => m.id === assignedMemberId)
      if (assignedMember) {
        // Update selectedJobDetails with member info if not already present
        setSelectedJobDetails(prev => ({
          ...prev,
          team_member_first_name: assignedMember.first_name,
          team_member_last_name: assignedMember.last_name
        }))
      }
    }
    
    // Optionally fetch full job details from API for complete information
    try {
      const fullJobDetails = await jobsAPI.getById(job.id)
      if (fullJobDetails) {
        // Normalize customer data to ensure flat fields exist
        const normalizedJob = normalizeCustomerData(fullJobDetails)
        
        // Parse status_history if it's a string
        let parsedFullStatusHistory = normalizedJob.status_history;
        if (parsedFullStatusHistory && typeof parsedFullStatusHistory === 'string') {
          try {
            parsedFullStatusHistory = JSON.parse(parsedFullStatusHistory);
          } catch (e) {
            console.error('Error parsing status_history:', e);
            parsedFullStatusHistory = [];
          }
        }
        
        const jobWithParsedHistory = {
          ...normalizedJob,
          status_history: parsedFullStatusHistory
        };
        
        // Merge with team member info if available
        const memberId = normalizedJob.assigned_team_member_id || normalizedJob.team_member_id
        if (memberId && teamMembers.length > 0) {
          const member = teamMembers.find(m => m.id === memberId)
          if (member) {
            setSelectedJobDetails({
              ...jobWithParsedHistory,
              team_member_first_name: member.first_name,
              team_member_last_name: member.last_name
            })
          } else {
            setSelectedJobDetails(jobWithParsedHistory)
          }
        } else {
          setSelectedJobDetails(jobWithParsedHistory)
        }
        
        // Load customer notification preferences and global settings
        const customerId = normalizedJob.customer_id || job.customer_id
        if (customerId && user?.id) {
          try {
            // Load both customer preferences and global notification settings
            const [prefs, globalSettings] = await Promise.all([
              notificationAPI.getPreferences(customerId),
              notificationSettingsAPI.getSettings(user.id).catch(() => []) // Don't fail if global settings can't be loaded
            ])
            
            console.log('📧 Loaded customer notification preferences:', prefs)
            console.log('🌐 Loaded global notification settings:', globalSettings)
    
            // Check global appointment confirmation SMS setting
            const appointmentSetting = globalSettings.find(s => s.notification_type === 'appointment_confirmation')
            const globalSmsEnabled = appointmentSetting && appointmentSetting.sms_enabled === 1
            
            // If global SMS is enabled, ensure SMS notifications are enabled for this customer
            let smsShouldBeEnabled = !!prefs.sms_notifications
            if (globalSmsEnabled && !prefs.sms_notifications) {
              // Global setting overrides - enable SMS for this customer
              smsShouldBeEnabled = true
              console.log('🌐 Global appointment confirmation SMS is enabled - enabling SMS for this customer')
              
              // Update customer preferences to match global setting
              try {
                await notificationAPI.updatePreferences(customerId, {
                  email_notifications: prefs.email_notifications !== undefined ? !!prefs.email_notifications : true,
                  sms_notifications: true
                })
                console.log('📱 Updated customer preferences to match global SMS setting')
              } catch (updateError) {
                console.error('Failed to update customer preferences:', updateError)
                // Continue anyway - we'll still enable it in the UI
              }
            }
            
            // Set notification states
            setEmailNotifications(!!prefs.email_notifications)
            setSmsNotifications(smsShouldBeEnabled)
            
            console.log('📧 Setting notification states:', {
              email: !!prefs.email_notifications,
              sms: smsShouldBeEnabled,
              globalSmsEnabled,
              rawEmail: prefs.email_notifications,
              rawSms: prefs.sms_notifications
            })
          } catch (prefError) {
            console.error('Failed to load notification preferences:', prefError)
            // Use defaults - don't show error to user for notification preferences
            setEmailNotifications(true)
            setSmsNotifications(false)
          }
        }
      }
    } catch (error) {
      console.error('Error fetching full job details:', error)
      // Keep the original job data if fetch fails
    }
  }

  const handleCustomerClick = (e, customerId) => {
    e.stopPropagation()
    if (customerId) {
      navigate(`/customer/${customerId}`)
    }
  }

  const handleTeamMemberClick = (e, teamMemberId) => {
    e.stopPropagation()
    if (teamMemberId) {
      navigate(`/team/${teamMemberId}`)
    }
  }

  const closeJobDetailsOverlay = () => {
    setShowJobDetailsOverlay(false)
    setSelectedJobDetails(null)
    setShowStatusMenu(false)
    setShowNotificationModal(false)
    setSuccessMessage('')
    setErrorMessage('')
    // Reset notification states when closing
    setEmailNotifications(true)
    setSmsNotifications(false)
  }

  const handleNotificationToggle = async (type, value) => {
    if (!selectedJobDetails || !selectedJobDetails.customer_id) return
    try {
      console.log('🔄 Toggling notification:', { type, value, customerId: selectedJobDetails.customer_id })
      
      // Update local state first
      if (type === 'email') {
        setEmailNotifications(value)
        console.log('📧 Email notification set to:', value)
      } else if (type === 'sms') {
        setSmsNotifications(value)
        console.log('📱 SMS notification set to:', value)
      }
      
      // Update notification preferences in backend
      const preferences = {
        email_notifications: type === 'email' ? value : emailNotifications,
        sms_notifications: type === 'sms' ? value : smsNotifications
      }
      
      console.log('📧 Sending preferences to server:', preferences)
      const result = await notificationAPI.updatePreferences(selectedJobDetails.customer_id, preferences)
      console.log('✅ Server response:', result)
      
      setSuccessMessage(`${type === 'email' ? 'Email' : 'SMS'} notifications ${value ? 'enabled' : 'disabled'}`)
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (error) {
      console.error('Failed to update notification preferences:', error)
      
      // Revert the toggle if update failed
      if (type === 'email') {
        setEmailNotifications(!value)
      } else if (type === 'sms') {
        setSmsNotifications(!value)
      }
      
      setErrorMessage(error.response?.data?.error || 'Failed to update notification preferences')
      setTimeout(() => setErrorMessage(''), 3000)
    }
  }

  // Close status menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showStatusMenu && !event.target.closest('.relative.flex')) {
        setShowStatusMenu(false)
      }
    }

    if (showStatusMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showStatusMenu])

  const handleStatusChange = async (newStatus) => {
    if (!selectedJobDetails) return
    
    try {
      setIsUpdatingStatus(true)
      setErrorMessage('')
      
      console.log('Updating job status:', { jobId: selectedJobDetails.id, newStatus })
      await jobsAPI.updateStatus(selectedJobDetails.id, newStatus)
      
      // Fetch updated job to get the actual status from backend
      const updatedJob = await jobsAPI.getById(selectedJobDetails.id)
      const actualStatus = updatedJob?.status || newStatus
      
      // Normalize customer data to ensure flat fields are preserved
      const normalizedUpdatedJob = normalizeCustomerData(updatedJob)
      
      // Parse status_history if it's a string
      let parsedStatusHistory = normalizedUpdatedJob?.status_history;
      if (parsedStatusHistory && typeof parsedStatusHistory === 'string') {
        try {
          parsedStatusHistory = JSON.parse(parsedStatusHistory);
        } catch (e) {
          console.error('Error parsing status_history:', e);
          parsedStatusHistory = [];
        }
      }
      
      console.log('Status update response:', { newStatus, actualStatus, updatedJob })
      
      // Update the job in local state with actual status from backend
      // Preserve existing customer data if new data is missing
      setSelectedJobDetails(prev => {
        const merged = {
          ...prev, // Preserve existing data
          ...normalizedUpdatedJob, // Apply new data
          status: actualStatus,
          status_history: parsedStatusHistory
        }
        
        // Ensure customer fields are preserved even if API doesn't return them
        if (!merged.customer_first_name && prev?.customer_first_name) {
          merged.customer_first_name = prev.customer_first_name
        }
        if (!merged.customer_last_name && prev?.customer_last_name) {
          merged.customer_last_name = prev.customer_last_name
        }
        if (!merged.customer_email && prev?.customer_email) {
          merged.customer_email = prev.customer_email
        }
        if (!merged.customer_phone && prev?.customer_phone) {
          merged.customer_phone = prev.customer_phone
        }
        if (!merged.customer_address && prev?.customer_address) {
          merged.customer_address = prev.customer_address
        }
        
        return merged
      })
      
      // Invalidate cache since job was updated
      invalidateJobsCache()
      
      // Update the job in the main jobs list
      setJobs(prevJobs => prevJobs.map(job => 
        job.id === selectedJobDetails.id ? { ...job, status: actualStatus, ...updatedJob } : job
      ))
      
      // Update filtered jobs as well
      setFilteredJobs(prevFilteredJobs => prevFilteredJobs.map(job => 
        job.id === selectedJobDetails.id ? { ...job, status: actualStatus, ...updatedJob } : job
      ))
      
      setSuccessMessage(`Job marked as ${actualStatus.replace('_', ' ').replace('-', ' ')}`)
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

  // Calculate total price for invoice
  const calculateTotalPrice = () => {
    if (!selectedJobDetails) return 0
    try {
      const baseTotal = parseFloat(selectedJobDetails.total || selectedJobDetails.service_price || selectedJobDetails.price || 0)
      return baseTotal
    } catch (error) {
      console.error('Error calculating total price:', error)
      return 0
    }
  }

  // Handle print invoice
  const handlePrintInvoice = () => {
    if (!selectedJobDetails) return

    const invoiceNumber = selectedJobDetails.invoice_id ? `INV-${selectedJobDetails.invoice_id}` : `JOB-${selectedJobDetails.id}`
    const customerName = getCustomerName(selectedJobDetails)
    const serviceName = selectedJobDetails.service_name || selectedJobDetails.service_type || 'Service'
    const serviceDate = selectedJobDetails.scheduled_date 
      ? new Date(selectedJobDetails.scheduled_date).toLocaleDateString('en-US', { 
          weekday: 'long', 
          month: 'long', 
          day: 'numeric', 
          year: 'numeric' 
        })
      : 'Not scheduled'
    const dueDate = selectedJobDetails.invoice_due_date
      ? new Date(selectedJobDetails.invoice_due_date).toLocaleDateString('en-US', { 
          month: 'long', 
          day: 'numeric', 
          year: 'numeric' 
        })
      : new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { 
          month: 'long', 
          day: 'numeric', 
          year: 'numeric' 
        })
    const serviceAddress = selectedJobDetails.customer_address || selectedJobDetails.address || 'Address not provided'
    const subtotal = calculateTotalPrice()
    const totalPaid = selectedJobDetails.invoice_paid_amount || selectedJobDetails.amount_paid || 0
    const totalDue = subtotal - totalPaid
    // Check both invoice_status and payment_status for 'paid'
    const isPaid = selectedJobDetails.invoice_status === 'paid' || selectedJobDetails.payment_status === 'paid'
    const status = isPaid ? 'Paid' : 
                   selectedJobDetails.invoice_status === 'sent' ? 'Sent' : 
                   selectedJobDetails.invoice_status === 'draft' ? 'Draft' : 
                   'Draft'

    const printWindow = window.open('', '_blank', 'width=800,height=600')
    
    const invoiceHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Invoice ${invoiceNumber}</title>
        <style>
          @media print {
            body { margin: 0; padding: 20px; }
            .no-print { display: none; }
            @page { margin: 1cm; }
          }
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Montserrat', Arial, sans-serif;
            color: #333;
            line-height: 1.6;
            padding: 40px;
            background: white;
          }
          .invoice-container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 2px solid #e5e7eb;
          }
          .company-info h1 {
            font-size: 28px;
            font-weight: 700;
            color: #111827;
            margin-bottom: 5px;
          }
          .company-info p {
            font-size: 14px;
            color: #6b7280;
          }
          .invoice-info {
            text-align: right;
          }
          .invoice-info h2 {
            font-size: 24px;
            font-weight: 700;
            color: #111827;
            margin-bottom: 5px;
          }
          .invoice-info .invoice-number {
            font-size: 18px;
            font-weight: 600;
            color: #4b5563;
          }
          .invoice-info .status {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
            margin-top: 8px;
            background: #f3f4f6;
            color: #374151;
          }
          .details-section {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            margin-bottom: 40px;
          }
          .section {
            margin-bottom: 30px;
          }
          .section h3 {
            font-size: 14px;
            font-weight: 700;
            color: #111827;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 12px;
          }
          .section p {
            font-size: 14px;
            color: #4b5563;
            margin-bottom: 8px;
          }
          .section .label {
            font-size: 12px;
            color: #6b7280;
            font-weight: 500;
          }
          .section .value {
            font-size: 14px;
            color: #111827;
            font-weight: 600;
            margin-top: 4px;
          }
          .service-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
          }
          .service-table thead {
            background: #f9fafb;
            border-bottom: 2px solid #e5e7eb;
          }
          .service-table th {
            padding: 12px;
            text-align: left;
            font-size: 12px;
            font-weight: 700;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .service-table td {
            padding: 16px 12px;
            border-bottom: 1px solid #e5e7eb;
            font-size: 14px;
            color: #111827;
          }
          .service-table tbody tr:last-child td {
            border-bottom: none;
          }
          .service-name {
            font-weight: 600;
          }
          .service-price {
            text-align: right;
            font-weight: 600;
          }
          .totals {
            margin-top: 30px;
            margin-left: auto;
            width: 300px;
          }
          .totals-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            font-size: 14px;
          }
          .totals-row.label {
            color: #6b7280;
          }
          .totals-row.value {
            color: #111827;
            font-weight: 600;
          }
          .totals-row.total {
            border-top: 2px solid #e5e7eb;
            padding-top: 12px;
            margin-top: 8px;
            font-size: 16px;
            font-weight: 700;
          }
          .footer {
            margin-top: 60px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            color: #6b7280;
            font-size: 14px;
          }
          .print-button {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 10px 20px;
            background: #2563eb;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 600;
            z-index: 1000;
          }
          .print-button:hover {
            background: #1d4ed8;
          }
        </style>
      </head>
      <body>
        <button class="print-button no-print" onclick="window.print()">Print Invoice</button>
        <div class="invoice-container">
          <div class="header">
            <div class="company-info">
              <h1>${user?.business_name || user?.businessName || user?.email || 'Your Business'}</h1>
              <p>Professional Services</p>
            </div>
            <div class="invoice-info">
              <h2>Invoice</h2>
              <div class="invoice-number">${invoiceNumber}</div>
              <div class="status">${status}</div>
            </div>
          </div>

          <div class="details-section">
            <div>
              <div class="section">
                <h3>Bill To</h3>
                <p class="value">${customerName}</p>
                ${selectedJobDetails.customer_email ? `<p style="font-size: 12px; color: #6b7280; margin-top: 4px;">${selectedJobDetails.customer_email}</p>` : ''}
                ${selectedJobDetails.customer_phone ? `<p style="font-size: 12px; color: #6b7280; margin-top: 4px;">${formatPhoneNumber(selectedJobDetails.customer_phone)}</p>` : ''}
              </div>
              <div class="section">
                <h3>Service Address</h3>
                <p class="value">${serviceAddress}</p>
              </div>
            </div>
            <div>
              <div class="section">
                <h3>Invoice Details</h3>
                <p><span class="label">Due Date:</span></p>
                <p class="value">${dueDate}</p>
                <p style="margin-top: 12px;"><span class="label">Service Date:</span></p>
                <p class="value">${serviceDate}</p>
                ${selectedJobDetails.id ? `<p style="margin-top: 12px;"><span class="label">Job Number:</span></p><p class="value">#${selectedJobDetails.id}</p>` : ''}
              </div>
            </div>
          </div>

          <table class="service-table">
            <thead>
              <tr>
                <th>Service</th>
                <th style="text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="service-name">${serviceName}</td>
                <td class="service-price">$${subtotal.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          <div class="totals">
            <div class="totals-row">
              <span class="label">Subtotal</span>
              <span class="value">$${subtotal.toFixed(2)}</span>
            </div>
            <div class="totals-row">
              <span class="label">Total</span>
              <span class="value">$${subtotal.toFixed(2)}</span>
            </div>
            <div class="totals-row">
              <span class="label">Amount Paid</span>
              <span class="value">$${totalPaid.toFixed(2)}</span>
            </div>
            <div class="totals-row total">
              <span>Total Due</span>
              <span>$${totalDue.toFixed(2)}</span>
            </div>
          </div>

          <div class="footer">
            <p>We appreciate your business.</p>
            <p style="margin-top: 8px;">Thank you for choosing our services!</p>
          </div>
        </div>
      </body>
      </html>
    `

    printWindow.document.write(invoiceHTML)
    printWindow.document.close()
    
    // Wait for content to load, then trigger print
    setTimeout(() => {
      printWindow.print()
    }, 250)
  }

  // Handle test email
  const handleTestEmail = async () => {
    if (!selectedJobDetails) return
    try {
      setIsUpdatingJob(true)
      
      const emailToUse = manualEmail || selectedJobDetails.customer_email
      
      if (!emailToUse) {
        setErrorMessage('Please enter a customer email address')
        setTimeout(() => setErrorMessage(''), 3000)
        return
      }
      
      const response = await api.post('/test-sendgrid', {
        testEmail: emailToUse
      })
      
      console.log('Test email result:', response.data)
      setSuccessMessage('Test email sent successfully!')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (error) {
      console.error('Error sending test email:', error)
      setErrorMessage('Failed to send test email: ' + (error.response?.data?.error || error.message))
      setTimeout(() => setErrorMessage(''), 3000)
    } finally {
      setIsUpdatingJob(false)
    }
  }

  // Handle send invoice
  const handleSendInvoice = async () => {
    if (!selectedJobDetails) return
    try {
      setIsUpdatingJob(true)
      setErrorMessage('')
      
      const calculatedAmount = calculateTotalPrice()
      console.log('💰 Creating invoice with amount:', calculatedAmount)
      
      if (calculatedAmount <= 0) {
        setErrorMessage('Invoice amount must be greater than $0. Please check the job pricing.')
        setTimeout(() => setErrorMessage(''), 3000)
        return
      }
      
      const createInvoiceData = {
        jobId: selectedJobDetails.id,
        customerId: selectedJobDetails.customer_id,
        amount: calculatedAmount,
        taxAmount: 0,
        totalAmount: calculatedAmount,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      }
      
      console.log('💰 Sending invoice data to server:', createInvoiceData)
      
      const invoiceResponse = await api.post('/create-invoice', createInvoiceData)
      const invoice = invoiceResponse.data
      console.log('📄 Invoice created:', invoice)
      
      const emailToUse = manualEmail || selectedJobDetails.customer_email
      
      if (!emailToUse) {
        setErrorMessage('Please enter a customer email address')
        setTimeout(() => setErrorMessage(''), 3000)
        return
      }
      
      const invoiceData = {
        invoiceId: invoice.id,
        jobId: selectedJobDetails.id,
        customerEmail: emailToUse,
        customerName: getCustomerName(selectedJobDetails),
        amount: calculateTotalPrice(),
        serviceName: selectedJobDetails.service_name || selectedJobDetails.service_type || 'Service',
        serviceDate: selectedJobDetails.scheduled_date,
        address: selectedJobDetails.customer_address || selectedJobDetails.address || 'Address not provided',
        includePaymentLink: includePaymentLink
      }
      
      console.log('📧 Sending invoice email with data:', invoiceData)
      
      const emailResponse = await api.post('/send-invoice-email', invoiceData)
      console.log('Invoice email sent:', emailResponse.data)
      
      await api.put(`/invoices/${invoice.id}`, {
        status: 'sent'
      })
      
      await jobsAPI.update(selectedJobDetails.id, {
        invoiceStatus: 'invoiced'
      })
      
      setSelectedJobDetails(prev => ({ ...prev, invoice_status: 'invoiced' }))
      setSuccessMessage('Invoice sent successfully!')
      setTimeout(() => setSuccessMessage(''), 3000)
      setShowSendInvoiceModal(false)
      setManualEmail('')
    } catch (error) {
      console.error('Error sending invoice:', error)
      setErrorMessage('Failed to send invoice')
      setTimeout(() => setErrorMessage(''), 3000)
    } finally {
      setIsUpdatingJob(false)
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
    
    // Get the current address
    const currentAddress = selectedJobDetails.service_address_street || 
                          selectedJobDetails.customer_address || 
                          selectedJobDetails.address || ''
    
    // Build full address string if we have components
    let fullAddress = currentAddress
    if (selectedJobDetails.service_address_city || selectedJobDetails.service_address_state) {
      const parts = [currentAddress]
      if (selectedJobDetails.service_address_city) parts.push(selectedJobDetails.service_address_city)
      if (selectedJobDetails.service_address_state) parts.push(selectedJobDetails.service_address_state)
      if (selectedJobDetails.service_address_zip) parts.push(selectedJobDetails.service_address_zip)
      fullAddress = parts.filter(Boolean).join(', ')
    }
    
    setEditFormData(prev => ({
      ...prev,
      service_address: fullAddress
    }))
    
    // Set address data if we have components
    if (selectedJobDetails.service_address_street || selectedJobDetails.service_address_city) {
      setSelectedAddressData({
        formattedAddress: fullAddress,
        components: {
          streetNumber: selectedJobDetails.service_address_street?.split(' ')[0] || null,
          route: selectedJobDetails.service_address_street?.split(' ').slice(1).join(' ') || null,
          city: selectedJobDetails.service_address_city || null,
          state: selectedJobDetails.service_address_state || null,
          zipCode: selectedJobDetails.service_address_zip || null,
          country: 'USA'
        }
      })
    } else {
      setSelectedAddressData(null)
    }
    
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

  const handleSaveTeamMemberName = async () => {
    if (!editTeamMemberData.id) return

    try {
      setIsUpdatingJob(true)
      setErrorMessage('')

      await teamAPI.update(editTeamMemberData.id, {
        first_name: editTeamMemberData.first_name,
        last_name: editTeamMemberData.last_name
      })

      // Update team members list
      setTeamMembers(prev => prev.map(m =>
        m.id === editTeamMemberData.id
          ? { ...m, first_name: editTeamMemberData.first_name, last_name: editTeamMemberData.last_name }
          : m
      ))

      // Update team_assignments in selectedJobDetails if applicable
      if (selectedJobDetails) {
        setSelectedJobDetails(prev => ({
          ...prev,
          team_assignments: (prev.team_assignments || []).map(a =>
            a.team_member_id === editTeamMemberData.id
              ? { ...a, first_name: editTeamMemberData.first_name, last_name: editTeamMemberData.last_name }
              : a
          )
        }))
      }

      setSuccessMessage('Team member name updated successfully!')
      setTimeout(() => setSuccessMessage(''), 3000)
      setShowEditTeamMemberModal(false)

    } catch (error) {
      console.error('Error updating team member name:', error)
      setErrorMessage('Failed to update team member name')
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
      
      // Build update data from address components if available, otherwise use the text input
      const updateData = {}
      
      if (selectedAddressData && selectedAddressData.components) {
        const components = selectedAddressData.components
        const streetAddress = [components.streetNumber, components.route].filter(Boolean).join(' ') || selectedAddressData.formattedAddress
        
        updateData.service_address_street = streetAddress
        updateData.service_address_city = components.city || null
        updateData.service_address_state = components.state || null
        updateData.service_address_zip = components.zipCode || null
        updateData.customer_address = selectedAddressData.formattedAddress
        updateData.service_address = selectedAddressData.formattedAddress
      } else {
        // Fallback to plain text if no address data
        updateData.service_address = editFormData.service_address
        updateData.customer_address = editFormData.service_address
        updateData.service_address_street = editFormData.service_address
      }
      
      await jobsAPI.update(selectedJobDetails.id, updateData)
      
      // Reload job data from API to get the latest state
      const jobData = await jobsAPI.getById(selectedJobDetails.id)
      const normalizedJob = normalizeCustomerData(jobData)
      
      // Update selected job details with fresh data, preserving payment amounts
      setSelectedJobDetails(prev => ({
        ...normalizedJob,
        total_paid_amount: prev.total_paid_amount || normalizedJob.total_paid_amount || 0,
        invoice_paid_amount: prev.invoice_paid_amount || normalizedJob.invoice_paid_amount || 0
      }))
      
      // Update the job in the main jobs list
      setJobs(prevJobs => prevJobs.map(job => 
        job.id === selectedJobDetails.id ? normalizedJob : job
      ))
      
      // Update filtered jobs as well
      setFilteredJobs(prevFilteredJobs => prevFilteredJobs.map(job => 
        job.id === selectedJobDetails.id ? normalizedJob : job
      ))
      
      setSuccessMessage('Address updated successfully!')
      setTimeout(() => setSuccessMessage(''), 3000)
      setShowEditAddressModal(false)
      setSelectedAddressData(null)
      
    } catch (error) {
      console.error('Error updating address:', error)
      setErrorMessage('Failed to update address')
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
      
      // Invalidate cache since job was rescheduled
      invalidateJobsCache()
      
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

  const handleTerritoryChange = async (territoryId) => {
    if (!selectedJobDetails) return
    
    try {
      setIsUpdatingJob(true)
      setErrorMessage('')
      
      const updateData = {
        territoryId: territoryId
      }
      
      await jobsAPI.update(selectedJobDetails.id, updateData)
      
      // Update local state
      setSelectedJobDetails(prev => ({
        ...prev,
        territory_id: territoryId
      }))
      
      // Update the job in the main jobs list
      setJobs(prevJobs => prevJobs.map(job => 
        job.id === selectedJobDetails.id ? { 
          ...job, 
          territory_id: territoryId
        } : job
      ))
      
      // Update filtered jobs as well
      setFilteredJobs(prevFilteredJobs => prevFilteredJobs.map(job => 
        job.id === selectedJobDetails.id ? { 
          ...job, 
          territory_id: territoryId
        } : job
      ))
      
      setShowTerritoryDropdown(false)
      setSuccessMessage('Territory updated successfully!')
      setTimeout(() => setSuccessMessage(''), 3000)
      
    } catch (error) {
      console.error('Error updating territory:', error)
      setErrorMessage('Failed to update territory')
      setTimeout(() => setErrorMessage(''), 3000)
    } finally {
      setIsUpdatingJob(false)
    }
  }

  const handleSaveTerritoryChange = async () => {
    if (!selectedJobDetails) return
    
    const territoryId = selectedNewTerritory?.id || null
    
    try {
      setIsUpdatingJob(true)
      setErrorMessage('')
      
      const updateData = {
        territoryId: territoryId
      }
      
      await jobsAPI.update(selectedJobDetails.id, updateData)
      
      // Update local state
      setSelectedJobDetails(prev => ({
        ...prev,
        territory_id: territoryId
      }))
      
      // Update the job in the main jobs list
      setJobs(prevJobs => prevJobs.map(job => 
        job.id === selectedJobDetails.id ? { 
          ...job, 
          territory_id: territoryId
        } : job
      ))
      
      // Update filtered jobs as well
      setFilteredJobs(prevFilteredJobs => prevFilteredJobs.map(job => 
        job.id === selectedJobDetails.id ? { 
          ...job, 
          territory_id: territoryId
        } : job
      ))
      
      setShowTerritoryModal(false)
      setSelectedNewTerritory(null)
      setSuccessMessage('Territory updated successfully!')
      setTimeout(() => setSuccessMessage(''), 3000)
      
    } catch (error) {
      console.error('Error updating territory:', error)
      setErrorMessage('Failed to update territory')
      setTimeout(() => setErrorMessage(''), 3000)
    } finally {
      setIsUpdatingJob(false)
    }
  }

  const handleAssignTeamMember = async (teamMemberIds) => {
    if (!selectedJobDetails) return
    
    try {
      setIsUpdatingJob(true)
      setErrorMessage('')
      
      // teamMemberIds is now an array of selected member IDs
      const memberIdsArray = Array.isArray(teamMemberIds) ? teamMemberIds : (teamMemberIds ? [teamMemberIds] : [])
      
      // Convert all IDs to numbers for consistency
      const normalizedMemberIds = memberIdsArray.map(id => Number(id)).filter(id => id && !isNaN(id))
      
      // Get current assignments to remove if needed
      const currentAssignments = selectedJobDetails.team_assignments || []
      const currentMemberIds = new Set(
        currentAssignments.map(ta => Number(ta.team_member_id)).filter(id => id)
      )
      // Fallback to single assignment fields
      if (currentMemberIds.size === 0) {
        const singleId = selectedJobDetails.assigned_team_member_id || selectedJobDetails.team_member_id
        if (singleId) {
          currentMemberIds.add(Number(singleId))
        }
      }
      
      if (normalizedMemberIds.length > 0) {
        // Assign multiple members (or single member) - this replaces all existing assignments
        const primaryMemberId = normalizedMemberIds[0]
        await jobsAPI.assignMultipleTeamMembers(selectedJobDetails.id, normalizedMemberIds, primaryMemberId)
      } else {
        // If no members selected, remove all assignments one by one
        // The backend assign-multiple endpoint doesn't accept empty arrays
        const removePromises = Array.from(currentMemberIds).map(memberId => 
          jobsAPI.removeTeamMember(selectedJobDetails.id, memberId)
        )
        await Promise.all(removePromises)
      }
      
      // Reload job data from API to get the latest state
      const jobData = await jobsAPI.getById(selectedJobDetails.id)
      // Normalize customer data to ensure flat fields are preserved
      const normalizedJob = normalizeCustomerData(jobData)
      
      // Ensure team_assignments is properly structured
      if (!normalizedJob.team_assignments || !Array.isArray(normalizedJob.team_assignments)) {
        // If team_assignments is missing, try to construct it from other fields
        const assignments = []
        if (normalizedJob.assigned_team_member_id || normalizedJob.team_member_id) {
          const memberId = normalizedJob.assigned_team_member_id || normalizedJob.team_member_id
          assignments.push({
            team_member_id: Number(memberId),
            is_primary: true
          })
        }
        normalizedJob.team_assignments = assignments
      }
      
      // Update selected job details with fresh data, preserving payment amounts
      setSelectedJobDetails(prev => ({
        ...normalizedJob,
        total_paid_amount: prev.total_paid_amount || normalizedJob.total_paid_amount || 0,
        invoice_paid_amount: prev.invoice_paid_amount || normalizedJob.invoice_paid_amount || 0
      }))
      
      // Update the job in the main jobs list
      setJobs(prevJobs => prevJobs.map(job => 
        job.id === selectedJobDetails.id ? normalizedJob : job
      ))
      
      // Update filtered jobs as well
      setFilteredJobs(prevFilteredJobs => prevFilteredJobs.map(job => 
        job.id === selectedJobDetails.id ? normalizedJob : job
      ))
      
      const actionText = memberIdsArray.length === 0 
        ? 'All team members unassigned successfully!' 
        : memberIdsArray.length === 1 
        ? 'Team member assigned successfully!' 
        : `${memberIdsArray.length} team members assigned successfully!`
      
      setSuccessMessage(actionText)
      setTimeout(() => setSuccessMessage(''), 3000)
      setShowAssignModal(false)
      
    } catch (error) {
      console.error('Error assigning team member:', error)
      setErrorMessage('Failed to update team member assignments')
      setTimeout(() => setErrorMessage(''), 3000)
    } finally {
      setIsUpdatingJob(false)
    }
  }

  const handleSaveNotes = async () => {
    if (!selectedJobDetails || (!noteText.trim() && noteAttachments.length === 0)) return
    
    try {
      setIsUpdatingJob(true)
      setUploadingFiles(true)
      setErrorMessage('')
      
      // Upload attachments if any
      let attachmentUrls = []
      if (noteAttachments.length > 0) {
        try {
          const formData = new FormData()
          noteAttachments.forEach(attachment => {
            formData.append('attachments', attachment.file)
          })

          const apiUrl = process.env.REACT_APP_API_URL || 'https://service-flow-backend-production-4568.up.railway.app/api'
          const token = localStorage.getItem('authToken')
          
          const uploadResponse = await fetch(`${apiUrl}/jobs/${selectedJobDetails.id}/notes/attachments`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            },
            body: formData
          })

          if (uploadResponse.ok) {
            const uploadResult = await uploadResponse.json()
            attachmentUrls = uploadResult.files || []
          } else {
            console.error('File upload failed:', uploadResponse.status)
            throw new Error('Failed to upload attachments')
          }
        } catch (uploadError) {
          console.error('Error uploading attachments:', uploadError)
          setErrorMessage('Note saved but some attachments failed to upload')
          setTimeout(() => setErrorMessage(''), 5000)
        }
      }

      // Save note text
      const noteContent = noteText.trim()
      if (noteContent || attachmentUrls.length > 0) {
        // Include attachment URLs in the note if needed, or store separately
        const noteWithAttachments = noteContent + (attachmentUrls.length > 0 
          ? '\n\n[Attachments: ' + attachmentUrls.map(f => f.filename).join(', ') + ']'
          : '')
        
        const updateData = noteType === 'job' 
          ? { internalNotes: noteWithAttachments }
          : { notes: noteWithAttachments }
        
        await jobsAPI.update(selectedJobDetails.id, updateData)
        
        // Update local state
        setSelectedJobDetails(prev => ({
          ...prev,
          notes: noteType === 'customer' ? noteWithAttachments : prev.notes,
          internal_notes: noteType === 'job' ? noteWithAttachments : prev.internal_notes
        }))
        
        // Update the job in the main jobs list
        setJobs(prevJobs => prevJobs.map(job => 
          job.id === selectedJobDetails.id ? { 
            ...job, 
            notes: noteType === 'customer' ? noteWithAttachments : job.notes,
            internal_notes: noteType === 'job' ? noteWithAttachments : job.internal_notes
          } : job
        ))
        
        // Update filtered jobs as well
        setFilteredJobs(prevFilteredJobs => prevFilteredJobs.map(job => 
          job.id === selectedJobDetails.id ? { 
            ...job, 
            notes: noteType === 'customer' ? noteWithAttachments : job.notes,
            internal_notes: noteType === 'job' ? noteWithAttachments : job.internal_notes
          } : job
        ))
      }
      
      setSuccessMessage('Note saved successfully!')
      setTimeout(() => setSuccessMessage(''), 3000)
      setShowNotesModal(false)
      setNoteText('')
      setNoteType('job')
      // Clean up preview URLs
      noteAttachments.forEach(att => {
        if (att.preview) URL.revokeObjectURL(att.preview)
      })
      setNoteAttachments([])
      
    } catch (error) {
      console.error('Error saving note:', error)
      setErrorMessage('Failed to save note')
      setTimeout(() => setErrorMessage(''), 3000)
    } finally {
      setIsUpdatingJob(false)
      setUploadingFiles(false)
    }
  }

  const handleFileSelect = async (e, fileType) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const newAttachments = []
    for (const file of files) {
      // Create preview for images
      let preview = null
      if (file.type.startsWith('image/')) {
        preview = URL.createObjectURL(file)
      }

      newAttachments.push({
        file,
        preview,
        type: file.type
      })
    }

    setNoteAttachments(prev => [...prev, ...newAttachments])
    e.target.value = '' // Reset input
  }

  const handleRemoveAttachment = (index) => {
    setNoteAttachments(prev => {
      const updated = [...prev]
      // Revoke object URL if it's an image preview
      if (updated[index].preview) {
        URL.revokeObjectURL(updated[index].preview)
      }
      updated.splice(index, 1)
      return updated
    })
  }

  const handleOpenNotesModal = () => {
    // Clean up any existing preview URLs
    noteAttachments.forEach(att => {
      if (att.preview) URL.revokeObjectURL(att.preview)
    })
    setNoteText('')
    setNoteType('job')
    setNoteAttachments([])
    setShowNotesModal(true)
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
    // Sync availabilityMonth when in availability tab
    if (activeTab === 'availability' && (newDate.getMonth() !== availabilityMonth.getMonth() || newDate.getFullYear() !== availabilityMonth.getFullYear())) {
      setAvailabilityMonth(new Date(newDate.getFullYear(), newDate.getMonth(), 1))
    }
  }

  const getSummaryStats = () => {
    const totalJobs = filteredJobs.length
    const totalDuration = filteredJobs.reduce((sum, job) => {
      const duration = getJobDuration(job)
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


  const stats = getSummaryStats()

  // Mobile schedule view - Available for all users
  // Get jobs for the selected date - use dateUpdateKey to force recalculation
  const selectedDateJobs = useMemo(() => {
    if (!selectedDate) return []
    
    const selectedYear = selectedDate.getFullYear()
    const selectedMonth = selectedDate.getMonth()
    const selectedDay = selectedDate.getDate()
    const selectedDateString = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`
    
    const matchingJobs = filteredJobs.filter(job => {
      if (!job.scheduled_date) return false
      let jobDateString = ''
      if (job.scheduled_date.includes('T')) {
        jobDateString = job.scheduled_date.split('T')[0]
      } else if (job.scheduled_date.includes(' ')) {
        jobDateString = job.scheduled_date.split(' ')[0]
      } else {
        jobDateString = job.scheduled_date
      }
      return jobDateString === selectedDateString
    })
    
    // Debug logging for day view
    if (viewMode === 'day') {
      console.log(`📅 Day view - Selected date: ${selectedDateString}`)
      console.log(`📅 Day view - Total filteredJobs: ${filteredJobs.length}`)
      console.log(`📅 Day view - Matching jobs: ${matchingJobs.length}`)
      if (matchingJobs.length === 0 && filteredJobs.length > 0) {
        console.log(`📅 Day view - Sample job dates:`, filteredJobs.slice(0, 5).map(j => {
          const dateStr = j.scheduled_date?.includes('T') ? j.scheduled_date.split('T')[0] : 
                         j.scheduled_date?.includes(' ') ? j.scheduled_date.split(' ')[0] : 
                         j.scheduled_date
          return `${j.id}: ${dateStr}`
        }))
      }
    }
    
    return matchingJobs
  }, [selectedDate, filteredJobs, dateUpdateKey, viewMode])

  // Get job count for a specific date
  const getJobCountForDate = (date) => {
    const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    return filteredJobs.filter(job => {
      if (!job.scheduled_date) return false
      let jobDateString = ''
      if (job.scheduled_date.includes('T')) {
        jobDateString = job.scheduled_date.split('T')[0]
      } else if (job.scheduled_date.includes(' ')) {
        jobDateString = job.scheduled_date.split(' ')[0]
      } else {
        jobDateString = job.scheduled_date
      }
      return jobDateString === dateString
    }).length
  }

  // Recalculate week days when selectedDate changes - use dateUpdateKey to force recalculation
  const weekDays = useMemo(() => getWeekDays(), [selectedDate, dateUpdateKey])

  // Format date for mobile (shorter format)
  const formatDateMobile = (date) => {
    const day = date.toLocaleDateString('en-US', { weekday: 'short' })
    const month = date.toLocaleDateString('en-US', { month: 'short' })
    const dayNum = date.getDate()
    const suffix = dayNum === 1 || dayNum === 21 || dayNum === 31 ? 'st' :
                   dayNum === 2 || dayNum === 22 ? 'nd' :
                   dayNum === 3 || dayNum === 23 ? 'rd' : 'th'
    return `${day}, ${month} ${dayNum}${suffix}`
  }
  
  // Format date for empty state message
  const formatDateForMessage = (date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    })
  }

  // Combined view - Mobile and Desktop (shown/hidden via CSS classes)
  return (
      <>
        <style>{`
          .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
          .touch-manipulation {
            touch-action: manipulation;
          }
        `}</style>
        
        {/* Mobile view - shown on mobile, hidden on desktop */}
        <div className="lg:hidden min-h-screen bg-gray-50 pb-28 w-full max-w-full overflow-x-hidden">
        {/* Mobile Header */}
        <div className="fixed top-0 left-0 right-0 z-30 bg-white">
          <MobileHeader pageTitle="Schedule" />
        </div>
        
        {/* Mobile Header - Date Selector and Tabs */}
        <div className="lg:hidden bg-white border-b border-gray-200 fixed top-[73px] left-0 right-0 z-20">
          {/* Tabs - Jobs and Availability */}
          <div className="px-4 pt-3 pb-2">
            <div className="relative bg-gray-50 rounded-2xl p-1 inline-flex gap-1 w-full">
              <button
                type="button"
                onClick={() => setActiveTab('jobs')}
                className={`relative flex-1 px-2 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 whitespace-nowrap ${
                  activeTab === 'jobs'
                    ? 'text-blue-600 bg-white'
                    : 'text-gray-900'
                }`}
                style={{fontFamily: 'Montserrat', fontWeight: 600}}
              >
                Jobs
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('availability')}
                className={`relative flex-1 px-2 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 whitespace-nowrap ${
                  activeTab === 'availability'
                    ? 'text-blue-600 bg-white'
                    : 'text-gray-900'
                }`}
                style={{fontFamily: 'Montserrat', fontWeight: 600}}
              >
                Availability
              </button>
            </div>
          </div>
          
          {/* Date Selector - Only show for Jobs tab */}
          {activeTab === 'jobs' && (
            <div className="flex items-center justify-between px-4 pb-3">
            {/* Left spacer for centering */}
            <div className="w-10"></div>
            
            {/* Date Selector - Centered */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowCalendar(!showCalendar)
              }}
              className="flex items-center space-x-1 text-gray-900 font-bold text-base flex-1 justify-center min-w-0"
              style={{fontFamily: 'Montserrat', fontWeight: 700}}
            >
              <span className="truncate" key={`date-${selectedDate.getTime()}`}>{formatDateMobile(selectedDate)}</span>
              <ChevronDown className="w-4 h-4 flex-shrink-0" />
            </button>
            
            {/* Right spacer for centering */}
            <div className="w-10"></div>
          </div>
          )}
          
          {/* Availability Month Selector - Only show for Availability tab */}
          {activeTab === 'availability' && (
            <div className="flex items-center justify-between px-4 pb-3">
              <div className="flex items-center bg-gray-200 rounded-full px-3 py-1.5">
                <button
                  onClick={() => navigateAvailabilityMonth(-1)}
                  className="p-1 hover:bg-gray-300 rounded-full transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 text-gray-700" />
                </button>
                <span className="text-sm font-semibold text-gray-900 mx-3">
                  {availabilityMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
                <button
                  onClick={() => navigateAvailabilityMonth(1)}
                  className="p-1 hover:bg-gray-300 rounded-full transition-colors"
                >
                  <ChevronRight className="w-4 h-4 text-gray-700" />
                </button>
              </div>
            </div>
          )}
          
          {/* Calendar Popup */}
          {showCalendar && (
            <>
              {/* Backdrop */}
              <div 
                className="fixed inset-0 bg-black bg-opacity-20 z-40"
                onClick={(e) => {
                  // Only close if clicking directly on backdrop, not on calendar
                  if (e.target === e.currentTarget) {
                    setShowCalendar(false)
                  }
                }}
              />
              {/* Calendar */}
              <div 
                ref={calendarRef} 
                className="fixed top-[73px] left-1/2 transform -translate-x-1/2 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-4 w-[calc(100vw-2rem)] max-w-[320px]"
                onClick={(e) => e.stopPropagation()}
              >
              <div className="grid grid-cols-7 gap-1">
                <div className="col-span-7 flex items-center justify-between mb-2">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation()
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
                    onClick={(e) => {
                      e.stopPropagation()
                      const newDate = new Date(selectedDate)
                      newDate.setMonth(newDate.getMonth() + 1)
                      setSelectedDate(newDate)
                    }}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                  <div key={day} className="text-xs font-medium text-gray-500 text-center py-1">
                    {day}
                  </div>
                ))}
                {(() => {
                  const firstDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
                  const lastDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0)
                  const days = []
                  const startDate = new Date(firstDay)
                  startDate.setDate(startDate.getDate() - startDate.getDay())
                  
                  for (let i = 0; i < 42; i++) {
                    const date = new Date(startDate)
                    date.setDate(startDate.getDate() + i)
                    days.push(date)
                  }
                  return days.map((day, index) => {
                    // Normalize dates for comparison
                    const normalizedDay = new Date(day.getFullYear(), day.getMonth(), day.getDate())
                    normalizedDay.setHours(0, 0, 0, 0)
                    const normalizedSelected = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate())
                    normalizedSelected.setHours(0, 0, 0, 0)
                    const normalizedToday = new Date()
                    normalizedToday.setHours(0, 0, 0, 0)
                    
                    const isCurrentMonth = day.getMonth() === selectedDate.getMonth()
                    const isSelected = normalizedDay.getTime() === normalizedSelected.getTime()
                    const isToday = normalizedDay.getTime() === normalizedToday.getTime()
                    
                    return (
                      <button
                        key={index}
                        onClick={(e) => {
                          e.stopPropagation()
                          // Create a completely new date object
                          const year = day.getFullYear()
                          const month = day.getMonth()
                          const dateNum = day.getDate()
                          const newSelectedDate = new Date(year, month, dateNum, 0, 0, 0, 0)
                          
                          // Update selected date and force re-render with key
                          setSelectedDate(newSelectedDate)
                          setDateUpdateKey(prev => prev + 1)
                          
                          // Close calendar after state update
                          setTimeout(() => {
                            setShowCalendar(false)
                          }, 200)
                        }}
                        className={`text-xs p-2 rounded hover:bg-gray-100 transition-colors w-full ${
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
                  })
                })()}
              </div>
              </div>
            </>
          )}
        </div>

        {/* Horizontal Calendar Strip - Mobile Only */}
        <div 
          className="lg:hidden bg-white border-b border-gray-200 touch-manipulation fixed left-0 right-0 z-10" 
          key={`week-strip-${dateUpdateKey}`} 
          style={{ 
            top: activeTab === 'jobs' ? '145px' : '113px',
            WebkitOverflowScrolling: 'touch',
            overflowX: 'scroll',
            overflowY: 'hidden',
            scrollBehavior: 'smooth',
            width: '100%',
            maxWidth: '100vw',
            msOverflowStyle: 'none',
            scrollbarWidth: 'none'
          }}
        >
          <div 
            className="flex items-center space-x-4 mt-5 pl-4 pr-8 py-4" 
            style={{ 
              display: 'flex',
              width: 'max-content',
              flexShrink: 0
            }}
          >
            {weekDays.map((day, index) => {
              // Normalize dates for comparison
              const normalizedDay = new Date(day.getFullYear(), day.getMonth(), day.getDate())
              normalizedDay.setHours(0, 0, 0, 0)
              const normalizedSelected = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate())
              normalizedSelected.setHours(0, 0, 0, 0)
              const normalizedToday = new Date()
              normalizedToday.setHours(0, 0, 0, 0)
              
              const isSelected = normalizedDay.getTime() === normalizedSelected.getTime()
              const isToday = normalizedDay.getTime() === normalizedToday.getTime()
              const dayName = day.toLocaleDateString('en-US', { weekday: 'short' })
              const dayNum = day.getDate()
              const jobCount = getJobCountForDate(day)
              
              return (
                <button
                  key={index}
                  onClick={() => {
                    const year = day.getFullYear()
                    const month = day.getMonth()
                    const dateNum = day.getDate()
                    const newSelectedDate = new Date(year, month, dateNum, 0, 0, 0, 0)
                    
                    // Update selected date and force re-render
                    setSelectedDate(newSelectedDate)
                    setDateUpdateKey(prev => prev + 1)
                  }}
                  className="flex flex-col items-center space-y-1.5 flex-shrink-0 touch-manipulation"
                  style={{ minWidth: '60px', flexShrink: 0 }}
                >
                  <span className="text-xs sm:text-sm font-semibold text-gray-700 uppercase whitespace-nowrap">
                    {dayName}
                  </span>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 transition-colors ${
                    isSelected 
                      ? 'bg-blue-600 text-white' 
                      : isToday
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-900'
                  }`}>
                    {dayNum}
                  </div>
                  {jobCount > 0 && (
                    <span className="text-xs text-gray-600 font-medium">
                      {jobCount} job{jobCount !== 1 ? 's' : ''}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Jobs List */}
        <div className="px-3 sm:px-4 py-3 sm:py-4 space-y-3 pb-28 w-full max-w-full overflow-x-hidden" key={`jobs-${dateUpdateKey}`} style={{ paddingTop: activeTab === 'jobs' ? '220px' : '188px' }}>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : selectedDateJobs.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-16 px-4 min-h-[60vh]">
              <div className="relative w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                <Calendar className="w-8 h-8 text-gray-300" />
                <X className="w-6 h-6 text-white absolute" strokeWidth={3} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3" style={{fontFamily: 'Montserrat', fontWeight: 700}}>
                No Scheduled Jobs
              </h3>
              <p className="text-sm text-gray-600 text-center max-w-sm leading-relaxed" style={{fontFamily: 'Montserrat', fontWeight: 400}}>
                Looks like you don't have any assigned jobs on your schedule for {formatDateForMessage(selectedDate)}.
              </p>
            </div>
          ) : (
            selectedDateJobs.map((job) => {
              // Parse scheduled_date
              let jobDate
              if (typeof job.scheduled_date === 'string' && job.scheduled_date.includes(' ')) {
                const [datePart, timePart] = job.scheduled_date.split(' ')
                const [hours, minutes] = timePart.split(':').map(Number)
                jobDate = new Date(datePart)
                jobDate.setHours(hours || 0, minutes || 0, 0, 0)
              } else {
                jobDate = new Date(job.scheduled_date)
              }
              
              const timeString = jobDate.toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit',
                hour12: true 
              })
              
              // Duration is in minutes, ensure it's a number - check all possible duration fields
              const duration = getJobDuration(job);
              const endTime = new Date(jobDate.getTime() + duration * 60000);
              const endTimeString = endTime.toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit',
                hour12: true 
              });
              const durationFormatted = formatDuration(duration);
              
              const customerName = getCustomerName(job) || 'Customer'
              const serviceName = job.service_name || job.service_type || 'Service'
              
              // Build address parts
              const street = job.service_address_street || job.customer_address || ''
              const unit = job.service_address_unit || job.service_address_apt || ''
              const city = job.service_address_city || job.customer_city || ''
              const state = job.service_address_state || job.customer_state || ''
              const zip = job.service_address_zip || job.customer_zip_code || ''
              const country = job.service_address_country || 'USA'
              
              const cityStateZip = [city, state, zip].filter(Boolean).join(', ')
              const fullLocation = cityStateZip ? `${cityStateZip}, ${country}` : country

              return (
                <div
                  key={job.id}
                  onClick={() => navigate(`/job/${job.id}`)}
                  className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4 flex items-start space-x-2 sm:space-x-3 cursor-pointer active:bg-gray-50 hover:shadow-md transition-all touch-manipulation w-full max-w-full overflow-hidden"
                >
                  {/* Status Indicator Circle */}
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-blue-600 flex-shrink-0 mt-1.5 sm:mt-1" />
                  
                  <div className="flex-1 min-w-0 overflow-hidden">
                    {/* Time with Duration */}
                    <div className="text-[10px] sm:text-[11px] font-semibold text-gray-900 mb-1 truncate">
                      {timeString} - {endTimeString}{durationFormatted && ` ${durationFormatted}`}
                    </div>
                    
                    {/* Customer Name and Service */}
                    <div className="text-sm sm:text-base font-medium text-gray-900 mb-1.5">
                      <span className="break-words">{customerName}</span>
                      <span className="text-gray-600"> - </span>
                      <span className="break-words">{serviceName}</span>
                    </div>
                    
                    {/* Address */}
                    <div className="text-xs sm:text-sm text-gray-600 space-y-0.5">
                      {street && <div className="break-words">{street}</div>}
                      {unit && <div className="break-words">{unit}</div>}
                      {fullLocation && <div className="break-words">{fullLocation}</div>}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
        
        {/* Floating Action Button - Mobile Only */}
        {canCreateJobs(user) && (
          <button
            onClick={() => navigate('/createjob')}
            className="lg:hidden fixed bottom-20 right-4 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-700 transition-colors z-30"
            aria-label="Create Job"
          >
            <div className="relative">
              <Calendar className="w-6 h-6" />
              <Plus className="w-4 h-4 absolute -top-1 -right-1" strokeWidth={3} />
            </div>
          </button>
        )}
        
        {/* Bottom Navigation Bar - Mobile Only */}
        <MobileBottomNav teamMembers={teamMembers} />
        </div>
        
        {/* Desktop view - hidden on mobile, shown on desktop */}
        <div className="hidden lg:flex min-h-screen bg-gray-50">
      {/* Sidebar - Always Collapsed */}
     
      {/* Main Content */}
      <div className="flex-1 flex min-w-0 ">
        {/* Filter Sidebar - Hidden on mobile */}
        <div className="hidden lg:flex w-56 bg-white border-r border-gray-200 flex-shrink-0 flex-col h-screen">
          {/* Fixed Header */}
          <div className="p-4 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center justify-between">
              <h2 style={{fontFamily: 'Montserrat', fontWeight: 700}} className="text-2xl font-bold text-gray-900">Schedule</h2>
              {canCreateJobs(user) && (
              <button 
                onClick={() => navigate('/createjob')}
                className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 transition-colors"
                title="Create New Job"
              >
                <Plus className="w-4 h-4" />
              </button>
              )}
            </div>
          </div>
          <div className="p-1 border-b bg-gray-100 border-gray-200 flex-shrink-0 flex justify-center items-center">
            <div className="relative bg-gray-50 rounded-2xl p-1 inline-flex gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('jobs')}
                className={`relative px-2 py-1 rounded-xl text-xs font-medium transition-all duration-200 whitespace-nowrap ${
                  activeTab === 'jobs'
                    ? 'text-blue-600 bg-white'
                    : 'text-gray-900'
                }`}
              >
                Jobs
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('availability')}
                className={`relative px-2 py-1 rounded-xl text-xs font-medium transition-all duration-200 whitespace-nowrap ${
                  activeTab === 'availability'
                    ? 'text-blue-600 bg-white'
                    : 'text-gray-900'
                }`}
              >
                Availability
              </button>
            </div>
          </div>
          {/* Scrollable Filter Content */}
          <div className="flex-1 bg-gray-100 overflow-y-auto p-2 scrollbar-hide">
            
            {/* Assignment Filter - Different layout for availability vs jobs */}
            {!isWorker(user) && (
            <div className="mb-6">
              {/* Show "JOBS ASSIGNED TO" header for jobs tab, "TEAM MEMBERS" for availability tab */}
              {activeTab === 'jobs' && (
              <h3 className="text-xs font-semibold text-gray-700 mb-3 justify-self-center items-center">JOBS ASSIGNED TO</h3>
              )}
              {activeTab === 'availability' && (
              <h3 className="text-xs font-semibold text-gray-700 mb-3 justify-self-center items-center">TEAM MEMBERS</h3>
              )}
              
              {/* Show "All Team Members" button in availability tab */}
              {activeTab === 'availability' && (
                <button
                  onClick={() => {
                    setSelectedFilter('all-team-members')
                    setTerritoryFilter('all')
                  }}
                  className={`w-full flex items-center space-x-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors mb-2 ${
                    selectedFilter === 'all-team-members' 
                      ? 'bg-white text-blue-700' 
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                    selectedFilter === 'all-team-members' ? 'bg-blue-100' : 'bg-gray-100'
                  }`}>
                    <Users className={`w-3 h-3 ${selectedFilter === 'all-team-members' ? 'text-blue-600' : 'text-gray-600'}`} />
                  </div>
                  <span>All Team Members</span>
                </button>
              )}
              
              {/* Only show "All Jobs" and "Unassigned" when in jobs tab */}
              {activeTab === 'jobs' && (
                <>
              {/* All Jobs Filter */}
              <button
                onClick={() => {
                  setSelectedFilter('all')
                  setTerritoryFilter('all')
                }}
                className={`w-full flex items-center space-x-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors mb-2 ${
                  selectedFilter === 'all' 
                    ? 'bg-white text-blue-700' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center">
                  <Users className="w-3 h-3 text-blue-600" />
                </div>
                <span>All Jobs</span>
              </button>

              {/* Unassigned Filter */}
              <button
                onClick={() => {
                  setSelectedFilter('unassigned')
                  setTerritoryFilter('all')
                }}
                className={`w-full flex items-center space-x-1 px-2 py-1 rounded-lg text-sm font-medium transition-colors mb-2 ${
                  selectedFilter === 'unassigned' 
                   ? 'bg-white text-blue-700' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <div className="w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center">
                  <User className="w-3 h-3 text-gray-600" />
                </div>
                <span>Unassigned</span>
              </button>
                </>
              )}

              {/* Team Members - Show for both jobs and availability tabs (only active members) */}
              {teamMembers.filter(m => m.status === 'active').length === 0 ? (
                <div className="text-xs text-gray-500 text-center py-4">
                  No team members found
                </div>
              ) : (
                teamMembers.filter(m => m.status === 'active').map((member) => {
                const fullName = `${member.first_name || ''} ${member.last_name || ''}`.trim()
                const isEditing = editingMemberId === member.id
                // Use editingMemberName if we're editing this member, otherwise use fullName
                // Important: Allow empty string when editing (don't use || fallback)
                const displayName = isEditing 
                  ? (editingMemberName !== null && editingMemberName !== undefined ? editingMemberName : fullName)
                  : fullName
                
                return (
                  <div
                  key={member.id}
                    className={`w-full flex items-center space-x-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors mb-2 group ${
                    selectedFilter === member.id.toString() 
                      ? 'bg-white text-blue-700' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        if (!isEditing) {
                          setSelectedFilter(member.id.toString())
                          // Clear territory selection when team member is selected
                          setTerritoryFilter('all')
                        }
                      }}
                      className="flex items-center space-x-1 flex-1 min-w-0 cursor-pointer"
                      disabled={isEditing}
                      type="button"
                    >
                      <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-[8px] font-semibold">
                      {member.first_name?.charAt(0)}{member.last_name?.charAt(0)}
                    </span>
                  </div>
                      {isEditing ? (
                        <input
                          type="text"
                          value={displayName}
                          onChange={(e) => {
                            // Allow empty string - don't reset to fullName
                            setEditingMemberName(e.target.value)
                          }}
                          onBlur={async () => {
                            const trimmedName = displayName.trim()
                            if (trimmedName && trimmedName !== fullName) {
                              // Parse the name (assume first word is first name, rest is last name)
                              const nameParts = trimmedName.split(' ')
                              const newFirstName = nameParts[0] || ''
                              const newLastName = nameParts.slice(1).join(' ') || ''
                              
                              try {
                                await teamAPI.update(member.id, {
                                  first_name: newFirstName,
                                  last_name: newLastName
                                })
                                // Update local state
                                setTeamMembers(prev => prev.map(m => 
                                  m.id === member.id 
                                    ? { ...m, first_name: newFirstName, last_name: newLastName }
                                    : m
                                ))
                                setSuccessMessage('Team member name updated successfully')
                                setTimeout(() => setSuccessMessage(''), 3000)
                              } catch (error) {
                                console.error('Error updating team member name:', error)
                                setErrorMessage('Failed to update team member name')
                                setTimeout(() => setErrorMessage(''), 3000)
                              }
                            } else if (!trimmedName) {
                              // If name is empty, don't save - just cancel editing
                              setErrorMessage('Name cannot be empty')
                              setTimeout(() => setErrorMessage(''), 3000)
                            }
                            setEditingMemberId(null)
                            setEditingMemberName('')
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.target.blur()
                            } else if (e.key === 'Escape') {
                              setEditingMemberId(null)
                              setEditingMemberName('')
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                          className="flex-1 min-w-0 px-1 py-0.5 border border-blue-300 rounded text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                          autoFocus
                        />
                      ) : (
                        <span 
                          className="truncate flex-1 min-w-0" 
                          title={fullName}
                          onDoubleClick={(e) => {
                            e.stopPropagation()
                            setEditingMemberId(member.id)
                            setEditingMemberName(fullName)
                          }}
                        >
                          {fullName.length > 25 ? `${fullName.substring(0, 25)}...` : fullName}
                        </span>
                      )}
                </button>
                    {!isEditing && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingMemberId(member.id)
                          setEditingMemberName(fullName)
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 p-0.5 hover:bg-gray-200 rounded"
                        title="Edit name"
                      >
                        <Edit className="w-3 h-3 text-gray-500" />
                      </button>
                    )}
                  </div>
                )
              })
              )}
            </div>
            )}

            {/* Status Filter - Only show in jobs tab */}
            {activeTab === 'jobs' && (
            <div className="mb-6">
              <h3 className="text-xs font-semibold text-gray-700 mb-3 justify-self-center items-center">STATUS</h3>
              
              {/* All Statuses */}
              <button
                onClick={() => setStatusFilter('all')}
                className={`w-full flex items-center space-x-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors mb-2 ${
                  statusFilter === 'all' 
                    ? 'bg-white text-blue-700' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                  statusFilter === 'all' ? 'bg-blue-100' : 'bg-gray-100'
                }`}>
                  <Filter className={`w-3 h-3 ${statusFilter === 'all' ? 'text-blue-600' : 'text-gray-600'}`} />
                </div>
                <span>All Statuses</span>
              </button>

              {/* Confirmed */}
              <button
                onClick={() => setStatusFilter('confirmed')}
                className={`w-full flex items-center space-x-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors mb-2 ${
                  statusFilter === 'confirmed' 
                    ? 'bg-white text-blue-700' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-3 h-3 text-blue-600" />
                </div>
                <span>Confirmed</span>
              </button>

              {/* In Progress */}
              <button
                onClick={() => setStatusFilter('in_progress')}
                className={`w-full flex items-center space-x-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors mb-2 ${
                  statusFilter === 'in_progress' 
                    ? 'bg-white text-blue-700' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <div className="w-5 h-5 bg-orange-100 rounded-full flex items-center justify-center">
                  <Play className="w-3 h-3 text-orange-600" />
                </div>
                <span>In Progress</span>
              </button>

              {/* Completed */}
              <button
                onClick={() => setStatusFilter('completed')}
                className={`w-full flex items-center space-x-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors mb-2 ${
                  statusFilter === 'completed' 
                    ? 'bg-white text-blue-700' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-3 h-3 text-green-600" />
                </div>
                <span>Completed</span>
              </button>

              {/* Cancelled */}
              <button
                onClick={() => setStatusFilter('cancelled')}
                className={`w-full flex items-center space-x-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors mb-2 ${
                  statusFilter === 'cancelled' 
                   ? 'bg-white text-blue-700' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <div className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center">
                  <XCircle className="w-3 h-3 text-red-600" />
                </div>
                <span>Cancelled</span>
              </button>
            </div>
            )}

            {/* Recurring Filter - Only show in jobs tab */}
            {activeTab === 'jobs' && (
            <div className="mb-6">
              <h3 className="text-xs font-semibold text-gray-700 mb-3 justify-self-center items-center">RECURRING</h3>
              
              {/* All Jobs */}
              <button
                onClick={() => setRecurringFilter('all')}
                className={`w-full flex items-center space-x-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors mb-2 ${
                  recurringFilter === 'all' 
                    ? 'bg-white text-blue-700' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                  recurringFilter === 'all' ? 'bg-blue-100' : 'bg-gray-100'
                }`}>
                  <Calendar className={`w-3 h-3 ${recurringFilter === 'all' ? 'text-blue-600' : 'text-gray-600'}`} />
                </div>
                <span>All Jobs</span>
              </button>

              {/* Recurring Only */}
              <button
                onClick={() => setRecurringFilter('recurring')}
                className={`w-full flex items-center space-x-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors mb-2 ${
                  recurringFilter === 'recurring' 
                    ? 'bg-white text-blue-700' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                  recurringFilter === 'recurring' ? 'bg-blue-100' : 'bg-gray-100'
                }`}>
                  <RotateCw className={`w-3 h-3 ${recurringFilter === 'recurring' ? 'text-blue-600' : 'text-gray-600'}`} />
                </div>
                <span>Recurring Only</span>
              </button>

              {/* One-Time Only */}
              <button
                onClick={() => setRecurringFilter('one-time')}
                className={`w-full flex items-center space-x-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors mb-2 ${
                  recurringFilter === 'one-time' 
                    ? 'bg-white text-blue-700' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                  recurringFilter === 'one-time' ? 'bg-blue-100' : 'bg-gray-100'
                }`}>
                  <Calendar className={`w-3 h-3 ${recurringFilter === 'one-time' ? 'text-blue-600' : 'text-gray-600'}`} />
                </div>
                <span>One-Time Only</span>
              </button>
            </div>
            )}

            {/* Territory Filter */}
            <div className="mb-6">
              <h3 className="text-xs font-semibold text-gray-700 mb-3 justify-self-center items-center">TERRITORIES</h3>
              
              {/* All Territories */}
              <button
                onClick={() => {
                  setTerritoryFilter('all')
                }}
                className={`w-full flex items-center space-x-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors mb-2 ${
                  territoryFilter === 'all' 
                   ? 'bg-white text-blue-700' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                  territoryFilter === 'all' ? 'bg-blue-100' : 'bg-gray-100'
                }`}>
                  <MapPin className={`w-3 h-3 ${territoryFilter === 'all' ? 'text-blue-600' : 'text-gray-600'}`} />
                </div>
                <span>All Territories</span>
              </button>

              {/* Territory Options */}
              {territories.map((territory) => (
                <button
                  key={territory.id}
                  onClick={() => {
                    setTerritoryFilter(territory.id)
                    // Clear team member selection when territory is selected
                    if (activeTab === 'availability') {
                      setSelectedFilter('all-team-members')
                    } else {
                      setSelectedFilter('all')
                    }
                  }}
                  className={`w-full flex items-center space-x-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors mb-2 ${
                    territoryFilter === territory.id 
                      ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                    territoryFilter === territory.id ? 'bg-blue-100' : 'bg-gray-100'
                  }`}>
                    <MapPin className={`w-3 h-3 ${territoryFilter === territory.id ? 'text-blue-600' : 'text-gray-600'}`} />
                  </div>
                  <span className="truncate flex-1 min-w-0" title={territory.name}>
                    {territory.name.length > 25 ? `${territory.name.substring(0, 25)}...` : territory.name}
                  </span>
                </button>
              ))}
            </div>

            {/* Time Range Filter - Only show in jobs tab */}
            {activeTab === 'jobs' && (
            <div className="mb-6">
              <h3 className="text-xs font-semibold text-gray-700 mb-3 justify-self-center items-center">TIME RANGE</h3>
              
              {/* All Day */}
              <button
                onClick={() => setTimeRangeFilter('all')}
                className={`w-full flex items-center space-x-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors mb-2 ${
                  timeRangeFilter === 'all' 
                    ? 'bg-white text-blue-700' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                  timeRangeFilter === 'all' ? 'bg-blue-100' : 'bg-gray-100'
                }`}>
                  <Calendar className={`w-3 h-3 ${timeRangeFilter === 'all' ? 'text-blue-600' : 'text-gray-600'}`} />
                </div>
                <span>All Day</span>
              </button>

              {/* Morning */}
              <button
                onClick={() => setTimeRangeFilter('morning')}
                className={`w-full flex items-center space-x-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors mb-2 ${
                  timeRangeFilter === 'morning' 
                    ? 'bg-white text-blue-700' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                  timeRangeFilter === 'morning' ? 'bg-blue-100' : 'bg-gray-100'
                }`}>
                  <Clock className={`w-3 h-3 ${timeRangeFilter === 'morning' ? 'text-blue-600' : 'text-gray-600'}`} />
                </div>
                <span>Morning (Before 12 PM)</span>
              </button>

              {/* Afternoon */}
              <button
                onClick={() => setTimeRangeFilter('afternoon')}
                className={`w-full flex items-center space-x-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors mb-2 ${
                  timeRangeFilter === 'afternoon' 
                   ? 'bg-white text-blue-700' 
                     : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                  timeRangeFilter === 'afternoon' ? 'bg-blue-100' : 'bg-gray-100'
                }`}>
                  <Clock className={`w-3 h-3 ${timeRangeFilter === 'afternoon' ? 'text-blue-600' : 'text-gray-600'}`} />
                </div>
                <span>Afternoon (12 PM - 5 PM)</span>
              </button>

              {/* Evening */}
              <button
                onClick={() => setTimeRangeFilter('evening')}
                className={`w-full flex items-center space-x-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors mb-2 ${
                  timeRangeFilter === 'evening' 
                   ? 'bg-white text-blue-700' 
                     : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                  timeRangeFilter === 'evening' ? 'bg-blue-100' : 'bg-gray-100'
                }`}>
                  <Clock className={`w-3 h-3 ${timeRangeFilter === 'evening' ? 'text-blue-600' : 'text-gray-600'}`} />
                </div>
                <span>Evening (After 5 PM)</span>
              </button>
            </div>
            )}
          </div>
        </div>

        {/* Schedule Content */}
        <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto scrollbar-hide bg-gray-50">
          

        {/* Top Header Bar */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
          {activeTab === 'availability' ? (
            /* Availability View Header */
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
              {/* Left side - Date navigation */}
              <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                <div className="flex items-center space-x-2 relative bg-gray-100 rounded-full p-1">
                <button
                    onClick={() => navigateDate(-1)}
                    className=" hover:text-blue-600 rounded"
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>
                  <button 
                    onClick={() => setShowCalendar(!showCalendar)}
                    className="text-xs sm:text-sm font-medium hover:text-blue-600 text-gray-900 min-w-[120px] sm:min-w-[140px] text-center shadow-sm bg-white rounded-full px-3 py-2 transition-colors"
                  >
                    {formatDate(selectedDate)}
                  </button>
                  <button 
                    onClick={() => navigateDate(1)}
                    className=" hover:text-blue-600 rounded"
                  >
                    <ChevronRight className="w-6 h-6" />
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
                  onClick={() => {
                    setViewMode('day')
                    localStorage.setItem('scheduleViewMode', 'day')
                  }}
                  className={`px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium rounded-md transition-colors flex-1 sm:flex-none ${
                    viewMode === 'day' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Day
                </button>
                <button
                  onClick={() => {
                    setViewMode('week')
                    localStorage.setItem('scheduleViewMode', 'week')
                  }}
                  className={`px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium rounded-md transition-colors flex-1 sm:flex-none ${
                    viewMode === 'week' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Week
                </button>
                <button
                  onClick={() => {
                    setViewMode('month')
                    localStorage.setItem('scheduleViewMode', 'month')
                  }}
                  className={`px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium rounded-md transition-colors flex-1 sm:flex-none ${
                    viewMode === 'month' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Month
                </button>
              </div>

              {/* Right - Territory Name and Calendar Button */}
              <div className="flex items-center space-x-4">
              {getSelectedTerritoryName() && (
                <div className="flex items-center space-x-2 text-gray-700">
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm font-medium truncate max-w-[200px]" title={getSelectedTerritoryName()}>
                    {getSelectedTerritoryName().length > 20 ? `${getSelectedTerritoryName().substring(0, 20)}...` : getSelectedTerritoryName()} Hours
                  </span>
                </div>
              )}
                <button
                  onClick={() => setShowCalendar(!showCalendar)}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                  title="Open Calendar"
                >
                  <CalendarDays className="w-4 h-4" />
                  <span className="hidden sm:inline">Calendar</span>
                </button>
              </div>
            </div>
          ) : ( 
            /* Jobs View Header */
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
              {/* Left side - Date navigation */}
              <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                <div className="flex items-center space-x-2 relative bg-gray-100 rounded-full p-1">
                  <button 
                    onClick={() => navigateDate(-1)}
                    className=" hover:text-blue-600 rounded"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button 
                    onClick={() => setShowCalendar(!showCalendar)}
                    className="text-xs sm:text-sm font-medium hover:text-blue-600 text-gray-900 min-w-[120px] sm:min-w-[140px] text-center shadow-sm bg-white rounded-full px-3 py-2 transition-colors"
                  >
                    {formatDate(selectedDate)}
                  </button>
                <button 
                    onClick={() => navigateDate(1)}
                    className=" hover:text-blue-600 rounded"
                  >
                    <ChevronRight className="w-6 h-6" />
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
                  onClick={() => {
                    setViewMode('day')
                    localStorage.setItem('scheduleViewMode', 'day')
                  }}
                  className={`px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium rounded-md transition-colors flex-1 sm:flex-none ${
                    viewMode === 'day' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  
                >
                  Day
                </button>
                <button
                  onClick={() => {
                    setViewMode('week')
                    localStorage.setItem('scheduleViewMode', 'week')
                  }}
                  className={`px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium rounded-md transition-colors flex-1 sm:flex-none ${
                    viewMode === 'week' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Week
                </button>
                <button
                  onClick={() => {
                    setViewMode('month')
                    localStorage.setItem('scheduleViewMode', 'month')
                  }}
                  className={`px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium rounded-md transition-colors flex-1 sm:flex-none ${
                    viewMode === 'month' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Month
                </button>
              </div>

              {/* Right - Calendar Button */}
              <div className="flex items-center">
                <button
                  onClick={() => navigate('/calendar')}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                  title="Open Calendar"
                >
                  <CalendarDays className="w-4 h-4" />
                  <span className="hidden sm:inline">Calendar</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Filter Bar */}
        <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex flex-wrap gap-2">
            {/* Assignment Filter - Hidden for workers */}
            {!isWorker(user) && (
            <div className="flex items-center space-x-2">
              <span className="text-xs font-medium text-gray-600">ASSIGNED:</span>
              <select
                value={selectedFilter}
                onChange={(e) => {
                  setSelectedFilter(e.target.value)
                  // Clear territory selection when team member is selected
                  setTerritoryFilter('all')
                }}
                className="text-xs border border-gray-300 rounded px-2 py-1 bg-white"
              >
                <option value="all">All Jobs</option>
                <option value="unassigned">Unassigned</option>
                {teamMembers.filter(m => m.status === 'active').map((member) => {
                  const fullName = `${member.first_name || ''} ${member.last_name || ''}`.trim()
                  return (
                    <option key={member.id} value={member.id} title={fullName}>
                      {fullName.length > 30 ? `${fullName.substring(0, 30)}...` : fullName}
                  </option>
                  )
                })}
              </select>
            </div>
            )}

            {/* Status Filter - Only show in jobs tab */}
            {activeTab === 'jobs' && (
            <div className="flex items-center space-x-2">
              <span className="text-xs font-medium text-gray-600">STATUS:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs border border-gray-300 rounded px-2 py-1 bg-white"
              >
                <option value="all">All Statuses</option>
                <option value="scheduled">Scheduled</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            )}

            {/* Recurring Filter - Only show in jobs tab */}
            {activeTab === 'jobs' && (
            <div className="flex items-center space-x-2">
              <span className="text-xs font-medium text-gray-600">TYPE:</span>
              <select
                value={recurringFilter}
                onChange={(e) => setRecurringFilter(e.target.value)}
                className="text-xs border border-gray-300 rounded px-2 py-1 bg-white"
              >
                <option value="all">All Jobs</option>
                <option value="recurring">Recurring Only</option>
                <option value="one-time">One-Time Only</option>
              </select>
            </div>
            )}

            {/* Time Range Filter - Only show in jobs tab */}
            {activeTab === 'jobs' && (
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
            )}

            {/* Territory Filter */}
            <div className="flex items-center space-x-2">
              <span className="text-xs font-medium text-gray-600">AREA:</span>
              <select
                value={territoryFilter}
                onChange={(e) => {
                  setTerritoryFilter(e.target.value)
                  // Clear team member selection when territory is selected
                  if (activeTab === 'availability') {
                    setSelectedFilter('all-team-members')
                  } else {
                    setSelectedFilter('all')
                  }
                }}
                className="text-xs border border-gray-300 rounded px-2 py-1 bg-white"
              >
                <option value="all">All Areas</option>
                {territories.map((territory) => (
                  <option key={territory.id} value={territory.id} title={territory.name}>
                    {territory.name.length > 30 ? `${territory.name.substring(0, 30)}...` : territory.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex">
          {/* Availability View */}
          {activeTab === 'availability' ? (
            <div className="w-full h-full flex flex-col bg-gray-50">
              {/* All Team Members Table View - Show when "all" is selected */}
              {selectedFilter === 'all' && viewMode === 'week' && (
                <div className="flex-1 overflow-auto px-4 py-4 lg:px-6">
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[800px]">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider sticky left-0 bg-gray-50 z-10 border-r border-gray-200">
                              Team Member
                            </th>
                            {getWeekDays().map((date, idx) => {
                              const isToday = date.toDateString() === new Date().toDateString()
                              return (
                                <th key={idx} className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider min-w-[200px]">
                                  <div className={`${isToday ? 'text-blue-600 font-bold' : ''}`}>
                                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()]}
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
                          {teamMembers.filter(m => m.status === 'active').map((member) => {
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
                                {getWeekDays().map((date, dateIdx) => {
                                  const availability = getDayAvailabilityForMember(date, member.id)
                                  const dayJobs = jobs.filter(job => {
                                    if (!job.scheduled_date && !job.scheduledDate) return false
                                    let jobDate
                                    if (typeof job.scheduled_date === 'string' && job.scheduled_date.includes(' ')) {
                                      const [datePart] = job.scheduled_date.split(' ')
                                      jobDate = new Date(datePart)
                                    } else {
                                      jobDate = new Date(job.scheduled_date || job.scheduledDate)
                                    }
                                    const jobDateString = jobDate.toISOString().split('T')[0]
                                    const dateStr = date.toISOString().split('T')[0]
                                    if (jobDateString !== dateStr) return false
                                    return isJobAssignedTo(job, member.id.toString())
                                  })
                                  const isToday = date.toDateString() === new Date().toDateString()
                                  
                                  return (
                                    <td 
                                      key={dateIdx} 
                                      className={`px-4 py-4 align-top ${isToday ? 'bg-blue-50' : ''}`}
                                    >
                                      <div className="space-y-2">
                                        {/* Availability */}
                                        <div className={`p-2 rounded text-xs ${
                                          availability.isOpen
                                            ? 'bg-green-50 text-green-800 border border-green-200'
                                            : 'bg-gray-100 text-gray-600 border border-gray-200'
                                        }`}>
                                          <div className="font-medium mb-1">Availability</div>
                                          <div className="text-xs">{availability.hours || 'Closed'}</div>
                                        </div>
                                        
                                        {/* Jobs */}
                                        {dayJobs.length > 0 && (
                                          <div className="space-y-1">
                                            <div className="text-xs font-medium text-gray-700 mb-1">
                                              Jobs ({dayJobs.length})
                                            </div>
                                            {dayJobs.slice(0, 3).map((job) => {
                                              const isRecurring = job.is_recurring === true || job.is_recurring === 'true' || job.is_recurring === 1 || job.is_recurring === '1'
                                              
                                              return (
                                              <div
                                                key={job.id}
                                                onClick={() => {
                                                  setSelectedJobDetails(job)
                                                  setShowJobDetails(true)
                                                }}
                                                className="p-2 rounded text-xs bg-blue-50 text-blue-800 border border-blue-200 cursor-pointer hover:bg-blue-100 transition-colors relative"
                                                style={{ borderLeftColor: memberColor, borderLeftWidth: '3px' }}
                                              >
                                                {isRecurring && (
                                                  <span className="absolute bottom-1 right-1 inline-flex items-center justify-center w-3 h-3 rounded-full bg-blue-200 text-blue-800 text-[7px] font-bold flex-shrink-0 z-10" title="Recurring Job">
                                                    R
                                                  </span>
                                                )}
                                                <div className="font-medium truncate">{job.service_name || 'Service'}</div>
                                                {job.scheduled_date && (
                                                  <div className="text-xs opacity-75">
                                                    {new Date(job.scheduled_date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                                  </div>
                                                )}
                                                {job.customer_first_name && (
                                                  <div className="text-xs opacity-75 truncate">
                                                    {job.customer_first_name} {job.customer_last_name}
                                                  </div>
                                                )}
                                              </div>
                                              )
                                            })}
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
                </div>
              )}
              
              {/* Single Team Member View - Show when a specific member is selected */}
              {selectedFilter !== 'all' && (
              <>
              {/* Day View */}
              {viewMode === 'day' && (
                <div className="flex-1 overflow-auto px-4 py-4 lg:px-6">
                  <div className="bg-white rounded-lg border border-gray-200 shadow-sm h-full">
                    <div className="border-b border-gray-200 p-4">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                      </h3>
                    </div>
                    <div className="p-4">
                      {(() => {
                        const availability = getDayAvailability(selectedDate)
                        return (
                          <div className="space-y-4">
                            <div className={`p-4 rounded-lg border ${
                              availability.isOpen 
                                ? 'bg-green-50 border-green-200' 
                                : 'bg-gray-50 border-gray-200'
                            }`}>
                              <div className="flex items-center justify-between mb-2">
                                <span className={`text-sm font-semibold ${
                                  availability.isOpen ? 'text-green-700' : 'text-gray-700'
                                }`}>
                                  {availability.isOpen ? 'Open' : 'Closed'}
                                </span>
                                {availability.hasJobs && (
                                  <span className="text-xs font-medium text-orange-600">
                                    {availability.jobCount} job{availability.jobCount !== 1 ? 's' : ''}
                                  </span>
                                )}
                              </div>
                              {availability.isOpen && availability.hours && (
                                <div className="text-sm text-gray-700">
                                  <span className="font-medium">Hours: </span>
                                  {availability.hours}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                  </div>
                </div>
              )}

              {/* Week View */}
              {viewMode === 'week' && (
                <div className="flex-1 overflow-auto px-4 py-4 lg:px-6">
                  <div className="min-w-max w-full">
                    {/* Day Headers */}
                    <div className="grid grid-cols-7 gap-2 mb-2">
                      {getWeekDays().map((date, idx) => (
                        <div key={idx} className="p-2 text-center">
                          <div className="text-xs font-medium text-gray-500">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()]}
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
                      {getWeekDays().map((date, idx) => {
                        const availability = getDayAvailability(date)
                        const isToday = date.toDateString() === new Date().toDateString()
                        const isSelected = date.toDateString() === selectedDate.toDateString()
                        
                        return (
                          <div
                            key={idx}
                            className={`border rounded-lg p-3 min-h-[200px] cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500'
                                : isToday
                                  ? 'bg-white border-blue-500 ring-2 ring-blue-500'
                                  : 'bg-white border-gray-200'
                            }`}
                            onClick={() => handleDateChange(date)}
                          >
                            {availability.isOpen ? (
                              <div className="space-y-2">
                                <div className="text-xs font-medium text-green-600">Open</div>
                                {availability.hours && (
                                  <div className="text-xs text-gray-600">{availability.hours}</div>
                                )}
                                {availability.hasJobs && (
                                  <div className="text-xs font-medium text-orange-600 mt-1">
                                    {availability.jobCount} job{availability.jobCount !== 1 ? 's' : ''}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-center py-4">
                                <div className="text-xs text-gray-500 font-medium">Closed</div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Month View */}
              {viewMode === 'month' && (
                <div className="flex-1 overflow-auto">
                  <div className="grid grid-cols-7 divide-x divide-gray-200 h-full">
                    {/* Days of Week Header */}
                    {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((day) => (
                      <div key={day} className="text-center text-xs border-[0.5px] border-gray-200 font-medium text-gray-600 py-3">
                        {day}
                      </div>
                    ))}
                    
                    {/* Calendar Days */}
                    {generateAvailabilityCalendarDays(selectedDate).map((day, index) => {
                      const isCurrentMonth = day.getMonth() === selectedDate.getMonth()
                      const availability = getDayAvailability(day)
                      const isSelected = day.toDateString() === selectedDate.toDateString()
                      const isToday = day.toDateString() === new Date().toDateString()

                      return (
                        <div
                          key={index}
                          className={`border p-2 min-h-[120px] cursor-pointer transition-colors ${
                            !isCurrentMonth 
                              ? 'bg-gray-50 text-gray-400 border-gray-100' 
                              : isSelected 
                              ? 'border-blue-500 bg-blue-50' 
                                : isToday 
                                  ? 'border-blue-300 bg-blue-50/50' 
                              : availability.isOpen 
                                    ? 'border-gray-200 bg-white hover:bg-gray-50'
                                    : 'border-gray-200 bg-gray-50'
                          }`}
                          onClick={() => handleDateChange(day)}
                          style={!isCurrentMonth ? {} : !availability.isOpen && !isSelected ? {
                            backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(0,0,0,.05) 7px, rgba(0,0,0,.05) 9px)'
                          } : {}}
                        >
                          <div className={`text-sm font-semibold mb-1 ${
                            isSelected && isCurrentMonth ? 'text-blue-900' : ''
                          }`}>
                            {day.getDate()}
                          </div>
                          {isCurrentMonth && availability.isOpen ? (
                            <>
                              <div className="text-xs font-medium text-green-600 mb-1">Open</div>
                              {availability.hours && (
                              <div className="text-xs text-gray-600 mb-1">{availability.hours}</div>
                              )}
                              {availability.hasJobs && (
                                <div className="text-xs font-medium text-orange-600 mt-1">
                                  {availability.jobCount} job{availability.jobCount !== 1 ? 's' : ''}
                                </div>
                              )}
                            </>
                          ) : isCurrentMonth ? (
                            <div className="text-xs font-medium text-gray-500">Closed</div>
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
              </>
              )}
            </div>
          ) : (
            /* Left Panel - Job Details or Calendar View */
            <div className={`${viewMode === 'day' ? 'w-full lg:w-1/2' : 'w-full'} ${viewMode === 'day' ? 'flex flex-col h-[calc(100vh-200px)]' : 'space-y-6'} bg-gray-50`}>
            {/* Summary Statistics (only in day view) */}
            {viewMode === 'day' && (
              <div className="flex-shrink-0 py-4 px-6 bg-white border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-900">{stats.jobs}</div>
                    <div className="text-xs text-gray-600">On the schedule</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-900">{stats.duration}</div>
                    <div className="text-xs text-gray-600">Est. duration</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-900">{stats.earnings}</div>
                    <div className="text-xs text-gray-600">Est. earnings</div>
                  </div>
                </div>
              </div>
            )}

            {/* Calendar Grid Views */}
            {viewMode === 'week' && (
              <div className="h-[calc(100vh-200px)]">
               <div className="grid grid-cols-7 divide-x divide-gray-200 h-full">
                  {getWeekDays().map((day, index) => {
                    const dayJobs = filteredJobs.filter(job => {
                      if (!job.scheduled_date) return false
                      let jobDateString = ''
                      if (job.scheduled_date.includes('T')) {
                        jobDateString = job.scheduled_date.split('T')[0]
                      } else if (job.scheduled_date.includes(' ')) {
                        jobDateString = job.scheduled_date.split(' ')[0]
                      } else {
                        jobDateString = job.scheduled_date
                      }
                      const dayString = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`
                      return jobDateString === dayString
                    })
                    
                    const isToday = day.toDateString() === new Date().toDateString()
                    const isSelected = day.toDateString() === selectedDate.toDateString()
                    
                    return (
                      <div 
                        key={index} 
                        className={` min-h-[120px] cursor-pointer transition-colors ${
                          isSelected 
                            ? 'border-blue-500 bg-blue-50' 
                            : isToday 
                              ? 'border-blue-300 bg-blue-50/50' 
                              : 'border-gray-200 bg-white hover:bg-gray-50'
                        }`}
                        onClick={() => handleDayClick(day)}
                      >
                        <div className={`text-xs p-3 border-b border-gray-200 font-medium mb-2 uppercase text-center ${
                          isSelected ? 'text-blue-900 font-semibold' : 'text-gray-600'
                        }`}  style={{fontFamily: 'Montserrat', fontWeight: 700}}>
                          {day.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </div>
                        {dayJobs.map((job, jobIndex) => {
                          const statusDisplay = formatStatus(job.status, job)
                          // Parse scheduled_date correctly - it's stored as string "YYYY-MM-DD HH:MM:SS"
                          let jobTime;
                          if (typeof job.scheduled_date === 'string' && job.scheduled_date.includes(' ')) {
                            // Extract time directly from string to avoid timezone issues
                            const [datePart, timePart] = job.scheduled_date.split(' ');
                            const [hours, minutes] = timePart.split(':').map(Number);
                            jobTime = new Date(datePart);
                            jobTime.setHours(hours || 0, minutes || 0, 0, 0);
                          } else {
                            jobTime = new Date(job.scheduled_date);
                          }
                          
                          // Duration is in minutes, ensure it's a number - check all possible duration fields
                          const duration = getJobDuration(job);
                          
                          // Calculate end time
                          const endTime = new Date(jobTime.getTime() + duration * 60000);
                          
                          // Format times
                          const timeString = jobTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
                          const endTimeString = endTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
                          const durationFormatted = formatDuration(duration)
                          const assignedTeamMember = teamMembers.find(m => m.id === job.assigned_team_member_id || m.id === job.team_member_id)
                          const teamMemberName = assignedTeamMember ? (assignedTeamMember.name || `${assignedTeamMember.first_name || ''} ${assignedTeamMember.last_name || ''}`.trim()) : null
                          const customerName = getCustomerName(job) || 'Customer'
                          const territory = territories.find(t => t.id === job.territory_id)
                          const territoryName = territory?.name || null
                          
                          const isRecurring = job.is_recurring === true || job.is_recurring === 'true' || job.is_recurring === 1 || job.is_recurring === '1'
                          
                          return (
                            <div 
                              key={jobIndex} 
                              className="bg-white rounded-md m-2 p-2 mb-1 text-xs cursor-pointer hover:shadow-md transition-all border border-gray-200 relative"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleJobClick(job)
                              }}
                            >
                              {isRecurring && (
                                <span className="absolute bottom-1 right-1 inline-flex items-center justify-center w-3 h-3 rounded-full bg-blue-100 text-blue-700 text-[7px] font-bold flex-shrink-0 z-10" title="Recurring Job">
                                  R
                                </span>
                              )}
                              <div className="flex items-center justify-between mb-1">
                                <div className="font-medium text-gray-900 truncate text-[9px]" style={{ fontFamily: 'Montserrat', fontWeight: 500 }}>
                                  {timeString} - {endTimeString}{durationFormatted && ` ${durationFormatted}`}
                                </div>
                                {territoryName && (
                                  <span className="text-[10px] text-blue-600 font-medium truncate max-w-[60px]" style={{ fontFamily: 'Montserrat', fontWeight: 500 }}>
                                    {territoryName}
                                  </span>
                                )}
                              </div>
                              <div 
                                className="truncate font-medium cursor-pointer hover:text-blue-600 transition-colors text-gray-700 mb-1 inline-block"
                                onClick={(e) => handleCustomerClick(e, job.customer_id || job.customer?.id || job.customers?.id)}
                                style={{ fontFamily: 'Montserrat', fontWeight: 500, maxWidth: '100%' }}
                              >
                                {customerName}
                              </div>
                              <div className="flex items-center justify-between">
                                {(() => {
                                  // Get all assigned team members from team_assignments array
                                  const teamAssignments = job.team_assignments || [];
                                  let assignedTeamMembers = [];
                                  
                                  if (teamAssignments.length > 0) {
                                    // Use team_assignments array
                                    assignedTeamMembers = teamAssignments.map(assignment => {
                                      const member = teamMembers.find(m => m.id === assignment.team_member_id);
                                      return member || {
                                        id: assignment.team_member_id,
                                        first_name: assignment.first_name,
                                        last_name: assignment.last_name,
                                        profile_picture: null
                                      };
                                    });
                                  } else {
                                    // Fallback: use single team member (backward compatibility)
                                    const assignedTeamMember = teamMembers.find(m => m.id === job.assigned_team_member_id || m.id === job.team_member_id);
                                    if (assignedTeamMember) {
                                      assignedTeamMembers = [assignedTeamMember];
                                    }
                                  }
                                  
                                  if (assignedTeamMembers.length > 0) {
                                    return (
                                      <div className="flex items-center space-x-0.5">
                                        {assignedTeamMembers.slice(0, 3).map((member, idx) => {
                                          const memberName = member.name || `${member.first_name || ''} ${member.last_name || ''}`.trim() || 'Member';
                                          return (
                                            <div 
                                              key={member.id || idx}
                                              className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-[10px] font-medium flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity border border-white"
                                              style={{ marginLeft: idx > 0 ? '-4px' : '0' }}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleTeamMemberClick(e, member.id);
                                              }}
                                              title={memberName}
                                            >
                                              {member.profile_picture ? (
                                      <img 
                                                  src={getImageUrl(member.profile_picture)} 
                                                  alt={memberName}
                                        className="w-full h-full rounded-full object-cover"
                                      />
                                    ) : (
                                                getInitials(memberName)
                                    )}
                                  </div>
                                          );
                                        })}
                                        {assignedTeamMembers.length > 3 && (
                                          <div 
                                            className="w-5 h-5 rounded-full bg-gray-400 flex items-center justify-center text-white text-[8px] font-medium flex-shrink-0 border border-white"
                                            style={{ marginLeft: '-4px' }}
                                            title={`+${assignedTeamMembers.length - 3} more`}
                                          >
                                            +{assignedTeamMembers.length - 3}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  } else {
                                    return (
                                  <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 flex-shrink-0">
                                    <UserX className="w-3 h-3" />
                                  </div>
                                    );
                                  }
                                })()}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {viewMode === 'month' && (
              <div className=" ">
                <div className="grid grid-cols-7">
                  {/* Month header */}
                  {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
                    <div key={day} className="text-center text-xs border-[0.5px] border-gray-200 font-medium text-gray-600 py-3">
                      {day}
                    </div>
                  ))}
                  {/* Month days */}
                  {getMonthDays().map((day, index) => {
                    const dayJobs = filteredJobs.filter(job => {
                      if (!job.scheduled_date) return false
                      let jobDateString = ''
                      if (job.scheduled_date.includes('T')) {
                        jobDateString = job.scheduled_date.split('T')[0]
                      } else if (job.scheduled_date.includes(' ')) {
                        jobDateString = job.scheduled_date.split(' ')[0]
                      } else {
                        jobDateString = job.scheduled_date
                      }
                      const dayString = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`
                      return jobDateString === dayString
                    })
                    
                    const dayKey = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`
                    const isExpanded = expandedDays.has(dayKey)
                    const showJobs = isExpanded ? dayJobs : dayJobs.slice(0, 2)
                    const isToday = day.toDateString() === new Date().toDateString()
                    const isSelected = day.toDateString() === selectedDate.toDateString()
                    const isCurrentMonth = day.getMonth() === selectedDate.getMonth()
                    
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
                        onClick={() => handleDayClick(day)}
                      >
                        <div className={`text-md text-right right-3 font-medium mb-1 ${
                          isSelected && isCurrentMonth ? 'text-blue-900 font-semibold' : ''
                        }`}>{day.getDate()}</div>
                        {showJobs.map((job, jobIndex) => {
                          // Parse scheduled_date correctly - it's stored as string "YYYY-MM-DD HH:MM:SS"
                          let jobTime;
                          if (typeof job.scheduled_date === 'string' && job.scheduled_date.includes(' ')) {
                            // Extract time directly from string to avoid timezone issues
                            const [datePart, timePart] = job.scheduled_date.split(' ');
                            const [hours, minutes] = timePart.split(':').map(Number);
                            jobTime = new Date(datePart);
                            jobTime.setHours(hours || 0, minutes || 0, 0, 0);
                          } else {
                            jobTime = new Date(job.scheduled_date);
                          }
                          
                          // Duration is in minutes, ensure it's a number - check all possible duration fields
                          const duration = getJobDuration(job);
                          
                          // Calculate end time
                          const endTime = new Date(jobTime.getTime() + duration * 60000);
                          
                          // Format times
                          const timeString = jobTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
                          const endTimeString = endTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
                          const durationFormatted = formatDuration(duration)
                          
                          // Get all assigned team members from team_assignments array
                          const teamAssignments = job.team_assignments || [];
                          let assignedTeamMembers = [];
                          
                          if (teamAssignments.length > 0) {
                            // Use team_assignments array
                            assignedTeamMembers = teamAssignments.map(assignment => {
                              const member = teamMembers.find(m => m.id === assignment.team_member_id);
                              return member || {
                                id: assignment.team_member_id,
                                first_name: assignment.first_name,
                                last_name: assignment.last_name,
                                profile_picture: null
                              };
                            });
                          } else {
                            // Fallback: use single team member (backward compatibility)
                            const assignedTeamMember = teamMembers.find(m => m.id === job.assigned_team_member_id || m.id === job.team_member_id);
                            if (assignedTeamMember) {
                              assignedTeamMembers = [assignedTeamMember];
                            }
                          }
                          
                          const customerName = getCustomerName(job) || 'Customer'
                          const territory = territories.find(t => t.id === job.territory_id)
                          const territoryName = territory?.name || null
                          
                          const isRecurring = job.is_recurring === true || job.is_recurring === 'true' || job.is_recurring === 1 || job.is_recurring === '1'
                          
                          return (
                            <div 
                              key={jobIndex} 
                              className="bg-white rounded-md p-1.5 mb-1 text-xs cursor-pointer hover:shadow-md transition-all border border-gray-200 relative"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleJobClick(job)
                              }}
                            >
                              {isRecurring && (
                                <span className="absolute bottom-0.5 right-0.5 inline-flex items-center justify-center w-3 h-3 rounded-full bg-blue-100 text-blue-700 text-[7px] font-bold flex-shrink-0 z-10" title="Recurring Job">
                                  R
                                </span>
                              )}
                              <div className="flex items-center justify-between mb-0.5">
                                <div className="font-medium text-gray-900 truncate text-[9px]" style={{ fontFamily: 'Montserrat', fontWeight: 500 }}>
                                  {timeString} - {endTimeString}{durationFormatted && ` ${durationFormatted}`}
                                </div>
                                <div className="flex items-center space-x-0.5">
                                  {assignedTeamMembers.length > 0 ? (
                                    <>
                                      {assignedTeamMembers.slice(0, 3).map((member, idx) => {
                                        const memberName = member.name || `${member.first_name || ''} ${member.last_name || ''}`.trim() || 'Member';
                                        return (
                                    <div 
                                            key={member.id || idx}
                                            className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center text-white text-[8px] font-medium flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity border border-white"
                                            style={{ marginLeft: idx > 0 ? '-4px' : '0' }}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleTeamMemberClick(e, member.id);
                                            }}
                                            title={memberName}
                                          >
                                            {member.profile_picture ? (
                                        <img 
                                                src={getImageUrl(member.profile_picture)} 
                                                alt={memberName}
                                          className="w-full h-full rounded-full object-cover"
                                        />
                                      ) : (
                                              getInitials(memberName)
                                      )}
                                    </div>
                                        );
                                      })}
                                      {assignedTeamMembers.length > 3 && (
                                        <div 
                                          className="w-4 h-4 rounded-full bg-gray-400 flex items-center justify-center text-white text-[7px] font-medium flex-shrink-0 border border-white"
                                          style={{ marginLeft: '-4px' }}
                                          title={`+${assignedTeamMembers.length - 3} more`}
                                        >
                                          +{assignedTeamMembers.length - 3}
                                        </div>
                                      )}
                                    </>
                                  ) : (
                                    <div className="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 flex-shrink-0">
                                      <UserX className="w-2.5 h-2.5" />
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div 
                                className="truncate font-medium text-[10px] cursor-pointer hover:text-blue-600 transition-colors text-gray-700 inline-block"
                                onClick={(e) => handleCustomerClick(e, job.customer_id || job.customer?.id)}
                                style={{ fontFamily: 'Montserrat', fontWeight: 500, maxWidth: '100%' }}
                              >
                                {customerName}
                              </div>
                            </div>
                          )
                        })}
                        {dayJobs.length > 2 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleDayExpansion(dayKey)
                            }}
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

            {/* Scrollable Jobs Container (only in day view) */}
            {viewMode === 'day' && (
              <div className="flex-1 overflow-y-auto px-4 sm:px-6 pt-4">
            {/* Job Details Card (only in day view) */}
            {filteredJobs.map((job) => {
              // Format job data
              // Parse scheduled_date correctly - it's stored as string "YYYY-MM-DD HH:MM:SS"
              let jobDate;
              if (typeof job.scheduled_date === 'string' && job.scheduled_date.includes(' ')) {
                // Extract time directly from string to avoid timezone issues
                const [datePart, timePart] = job.scheduled_date.split(' ');
                const [hours, minutes] = timePart.split(':').map(Number);
                jobDate = new Date(datePart);
                jobDate.setHours(hours || 0, minutes || 0, 0, 0);
              } else {
                jobDate = new Date(job.scheduled_date);
              }
              
              const timeString = jobDate.toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit',
                hour12: true 
              })
              
              // Duration is in minutes, ensure it's a number - check all possible duration fields
              const duration = getJobDuration(job);
              const endTime = new Date(jobDate.getTime() + duration * 60000)
              const endTimeString = endTime.toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit',
                hour12: true 
              })
              const durationFormatted = formatDuration(duration)
              const serviceName = job.service_name || job.service_type || 'Service'
              const customerName = getCustomerName(job) || 'Customer'
              const customerEmail = job.customer_email || job.customer?.email || job.customers?.email || ''
              const customerPhone = job.customer_phone || job.customer?.phone || job.customers?.phone || ''
              const address = job.customer_address || job.address || job.service_address || 'Address not provided'
              // Get all assigned team members from team_assignments array
              const teamAssignments = job.team_assignments || [];
              let assignedTeamMembers = [];
              
              if (teamAssignments.length > 0) {
                // Use team_assignments array
                assignedTeamMembers = teamAssignments.map(assignment => {
                  const member = teamMembers.find(m => m.id === assignment.team_member_id);
                  return member || {
                    id: assignment.team_member_id,
                    first_name: assignment.first_name,
                    last_name: assignment.last_name,
                    profile_picture: null
                  };
                });
              } else {
                // Fallback: use single team member (backward compatibility)
                const assignedTeamMember = teamMembers.find(m => m.id === job.assigned_team_member_id || m.id === job.team_member_id);
                if (assignedTeamMember) {
                  assignedTeamMembers = [assignedTeamMember];
                }
              }
              
              const statusDisplay = formatStatus(job.status, job)
              const statusColor = getStatusColor(job.status, job)
              const territory = territories.find(t => t.id === job.territory_id)
              const territoryName = territory?.name || null
              
              return (
                <div key={job.id} className="bg-white rounded-lg border border-gray-200 p-2 sm:p-2 relative mb-4 last:mb-0 cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleJobClick(job)}>
                  <div className="absolute top-[-1px] sm:top-[-1px] right-2 sm:right-4">
                    <span className={`${statusColor} text-xs font-medium px-2 sm:px-3 py-1 rounded-b-lg border`}>
                      {statusDisplay}
                    </span>
                  </div>
                  
                  

                  <div className="space-x-1 space-y-0.5">
                  <div className="flex items-center gap-1 pl-1">
                    <h3 className="text-[10px] sm:text-[10px] font-semibold text-gray-500">JOB #{job.id}</h3>
                    {(job.is_recurring === true || job.is_recurring === 'true' || job.is_recurring === 1 || job.is_recurring === '1') && (
                      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-100 text-blue-700 text-[8px] font-bold" title="Recurring Job">
                        R
                      </span>
                    )}
                  </div>
                     
                    {/* Time and Duration */}
                    <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-3">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span className="text-[9px] sm:text-[9px] font-medium text-gray-900">
                          {timeString} - {endTimeString}{durationFormatted && ` ${durationFormatted}`}
                        </span>
                      </div>
                        <div className="flex items-center justify-between">
                      {/* Team Member Avatars - Multiple */}
                      {assignedTeamMembers.length > 0 ? (
                        <div className="flex items-center space-x-0.5">
                          {assignedTeamMembers.slice(0, 3).map((member, idx) => {
                            const memberName = member.name || `${member.first_name || ''} ${member.last_name || ''}`.trim() || 'Member';
                            return (
                              <div 
                                key={member.id || idx}
                                className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-medium flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity border border-white"
                                style={{ marginLeft: idx > 0 ? '-4px' : '0' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleTeamMemberClick(e, member.id);
                                }}
                                title={memberName}
                              >
                                {member.profile_picture ? (
                              <img 
                                    src={getImageUrl(member.profile_picture)} 
                                    alt={memberName}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                                  getInitials(memberName)
                            )}
                          </div>
                            );
                          })}
                          {assignedTeamMembers.length > 3 && (
                            <div 
                              className="w-5 h-5 rounded-full bg-gray-400 flex items-center justify-center text-white text-[8px] font-medium flex-shrink-0 border border-white"
                              style={{ marginLeft: '-4px' }}
                              title={`+${assignedTeamMembers.length - 3} more`}
                            >
                              +{assignedTeamMembers.length - 3}
                            </div>
                          )}
                        </div>
                      ) : (
                          <div className="flex items-center">
                          <div className="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 flex-shrink-0">
                            <UserX className="w-2.5 h-2.5" />
                          </div>
                        </div>
                      )}
                      </div>
                    </div>
                    <div 
                      className="text-xs sm:text-xs font-medium text-gray-700 cursor-pointer hover:text-blue-600 transition-colors inline-block"
                      onClick={(e) => handleCustomerClick(e, job.customer_id || job.customer?.id || job.customers?.id)}
                      style={{ maxWidth: '100%' }}
                    >
                      {customerName}
                    </div>
                    {/* Service Details */}
                    <div className="space-y-2">
                      <div className="text-xs sm:text-xs font-medium text-gray-600 text-capitalize">{serviceName}</div>
                      
                     

                      {/* Address */}
                      <div className="flex items-start space-x-1 text-xs sm:text-xs text-gray-500">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        <span className="break-words">{address}</span>
                      </div>

                      {/* Territory */}
                      <div className="flex items-center space-x-1 text-xs sm:text-xs">
                        {territoryName ? (
                          <span className="text-gray-700 font-medium truncate max-w-[150px]" title={territoryName}>
                            {territoryName.length > 20 ? `${territoryName.substring(0, 20)}...` : territoryName}
                          </span>
                        ) : (
                          <span className="text-gray-400">No territory</span>
                        )}
                      </div>

                      {/* Recurring Job Indicator */}
                      <RecurringIndicator
                        isRecurring={job.is_recurring}
                        frequency={job.recurring_frequency}
                        scheduledDate={job.scheduled_date}
                        size="sm"
                        showText={true}
                        className="pt-1"
                      />

                      {/* Notes (if available) */}
                      {job.notes && (
                        <div className="text-xs text-gray-500 italic pt-1 border-t border-gray-100">
                          {job.notes.substring(0, 100)}{job.notes.length > 100 ? '...' : ''}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Empty state when no jobs (only in day view) */}
            {filteredJobs.length === 0 && !isLoading && (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <NotepadText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-500 mb-2">No jobs scheduled</h3>
                  <p className="text-gray-400">No jobs are scheduled for this date.</p>
                </div>
              </div>
            )}
              </div>
            )}
            </div>
          )}

          {/* Right Panel - Map (only in day view) */}
          {activeTab === 'jobs' && viewMode === 'day' && (
            <div className="hidden lg:block w-1/2 bg-white border-l border-gray-200">
            

            {/* Map Container - Hidden on mobile */}
            <div className="hidden lg:block h-[calc(100vh-100px)] relative">
              {filteredJobs.length > 0 ? (
                <JobsMap 
                  jobs={filteredJobs} 
                  mapType={mapView === 'roadmap' ? 'roadmap' : 'satellite'} 
                />
              ) : (
                <div className="h-full flex items-center justify-center bg-gray-50">
                  <div className="text-center">
                    <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">No jobs to display on map</p>
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

      {/* Job Details Overlay */}
     
      {showJobDetailsOverlay && selectedJobDetails && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex justify-end"
          onClick={closeJobDetailsOverlay}
        >
          <div 
            className="bg-white w-full max-w-xl h-full overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-5 shadow-sm z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4 flex-1">
                 
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-gray-900 mb-1" style={{ fontFamily: 'Montserrat', fontWeight: 700 }}>
                      <span 
                        className="cursor-pointer hover:text-blue-600 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate(`/job/${selectedJobDetails.id}`)
                        }}
                      >
                        {selectedJobDetails.service_name || selectedJobDetails.service_type || 'Service'}
                      </span>
                      {' '}
                      <span className="font-normal text-gray-500" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>for</span>
                      {' '}
                      <span 
                        className="cursor-pointer hover:text-blue-600 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation()
                          const customerId = selectedJobDetails.customer_id || selectedJobDetails.customer?.id || selectedJobDetails.customers?.id
                          if (customerId) {
                            navigate(`/customer/${customerId}`)
                          }
                        }}
                      >
                        {getCustomerName(selectedJobDetails) || 'Customer'}
                      </span>
                    </h2>
                    <p className="text-sm text-gray-500" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>Job #{selectedJobDetails.id}</p>
                  </div>
                 
                </div>
              {/* Status Action Button with Dropdown - Only show if user has permission */}
              {canMarkJobStatus(user) && (
                <div className="flex items-center gap-3">
                  <div className="relative flex">
                    {(() => {
                      const currentStatus = (selectedJobDetails?.status || 'scheduled').toLowerCase().trim()
                      
                      // Normalize status: scheduled, en_route=confirmed, started=in-progress, complete=completed
                      const normalizedStatus = 
                        currentStatus === 'scheduled' ? 'scheduled' :
                        currentStatus === 'en_route' || currentStatus === 'enroute' ? 'confirmed' :
                        currentStatus === 'started' ? 'in-progress' :
                        currentStatus === 'complete' ? 'completed' :
                        currentStatus
                      
                      // Determine next status and button label based on normalized status
                      // Only show 3 options: En Route (confirmed), In Progress (in_progress), Complete (completed)
                      let nextStatus = null
                      let buttonLabel = 'Mark as En Route'
                      let buttonColor = 'bg-blue-600 hover:bg-blue-700'
                      let isDisabled = false
                      
                      // Status progression: scheduled → confirmed → in_progress → completed
                      if (normalizedStatus === 'scheduled') {
                        nextStatus = 'confirmed' // Maps to "confirmed" in backend (En Route)
                        buttonLabel = 'Mark as En Route'
                        buttonColor = 'bg-blue-600 hover:bg-blue-700'
                      } else if (normalizedStatus === 'confirmed' || normalizedStatus === 'en_route' || normalizedStatus === 'enroute') {
                        nextStatus = 'in_progress' // Maps to "in_progress" in backend (In Progress)
                        buttonLabel = 'Mark as In Progress'
                        buttonColor = 'bg-orange-600 hover:bg-orange-700'
                      } else if (normalizedStatus === 'in-progress' || normalizedStatus === 'in_progress' || normalizedStatus === 'in_prog' || normalizedStatus === 'started') {
                        nextStatus = 'completed' // Maps to "completed" in backend (Complete)
                        buttonLabel = 'Mark as Complete'
                        buttonColor = 'bg-green-600 hover:bg-green-700'
                      } else if (normalizedStatus === 'completed' || normalizedStatus === 'complete' || normalizedStatus === 'done' || normalizedStatus === 'finished') {
                        isDisabled = false
                        buttonLabel = 'Job Complete'
                        buttonColor = 'bg-green-600 hover:bg-green-700'
                      } else if (normalizedStatus === 'cancelled' || normalizedStatus === 'canceled') {
                        isDisabled = true
                        buttonLabel = 'Job Cancelled'
                        buttonColor = 'bg-gray-400 cursor-not-allowed'
                      }
                      
                      return (
                        <>
                          <button 
                            onClick={() => nextStatus && handleStatusChange(nextStatus)}
                            disabled={isDisabled || isUpdatingStatus}
                            className={`${buttonColor} text-white px-4 py-2 rounded-l-lg transition-colors font-medium text-sm flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            <span>{isUpdatingStatus ? 'Updating...' : buttonLabel}</span>
                          </button>
                          <button 
                            onClick={() => setShowStatusMenu(!showStatusMenu)}
                            disabled={isUpdatingStatus}
                            className={`${buttonColor} text-white px-3 py-2 rounded-r-lg border-l border-white/20 transition-colors disabled:opacity-50`}
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                        </>
                      )
                    })()}
                    
                    {showStatusMenu && (
                      <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                        <div className="py-2">
                          {[
                            { label: 'Mark as En Route', backendStatus: 'confirmed', color: 'bg-blue-500' },
                            { label: 'Mark as In Progress', backendStatus: 'in_progress', color: 'bg-orange-500' },
                            { label: 'Mark as Complete', backendStatus: 'completed', color: 'bg-green-500' }
                          ].map((statusOption) => {
                            const currentStatus = (selectedJobDetails?.status || 'scheduled').toLowerCase().trim()
                            // Normalize for comparison: scheduled, en_route=confirmed, started=in-progress, complete=completed
                            const normalizedCurrent = 
                              currentStatus === 'scheduled' ? 'confirmed' :
                              currentStatus === 'en_route' || currentStatus === 'enroute' ? 'confirmed' :
                              currentStatus === 'started' || currentStatus === 'in_progress' || currentStatus === 'in_prog' || currentStatus === 'in-progress' ? 'in_progress' :
                              currentStatus === 'complete' || currentStatus === 'completed' ? 'completed' :
                              currentStatus
                            const isCurrentStatus = normalizedCurrent === statusOption.backendStatus
                            
                            return (
                              <button
                                key={statusOption.backendStatus}
                                onClick={() => {
                                  handleStatusChange(statusOption.backendStatus)
                                  setShowStatusMenu(false)
                                }}
                                disabled={isUpdatingStatus}
                                className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors flex items-center gap-3 text-gray-800 font-medium text-sm disabled:opacity-50 ${
                                  isCurrentStatus ? 'bg-blue-50 text-blue-700' : ''
                                }`}
                              >
                                <div className={`w-3 h-3 rounded-full ${statusOption.color}`}></div>
                                <span>{statusOption.label}</span>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Status Progress Bar */}
            <div className=" py-3 border-b border-gray-200 bg-white">
              <div className="flex justify-between items-center w-full">
                {(() => {
                  const statuses = [
                    { key: 'scheduled', label: 'Scheduled' },
                    { key: 'en_route', label: 'En Route' },
                    { key: 'started', label: 'Started' },
                    { key: 'completed', label: 'Complete' },
                    { key: 'paid', label: 'Paid' }
                  ];

                  // Normalize status: scheduled, en_route=confirmed, started=in-progress, complete=completed
                  const normalizeStatus = (status) => {
                    if (!status) return 'scheduled'
                    const normalized = status.toLowerCase().trim()
                    
                    // Map to progress bar keys
                    if (normalized === 'scheduled') {
                      return 'scheduled'
                    }
                    if (normalized === 'confirmed' || normalized === 'enroute') {
                      return 'en_route'
                    }
                    if (normalized === 'in-progress' || normalized === 'in_progress' || normalized === 'in_prog' || normalized === 'started') {
                      return 'started'
                    }
                    if (normalized === 'completed' || normalized === 'complete' || normalized === 'done' || normalized === 'finished') {
                      return 'completed'
                    }
                    if (normalized === 'paid') {
                      return 'paid'
                    }
                    if (normalized === 'cancelled' || normalized === 'canceled') {
                      return 'cancelled'
                    }
                    return normalized
                  }

                  const statusMap = {
                    'scheduled': 0,
                    'en_route': 1,
                    'started': 2,
                    'completed': 3,
                    'paid': 4,
                    'cancelled': -1
                  };

                  const currentStatusNormalized = normalizeStatus(selectedJobDetails?.status || 'scheduled')
                  const currentIndex = statusMap[currentStatusNormalized] ?? 0;

                  // Map progress bar keys to backend status values
                  const mapProgressBarKeyToBackendStatus = (key) => {
                    const mapping = {
                      'scheduled': 'scheduled', // First stage
                      'en_route': 'confirmed', // Maps to started in backend
                      'started': 'in-progress', // Maps to complete in backend
                      'completed': 'completed',
                      'paid': 'paid'
                    }
                    return mapping[key] || key
                  }

                  // Map frontend status keys to backend status values for tooltip
                  const mapStatusKeyToBackendStatus = (key) => {
                    const mapping = {
                      'scheduled': 'scheduled',
                      'en_route': 'confirmed',
                      'started': 'in-progress',
                      'completed': 'completed',
                      'paid': 'paid'
                    };
                    return mapping[key] || key;
                  };

                  return statuses.map((status, index) => {
                    // For "Paid" status, check both invoice_status and payment_status
                    let isActive;
                    if (status.key === 'paid') {
                      // Paid status is active if invoice_status OR payment_status is 'paid'
                      isActive = selectedJobDetails?.invoice_status === 'paid' || 
                                 selectedJobDetails?.payment_status === 'paid';
                    } else {
                      // For other statuses, use the normal logic
                      isActive = index <= currentIndex;
                    }
                    
                    const isFirst = index === 0;
                    const isLast = index === statuses.length - 1;
                    const backendStatus = mapStatusKeyToBackendStatus(status.key);
                    // Only show tooltip for statuses that have been reached (passed or current)
                    const isReached = isActive;

                    return (
                      <StatusHistoryTooltip
                        key={status.key}
                        statusHistory={selectedJobDetails?.status_history}
                        status={backendStatus}
                        isReached={isReached}
                        jobCreatedAt={selectedJobDetails?.created_at}
                      >
                        <button
                        onClick={() => handleStatusChange(mapProgressBarKeyToBackendStatus(status.key))}
                        className={`
                            relative px-7 py-3  text-xs font-semibold transition-all whitespace-nowrap
                          ${isActive 
                            ? 'bg-green-500 text-white' 
                            : 'bg-gray-100 text-gray-700'}
                          ${isFirst ? 'rounded-l-md' : ''}
                          ${isLast ? 'rounded-r-md' : ''}
                          hover:opacity-90
                        `}
                        style={{ 
                          fontFamily: 'Montserrat', fontWeight: 600,
                          clipPath: !isFirst && !isLast
                            ? 'polygon(0% 0%, calc(100% - 15px) 0%, 100% 50%, calc(100% - 15px) 100%, 0% 100%, 15px 50%)'
                            : isFirst
                            ? 'polygon(0% 0%, calc(100% - 15px) 0%, 100% 50%, calc(100% - 15px) 100%, 0% 100%)'
                            : 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 15px 50%)',
                          marginLeft: !isFirst ? '-8px' : '0',
                          zIndex: isActive ? (index === currentIndex ? 10 : 5) : 1,
                          flex: 1,
                          minWidth: 0
                        }}
                      >
                        {status.label}
                      </button>
                      </StatusHistoryTooltip>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Content */}
            <div className="space-y-4" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
              {/* Map Section */}
              <div className="bg-white border-b border-gray-200">
                <div className="h-48 bg-gray-100 relative">
                  {selectedJobDetails.service_address_street || selectedJobDetails.customer_address ? (
                    <iframe
                      title="Job Location Map"
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      loading="lazy"
                      allowFullScreen
                      referrerPolicy="no-referrer-when-downgrade"
                      src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyC_CrJWTsTHOTBd7TSzTuXOfutywZ2AyOQ&q=${encodeURIComponent(
                        `${selectedJobDetails.service_address_street || selectedJobDetails.customer_address}, ${selectedJobDetails.service_address_city || selectedJobDetails.city || ''}`
                      )}&zoom=16&maptype=roadmap`}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">
                      <MapPin className="w-12 h-12" />
                    </div>
                  )}
                </div>
                <div className="px-6 py-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Montserrat', fontWeight: 700 }}>Job Location</span>
                    <button 
                      onClick={handleEditAddress}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                      style={{ fontFamily: 'Montserrat', fontWeight: 500 }}
                    >
                      Edit Address
                    </button>
                  </div>
                  <p className="font-medium text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 500 }}>
                    {selectedJobDetails.service_address_street || selectedJobDetails.customer_address || 'Address not provided'}
                  </p>
                  <p className="text-sm text-gray-600 mt-1" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
                    {selectedJobDetails.service_address_city || selectedJobDetails.city || ''}
                  </p>
                  <a 
                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                      `${selectedJobDetails.service_address_street || selectedJobDetails.customer_address}, ${selectedJobDetails.service_address_city || selectedJobDetails.city || ''}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-700 mt-2 inline-block"
                    style={{ fontFamily: 'Montserrat', fontWeight: 400 }}
                  >
                    View directions →
                  </a>
                </div>
              </div>

              {/* Date & Time */}
              <div className="bg-white border-b border-gray-200">
                <div className="px-6 py-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Montserrat', fontWeight: 700 }}>Date & Time</span>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={handleCancelJob}
                        className="text-sm text-red-600 hover:text-red-700 font-medium"
                        style={{ fontFamily: 'Montserrat', fontWeight: 500 }}
                      >
                        Cancel
                      </button>
                      {/* Reschedule button - only show if user has permission */}
                      {canRescheduleJobs(user) && (
                        <button 
                          onClick={handleReschedule}
                          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                          style={{ fontFamily: 'Montserrat', fontWeight: 500 }}
                        >
                          Reschedule
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-gray-900 mb-1">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <p className="font-semibold" style={{ fontFamily: 'Montserrat', fontWeight: 600 }}>
                      {(() => {
                        // Parse scheduled_date correctly - it's stored as string "YYYY-MM-DD HH:MM:SS"
                        let jobDate;
                        if (typeof selectedJobDetails.scheduled_date === 'string' && selectedJobDetails.scheduled_date.includes(' ')) {
                          // Extract time directly from string to avoid timezone issues
                          const [datePart, timePart] = selectedJobDetails.scheduled_date.split(' ');
                          const [hours, minutes] = timePart.split(':').map(Number);
                          jobDate = new Date(datePart);
                          jobDate.setHours(hours || 0, minutes || 0, 0, 0);
                        } else if (typeof selectedJobDetails.scheduled_date === 'string' && selectedJobDetails.scheduled_date.includes('T')) {
                          // Handle ISO format
                          const [datePart, timePart] = selectedJobDetails.scheduled_date.split('T');
                          const [hours, minutes] = timePart.split(':').map(Number);
                          jobDate = new Date(datePart);
                          jobDate.setHours(hours || 0, minutes || 0, 0, 0);
                        } else {
                          jobDate = new Date(selectedJobDetails.scheduled_date);
                        }
                        
                        const startTimeString = jobDate.toLocaleTimeString('en-US', { 
                        hour: 'numeric', 
                        minute: '2-digit',
                        hour12: true 
                        });
                        
                        // Duration is in minutes, ensure it's a number - check all possible duration fields
                        const duration = getJobDuration(selectedJobDetails);
                        const endTime = new Date(jobDate.getTime() + duration * 60000);
                        const endTimeString = endTime.toLocaleTimeString('en-US', { 
                        hour: 'numeric', 
                        minute: '2-digit',
                        hour12: true 
                        });
                        // Don't show duration here - it has its own section
                        return `${startTimeString} - ${endTimeString}`;
                      })()}
                    </p>
                  </div>
                  <p className="text-sm text-gray-600" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
                    {new Date(selectedJobDetails.scheduled_date).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })}
                  </p>
                </div>
              </div>

              {/* Job Details */}
              <div className="bg-white ">
                <div className="px-6 py-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Montserrat', fontWeight: 700 }}>Job Details</span>
                    {/* Edit Service button - only show if user has permission */}
                    {canEditJobDetails(user) && (
                      <button 
                        onClick={() => navigate(`/job/${selectedJobDetails.id}`)}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                        style={{ fontFamily: 'Montserrat', fontWeight: 500 }}
                      >
                        Edit Service
                      </button>
                    )}
                  </div>
                  <p className="font-semibold text-gray-900 text-base mb-2" style={{ fontFamily: 'Montserrat', fontWeight: 600 }}>
                    {selectedJobDetails.service_name || selectedJobDetails.service_type || 'Service'}
                  </p>
                  
                  {/* Service modifiers/items if available */}
                  {(() => {
                    // Parse modifiers
                    let parsedModifiers = [];
                    if (selectedJobDetails.service_modifiers) {
                      try {
                        if (typeof selectedJobDetails.service_modifiers === 'string') {
                          parsedModifiers = JSON.parse(selectedJobDetails.service_modifiers);
                        } else if (Array.isArray(selectedJobDetails.service_modifiers)) {
                          parsedModifiers = selectedJobDetails.service_modifiers;
                        }
                      } catch (e) {
                        console.error('Error parsing modifiers:', e);
                      }
                    }

                    if (parsedModifiers.length > 0) {
                      return (
                        <div className="mb-3">
                          <p className="text-sm font-bold text-gray-900 mb-2" style={{ fontFamily: 'Montserrat', fontWeight: 700 }}>Select Your Items</p>
                          {parsedModifiers.map((modifier, idx) => {
                            // Get modifier title/name
                            const modifierName = modifier.title || modifier.name;
                            
                            // Get selected option
                            let selectedOption = null;
                            if (modifier.options && modifier.selected) {
                              selectedOption = modifier.options.find(opt => opt.id === modifier.selected || String(opt.id) === String(modifier.selected));
                            }
                            
                            return (
                              <div key={idx} className="text-sm text-gray-600 mb-1" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
                                {selectedOption ? `${selectedOption.label || selectedOption.name || selectedOption.text}` : modifierName}
                              </div>
                            );
                          })}
                        </div>
                      );
                    }
                    return null;
                  })()}
                  
                  <p className="text-sm text-gray-600" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
                    {(() => {
                      const duration = getJobDuration(selectedJobDetails);
                      if (!duration) return '';
                      const hours = Math.floor(duration / 60);
                      const minutes = duration % 60;
                      if (hours > 0 && minutes > 0) {
                        return `${hours} hour${hours > 1 ? 's' : ''} ${minutes} minute${minutes > 1 ? 's' : ''}`;
                      } else if (hours > 0) {
                        return `${hours} hour${hours > 1 ? 's' : ''}`;
                      } else {
                        return `${minutes} minute${minutes > 1 ? 's' : ''}`;
                      }
                    })()}
                  </p>
                </div>
              </div>

              {/* Invoice - only show if user has permission to view/edit job price */}
              {canViewEditJobPrice(user) && (
                <div className="bg-white border rounded-lg border-gray-200">
                  {/* Invoice Header */}
                  <div className="px-6 py-5 border-b border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                      <span className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 700 }}>Invoice</span>
                        <div className="relative">
                          <span className="px-2.5 py-0.5 text-xs font-semibold rounded-md bg-gray-100 text-gray-700 flex items-center gap-1" style={{ fontFamily: 'Montserrat', fontWeight: 600 }}>
                        {selectedJobDetails.invoice_status === 'paid' ? 'Paid' : 
                         selectedJobDetails.invoice_status === 'sent' ? 'Sent' : 
                         selectedJobDetails.invoice_status === 'draft' ? 'Draft' : 
                         'Draft'}
                            <ChevronDown className="w-3 h-3" />
                      </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {invoiceExpanded && canProcessPayments(user) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                              setPaymentFormData({
                                amount: calculateTotalPrice().toString(),
                                paymentMethod: 'cash',
                                paymentDate: new Date().toISOString().split('T')[0],
                                notes: ''
                              })
                              setShowAddPaymentModal(true)
                            }}
                            className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md flex items-center gap-1 transition-colors"
                            style={{ fontFamily: 'Montserrat', fontWeight: 500 }}
                          >
                            Add Payment
                            <ChevronDown className="w-4 h-4" />
                          </button>
                        )}
                        {invoiceExpanded && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setShowSendInvoiceModal(true)
                              }}
                              className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                            >
                              <Mail className="w-4 h-4 text-gray-600" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handlePrintInvoice()
                              }}
                              className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                            >
                              <Printer className="w-4 h-4 text-gray-600" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                // TODO: Add menu functionality
                              }}
                              className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                            >
                              <MoreVertical className="w-4 h-4 text-gray-600" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setInvoiceExpanded(!invoiceExpanded)
                        }}
                        className="text-gray-500 hover:text-gray-700 transition-colors"
                      >
                          {invoiceExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                        <ChevronRight className="w-4 h-4" />
                          )}
                      </button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 mb-4" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
                      Due {selectedJobDetails.invoice_due_date 
                        ? new Date(selectedJobDetails.invoice_due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : new Date(new Date().getTime() + 15 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                    
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-lg font-bold text-gray-900 mb-1" style={{ fontFamily: 'Montserrat', fontWeight: 700 }}>
                          ${(selectedJobDetails.invoice_paid_amount || selectedJobDetails.amount_paid || 0).toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>Amount paid</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900 mb-1" style={{ fontFamily: 'Montserrat', fontWeight: 700 }}>
                          ${((selectedJobDetails.total || selectedJobDetails.price || selectedJobDetails.service_price || 0) - (selectedJobDetails.invoice_paid_amount || selectedJobDetails.amount_paid || 0)).toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>Amount due</p>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Invoice Details */}
                  {invoiceExpanded && (
                    <div className="px-6 py-5 space-y-6">
                      {/* Service Details */}
                      <div>
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <p className="text-sm font-bold text-gray-900 mb-1" style={{ fontFamily: 'Montserrat', fontWeight: 700 }}>
                              {selectedJobDetails.service_name || selectedJobDetails.service_type || 'Service'}
                            </p>
                            <p className="text-xs text-gray-600" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
                              Base Price (${(selectedJobDetails.service_price || selectedJobDetails.price || selectedJobDetails.total || 0).toFixed(2)})
                            </p>
                </div>
                          <span className="text-sm font-bold text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 700 }}>
                            ${(selectedJobDetails.service_price || selectedJobDetails.price || selectedJobDetails.total || 0).toFixed(2)}
                          </span>
                        </div>
                        {canEditJobDetails(user) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setShowEditServiceModal(true)
                            }}
                            className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 mt-2"
                            style={{ fontFamily: 'Montserrat', fontWeight: 500 }}
                          >
                            <Edit className="w-3 h-3" />
                            <span>Edit Service & Pricing</span>
                          </button>
                        )}
                      </div>

                      {/* Financial Breakdown */}
                      <div className="space-y-2 pt-4 border-t border-gray-200">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>Subtotal</span>
                          <span className="text-sm font-medium text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 500 }}>
                            ${(selectedJobDetails.service_price || selectedJobDetails.price || selectedJobDetails.total || 0).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                          <span className="text-sm font-medium text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 500 }}>Total</span>
                          <span className="text-sm font-medium text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 500 }}>
                            ${(selectedJobDetails.service_price || selectedJobDetails.price || selectedJobDetails.total || 0).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center pt-2">
                          <span className="text-sm text-gray-600" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>Amount paid</span>
                          <span className="text-sm font-medium text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 500 }}>
                            ${(selectedJobDetails.invoice_paid_amount || selectedJobDetails.amount_paid || 0).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                          <span className="text-sm font-bold text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 700 }}>Total due</span>
                          <span className="text-sm font-bold text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 700 }}>
                            ${((selectedJobDetails.total || selectedJobDetails.price || selectedJobDetails.service_price || 0) - (selectedJobDetails.invoice_paid_amount || selectedJobDetails.amount_paid || 0)).toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Payments Section */}
                      {canProcessPayments(user) && (
                        <div className="pt-4 border-t border-gray-200">
                          <h3 className="text-sm font-semibold text-gray-900 mb-4" style={{ fontFamily: 'Montserrat', fontWeight: 600 }}>Payments</h3>
                          {paymentHistory && paymentHistory.length > 0 ? (
                            <div className="space-y-3">
                              {paymentHistory.map((payment, index) => (
                                <div key={payment.id || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 600 }}>
                                        ${parseFloat(payment.amount || 0).toFixed(2)}
                                      </span>
                                      <span className="text-xs text-gray-500 capitalize" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
                                        {payment.payment_method || 'cash'}
                                      </span>
                                    </div>
                                    <div className="text-xs text-gray-500" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
                                      {payment.created_at ? new Date(payment.created_at).toLocaleDateString('en-US', { 
                                        month: 'short', 
                                        day: 'numeric', 
                                        year: 'numeric',
                                        hour: 'numeric',
                                        minute: '2-digit'
                                      }) : 'Date not available'}
                                    </div>
                                    {payment.notes && (
                                      <div className="text-xs text-gray-600 mt-1" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
                                        {payment.notes}
                                      </div>
                                    )}
                                  </div>
                                  <div className="text-xs text-green-600 font-semibold" style={{ fontFamily: 'Montserrat', fontWeight: 600 }}>
                                    Completed
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-8">
                              <div className="w-12 h-12 rounded-full border-2 border-gray-300 flex items-center justify-center mx-auto mb-3">
                                <CreditCard className="w-6 h-6 text-gray-400" />
                              </div>
                              <p className="text-sm font-bold text-gray-900 mb-1" style={{ fontFamily: 'Montserrat', fontWeight: 700 }}>No payments</p>
                              <p className="text-xs text-gray-500" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
                                When you process or record a payment for this invoice, it will appear here.
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Customer */}
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="px-6 py-5 border-b border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-bold text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 700 }}>Customer</span>
                    {/* Edit customer button - only show if user has permission */}
                    {canEditJobDetails(user) && (
                      <button 
                        onClick={handleEditCustomer}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                        style={{ fontFamily: 'Montserrat', fontWeight: 500 }}
                      >
                        Edit
                      </button>
                    )}
                  </div>
                  <div className="flex flex-col items-start gap-4">
                    <div className="flex items-center gap-4">
                    <div 
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 shadow-sm"
                      style={{ 
                        backgroundColor: '#84CC16' // Lime green color as shown in screenshot
                      }}
                    >
                      {(() => {
                        const firstName = selectedJobDetails.customer_first_name || selectedJobDetails.customers?.first_name || ''
                        const lastName = selectedJobDetails.customer_last_name || selectedJobDetails.customers?.last_name || ''
                        const initials = `${firstName[0] || 'A'}${lastName[0] || 'A'}`.toUpperCase()
                        return initials
                      })()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p 
                        className="font-bold text-gray-900 text-base cursor-pointer hover:text-blue-600 transition-colors" 
                        style={{ fontFamily: 'Montserrat', fontWeight: 700 }}
                        onClick={(e) => {
                          e.stopPropagation()
                          const customerId = selectedJobDetails.customer_id || selectedJobDetails.customer?.id || selectedJobDetails.customers?.id
                          if (customerId) {
                            navigate(`/customer/${customerId}`)
                          }
                        }}
                      >
                        {getCustomerName(selectedJobDetails) || 'Customer'}
                      </p>
                      </div>
                    </div>
                      {/* Customer contact info - only show if user has permission */}
                      {canViewCustomerContact(user) && (
                        <div className="space-y-2">
                          {(selectedJobDetails.customer_phone || selectedJobDetails.customers?.phone) && (
                            <div className="flex items-center gap-2 text-sm text-gray-700">
                              <Phone className="w-4 h-4 text-gray-500 flex-shrink-0" />
                              <span style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
                                {formatPhoneNumber(selectedJobDetails.customer_phone || selectedJobDetails.customers?.phone || '')}
                              </span>
                            </div>
                          )}
                          {(selectedJobDetails.customer_email || selectedJobDetails.customers?.email) && (
                            <div className="flex items-center gap-2 text-sm text-gray-700">
                              <Mail className="w-4 h-4 text-gray-500 flex-shrink-0" />
                              <span className="truncate" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
                                {selectedJobDetails.customer_email || selectedJobDetails.customers?.email}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                      {!canViewCustomerContact(user) && (
                        <p className="text-xs text-gray-500 italic mt-2" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
                          Contact information not available
                        </p>
                      )}
                    </div>
                  </div>
              {/* Billing Address */}
              <div className="bg-white border-b border-gray-200">
                <div className="px-6 py-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-900 uppercase tracking-wider" style={{ fontFamily: 'Montserrat', fontWeight: 700 }}>BILLING ADDRESS</span>
                    {canEditJobDetails(user) && (
                      <button 
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors" 
                        style={{ fontFamily: 'Montserrat', fontWeight: 500 }}
                      >
                        Edit
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-gray-700" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>Same as service address</p>
                </div>
              </div>

              {/* Expected Payment Method */}
              <div className=" ">
                <div className="px-6 py-5">
                  <span className="text-xs font-bold text-gray-900 uppercase tracking-wider block mb-3" style={{ fontFamily: 'Montserrat', fontWeight: 700 }}>EXPECTED PAYMENT METHOD</span>
                  <div className="flex items-center gap-2 mb-3">
                    <CreditCard className="w-5 h-5 text-gray-400 flex-shrink-0" strokeWidth={1.5} />
                    <p className="text-sm text-gray-700" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>No payment method on file</p>
                  </div>
                  {canEditJobDetails(user) && (
                    <button 
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors" 
                      style={{ fontFamily: 'Montserrat', fontWeight: 500 }}
                    >
                      Add a card to charge later
                    </button>
                  )}
                </div>
                </div>
              </div>

           

              {/* Team */}
              <div className="bg-white border border-gray-200 rounded-lg">
                <div className="">
                  <div className="border-b border-gray-200 p-4">
                  {/* Territory */}
                  <div className=" flex items-center justify-between mb-3 ">
                    <p className="text-xs font-bold text-gray-900 uppercase tracking-wider" style={{ fontFamily: 'Montserrat', fontWeight: 700 }}>Team</p>
                      {(() => {
                        // Try to find territory by territory_id first
                        let currentTerritory = selectedJobDetails.territory_id 
                          ? territories.find(t => t.id === selectedJobDetails.territory_id)
                          : null
                        
                        // If no territory_id, try to match by service_region_custom_service_region
                        if (!currentTerritory && selectedJobDetails.service_region_custom_service_region) {
                          const locationName = selectedJobDetails.service_region_custom_service_region
                          // Try to match by territory name or location field
                          currentTerritory = territories.find(t => 
                            t.name === locationName || 
                            t.location === locationName ||
                            (t.location && t.location.includes(locationName)) ||
                            (locationName && t.name && t.name.toLowerCase().includes(locationName.toLowerCase()))
                          )
                        }
                        
                        const territoryName = currentTerritory ? currentTerritory.name : 'Unassigned'
                        const territoryId = currentTerritory ? currentTerritory.id : null
                        
                        return (
                            <button
                              type="button"
                          onClick={() => {
                            // Initialize with current territory
                            setSelectedNewTerritory(currentTerritory || null)
                            setShowTerritoryModal(true)
                          }}
                          className=" flex items-center gap-2  p-1 bg-gray-50 border border-gray-300 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
                        >
                          <MapPin className="w-3 h-3 text-gray-600 flex-shrink-0" />
                          <span className="text-xs text-gray-600 flex-shrink-0" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>Territory</span>
                          <span className="text-xs font-bold text-gray-900 flex-1 text-left truncate min-w-0" style={{ fontFamily: 'Montserrat', fontWeight: 700 }} title={territoryName}>
                                  {territoryName.length > 20 ? `${territoryName.substring(0, 20)}...` : territoryName}
                                </span>
                          <ChevronDown className="w-3 h-3 text-gray-600 flex-shrink-0" />
                            </button>
                        )
                      })()}
                  </div>
                  
                  {/* Job Requirements */}
                  <div className=" ">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-gray-900 uppercase tracking-wider" style={{ fontFamily: 'Montserrat', fontWeight: 700 }}>JOB REQUIREMENTS</span>
                      <button className="text-sm text-blue-600 hover:text-blue-700 font-medium" style={{ fontFamily: 'Montserrat', fontWeight: 500 }}>
                        Edit
                      </button>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>Workers needed</span>
                        <span className="text-sm font-medium text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 500 }}>
                          {selectedJobDetails.workers_needed || 1} service provider
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>Skills needed</span>
                        <span className="text-sm font-medium text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 500 }}>
                          {(() => {
                            const skills = selectedJobDetails.skills || selectedJobDetails.skills_required
                            if (skills) {
                              if (typeof skills === 'string') {
                                try {
                                  const parsed = JSON.parse(skills)
                                  if (Array.isArray(parsed) && parsed.length > 0) {
                                    return parsed.join(', ')
                                  }
                                } catch (e) {
                                  return skills
                                }
                              } else if (Array.isArray(skills) && skills.length > 0) {
                                return skills.join(', ')
                              }
                            }
                            return 'No skill tags required'
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>
                  </div>
                  {/* Assigned */}
                  <div className=" p-5 border-b border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-gray-900 uppercase tracking-wider" style={{ fontFamily: 'Montserrat', fontWeight: 700 }}>ASSIGNED</span>
                      <button 
                        onClick={handleOpenAssignModal}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                        style={{ fontFamily: 'Montserrat', fontWeight: 500 }}
                      >
                        Assign
                      </button>
                    </div>
                    {(() => {
                      // Get all team members from team_assignments array
                      const teamAssignments = selectedJobDetails.team_assignments || [];
                      let assignedTeamMembers = [];
                      
                      if (teamAssignments.length > 0) {
                        // Use team_assignments array
                        assignedTeamMembers = teamAssignments.map(assignment => {
                          const member = teamMembers.find(m => m.id === assignment.team_member_id);
                          return {
                            ...assignment,
                            member: member || {
                              id: assignment.team_member_id,
                              first_name: assignment.first_name,
                              last_name: assignment.last_name,
                              email: assignment.email,
                              profile_picture: null,
                              color: '#2563EB'
                            }
                          };
                        });
                      } else {
                        // Fallback: use single team member (backward compatibility)
                        const assignedMemberId = selectedJobDetails.assigned_team_member_id || selectedJobDetails.team_member_id;
                        const assignedMember = assignedMemberId ? teamMembers.find(m => m.id === assignedMemberId) : null;
                        if (assignedMember) {
                          assignedTeamMembers = [{
                            team_member_id: assignedMember.id,
                            is_primary: true,
                            member: assignedMember
                          }];
                        }
                      }
                      
                      if (assignedTeamMembers.length > 0) {
                        return (
                          <div className="space-y-3">
                            {assignedTeamMembers.map((assignment, index) => {
                              const member = assignment.member;
                              const memberName = `${member.first_name || ''} ${member.last_name || ''}`.trim() || 'Unknown Member';
                              
                              return (
                                <div key={assignment.team_member_id || index} className="flex items-center gap-3">
                                  <div className="relative">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0"
                                      style={{ backgroundColor: member.color || '#2563EB' }}
                          >
                                      {member.profile_picture ? (
                              <img 
                                          src={getImageUrl(member.profile_picture)} 
                                          alt={memberName}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                                        getInitials(memberName || member.email || 'AA')
                                      )}
                                    </div>
                                    {assignment.is_primary && (
                                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center border-2 border-white">
                                        <Star className="w-2 h-2 text-white" fill="white" />
                                      </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                                    <div className="flex items-center space-x-2">
                                      <button
                                        onClick={() => {
                                          const nameParts = memberName.split(' ')
                                          setEditTeamMemberData({
                                            id: member.id,
                                            first_name: nameParts[0] || '',
                                            last_name: nameParts.slice(1).join(' ') || ''
                                          })
                                          setShowEditTeamMemberModal(true)
                                        }}
                                        className="flex items-center gap-1 font-medium text-gray-900 text-sm truncate hover:text-blue-600 cursor-pointer transition-colors group/edit"
                                        style={{ fontFamily: 'Montserrat', fontWeight: 500 }}
                                        title={`Click to edit ${memberName}`}
                                      >
                                        <Edit className="w-3 h-3 text-gray-400 group-hover/edit:text-blue-600 flex-shrink-0" />
                                        {memberName}
                                      </button>
                                      {assignment.is_primary && (
                                        <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                                          Primary
                                        </span>
                                      )}
                                    </div>
                                    {member.email && (
                                      <p className="text-xs text-gray-500 truncate" style={{ fontFamily: 'Montserrat', fontWeight: 400 }} title={member.email}>
                                        {member.email}
                              </p>
                            )}
                          </div>
                        </div>
                              );
                            })}
                          </div>
                        );
                      } else {
                        return (
                        <div className="text-center py-2">
                          <UserX className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                          <p className="text-sm font-medium text-gray-700 mb-1" style={{ fontFamily: 'Montserrat', fontWeight: 500 }}>Unassigned</p>
                          <p className="text-xs text-gray-500" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
                            No service providers are assigned to this job
                          </p>
                        </div>
                        );
                      }
                    })()}
                  </div>
                  
                  {/* Offer job to service providers */}
                  <div className="p-4">
                    <div className="flex items-start justify-between ">
                      <div className="flex-1">
                        <p className="text-sm font-bold text-gray-900 mb-1" style={{ fontFamily: 'Montserrat', fontWeight: 700 }}>
                          Offer job to service providers
                        </p>
                        <p className="text-xs text-gray-500 mb-2" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
                          Allows qualified, available providers to see and claim this job.
                        </p>
                        <button className="text-xs text-blue-600 hover:text-blue-700 font-medium" style={{ fontFamily: 'Montserrat', fontWeight: 500 }}>
                          Learn more
                        </button>
                      </div>
                      <div className="ml-4 flex-shrink-0">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedJobDetails.offer_to_providers || false}
                            onChange={(e) => {
                              // Handle toggle - you can add API call here
                              setSelectedJobDetails(prev => ({
                                ...prev,
                                offer_to_providers: e.target.checked
                              }))
                            }}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes & Files */}
              <div className="bg-white border rounded-lg border-gray-200">
                <div className="px-6 py-4">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-3" style={{ fontFamily: 'Montserrat', fontWeight: 700 }}>Notes & Files</span>
                  {selectedJobDetails.notes || selectedJobDetails.internal_notes ? (
                    <div className="space-y-4">
                      {selectedJobDetails.internal_notes && (
                        <div>
                          <p className="text-xs font-semibold text-gray-700 mb-2" style={{ fontFamily: 'Montserrat', fontWeight: 600 }}>Internal Notes</p>
                          <p className="text-sm text-gray-600 whitespace-pre-wrap" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
                            {selectedJobDetails.internal_notes}
                          </p>
                        </div>
                      )}
                      {/* Customer notes - only show if user has permission */}
                      {canViewCustomerNotes(user) && selectedJobDetails.notes && (
                        <div>
                          <p className="text-xs font-semibold text-gray-700 mb-2" style={{ fontFamily: 'Montserrat', fontWeight: 600 }}>Customer Notes</p>
                          <p className="text-sm text-gray-600 whitespace-pre-wrap" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
                            {selectedJobDetails.notes}
                          </p>
                        </div>
                      )}
                      <button 
                        onClick={handleOpenNotesModal}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium" 
                        style={{ fontFamily: 'Montserrat', fontWeight: 500 }}
                      >
                        Edit Notes
                      </button>
                    </div>
                  ) : (
                  <div className="text-center py-2">
                    <NotepadText className="w-8 h-8 text-gray-300 mx-auto mb-1" />
                    <p className="text-sm text-gray-600 mb-1" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>No internal job or customer notes</p>
                    <p className="text-xs text-gray-500 mb-4" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>Notes and attachments are only visible to employees with appropriate permissions.</p>
                      <button 
                        onClick={handleOpenNotesModal}
                        className="text-xs text-blue-600 border hover:border-blue-700 rounded-md px-3 py-1 hover:text-blue-700 font-medium" 
                        style={{ fontFamily: 'Montserrat', fontWeight: 500 }}
                      >
                        + Add Note
                      </button>
                  </div>
                  )}
                </div>
              </div>

              {/* Customer Notifications */}
              <div className="bg-white border rounded-lg border-gray-200">
                <div className="px-6 py-4">
                  <span className="text-smd font-medium text-gray-500 tracking-wider block mb-4" style={{ fontFamily: 'Montserrat' }}>Customer notifications</span>
                  
                  {/* Notification Preferences */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Montserrat', fontWeight: 700 }}>Notification Preferences</span>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={emailNotifications} 
                            onChange={(e) => {
                              if (selectedJobDetails?.customer_id) {
                                handleNotificationToggle('email', e.target.checked)
                              }
                            }}
                            className="sr-only peer" 
                          />
                          <div className={`w-10 h-6 rounded-full peer peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all ${emailNotifications ? 'bg-blue-600 after:right-[2px]' : 'bg-gray-200 after:left-[2px]'}`}></div>
                        </label>
                        <span className="text-sm text-gray-700" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>Emails</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={smsNotifications}
                            onChange={(e) => {
                              if (selectedJobDetails?.customer_id) {
                                handleNotificationToggle('sms', e.target.checked)
                              }
                            }}
                            className="sr-only peer" 
                          />
                          <div className={`w-10 h-6 rounded-full peer peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all ${smsNotifications ? 'bg-blue-600 after:right-[2px]' : 'bg-gray-200 after:left-[2px]'}`}></div>
                        </label>
                        <span className="text-sm text-gray-700" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>Text messages</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Confirmation */}
                  <div className="mb-4 pt-4 border-t border-gray-200">
                    <div className="flex items-start space-x-3 items-center">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <Mail className="w-5 h-5 text-blue-600" />
                    </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>Confirmation</span>
                    </div>
                        <p className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 600 }}>Appointment Confirmation</p>
                        <p className="text-xs text-gray-500" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
                          {selectedJobDetails.confirmation_sent && selectedJobDetails.confirmation_sent_at
                            ? `${getTimeAgo(selectedJobDetails.confirmation_sent_at)} • Email Sent`
                            : selectedJobDetails.confirmation_failed
                              ? `Failed to send: ${selectedJobDetails.confirmation_error || 'Unknown error'}`
                              : !emailNotifications && !smsNotifications
                                ? "Notifications are disabled for this customer"
                                : "Not sent yet"}
                        </p>
                      </div>
                      <div className="relative" ref={confirmationMenuRef}>
                        <button
                          onClick={() => setOpenNotificationMenu(openNotificationMenu === 'confirmation' ? null : 'confirmation')}
                          className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                        >
                          <MoreVertical className="w-4 h-4 text-blue-600" />
                        </button>
                        {openNotificationMenu === 'confirmation' && (
                          <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[180px] z-50">
                            <button
                              onClick={() => {
                                setViewingMessageType('confirmation')
                                setShowMessageViewer(true)
                                setOpenNotificationMenu(null)
                              }}
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                              View Message
                            </button>
                            <button
                              onClick={() => {
                                setNotificationType('confirmation')
                                const hasEmail = selectedJobDetails.customer_email && selectedJobDetails.customer_email.trim() !== ''
                                if (hasEmail && emailNotifications) {
                                  setSelectedNotificationMethod('email')
                                  setNotificationEmail(selectedJobDetails.customer_email || '')
                                } else if (smsNotifications) {
                                  setSelectedNotificationMethod('sms')
                                  setNotificationPhone(selectedJobDetails.customer_phone || '')
                                } else if (emailNotifications) {
                                  setSelectedNotificationMethod('email')
                                  setNotificationEmail(selectedJobDetails.customer_email || '')
                                }
                                setShowNotificationModal(true)
                                setOpenNotificationMenu(null)
                              }}
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                              disabled={!emailNotifications && !smsNotifications}
                            >
                              <RotateCw className="w-4 h-4" />
                              {selectedJobDetails.confirmation_sent ? 'Resend Email' : 'Send Email'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Reminder */}
                  <div className="mb-4 pt-4 border-t border-gray-200">
                    <div className="flex items-start space-x-3 items-center">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <Mail className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>Reminder</span>
                        </div>
                        <p className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 600 }}>Appointment Reminder</p>
                        <p className="text-xs text-gray-500" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
                          {selectedJobDetails.reminder_sent && selectedJobDetails.reminder_sent_at
                            ? `${getTimeAgo(selectedJobDetails.reminder_sent_at)} • Email Sent`
                            : selectedJobDetails.reminder_failed
                              ? `Failed to send: ${selectedJobDetails.reminder_error || 'Unknown error'}`
                              : !emailNotifications && !smsNotifications
                                ? "Notifications are disabled for this customer"
                                : "Scheduled for 2 hours before appointment"}
                    </p>
                  </div>
                      <div className="relative" ref={reminderMenuRef}>
                        <button
                          onClick={() => setOpenNotificationMenu(openNotificationMenu === 'reminder' ? null : 'reminder')}
                          className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                        >
                          <MoreVertical className="w-4 h-4 text-blue-600" />
                        </button>
                        {openNotificationMenu === 'reminder' && (
                          <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[180px] z-50">
                            <button
                              onClick={() => {
                                setViewingMessageType('reminder')
                                setShowMessageViewer(true)
                                setOpenNotificationMenu(null)
                              }}
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                              View Message
                            </button>
                            <button
                              onClick={() => {
                                setNotificationType('reminder')
                                const hasEmail = selectedJobDetails.customer_email && selectedJobDetails.customer_email.trim() !== ''
                                if (hasEmail && emailNotifications) {
                                  setSelectedNotificationMethod('email')
                                  setNotificationEmail(selectedJobDetails.customer_email || '')
                                } else if (smsNotifications) {
                                  setSelectedNotificationMethod('sms')
                                  setNotificationPhone(selectedJobDetails.customer_phone || '')
                                } else if (emailNotifications) {
                                  setSelectedNotificationMethod('email')
                                  setNotificationEmail(selectedJobDetails.customer_email || '')
                                }
                                setShowNotificationModal(true)
                                setOpenNotificationMenu(null)
                              }}
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                              disabled={!emailNotifications && !smsNotifications}
                            >
                              <RotateCw className="w-4 h-4" />
                              {selectedJobDetails.reminder_sent ? 'Resend Email' : 'Send Email'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Customer Feedback */}
              <div className="bg-white border rounded-lg border-gray-200">
                <div className="px-6 py-4">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-3" style={{ fontFamily: 'Montserrat', fontWeight: 700 }}>Customer feedback</span>
                  <p className="text-sm text-gray-600" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
                    An email will be sent to the customer asking them to rate the service after the job is marked complete. <button className="text-blue-600 hover:text-blue-700 font-medium">Learn more</button>
                  </p>
                </div>
              </div>

              {/* Conversion Summary */}
              <div className="bg-white border rounded-lg border-gray-200 px-6 py-4">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-3" style={{ fontFamily: 'Montserrat', fontWeight: 700 }}>Conversion summary</span>
                <p className="text-sm text-gray-600" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
                  Jobs created by team members from the Zenbooker admin won't have any conversion details associated. <button className="text-blue-600 hover:text-blue-700 font-medium">Learn more</button>
                </p>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center">
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

      {/* Edit Team Member Name Modal */}
      {showEditTeamMemberModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Edit Team Member Name</h3>
              <button
                onClick={() => setShowEditTeamMemberModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                <input
                  type="text"
                  value={editTeamMemberData.first_name}
                  onChange={(e) => setEditTeamMemberData(prev => ({ ...prev, first_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                <input
                  type="text"
                  value={editTeamMemberData.last_name}
                  onChange={(e) => setEditTeamMemberData(prev => ({ ...prev, last_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => setShowEditTeamMemberModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveTeamMemberName}
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
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center">
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
                <AddressAutocomplete
                  value={editFormData.service_address}
                  onChange={(value) => {
                    setEditFormData(prev => ({ ...prev, service_address: value }))
                  }}
                  onAddressSelect={(addressData) => {
                    setSelectedAddressData(addressData)
                    setEditFormData(prev => ({
                      ...prev,
                      service_address: addressData.formattedAddress
                    }))
                  }}
                  placeholder="Enter service address"
                  className="w-full"
                  showValidationResults={false}
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

      {/* Notes Modal */}
      {showNotesModal && selectedJobDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center">
          <div className="bg-white rounded-lg w-full max-w-lg mx-4">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <button
                onClick={() => {
                  // Clean up preview URLs
                  noteAttachments.forEach(att => {
                    if (att.preview) URL.revokeObjectURL(att.preview)
                  })
                  setShowNotesModal(false)
                  setNoteText('')
                  setNoteType('job')
                  setNoteAttachments([])
                }}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
              <h3 className="text-lg font-semibold text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 600 }}>New Note</h3>
              <button
                onClick={handleSaveNotes}
                disabled={isUpdatingJob || (!noteText.trim() && noteAttachments.length === 0)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ fontFamily: 'Montserrat', fontWeight: 500 }}
              >
                {isUpdatingJob ? (uploadingFiles ? 'Uploading...' : 'Saving...') : 'Save'}
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Text Input Area */}
              <div>
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  rows={8}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none"
                  placeholder="Add an internal note just for employees to see..."
                  style={{ fontFamily: 'Montserrat', fontWeight: 400 }}
                />
                
                {/* Attachment Icons */}
                <div className="flex items-center gap-3 mt-3">
                  <label className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer">
                    <Image className="w-5 h-5" />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileSelect(e, 'image')}
                      multiple
                    />
                  </label>
                  <label className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer">
                    <Paperclip className="w-5 h-5" />
                    <input
                      type="file"
                      accept="*/*"
                      className="hidden"
                      onChange={(e) => handleFileSelect(e, 'file')}
                      multiple
                    />
                  </label>
                </div>
                
                {/* Display Selected Attachments */}
                {noteAttachments.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {noteAttachments.map((attachment, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                        {attachment.type.startsWith('image/') && attachment.preview ? (
                          <img 
                            src={attachment.preview} 
                            alt={attachment.file.name}
                            className="w-10 h-10 object-cover rounded"
                          />
                        ) : (
                          <FileText className="w-5 h-5 text-gray-400" />
                        )}
                        <span className="flex-1 text-sm text-gray-700 truncate" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
                          {attachment.file.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(index)}
                          className="p-1 text-red-500 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Note Type Selection */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3" style={{ fontFamily: 'Montserrat', fontWeight: 700 }}>
                  NOTE TYPE
                </label>
                <div className="space-y-3">
                  {/* Job Note Option */}
                  <label className="flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors hover:bg-gray-50"
                    style={{ 
                      borderColor: noteType === 'job' ? '#2563eb' : '#e5e7eb',
                      backgroundColor: noteType === 'job' ? '#eff6ff' : 'transparent'
                    }}
                  >
                    <input
                      type="radio"
                      name="noteType"
                      value="job"
                      checked={noteType === 'job'}
                      onChange={(e) => setNoteType(e.target.value)}
                      className="mt-1 w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <FileText className="w-5 h-5 text-gray-600" />
                        <span className="font-semibold text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 600 }}>Job note</span>
                      </div>
                      <p className="text-sm text-gray-600" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
                        Job notes are only linked to a single job.
                      </p>
                    </div>
                  </label>

                  {/* Customer Note Option */}
                  <label className="flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors hover:bg-gray-50"
                    style={{ 
                      borderColor: noteType === 'customer' ? '#2563eb' : '#e5e7eb',
                      backgroundColor: noteType === 'customer' ? '#eff6ff' : 'transparent'
                    }}
                  >
                    <input
                      type="radio"
                      name="noteType"
                      value="customer"
                      checked={noteType === 'customer'}
                      onChange={(e) => setNoteType(e.target.value)}
                      className="mt-1 w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <UserIcon className="w-5 h-5 text-gray-600" />
                        <span className="font-semibold text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 600 }}>Customer note</span>
                      </div>
                      <p className="text-sm text-gray-600" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
                        Customer notes are linked to all jobs scheduled for this customer.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

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
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {showRescheduleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center">
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
      {showAssignModal && selectedJobDetails && (
        <AssignJobModal
          job={selectedJobDetails}
          isOpen={showAssignModal}
          onClose={() => setShowAssignModal(false)}
          onAssign={handleAssignTeamMember}
        />
      )}

      {/* Change Territory Modal */}
      {showTerritoryModal && selectedJobDetails && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center p-4 sm:p-6"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowTerritoryModal(false)
              setSelectedNewTerritory(null)
            }
          }}
        >
          <div className="bg-white rounded-lg w-full max-w-lg mx-auto shadow-2xl max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-200 relative flex-shrink-0">
              <button
                onClick={() => {
                  setShowTerritoryModal(false)
                  setSelectedNewTerritory(null)
                }}
                className="absolute left-4 sm:left-6 p-1.5 hover:bg-gray-100 rounded-full transition-colors z-20"
              >
                <X className="w-5 h-5 text-gray-900" strokeWidth={2.5} />
              </button>
              <h2 className="text-lg font-semibold text-gray-900 flex-1 text-center" style={{ fontFamily: 'Montserrat', fontWeight: 600 }}>
                Change Territory
              </h2>
              <button
                onClick={handleSaveTerritoryChange}
                disabled={isUpdatingJob || (() => {
                  // Disable if no change is made
                  let currentTerritory = selectedJobDetails.territory_id 
                    ? territories.find(t => t.id === selectedJobDetails.territory_id)
                    : null
                  const currentId = currentTerritory?.id || null
                  const selectedId = selectedNewTerritory?.id || null
                  return currentId === selectedId
                })()}
                className="absolute right-4 sm:right-6 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed z-20 shadow-sm"
                style={{ fontFamily: 'Montserrat', fontWeight: 500 }}
              >
                {isUpdatingJob ? 'Saving...' : 'Save'}
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-4 sm:px-6 py-6 space-y-6 overflow-y-auto flex-1">
              {/* Current Territory Section */}
              <div>
                <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider mb-3" style={{ fontFamily: 'Montserrat', fontWeight: 700 }}>
                  CURRENT TERRITORY
                </label>
                {(() => {
                  // Try to find territory by territory_id first
                  let currentTerritory = selectedJobDetails.territory_id 
                    ? territories.find(t => t.id === selectedJobDetails.territory_id)
                    : null
                  
                  // If no territory_id, try to match by service_region_custom_service_region
                  if (!currentTerritory && selectedJobDetails.service_region_custom_service_region) {
                    const locationName = selectedJobDetails.service_region_custom_service_region
                    currentTerritory = territories.find(t => 
                      t.name === locationName || 
                      t.location === locationName ||
                      (t.location && t.location.includes(locationName)) ||
                      (locationName && t.name && t.name.toLowerCase().includes(locationName.toLowerCase()))
                    )
                  }
                  
                  const territoryName = currentTerritory ? currentTerritory.name : 'Unassigned'
                  
                  return (
                    <div className="flex items-center gap-3 px-3 py-2.5 bg-white border border-gray-300 rounded-lg">
                      <MapPin className="w-4 h-4 text-blue-600 flex-shrink-0" />
                      <span className="text-sm font-bold text-gray-900 flex-1 truncate min-w-0" style={{ fontFamily: 'Montserrat', fontWeight: 700 }} title={territoryName}>
                        {territoryName.length > 25 ? `${territoryName.substring(0, 25)}...` : territoryName}
                      </span>
                      {currentTerritory && (
                        <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                          <div className="w-2 h-2 rounded-full bg-white"></div>
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>

              {/* Select New Territory Section */}
              <div>
                <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider mb-3" style={{ fontFamily: 'Montserrat', fontWeight: 700 }}>
                  SELECT NEW TERRITORY
                </label>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {(() => {
                    // Get current territory timezone
                    let currentTerritory = selectedJobDetails.territory_id 
                      ? territories.find(t => t.id === selectedJobDetails.territory_id)
                      : null
                    
                    if (!currentTerritory && selectedJobDetails.service_region_custom_service_region) {
                      const locationName = selectedJobDetails.service_region_custom_service_region
                      currentTerritory = territories.find(t => 
                        t.name === locationName || 
                        t.location === locationName ||
                        (t.location && t.location.includes(locationName)) ||
                        (locationName && t.name && t.name.toLowerCase().includes(locationName.toLowerCase()))
                      )
                    }
                    
                    const currentTimezone = currentTerritory?.timezone || 'America/New_York'
                    
                    return (
                      <>
                        {/* Unassigned Option */}
                        <button
                          type="button"
                          onClick={() => setSelectedNewTerritory(null)}
                          className={`w-full text-left px-3 py-3 border rounded-lg transition-all ${
                            selectedNewTerritory === null
                              ? 'border-blue-600 bg-blue-50'
                              : 'border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              <MapPin className={`w-4 h-4 flex-shrink-0 ${
                                selectedNewTerritory === null ? 'text-blue-600' : 'text-gray-400'
                              }`} />
                              <div className="flex-1 min-w-0">
                                <span className={`text-sm block ${
                                  selectedNewTerritory === null 
                                    ? 'font-bold text-gray-900' 
                                    : 'font-medium text-gray-700'
                                }`} style={{ fontFamily: 'Montserrat' }}>
                                  Unassigned
                                </span>
                              </div>
                            </div>
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                              selectedNewTerritory === null
                                ? 'border-blue-600 bg-blue-600'
                                : 'border-gray-300 bg-white'
                            }`}>
                              {selectedNewTerritory === null && (
                                <div className="w-2 h-2 rounded-full bg-white"></div>
                              )}
                            </div>
                          </div>
                        </button>
                        
                        {/* Territory Options */}
                        {territories.map(territory => {
                          const isSelected = selectedNewTerritory?.id === territory.id
                          const hasTimezoneDiff = territory.timezone && territory.timezone !== currentTimezone
                          
                          return (
                            <button
                              key={territory.id}
                              type="button"
                              onClick={() => setSelectedNewTerritory(territory)}
                              className={`w-full text-left px-3 py-3 border rounded-lg transition-all ${
                                isSelected
                                  ? 'border-blue-600 bg-blue-50'
                                  : 'border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <MapPin className={`w-4 h-4 flex-shrink-0 ${
                                    isSelected ? 'text-blue-600' : 'text-gray-400'
                                  }`} />
                                  <div className="flex-1 min-w-0">
                                    <span 
                                      className={`text-sm block truncate ${
                                        isSelected 
                                          ? 'font-bold text-gray-900' 
                                          : 'font-medium text-gray-700'
                                      }`} 
                                      style={{ fontFamily: 'Montserrat' }}
                                      title={territory.name}
                                    >
                                      {territory.name.length > 30 ? `${territory.name.substring(0, 30)}...` : territory.name}
                                    </span>
                                    {hasTimezoneDiff && (
                                      <span className="text-xs text-gray-500 mt-1 block" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
                                        This territory's timezone is different from the job's timezone
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                  isSelected
                                    ? 'border-blue-600 bg-blue-600'
                                    : 'border-gray-300 bg-white'
                                }`}>
                                  {isSelected && (
                                    <div className="w-2 h-2 rounded-full bg-white"></div>
                                  )}
                                </div>
                              </div>
                            </button>
                          )
                        })}
                      </>
                    )
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Job Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center">
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

      {/* Send Invoice Modal */}
      {showSendInvoiceModal && selectedJobDetails && (
        <div className="fixed inset-0 bg-white z-[9999] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <button
              onClick={() => {
                setShowSendInvoiceModal(false)
                setManualEmail('')
              }}
              className="text-gray-900 hover:text-gray-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-semibold text-gray-900 flex-1 text-center" style={{ fontFamily: 'Montserrat', fontWeight: 600 }}>Email Invoice</h3>
            <button
              onClick={handleSendInvoice}
              disabled={isUpdatingJob}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              style={{ fontFamily: 'Montserrat', fontWeight: 500 }}
            >
              {isUpdatingJob ? 'Sending...' : 'Send'}
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 space-y-4">
              {/* Email Details */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>Send to</label>
                  <input
                    type="email"
                    value={manualEmail || selectedJobDetails.customer_email || ''}
                    onChange={(e) => setManualEmail(e.target.value)}
                    className="w-full text-sm text-gray-900 border-0 focus:ring-0 p-0"
                    placeholder="Enter email address"
                    style={{ fontFamily: 'Montserrat', fontWeight: 400 }}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>Subject</label>
                  <input
                    type="text"
                    defaultValue={`You have a new invoice from ${user?.business_name || user?.businessName || user?.email || 'Your Business'}`}
                    className="w-full text-sm text-gray-900 border-0 focus:ring-0 p-0"
                    style={{ fontFamily: 'Montserrat', fontWeight: 400 }}
                  />
                </div>
              </div>

              {/* Invoice Preview */}
              <div className="bg-white border border-gray-200 rounded-lg p-6 mt-4">
                {/* Invoice Header */}
                <h2 className="text-lg font-bold text-gray-900 mb-2" style={{ fontFamily: 'Montserrat', fontWeight: 700 }}>
                  Your invoice from {user?.business_name || user?.businessName || user?.email || 'Your Business'}
                </h2>
                
                {/* Greeting */}
                <p className="text-sm text-gray-900 mb-3" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
                  Hi {getCustomerName(selectedJobDetails) || 'Customer'},
                </p>
                
                {/* Message */}
                <p className="text-sm text-gray-700 mb-6" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
                  Thank you for your recent business with us. Please find a detailed copy of <strong>Invoice #{selectedJobDetails.invoice_id ? `INV-${selectedJobDetails.invoice_id}` : `#${selectedJobDetails.id}`}</strong> below.
                </p>

                {/* Key Details - Right Aligned */}
                <div className="text-right mb-6 space-y-1">
                  <div className="flex justify-end items-baseline gap-2">
                    <span className="text-xs text-gray-600 uppercase" style={{ fontFamily: 'Montserrat', fontWeight: 500 }}>AMOUNT DUE</span>
                    <span className="text-base font-semibold text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 600 }}>${calculateTotalPrice().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-end items-baseline gap-2">
                    <span className="text-xs text-gray-600 uppercase" style={{ fontFamily: 'Montserrat', fontWeight: 500 }}>DUE BY</span>
                    <span className="text-sm text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
                      {new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex justify-end items-baseline gap-2">
                    <span className="text-xs text-gray-600 uppercase" style={{ fontFamily: 'Montserrat', fontWeight: 500 }}>SERVICE DATE</span>
                    <span className="text-sm text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
                      {selectedJobDetails.scheduled_date ? new Date(selectedJobDetails.scheduled_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : 'Not scheduled'}
                    </span>
                  </div>
                  <div className="flex justify-end items-baseline gap-2">
                    <span className="text-xs text-gray-600 uppercase" style={{ fontFamily: 'Montserrat', fontWeight: 500 }}>SERVICE ADDRESS</span>
                    <span className="text-sm text-gray-900 text-right max-w-xs" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
                      {selectedJobDetails.service_address_street || selectedJobDetails.customer_address || 'Address not provided'}
                      {selectedJobDetails.service_address_city && `, ${selectedJobDetails.service_address_city}`}
                      {selectedJobDetails.service_address_state && `, ${selectedJobDetails.service_address_state}`}
                      {selectedJobDetails.service_address_zip && ` ${selectedJobDetails.service_address_zip}`}
                      {selectedJobDetails.service_address_country && `, ${selectedJobDetails.service_address_country}`}
                    </span>
                  </div>
                </div>

                {/* Summary Section */}
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <h3 className="text-xs text-gray-500 uppercase mb-3" style={{ fontFamily: 'Montserrat', fontWeight: 500 }}>SUMMARY</h3>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 600 }}>
                      {selectedJobDetails.service_name || selectedJobDetails.service_type || 'Service'}
                    </span>
                    <span className="text-sm text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
                      ${calculateTotalPrice().toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Financial Breakdown */}
                <div className="space-y-2 mt-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>Subtotal</span>
                    <span className="text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>${calculateTotalPrice().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>Total</span>
                    <span className="text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>${calculateTotalPrice().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>Total Paid</span>
                    <span className="text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
                      ${(selectedJobDetails.invoice_paid_amount || selectedJobDetails.amount_paid || selectedJobDetails.total_paid_amount || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold pt-2 border-t border-gray-200">
                    <span className="text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 600 }}>Total Due</span>
                    <span className="text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 600 }}>
                      ${(calculateTotalPrice() - (selectedJobDetails.invoice_paid_amount || selectedJobDetails.amount_paid || selectedJobDetails.total_paid_amount || 0)).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Closing Message */}
                <p className="text-sm text-gray-600 mt-6" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
                  We appreciate your business.
                </p>
              </div>

              {/* Payment Link Option - Hidden by default, can be shown if needed */}
              {stripeConnected && (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 500 }}>Include payment link</h4>
                    <p className="text-xs text-gray-600" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
                      Allow customer to pay directly via Stripe
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={includePaymentLink}
                      onChange={(e) => setIncludePaymentLink(e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              )}

              {/* Error Message */}
              {errorMessage && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>{errorMessage}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Payment Modal */}
      {showAddPaymentModal && selectedJobDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 600 }}>Add Payment</h3>
                <button
                  onClick={() => setShowAddPaymentModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'Montserrat', fontWeight: 500 }}>Payment Method</label>
                  <select 
                    value={paymentFormData.paymentMethod}
                    onChange={(e) => setPaymentFormData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                    style={{ fontFamily: 'Montserrat', fontWeight: 400 }}
                  >
                    <option value="cash">Cash</option>
                    <option value="check">Check</option>
                    <option value="credit_card">Credit Card</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'Montserrat', fontWeight: 500 }}>Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={paymentFormData.amount || calculateTotalPrice()}
                    onChange={(e) => setPaymentFormData(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter amount"
                    style={{ fontFamily: 'Montserrat', fontWeight: 400 }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'Montserrat', fontWeight: 500 }}>Payment Date</label>
                  <input
                    type="date"
                    value={paymentFormData.paymentDate}
                    onChange={(e) => setPaymentFormData(prev => ({ ...prev, paymentDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    style={{ fontFamily: 'Montserrat', fontWeight: 400 }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'Montserrat', fontWeight: 500 }}>Notes</label>
                  <textarea
                    rows={3}
                    value={paymentFormData.notes}
                    onChange={(e) => setPaymentFormData(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Optional payment notes"
                    style={{ fontFamily: 'Montserrat', fontWeight: 400 }}
                  />
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowAddPaymentModal(false)
                    setPaymentFormData({
                      amount: '',
                      paymentMethod: 'cash',
                      paymentDate: new Date().toISOString().split('T')[0],
                      notes: ''
                    })
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 order-2 sm:order-1"
                  style={{ fontFamily: 'Montserrat', fontWeight: 500 }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleRecordPayment}
                  disabled={isUpdatingJob}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 order-1 sm:order-2 disabled:opacity-50"
                  style={{ fontFamily: 'Montserrat', fontWeight: 500 }}
                >
                  {isUpdatingJob ? 'Recording...' : 'Record Payment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
      </div>
    </>
  )
}

export default ServiceFlowSchedule

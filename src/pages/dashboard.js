"use client"

import { useState, useEffect, useRef } from "react"
import Sidebar from "../components/sidebar"
import MobileHeader from "../components/mobile-header"
import CustomerModal from "../components/customer-modal"
import { Plus, ChevronDown, Info, Star, Calendar, ArrowRight, BarChart2, CreditCard, Users, RefreshCw, MapPin, Globe, Check, AlertTriangle } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { jobsAPI, customersAPI, servicesAPI, invoicesAPI, teamAPI } from "../services/api"
import { normalizeAPIResponse, handleAPIError } from "../utils/dataHandler"

const ServiceFlowDashboard = () => {
  const { user } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  
  // Function to get time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }
  
  // Function to get user's display name
  const getUserDisplayName = () => {
    if (!user) return 'User'
    return user.firstName || user.name || user.email?.split('@')[0] || 'User'
  }
  const [isLoading, setIsLoading] = useState(true)
  const [dateRange, setDateRange] = useState('7') // days
  const [showNewMenu, setShowNewMenu] = useState(false)
  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const [error, setError] = useState("")
  const [retryCount, setRetryCount] = useState(0)
  const newMenuRef = useRef(null)
  const navigate = useNavigate()

  // Dashboard data state
  const [dashboardData, setDashboardData] = useState({
    todayJobs: 0,
    todayDuration: 0,
    todayEarnings: 0,
    newJobs: 0,
    totalJobs: 0,
    newRecurringBookings: 0,
    recurringBookings: 0,
    jobValue: 0,
    customerSatisfaction: 0,
    totalRevenue: 0
  })

  // Store today's jobs for the map
  const [todayJobsList, setTodayJobsList] = useState([])
  const [mapView, setMapView] = useState('map') // 'map' or 'satellite'

  // Function to generate Google Maps URL with job markers
  const generateMapUrl = (jobs, mapType = 'roadmap') => {
    if (!jobs || jobs.length === 0) {
      // Default to New York if no jobs
      return `https://www.google.com/maps/embed/v1/view?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&center=40.7128,-74.0060&zoom=11&maptype=${mapType}`
    }

    // Filter jobs that have valid addresses
    const jobsWithAddresses = jobs.filter(job => job.customer_address && job.customer_address.trim() !== '')
    
    if (jobsWithAddresses.length === 0) {
      // No valid addresses, use default
      return `https://www.google.com/maps/embed/v1/view?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&center=40.7128,-74.0060&zoom=11&maptype=${mapType}`
    }

    if (jobsWithAddresses.length === 1) {
      // Single job - use place mode for better centering
      const address = encodeURIComponent(jobsWithAddresses[0].customer_address)
      return `https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${address}&zoom=14&maptype=${mapType}`
    }

    // Multiple jobs - use search mode to show all locations
    const addresses = jobsWithAddresses.map(job => job.customer_address).join('|')
    const encodedAddresses = encodeURIComponent(addresses)
    
    return `https://www.google.com/maps/embed/v1/search?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${encodedAddresses}&zoom=10&maptype=${mapType}`
  }

  // Setup section visibility state - ALWAYS starts hidden and stays hidden until proven needed
  const [showSetupSection, setShowSetupSection] = useState(false)
  const [setupSectionDismissed, setSetupSectionDismissed] = useState(true) // Start as dismissed by default
  const [setupCheckCompleted, setSetupCheckCompleted] = useState(false)

  // Setup tasks state
  const [setupTasks, setSetupTasks] = useState([
    {
      number: 1,
      title: "Create your services",
      description: "Add the services you offer, along with custom form fields and questionnaires.",
      completed: false,
      link: "/services",
      icon: Users,
    },
    {
      number: 2,
      title: "Create a test job",
      description: "Create a test job from the admin to get a sense of how jobs work in ServiceFlow.",
      completed: false,
      link: "/jobs",
      icon: BarChart2,
    },
    {
      number: 3,
      title: "Configure your booking and timeslot settings",
      description:
        "Tailor your booking options by customizing availability, timeslot options, and how far in advance customers can book.",
      completed: false,
      link: "/settings/availability",
      icon: Calendar,
      hidden: true,
    },
    {
      number: 4,
      title: "Set your business hours",
      description: "Set your operating hours to ensure customers can book times when you're available.",
      completed: false,
      link: "/settings/availability",
      icon: Calendar,
      hidden: true,
    },
    {
      number: 5,
      title: "Set your service area",
      description: "Set the locations where your business offers service.",
      completed: false,
      link: "/settings/service-areas",
      icon: MapPin,
    },
    {
      number: 6,
      title: "Set up your online booking site",
      description:
        "Customize your booking site with your branding, and edit the text and content to match your business.",
      completed: false,
      link: "/online-booking",
      icon: Globe,
      hidden: true,
    },
    {
      number: 7,
      title: "Add your team members",
      description: "Invite your team and assign roles so everyone can manage bookings and provide services.",
      completed: false,
      link: "/team",
      icon: Users,
    },
  ])

  // Retry mechanism for API calls
  const retryAPI = async (apiCall, maxRetries = 3, delay = 1000) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await apiCall()
      } catch (error) {
        setRetryCount(attempt)
        
        if (attempt === maxRetries) {
          throw error
        }
        
        // If it's a 429 error, wait longer
        if (error.response?.status === 429) {
          console.log(`🔄 Rate limited, waiting ${delay * attempt}ms before retry ${attempt}/${maxRetries}`)
          await new Promise(resolve => setTimeout(resolve, delay * attempt))
        } else {
          console.log(`🔄 API call failed, retrying ${attempt}/${maxRetries}`)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }
  }

  // Fetch dashboard data
  useEffect(() => {
    if (user?.id) {
      fetchDashboardData()
    }
  }, [user, dateRange])

  // Function to clear cookies
  const clearStaleData = () => {
    // Clear any stale localStorage data except user preferences and authentication
    const keysToCheck = Object.keys(localStorage)
    keysToCheck.forEach(key => {
      if (key.startsWith('dashboard_') || key.startsWith('temp_') || key.startsWith('cache_') || key.startsWith('stale_')) {
        localStorage.removeItem(key)
        console.log('🗑️ Removed stale cache key:', key)
      }
    })
    
    // Clear sessionStorage data that might be stale
    const sessionKeysToCheck = Object.keys(sessionStorage)
    sessionKeysToCheck.forEach(key => {
      if (key.startsWith('dashboard_') || key.startsWith('temp_') || key.startsWith('cache_')) {
        sessionStorage.removeItem(key)
        console.log('🗑️ Removed stale session key:', key)
      }
    })
    
    // Clear any non-essential cookies (preserve auth cookies)
    if (typeof document !== 'undefined') {
      const cookies = document.cookie.split(';')
      cookies.forEach(cookie => {
        const [name] = cookie.split('=')
        const cleanName = name.trim()
        
        // Only clear non-essential cookies (preserve auth and session cookies)
        if (cleanName && !cleanName.includes('auth') && !cleanName.includes('session') && !cleanName.includes('token')) {
          if (cleanName.startsWith('dashboard_') || cleanName.startsWith('temp_') || cleanName.startsWith('cache_')) {
            document.cookie = `${cleanName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
            console.log('🍪 Cleared cookie:', cleanName)
          }
        }
      })
    }
  }

  // Load setup section preferences from localStorage and clean cache on startup
  useEffect(() => {
    // Clear any stale cache data on dashboard startup
    console.log('🧹 Cleaning cache and cookies on dashboard startup...')
    
    clearStaleData()
    
    // Load setup section preferences from localStorage - only allow showing if explicitly NOT dismissed
    const dismissed = localStorage.getItem('setupSectionDismissed')
    // If never set before, default to NOT dismissed (null), otherwise respect the setting
    const isDismissed = dismissed === 'true'
    setSetupSectionDismissed(isDismissed)
    
    console.log('🔍 Setup section dismissed from localStorage:', dismissed)
    console.log('✅ Cache and cookie cleanup completed')
  }, [])

  // Silent background check if setup section should be shown based on user's data
  const checkIfSetupSectionNeeded = () => {
    console.log('🔍 Running silent background setup check...')
    
    // GUARANTEE section stays hidden during check
    setShowSetupSection(false)
    
    // If user has dismissed it before, never show again
    if (setupSectionDismissed) {
      console.log('🔍 Setup section was previously dismissed - keeping hidden permanently')
      setSetupCheckCompleted(true)
      return
    }

    // Add delay to ensure section stays hidden during check and data loading
    setTimeout(() => {
      try {
        // Get current data counts safely
        const totalServices = dashboardData?.totalServices || 0
        const totalJobs = dashboardData?.totalJobs || 0  
        const totalTeamMembers = dashboardData?.totalTeamMembers || 0
        
        // Check if user has basic setup completed
        const hasServices = totalServices > 0
        const hasJobs = totalJobs > 0
        const hasTeamMembers = totalTeamMembers > 0
        
        // Calculate completed setup tasks
      const completedTasks = setupTasks.filter(task => !task.hidden && task.completed).length
      const totalTasks = setupTasks.filter(task => !task.hidden).length
      const allTasksCompleted = completedTasks === totalTasks && totalTasks > 0
      
        // STRICT LOGIC: Only show for completely new users with ZERO activity
        const hasAnyActivity = hasServices || hasJobs || hasTeamMembers
        const isCompletelyNewUser = !hasAnyActivity && totalServices === 0 && totalJobs === 0 && totalTeamMembers === 0
        
        // Rule 1: NEVER show if all tasks are completed
        if (allTasksCompleted) {
          console.log('🚫 All setup tasks completed - permanently hiding setup section')
          setShowSetupSection(false)
          setSetupCheckCompleted(true)
          localStorage.setItem('setupSectionDismissed', 'true')
          setSetupSectionDismissed(true)
          return
        }
        
        // Rule 2: NEVER show if user has ANY activity/data
        if (hasAnyActivity) {
          console.log('🚫 User has activity - permanently hiding setup section')
          setShowSetupSection(false)
          setSetupCheckCompleted(true)
          localStorage.setItem('setupSectionDismissed', 'true')
          setSetupSectionDismissed(true)
          return
        }
        
        // Rule 3: Only show for completely new users who haven't dismissed it
        const shouldShow = isCompletelyNewUser && !setupSectionDismissed && !allTasksCompleted
        
        console.log('🔍 STRICT setup check completed:', {
          isCompletelyNewUser,
          hasAnyActivity,
          allTasksCompleted,
          shouldShow,
          completedTasks,
          totalTasks,
          hasServices, 
          hasJobs, 
          hasTeamMembers,
          totalServices,
          totalJobs,
          totalTeamMembers,
          setupSectionDismissed
        })
        
        // FINAL DECISION: Only show if user is completely new AND hasn't dismissed
        if (shouldShow) {
          console.log('✅ Showing setup section for completely new user')
          setShowSetupSection(true)
        } else {
          console.log('❌ Keeping setup section hidden')
          setShowSetupSection(false)
        }
        setSetupCheckCompleted(true)
      
    } catch (error) {
        console.error('❌ Error in silent setup check:', error)
        setShowSetupSection(false) // Always hide on error
      setSetupCheckCompleted(true)
    }
    }, 250) // Increased delay to ensure data is loaded first
  }

  // Re-check setup section when dashboard data changes
  useEffect(() => {
    if (dashboardData && !setupCheckCompleted) {
      // Only run the check once when data first loads
      checkIfSetupSectionNeeded()
    }
  }, [dashboardData, setupSectionDismissed])

  // Function to dismiss setup section permanently
  const dismissSetupSection = () => {
    setSetupSectionDismissed(true)
    setShowSetupSection(false)
    localStorage.setItem('setupSectionDismissed', 'true')
    console.log('🚫 Setup section dismissed permanently')
    
    // Clear any related cache when dismissed
    clearStaleData()
  }

  const fetchDashboardData = async () => {
    if (!user?.id) {
      console.log('No user ID available for dashboard')
      return
    }
    
    try {
      setIsLoading(true)
      setError("")
      
      console.log('🔄 Fetching dashboard data for user:', user.id)
      console.log('📊 API Base URL:', process.env.REACT_APP_API_URL || 'https://service-flow-backend-production.up.railway.app/api')
      
      // Add delay between API calls to prevent rate limiting
      const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))
      
      // Fetch jobs data
      console.log('📋 Fetching jobs...')
      const jobsResponse = await retryAPI(() => jobsAPI.getAll(user.id, "", "", 1, 1000))
      const jobs = normalizeAPIResponse(jobsResponse, 'jobs')
      console.log('✅ Jobs loaded:', jobs.length)
      
      // Add delay to prevent rate limiting
      await delay(200)
      
      // Fetch invoices data
      console.log('💰 Fetching invoices...')
      const invoicesResponse = await retryAPI(() => invoicesAPI.getAll(user.id, { page: 1, limit: 1000 }))
      const invoices = normalizeAPIResponse(invoicesResponse, 'invoices')
      console.log('✅ Invoices loaded:', invoices.length)
      
      // Add delay to prevent rate limiting
      await delay(200)
      
      // Fetch services data
      console.log('🔧 Fetching services...')
      const servicesResponse = await retryAPI(() => servicesAPI.getAll(user.id))
      const services = normalizeAPIResponse(servicesResponse, 'services')
      console.log('✅ Services loaded:', services.length)
      
      // Add delay to prevent rate limiting
      await delay(200)
      
      // Fetch team members data
      console.log('👥 Fetching team members...')
      let teamMembers = []
      try {
        const teamResponse = await teamAPI.getAll(user.id, { page: 1, limit: 1000 })
        teamMembers = teamResponse.teamMembers || teamResponse || []
        console.log('✅ Team members loaded:', teamMembers.length)
      } catch (teamError) {
        console.warn('⚠️ Team members fetch failed:', teamError.message)
        teamMembers = []
      }
      
      // Calculate today's data
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      
      const todayJobs = jobs.filter(job => {
        // Extract date part from scheduled_date string (format: "2024-01-15 10:00:00")
        const jobDateString = job.scheduled_date ? job.scheduled_date.split(' ')[0] : ''
        const todayString = today.toISOString().split('T')[0]
        const tomorrowString = tomorrow.toISOString().split('T')[0]
        return jobDateString >= todayString && jobDateString < tomorrowString
      })
      
      const todayEarnings = todayJobs.reduce((sum, job) => {
        // Try multiple possible invoice fields to find the matching invoice
        const invoice = invoices.find(inv => 
          inv.job_id === job.id || 
          inv.jobId === job.id || 
          inv.job === job.id ||
          inv.id === job.invoice_id
        )
        
        // Use invoice amount if available, otherwise use job's price/total as fallback
        const jobValue = parseFloat(invoice?.total_amount || invoice?.amount || invoice?.total || 
                                   job.total || job.price || job.service_price || 0)
        
        return sum + jobValue
      }, 0)
      
      const todayDuration = todayJobs.reduce((sum, job) => {
        return sum + (parseInt(job.service_duration || 0))
      }, 0)
      
      // Calculate date range data
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - parseInt(dateRange))
      
      const rangeJobs = jobs.filter(job => {
        // Extract date part from scheduled_date string (format: "2024-01-15 10:00:00")
        const jobDateString = job.scheduled_date ? job.scheduled_date.split(' ')[0] : ''
        const startDateString = startDate.toISOString().split('T')[0]
        return jobDateString >= startDateString
      })
      
      const rangeInvoices = invoices.filter(invoice => {
        const invoiceDate = new Date(invoice.created_at)
        return invoiceDate >= startDate
      })
      
      // Calculate metrics
      const newJobs = rangeJobs.filter(job => {
        const jobDate = new Date(job.created_at)
        return jobDate >= startDate
      }).length
      
      // Calculate total revenue from invoices OR job prices as fallback
      const totalRevenue = rangeJobs.reduce((sum, job) => {
        // Find invoice for this job
        const invoice = invoices.find(inv => 
          inv.job_id === job.id || 
          inv.jobId === job.id || 
          inv.job === job.id ||
          inv.id === job.invoice_id
        )
        
        // Use invoice amount if available, otherwise use job's price/total as fallback
        const jobValue = parseFloat(invoice?.total_amount || invoice?.amount || invoice?.total || 
                                   job.total || job.price || job.service_price || 0)
        
        return sum + jobValue
      }, 0)
      
      const avgJobValue = rangeJobs.length > 0 ? totalRevenue / rangeJobs.length : 0
      
      // Calculate max values for progress bars (for better visualization)
      const maxJobValue = Math.max(avgJobValue, 100) // Use $100 as minimum scale
      const maxRevenue = Math.max(totalRevenue, 1000) // Use $1000 as minimum scale
      
      // Calculate recurring bookings (jobs with is_recurring = true)
      const recurringJobs = jobs.filter(job => job.is_recurring === true)
      const newRecurringJobs = recurringJobs.filter(job => {
        const jobDate = new Date(job.created_at)
        return jobDate >= startDate
      }).length
      
      const newDashboardData = {
        todayJobs: todayJobs.length,
        todayDuration: todayDuration,
        todayEarnings: todayEarnings,
        newJobs: newJobs,
        totalJobs: rangeJobs.length,
        totalServices: services.length, // Add this for setup check
        totalTeamMembers: teamMembers.length, // Add this for setup check
        newRecurringBookings: newRecurringJobs,
        recurringBookings: recurringJobs.length,
        jobValue: avgJobValue,
        maxJobValue: maxJobValue,
        customerSatisfaction: 0, // Would need ratings data
        totalRevenue: totalRevenue,
        maxRevenue: maxRevenue
      }
      
      setDashboardData(newDashboardData)
      setTodayJobsList(todayJobs) // Store today's jobs for the map
      
      // Check setup task completion
      await checkSetupTaskCompletion(services, jobs, teamMembers)
      
      // Reset retry count on success
      setRetryCount(0)
      
      console.log('📊 Dashboard data loaded:', newDashboardData)
      // Debug revenue calculation
      console.log('💰 Revenue calculation details:', {
        totalJobs: rangeJobs.length,
        totalInvoices: invoices.length,
        totalRevenue: totalRevenue,
        avgJobValue: avgJobValue,
        sampleJobPrices: rangeJobs.slice(0, 3).map(job => ({
          id: job.id,
          price: job.price,
          total: job.total,
          service_price: job.service_price,
          hasInvoice: invoices.some(inv => inv.job_id === job.id || inv.jobId === job.id)
        }))
      })
      console.log('✅ Dashboard connected to backend successfully!')
      
    } catch (error) {
      console.error('❌ Error fetching dashboard data:', error)
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        config: error.config
      })
      
      // Handle specific error types
      if (error.response?.status === 429) {
        setError(`Too many requests (${retryCount > 0 ? `Retried ${retryCount} times` : ''}). Please wait a moment and try refreshing the page.`)
      } else if (error.response?.status === 500) {
        setError("Server error. Please try again later.")
      } else if (error.response?.status === 404) {
        setError("API endpoint not found. Please check your connection.")
      } else if (error.code === 'ECONNABORTED') {
        setError("Request timed out. Please check your connection and try again.")
      } else {
        setError(`Failed to load dashboard data: ${error.message || 'Unknown error'}`)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleNewOptionClick = (option) => {
    setShowNewMenu(false)
    if (option.title === "Job") {
      navigate("/createjob")
    } else if (option.title === "Customer") {
      setShowCustomerModal(true)
    }
  }

  const handleSaveCustomer = async (customerData) => {
    if (!user?.id) return
    
    try {
      console.log("Saving customer:", customerData)
      const response = await customersAPI.create(customerData)
      console.log('Customer saved successfully:', response)
      
      // Return the customer data for navigation
      return response.customer || response
    } catch (error) {
      console.error('Error creating customer:', error)
      throw error // Re-throw to prevent modal from closing
    }
  }

  const newOptions = [
    { title: "Job", icon: BarChart2 },
    { title: "Customer", icon: Users }
  ]

  const ratingBreakdown = [
    { stars: 5, count: 0 },
    { stars: 4, count: 0 },
    { stars: 3, count: 0 },
    { stars: 2, count: 0 },
    { stars: 1, count: 0 },
  ]

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (newMenuRef.current && !newMenuRef.current.contains(event.target)) {
        setShowNewMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const checkSetupTaskCompletion = async (services, jobs, teamMembers) => {
    console.log('🔍 Silently checking setup task completion...')
    
    const updatedTasks = setupTasks.map(task => {
      let completed = false
      
      switch (task.number) {
        case 1: // Create your services
          completed = services && services.length > 0
          console.log(`📋 Services created: ${services?.length || 0} - Task 1 completed: ${completed}`)
          break
          
        case 2: // Create a test job
          completed = jobs && jobs.length > 0
          console.log(`📋 Jobs created: ${jobs?.length || 0} - Task 2 completed: ${completed}`)
          break
          
        case 3: // Configure booking settings
          // For now, consider this completed if services exist (basic booking is possible)
          completed = services && services.length > 0
          console.log(`📋 Booking settings configured: ${completed}`)
          break
          
        case 4: // Set business hours
          // For now, consider this completed if services exist (basic booking is possible)
          completed = services && services.length > 0
          console.log(`📋 Business hours set: ${completed}`)
          break
          
        case 5: // Set service area
          // For now, consider this completed if jobs exist (service area is implied)
          completed = jobs && jobs.length > 0
          console.log(`📋 Service area set: ${completed}`)
          break
          
        case 6: // Set up online booking site
          // For now, consider this completed if services exist (basic booking is possible)
          completed = services && services.length > 0
          console.log(`📋 Online booking site set up: ${completed}`)
          break
          
        case 7: // Add team members
          completed = teamMembers && teamMembers.length > 0
          console.log(`📋 Team members added: ${teamMembers?.length || 0} - Task 7 completed: ${completed}`)
          break
          
        default:
          completed = false
      }
      
      return { ...task, completed }
    })
    
    setSetupTasks(updatedTasks)
    
    const completedCount = updatedTasks.filter(task => task.completed).length
    console.log(`✅ Setup tasks completed: ${completedCount}/${updatedTasks.length}`)
    
    return updatedTasks
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Customer Modal */}
      <CustomerModal
        isOpen={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
        onSave={handleSaveCustomer}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64 xl:ml-72">
        {/* Mobile Header */}
        <MobileHeader onMenuClick={() => setSidebarOpen(true)} />

        {/* Trial Banner */}
        <div className="bg-orange-50 border-b border-orange-100 px-4 lg:px-6 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-orange-600" />
            <p className="text-sm text-orange-800 font-medium">
              13 days left in free trial - 
              <Link to="/settings/billing" className="underline ml-1 hover:text-orange-900 font-semibold">
                Upgrade now
              </Link>
            </p>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden lg:block bg-white border-b border-gray-200 px-6 py-5">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-display font-semibold text-gray-900">{getGreeting()}, {getUserDisplayName()}.</h1>
              <p className="text-sm text-gray-600 mt-1">Here's how your business is doing today.</p>
            </div>
            <div className="relative" ref={newMenuRef}>
              <button
                onClick={() => setShowNewMenu(!showNewMenu)}
                className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 hover:bg-primary-700 transition-colors duration-200"
              >
                <span>NEW</span>
                <Plus className="w-4 h-4" />
              </button>
              {showNewMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  {newOptions.map((option, index) => (
                    <div
                      key={index}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleNewOptionClick(option)}
                      onKeyDown={(e) => e.key === 'Enter' && handleNewOptionClick(option)}
                      className="w-full px-4 py-3 hover:bg-gray-50 cursor-pointer select-none active:bg-gray-100 border-b border-gray-100 last:border-0"
                    >
                      <div className="flex items-center space-x-3">
                        <option.icon className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-700">{option.title}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Header Content */}
        <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-display font-semibold text-gray-900">{getGreeting()}, {getUserDisplayName()}.</h1>
              <p className="text-sm text-gray-600 mt-1">Here's how your business is doing today.</p>
            </div>
            <div className="relative" ref={newMenuRef}>
              <button
                onClick={() => setShowNewMenu(!showNewMenu)}
                className="bg-primary-600 text-white px-3 py-2 rounded-lg text-sm font-medium flex items-center space-x-1 hover:bg-primary-700 transition-colors duration-200"
              >
                <Plus className="w-4 h-4" />
                <span>New</span>
              </button>
              {showNewMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  {newOptions.map((option, index) => (
                    <div
                      key={index}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleNewOptionClick(option)}
                      onKeyDown={(e) => e.key === 'Enter' && handleNewOptionClick(option)}
                      className="w-full px-4 py-3 hover:bg-gray-50 cursor-pointer select-none active:bg-gray-100 border-b border-gray-100 last:border-0"
                    >
                      <div className="flex items-center space-x-3">
                        <option.icon className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-700">{option.title}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-auto">
          <div className="p-4 lg:p-6">
            <div className="max-w-7xl mx-auto space-y-6 lg:space-y-8">
              {/* Error Display */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <AlertTriangle className="h-5 w-5 text-red-400" />
                    </div>
                    <div className="ml-3 flex-1">
                      <h3 className="text-sm font-medium text-red-800">{error}</h3>
                      <p className="mt-1 text-sm text-red-700">
                        Please check your connection and try refreshing the page.
                      </p>
                    </div>
                    <div className="ml-3">
                      <button
                        onClick={fetchDashboardData}
                        disabled={isLoading}
                        className="bg-red-100 text-red-800 px-3 py-1 rounded text-sm font-medium hover:bg-red-200 disabled:opacity-50"
                      >
                        {isLoading ? `Retrying...${retryCount > 0 ? ` (${retryCount})` : ''}` : 'Retry'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {/* Setup Section - STRICTLY HIDDEN: Only shows for completely new users with ZERO activity */}
              {setupCheckCompleted && 
               showSetupSection && 
               !setupSectionDismissed && 
               (dashboardData?.totalServices === 0) && 
               (dashboardData?.totalJobs === 0) && 
               (dashboardData?.totalTeamMembers === 0) && (
                <div className="bg-white rounded-xl border border-gray-200 p-4 lg:p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <h2 className="text-lg font-display font-semibold text-gray-900">Finish setting up your account</h2>
                      <span className="text-sm text-gray-500">{setupTasks.filter(task => !task.hidden).filter(task => task.completed).length}/{setupTasks.filter(task => !task.hidden).length} completed</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          console.log('🧪 Manual setup section dismissal')
                          dismissSetupSection()
                        }}
                        className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
                        title="Hide setup section permanently"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                      <span>Setup Progress</span>
                      <span>{Math.round((setupTasks.filter(task => !task.hidden).filter(task => task.completed).length / setupTasks.filter(task => !task.hidden).length) * 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${(setupTasks.filter(task => !task.hidden).filter(task => task.completed).length / setupTasks.filter(task => !task.hidden).length) * 100}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="space-y-3 lg:space-y-4">
                    {setupTasks.filter(task => !task.hidden).map((task, index) => (
                      <Link to={task.link} key={index}>
                        <div className="flex items-start space-x-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200 group relative">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${task.completed ? 'bg-green-50' : 'bg-primary-50'}`}>
                            {task.completed ? (
                              <Check className="w-4 h-4 text-green-600" />
                            ) : (
                              <task.icon className="w-4 h-4 text-primary-600" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-medium text-gray-900">{task.title}</h3>
                            <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                          </div>
                          <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-primary-600 transition-colors duration-200" />
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Today Section */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 lg:p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 space-y-4 lg:space-y-0">
                  <div className="flex items-center space-x-3">
                    <h2 className="text-lg font-display font-semibold text-gray-900">Today</h2>
                    <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                      {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    <button
                      onClick={fetchDashboardData}
                      disabled={isLoading}
                      className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                      title="Refresh dashboard data"
                    >
                      <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-6 lg:flex lg:items-center lg:space-x-12">
                    <div className="text-center">
                      <div className="text-xl lg:text-2xl font-bold text-gray-900">{dashboardData.todayJobs}</div>
                      <div className="text-gray-600 text-sm mt-1">Jobs</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl lg:text-2xl font-bold text-gray-900">{Math.floor(dashboardData.todayDuration / 60)}h {dashboardData.todayDuration % 60}m</div>
                      <div className="text-gray-600 text-sm mt-1">Duration</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl lg:text-2xl font-bold text-gray-900">${dashboardData.todayEarnings.toLocaleString()}</div>
                      <div className="text-gray-600 text-sm mt-1">Earnings</div>
                    </div>
                  </div>
                </div>

                {/* Today's Jobs Map */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                  <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Today's Jobs Map</h3>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500">{dashboardData.todayJobs} jobs</span>
                    <div className="flex bg-gray-100 rounded-lg p-1">
                        <button 
                          onClick={() => setMapView('map')}
                          className={`px-3 py-1 font-medium rounded-md shadow-sm text-sm transition-colors ${
                            mapView === 'map' 
                              ? 'bg-white text-gray-900' 
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          Map
                        </button>
                        <button 
                          onClick={() => setMapView('satellite')}
                          className={`px-3 py-1 font-medium rounded-md shadow-sm text-sm transition-colors ${
                            mapView === 'satellite' 
                              ? 'bg-white text-gray-900' 
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          Satellite
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="h-64">
                    {dashboardData.todayJobs > 0 ? (
                      <div className="h-full">
                        {mapView === 'map' ? (
                          /* Interactive Map View */
                          <div className="h-full relative">
                      <iframe
                        width="100%"
                        height="100%"
                        frameBorder="0"
                        style={{ border: 0 }}
                              src={generateMapUrl(todayJobsList, 'roadmap')}
                        allowFullScreen
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                              title="Today's Jobs Map"
                            />
                            
                            {/* Job Legend Overlay */}
                            <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-3 max-w-xs">
                              <h4 className="text-sm font-semibold text-gray-900 mb-2">Today's Jobs</h4>
                              <div className="space-y-2 max-h-32 overflow-y-auto">
                                {todayJobsList.map((job, index) => {
                                  const markerLabel = String.fromCharCode(65 + index) // A, B, C, etc.
                                  const markerColor = job.status === 'completed' ? 'green' : 
                                                     job.status === 'in_progress' ? 'blue' : 
                                                     job.status === 'confirmed' ? 'yellow' : 'red'
                                  
                                  return (
                                    <div key={job.id || index} className="flex items-center space-x-2 text-xs">
                                      <div className={`w-4 h-4 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${
                                        markerColor === 'green' ? 'bg-green-500' :
                                        markerColor === 'blue' ? 'bg-blue-500' :
                                        markerColor === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'
                                      }`}>
                                        {markerLabel}
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <p className="font-medium text-gray-900 truncate">
                                          {job.service_name || 'Service'}
                                        </p>
                                        <p className="text-gray-500 truncate">
                                          {job.customer_first_name} {job.customer_last_name}
                                        </p>
                                        {job.customer_address && (
                                          <p className="text-gray-400 truncate text-xs">
                                            📍 {job.customer_address}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          </div>
                        ) : (
                          /* Satellite Map View */
                          <div className="h-full relative">
                            <iframe
                              width="100%"
                              height="100%"
                              frameBorder="0"
                              style={{ border: 0 }}
                              src={generateMapUrl(todayJobsList, 'satellite')}
                              allowFullScreen
                              loading="lazy"
                              referrerPolicy="no-referrer-when-downgrade"
                              title="Today's Jobs Satellite Map"
                            />
                            
                            {/* Job Legend Overlay */}
                            <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-3 max-w-xs">
                              <h4 className="text-sm font-semibold text-gray-900 mb-2">Today's Jobs</h4>
                              <div className="space-y-2 max-h-32 overflow-y-auto">
                                {todayJobsList.map((job, index) => {
                                  const markerLabel = String.fromCharCode(65 + index) // A, B, C, etc.
                                  const markerColor = job.status === 'completed' ? 'green' : 
                                                     job.status === 'in_progress' ? 'blue' : 
                                                     job.status === 'confirmed' ? 'yellow' : 'red'
                                  
                                  return (
                                    <div key={job.id || index} className="flex items-center space-x-2 text-xs">
                                      <div className={`w-4 h-4 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${
                                        markerColor === 'green' ? 'bg-green-500' :
                                        markerColor === 'blue' ? 'bg-blue-500' :
                                        markerColor === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'
                                      }`}>
                                        {markerLabel}
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <p className="font-medium text-gray-900 truncate">
                                          {job.service_name || 'Service'}
                                        </p>
                                        <p className="text-gray-500 truncate">
                                          {job.customer_first_name} {job.customer_last_name}
                                        </p>
                                        {job.customer_address && (
                                          <p className="text-gray-400 truncate text-xs">
                                            📍 {job.customer_address}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center bg-gray-50">
                        <div className="text-center">
                          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-3 mx-auto shadow-sm">
                            <Calendar className="w-6 h-6 text-gray-400" />
                          </div>
                          <p className="text-gray-900 font-medium">No jobs today</p>
                          <p className="text-gray-600 text-sm mt-1">Create your first job to get started</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Overview Section */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 lg:p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 space-y-2 lg:space-y-0">
                  <div className="flex items-center space-x-3">
                    <h2 className="text-lg font-display font-semibold text-gray-900">Overview</h2>
                    <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                      {new Date(Date.now() - (dateRange * 24 * 60 * 60 * 1000)).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} 
                      - Today
                    </span>
                  </div>
                  <select 
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                    className="form-select rounded-lg border-gray-200 text-sm text-gray-600 hover:text-gray-900 transition-colors duration-200 cursor-pointer"
                  >
                    <option value="7">Last 7 days</option>
                    <option value="30">Last 30 days</option>
                    <option value="90">Last 90 days</option>
                    <option value="365">Last year</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {/* New jobs */}
                  <div className="space-y-4 p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <BarChart2 className="w-5 h-5 text-primary-600" />
                        <h3 className="text-sm font-medium text-gray-900">New jobs</h3>
                      </div>
                      <Info className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help transition-colors duration-200" />
                    </div>
                    {isLoading ? (
                      <div className="animate-pulse space-y-4">
                        <div className="h-8 bg-gray-200 rounded w-16"></div>
                        <div className="h-2 bg-gray-200 rounded-full"></div>
                      </div>
                    ) : (
                      <>
                        <div className="text-3xl font-bold text-gray-900">{dashboardData.newJobs}</div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-2 bg-primary-600 rounded-full" style={{ width: `${(dashboardData.newJobs / dashboardData.totalJobs) * 100}%` }}></div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Jobs */}
                  <div className="space-y-4 p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <RefreshCw className="w-5 h-5 text-primary-600" />
                        <h3 className="text-sm font-medium text-gray-900">Jobs</h3>
                      </div>
                      <Info className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help transition-colors duration-200" />
                    </div>
                    {isLoading ? (
                      <div className="animate-pulse space-y-4">
                        <div className="h-8 bg-gray-200 rounded w-16"></div>
                        <div className="h-2 bg-gray-200 rounded-full"></div>
                      </div>
                    ) : (
                      <>
                        <div className="text-3xl font-bold text-gray-900">{dashboardData.totalJobs}</div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-2 bg-primary-600 rounded-full" style={{ width: `${(dashboardData.totalJobs / Math.max(dashboardData.totalJobs, 1)) * 100}%` }}></div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* New recurring bookings */}
                  <div className="space-y-4 p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-5 h-5 text-primary-600" />
                        <h3 className="text-sm font-medium text-gray-900">New recurring bookings</h3>
                      </div>
                      <Info className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help transition-colors duration-200" />
                    </div>
                    <div className="text-3xl font-bold text-gray-900">{dashboardData.newRecurringBookings}</div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-2 bg-primary-600 rounded-full" style={{ width: `${(dashboardData.newRecurringBookings / dashboardData.recurringBookings) * 100}%` }}></div>
                    </div>
                  </div>

                  {/* Recurring bookings */}
                  <div className="space-y-4 p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <RefreshCw className="w-5 h-5 text-primary-600" />
                        <h3 className="text-sm font-medium text-gray-900">Recurring bookings</h3>
                      </div>
                      <Info className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help transition-colors duration-200" />
                    </div>
                    <div className="text-3xl font-bold text-gray-900">{dashboardData.recurringBookings}</div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-2 bg-primary-600 rounded-full" style={{ width: `${(dashboardData.recurringBookings / Math.max(dashboardData.recurringBookings, 1)) * 100}%` }}></div>
                    </div>
                  </div>

                  {/* Job value */}
                  <div className="space-y-4 p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <CreditCard className="w-5 h-5 text-primary-600" />
                        <h3 className="text-sm font-medium text-gray-900">Avg job value</h3>
                      </div>
                      <Info className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help transition-colors duration-200" title="Average value per job (total revenue ÷ number of jobs)" />
                    </div>
                    <div className="text-3xl font-bold text-gray-900">${dashboardData.jobValue.toLocaleString()}</div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-2 bg-primary-600 rounded-full" style={{ width: `${Math.min((dashboardData.jobValue / dashboardData.maxJobValue) * 100, 100)}%` }}></div>
                    </div>
                  </div>

                  {/* Payments collected */}
                  <div className="space-y-4 p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <CreditCard className="w-5 h-5 text-primary-600" />
                        <h3 className="text-sm font-medium text-gray-900">Total revenue</h3>
                      </div>
                      <Info className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help transition-colors duration-200" title="Total value of all jobs in the selected time period" />
                    </div>
                    <div className="text-3xl font-bold text-gray-900">${dashboardData.totalRevenue.toLocaleString()}</div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-2 bg-primary-600 rounded-full" style={{ width: `${Math.min((dashboardData.totalRevenue / dashboardData.maxRevenue) * 100, 100)}%` }}></div>
                    </div>
                  </div>
                </div>

                {/* Rating Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8 pt-8 border-t border-gray-200">
                  {/* Average feedback rating */}
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Star className="w-5 h-5 text-primary-600" />
                        <h3 className="text-sm font-medium text-gray-900">Average feedback rating</h3>
                      </div>
                      <Info className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help transition-colors duration-200" />
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-3xl font-bold text-gray-900">0.0</span>
                      <div className="flex space-x-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star key={star} className="w-5 h-5 text-gray-300" />
                        ))}
                      </div>
                    </div>
                    <div className="space-y-4 p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900">Total ratings</span>
                        <span className="text-2xl font-bold text-gray-900">0</span>
                      </div>
                    </div>
                    <div className="space-y-4 p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-900">Recent ratings</span>
                      </div>
                      <div className="text-center py-4">
                        <p className="text-gray-900 font-medium">No data to display</p>
                        <p className="text-gray-600 text-sm mt-1">Try changing the date range filter</p>
                      </div>
                    </div>
                  </div>

                  {/* Rating breakdown */}
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <BarChart2 className="w-5 h-5 text-primary-600" />
                        <h3 className="text-sm font-medium text-gray-900">Rating breakdown</h3>
                      </div>
                      <Info className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help transition-colors duration-200" />
                    </div>
                    <div className="space-y-3">
                      {ratingBreakdown.map((rating) => (
                        <div key={rating.stars} className="flex items-center space-x-4">
                          <div className="flex items-center space-x-1 w-20">
                            <span className="text-sm font-medium text-gray-900">{rating.stars}</span>
                            <Star className="w-4 h-4 text-gray-400" />
                          </div>
                          <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div className="bg-primary-600 h-2 rounded-full" style={{ width: "0%" }}></div>
                          </div>
                          <span className="text-sm font-medium text-gray-900 w-8 text-right">{rating.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Service territory performance */}
                <div className="mt-8 pt-8 border-t border-gray-200">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 space-y-2 lg:space-y-0">
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-5 h-5 text-primary-600" />
                      <h3 className="text-sm font-medium text-gray-900">Service territory performance</h3>
                      <Info className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help transition-colors duration-200" />
                    </div>
                    <div className="flex space-x-6 text-sm text-gray-600">
                      <span>Number of jobs</span>
                      <span>Job value</span>
                    </div>
                  </div>
                  <div className="text-center py-12 bg-gray-50 rounded-xl">
                    <p className="text-gray-900 font-medium">No data to display</p>
                    <p className="text-gray-600 text-sm mt-1">
                      Enable service territories to see a breakdown of job data by location
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ServiceFlowDashboard

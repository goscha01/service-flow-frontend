"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Sidebar from "../components/sidebar"
import MobileHeader from "../components/mobile-header"
import CustomerModal from "../components/customer-modal"
import CalendarPicker from "../components/CalendarPicker"
import { 
  Plus, 
  Info, 
  Star, 
  Calendar, 
  ArrowRight, 
  BarChart2, 
  Users, 
  MapPin, 
  Globe, 
  Check, 
  AlertTriangle
} from "lucide-react"
import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { jobsAPI, customersAPI, servicesAPI, invoicesAPI, teamAPI } from "../services/api"
import { normalizeAPIResponse } from "../utils/dataHandler"

const DashboardRedesigned = () => {
  const { user } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isWakingUp, setIsWakingUp] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [dateRange, setDateRange] = useState('7')
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date()
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  })
  const [showDatePicker, setShowDatePicker] = useState(false)
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
  const [mapView, setMapView] = useState('map')

  // Setup section state
  const [showSetupSection, setShowSetupSection] = useState(false)
  const [setupSectionDismissed, setSetupSectionDismissed] = useState(false)
  const [setupCheckCompleted, setSetupCheckCompleted] = useState(false)

  // Setup tasks
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
      description: "Create a test job from the admin to get a sense of how jobs work in Zenbooker.",
      completed: false,
      link: "/jobs",
      icon: BarChart2,
    },
    {
      number: 3,
      title: "Configure your booking and timeslot settings",
      description: "Tailor your booking options by setting availability, timeslot options, and how far in advance customers can book.",
      completed: false,
      link: "/settings/availability",
      icon: Calendar,
    },
    {
      number: 4,
      title: "Set your business hours",
      description: "Set your operating hours to ensure customers can book times when you're available.",
      completed: false,
      link: "/settings/availability",
      icon: Calendar,
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
      description: "Customize your booking site with your branding, and edit the text and content to match your business.",
      completed: false,
      link: "/online-booking",
      icon: Globe,
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

  // Function to get time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }
  
  // Function to get user's display name
  const getUserDisplayName = () => {
    if (!user) return 'Just'
    return user.firstName || user.name || user.email?.split('@')[0] || 'Just'
  }

  // Helper function to get today's date in local timezone
  const getTodayString = () => {
    const today = new Date()
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  }
  
  // Helper function to parse date string in local timezone
  const parseLocalDate = (dateString) => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  // Generate Google Maps URL with job markers
  const generateMapUrl = (jobs, mapType = 'roadmap') => {
    if (!jobs || jobs.length === 0) {
      return `https://www.google.com/maps/embed/v1/view?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&center=40.7128,-74.0060&zoom=11&maptype=${mapType}`
    }

    const jobsWithAddresses = jobs.filter(job => job.customer_address && job.customer_address.trim() !== '')
    
    if (jobsWithAddresses.length === 0) {
      return `https://www.google.com/maps/embed/v1/view?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&center=40.7128,-74.0060&zoom=11&maptype=${mapType}`
    }

    if (jobsWithAddresses.length === 1) {
      const address = encodeURIComponent(jobsWithAddresses[0].customer_address)
      return `https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${address}&zoom=14&maptype=${mapType}`
    }

    const addresses = jobsWithAddresses.map(job => job.customer_address).join('|')
    const encodedAddresses = encodeURIComponent(addresses)
    
    return `https://www.google.com/maps/embed/v1/search?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${encodedAddresses}&zoom=10&maptype=${mapType}`
  }

  // Keepalive functionality
  useEffect(() => {
    const keepWarm = async () => {
      try {
        await fetch(`${process.env.REACT_APP_API_URL || 'https://service-flow-backend-production-4568.up.railway.app/api'}/health`, {
          method: 'HEAD',
        });
        console.log('✅ Backend keepalive ping');
      } catch (error) {
        console.log('⚠️ Keepalive ping failed (normal if backend is sleeping)');
      }
    };

    keepWarm();
    const keepaliveInterval = setInterval(keepWarm, 10 * 60 * 1000);
    return () => clearInterval(keepaliveInterval);
  }, []);

  // Check if backend is ready
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const backendUrl = process.env.REACT_APP_API_URL || 'https://service-flow-backend-production-4568.up.railway.app/api';
        await fetch(`${backendUrl}/health`, { method: 'HEAD' });
        setIsWakingUp(false);
        console.log('✅ Backend is ready');
      } catch (error) {
        console.log('⚠️ Backend not ready, retrying in 2 seconds...');
        setTimeout(checkBackend, 2000);
      }
    };
    
    checkBackend();
  }, [])

  const checkSetupTaskCompletion = useCallback(async (services, jobs, teamMembers) => {
    const updatedTasks = setupTasks.map(task => {
      let completed = false
      
      switch (task.number) {
        case 1: // Create your services
          completed = services && services.length > 0
          break
        case 2: // Create a test job
          completed = jobs && jobs.length > 0
          break
        case 3: // Configure booking settings
          completed = services && services.length > 0
          break
        case 4: // Set business hours
          completed = services && services.length > 0
          break
        case 5: // Set service area
          completed = jobs && jobs.length > 0
          break
        case 6: // Set up online booking site
          completed = services && services.length > 0
          break
        case 7: // Add team members
          completed = teamMembers && teamMembers.length > 0
          break
        default:
          completed = false
      }
      
      return { ...task, completed }
    })
    
    setSetupTasks(updatedTasks)
    
    // Show setup section for new users
    const hasAnyActivity = (services?.length || 0) > 0 || (jobs?.length || 0) > 0 || (teamMembers?.length || 0) > 0
    const isDismissed = localStorage.getItem('setupSectionDismissed') === 'true'
    
    if (!hasAnyActivity && !isDismissed) {
      setShowSetupSection(true)
    } else {
      setShowSetupSection(false)
    }
    
    setSetupCheckCompleted(true)
  }, [setupTasks])

  const fetchDashboardData = useCallback(async () => {
    if (!user?.id) {
      console.log('❌ No user ID available:', user)
      return
    }
    
    console.log('🔄 Starting dashboard data fetch for user:', user.id)
    
    try {
      setIsLoading(true)
      setError("")
      
      // Fetch jobs data
      console.log('🔄 Fetching jobs...')
      const jobsResponse = await jobsAPI.getAll(user.id, "", "", 1, 1000)
      console.log('✅ Jobs response:', jobsResponse)
      const jobs = normalizeAPIResponse(jobsResponse, 'jobs')
      
      // Fetch invoices data
      console.log('🔄 Fetching invoices...')
      const invoicesResponse = await invoicesAPI.getAll(user.id, { page: 1, limit: 1000 })
      console.log('✅ Invoices response:', invoicesResponse)
      const invoices = normalizeAPIResponse(invoicesResponse, 'invoices')
      
      // Fetch services data
      console.log('🔄 Fetching services...')
      const servicesResponse = await servicesAPI.getAll(user.id)
      console.log('✅ Services response:', servicesResponse)
      const services = normalizeAPIResponse(servicesResponse, 'services')
      
      // Fetch team members data
      let teamMembers = []
      try {
        console.log('🔄 Fetching team members...')
        const teamResponse = await teamAPI.getAll(user.id, { page: 1, limit: 1000 })
        console.log('✅ Team members response:', teamResponse)
        teamMembers = teamResponse.teamMembers || teamResponse || []
      } catch (teamError) {
        console.warn('⚠️ Team members fetch failed:', teamError.message)
        teamMembers = []
      }
      
      // Calculate today's data
      const selectedDateObj = new Date(selectedDate + 'T00:00:00')
      const selectedDayString = selectedDateObj.toLocaleDateString('en-CA')
      
      const todayJobs = jobs.filter(job => {
        let jobDateString = ''
        if (job.scheduled_date) {
          if (job.scheduled_date.includes('T')) {
            jobDateString = job.scheduled_date.split('T')[0]
          } else {
            jobDateString = job.scheduled_date.split(' ')[0]
          }
        }
        return jobDateString === selectedDayString
      })
      
      const todayEarnings = todayJobs.reduce((sum, job) => {
        const invoice = invoices.find(inv => 
          inv.job_id === job.id || 
          inv.jobId === job.id || 
          inv.job === job.id ||
          inv.id === job.invoice_id
        )
        
        const jobValue = parseFloat(invoice?.total_amount || invoice?.amount || invoice?.total || 
                                   job.total || job.price || job.service_price || 0)
        
        return sum + jobValue
      }, 0)
      
      const todayDuration = todayJobs.reduce((sum, job) => {
        return sum + (parseInt(job.service_duration || 0))
      }, 0)
      
      // Calculate date range data
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - (parseInt(dateRange) - 1))
      const startDateString = startDate.toISOString().split('T')[0]
      
      const rangeJobs = jobs.filter(job => {
        let jobDateString = ''
        if (job.scheduled_date) {
          if (job.scheduled_date.includes('T')) {
            jobDateString = job.scheduled_date.split('T')[0]
          } else {
            jobDateString = job.scheduled_date.split(' ')[0]
          }
        }
        return jobDateString >= startDateString
      })
      
      const newJobs = rangeJobs.filter(job => {
        let jobDateString = ''
        if (job.created_at) {
          if (job.created_at.includes('T')) {
            jobDateString = job.created_at.split('T')[0]
          } else {
            jobDateString = job.created_at.split(' ')[0]
          }
        }
        return jobDateString >= startDateString
      }).length
      
      const totalRevenue = rangeJobs.reduce((sum, job) => {
        const invoice = invoices.find(inv => 
          inv.job_id === job.id || 
          inv.jobId === job.id || 
          inv.job === job.id ||
          inv.id === job.invoice_id
        )
        
        const jobValue = parseFloat(invoice?.total_amount || invoice?.amount || invoice?.total || 
                                   job.total || job.price || job.service_price || 0)
        
        return sum + jobValue
      }, 0)
      
      const avgJobValue = rangeJobs.length > 0 ? Math.round((totalRevenue / rangeJobs.length) * 100) / 100 : 0
      
      const recurringJobs = jobs.filter(job => job.is_recurring === true)
      const newRecurringJobs = recurringJobs.filter(job => {
        let jobDateString = ''
        if (job.created_at) {
          if (job.created_at.includes('T')) {
            jobDateString = job.created_at.split('T')[0]
          } else {
            jobDateString = job.created_at.split(' ')[0]
          }
        }
        return jobDateString >= startDateString
      }).length
      
      const newDashboardData = {
        todayJobs: todayJobs.length,
        todayDuration: todayDuration,
        todayEarnings: todayEarnings,
        newJobs: newJobs,
        totalJobs: rangeJobs.length,
        totalServices: services.length,
        totalTeamMembers: teamMembers.length,
        newRecurringBookings: newRecurringJobs,
        recurringBookings: recurringJobs.length,
        jobValue: avgJobValue,
        customerSatisfaction: 0,
        totalRevenue: totalRevenue
      }
      
      console.log('✅ Dashboard data calculated:', newDashboardData)
      setDashboardData(newDashboardData)
      setTodayJobsList(todayJobs)
      
      // Check setup task completion
      await checkSetupTaskCompletion(services, jobs, teamMembers)
      
      setRetryCount(0)
      console.log('✅ Dashboard data fetch completed successfully')
      
    } catch (error) {
      console.error('❌ Error fetching dashboard data:', error)
      setError(`Failed to load dashboard data: ${error.message || 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }, [user, selectedDate, dateRange, checkSetupTaskCompletion])

  // Fetch dashboard data
  useEffect(() => {
    if (user?.id) {
      fetchDashboardData()
    }
  }, [user, dateRange, fetchDashboardData])

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
      const response = await customersAPI.create(customerData)
      return response.customer || response
    } catch (error) {
      console.error('Error creating customer:', error)
      throw error
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

  const dismissSetupSection = () => {
    setSetupSectionDismissed(true)
    setShowSetupSection(false)
    localStorage.setItem('setupSectionDismissed', 'true')
  }

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (newMenuRef.current && !newMenuRef.current.contains(event.target)) {
        if (event.target.closest('button') && event.target.closest('button').textContent.includes('NEW')) {
          return
        }
        setShowNewMenu(false)
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => {
      document.removeEventListener('click', handleClickOutside)
    }
  }, [])

  // Show loading state while backend is waking up
  if (isWakingUp) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Connecting to server...</h2>
          <p className="text-gray-600">Please wait while we wake up the backend</p>
        </div>
      </div>
    );
  }

  return (
    <>
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

        {/* Trial Banner - Orange */}
        <div className="bg-orange-500 text-white px-4 lg:px-6 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-white" />
            <p className="text-sm text-white font-medium">
              13 days left in free trial - 
              <Link to="/settings/billing" className="underline ml-1 hover:text-orange-100 font-semibold">
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
                <p className="text-sm text-gray-600 mt-1">Here's how Just_web is doing today.</p>
              </div>
              <div className="relative" ref={newMenuRef}>
                <button
                  onClick={() => setShowNewMenu(!showNewMenu)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 hover:bg-blue-700 transition-colors duration-200"
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
                <p className="text-sm text-gray-600 mt-1">Here's how Just_web is doing today.</p>
              </div>
              <div className="relative" ref={newMenuRef}>
                <button
                  onClick={() => setShowNewMenu(!showNewMenu)}
                  className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium flex items-center space-x-1 hover:bg-blue-700 transition-colors duration-200"
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
                {/* Debug Info */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center">
                    <Info className="w-5 h-5 text-blue-600 mr-2" />
                    <div>
                      <p className="text-blue-800 font-medium">Debug Info:</p>
                      <p className="text-blue-600 text-sm">User ID: {user?.id || 'Not logged in'}</p>
                      <p className="text-blue-600 text-sm">Loading: {isLoading ? 'Yes' : 'No'}</p>
                      <p className="text-blue-600 text-sm">Error: {error || 'None'}</p>
                    </div>
                  </div>
                </div>

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

                {/* Setup Section */}
                {setupCheckCompleted && showSetupSection && !setupSectionDismissed && (
                  <div className="bg-white rounded-xl border border-gray-200 p-6 lg:p-8 shadow-lg hover:shadow-xl transition-all duration-300">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center space-x-4">
                        <h2 className="text-xl font-bold text-gray-900">Finish setting up your account</h2>
                        <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                          {setupTasks.filter(task => task.completed).length}/{setupTasks.length} completed
                        </div>
                      </div>
                      <button
                        onClick={dismissSetupSection}
                        className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors"
                        title="Hide setup section permanently"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="mb-6">
                      <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                        <span>Setup Progress</span>
                        <span>{Math.round((setupTasks.filter(task => task.completed).length / setupTasks.length) * 100)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ 
                            width: `${(setupTasks.filter(task => task.completed).length / setupTasks.length) * 100}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                    
                    <div className="space-y-3 lg:space-y-4">
                      {setupTasks.map((task, index) => (
                        <Link to={task.link} key={index}>
                          <div className="flex items-start space-x-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200 group relative">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${task.completed ? 'bg-green-50' : 'bg-blue-50'}`}>
                              {task.completed ? (
                                <Check className="w-4 h-4 text-green-600" />
                              ) : (
                                <task.icon className="w-4 h-4 text-blue-600" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm font-medium text-gray-900">{task.title}</h3>
                              <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                            </div>
                            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors duration-200" />
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Today Section */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 lg:p-8 shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8 space-y-4 lg:space-y-0">
                    <div className="flex items-center space-x-4">
                      <h2 className="text-2xl font-bold text-gray-900">Today</h2>
                      <div className="relative">
                        <button
                          onClick={() => setShowDatePicker(!showDatePicker)}
                          className="flex items-center space-x-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-full transition-colors cursor-pointer border border-gray-200"
                        >
                          <Calendar className="w-4 h-4" />
                          <span className="font-medium">{parseLocalDate(selectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                        </button>
                        
                        <CalendarPicker
                          selectedDate={parseLocalDate(selectedDate)}
                          onDateSelect={(date) => {
                            const dateString = date.toISOString().split('T')[0];
                            setSelectedDate(dateString);
                            setShowDatePicker(false);
                          }}
                          isOpen={showDatePicker}
                          onClose={() => setShowDatePicker(false)}
                          position="bottom-left"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-8 lg:flex lg:items-center lg:space-x-16">
                    <div className="text-center">
                      <div className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">{dashboardData.todayJobs}</div>
                      <div className="text-gray-600 text-sm font-medium">Jobs</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">{Math.floor(dashboardData.todayDuration / 60)}h {dashboardData.todayDuration % 60}m</div>
                      <div className="text-gray-600 text-sm font-medium">Est. duration</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">${dashboardData.todayEarnings}</div>
                      <div className="text-gray-600 text-sm font-medium">Est. earnings</div>
                    </div>
                  </div>

                  {/* Today's Jobs Map */}
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-lg mt-8">
                    <div className="flex items-center justify-between p-6 border-b border-gray-200">
                      <h3 className="text-xl font-bold text-gray-900">
                        {selectedDate === getTodayString() ? "Today's Jobs Map" : `${parseLocalDate(selectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} Jobs Map`}
                      </h3>
                      <div className="flex items-center space-x-4">
                        <span className="text-sm text-gray-600 font-medium">{dashboardData.todayJobs} jobs</span>
                        <div className="flex bg-gray-100 rounded-lg p-1 border border-gray-200">
                          <button 
                            onClick={() => setMapView('map')}
                            className={`px-4 py-2 font-medium rounded-md shadow-sm text-sm transition-all duration-200 ${
                              mapView === 'map' 
                                ? 'bg-white text-gray-900 shadow-md' 
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                            }`}
                          >
                            Map
                          </button>
                          <button 
                            onClick={() => setMapView('satellite')}
                            className={`px-4 py-2 font-medium rounded-md shadow-sm text-sm transition-all duration-200 ${
                              mapView === 'satellite' 
                                ? 'bg-white text-gray-900 shadow-md' 
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
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
                          <iframe
                            width="100%"
                            height="100%"
                            frameBorder="0"
                            style={{ border: 0 }}
                            src={generateMapUrl(todayJobsList, mapView === 'map' ? 'roadmap' : 'satellite')}
                            allowFullScreen
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                            title="Today's Jobs Map"
                          />
                        </div>
                      ) : (
                        <div className="h-full relative">
                          <iframe
                            width="100%"
                            height="100%"
                            frameBorder="0"
                            style={{ border: 0 }}
                            src={generateMapUrl([], mapView === 'map' ? 'roadmap' : 'satellite')}
                            allowFullScreen
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                            title="US Map"
                          />
                          
                          {/* No Jobs Overlay */}
                          <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-3 max-w-xs">
                            <h4 className="text-sm font-semibold text-gray-900 mb-2">
                              {selectedDate === getTodayString() ? "No jobs today" : `No jobs on ${parseLocalDate(selectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                            </h4>
                            <p className="text-gray-600 text-sm">Looks like you don't have anything to do today.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Overview Section */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 lg:p-8 shadow-lg hover:shadow-xl transition-all duration-300 mt-12">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8 space-y-4 lg:space-y-0">
                    <div className="flex items-center space-x-4">
                      <h2 className="text-2xl font-bold text-gray-900">Overview Oct 18 - Today</h2>
                    </div>
                    
                    <div className="flex items-center space-x-2">
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
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {/* New jobs */}
                    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-gray-900">New jobs</h3>
                        <Info className="h-5 w-5 text-gray-400 hover:text-gray-600 cursor-help" />
                      </div>
                      <div className="text-4xl font-bold text-gray-900 mb-4">{dashboardData.newJobs}</div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div className="bg-blue-600 h-3 rounded-full transition-all duration-500" style={{ width: "100%" }}></div>
                      </div>
                    </div>

                    {/* Jobs */}
                    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-gray-900">Jobs</h3>
                        <Info className="h-5 w-5 text-gray-400 hover:text-gray-600 cursor-help" />
                      </div>
                      {dashboardData.totalJobs > 0 ? (
                        <>
                          <div className="text-4xl font-bold text-gray-900 mb-4">{dashboardData.totalJobs}</div>
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div className="bg-blue-600 h-3 rounded-full transition-all duration-500" style={{ width: "100%" }}></div>
                          </div>
                        </>
                      ) : (
                        <div className="text-center py-8">
                          <p className="text-gray-900 font-bold text-lg">No data to display</p>
                          <p className="text-gray-600 text-sm mt-2">
                            Try changing the date range filter at the top of the page
                          </p>
                        </div>
                      )}
                    </div>

                    {/* New recurring bookings */}
                    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-gray-900">New recurring bookings</h3>
                        <Info className="h-5 w-5 text-gray-400 hover:text-gray-600 cursor-help" />
                      </div>
                      <div className="text-4xl font-bold text-gray-900 mb-4">{dashboardData.newRecurringBookings}</div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div className="bg-blue-600 h-3 rounded-full transition-all duration-500" style={{ width: "100%" }}></div>
                      </div>
                    </div>

                    {/* Recurring bookings */}
                    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-gray-900">Recurring bookings</h3>
                        <Info className="h-5 w-5 text-gray-400 hover:text-gray-600 cursor-help" />
                      </div>
                      {dashboardData.recurringBookings > 0 ? (
                        <>
                          <div className="text-4xl font-bold text-gray-900 mb-4">{dashboardData.recurringBookings}</div>
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div className="bg-blue-600 h-3 rounded-full transition-all duration-500" style={{ width: "100%" }}></div>
                          </div>
                        </>
                      ) : (
                        <div className="text-center py-8">
                          <p className="text-gray-900 font-bold text-lg">No data to display</p>
                          <p className="text-gray-600 text-sm mt-2">
                            Try changing the date range filter at the top of the page
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Job value */}
                    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-gray-900">Job value</h3>
                        <Info className="h-5 w-5 text-gray-400 hover:text-gray-600 cursor-help" />
                      </div>
                      <div className="text-4xl font-bold text-gray-900 mb-4">${dashboardData.jobValue}</div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div className="bg-blue-600 h-3 rounded-full transition-all duration-500" style={{ width: "100%" }}></div>
                      </div>
                    </div>

                    {/* Payments collected */}
                    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-gray-900">Payments collected</h3>
                        <Info className="h-5 w-5 text-gray-400 hover:text-gray-600 cursor-help" />
                      </div>
                      <div className="text-4xl font-bold text-gray-900 mb-4">${dashboardData.totalRevenue}</div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div className="bg-blue-600 h-3 rounded-full transition-all duration-500" style={{ width: "100%" }}></div>
                      </div>
                    </div>
                  </div>

                  {/* Rating Section */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-12 pt-8 border-t border-gray-200">
                    {/* Average feedback rating */}
                    <div className="space-y-8">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Star className="w-6 h-6 text-blue-600" />
                          <h3 className="text-xl font-bold text-gray-900">Average feedback rating</h3>
                        </div>
                        <Info className="w-5 h-5 text-gray-400 hover:text-gray-600 cursor-help transition-colors duration-200" />
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className="text-5xl font-bold text-gray-900">0.0</span>
                        <div className="flex space-x-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star key={star} className="w-6 h-6 text-gray-300" />
                          ))}
                        </div>
                      </div>
                      <div className="space-y-6 p-6 bg-gray-50 rounded-xl border border-gray-200">
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-bold text-gray-900">Total ratings</span>
                          <span className="text-3xl font-bold text-gray-900">0</span>
                        </div>
                      </div>
                      <div className="space-y-6 p-6 bg-gray-50 rounded-xl border border-gray-200">
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-lg font-bold text-gray-900">Recent ratings</span>
                        </div>
                        <div className="text-center py-8">
                          <p className="text-gray-900 font-bold text-lg">No data to display</p>
                          <p className="text-gray-600 text-sm mt-2">Try changing the date range filter</p>
                        </div>
                      </div>
                    </div>

                    {/* Rating breakdown */}
                    <div className="space-y-8">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <BarChart2 className="w-6 h-6 text-blue-600" />
                          <h3 className="text-xl font-bold text-gray-900">Rating breakdown</h3>
                        </div>
                        <Info className="w-5 h-5 text-gray-400 hover:text-gray-600 cursor-help transition-colors duration-200" />
                      </div>
                      <div className="space-y-6">
                        {ratingBreakdown.map((rating) => (
                          <div key={rating.stars} className="flex items-center space-x-6">
                            <div className="flex items-center space-x-2 w-24">
                              <span className="text-lg font-bold text-gray-900">{rating.stars}</span>
                              <Star className="w-5 h-5 text-gray-400" />
                            </div>
                            <div className="flex-1 bg-gray-200 rounded-full h-4 overflow-hidden">
                              <div className="bg-blue-600 h-4 rounded-full transition-all duration-500" style={{ width: "0%" }}></div>
                            </div>
                            <span className="text-lg font-bold text-gray-900 w-12 text-right">{rating.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Service territory performance */}
                  <div className="mt-12 pt-8 border-t border-gray-200">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8 space-y-4 lg:space-y-0">
                      <div className="flex items-center space-x-3">
                        <MapPin className="w-6 h-6 text-blue-600" />
                        <h3 className="text-xl font-bold text-gray-900">Service territory performance</h3>
                        <Info className="w-5 h-5 text-gray-400 hover:text-gray-600 cursor-help transition-colors duration-200" />
                      </div>
                      <div className="flex space-x-8 text-lg text-gray-600">
                        <span className="font-bold text-gray-900">Number of jobs</span>
                        <span className="font-medium">Job value</span>
                      </div>
                    </div>
                    <div className="text-center py-16 bg-gray-50 rounded-xl border border-gray-200">
                      <p className="text-gray-900 font-bold text-xl">No data to display</p>
                      <p className="text-gray-600 text-lg mt-2">
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
    </>
  )
}

export default DashboardRedesigned

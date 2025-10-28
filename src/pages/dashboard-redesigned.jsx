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
      } catch (error) {
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
      } catch (error) {
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
      return
    }


    try {
      setIsLoading(true)
      setError("")

      // Fetch jobs data
      const jobsResponse = await jobsAPI.getAll(user.id, "", "", 1, 1000)
      const jobs = normalizeAPIResponse(jobsResponse, 'jobs')

      // Fetch invoices data
      const invoicesResponse = await invoicesAPI.getAll(user.id, { page: 1, limit: 1000 })
      const invoices = normalizeAPIResponse(invoicesResponse, 'invoices')

      // Fetch services data
      const servicesResponse = await servicesAPI.getAll(user.id)
      const services = normalizeAPIResponse(servicesResponse, 'services')

      // Fetch team members data
      let teamMembers = []
      try {
        const teamResponse = await teamAPI.getAll(user.id, { page: 1, limit: 1000 })
        teamMembers = teamResponse.teamMembers || teamResponse || []
      } catch (teamError) {
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

      setDashboardData(newDashboardData)
      setTodayJobsList(todayJobs)

      // Check setup task completion
      await checkSetupTaskCompletion(services, jobs, teamMembers)

      setRetryCount(0)

    } catch (error) {
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
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Connecting to server...</h2>
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

        {/* Trial Banner */}
        <div className="bg-amber-50 border-b border-amber-100 px-4 lg:px-6 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-center">
            <p className="text-sm text-gray-700">
              12 days left in free trial
            </p>
          </div>
        </div>

          {/* Desktop Header */}
          <div className="hidden lg:block bg-white border-b border-gray-200 px-6 py-5">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div>
                <h1 className="text-lg sm:text-xl font-display font-semibold text-gray-900">{getGreeting()}, {getUserDisplayName()}.</h1>
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
                <h1 className="text-lg sm:text-xl font-display font-semibold text-gray-900">{getGreeting()}, {getUserDisplayName()}.</h1>
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
          <div className="flex-1 overflow-auto bg-gray-50">
            <div className="p-6">
              <div className="max-w-5xl mx-auto space-y-4">

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
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-base font-semibold text-gray-900">Finish setting up your account</h2>
                      <button
                        onClick={dismissSetupSection}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        title="Dismiss"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    <div className="space-y-0">
                      {setupTasks.map((task, index) => (
                        <Link to={task.link} key={index}>
                          <div className="flex items-start p-4 hover:bg-gray-50 transition-colors duration-150 group border-b border-gray-100 last:border-0">
                            <div className="flex items-start space-x-3 flex-1 min-w-0">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                task.completed
                                  ? 'bg-green-500'
                                  : 'bg-white border-2 border-gray-300'
                              }`}>
                                {task.completed ? (
                                  <Check className="w-4 h-4 text-white" />
                                ) : (
                                  <span className="text-xs font-medium text-gray-600">{task.number}</span>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-medium text-gray-900 mb-0.5">{task.title}</h3>
                                <p className="text-sm text-gray-600">{task.description}</p>
                              </div>
                            </div>
                            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors flex-shrink-0 mt-0.5 ml-2" />
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Today Section */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <h2 className="text-base font-semibold text-gray-900">Today</h2>
                      <div className="relative">
                        <button
                          onClick={() => setShowDatePicker(!showDatePicker)}
                          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                        >
                          <Calendar className="w-4 h-4" />
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

                  <div className="grid grid-cols-3 gap-8 mb-6">
                    <div>
                      <div className="text-xs text-gray-600 mb-1">On the schedule</div>
                      <div className="text-2xl font-semibold text-gray-900">{dashboardData.todayJobs} jobs</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 mb-1">Est. duration</div>
                      <div className="text-2xl font-semibold text-gray-900">{Math.floor(dashboardData.todayDuration / 60)}h {dashboardData.todayDuration % 60}m</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 mb-1">Est. earnings</div>
                      <div className="text-2xl font-semibold text-gray-900">${dashboardData.todayEarnings}</div>
                    </div>
                  </div>

                  {/* Today's Jobs Map */}
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
                      <span className="text-sm font-medium text-gray-900">{dashboardData.todayJobs} jobs</span>
                      <div className="flex bg-white rounded-md shadow-sm border border-gray-200">
                        <button
                          onClick={() => setMapView('map')}
                          className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                            mapView === 'map'
                              ? 'bg-gray-100 text-gray-900'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          Map
                        </button>
                        <button
                          onClick={() => setMapView('satellite')}
                          className={`px-3 py-1.5 text-xs font-medium transition-colors border-l border-gray-200 ${
                            mapView === 'satellite'
                              ? 'bg-gray-100 text-gray-900'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          Satellite
                        </button>
                      </div>
                    </div>

                    <div className="h-80 relative bg-gray-50">
                      {dashboardData.todayJobs > 0 ? (
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
                      ) : (
                        <>
                          <iframe
                            width="100%"
                            height="100%"
                            frameBorder="0"
                            style={{ border: 0 }}
                            src={generateMapUrl([], mapView === 'map' ? 'roadmap' : 'satellite')}
                            allowFullScreen
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                            title="Map"
                          />

                          {/* No Jobs Overlay */}
                          <div className="absolute top-4 left-4 bg-white rounded-lg shadow-sm border border-gray-200 p-4 max-w-xs">
                            <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-lg mb-3">
                              <Calendar className="w-6 h-6 text-gray-400" />
                            </div>
                            <h4 className="text-sm font-semibold text-gray-900 mb-1">No scheduled jobs</h4>
                            <p className="text-xs text-gray-600">Looks like you don't have anything to do today.</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Overview Section */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-base font-semibold text-gray-900">Overview Oct 19 - Today</h2>

                    <select
                      value={dateRange}
                      onChange={(e) => setDateRange(e.target.value)}
                      className="text-sm border-gray-300 rounded-md text-gray-600 focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="7">Last 7 days</option>
                      <option value="30">Last 30 days</option>
                      <option value="90">Last 90 days</option>
                      <option value="365">Last year</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* New jobs */}
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-medium text-gray-900">New jobs</h3>
                        <Info className="h-4 w-4 text-gray-400" />
                      </div>
                      <div className="text-3xl font-semibold text-gray-900 mb-4">{dashboardData.newJobs}</div>
                      <div className="h-24 flex items-end">
                        <div className="w-full h-1 bg-gray-200 rounded-full">
                          <div className="h-1 bg-blue-600 rounded-full" style={{ width: "100%" }}></div>
                        </div>
                      </div>
                    </div>

                    {/* Jobs */}
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-medium text-gray-900">Jobs</h3>
                        <Info className="h-4 w-4 text-gray-400" />
                      </div>
                      {dashboardData.totalJobs > 0 ? (
                        <>
                          <div className="text-3xl font-semibold text-gray-900 mb-4">{dashboardData.totalJobs}</div>
                          <div className="h-24 flex items-end">
                            <div className="w-full h-1 bg-gray-200 rounded-full">
                              <div className="h-1 bg-blue-600 rounded-full" style={{ width: "100%" }}></div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="py-8">
                          <p className="text-sm font-medium text-gray-900">No data to display</p>
                          <p className="text-xs text-gray-500 mt-1">
                            Try changing the date range filter at the top of the page
                          </p>
                        </div>
                      )}
                    </div>

                    {/* New recurring bookings */}
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-medium text-gray-900">New recurring bookings</h3>
                        <Info className="h-4 w-4 text-gray-400" />
                      </div>
                      <div className="text-3xl font-semibold text-gray-900 mb-4">{dashboardData.newRecurringBookings}</div>
                      <div className="h-24 flex items-end">
                        <div className="w-full h-1 bg-gray-200 rounded-full">
                          <div className="h-1 bg-blue-600 rounded-full" style={{ width: "0%" }}></div>
                        </div>
                      </div>
                    </div>

                    {/* Recurring bookings */}
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-medium text-gray-900">Recurring bookings</h3>
                        <Info className="h-4 w-4 text-gray-400" />
                      </div>
                      {dashboardData.recurringBookings > 0 ? (
                        <>
                          <div className="text-3xl font-semibold text-gray-900 mb-4">{dashboardData.recurringBookings}</div>
                          <div className="h-24 flex items-end">
                            <div className="w-full h-1 bg-gray-200 rounded-full">
                              <div className="h-1 bg-blue-600 rounded-full" style={{ width: "100%" }}></div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="py-8">
                          <p className="text-sm font-medium text-gray-900">No data to display</p>
                          <p className="text-xs text-gray-500 mt-1">
                            Try changing the date range filter at the top of the page
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Job value */}
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-medium text-gray-900">Job value</h3>
                        <Info className="h-4 w-4 text-gray-400" />
                      </div>
                      <div className="text-3xl font-semibold text-gray-900 mb-4">${dashboardData.jobValue}</div>
                      <div className="h-24 flex items-end">
                        <div className="w-full h-1 bg-gray-200 rounded-full">
                          <div className="h-1 bg-blue-600 rounded-full" style={{ width: "0%" }}></div>
                        </div>
                      </div>
                    </div>

                    {/* Payments collected */}
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-medium text-gray-900">Payments collected</h3>
                        <Info className="h-4 w-4 text-gray-400" />
                      </div>
                      <div className="text-3xl font-semibold text-gray-900 mb-4">${dashboardData.totalRevenue}</div>
                      <div className="h-24 flex items-end">
                        <div className="w-full h-1 bg-gray-200 rounded-full">
                          <div className="h-1 bg-blue-600 rounded-full" style={{ width: "0%" }}></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Rating Section */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-6 border-t border-gray-200">
                    {/* Average feedback rating */}
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-gray-900">Average feedback rating</h3>
                        <Info className="h-4 w-4 text-gray-400" />
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="text-4xl font-semibold text-gray-900">0.0</span>
                        <div className="flex space-x-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star key={star} className="w-5 h-5 text-gray-300" />
                          ))}
                        </div>
                      </div>

                      <div className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-900">Total ratings</span>
                          <span className="text-2xl font-semibold text-gray-900">0</span>
                        </div>
                      </div>

                      <div className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-medium text-gray-900">Recent ratings</span>
                        </div>
                        <div className="text-center py-6">
                          <p className="text-sm font-medium text-gray-900">No data to display</p>
                          <p className="text-xs text-gray-500 mt-1">Try changing the date range filter at the top of the page</p>
                        </div>
                      </div>
                    </div>

                    {/* Rating breakdown */}
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-gray-900">Rating breakdown</h3>
                        <Info className="h-4 w-4 text-gray-400" />
                      </div>
                      <div className="space-y-4">
                        {ratingBreakdown.map((rating) => (
                          <div key={rating.stars} className="flex items-center gap-4">
                            <div className="flex items-center gap-2 w-20">
                              <span className="text-sm font-medium text-gray-900">{rating.stars}</span>
                              <Star className="w-4 h-4 text-gray-400" />
                            </div>
                            <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                              <div className="bg-blue-600 h-2 rounded-full" style={{ width: "0%" }}></div>
                            </div>
                            <span className="text-sm font-medium text-gray-900 w-8 text-right">{rating.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Service territory performance */}
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-medium text-gray-900">Service territory performance</h3>
                        <Info className="h-4 w-4 text-gray-400" />
                      </div>
                      <div className="flex items-center gap-6 text-sm">
                        <button className="font-medium text-gray-900">Number of jobs</button>
                        <button className="text-gray-500">Job value</button>
                      </div>
                    </div>
                    <div className="border border-gray-200 rounded-lg p-12 text-center">
                      <p className="text-sm font-medium text-gray-900">No data to display</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Enable <button className="text-blue-600 underline">service territories</button> to see a breakdown of job data by location
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

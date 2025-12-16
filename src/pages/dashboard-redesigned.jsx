"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import Sidebar from "../components/sidebar"
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
  AlertTriangle,
  BookAlert,
  Book,
  ChevronRight,
  ChevronDown
} from "lucide-react"
import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { jobsAPI, customersAPI, servicesAPI, invoicesAPI, teamAPI, territoriesAPI } from "../services/api"
import { normalizeAPIResponse } from "../utils/dataHandler"
import MiniChart from "../components/mini-chart"

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
  const [showDateRangeDropdown, setShowDateRangeDropdown] = useState(false)
  const [territoryViewMode, setTerritoryViewMode] = useState('jobs') // 'jobs' or 'value'
  const [territories, setTerritories] = useState([])
  const [error, setError] = useState("")
  const [retryCount, setRetryCount] = useState(0)
  const newMenuRef = useRef(null)
  const dateRangeDropdownRef = useRef(null)
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
    totalRevenue: 0,
    incompleteJobsToday: 0
  })

  // Chart data state for time-series
  const [chartData, setChartData] = useState({
    newJobs: [],
    totalJobs: [],
    newRecurringBookings: [],
    recurringBookings: [],
    jobValue: [],
    totalRevenue: []
  })

  // Territory performance data (unsorted)
  const [territoryPerformanceData, setTerritoryPerformanceData] = useState([])

  // Sort territory performance based on view mode
  const territoryPerformance = useMemo(() => {
    return [...territoryPerformanceData].sort((a, b) => {
      if (territoryViewMode === 'jobs') {
        return b.jobCount - a.jobCount
      } else {
        return b.totalValue - a.totalValue
      }
    })
  }, [territoryPerformanceData, territoryViewMode])

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

  // Handle click outside for date range dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dateRangeDropdownRef.current && !dateRangeDropdownRef.current.contains(event.target)) {
        setShowDateRangeDropdown(false);
      }
    };

    if (showDateRangeDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDateRangeDropdown])

  const checkSetupTaskCompletion = useCallback(async (services, jobs, teamMembers) => {
    setSetupTasks(prevTasks => {
      const updatedTasks = prevTasks.map(task => {
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
      return updatedTasks
    })

    // Show setup section for new users
    const hasAnyActivity = (services?.length || 0) > 0 || (jobs?.length || 0) > 0 || (teamMembers?.length || 0) > 0
    const isDismissed = localStorage.getItem('setupSectionDismissed') === 'true'

    if (!hasAnyActivity && !isDismissed) {
      setShowSetupSection(true)
    } else {
      setShowSetupSection(false)
    }

    setSetupCheckCompleted(true)
  }, [])

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

      // Fetch territories data
      let territoriesList = []
      try {
        const territoriesResponse = await territoriesAPI.getAll(user.id, { page: 1, limit: 1000 })
        territoriesList = normalizeAPIResponse(territoriesResponse, 'territories')
        setTerritories(territoriesList)
        console.log('Fetched territories:', territoriesList.length, territoriesList)
      } catch (territoryError) {
        console.error('Error fetching territories:', territoryError)
        territoriesList = []
        setTerritories([])
      }

      // Calculate data for the selected date
      const selectedDateObj = new Date(selectedDate + 'T00:00:00')
      const selectedDayString = selectedDateObj.toLocaleDateString('en-CA')

      // Get today's date string in YYYY-MM-DD format
      const today = new Date()
      const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

      // Filter jobs for the selected date
      const selectedDateJobs = jobs.filter(job => {
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

      // Calculate incomplete jobs from the past (scheduled before today, not completed or cancelled)
      const pastIncompleteJobs = jobs.filter(job => {
        // Get job date string
        let jobDateString = ''
        if (job.scheduled_date) {
          if (job.scheduled_date.includes('T')) {
            jobDateString = job.scheduled_date.split('T')[0]
          } else {
            jobDateString = job.scheduled_date.split(' ')[0]
          }
        }
        
        // Only include jobs from the past (before today)
        if (!jobDateString || jobDateString >= todayString) {
          return false
        }
        
        // Check if job is incomplete (not completed or cancelled)
        const status = (job.status || 'pending')?.toLowerCase().trim()
        const isCompleted = status === 'completed' || status === 'complete' || status === 'done' || status === 'finished'
        const isCancelled = status === 'cancelled' || status === 'canceled' || status === 'cancel'
        
        // Return true if job is from the past AND NOT completed and NOT cancelled
        return !isCompleted && !isCancelled
      })

      const todayEarnings = selectedDateJobs.reduce((sum, job) => {
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

      const todayDuration = selectedDateJobs.reduce((sum, job) => {
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
        todayJobs: selectedDateJobs.length,
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
        totalRevenue: totalRevenue,
        incompleteJobsToday: pastIncompleteJobs.length
      }

      setDashboardData(newDashboardData)
      setTodayJobsList(selectedDateJobs)

      // Calculate chart data for time-series
      const calculateChartData = () => {
        const days = parseInt(dateRange)
        // Determine number of data points based on range
        const chartDataPoints = days <= 7 ? days : (days <= 30 ? Math.ceil(days / 2) : Math.ceil(days / 7))
        const interval = days / chartDataPoints
        
        const chartStartDate = new Date()
        chartStartDate.setDate(chartStartDate.getDate() - (parseInt(dateRange) - 1))
        chartStartDate.setHours(0, 0, 0, 0)
        
        const newJobsData = []
        const totalJobsData = []
        const newRecurringData = []
        const recurringData = []
        const jobValueData = []
        const revenueData = []

        for (let i = 0; i < chartDataPoints; i++) {
          const periodStart = new Date(chartStartDate)
          periodStart.setDate(periodStart.getDate() + (i * interval))
          const periodStartString = periodStart.toISOString().split('T')[0]
          
          const periodEnd = new Date(periodStart)
          periodEnd.setDate(periodEnd.getDate() + interval)
          const periodEndString = periodEnd.toISOString().split('T')[0]
          
          // Get jobs scheduled in this period
          const periodJobs = rangeJobs.filter(job => {
            let jobDateString = ''
            if (job.scheduled_date) {
              if (job.scheduled_date.includes('T')) {
                jobDateString = job.scheduled_date.split('T')[0]
              } else {
                jobDateString = job.scheduled_date.split(' ')[0]
              }
            }
            return jobDateString >= periodStartString && jobDateString < periodEndString
          })

          // Get new jobs created in this period
          const periodNewJobs = rangeJobs.filter(job => {
            let jobDateString = ''
            if (job.created_at) {
              if (job.created_at.includes('T')) {
                jobDateString = job.created_at.split('T')[0]
              } else {
                jobDateString = job.created_at.split(' ')[0]
              }
            }
            return jobDateString >= periodStartString && jobDateString < periodEndString
          }).length

          // Get recurring jobs in this period
          const periodRecurring = periodJobs.filter(job => job.is_recurring === true)
          const periodNewRecurring = periodRecurring.filter(job => {
            let jobDateString = ''
            if (job.created_at) {
              if (job.created_at.includes('T')) {
                jobDateString = job.created_at.split('T')[0]
              } else {
                jobDateString = job.created_at.split(' ')[0]
              }
            }
            return jobDateString >= periodStartString && jobDateString < periodEndString
          }).length

          // Calculate revenue for this period
          const periodRevenue = periodJobs.reduce((sum, job) => {
            const invoice = invoices.find(inv =>
              inv.job_id === job.id ||
              inv.jobId === job.id ||
              inv.job === job.id ||
              inv.id === job.invoice_id
            )
            return sum + parseFloat(invoice?.total_amount || invoice?.amount || invoice?.total ||
                                   job.total || job.price || job.service_price || 0)
          }, 0)

          // Calculate average job value for this period
          const periodJobValue = periodJobs.length > 0 ? periodRevenue / periodJobs.length : 0

          newJobsData.push(periodNewJobs)
          totalJobsData.push(periodJobs.length)
          newRecurringData.push(periodNewRecurring)
          recurringData.push(periodRecurring.length)
          jobValueData.push(Math.round(periodJobValue * 100) / 100)
          revenueData.push(Math.round(periodRevenue * 100) / 100)
        }

        return {
          newJobs: newJobsData,
          totalJobs: totalJobsData,
          newRecurringBookings: newRecurringData,
          recurringBookings: recurringData,
          jobValue: jobValueData,
          totalRevenue: revenueData
        }
      }

      const calculatedChartData = calculateChartData()
      setChartData(calculatedChartData)

      // Calculate territory performance
      if (territoriesList && territoriesList.length > 0) {
        // Group jobs by territory
        const territoryStats = territoriesList.map(territory => {
          const territoryJobs = rangeJobs.filter(job => {
            // Check if job has territory_id or territory field
            const jobTerritoryId = job.territory_id || job.territory?.id || job.territory
            return jobTerritoryId === territory.id || jobTerritoryId === territory.id?.toString()
          })

          const jobCount = territoryJobs.length
          
          // Calculate total job value for this territory
          const totalValue = territoryJobs.reduce((sum, job) => {
            const invoice = invoices.find(inv =>
              inv.job_id === job.id ||
              inv.jobId === job.id ||
              inv.job === job.id ||
              inv.id === job.invoice_id
            )
            return sum + parseFloat(invoice?.total_amount || invoice?.amount || invoice?.total ||
                                   job.total || job.price || job.service_price || 0)
          }, 0)

          return {
            id: territory.id,
            name: territory.name,
            jobCount: jobCount,
            totalValue: totalValue
          }
        }).filter(stat => stat.jobCount > 0) // Only show territories with jobs

        // Calculate percentages
        const totalJobs = territoryStats.reduce((sum, stat) => sum + stat.jobCount, 0)
        const totalValue = territoryStats.reduce((sum, stat) => sum + stat.totalValue, 0)

        const territoryPerf = territoryStats.map(stat => ({
          ...stat,
          jobPercentage: totalJobs > 0 ? (stat.jobCount / totalJobs) * 100 : 0,
          valuePercentage: totalValue > 0 ? (stat.totalValue / totalValue) * 100 : 0
        }))
        
        setTerritoryPerformanceData(territoryPerf)
      } else {
        setTerritoryPerformanceData([])
      }

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


  return (
    <>
      <div className="flex min-h-screen">
        {/* Sidebar */}
        {/* Customer Modal */}
        <CustomerModal
          isOpen={showCustomerModal}
          onClose={() => setShowCustomerModal(false)}
          onSave={handleSaveCustomer}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Mobile Header */}

        {/* Trial Banner */}
        <div className="bg-amber-50 border m-2 sm:m-4 rounded-lg border-amber-500 px-5 lg:px-40 xl:px-44 2xl:px-48 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-center">
            <p className="text-sm text-gray-700">
              12 days left in free trial
            </p>
          </div>
        </div>

          {/* Desktop Header */}
          <div className="hidden lg:block px-5 lg:px-40 xl:px-44 2xl:px-48 py-5">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div>
                <h1 className="text-xl sm:text-xl font-display font-bold text-gray-900" style={{fontFamily: 'Montserrat', fontWeight: 700}}>{getGreeting()}, {getUserDisplayName()}.</h1>
                <p className="text-sm text-gray-600 mt-1 ">Here's how {getUserDisplayName()} is doing today.</p>
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

          {/* Main Content Area */}
          <div className="flex-1 bg-gray-50">
            <div className="px-5 lg:px-40 xl:px-44 2xl:px-48 py-4 sm:py-6 lg:py-8">
              <div className="max-w-7xl mx-auto space-y-4 min-w-0">

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
                  <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
                    <div className="flex items-center justify-between mb-4 sm:mb-6">
                      <h2 className="text-sm sm:text-base font-semibold text-gray-900">Finish setting up your account</h2>
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
                {/* Incomplete Jobs Section - Only show if there are incomplete jobs for the selected date */}
                {dashboardData.incompleteJobsToday && dashboardData.incompleteJobsToday > 0 ? (
                  <div 
                    onClick={() => navigate('/jobs?tab=incomplete')}
                    className="bg-white flex items-center justify-between rounded-lg border border-gray-200 px-3 sm:px-4 py-2.5 sm:py-3 cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <h2 className="text-sm sm:text-base font-medium text-gray-600 flex items-center gap-2">
                      <BookAlert className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span className="truncate">{dashboardData.incompleteJobsToday} {dashboardData.incompleteJobsToday === 1 ? 'Incomplete Job' : 'Incomplete Jobs'}</span>
                    </h2>
                    <button className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 ml-2">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                ) : null}
                
                {/* Today Section */}
                <div className="bg-white rounded-lg border border-gray-200 py-4 sm:py-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 sm:px-6 py-3 border-b border-gray-200 pb-3 gap-3 sm:gap-0">
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
                    <div className="flex gap-3 sm:gap-4 items-center justify-between sm:justify-end">
                      <div className="items-center justify-center text-center sm:text-left">
                        <div className="text-base sm:text-lg font-medium text-gray-900">{dashboardData.todayJobs} jobs</div>
                        <div className="text-xs text-gray-400">On the schedule</div>
                      </div>
                      <div className="items-center justify-center text-center sm:text-left">
                        <div className="text-base sm:text-lg font-medium text-gray-900">{Math.floor(dashboardData.todayDuration / 60)}h {dashboardData.todayDuration % 60}m</div>
                        <div className="text-xs text-gray-400">Est. duration</div>
                      </div>
                      <div className="items-center justify-center text-center sm:text-left">
                        <div className="text-base sm:text-lg font-medium text-gray-900">${dashboardData.todayEarnings}</div>
                        <div className="text-xs text-gray-400">Est. earnings</div>
                      </div>
                    </div>
                  </div>

                 

                  {/* Today's Jobs Map */}
                  <div className="border border-gray-200 flex flex-col md:flex-row overflow-hidden">
                   
                  {dashboardData.todayJobs > 0 && todayJobsList.length > 0 ? (
                    <div className="h-64 md:h-80 w-full md:w-1/2 relative bg-gray-50 overflow-y-auto">
                      <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
                        {todayJobsList.map((job) => {
                          const formatTime = (dateString) => {
                            if (!dateString) return 'Time not set'
                            let timePart = ''
                            if (dateString.includes('T')) {
                              timePart = dateString.split('T')[1]
                            } else {
                              timePart = dateString.split(' ')[1]
                            }
                            if (!timePart) return 'Time not set'
                            const [hours, minutes] = timePart.split(':')
                            const hour = parseInt(hours, 10)
                            const minute = parseInt(minutes, 10)
                            if (isNaN(hour) || isNaN(minute)) return 'Time not set'
                            const ampm = hour >= 12 ? 'PM' : 'AM'
                            const displayHour = hour % 12 || 12
                            const displayMinute = minute.toString().padStart(2, '0')
                            return `${displayHour}:${displayMinute} ${ampm}`
                          }
                          
                          const formatDate = (dateString) => {
                            if (!dateString) return ''
                            let jobDateString = ''
                            if (dateString.includes('T')) {
                              jobDateString = dateString.split('T')[0]
                            } else {
                              jobDateString = dateString.split(' ')[0]
                            }
                            const [year, month, day] = jobDateString.split('-')
                            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
                            return `${months[parseInt(month) - 1]} ${parseInt(day)}, ${year}`
                          }
                          
                          return (
                            <div
                              key={job.id}
                              onClick={() => navigate(`/job/${job.id}`)}
                              className="bg-white rounded-lg border border-gray-200 p-2.5 sm:p-3 cursor-pointer hover:shadow-md transition-shadow"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1">
                                    <span className="text-xs font-medium text-gray-500">Job #{job.id}</span>
                                    <span className={`text-xs px-1.5 sm:px-2 py-0.5 rounded ${
                                      job.status === 'completed' ? 'bg-green-100 text-green-700' :
                                      job.status === 'in_progress' || job.status === 'in-progress' ? 'bg-blue-100 text-blue-700' :
                                      job.status === 'confirmed' ? 'bg-purple-100 text-purple-700' :
                                      'bg-gray-100 text-gray-700'
                                    }`}>
                                      {job.status?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Pending'}
                                    </span>
                                  </div>
                                  <h4 className="text-xs sm:text-sm font-semibold text-gray-900 truncate">
                                    {job.service_name || 'Service'}
                                  </h4>
                                  <p className="text-xs text-gray-600 truncate">
                                    {job.customer_first_name && job.customer_last_name
                                      ? `${job.customer_first_name} ${job.customer_last_name}`
                                      : job.customer_email || 'Customer'}
                                  </p>
                                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mt-1 text-xs text-gray-500">
                                    <span>{formatTime(job.scheduled_date)}</span>
                                    {job.customer_address && (
                                      <span className="truncate max-w-full sm:max-w-[150px]">{job.customer_address}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="h-64 md:h-80 w-full md:w-1/2 relative bg-gray-50 flex flex-col items-center justify-center">
                      <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-lg mb-3 items-center justify-center">
                        <Calendar className="w-6 h-6 text-gray-400" />
                      </div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-1">No scheduled jobs</h4>
                      <p className="text-xs text-gray-600">Looks like you don't have anything to do today.</p>
                    </div>
                  )}
                    <div className="h-64 md:h-80 w-full md:w-1/2 relative bg-gray-50">
                    <div className="flex absolute mt-2 md:mt-7 right-2 md:right-4 bg-white rounded-md shadow-sm border border-gray-200 z-10">
                        <button
                          onClick={() => setMapView('map')}
                          className={`px-3 py-1.5 text-md font-medium transition-colors ${
                            mapView === 'map'
                              ? 'bg-gray-100 text-gray-900'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          Map
                        </button>
                        <button
                          onClick={() => setMapView('satellite')}
                          className={`px-3 py-1.5 text-md font-medium transition-colors border-l border-gray-200 ${
                            mapView === 'satellite'
                              ? 'bg-gray-100 text-gray-900'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          Satellite
                        </button>
                      </div>
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

                          
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Overview Section */}
                <div className="">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-3 sm:gap-0">
                    <h2 className="text-sm sm:text-md font-semibold text-gray-600">
                      <span className="text-gray-900 font-bold text-xl sm:text-2xl">Overview </span>
                      <span className="hidden sm:inline">
                        {(() => {
                          const daysAgo = parseInt(dateRange) - 1;
                          const startDate = new Date();
                          startDate.setDate(startDate.getDate() - daysAgo);
                          return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - Today`;
                        })()}
                      </span>
                    </h2>

                    {/* Custom Date Range Dropdown */}
                    <div className="relative" ref={dateRangeDropdownRef}>
                      <button
                        type="button"
                        onClick={() => setShowDateRangeDropdown(!showDateRangeDropdown)}
                        className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-md px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors duration-200 min-w-[120px] sm:min-w-[140px]"
                      >
                        <span>
                          {dateRange === '7' && 'Last 7 days'}
                          {dateRange === '30' && 'Last 4 weeks'}
                          {dateRange === '90' && 'Last 3 months'}
                          {dateRange === '365' && 'Last 12 months'}
                        </span>
                        <ChevronDown className={`w-4 h-4 text-gray-500 ml-2 transition-transform duration-200 ${showDateRangeDropdown ? 'transform rotate-180' : ''}`} />
                      </button>

                      {/* Dropdown Menu */}
                      {showDateRangeDropdown && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                          <button
                            type="button"
                            onClick={() => {
                              setDateRange('7');
                              setShowDateRangeDropdown(false);
                            }}
                            className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                              dateRange === '7' 
                                ? 'text-blue-600 font-medium' 
                                : 'text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            <span>Last 7 days</span>
                            {dateRange === '7' && <Check className="w-4 h-4 text-blue-600" />}
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => {
                              setDateRange('30');
                              setShowDateRangeDropdown(false);
                            }}
                            className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                              dateRange === '30' 
                                ? 'text-blue-600 font-medium' 
                                : 'text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            <span>Last 4 weeks</span>
                            {dateRange === '30' && <Check className="w-4 h-4 text-blue-600" />}
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => {
                              setDateRange('90');
                              setShowDateRangeDropdown(false);
                            }}
                            className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                              dateRange === '90' 
                                ? 'text-blue-600 font-medium' 
                                : 'text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            <span>Last 3 months</span>
                            {dateRange === '90' && <Check className="w-4 h-4 text-blue-600" />}
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => {
                              setDateRange('365');
                              setShowDateRangeDropdown(false);
                            }}
                            className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                              dateRange === '365' 
                                ? 'text-blue-600 font-medium' 
                                : 'text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            <span>Last 12 months</span>
                            {dateRange === '365' && <Check className="w-4 h-4 text-blue-600" />}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    {/* New jobs */}
                    <div className="border bg-white border-gray-200 rounded-lg p-3 sm:p-4">
                      <div className="flex items-center justify-between mb-2 sm:mb-3">
                        <h3 className="text-xs sm:text-sm font-medium text-gray-900">New jobs</h3>
                        <Info className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                      </div>
                      <div className="text-2xl sm:text-3xl font-semibold text-gray-900 mb-3 sm:mb-4">{dashboardData.newJobs}</div>
                      <MiniChart data={chartData.newJobs} color="blue" />
                    </div>

                    {/* Jobs */}
                    <div className="border bg-white border-gray-200 rounded-lg p-3 sm:p-4">
                      <div className="flex items-center justify-between mb-2 sm:mb-3">
                        <h3 className="text-xs sm:text-sm font-medium text-gray-900">Jobs</h3>
                        <Info className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                      </div>
                      {dashboardData.totalJobs > 0 ? (
                        <>
                          <div className="text-2xl sm:text-3xl font-semibold text-gray-900 mb-3 sm:mb-4">{dashboardData.totalJobs}</div>
                          <MiniChart data={chartData.totalJobs} color="blue" />
                        </>
                      ) : (
                        <div className="py-6 sm:py-8">
                          <p className="text-xs sm:text-sm font-medium text-gray-900">No data to display</p>
                          <p className="text-xs text-gray-500 mt-1">
                            Try changing the date range filter at the top of the page
                          </p>
                        </div>
                      )}
                    </div>

                    {/* New recurring bookings */}
                    <div className="border bg-white border-gray-200 rounded-lg p-3 sm:p-4">
                      <div className="flex items-center justify-between mb-2 sm:mb-3">
                        <h3 className="text-xs sm:text-sm font-medium text-gray-900">New recurring bookings</h3>
                        <Info className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                      </div>
                      <div className="text-2xl sm:text-3xl font-semibold text-gray-900 mb-3 sm:mb-4">{dashboardData.newRecurringBookings}</div>
                      <MiniChart data={chartData.newRecurringBookings} color="purple" />
                    </div>

                    {/* Recurring bookings */}
                    <div className="border bg-white border-gray-200 rounded-lg p-3 sm:p-4">
                      <div className="flex items-center justify-between mb-2 sm:mb-3">
                        <h3 className="text-xs sm:text-sm font-medium text-gray-900">Recurring bookings</h3>
                        <Info className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                      </div>
                      {dashboardData.recurringBookings > 0 ? (
                        <>
                          <div className="text-2xl sm:text-3xl font-semibold text-gray-900 mb-3 sm:mb-4">{dashboardData.recurringBookings}</div>
                          <MiniChart data={chartData.recurringBookings} color="purple" />
                        </>
                      ) : (
                        <div className="py-6 sm:py-8">
                          <p className="text-xs sm:text-sm font-medium text-gray-900">No data to display</p>
                          <p className="text-xs text-gray-500 mt-1">
                            Try changing the date range filter at the top of the page
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Job value */}
                    <div className="border bg-white border-gray-200 rounded-lg p-3 sm:p-4">
                      <div className="flex items-center justify-between mb-2 sm:mb-3">
                        <h3 className="text-xs sm:text-sm font-medium text-gray-900">Job value</h3>
                        <Info className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                      </div>
                      <div className="text-2xl sm:text-3xl font-semibold text-gray-900 mb-3 sm:mb-4">${dashboardData.jobValue}</div>
                      <MiniChart data={chartData.jobValue} color="green" />
                    </div>

                    {/* Payments collected */}
                    <div className="border bg-white border-gray-200 rounded-lg p-3 sm:p-4">
                      <div className="flex items-center justify-between mb-2 sm:mb-3">
                        <h3 className="text-xs sm:text-sm font-medium text-gray-900">Payments collected</h3>
                        <Info className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                      </div>
                      <div className="text-2xl sm:text-3xl font-semibold text-gray-900 mb-3 sm:mb-4">${dashboardData.totalRevenue}</div>
                      <MiniChart data={chartData.totalRevenue} color="indigo" />
                    </div>
                  </div>

                  {/* Rating Section */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-200">
                    {/* Left Card - Average feedback rating */}
                    <div className="bg-white border border-gray-200 rounded-lg">
                      {/* Top Section - Average feedback rating */}
                      <div className="p-3 sm:p-4 border-b border-gray-200">
                        <div className="flex items-center justify-between mb-3 sm:mb-4">
                        <h3 className="text-xs sm:text-sm font-medium text-gray-900">Average feedback rating</h3>
                          <div className="w-4 h-4 rounded-full bg-gray-100 flex items-center justify-center">
                            <Info className="h-3 w-3 text-gray-500" />
                          </div>
                      </div>
                      <div className="flex items-center space-x-2 sm:space-x-3">
                        <span className="text-3xl sm:text-4xl font-semibold text-gray-900">0.0</span>
                          <div className="flex space-x-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                              <Star key={star} className="w-4 h-4 sm:w-5 sm:h-5 text-gray-300 fill-none stroke-2" />
                          ))}
                          </div>
                        </div>
                      </div>

                      {/* Bottom Section - Total ratings */}
                      <div className="p-3 sm:p-4">
                        <div className="flex items-center justify-between mb-3 sm:mb-4">
                          <span className="text-xs sm:text-sm font-medium text-gray-900">Total ratings</span>
                          <div className="w-4 h-4 rounded-full bg-gray-100 flex items-center justify-center">
                            <Info className="h-3 w-3 text-gray-500" />
                        </div>
                      </div>
                        <span className="text-3xl sm:text-4xl font-semibold text-gray-900">0</span>
                      </div>
                    </div>

                    {/* Right Card - Rating breakdown */}
                    <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
                      <div className="flex items-center justify-between mb-4 sm:mb-6">
                        <h3 className="text-xs sm:text-sm font-medium text-gray-900">Rating breakdown</h3>
                        <div className="w-4 h-4 rounded-full bg-gray-100 flex items-center justify-center">
                          <Info className="h-3 w-3 text-gray-500" />
                      </div>
                            </div>
                      <div className="space-y-3 sm:space-y-4">
                        {ratingBreakdown.map((rating) => {
                          const maxCount = Math.max(...ratingBreakdown.map(r => r.count), 1)
                          const percentage = maxCount > 0 ? (rating.count / maxCount) * 100 : 0
                          return (
                            <div key={rating.stars} className="flex items-center gap-2 sm:gap-3">
                              <span className="text-xs sm:text-sm font-medium text-gray-900 w-12 sm:w-16 flex-shrink-0">{rating.stars} star</span>
                            <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden min-w-0">
                                {rating.count > 0 && (
                                  <div 
                                    className="bg-gray-400 h-2 rounded-full" 
                                    style={{ width: `${percentage}%` }}
                                  ></div>
                                )}
                            </div>
                            <span className="text-xs sm:text-sm font-medium text-gray-900 w-6 sm:w-8 text-right flex-shrink-0">{rating.count}</span>
                          </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Service territory performance */}
                  <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-200">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-3 sm:gap-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs sm:text-sm font-medium text-gray-900">Service territory performance</h3>
                        <div className="w-4 h-4 rounded-full bg-gray-100 flex items-center justify-center">
                          <Info className="h-3 w-3 text-gray-500" />
                      </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs sm:text-sm">
                        <button
                          type="button"
                          onClick={() => setTerritoryViewMode('jobs')}
                          className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                            territoryViewMode === 'jobs'
                              ? 'bg-blue-600 text-white'
                              : 'text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          Number of jobs
                        </button>
                        <button
                          type="button"
                          onClick={() => setTerritoryViewMode('value')}
                          className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                            territoryViewMode === 'value'
                              ? 'bg-blue-600 text-white'
                              : 'text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          Job value
                        </button>
                    </div>
                    </div>
                    
                    {territoryPerformance.length > 0 ? (
                      <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
                        <div className="space-y-3 sm:space-y-4">
                          {territoryPerformance.map((territory) => {
                            const percentage = territoryViewMode === 'jobs' 
                              ? territory.jobPercentage 
                              : territory.valuePercentage
                            const displayValue = territoryViewMode === 'jobs'
                              ? `${territory.jobCount} job${territory.jobCount !== 1 ? 's' : ''}`
                              : `$${territory.totalValue.toFixed(2)}`
                            
                            return (
                              <div key={territory.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                                <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                                  <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                  <span className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                                    {territory.name}
                                  </span>
                                  <span className="text-xs sm:text-sm text-gray-600 flex-shrink-0">
                                    {displayValue}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                                  <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden min-w-0">
                                    <div 
                                      className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                                      style={{ width: `${percentage}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-xs sm:text-sm font-medium text-gray-900 flex-shrink-0 min-w-[50px] sm:min-w-[60px] text-right">
                                    {percentage.toFixed(1)}%
                                  </span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white border border-gray-200 rounded-lg p-8 sm:p-12 text-center">
                      <p className="text-xs sm:text-sm font-medium text-gray-900">No data to display</p>
                      <p className="text-xs text-gray-500 mt-1">
                          {territories.length === 0 ? (
                            <>
                              Enable <button 
                                type="button"
                                onClick={() => navigate('/territories')}
                                className="text-blue-600 underline hover:text-blue-700"
                              >
                                service territories
                              </button> to see a breakdown of job data by location
                            </>
                          ) : (
                            'No jobs assigned to territories in the selected date range'
                          )}
                      </p>
                    </div>
                    )}
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

"use client"

import { useState, useEffect, useRef } from "react"
import Sidebar from "../components/sidebar"
import CustomerModal from "../components/customer-modal"
import { 
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  LinearProgress,
  Grid,
  Paper,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Alert,
  AlertTitle,
  Divider,
  Avatar,
  Stack,
  FormControl,
  Select,
  InputLabel,
  Tooltip,
  Rating,
  Fade,
  Collapse
} from "@mui/material"
import {
  Add as AddIcon,
  CalendarToday as CalendarIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon,
  Star as StarIcon,
  TrendingUp as TrendingUpIcon,
  People as PeopleIcon,
  Work as WorkIcon,
  Schedule as ScheduleIcon,
  AttachMoney as MoneyIcon,
  LocationOn as LocationIcon,
  Public as PublicIcon,
  Check as CheckIcon,
  Warning as WarningIcon,
  ArrowForward as ArrowForwardIcon,
  Map as MapIcon,
  Satellite as SatelliteIcon
} from "@mui/icons-material"
import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { jobsAPI, customersAPI, servicesAPI, invoicesAPI, teamAPI } from "../services/api"
import { normalizeAPIResponse, handleAPIError } from "../utils/dataHandler"

const DashboardMUI = () => {
  const { user } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isWakingUp, setIsWakingUp] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [dateRange, setDateRange] = useState('7')
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date()
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  })
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
      icon: PeopleIcon,
    },
    {
      number: 2,
      title: "Create a test job",
      description: "Create a test job from the admin to get a sense of how jobs work in Zenbooker.",
      completed: false,
      link: "/jobs",
      icon: WorkIcon,
    },
    {
      number: 3,
      title: "Configure your booking and timeslot settings",
      description: "Tailor your booking options by setting availability, timeslot options, and how far in advance customers can book.",
      completed: false,
      link: "/settings/availability",
      icon: ScheduleIcon,
    },
    {
      number: 4,
      title: "Set your business hours",
      description: "Set your operating hours to ensure customers can book times when you're available.",
      completed: false,
      link: "/settings/availability",
      icon: ScheduleIcon,
    },
    {
      number: 5,
      title: "Set your service area",
      description: "Set the locations where your business offers service.",
      completed: false,
      link: "/settings/service-areas",
      icon: LocationIcon,
    },
    {
      number: 6,
      title: "Set up your online booking site",
      description: "Customize your booking site with your branding, and edit the text and content to match your business.",
      completed: false,
      link: "/online-booking",
      icon: PublicIcon,
    },
    {
      number: 7,
      title: "Add your team members",
      description: "Invite your team and assign roles so everyone can manage bookings and provide services.",
      completed: false,
      link: "/team",
      icon: PeopleIcon,
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

  // Fetch dashboard data
  useEffect(() => {
    if (user?.id) {
      fetchDashboardData()
    }
  }, [user, dateRange])

  const fetchDashboardData = async () => {
    if (!user?.id) return
    
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
      
      setDashboardData(newDashboardData)
      setTodayJobsList(todayJobs)
      
      // Check setup task completion
      await checkSetupTaskCompletion(services, jobs, teamMembers)
      
      setRetryCount(0)
      
    } catch (error) {
      console.error('❌ Error fetching dashboard data:', error)
      setError(`Failed to load dashboard data: ${error.message || 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  const checkSetupTaskCompletion = async (services, jobs, teamMembers) => {
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
      const response = await customersAPI.create(customerData)
      return response.customer || response
    } catch (error) {
      console.error('Error creating customer:', error)
      throw error
    }
  }

  const newOptions = [
    { title: "Job", icon: WorkIcon },
    { title: "Customer", icon: PeopleIcon }
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
      <Box 
        display="flex" 
        height="100vh" 
        bgcolor="grey.50" 
        alignItems="center" 
        justifyContent="center"
      >
        <Box textAlign="center">
          <Box
            sx={{
              width: 48,
              height: 48,
              border: '2px solid',
              borderColor: 'primary.main',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              mx: 'auto',
              mb: 2
            }}
          />
          <Typography variant="h5" fontWeight="semibold" color="grey.900" gutterBottom>
            Connecting to server...
          </Typography>
          <Typography color="grey.600">
            Please wait while we wake up the backend
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <>
      <Box display="flex" height="100vh" bgcolor="grey.50" overflow="hidden">
        {/* Sidebar */}
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Customer Modal */}
        <CustomerModal
          isOpen={showCustomerModal}
          onClose={() => setShowCustomerModal(false)}
          onSave={handleSaveCustomer}
        />

        {/* Main Content */}
        <Box flex={1} display="flex" flexDirection="column" minWidth={0} sx={{ ml: { lg: '256px', xl: '288px' } }}>
          {/* Mobile Header */}

          {/* Trial Banner - Orange */}
          <Alert 
            severity="warning" 
            sx={{ 
              bgcolor: 'orange.50', 
              borderColor: 'orange.100',
              '& .MuiAlert-icon': { color: 'orange.600' },
              '& .MuiAlert-message': { color: 'orange.800' }
            }}
          >
            <AlertTitle sx={{ color: 'orange.800', fontWeight: 'medium' }}>
              13 days left in free trial - 
              <Link to="/settings/billing" style={{ textDecoration: 'underline', marginLeft: 4, fontWeight: 'bold' }}>
                Upgrade now
              </Link>
            </AlertTitle>
          </Alert>

          {/* Desktop Header */}
          <Box 
            display={{ xs: 'none', lg: 'block' }} 
            bgcolor="white" 
            borderBottom="1px solid" 
            borderColor="grey.200" 
            px={3} 
            py={2.5}
          >
            <Box maxWidth="7xl" mx="auto" display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="h4" fontWeight="semibold" color="grey.900">
                  {getGreeting()}, {getUserDisplayName()}.
                </Typography>
                <Typography variant="body2" color="grey.600" mt={0.5}>
                  Here's how Just_web is doing today.
                </Typography>
              </Box>
              <Box position="relative" ref={newMenuRef}>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setShowNewMenu(!showNewMenu)}
                  sx={{
                    bgcolor: 'primary.main',
                    color: 'white',
                    px: 2,
                    py: 1,
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 'medium',
                    '&:hover': { bgcolor: 'primary.dark' }
                  }}
                >
                  NEW
                </Button>
                <Menu
                  open={showNewMenu}
                  onClose={() => setShowNewMenu(false)}
                  anchorEl={newMenuRef.current}
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                >
                  {newOptions.map((option, index) => (
                    <MenuItem 
                      key={index}
                      onClick={() => handleNewOptionClick(option)}
                      sx={{ minWidth: 200 }}
                    >
                      <ListItemIcon>
                        <option.icon fontSize="small" color="action" />
                      </ListItemIcon>
                      <ListItemText primary={option.title} />
                    </MenuItem>
                  ))}
                </Menu>
              </Box>
            </Box>
          </Box>

          {/* Mobile Header Content */}
          <Box 
            display={{ xs: 'block', lg: 'none' }} 
            bgcolor="white" 
            borderBottom="1px solid" 
            borderColor="grey.200" 
            px={2} 
            py={2}
          >
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="h5" fontWeight="semibold" color="grey.900">
                  {getGreeting()}, {getUserDisplayName()}.
                </Typography>
                <Typography variant="body2" color="grey.600" mt={0.5}>
                  Here's how Just_web is doing today.
                </Typography>
              </Box>
              <Box position="relative" ref={newMenuRef}>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setShowNewMenu(!showNewMenu)}
                  size="small"
                  sx={{
                    bgcolor: 'primary.main',
                    color: 'white',
                    px: 1.5,
                    py: 1,
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 'medium',
                    '&:hover': { bgcolor: 'primary.dark' }
                  }}
                >
                  New
                </Button>
                <Menu
                  open={showNewMenu}
                  onClose={() => setShowNewMenu(false)}
                  anchorEl={newMenuRef.current}
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                >
                  {newOptions.map((option, index) => (
                    <MenuItem 
                      key={index}
                      onClick={() => handleNewOptionClick(option)}
                      sx={{ minWidth: 200 }}
                    >
                      <ListItemIcon>
                        <option.icon fontSize="small" color="action" />
                      </ListItemIcon>
                      <ListItemText primary={option.title} />
                    </MenuItem>
                  ))}
                </Menu>
              </Box>
            </Box>
          </Box>

          {/* Main Content Area */}
          <Box flex={1} overflow="auto">
            <Box p={{ xs: 2, lg: 3 }}>
              <Box maxWidth="7xl" mx="auto" spacing={3}>
                {/* Error Display */}
                {error && (
                  <Alert 
                    severity="error" 
                    action={
                      <Button 
                        color="inherit" 
                        size="small" 
                        onClick={fetchDashboardData}
                        disabled={isLoading}
                      >
                        {isLoading ? `Retrying...${retryCount > 0 ? ` (${retryCount})` : ''}` : 'Retry'}
                      </Button>
                    }
                    sx={{ mb: 3 }}
                  >
                    <AlertTitle>{error}</AlertTitle>
                    Please check your connection and try refreshing the page.
                  </Alert>
                )}

                {/* Setup Section */}
                <Collapse in={setupCheckCompleted && showSetupSection && !setupSectionDismissed}>
                  <Card sx={{ mb: 3, boxShadow: 1, '&:hover': { boxShadow: 2 } }}>
                    <CardContent>
                      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                        <Box display="flex" alignItems="center" gap={1.5}>
                          <Typography variant="h6" fontWeight="semibold" color="grey.900">
                            Finish setting up your account
                          </Typography>
                          <Chip 
                            label={`${setupTasks.filter(task => task.completed).length}/${setupTasks.length} completed`}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        </Box>
                        <IconButton 
                          onClick={dismissSetupSection}
                          size="small"
                          sx={{ color: 'grey.400', '&:hover': { color: 'grey.600', bgcolor: 'grey.100' } }}
                        >
                          <WarningIcon />
                        </IconButton>
                      </Box>
                      
                      {/* Progress Bar */}
                      <Box mb={3}>
                        <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                          <Typography variant="body2" color="grey.600">
                            Setup Progress
                          </Typography>
                          <Typography variant="body2" color="grey.600">
                            {Math.round((setupTasks.filter(task => task.completed).length / setupTasks.length) * 100)}%
                          </Typography>
                        </Box>
                        <LinearProgress 
                          variant="determinate"
                          value={(setupTasks.filter(task => task.completed).length / setupTasks.length) * 100}
                          sx={{ height: 8, borderRadius: 1 }}
                        />
                      </Box>
                      
                      <Stack spacing={2}>
                        {setupTasks.map((task, index) => (
                          <Link to={task.link} key={index} style={{ textDecoration: 'none' }}>
                            <Paper 
                              elevation={0}
                              sx={{ 
                                p: 2, 
                                border: '1px solid', 
                                borderColor: 'grey.200', 
                                borderRadius: 2,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                '&:hover': { 
                                  bgcolor: 'grey.50',
                                  borderColor: 'primary.main'
                                }
                              }}
                            >
                              <Box display="flex" alignItems="flex-start" gap={2}>
                                <Avatar 
                                  sx={{ 
                                    width: 32, 
                                    height: 32, 
                                    bgcolor: task.completed ? 'success.50' : 'primary.50',
                                    color: task.completed ? 'success.main' : 'primary.main'
                                  }}
                                >
                                  {task.completed ? <CheckIcon /> : <task.icon />}
                                </Avatar>
                                <Box flex={1} minWidth={0}>
                                  <Typography variant="body2" fontWeight="medium" color="grey.900">
                                    {task.title}
                                  </Typography>
                                  <Typography variant="body2" color="grey.600" mt={0.5}>
                                    {task.description}
                                  </Typography>
                                </Box>
                                <ArrowForwardIcon sx={{ color: 'grey.400', '&:hover': { color: 'primary.main' } }} />
                              </Box>
                            </Paper>
                          </Link>
                        ))}
                      </Stack>
                    </CardContent>
                  </Card>
                </Collapse>

                {/* Today Section */}
                <Card sx={{ mb: 3, boxShadow: 1, '&:hover': { boxShadow: 2 } }}>
                  <CardContent>
                    <Box display="flex" alignItems="center" gap={2} mb={3}>
                      <Typography variant="h6" fontWeight="semibold" color="grey.900">
                        Today
                      </Typography>
                      <Chip 
                        icon={<CalendarIcon />}
                        label={parseLocalDate(selectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        size="small"
                        variant="outlined"
                        sx={{ bgcolor: 'grey.100' }}
                      />
                    </Box>

                    <Grid container spacing={3}>
                      <Grid item xs={12} sm={4}>
                        <Box textAlign="center">
                          <Typography variant="h4" fontWeight="bold" color="grey.900">
                            {dashboardData.todayJobs}
                          </Typography>
                          <Typography variant="body2" color="grey.600" mt={0.5}>
                            Jobs
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <Box textAlign="center">
                          <Typography variant="h4" fontWeight="bold" color="grey.900">
                            {Math.floor(dashboardData.todayDuration / 60)}h {dashboardData.todayDuration % 60}m
                          </Typography>
                          <Typography variant="body2" color="grey.600" mt={0.5}>
                            Est. duration
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <Box textAlign="center">
                          <Typography variant="h4" fontWeight="bold" color="grey.900">
                            ${dashboardData.todayEarnings}
                          </Typography>
                          <Typography variant="body2" color="grey.600" mt={0.5}>
                            Est. earnings
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>

                    {/* Today's Jobs Map */}
                    <Card sx={{ mt: 3, overflow: 'hidden' }}>
                      <Box display="flex" alignItems="center" justifyContent="space-between" p={2} borderBottom="1px solid" borderColor="grey.200">
                        <Typography variant="h6" fontWeight="semibold" color="grey.900">
                          {selectedDate === getTodayString() ? "Today's Jobs Map" : `${parseLocalDate(selectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} Jobs Map`}
                        </Typography>
                        <Box display="flex" alignItems="center" gap={2}>
                          <Typography variant="body2" color="grey.500">
                            {dashboardData.todayJobs} jobs
                          </Typography>
                          <Box display="flex" bgcolor="grey.100" borderRadius={1} p={0.5}>
                            <Button
                              size="small"
                              variant={mapView === 'map' ? 'contained' : 'text'}
                              onClick={() => setMapView('map')}
                              startIcon={<MapIcon />}
                              sx={{ 
                                minWidth: 'auto',
                                px: 1.5,
                                py: 0.5,
                                textTransform: 'none',
                                fontSize: '0.75rem'
                              }}
                            >
                              Map
                            </Button>
                            <Button
                              size="small"
                              variant={mapView === 'satellite' ? 'contained' : 'text'}
                              onClick={() => setMapView('satellite')}
                              startIcon={<SatelliteIcon />}
                              sx={{ 
                                minWidth: 'auto',
                                px: 1.5,
                                py: 0.5,
                                textTransform: 'none',
                                fontSize: '0.75rem'
                              }}
                            >
                              Satellite
                            </Button>
                          </Box>
                        </Box>
                      </Box>
                      
                      <Box height={256}>
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
                          <Box position="relative" height="100%">
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
                            <Box 
                              position="absolute" 
                              top={16} 
                              left={16} 
                              bgcolor="white" 
                              borderRadius={2} 
                              p={1.5} 
                              maxWidth={300}
                              boxShadow={2}
                            >
                              <Typography variant="body2" fontWeight="semibold" color="grey.900" gutterBottom>
                                {selectedDate === getTodayString() ? "No jobs today" : `No jobs on ${parseLocalDate(selectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                              </Typography>
                              <Typography variant="body2" color="grey.600">
                                Looks like you don't have anything to do today.
                              </Typography>
                            </Box>
                          </Box>
                        )}
                      </Box>
                    </Card>
                  </CardContent>
                </Card>

                {/* Overview Section */}
                <Card sx={{ mb: 3, boxShadow: 1, '&:hover': { boxShadow: 2 } }}>
                  <CardContent>
                    <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
                      <Typography variant="h6" fontWeight="semibold" color="grey.900">
                        Overview Oct 18 - Today
                      </Typography>
                      
                      <FormControl size="small" sx={{ minWidth: 120 }}>
                        <InputLabel>Date Range</InputLabel>
                        <Select
                          value={dateRange}
                          label="Date Range"
                          onChange={(e) => setDateRange(e.target.value)}
                        >
                          <MenuItem value="7">Last 7 days</MenuItem>
                          <MenuItem value="30">Last 30 days</MenuItem>
                          <MenuItem value="90">Last 90 days</MenuItem>
                          <MenuItem value="365">Last year</MenuItem>
                        </Select>
                      </FormControl>
                    </Box>

                    <Grid container spacing={3}>
                      {/* New jobs */}
                      <Grid item xs={12} md={6} lg={4}>
                        <Card variant="outlined">
                          <CardContent>
                            <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                              <Typography variant="body2" fontWeight="medium" color="grey.900">
                                New jobs
                              </Typography>
                              <Tooltip title="New jobs created in the selected period">
                                <InfoIcon fontSize="small" color="action" />
                              </Tooltip>
                            </Box>
                            <Typography variant="h4" fontWeight="bold" color="grey.900" mb={1}>
                              {dashboardData.newJobs}
                            </Typography>
                            <LinearProgress variant="determinate" value={100} sx={{ height: 4, borderRadius: 1 }} />
                          </CardContent>
                        </Card>
                      </Grid>

                      {/* Jobs */}
                      <Grid item xs={12} md={6} lg={4}>
                        <Card variant="outlined">
                          <CardContent>
                            <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                              <Typography variant="body2" fontWeight="medium" color="grey.900">
                                Jobs
                              </Typography>
                              <Tooltip title="Total jobs in the selected period">
                                <InfoIcon fontSize="small" color="action" />
                              </Tooltip>
                            </Box>
                            {dashboardData.totalJobs > 0 ? (
                              <>
                                <Typography variant="h4" fontWeight="bold" color="grey.900" mb={1}>
                                  {dashboardData.totalJobs}
                                </Typography>
                                <LinearProgress variant="determinate" value={100} sx={{ height: 4, borderRadius: 1 }} />
                              </>
                            ) : (
                              <Box textAlign="center" py={2}>
                                <Typography variant="body1" fontWeight="medium" color="grey.900">
                                  No data to display
                                </Typography>
                                <Typography variant="body2" color="grey.600" mt={0.5}>
                                  Try changing the date range filter at the top of the page
                                </Typography>
                              </Box>
                            )}
                          </CardContent>
                        </Card>
                      </Grid>

                      {/* New recurring bookings */}
                      <Grid item xs={12} md={6} lg={4}>
                        <Card variant="outlined">
                          <CardContent>
                            <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                              <Typography variant="body2" fontWeight="medium" color="grey.900">
                                New recurring bookings
                              </Typography>
                              <Tooltip title="New recurring bookings created in the selected period">
                                <InfoIcon fontSize="small" color="action" />
                              </Tooltip>
                            </Box>
                            <Typography variant="h4" fontWeight="bold" color="grey.900" mb={1}>
                              {dashboardData.newRecurringBookings}
                            </Typography>
                            <LinearProgress variant="determinate" value={100} sx={{ height: 4, borderRadius: 1 }} />
                          </CardContent>
                        </Card>
                      </Grid>

                      {/* Recurring bookings */}
                      <Grid item xs={12} md={6} lg={4}>
                        <Card variant="outlined">
                          <CardContent>
                            <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                              <Typography variant="body2" fontWeight="medium" color="grey.900">
                                Recurring bookings
                              </Typography>
                              <Tooltip title="Total recurring bookings in the selected period">
                                <InfoIcon fontSize="small" color="action" />
                              </Tooltip>
                            </Box>
                            {dashboardData.recurringBookings > 0 ? (
                              <>
                                <Typography variant="h4" fontWeight="bold" color="grey.900" mb={1}>
                                  {dashboardData.recurringBookings}
                                </Typography>
                                <LinearProgress variant="determinate" value={100} sx={{ height: 4, borderRadius: 1 }} />
                              </>
                            ) : (
                              <Box textAlign="center" py={2}>
                                <Typography variant="body1" fontWeight="medium" color="grey.900">
                                  No data to display
                                </Typography>
                                <Typography variant="body2" color="grey.600" mt={0.5}>
                                  Try changing the date range filter at the top of the page
                                </Typography>
                              </Box>
                            )}
                          </CardContent>
                        </Card>
                      </Grid>

                      {/* Job value */}
                      <Grid item xs={12} md={6} lg={4}>
                        <Card variant="outlined">
                          <CardContent>
                            <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                              <Typography variant="body2" fontWeight="medium" color="grey.900">
                                Job value
                              </Typography>
                              <Tooltip title="Average value per job">
                                <InfoIcon fontSize="small" color="action" />
                              </Tooltip>
                            </Box>
                            <Typography variant="h4" fontWeight="bold" color="grey.900" mb={1}>
                              ${dashboardData.jobValue}
                            </Typography>
                            <LinearProgress variant="determinate" value={100} sx={{ height: 4, borderRadius: 1 }} />
                          </CardContent>
                        </Card>
                      </Grid>

                      {/* Payments collected */}
                      <Grid item xs={12} md={6} lg={4}>
                        <Card variant="outlined">
                          <CardContent>
                            <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                              <Typography variant="body2" fontWeight="medium" color="grey.900">
                                Payments collected
                              </Typography>
                              <Tooltip title="Total payments collected in the selected period">
                                <InfoIcon fontSize="small" color="action" />
                              </Tooltip>
                            </Box>
                            <Typography variant="h4" fontWeight="bold" color="grey.900" mb={1}>
                              ${dashboardData.totalRevenue}
                            </Typography>
                            <LinearProgress variant="determinate" value={100} sx={{ height: 4, borderRadius: 1 }} />
                          </CardContent>
                        </Card>
                      </Grid>
                    </Grid>

                    <Divider sx={{ my: 4 }} />

                    {/* Rating Section */}
                    <Grid container spacing={4}>
                      {/* Average feedback rating */}
                      <Grid item xs={12} lg={6}>
                        <Box>
                          <Box display="flex" alignItems="center" gap={1} mb={3}>
                            <StarIcon color="primary" />
                            <Typography variant="body2" fontWeight="medium" color="grey.900">
                              Average feedback rating
                            </Typography>
                            <Tooltip title="Average customer feedback rating">
                              <InfoIcon fontSize="small" color="action" />
                            </Tooltip>
                          </Box>
                          <Box display="flex" alignItems="center" gap={2} mb={3}>
                            <Typography variant="h4" fontWeight="bold" color="grey.900">
                              0.0
                            </Typography>
                            <Rating value={0} readOnly size="large" />
                          </Box>
                          <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                              <Typography variant="body2" fontWeight="medium" color="grey.900">
                                Total ratings
                              </Typography>
                              <Typography variant="h5" fontWeight="bold" color="grey.900">
                                0
                              </Typography>
                            </Box>
                          </Paper>
                          <Paper sx={{ p: 2, bgcolor: 'grey.50', mt: 2 }}>
                            <Typography variant="body2" fontWeight="medium" color="grey.900" mb={2}>
                              Recent ratings
                            </Typography>
                            <Box textAlign="center" py={2}>
                              <Typography variant="body1" fontWeight="medium" color="grey.900">
                                No data to display
                              </Typography>
                              <Typography variant="body2" color="grey.600" mt={0.5}>
                                Try changing the date range filter
                              </Typography>
                            </Box>
                          </Paper>
                        </Box>
                      </Grid>

                      {/* Rating breakdown */}
                      <Grid item xs={12} lg={6}>
                        <Box>
                          <Box display="flex" alignItems="center" gap={1} mb={3}>
                            <TrendingUpIcon color="primary" />
                            <Typography variant="body2" fontWeight="medium" color="grey.900">
                              Rating breakdown
                            </Typography>
                            <Tooltip title="Breakdown of ratings by star count">
                              <InfoIcon fontSize="small" color="action" />
                            </Tooltip>
                          </Box>
                          <Stack spacing={2}>
                            {ratingBreakdown.map((rating) => (
                              <Box key={rating.stars} display="flex" alignItems="center" gap={2}>
                                <Box display="flex" alignItems="center" gap={0.5} minWidth={80}>
                                  <Typography variant="body2" fontWeight="medium" color="grey.900">
                                    {rating.stars}
                                  </Typography>
                                  <StarIcon fontSize="small" color="action" />
                                </Box>
                                <Box flex={1} bgcolor="grey.200" borderRadius={1} height={8} overflow="hidden">
                                  <Box 
                                    bgcolor="primary.main" 
                                    height="100%" 
                                    width="0%" 
                                    borderRadius={1}
                                  />
                                </Box>
                                <Typography variant="body2" fontWeight="medium" color="grey.900" minWidth={32} textAlign="right">
                                  {rating.count}
                                </Typography>
                              </Box>
                            ))}
                          </Stack>
                        </Box>
                      </Grid>
                    </Grid>

                    <Divider sx={{ my: 4 }} />

                    {/* Service territory performance */}
                    <Box>
                      <Box display="flex" alignItems="center" gap={1} mb={3}>
                        <LocationIcon color="primary" />
                        <Typography variant="body2" fontWeight="medium" color="grey.900">
                          Service territory performance
                        </Typography>
                        <Tooltip title="Performance metrics by service territory">
                          <InfoIcon fontSize="small" color="action" />
                        </Tooltip>
                      </Box>
                      <Box display="flex" alignItems="center" gap={3} mb={3}>
                        <Typography variant="body2" fontWeight="medium" color="grey.900">
                          Number of jobs
                        </Typography>
                        <Typography variant="body2" color="grey.600">
                          Job value
                        </Typography>
                      </Box>
                      <Paper 
                        sx={{ 
                          p: 6, 
                          bgcolor: 'grey.50', 
                          textAlign: 'center',
                          borderRadius: 2
                        }}
                      >
                        <Typography variant="body1" fontWeight="medium" color="grey.900">
                          No data to display
                        </Typography>
                        <Typography variant="body2" color="grey.600" mt={0.5}>
                          Enable service territories to see a breakdown of job data by location
                        </Typography>
                      </Paper>
                    </Box>
                  </CardContent>
                </Card>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
    </>
  )
}

export default DashboardMUI

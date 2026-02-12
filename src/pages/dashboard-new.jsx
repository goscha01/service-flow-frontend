"use client"

import { useState, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { jobsAPI, customersAPI, servicesAPI, invoicesAPI, teamAPI } from "../services/api"
import { normalizeAPIResponse } from "../utils/dataHandler"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Badge } from "../components/ui/badge"
import { Progress } from "../components/ui/progress"
import { 
  Home, 
  MessageSquare, 
  Calendar, 
  Briefcase, 
  FileText, 
  RotateCcw, 
  CreditCard, 
  Users, 
  UserCheck, 
  Wrench, 
  Tag, 
  MapPin, 
  Globe, 
  Settings,
  Plus,
  ChevronDown,
  Info,
  Star,
  BarChart2,
  RefreshCw,
  AlertTriangle,
  Check,
  ArrowRight
} from "lucide-react"

const Dashboard = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(true)
  const [dateRange, setDateRange] = useState('7')
  const [dashboardData, setDashboardData] = useState({
    newJobs: 0,
    totalJobs: 0,
    newRecurringBookings: 0,
    recurringBookings: 0,
    jobValue: 0,
    totalRevenue: 0
  })

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
      
      // Fetch all data
      const [jobsResponse, invoicesResponse, servicesResponse] = await Promise.all([
        jobsAPI.getAll(user.id, "", "", 1, 1000),
        invoicesAPI.getAll(user.id, { page: 1, limit: 1000 }),
        servicesAPI.getAll(user.id)
      ])
      
      const jobs = normalizeAPIResponse(jobsResponse, 'jobs')
      const invoices = normalizeAPIResponse(invoicesResponse, 'invoices')
      const services = normalizeAPIResponse(servicesResponse, 'services')
      
      // Calculate date range
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - (parseInt(dateRange) - 1))
      const startDateString = startDate.toISOString().split('T')[0]
      
      // Filter jobs by date range
      const rangeJobs = jobs.filter(job => {
        let jobDateString = ''
        if (job.created_at) {
          if (job.created_at.includes('T')) {
            jobDateString = job.created_at.split('T')[0]
          } else {
            jobDateString = job.created_at.split(' ')[0]
          }
        }
        return jobDateString >= startDateString
      })
      
      // Calculate metrics
      const newJobs = rangeJobs.length
      const totalJobs = jobs.length
      
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
      
      // Calculate revenue
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
      
      setDashboardData({
        newJobs,
        totalJobs,
        newRecurringBookings: newRecurringJobs,
        recurringBookings: recurringJobs.length,
        jobValue: avgJobValue,
        totalRevenue
      })
      
    } catch (error) {
      console.error('❌ Error fetching dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const getUserDisplayName = () => {
    if (!user) return 'User'
    return user.firstName || user.name || user.email?.split('@')[0] || 'User'
  }

  const getDateRangeLabel = () => {
    if (dateRange === '7') return 'Last 7 days'
    if (dateRange === '30') return 'Last 30 days'
    if (dateRange === '90') return 'Last 90 days'
    if (dateRange === '365') return 'Last year'
    return 'Last 7 days'
  }

  const sidebarItems = [
    { icon: Home, label: "Dashboard", path: "/dashboard", active: true },
    { icon: MessageSquare, label: "Requests", path: "/request" },
    { icon: Calendar, label: "Schedule", path: "/schedule" },
    { icon: Briefcase, label: "Jobs", path: "/jobs" },
    { icon: FileText, label: "Estimates", path: "/estimates" },
    { icon: RotateCcw, label: "Recurring", path: "/recurring" },
    { icon: CreditCard, label: "Payments", path: "/payments" },
    { icon: Users, label: "Customers", path: "/customers" },
    { icon: UserCheck, label: "Team", path: "/team" },
    { icon: Wrench, label: "Services", path: "/services" },
    { icon: Tag, label: "Coupons", path: "/coupons" },
    { icon: MapPin, label: "Territories", path: "/territories" },
    { icon: Globe, label: "Online Booking", path: "/online-booking" },
    { icon: Settings, label: "Settings", path: "/settings" },
  ]

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">Z</span>
            </div>
            <span className="text-xl font-semibold text-gray-900">zenbooker</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {sidebarItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                item.active
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">JW</span>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900">Just web</div>
              <div className="text-xs text-gray-500">Just_web</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Overview</h1>
              <p className="text-sm text-gray-500 mt-1">
                {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - Today
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
                <option value="365">Last year</option>
              </select>
              <Button onClick={() => navigate('/createjob')} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                New
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {/* New Jobs */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">New jobs</CardTitle>
                  <Info className="h-4 w-4 text-gray-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{isLoading ? '...' : dashboardData.newJobs}</div>
                  <div className="flex items-center space-x-2 mt-2">
                    <Progress value={dashboardData.totalJobs > 0 ? (dashboardData.newJobs / dashboardData.totalJobs) * 100 : 0} className="flex-1" />
                    <span className="text-xs text-gray-500">7 days</span>
                  </div>
                </CardContent>
              </Card>

              {/* Jobs */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Jobs</CardTitle>
                  <Info className="h-4 w-4 text-gray-400" />
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="text-2xl font-bold">...</div>
                  ) : dashboardData.totalJobs > 0 ? (
                    <>
                      <div className="text-2xl font-bold">{dashboardData.totalJobs}</div>
                      <div className="flex items-center space-x-2 mt-2">
                        <Progress value={100} className="flex-1" />
                        <span className="text-xs text-gray-500">Total</span>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-gray-900 font-medium">No data to display</p>
                      <p className="text-gray-600 text-sm mt-1">
                        Try changing the date range filter at the top of the page
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* New Recurring Bookings */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">New recurring bookings</CardTitle>
                  <Info className="h-4 w-4 text-gray-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{isLoading ? '...' : dashboardData.newRecurringBookings}</div>
                  <div className="flex items-center space-x-2 mt-2">
                    <Progress value={dashboardData.recurringBookings > 0 ? (dashboardData.newRecurringBookings / dashboardData.recurringBookings) * 100 : 0} className="flex-1" />
                    <span className="text-xs text-gray-500">7 days</span>
                  </div>
                </CardContent>
              </Card>

              {/* Recurring Bookings */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Recurring bookings</CardTitle>
                  <Info className="h-4 w-4 text-gray-400" />
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="text-2xl font-bold">...</div>
                  ) : dashboardData.recurringBookings > 0 ? (
                    <>
                      <div className="text-2xl font-bold">{dashboardData.recurringBookings}</div>
                      <div className="flex items-center space-x-2 mt-2">
                        <Progress value={100} className="flex-1" />
                        <span className="text-xs text-gray-500">Total</span>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-gray-900 font-medium">No data to display</p>
                      <p className="text-gray-600 text-sm mt-1">
                        Try changing the date range filter at the top of the page
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Job Value */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Job value</CardTitle>
                  <Info className="h-4 w-4 text-gray-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${isLoading ? '...' : dashboardData.jobValue}</div>
                  <div className="flex items-center space-x-2 mt-2">
                    <Progress value={Math.min((dashboardData.jobValue / 100) * 100, 100)} className="flex-1" />
                    <span className="text-xs text-gray-500">Avg</span>
                  </div>
                </CardContent>
              </Card>

              {/* Payments Collected */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Payments collected</CardTitle>
                  <Info className="h-4 w-4 text-gray-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${isLoading ? '...' : dashboardData.totalRevenue}</div>
                  <div className="flex items-center space-x-2 mt-2">
                    <Progress value={Math.min((dashboardData.totalRevenue / 1000) * 100, 100)} className="flex-1" />
                    <span className="text-xs text-gray-500">Total</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6">
        <Button size="icon" className="w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg">
          <MessageSquare className="w-6 h-6" />
        </Button>
      </div>
    </div>
  )
}

export default Dashboard

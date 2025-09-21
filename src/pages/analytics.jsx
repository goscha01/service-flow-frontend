"use client"

import { useState, useEffect } from "react"
import Sidebar from "../components/sidebar"
import MobileHeader from "../components/mobile-header"
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Calendar, 
  Clock, 
  MapPin, 
  Star,
  Download,
  Filter,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  Activity
} from "lucide-react"
import { useAuth } from "../context/AuthContext"
import { jobsAPI, customersAPI, teamAPI, invoicesAPI } from "../services/api"

const Analytics = () => {
  const { user } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")
  const [dateRange, setDateRange] = useState("30") // days
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  
  // Analytics data
  const [overview, setOverview] = useState({})
  const [revenueData, setRevenueData] = useState([])
  const [jobMetrics, setJobMetrics] = useState({})
  const [teamPerformance, setTeamPerformance] = useState([])
  const [customerAnalytics, setCustomerAnalytics] = useState({})
  const [topServices, setTopServices] = useState([])

  useEffect(() => {
    if (user?.id) {
      fetchAnalytics()
    }
  }, [user, dateRange])

  const fetchAnalytics = async () => {
    if (!user?.id) return
    
    try {
      setLoading(true)
      setError("")
      
      // Fetch all analytics data
      const [overviewData, revenueData, jobMetrics, teamData, customerData, servicesData] = await Promise.all([
        fetchOverviewData(),
        fetchRevenueData(),
        fetchJobMetrics(),
        fetchTeamPerformance(),
        fetchCustomerAnalytics(),
        fetchTopServices()
      ])
      
      setOverview(overviewData)
      setRevenueData(revenueData)
      setJobMetrics(jobMetrics)
      setTeamPerformance(teamData)
      setCustomerAnalytics(customerData)
      setTopServices(servicesData)
      
    } catch (error) {
      console.error('Error fetching analytics:', error)
      setError("Failed to load analytics data. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const fetchOverviewData = async () => {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - parseInt(dateRange))
    
    const jobs = await jobsAPI.getAll(user.id, "", "", 1, 1000)
    const invoices = await invoicesAPI.getAll(user.id, { page: 1, limit: 1000 })
    
    const filteredJobs = jobs.jobs?.filter(job => {
      // Extract date part from scheduled_date string (format: "2024-01-15 10:00:00")
      const jobDateString = job.scheduled_date ? job.scheduled_date.split(' ')[0] : ''
      const startDateString = startDate.toISOString().split('T')[0]
      const endDateString = endDate.toISOString().split('T')[0]
      return jobDateString >= startDateString && jobDateString <= endDateString
    }) || []
    
    const filteredInvoices = invoices.invoices?.filter(invoice => {
      const invoiceDate = new Date(invoice.created_at)
      return invoiceDate >= startDate && invoiceDate <= endDate
    }) || []
    
    console.log('Filtered invoices:', filteredInvoices)
    const totalRevenue = filteredInvoices.reduce((sum, invoice) => {
      const amount = parseFloat(invoice.total_amount) || parseFloat(invoice.amount) || 0
      console.log('Invoice amount:', invoice.total_amount, invoice.amount, amount)
      return sum + amount
    }, 0)
    const completedJobs = filteredJobs.filter(job => job.status === 'completed').length
    const totalJobs = filteredJobs.length
    const completionRate = totalJobs > 0 ? (completedJobs / totalJobs * 100).toFixed(1) : 0
    const avgJobValue = completedJobs > 0 ? totalRevenue / completedJobs : 0
    
    return {
      totalRevenue,
      totalJobs,
      completedJobs,
      completionRate,
      avgJobValue,
      pendingJobs: filteredJobs.filter(job => job.status === 'pending').length,
      cancelledJobs: filteredJobs.filter(job => job.status === 'cancelled').length
    }
  }

  const fetchRevenueData = async () => {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - parseInt(dateRange))
    
    const invoices = await invoicesAPI.getAll(user.id, { page: 1, limit: 1000 })
    const filteredInvoices = invoices.invoices?.filter(invoice => {
      const invoiceDate = new Date(invoice.created_at)
      return invoiceDate >= startDate && invoiceDate <= endDate
    }) || []
    
    // Group by date
    const revenueByDate = {}
    filteredInvoices.forEach(invoice => {
      const date = new Date(invoice.created_at).toISOString().split('T')[0]
      const amount = parseFloat(invoice.total_amount) || parseFloat(invoice.amount) || 0
      revenueByDate[date] = (revenueByDate[date] || 0) + amount
    })
    
    return Object.entries(revenueByDate).map(([date, revenue]) => ({
      date,
      revenue
    })).sort((a, b) => new Date(a.date) - new Date(b.date))
  }

  const fetchJobMetrics = async () => {
    const jobs = await jobsAPI.getAll(user.id, "", "", 1, 1000)
    const allJobs = jobs.jobs || []
    
    const statusCounts = {
      pending: allJobs.filter(job => job.status === 'pending').length,
      confirmed: allJobs.filter(job => job.status === 'confirmed').length,
      in_progress: allJobs.filter(job => job.status === 'in_progress').length,
      completed: allJobs.filter(job => job.status === 'completed').length,
      cancelled: allJobs.filter(job => job.status === 'cancelled').length
    }
    
    const avgJobDuration = allJobs.length > 0 ? 
      allJobs.reduce((sum, job) => sum + (job.service_duration || 0), 0) / allJobs.length : 0
    
    return {
      statusCounts,
      avgJobDuration,
      totalJobs: allJobs.length
    }
  }

  const fetchTeamPerformance = async () => {
    const team = await teamAPI.getAll(user.id)
    const teamMembers = team.teamMembers || []
    
    const jobs = await jobsAPI.getAll(user.id, "", "", 1, 1000)
    const allJobs = jobs.jobs || []
    
    return teamMembers.map(member => {
      const memberJobs = allJobs.filter(job => job.team_member_id === member.id)
      const completedJobs = memberJobs.filter(job => job.status === 'completed')
      const completionRate = memberJobs.length > 0 ? (completedJobs.length / memberJobs.length * 100).toFixed(1) : 0
      
      return {
        ...member,
        totalJobs: memberJobs.length,
        completedJobs: completedJobs.length,
        completionRate: parseFloat(completionRate),
        avgJobValue: completedJobs.length > 0 ? 
          completedJobs.reduce((sum, job) => sum + (parseFloat(job.service_price) || 0), 0) / completedJobs.length : 0
      }
    })
  }

  const fetchCustomerAnalytics = async () => {
    const customers = await customersAPI.getAll(user.id, "", "", 1, 1000)
    const allCustomers = customers.customers || []
    
    const jobs = await jobsAPI.getAll(user.id, "", "", 1, 1000)
    const allJobs = jobs.jobs || []
    
    // Customer lifetime value
    const customerLTV = {}
    allJobs.forEach(job => {
      if (!customerLTV[job.customer_id]) {
        customerLTV[job.customer_id] = 0
      }
      customerLTV[job.customer_id] += parseFloat(job.service_price) || 0
    })
    
    const avgLTV = Object.values(customerLTV).length > 0 ? 
      Object.values(customerLTV).reduce((sum, ltv) => sum + ltv, 0) / Object.values(customerLTV).length : 0
    
    return {
      totalCustomers: allCustomers.length,
      activeCustomers: allCustomers.filter(customer => customer.status === 'active').length,
      avgLTV,
      repeatCustomers: Object.keys(customerLTV).length,
      newCustomers: allCustomers.filter(customer => {
        const customerDate = new Date(customer.created_at)
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        return customerDate >= thirtyDaysAgo
      }).length
    }
  }

  const fetchTopServices = async () => {
    const jobs = await jobsAPI.getAll(user.id, "", "", 1, 1000)
    const allJobs = jobs.jobs || []
    
    const serviceCounts = {}
    allJobs.forEach(job => {
      const serviceName = job.service_name || 'Unknown Service'
      serviceCounts[serviceName] = (serviceCounts[serviceName] || 0) + 1
    })
    
    return Object.entries(serviceCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100'
      case 'pending':
        return 'text-yellow-600 bg-yellow-100'
      case 'in_progress':
        return 'text-blue-600 bg-blue-100'
      case 'cancelled':
        return 'text-red-600 bg-red-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} activePage="analytics" />
        <div className="flex-1 flex flex-col min-w-0 lg:ml-64 xl:ml-72">
          <MobileHeader onMenuClick={() => setSidebarOpen(true)} />
          <div className="flex-1 overflow-auto">
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading analytics...</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} activePage="analytics" />

              <div className="flex-1 flex flex-col min-w-0 lg:ml-64 xl:ml-72">
        <MobileHeader onMenuClick={() => setSidebarOpen(true)} />

        <div className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto px-6 py-8">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-bold text-gray-900">Analytics & Reports</h1>
                <div className="flex items-center space-x-4">
                  <select
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="7">Last 7 days</option>
                    <option value="30">Last 30 days</option>
                    <option value="90">Last 90 days</option>
                    <option value="365">Last year</option>
                  </select>
                  <button
                    onClick={fetchAnalytics}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <RefreshCw className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <p className="text-gray-600">
                Track your business performance with comprehensive analytics and insights.
              </p>
            </div>

            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                  <p className="text-red-800">{error}</p>
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className="flex space-x-1 bg-gray-100 rounded-lg p-1 mb-8">
              {[
                { id: "overview", label: "Overview", icon: BarChart3 },
                { id: "revenue", label: "Revenue", icon: DollarSign },
                { id: "jobs", label: "Jobs", icon: Calendar },
                { id: "team", label: "Team", icon: Users },
                { id: "customers", label: "Customers", icon: Star }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-md ${
                    activeTab === tab.id
                      ? "bg-white text-gray-900 shadow"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Overview Tab */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <DollarSign className="w-6 h-6 text-green-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                        <p className="text-2xl font-bold text-gray-900">{formatCurrency(overview.totalRevenue)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Calendar className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Total Jobs</p>
                        <p className="text-2xl font-bold text-gray-900">{overview.totalJobs}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                        <p className="text-2xl font-bold text-gray-900">{overview.completionRate}%</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <TrendingUp className="w-6 h-6 text-purple-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Avg Job Value</p>
                        <p className="text-2xl font-bold text-gray-900">{formatCurrency(overview.avgJobValue)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Revenue Chart */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend</h3>
                  <div className="h-64 flex items-end space-x-2">
                    {revenueData.map((item, index) => (
                      <div key={index} className="flex-1 bg-blue-500 rounded-t" style={{
                        height: `${(item.revenue / Math.max(...revenueData.map(d => d.revenue))) * 200}px`
                      }}>
                        <div className="text-xs text-white text-center mt-2">
                          {formatCurrency(item.revenue)}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-2">
                    {revenueData.length > 0 && (
                      <>
                        <span>{formatDate(revenueData[0]?.date)}</span>
                        <span>{formatDate(revenueData[revenueData.length - 1]?.date)}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Top Services */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Services</h3>
                  <div className="space-y-3">
                    {topServices.map((service, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium mr-3">
                            {index + 1}
                          </span>
                          <span className="text-gray-900">{service.name}</span>
                        </div>
                        <span className="text-gray-600">{service.count} jobs</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Revenue Tab */}
            {activeTab === "revenue" && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Analytics</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">{formatCurrency(overview.totalRevenue)}</p>
                      <p className="text-sm text-gray-600">Total Revenue</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">{overview.completedJobs}</p>
                      <p className="text-sm text-gray-600">Paid Jobs</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">{formatCurrency(overview.avgJobValue)}</p>
                      <p className="text-sm text-gray-600">Average Job Value</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Jobs Tab */}
            {activeTab === "jobs" && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Job Status Distribution</h3>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    {Object.entries(jobMetrics.statusCounts || {}).map(([status, count]) => (
                      <div key={status} className="text-center">
                        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(status)}`}>
                          {status.replace('_', ' ')}
                        </div>
                        <p className="text-2xl font-bold text-gray-900 mt-2">{count}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Job Performance</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">{jobMetrics.totalJobs}</p>
                      <p className="text-sm text-gray-600">Total Jobs</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">{overview.completionRate}%</p>
                      <p className="text-sm text-gray-600">Completion Rate</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">{Math.round(jobMetrics.avgJobDuration)} min</p>
                      <p className="text-sm text-gray-600">Avg Duration</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Team Tab */}
            {activeTab === "team" && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Team Performance</h3>
                  <div className="space-y-4">
                    {teamPerformance.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-medium">
                              {member.first_name?.[0]}{member.last_name?.[0]}
                            </span>
                          </div>
                          <div className="ml-4">
                            <p className="font-medium text-gray-900">
                              {member.first_name} {member.last_name}
                            </p>
                            <p className="text-sm text-gray-600">{member.role}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-6">
                          <div className="text-center">
                            <p className="text-lg font-bold text-gray-900">{member.totalJobs}</p>
                            <p className="text-sm text-gray-600">Total Jobs</p>
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-bold text-green-600">{member.completionRate}%</p>
                            <p className="text-sm text-gray-600">Completion</p>
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-bold text-blue-600">{formatCurrency(member.avgJobValue)}</p>
                            <p className="text-sm text-gray-600">Avg Value</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Customers Tab */}
            {activeTab === "customers" && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Analytics</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">{customerAnalytics.totalCustomers}</p>
                      <p className="text-sm text-gray-600">Total Customers</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">{customerAnalytics.activeCustomers}</p>
                      <p className="text-sm text-gray-600">Active Customers</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">{formatCurrency(customerAnalytics.avgLTV)}</p>
                      <p className="text-sm text-gray-600">Avg Lifetime Value</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-purple-600">{customerAnalytics.newCustomers}</p>
                      <p className="text-sm text-gray-600">New Customers (30d)</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Analytics 
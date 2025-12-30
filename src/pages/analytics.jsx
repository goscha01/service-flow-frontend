"use client"

import { useState, useEffect } from "react"
import Sidebar from "../components/sidebar"
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
  Activity,
  FileText,
  FileSpreadsheet
} from "lucide-react"
import { useAuth } from "../context/AuthContext"
import { jobsAPI, customersAPI, teamAPI, invoicesAPI, payrollAPI, analyticsAPI } from "../services/api"
import { RevenueChart, JobStatusChart, BarChartComponent } from "../components/analytics-chart"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { isAccountOwner } from "../utils/roleUtils"
import { useNavigate } from "react-router-dom"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import * as XLSX from "xlsx"

const Analytics = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  
  // Redirect non-owners away from analytics
  useEffect(() => {
    if (user && !isAccountOwner(user)) {
      navigate('/dashboard', { replace: true })
    }
  }, [user, navigate])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")
  const [dateRange, setDateRange] = useState("30") // days
  const [trendView, setTrendView] = useState("daily") // daily, weekly, monthly
  const [loading, setLoading] = useState(true) // Initial page load
  const [refreshing, setRefreshing] = useState(false) // Silent data refresh
  const [error, setError] = useState("")
  
  // Analytics data
  const [overview, setOverview] = useState({})
  const [revenueData, setRevenueData] = useState([])
  const [jobMetrics, setJobMetrics] = useState({})
  const [teamPerformance, setTeamPerformance] = useState([])
  const [customerAnalytics, setCustomerAnalytics] = useState({})
  const [topServices, setTopServices] = useState([])
  const [salaryAnalytics, setSalaryAnalytics] = useState({ timeSeries: [], memberBreakdown: [], summary: {} })
  const [conversionAnalytics, setConversionAnalytics] = useState({ summary: {}, bySource: {}, byStage: {}, timeSeries: [] })
  const [recurringConversionAnalytics, setRecurringConversionAnalytics] = useState({ summary: {}, byFrequency: {}, timeSeries: [], customerBreakdown: [] })
  const [lostCustomersAnalytics, setLostCustomersAnalytics] = useState({ summary: {}, timeSeries: [], lostCustomersList: [] })
  const [inactiveDaysThreshold, setInactiveDaysThreshold] = useState(90)

  // Redirect non-owners away from analytics
  useEffect(() => {
    if (user && !isAccountOwner(user)) {
      navigate('/dashboard', { replace: true })
      return
    }
  }, [user, navigate])

  // Initial load
  useEffect(() => {
    if (user?.id && isAccountOwner(user)) {
      fetchAnalytics(true) // true = initial load
    }
  }, [user])

  // Silent refresh when filters change
  useEffect(() => {
    if (user?.id && isAccountOwner(user) && !loading) {
      fetchAnalytics(false) // false = silent refresh
    }
  }, [dateRange, trendView, inactiveDaysThreshold])

  const fetchAnalytics = async (isInitialLoad = false) => {
    if (!user?.id) return
    
    try {
      if (isInitialLoad) {
        setLoading(true)
      } else {
        setRefreshing(true)
      }
      setError("")
      
      // Fetch all analytics data
      const [overviewData, revenueData, jobMetrics, teamData, customerData, servicesData, salaryData, conversionData, recurringConversionData, lostCustomersData] = await Promise.all([
        fetchOverviewData(),
        fetchRevenueData(),
        fetchJobMetrics(),
        fetchTeamPerformance(),
        fetchCustomerAnalytics(),
        fetchTopServices(),
        fetchSalaryAnalytics(),
        fetchConversionAnalytics(),
        fetchRecurringConversionAnalytics(),
        fetchLostCustomersAnalytics()
      ])
      
      setOverview(overviewData)
      setRevenueData(revenueData)
      setJobMetrics(jobMetrics)
      setTeamPerformance(teamData)
      setCustomerAnalytics(customerData)
      setTopServices(servicesData)
      setSalaryAnalytics(salaryData || { timeSeries: [], memberBreakdown: [], summary: {} })
      setConversionAnalytics(conversionData || { summary: {}, bySource: {}, byStage: {}, timeSeries: [] })
      setRecurringConversionAnalytics(recurringConversionData || { summary: {}, byFrequency: {}, timeSeries: [], customerBreakdown: [] })
      setLostCustomersAnalytics(lostCustomersData || { summary: {}, timeSeries: [], lostCustomersList: [] })
      
    } catch (error) {
      console.error('Error fetching analytics:', error)
      setError("Failed to load analytics data. Please try again.")
    } finally {
      if (isInitialLoad) {
        setLoading(false)
      } else {
        setRefreshing(false)
      }
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
    // Calculate revenue from invoices first
    let totalRevenue = filteredInvoices.reduce((sum, invoice) => {
      const amount = parseFloat(invoice.total_amount) || parseFloat(invoice.amount) || 0
      console.log('Invoice amount:', invoice.total_amount, invoice.amount, amount)
      return sum + amount
    }, 0)
    
    // If no revenue from invoices, calculate from jobs
    // Prioritize completed/paid jobs, but include all jobs with prices
    if (totalRevenue === 0) {
      totalRevenue = filteredJobs.reduce((sum, job) => {
        // Try multiple price fields in order of preference
        const jobRevenue = parseFloat(job.total_amount) || 
                          parseFloat(job.total) || 
                          parseFloat(job.service_price) || 
                          parseFloat(job.price) || 
                          parseFloat(job.invoice_amount) || 
                          0
        return sum + jobRevenue
      }, 0)
      console.log('Revenue calculated from jobs:', totalRevenue)
    }
    
    const completedJobs = filteredJobs.filter(job => job.status === 'completed').length
    const totalJobs = filteredJobs.length
    const completionRate = totalJobs > 0 ? (completedJobs / totalJobs * 100).toFixed(1) : 0
    
    // Calculate avg job value from completed jobs with prices
    const completedJobsWithPrices = filteredJobs.filter(job => {
      if (job.status !== 'completed') return false
      const jobPrice = parseFloat(job.total_amount) || 
                      parseFloat(job.total) || 
                      parseFloat(job.service_price) || 
                      parseFloat(job.price) || 
                      parseFloat(job.invoice_amount) || 
                      0
      return jobPrice > 0
    })
    
    const avgJobValue = completedJobsWithPrices.length > 0 
      ? Math.round((completedJobsWithPrices.reduce((sum, job) => {
          const jobPrice = parseFloat(job.total_amount) || 
                          parseFloat(job.total) || 
                          parseFloat(job.service_price) || 
                          parseFloat(job.price) || 
                          parseFloat(job.invoice_amount) || 
                          0
          return sum + jobPrice
        }, 0) / completedJobsWithPrices.length) * 100) / 100 
      : 0
    
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
    const jobs = await jobsAPI.getAll(user.id, "", "", 1, 1000)
    
    const filteredInvoices = invoices.invoices?.filter(invoice => {
      const invoiceDate = new Date(invoice.created_at)
      return invoiceDate >= startDate && invoiceDate <= endDate
    }) || []
    
    const filteredJobs = jobs.jobs?.filter(job => {
      // Extract date part from scheduled_date string (format: "2024-01-15 10:00:00")
      const jobDateString = job.scheduled_date ? job.scheduled_date.split(' ')[0] : ''
      const startDateString = startDate.toISOString().split('T')[0]
      const endDateString = endDate.toISOString().split('T')[0]
      return jobDateString >= startDateString && jobDateString <= endDateString
    }) || []
    
    // Group by date/week/month based on trendView
    const revenueByPeriod = {}
    
    // First, add revenue from invoices
    filteredInvoices.forEach(invoice => {
      const invoiceDate = new Date(invoice.created_at)
      let periodKey
      
      if (trendView === 'weekly') {
        // Get week start (Monday)
        const weekStart = new Date(invoiceDate)
        weekStart.setDate(invoiceDate.getDate() - invoiceDate.getDay() + 1)
        periodKey = weekStart.toISOString().split('T')[0]
      } else if (trendView === 'monthly') {
        // Get month start
        periodKey = `${invoiceDate.getFullYear()}-${String(invoiceDate.getMonth() + 1).padStart(2, '0')}-01`
      } else {
        // Daily
        periodKey = invoiceDate.toISOString().split('T')[0]
      }
      
      const amount = parseFloat(invoice.total_amount) || parseFloat(invoice.amount) || 0
      revenueByPeriod[periodKey] = (revenueByPeriod[periodKey] || 0) + amount
    })
    
    // If no revenue from invoices, add revenue from jobs
    if (Object.keys(revenueByPeriod).length === 0 || Object.values(revenueByPeriod).every(v => v === 0)) {
      filteredJobs.forEach(job => {
        // Extract date part from scheduled_date string
        const jobDateString = job.scheduled_date ? job.scheduled_date.split(' ')[0] : ''
        if (!jobDateString) return
        
        const jobDate = new Date(jobDateString)
        let periodKey
        
        if (trendView === 'weekly') {
          // Get week start (Monday)
          const weekStart = new Date(jobDate)
          weekStart.setDate(jobDate.getDate() - jobDate.getDay() + 1)
          periodKey = weekStart.toISOString().split('T')[0]
        } else if (trendView === 'monthly') {
          // Get month start
          periodKey = `${jobDate.getFullYear()}-${String(jobDate.getMonth() + 1).padStart(2, '0')}-01`
        } else {
          // Daily
          periodKey = jobDateString
        }
        
        // Try multiple price fields in order of preference
        const jobRevenue = parseFloat(job.total_amount) || 
                          parseFloat(job.total) || 
                          parseFloat(job.service_price) || 
                          parseFloat(job.price) || 
                          parseFloat(job.invoice_amount) || 
                          0
        
        if (jobRevenue > 0) {
          revenueByPeriod[periodKey] = (revenueByPeriod[periodKey] || 0) + jobRevenue
        }
      })
    }
    
    return Object.entries(revenueByPeriod).map(([date, revenue]) => ({
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
      // Check for jobs assigned to this team member
      // Support both single assignment (team_member_id) and multiple assignments (team_assignments array)
      const memberJobs = allJobs.filter(job => {
        // Check primary assignment (backward compatibility)
        if (job.team_member_id === member.id) {
          return true
        }
        
        // Check team_assignments array (multiple team members per job)
        if (job.team_assignments && Array.isArray(job.team_assignments)) {
          return job.team_assignments.some(assignment => {
            // Handle both object format { team_member_id: X } and direct ID
            const assignmentId = assignment.team_member_id || assignment.teamMemberId || assignment
            return Number(assignmentId) === Number(member.id)
          })
        }
        
        // Also check if team_assignments is a single object (not array)
        if (job.team_assignments && typeof job.team_assignments === 'object' && !Array.isArray(job.team_assignments)) {
          const assignmentId = job.team_assignments.team_member_id || job.team_assignments.teamMemberId
          return Number(assignmentId) === Number(member.id)
        }
        
        return false
      })
      
      const completedJobs = memberJobs.filter(job => job.status === 'completed')
      const completionRate = memberJobs.length > 0 ? (completedJobs.length / memberJobs.length * 100).toFixed(1) : 0
      
      return {
        ...member,
        totalJobs: memberJobs.length,
        completedJobs: completedJobs.length,
        completionRate: parseFloat(completionRate),
        avgJobValue: completedJobs.length > 0 ? 
          Math.round((completedJobs.reduce((sum, job) => sum + (parseFloat(job.service_price) || 0), 0) / completedJobs.length) * 100) / 100 : 0
      }
    })
  }

  const fetchCustomerAnalytics = async () => {
    try {
      // Fix: customersAPI.getAll expects (userId, paramsObject), not separate arguments
      const customersResponse = await customersAPI.getAll(user.id, { page: 1, limit: 1000 })
      
      // Handle different response structures - API returns response.data.customers || response.data
      // So customersResponse might already be the array, or it might be an object with a customers property
      const allCustomers = Array.isArray(customersResponse) 
        ? customersResponse 
        : (customersResponse?.customers || customersResponse?.data || [])
      
      console.log('Customer analytics - Total customers fetched:', allCustomers.length)
      console.log('Customer analytics - Sample customer:', allCustomers[0])
      console.log('Customer analytics - Response structure:', customersResponse)
      
      const jobs = await jobsAPI.getAll(user.id, "", "", 1, 1000)
      const allJobs = jobs.jobs || []
      
      // Customer lifetime value
      const customerLTV = {}
      allJobs.forEach(job => {
        if (!customerLTV[job.customer_id]) {
          customerLTV[job.customer_id] = 0
        }
        customerLTV[job.customer_id] += parseFloat(job.service_price) || parseFloat(job.total) || parseFloat(job.total_amount) || 0
      })
      
      const avgLTV = Object.values(customerLTV).length > 0 ? 
        Object.values(customerLTV).reduce((sum, ltv) => sum + ltv, 0) / Object.values(customerLTV).length : 0
      
      // Check customer status - might be 'active', 'Active', or null/undefined
      // Also check if status field exists at all
      const activeCustomers = allCustomers.filter(customer => {
        if (!customer) return false
        const status = customer.status?.toLowerCase()
        // Treat null/undefined/empty as active (default state)
        return !status || status === '' || status === 'active'
      }).length
      
      return {
        totalCustomers: allCustomers.length,
        activeCustomers: activeCustomers,
        avgLTV,
        repeatCustomers: Object.keys(customerLTV).length,
        newCustomers: allCustomers.filter(customer => {
          if (!customer?.created_at) return false
          const customerDate = new Date(customer.created_at)
          const thirtyDaysAgo = new Date()
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
          return customerDate >= thirtyDaysAgo
        }).length
      }
    } catch (error) {
      console.error('Error fetching customer analytics:', error)
      console.error('Error details:', error.response?.data || error.message)
      return {
        totalCustomers: 0,
        activeCustomers: 0,
        avgLTV: 0,
        repeatCustomers: 0,
        newCustomers: 0
      }
    }
  }

  const fetchSalaryAnalytics = async () => {
    try {
      const endDate = new Date().toISOString().split('T')[0]
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - parseInt(dateRange))
      const startDateStr = startDate.toISOString().split('T')[0]
      
      const groupBy = trendView === 'daily' ? 'day' : trendView === 'weekly' ? 'week' : 'month'
      const data = await payrollAPI.getSalaryAnalytics(startDateStr, endDate, groupBy)
      return data || { timeSeries: [], memberBreakdown: [], summary: {} }
    } catch (error) {
      console.error('Error fetching salary analytics:', error)
      return { timeSeries: [], memberBreakdown: [], summary: {} }
    }
  }

  const fetchConversionAnalytics = async () => {
    try {
      const endDate = new Date().toISOString().split('T')[0]
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - parseInt(dateRange))
      const startDateStr = startDate.toISOString().split('T')[0]
      
      const groupBy = trendView === 'daily' ? 'day' : trendView === 'weekly' ? 'week' : 'month'
      const data = await analyticsAPI.getConversionMetrics(startDateStr, endDate, groupBy)
      return data || { summary: {}, bySource: {}, byStage: {}, timeSeries: [] }
    } catch (error) {
      console.error('Error fetching conversion analytics:', error)
      return { summary: {}, bySource: {}, byStage: {}, timeSeries: [] }
    }
  }

  const fetchRecurringConversionAnalytics = async () => {
    try {
      const endDate = new Date().toISOString().split('T')[0]
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - parseInt(dateRange))
      const startDateStr = startDate.toISOString().split('T')[0]
      
      const groupBy = trendView === 'daily' ? 'day' : trendView === 'weekly' ? 'week' : 'month'
      const data = await analyticsAPI.getRecurringConversionMetrics(startDateStr, endDate, groupBy)
      return data || { summary: {}, byFrequency: {}, timeSeries: [], customerBreakdown: [] }
    } catch (error) {
      console.error('Error fetching recurring conversion analytics:', error)
      return { summary: {}, byFrequency: {}, timeSeries: [], customerBreakdown: [] }
    }
  }

  const fetchLostCustomersAnalytics = async () => {
    try {
      const endDate = new Date().toISOString().split('T')[0]
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - parseInt(dateRange))
      const startDateStr = startDate.toISOString().split('T')[0]
      
      const groupBy = trendView === 'daily' ? 'day' : trendView === 'weekly' ? 'week' : 'month'
      const data = await analyticsAPI.getLostCustomersMetrics(startDateStr, endDate, groupBy, inactiveDaysThreshold)
      return data || { summary: {}, timeSeries: [], lostCustomersList: [] }
    } catch (error) {
      console.error('Error fetching lost customers analytics:', error)
      return { summary: {}, timeSeries: [], lostCustomersList: [] }
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

  const exportToPDF = () => {
    const doc = new jsPDF()
    
    // Title
    doc.setFontSize(18)
    doc.text('Analytics Report', 14, 22)
    
    // Date range
    doc.setFontSize(12)
    doc.text(`Date Range: Last ${dateRange} days`, 14, 30)
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 36)
    
    // Overview metrics
    let yPos = 50
    doc.setFontSize(14)
    doc.text('Overview Metrics', 14, yPos)
    yPos += 10
    
    doc.setFontSize(11)
    const overviewData = [
      ['Metric', 'Value'],
      ['Total Revenue', formatCurrency(overview.totalRevenue)],
      ['Total Jobs', overview.totalJobs],
      ['Completed Jobs', overview.completedJobs],
      ['Completion Rate', `${overview.completionRate}%`],
      ['Average Job Value', formatCurrency(overview.avgJobValue)]
    ]
    
    autoTable(doc, {
      startY: yPos,
      head: [overviewData[0]],
      body: overviewData.slice(1),
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] }
    })
    
    // Customer Analytics
    // Get the final Y position from the previous table
    const previousTableFinalY = doc.lastAutoTable?.finalY || yPos + 30
    yPos = previousTableFinalY + 20
    doc.setFontSize(14)
    doc.text('Customer Analytics', 14, yPos)
    yPos += 10
    
    const customerData = [
      ['Metric', 'Value'],
      ['Total Customers', customerAnalytics.totalCustomers],
      ['Active Customers', customerAnalytics.activeCustomers],
      ['Average Lifetime Value', formatCurrency(customerAnalytics.avgLTV)],
      ['Repeat Customers', customerAnalytics.repeatCustomers],
      ['New Customers (30d)', customerAnalytics.newCustomers]
    ]
    
    autoTable(doc, {
      startY: yPos,
      head: [customerData[0]],
      body: customerData.slice(1),
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] }
    })
    
    // Salary Analytics
    const salaryTableFinalY = doc.lastAutoTable?.finalY || yPos + 30
    yPos = salaryTableFinalY + 20
    doc.setFontSize(14)
    doc.text('Salary Analytics', 14, yPos)
    yPos += 10
    
    const salarySummaryData = [
      ['Metric', 'Value'],
      ['Total Payroll', formatCurrency(salaryAnalytics.summary?.totalPayroll || 0)],
      ['Total Hourly Payroll', formatCurrency(salaryAnalytics.summary?.totalHourlyPayroll || 0)],
      ['Total Commission Payroll', formatCurrency(salaryAnalytics.summary?.totalCommissionPayroll || 0)],
      ['Team Members', salaryAnalytics.summary?.memberCount || 0],
      ['Hourly Only', salaryAnalytics.summary?.hourlyOnlyCount || 0],
      ['Commission Only', salaryAnalytics.summary?.commissionOnlyCount || 0],
      ['Hybrid', salaryAnalytics.summary?.hybridCount || 0]
    ]
    
    autoTable(doc, {
      startY: yPos,
      head: [salarySummaryData[0]],
      body: salarySummaryData.slice(1),
      theme: 'striped',
      headStyles: { fillColor: [139, 92, 246] }
    })
    
    // Team Member Salary Breakdown
    if (salaryAnalytics.memberBreakdown && salaryAnalytics.memberBreakdown.length > 0) {
      const memberTableFinalY = doc.lastAutoTable?.finalY || yPos + 30
      yPos = memberTableFinalY + 20
      doc.setFontSize(14)
      doc.text('Salary by Team Member', 14, yPos)
      yPos += 10
      
      const memberData = [
        ['Team Member', 'Payment Method', 'Hours', 'Hourly Salary', 'Commission', 'Total Salary', 'Jobs'],
        ...salaryAnalytics.memberBreakdown.map(m => [
          m.name,
          m.paymentMethod === 'hybrid' ? 'Hybrid' : m.paymentMethod === 'hourly' ? 'Hourly' : m.paymentMethod === 'commission' ? 'Commission' : 'None',
          m.totalHours.toFixed(2),
          formatCurrency(m.totalHourlySalary),
          formatCurrency(m.totalCommission),
          formatCurrency(m.totalSalary),
          m.jobCount
        ])
      ]
      
      autoTable(doc, {
        startY: yPos,
        head: [memberData[0]],
        body: memberData.slice(1),
        theme: 'striped',
        headStyles: { fillColor: [139, 92, 246] }
      })
    }
    
    // Save PDF
    doc.save(`analytics-report-${new Date().toISOString().split('T')[0]}.pdf`)
  }

  const exportToExcel = () => {
    // Create workbook
    const wb = XLSX.utils.book_new()
    
    // Overview sheet
    const overviewData = [
      ['Metric', 'Value'],
      ['Total Revenue', overview.totalRevenue],
      ['Total Jobs', overview.totalJobs],
      ['Completed Jobs', overview.completedJobs],
      ['Completion Rate', `${overview.completionRate}%`],
      ['Average Job Value', overview.avgJobValue]
    ]
    const overviewWS = XLSX.utils.aoa_to_sheet(overviewData)
    XLSX.utils.book_append_sheet(wb, overviewWS, 'Overview')
    
    // Revenue data sheet
    const revenueSheetData = [['Date', 'Revenue'], ...revenueData.map(d => [d.date, d.revenue])]
    const revenueWS = XLSX.utils.aoa_to_sheet(revenueSheetData)
    XLSX.utils.book_append_sheet(wb, revenueWS, 'Revenue')
    
    // Job metrics sheet
    const jobMetricsData = [
      ['Status', 'Count'],
      ...Object.entries(jobMetrics.statusCounts || {}).map(([status, count]) => [status, count])
    ]
    const jobMetricsWS = XLSX.utils.aoa_to_sheet(jobMetricsData)
    XLSX.utils.book_append_sheet(wb, jobMetricsWS, 'Job Metrics')
    
    // Team performance sheet
    const teamData = [
      ['Name', 'Total Jobs', 'Completed Jobs', 'Completion Rate', 'Avg Job Value'],
      ...teamPerformance.map(m => [
        `${m.first_name} ${m.last_name}`,
        m.totalJobs,
        m.completedJobs,
        m.completionRate,
        m.avgJobValue
      ])
    ]
    const teamWS = XLSX.utils.aoa_to_sheet(teamData)
    XLSX.utils.book_append_sheet(wb, teamWS, 'Team Performance')
    
    // Customer analytics sheet
    const customerData = [
      ['Metric', 'Value'],
      ['Total Customers', customerAnalytics.totalCustomers],
      ['Active Customers', customerAnalytics.activeCustomers],
      ['Average Lifetime Value', customerAnalytics.avgLTV],
      ['Repeat Customers', customerAnalytics.repeatCustomers],
      ['New Customers (30d)', customerAnalytics.newCustomers]
    ]
    const customerWS = XLSX.utils.aoa_to_sheet(customerData)
    XLSX.utils.book_append_sheet(wb, customerWS, 'Customers')
    
    // Salary analytics summary sheet
    const salarySummaryData = [
      ['Metric', 'Value'],
      ['Total Payroll', salaryAnalytics.summary?.totalPayroll || 0],
      ['Total Hourly Payroll', salaryAnalytics.summary?.totalHourlyPayroll || 0],
      ['Total Commission Payroll', salaryAnalytics.summary?.totalCommissionPayroll || 0],
      ['Team Members', salaryAnalytics.summary?.memberCount || 0],
      ['Hourly Only', salaryAnalytics.summary?.hourlyOnlyCount || 0],
      ['Commission Only', salaryAnalytics.summary?.commissionOnlyCount || 0],
      ['Hybrid', salaryAnalytics.summary?.hybridCount || 0]
    ]
    const salarySummaryWS = XLSX.utils.aoa_to_sheet(salarySummaryData)
    XLSX.utils.book_append_sheet(wb, salarySummaryWS, 'Salary Summary')
    
    // Salary time series sheet
    const salaryTimeSeriesData = [
      ['Date', 'Total Payroll', 'Hourly Payroll', 'Commission Payroll'],
      ...(salaryAnalytics.timeSeries || []).map(d => [
        d.date,
        d.totalPayroll || 0,
        d.hourlyPayroll || 0,
        d.commissionPayroll || 0
      ])
    ]
    const salaryTimeSeriesWS = XLSX.utils.aoa_to_sheet(salaryTimeSeriesData)
    XLSX.utils.book_append_sheet(wb, salaryTimeSeriesWS, 'Salary Trends')
    
    // Team member salary breakdown sheet
    const salaryMemberData = [
      ['Team Member', 'Payment Method', 'Hours', 'Hourly Salary', 'Commission', 'Total Salary', 'Jobs'],
      ...(salaryAnalytics.memberBreakdown || []).map(m => [
        m.name,
        m.paymentMethod === 'hybrid' ? 'Hybrid' : m.paymentMethod === 'hourly' ? 'Hourly' : m.paymentMethod === 'commission' ? 'Commission' : 'None',
        m.totalHours,
        m.totalHourlySalary,
        m.totalCommission,
        m.totalSalary,
        m.jobCount
      ])
    ]
    const salaryMemberWS = XLSX.utils.aoa_to_sheet(salaryMemberData)
    XLSX.utils.book_append_sheet(wb, salaryMemberWS, 'Salary by Member')
    
    // Save file
    XLSX.writeFile(wb, `analytics-report-${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} activePage="analytics" />
        <div className="flex-1 flex flex-col min-w-0 ">
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

      <div className="flex-1 flex flex-col min-w-0 ">

        <div className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto px-6 py-8">
            {/* Header */}
            <div className="mb-8 relative">
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
                  <select
                    value={trendView}
                    onChange={(e) => setTrendView(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                  <div className="flex items-center space-x-2 border-l border-gray-300 pl-4">
                    <button
                      onClick={exportToPDF}
                      className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      title="Export to PDF"
                    >
                      <FileText className="w-4 h-4" />
                      <span className="hidden sm:inline">PDF</span>
                    </button>
                    <button
                      onClick={exportToExcel}
                      className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      title="Export to Excel"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      <span className="hidden sm:inline">Excel</span>
                    </button>
                  </div>
                  <button
                    onClick={() => fetchAnalytics(false)}
                    disabled={refreshing || loading}
                    className={`p-2 text-gray-400 hover:text-gray-600 transition-colors ${refreshing || loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title="Refresh data"
                  >
                    <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
                  </button>
                  {refreshing && (
                    <div className="absolute top-16 right-4 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-sm text-blue-700 shadow-sm z-10 flex items-center space-x-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Updating data...</span>
                    </div>
                  )}
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
                { id: "customers", label: "Customers", icon: Star },
                { id: "salary", label: "Salary", icon: DollarSign },
                { id: "conversion", label: "Conversion", icon: TrendingUp }
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
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Revenue Trend ({trendView})</h3>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setTrendView('daily')}
                        className={`px-3 py-1 text-sm rounded-md ${
                          trendView === 'daily' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Daily
                      </button>
                      <button
                        onClick={() => setTrendView('weekly')}
                        className={`px-3 py-1 text-sm rounded-md ${
                          trendView === 'weekly' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Weekly
                      </button>
                      <button
                        onClick={() => setTrendView('monthly')}
                        className={`px-3 py-1 text-sm rounded-md ${
                          trendView === 'monthly' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Monthly
                      </button>
                    </div>
                  </div>
                  <RevenueChart data={revenueData} type="area" />
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
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
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
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-md font-semibold text-gray-700">Revenue Trend ({trendView})</h4>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setTrendView('daily')}
                        className={`px-3 py-1 text-sm rounded-md ${
                          trendView === 'daily' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Daily
                      </button>
                      <button
                        onClick={() => setTrendView('weekly')}
                        className={`px-3 py-1 text-sm rounded-md ${
                          trendView === 'weekly' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Weekly
                      </button>
                      <button
                        onClick={() => setTrendView('monthly')}
                        className={`px-3 py-1 text-sm rounded-md ${
                          trendView === 'monthly' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Monthly
                      </button>
                    </div>
                  </div>
                  <RevenueChart data={revenueData} type="line" />
                </div>
              </div>
            )}

            {/* Jobs Tab */}
            {activeTab === "jobs" && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">Job Status Distribution</h3>
                  
                  {/* Status Cards and Chart Layout */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                    {/* Status Cards - Left Column */}
                    <div className="lg:col-span-2 space-y-3">
                      {Object.entries(jobMetrics.statusCounts || {}).map(([status, count]) => {
                        const total = jobMetrics.totalJobs || 1
                        const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : 0
                        const statusLabel = status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
                        
                        return (
                          <div 
                            key={status} 
                            className={`border-2 rounded-lg p-4 transition-all hover:shadow-md ${
                              getStatusColor(status).includes('green') ? 'border-green-200 bg-green-50' :
                              getStatusColor(status).includes('yellow') ? 'border-yellow-200 bg-yellow-50' :
                              getStatusColor(status).includes('blue') ? 'border-blue-200 bg-blue-50' :
                              getStatusColor(status).includes('red') ? 'border-red-200 bg-red-50' :
                              'border-gray-200 bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className={`px-3 py-1 rounded-lg text-sm font-semibold ${getStatusColor(status)}`}>
                                  {statusLabel}
                                </div>
                                <span className="text-sm text-gray-500">
                                  {percentage}%
                                </span>
                              </div>
                              <div className="text-right">
                                <p className="text-3xl font-bold text-gray-900">{count}</p>
                                <p className="text-xs text-gray-500 mt-1">jobs</p>
                              </div>
                            </div>
                            {/* Progress bar */}
                            <div className="mt-3 w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                              <div 
                                className={`h-full transition-all ${
                                  getStatusColor(status).includes('green') ? 'bg-green-500' :
                                  getStatusColor(status).includes('yellow') ? 'bg-yellow-500' :
                                  getStatusColor(status).includes('blue') ? 'bg-blue-500' :
                                  getStatusColor(status).includes('red') ? 'bg-red-500' :
                                  'bg-gray-500'
                                }`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    
                    {/* Pie Chart - Right Column */}
                    <div className="lg:col-span-1">
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <h4 className="text-sm font-semibold text-gray-700 mb-4 text-center">Visual Distribution</h4>
                        <JobStatusChart data={jobMetrics.statusCounts || {}} />
                      </div>
                    </div>
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

                {/* Lost Customers Section */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">Lost Customers Analytics</h3>
                    <div className="flex items-center space-x-2">
                      <label className="text-sm text-gray-600">Inactive threshold:</label>
                      <select
                        value={inactiveDaysThreshold}
                        onChange={(e) => {
                          setInactiveDaysThreshold(parseInt(e.target.value))
                        }}
                        className="border border-gray-300 rounded-lg px-3 py-1 text-sm focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value={30}>30 days</option>
                        <option value={60}>60 days</option>
                        <option value={90}>90 days</option>
                        <option value={120}>120 days</option>
                        <option value={180}>180 days</option>
                      </select>
                    </div>
                  </div>

                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                    <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                      <p className="text-sm text-red-600 font-medium">Lost Customers</p>
                      <p className="text-2xl font-bold text-red-900 mt-2">
                        {lostCustomersAnalytics.summary?.lostCustomers || 0}
                      </p>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                      <p className="text-sm text-orange-600 font-medium">Churn Rate</p>
                      <p className="text-2xl font-bold text-orange-900 mt-2">
                        {lostCustomersAnalytics.summary?.churnRate?.toFixed(1) || 0}%
                      </p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                      <p className="text-sm text-purple-600 font-medium">Revenue Lost</p>
                      <p className="text-2xl font-bold text-purple-900 mt-2">
                        {formatCurrency(lostCustomersAnalytics.summary?.lostRevenue || 0)}
                      </p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                      <p className="text-sm text-blue-600 font-medium">Avg Days Inactive</p>
                      <p className="text-2xl font-bold text-blue-900 mt-2">
                        {lostCustomersAnalytics.summary?.avgDaysSinceLastJob?.toFixed(0) || 0}
                      </p>
                    </div>
                  </div>

                  {/* Additional Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <p className="text-2xl font-bold text-gray-900">{lostCustomersAnalytics.summary?.activeCustomers || 0}</p>
                      <p className="text-sm text-gray-600 mt-1">Active Customers</p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <p className="text-2xl font-bold text-gray-900">{lostCustomersAnalytics.summary?.neverActiveCustomers || 0}</p>
                      <p className="text-sm text-gray-600 mt-1">Never Active</p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <p className="text-2xl font-bold text-gray-900">{lostCustomersAnalytics.summary?.totalCustomers || 0}</p>
                      <p className="text-sm text-gray-600 mt-1">Total Customers</p>
                    </div>
                  </div>

                  {/* Churn Trend Chart */}
                  {lostCustomersAnalytics.timeSeries && lostCustomersAnalytics.timeSeries.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-md font-semibold text-gray-900 mb-4">Churn Trend ({trendView})</h4>
                      <ResponsiveContainer width="100%" height={250}>
                        <AreaChart data={lostCustomersAnalytics.timeSeries}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                          <XAxis 
                            dataKey="date" 
                            stroke="#6B7280"
                            tick={{ fill: '#6B7280', fontSize: 12 }}
                            tickFormatter={(value) => {
                              if (trendView === 'monthly') {
                                return value
                              }
                              const date = new Date(value)
                              return `${date.getMonth() + 1}/${date.getDate()}`
                            }}
                          />
                          <YAxis 
                            stroke="#6B7280"
                            tick={{ fill: '#6B7280', fontSize: 12 }}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#fff',
                              border: '1px solid #E5E7EB',
                              borderRadius: '8px'
                            }}
                            formatter={(value, name) => {
                              if (name === 'lostRevenue') {
                                return [formatCurrency(value), 'Lost Revenue']
                              }
                              return [value, 'Lost Customers']
                            }}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="lostCustomers" 
                            stroke="#EF4444" 
                            fill="#EF4444" 
                            fillOpacity={0.2}
                            name="Lost Customers"
                          />
                          <Area 
                            type="monotone" 
                            dataKey="lostRevenue" 
                            stroke="#8B5CF6" 
                            fill="#8B5CF6" 
                            fillOpacity={0.2}
                            name="Lost Revenue"
                          />
                          <Legend />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Lost Customers List */}
                  {lostCustomersAnalytics.lostCustomersList && lostCustomersAnalytics.lostCustomersList.length > 0 && (
                    <div>
                      <h4 className="text-md font-semibold text-gray-900 mb-4">Lost Customers List</h4>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Job Date</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Days Inactive</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Revenue</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Jobs</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {lostCustomersAnalytics.lostCustomersList.map((customer) => (
                              <tr key={customer.customerId}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                  {customer.email || 'N/A'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                  {customer.lastJobDate ? new Date(customer.lastJobDate).toLocaleDateString() : 'Never'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                    (customer.daysSinceLastJob || 0) >= 180 ? 'bg-red-100 text-red-800' :
                                    (customer.daysSinceLastJob || 0) >= 120 ? 'bg-orange-100 text-orange-800' :
                                    'bg-yellow-100 text-yellow-800'
                                  }`}>
                                    {customer.daysSinceLastJob || 0} days
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                                  {formatCurrency(customer.totalRevenue)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                  {customer.totalJobs}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Salary Tab */}
            {activeTab === "salary" && (
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Total Payroll</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">
                          {formatCurrency(salaryAnalytics.summary?.totalPayroll || 0)}
                        </p>
                      </div>
                      <DollarSign className="w-8 h-8 text-blue-600" />
                    </div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Hourly Payroll</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">
                          {formatCurrency(salaryAnalytics.summary?.totalHourlyPayroll || 0)}
                        </p>
                      </div>
                      <Clock className="w-8 h-8 text-green-600" />
                    </div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Commission Payroll</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">
                          {formatCurrency(salaryAnalytics.summary?.totalCommissionPayroll || 0)}
                        </p>
                      </div>
                      <TrendingUp className="w-8 h-8 text-purple-600" />
                    </div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Team Members</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">
                          {salaryAnalytics.summary?.memberCount || 0}
                        </p>
                      </div>
                      <Users className="w-8 h-8 text-orange-600" />
                    </div>
                  </div>
                </div>

                {/* Payment Method Breakdown */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Method Distribution</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                      <p className="text-sm text-blue-600 font-medium">Hourly Only</p>
                      <p className="text-2xl font-bold text-blue-900 mt-2">
                        {salaryAnalytics.summary?.hourlyOnlyCount || 0}
                      </p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                      <p className="text-sm text-purple-600 font-medium">Commission Only</p>
                      <p className="text-2xl font-bold text-purple-900 mt-2">
                        {salaryAnalytics.summary?.commissionOnlyCount || 0}
                      </p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                      <p className="text-sm text-green-600 font-medium">Hybrid</p>
                      <p className="text-2xl font-bold text-green-900 mt-2">
                        {salaryAnalytics.summary?.hybridCount || 0}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Payroll Trend Chart */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Payroll Trend ({trendView})</h3>
                  {salaryAnalytics.timeSeries && salaryAnalytics.timeSeries.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={salaryAnalytics.timeSeries}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis 
                          dataKey="date" 
                          stroke="#6B7280"
                          tick={{ fill: '#6B7280', fontSize: 12 }}
                          tickFormatter={(value) => {
                            if (trendView === 'monthly') {
                              return value
                            }
                            const date = new Date(value)
                            return `${date.getMonth() + 1}/${date.getDate()}`
                          }}
                        />
                        <YAxis 
                          stroke="#6B7280"
                          tick={{ fill: '#6B7280', fontSize: 12 }}
                          tickFormatter={(value) => `$${value.toLocaleString()}`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#fff',
                            border: '1px solid #E5E7EB',
                            borderRadius: '8px'
                          }}
                          formatter={(value) => [`$${value.toLocaleString()}`, '']}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="totalPayroll" 
                          stroke="#3B82F6" 
                          fill="#3B82F6" 
                          fillOpacity={0.2}
                          name="Total Payroll"
                        />
                        <Area 
                          type="monotone" 
                          dataKey="hourlyPayroll" 
                          stroke="#10B981" 
                          fill="#10B981" 
                          fillOpacity={0.2}
                          name="Hourly Payroll"
                        />
                        <Area 
                          type="monotone" 
                          dataKey="commissionPayroll" 
                          stroke="#8B5CF6" 
                          fill="#8B5CF6" 
                          fillOpacity={0.2}
                          name="Commission Payroll"
                        />
                        <Legend />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-gray-500">
                      No payroll data available
                    </div>
                  )}
                </div>

                {/* Team Member Breakdown */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Salary by Team Member</h3>
                  {salaryAnalytics.memberBreakdown && salaryAnalytics.memberBreakdown.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Team Member</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Method</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hours</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hourly Salary</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Commission</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Salary</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jobs</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {salaryAnalytics.memberBreakdown.map((member) => (
                            <tr key={member.memberId}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{member.name}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                  member.paymentMethod === 'hybrid' ? 'bg-green-100 text-green-800' :
                                  member.paymentMethod === 'hourly' ? 'bg-blue-100 text-blue-800' :
                                  member.paymentMethod === 'commission' ? 'bg-purple-100 text-purple-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {member.paymentMethod === 'hybrid' ? 'Hybrid' :
                                   member.paymentMethod === 'hourly' ? 'Hourly' :
                                   member.paymentMethod === 'commission' ? 'Commission' : 'None'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                {member.totalHours.toFixed(2)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {formatCurrency(member.totalHourlySalary)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {formatCurrency(member.totalCommission)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                                {formatCurrency(member.totalSalary)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                {member.jobCount}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No team member salary data available
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Conversion Tab */}
            {activeTab === "conversion" && (
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Total Leads</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">
                          {conversionAnalytics.summary?.totalLeads || 0}
                        </p>
                      </div>
                      <Users className="w-8 h-8 text-blue-600" />
                    </div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Converted Leads</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">
                          {conversionAnalytics.summary?.convertedLeads || 0}
                        </p>
                      </div>
                      <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Conversion Rate</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">
                          {conversionAnalytics.summary?.conversionRate?.toFixed(1) || 0}%
                        </p>
                      </div>
                      <TrendingUp className="w-8 h-8 text-purple-600" />
                    </div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Avg Time to Convert</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">
                          {conversionAnalytics.summary?.avgTimeToConversion?.toFixed(1) || 0} days
                        </p>
                      </div>
                      <Clock className="w-8 h-8 text-orange-600" />
                    </div>
                  </div>
                </div>

                {/* Conversion Funnel */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Conversion Funnel</h3>
                  <div className="space-y-4">
                    {/* Total Leads */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Total Leads</span>
                        <span className="text-sm text-gray-600">{conversionAnalytics.summary?.totalLeads || 0}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-8">
                        <div 
                          className="bg-blue-600 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                          style={{ width: '100%' }}
                        >
                          100%
                        </div>
                      </div>
                    </div>
                    
                    {/* Converted Leads */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Converted to Customers</span>
                        <span className="text-sm text-gray-600">
                          {conversionAnalytics.summary?.convertedLeads || 0} 
                          ({conversionAnalytics.summary?.conversionRate?.toFixed(1) || 0}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-8">
                        <div 
                          className="bg-green-600 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                          style={{ 
                            width: `${Math.min((conversionAnalytics.summary?.conversionRate || 0), 100)}%` 
                          }}
                        >
                          {conversionAnalytics.summary?.conversionRate?.toFixed(1) || 0}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Conversion Trend Chart */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Conversion Trend ({trendView})</h3>
                  {conversionAnalytics.timeSeries && conversionAnalytics.timeSeries.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={conversionAnalytics.timeSeries}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis 
                          dataKey="date" 
                          stroke="#6B7280"
                          tick={{ fill: '#6B7280', fontSize: 12 }}
                          tickFormatter={(value) => {
                            if (trendView === 'monthly') {
                              return value
                            }
                            const date = new Date(value)
                            return `${date.getMonth() + 1}/${date.getDate()}`
                          }}
                        />
                        <YAxis 
                          stroke="#6B7280"
                          tick={{ fill: '#6B7280', fontSize: 12 }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#fff',
                            border: '1px solid #E5E7EB',
                            borderRadius: '8px'
                          }}
                          formatter={(value, name) => {
                            if (name === 'conversionRate') {
                              return [`${value.toFixed(1)}%`, 'Conversion Rate']
                            }
                            return [value, name === 'totalLeads' ? 'Total Leads' : 'Converted Leads']
                          }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="totalLeads" 
                          stroke="#3B82F6" 
                          fill="#3B82F6" 
                          fillOpacity={0.2}
                          name="Total Leads"
                        />
                        <Area 
                          type="monotone" 
                          dataKey="convertedLeads" 
                          stroke="#10B981" 
                          fill="#10B981" 
                          fillOpacity={0.2}
                          name="Converted Leads"
                        />
                        <Area 
                          type="monotone" 
                          dataKey="conversionRate" 
                          stroke="#8B5CF6" 
                          fill="#8B5CF6" 
                          fillOpacity={0.2}
                          name="Conversion Rate (%)"
                        />
                        <Legend />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-gray-500">
                      No conversion data available
                    </div>
                  )}
                </div>

                {/* Conversion by Source */}
                {conversionAnalytics.bySource && Object.keys(conversionAnalytics.bySource).length > 0 && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Conversion by Source</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Leads</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Converted</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Conversion Rate</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Value</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Converted Value</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {Object.entries(conversionAnalytics.bySource)
                            .sort((a, b) => b[1].total - a[1].total)
                            .map(([source, data]) => (
                            <tr key={source}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{source}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{data.total}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{data.converted}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                  data.conversionRate >= 50 ? 'bg-green-100 text-green-800' :
                                  data.conversionRate >= 25 ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {data.conversionRate.toFixed(1)}%
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatCurrency(data.totalValue)}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{formatCurrency(data.convertedValue)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Conversion by Stage */}
                {conversionAnalytics.byStage && Object.keys(conversionAnalytics.byStage).length > 0 && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Conversion by Stage</h3>
                    <div className="space-y-3">
                      {Object.entries(conversionAnalytics.byStage)
                        .sort((a, b) => b[1].total - a[1].total)
                        .map(([stage, data]) => (
                        <div key={stage} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-900">{stage}</span>
                            <span className="text-sm text-gray-600">
                              {data.converted} / {data.total} ({data.conversionRate.toFixed(1)}%)
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                data.conversionRate >= 50 ? 'bg-green-500' :
                                data.conversionRate >= 25 ? 'bg-yellow-500' :
                                'bg-red-500'
                              }`}
                              style={{ width: `${Math.min(data.conversionRate, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recurring Conversion Section */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">Customer to Recurring Conversion</h3>
                  
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                      <p className="text-sm text-blue-600 font-medium">One-Time Only</p>
                      <p className="text-2xl font-bold text-blue-900 mt-2">
                        {recurringConversionAnalytics.summary?.oneTimeOnlyCustomers || 0}
                      </p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                      <p className="text-sm text-green-600 font-medium">Converted to Recurring</p>
                      <p className="text-2xl font-bold text-green-900 mt-2">
                        {recurringConversionAnalytics.summary?.convertedCustomers || 0}
                      </p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                      <p className="text-sm text-purple-600 font-medium">Conversion Rate</p>
                      <p className="text-2xl font-bold text-purple-900 mt-2">
                        {recurringConversionAnalytics.summary?.conversionRate?.toFixed(1) || 0}%
                      </p>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                      <p className="text-sm text-orange-600 font-medium">Avg Days to Convert</p>
                      <p className="text-2xl font-bold text-orange-900 mt-2">
                        {recurringConversionAnalytics.summary?.avgDaysToConvert?.toFixed(0) || 0}
                      </p>
                    </div>
                  </div>

                  {/* Customer Breakdown */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <p className="text-2xl font-bold text-gray-900">{recurringConversionAnalytics.summary?.totalCustomers || 0}</p>
                      <p className="text-sm text-gray-600 mt-1">Total Customers</p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <p className="text-2xl font-bold text-gray-900">{recurringConversionAnalytics.summary?.recurringOnlyCustomers || 0}</p>
                      <p className="text-sm text-gray-600 mt-1">Recurring Only</p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <p className="text-2xl font-bold text-gray-900">{recurringConversionAnalytics.summary?.customersWithOneTimeJobs || 0}</p>
                      <p className="text-sm text-gray-600 mt-1">With One-Time Jobs</p>
                    </div>
                  </div>

                  {/* Revenue Impact */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm text-blue-600 font-medium">One-Time Revenue</p>
                      <p className="text-xl font-bold text-blue-900 mt-1">
                        {formatCurrency(recurringConversionAnalytics.summary?.totalOneTimeRevenue || 0)}
                      </p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-sm text-green-600 font-medium">Recurring Revenue</p>
                      <p className="text-xl font-bold text-green-900 mt-1">
                        {formatCurrency(recurringConversionAnalytics.summary?.totalRecurringRevenue || 0)}
                      </p>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                      <p className="text-sm text-purple-600 font-medium">From Converted Customers</p>
                      <p className="text-xl font-bold text-purple-900 mt-1">
                        {formatCurrency(recurringConversionAnalytics.summary?.convertedCustomerRevenue || 0)}
                      </p>
                    </div>
                  </div>

                  {/* Conversion Trend Chart */}
                  {recurringConversionAnalytics.timeSeries && recurringConversionAnalytics.timeSeries.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-md font-semibold text-gray-900 mb-4">Conversion Trend ({trendView})</h4>
                      <ResponsiveContainer width="100%" height={250}>
                        <AreaChart data={recurringConversionAnalytics.timeSeries}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                          <XAxis 
                            dataKey="date" 
                            stroke="#6B7280"
                            tick={{ fill: '#6B7280', fontSize: 12 }}
                            tickFormatter={(value) => {
                              if (trendView === 'monthly') {
                                return value
                              }
                              const date = new Date(value)
                              return `${date.getMonth() + 1}/${date.getDate()}`
                            }}
                          />
                          <YAxis 
                            stroke="#6B7280"
                            tick={{ fill: '#6B7280', fontSize: 12 }}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#fff',
                              border: '1px solid #E5E7EB',
                              borderRadius: '8px'
                            }}
                            formatter={(value, name) => {
                              if (name === 'revenue') {
                                return [formatCurrency(value), 'Revenue']
                              }
                              return [value, 'Conversions']
                            }}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="conversions" 
                            stroke="#10B981" 
                            fill="#10B981" 
                            fillOpacity={0.2}
                            name="Conversions"
                          />
                          <Area 
                            type="monotone" 
                            dataKey="revenue" 
                            stroke="#8B5CF6" 
                            fill="#8B5CF6" 
                            fillOpacity={0.2}
                            name="Revenue"
                          />
                          <Legend />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Breakdown by Frequency */}
                  {recurringConversionAnalytics.byFrequency && Object.keys(recurringConversionAnalytics.byFrequency).length > 0 && (
                    <div>
                      <h4 className="text-md font-semibold text-gray-900 mb-4">Recurring Jobs by Frequency</h4>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Frequency</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customers</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jobs</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {Object.values(recurringConversionAnalytics.byFrequency)
                              .sort((a, b) => b.customerCount - a.customerCount)
                              .map((freq, index) => (
                              <tr key={index}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 capitalize">
                                  {freq.frequency}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                  {freq.customerCount}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                  {freq.jobCount}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                                  {formatCurrency(freq.revenue)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
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
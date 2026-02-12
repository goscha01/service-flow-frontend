"use client"

import { useState, useEffect } from "react"
import Sidebar from "../components/sidebar"
import { Search, ChevronDown, DollarSign, ChevronLeft, ChevronRight, Calendar, Check, X, Clock } from "lucide-react"
import { useAuth } from "../context/AuthContext"

const ServiceFlowPayments = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [payments, setPayments] = useState([])
  const [metrics, setMetrics] = useState({
    successfulCharges: 0,
    recordedPayments: 0,
    grossRevenue: 0
  })
  const [filters, setFilters] = useState({
    dateRange: 'Last 7 days',
    status: 'Any Status',
    paymentMethod: 'All Payment Methods',
    searchQuery: ''
  })
  
  const { user } = useAuth()

  useEffect(() => {
    if (user?.id) {
      loadPaymentData()
    }
  }, [user?.id])

  const loadPaymentData = async () => {
    try {
      setLoading(true)
      // Load payments from jobs table where payment_status is 'paid'
      const response = await fetch(`/api/jobs?userId=${user.id}&paymentStatus=paid`)
      const data = await response.json()
      
      if (data.success) {
        const paidJobs = data.jobs || []
        setPayments(paidJobs)
        
        // Calculate metrics
        const successfulCharges = paidJobs.length
        const grossRevenue = paidJobs.reduce((total, job) => total + (parseFloat(job.total) || 0), 0)
        
        setMetrics({
          successfulCharges,
          recordedPayments: successfulCharges,
          grossRevenue
        })
      }
    } catch (error) {
      console.error('Error loading payment data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'paid':
        return <Check className="w-4 h-4 text-green-500" />
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />
      case 'failed':
        return <X className="w-4 h-4 text-red-500" />
      default:
        return <Clock className="w-4 h-4 text-gray-400" />
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} activePage="payments" />
        <div className="flex-1 flex flex-col min-w-0 lg:mx-44 xl:mx-48">
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading payment data...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Main Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} activePage="payments" />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64 xl:ml-72">
        {/* Mobile Header */}

        {/* Desktop Header */}
        <div className="hidden lg:flex bg-white border-b border-gray-200 px-6 py-4 items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Payments</h1>
        </div>

        {/* Mobile Header Content */}
        <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-4">
          <h1 className="text-xl font-semibold text-gray-900">Payments</h1>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto p-6">
            {/* Search and Metrics */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 mb-6">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search transactions..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-4 lg:gap-8">
                  <div className="text-center">
                    <div className="text-sm text-gray-600">Successful charges</div>
                    <div className="text-2xl font-bold text-gray-900">{metrics.successfulCharges}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-600">Recorded payments</div>
                    <div className="text-2xl font-bold text-gray-900">{metrics.recordedPayments}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-600">Gross revenue</div>
                    <div className="text-2xl font-bold text-gray-900">{formatCurrency(metrics.grossRevenue)}</div>
                  </div>
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-col lg:flex-row lg:items-center space-y-4 lg:space-y-0 lg:space-x-4">
                <div className="relative">
                  <select className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none">
                    <option>Last 7 days</option>
                    <option>Last 30 days</option>
                    <option>Last 90 days</option>
                    <option>Custom range</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                </div>

                <div className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-700">Jun 17 - Jun 24</span>
                </div>

                <div className="relative">
                  <select className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none">
                    <option>Any Status</option>
                    <option>Successful</option>
                    <option>Failed</option>
                    <option>Pending</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                </div>

                <div className="relative">
                  <select className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none">
                    <option>All Payment Methods</option>
                    <option>Credit Card</option>
                    <option>Bank Transfer</option>
                    <option>Cash</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Payment List or Empty State */}
            {payments.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 flex-1 flex items-center justify-center p-12">
                <div className="text-center max-w-md">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <DollarSign className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No payments to show</h3>
                  <p className="text-gray-600">There are no completed payments to display for the selected period.</p>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Payment History</h3>
                </div>
                <div className="divide-y divide-gray-200">
                  {payments.map((payment) => (
                    <div key={payment.id} className="px-6 py-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {getStatusIcon(payment.payment_status)}
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {payment.customer_name || `Job #${payment.id}`}
                            </p>
                            <p className="text-sm text-gray-500">
                              {payment.service_name || 'Service'} • {formatDate(payment.payment_date || payment.created_at)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">
                            {formatCurrency(payment.total)}
                          </p>
                          <p className="text-sm text-gray-500 capitalize">
                            {payment.payment_method || 'Credit Card'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pagination */}
            <div className="flex items-center justify-center space-x-4 mt-6">
              <button disabled className="p-2 rounded-lg border border-gray-300 text-gray-400 cursor-not-allowed">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button disabled className="p-2 rounded-lg border border-gray-300 text-gray-400 cursor-not-allowed">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ServiceFlowPayments

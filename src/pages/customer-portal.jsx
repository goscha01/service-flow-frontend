"use client"

import { useState, useEffect } from "react"
import { Calendar, Clock, User, Phone, Mail, MapPin, CreditCard, CheckCircle, AlertCircle, FileText, Eye, Download, RefreshCw } from "lucide-react"
import { formatPhoneNumber } from "../utils/phoneFormatter"

const CustomerPortal = () => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [customer, setCustomer] = useState(null)
  const [bookings, setBookings] = useState([])
  const [invoices, setInvoices] = useState([])
  const [activeTab, setActiveTab] = useState('bookings')
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("")

  // Mock customer data (in real app, this would come from authentication)
  const mockCustomer = {
    id: 1,
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@example.com",
    phone: "+1 (555) 123-4567",
    address: "123 Main St, Anytown, USA"
  }

  useEffect(() => {
    fetchCustomerData()
  }, [])

  const fetchCustomerData = async () => {
    try {
      setLoading(true)
      
      // Simulate API calls
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setCustomer(mockCustomer)
      
      // Mock bookings data
      setBookings([
        {
          id: 1,
          serviceName: "House Cleaning",
          scheduledDate: "2024-01-15",
          scheduledTime: "10:00:00",
          status: "confirmed",
          amount: 150.00,
          notes: "Regular cleaning service"
        },
        {
          id: 2,
          serviceName: "Deep Cleaning",
          scheduledDate: "2024-01-20",
          scheduledTime: "14:00:00",
          status: "pending",
          amount: 250.00,
          notes: "Deep cleaning with special attention to kitchen"
        },
        {
          id: 3,
          serviceName: "Window Cleaning",
          scheduledDate: "2024-01-10",
          scheduledTime: "09:00:00",
          status: "completed",
          amount: 100.00,
          notes: "All windows and screens"
        }
      ])
      
      // Mock invoices data
      setInvoices([
        {
          id: 1,
          invoiceNumber: "INV-001",
          amount: 150.00,
          status: "paid",
          dueDate: "2024-01-20",
          issueDate: "2024-01-15",
          description: "House Cleaning Service"
        },
        {
          id: 2,
          invoiceNumber: "INV-002",
          amount: 250.00,
          status: "pending",
          dueDate: "2024-01-25",
          issueDate: "2024-01-20",
          description: "Deep Cleaning Service"
        },
        {
          id: 3,
          invoiceNumber: "INV-003",
          amount: 100.00,
          status: "overdue",
          dueDate: "2024-01-15",
          issueDate: "2024-01-10",
          description: "Window Cleaning Service"
        }
      ])
      
    } catch (error) {
      console.error('Error fetching customer data:', error)
      setError('Failed to load customer data')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0)
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A'
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed':
      case 'paid':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'completed':
        return 'bg-blue-100 text-blue-800'
      case 'overdue':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status) => {
    switch (status) {
      case 'confirmed':
        return 'Confirmed'
      case 'pending':
        return 'Pending'
      case 'completed':
        return 'Completed'
      case 'paid':
        return 'Paid'
      case 'overdue':
        return 'Overdue'
      default:
        return 'Unknown'
    }
  }

  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = booking.serviceName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = !filterStatus || booking.status === filterStatus
    return matchesSearch && matchesStatus
  })

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = !filterStatus || invoice.status === filterStatus
    return matchesSearch && matchesStatus
  })

  const handleReschedule = (bookingId) => {
    alert(`Reschedule functionality for booking ${bookingId} would be implemented here.`)
  }

  const handleCancel = (bookingId) => {
    if (window.confirm('Are you sure you want to cancel this booking?')) {
      alert(`Cancel functionality for booking ${bookingId} would be implemented here.`)
    }
  }

  const handlePayInvoice = (invoiceId) => {
    alert(`Payment functionality for invoice ${invoiceId} would be implemented here.`)
  }

  const handleDownloadInvoice = (invoiceId) => {
    alert(`Download functionality for invoice ${invoiceId} would be implemented here.`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading customer portal...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Something went wrong</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={fetchCustomerData}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Customer Portal</h1>
              <p className="text-gray-600">Manage your bookings and invoices</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={fetchCustomerData}
                className="p-2 text-gray-400 hover:text-gray-600"
                title="Refresh data"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <User className="w-4 h-4" />
                <span>{customer?.firstName} {customer?.lastName}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Info Card */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center space-x-3">
              <User className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Name</p>
                <p className="font-medium">{customer?.firstName} {customer?.lastName}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Mail className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium">{customer?.email}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Phone className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <p className="font-medium">{customer?.phone ? formatPhoneNumber(customer.phone) : 'No phone'}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <MapPin className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Address</p>
                <p className="font-medium">
                  {customer?.address}
                  {customer?.suite && `, ${customer.suite}`}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('bookings')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'bookings'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Bookings ({bookings.length})
              </button>
              <button
                onClick={() => setActiveTab('invoices')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'invoices'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Invoices ({invoices.length})
              </button>
            </nav>
          </div>

          <div className="p-6">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 mb-6">
              <div className="relative flex-1 max-w-md">
                <input
                  type="text"
                  placeholder={`Search ${activeTab}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FileText className="h-5 w-5 text-gray-400" />
                </div>
              </div>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Status</option>
                {activeTab === 'bookings' ? (
                  <>
                    <option value="confirmed">Confirmed</option>
                    <option value="pending">Pending</option>
                    <option value="completed">Completed</option>
                  </>
                ) : (
                  <>
                    <option value="paid">Paid</option>
                    <option value="pending">Pending</option>
                    <option value="overdue">Overdue</option>
                  </>
                )}
              </select>
            </div>

            {/* Bookings Tab */}
            {activeTab === 'bookings' && (
              <div className="space-y-4">
                {filteredBookings.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No bookings found</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {searchTerm || filterStatus 
                        ? 'No bookings match your current filters.'
                        : 'You don\'t have any bookings yet.'
                      }
                    </p>
                  </div>
                ) : (
                  filteredBookings.map((booking) => (
                    <div key={booking.id} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <h3 className="font-medium text-gray-900">{booking.serviceName}</h3>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                              {getStatusLabel(booking.status)}
                            </span>
                          </div>
                          <div className="mt-2 flex items-center space-x-4 text-sm text-gray-600">
                            <div className="flex items-center">
                              <Calendar className="w-4 h-4 mr-1" />
                              <span>{formatDate(booking.scheduledDate)}</span>
                            </div>
                            <div className="flex items-center">
                              <Clock className="w-4 h-4 mr-1" />
                              <span>{formatTime(booking.scheduledTime)}</span>
                            </div>
                            <div className="flex items-center">
                              <CreditCard className="w-4 h-4 mr-1" />
                              <span>{formatCurrency(booking.amount)}</span>
                            </div>
                          </div>
                          {booking.notes && (
                            <p className="mt-2 text-sm text-gray-600">{booking.notes}</p>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          {booking.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleReschedule(booking.id)}
                                className="px-3 py-1 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                              >
                                Reschedule
                              </button>
                              <button
                                onClick={() => handleCancel(booking.id)}
                                className="px-3 py-1 text-sm border border-red-300 rounded-md text-red-700 hover:bg-red-50"
                              >
                                Cancel
                              </button>
                            </>
                          )}
                          {booking.status === 'confirmed' && (
                            <button
                              onClick={() => handleReschedule(booking.id)}
                              className="px-3 py-1 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                            >
                              Reschedule
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Invoices Tab */}
            {activeTab === 'invoices' && (
              <div className="space-y-4">
                {filteredInvoices.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No invoices found</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {searchTerm || filterStatus 
                        ? 'No invoices match your current filters.'
                        : 'You don\'t have any invoices yet.'
                      }
                    </p>
                  </div>
                ) : (
                  filteredInvoices.map((invoice) => (
                    <div key={invoice.id} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <h3 className="font-medium text-gray-900">{invoice.invoiceNumber}</h3>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                              {getStatusLabel(invoice.status)}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-gray-600">{invoice.description}</p>
                          <div className="mt-2 flex items-center space-x-4 text-sm text-gray-600">
                            <div>
                              <span className="font-medium">Amount:</span> {formatCurrency(invoice.amount)}
                            </div>
                            <div>
                              <span className="font-medium">Issue Date:</span> {formatDate(invoice.issueDate)}
                            </div>
                            <div>
                              <span className="font-medium">Due Date:</span> {formatDate(invoice.dueDate)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleDownloadInvoice(invoice.id)}
                            className="p-2 text-gray-400 hover:text-gray-600"
                            title="Download invoice"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          {invoice.status === 'pending' && (
                            <button
                              onClick={() => handlePayInvoice(invoice.id)}
                              className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                            >
                              Pay Now
                            </button>
                          )}
                          {invoice.status === 'overdue' && (
                            <button
                              onClick={() => handlePayInvoice(invoice.id)}
                              className="px-3 py-1 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
                            >
                              Pay Overdue
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CustomerPortal 
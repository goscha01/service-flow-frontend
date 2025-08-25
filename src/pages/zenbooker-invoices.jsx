"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import Sidebar from "../components/sidebar"
import MobileHeader from "../components/mobile-header"
import { Plus, Search, Filter, FileText, Send, Check, X, Eye, Edit, Trash2, Calendar, DollarSign, User, AlertCircle, RefreshCw, CreditCard, Receipt } from "lucide-react"
import { useAuth } from "../context/AuthContext"
import { invoicesAPI, customersAPI, servicesAPI } from "../services/api"
import LoadingButton from "../components/loading-button"

const ZenbookerInvoices = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [invoices, setInvoices] = useState([])
  const [customers, setCustomers] = useState([])
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [debugInfo, setDebugInfo] = useState("")
  const [filters, setFilters] = useState({
    status: "",
    customerId: "",
    search: "",
    sortBy: "created_at",
    sortOrder: "DESC"
  })
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)

  // Initial data fetch
  useEffect(() => {
    if (user?.id) {
      fetchInvoices()
      fetchCustomers()
      fetchServices()
    }
  }, [user])

  // Debounced search
  useEffect(() => {
    if (!user?.id) return
    
    const timeoutId = setTimeout(() => {
      fetchInvoices()
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [filters.status, filters.customerId, filters.search, filters.sortBy, filters.sortOrder, user])

  const fetchInvoices = async () => {
    if (!user?.id) {
      setDebugInfo("No user ID available")
      return
    }
    
    try {
      setLoading(true)
      setError("")
      setDebugInfo(`Fetching invoices for user: ${user.id}`)
      
      const response = await invoicesAPI.getAll(user.id)
      
      console.log('Invoices API response:', response)
      
      // Handle different response formats
      const invoicesData = response.invoices || response || []
      setInvoices(Array.isArray(invoicesData) ? invoicesData : [])
      
      setDebugInfo(`Loaded ${invoicesData.length} invoices`)
    } catch (error) {
      console.error('Error fetching invoices:', error)
      setError(`Failed to load invoices: ${error.message || 'Unknown error'}`)
      setDebugInfo(`Error: ${error.message}`)
      setInvoices([])
    } finally {
      setLoading(false)
    }
  }

  const fetchCustomers = async () => {
    if (!user?.id) return
    
    try {
      const response = await customersAPI.getAll({ userId: user.id })
      setCustomers(Array.isArray(response) ? response : [])
    } catch (error) {
      console.error('Error fetching customers:', error)
      setCustomers([])
    }
  }

  const fetchServices = async () => {
    if (!user?.id) return
    
    try {
      const response = await servicesAPI.getAll(user.id)
      const servicesArray = response.services || response || []
      setServices(Array.isArray(servicesArray) ? servicesArray : [])
    } catch (error) {
      console.error('Error fetching services:', error)
      setServices([])
    }
  }

  const handleCreateInvoice = () => {
    setShowCreateModal(true)
  }

  const handleEditInvoice = (invoice) => {
    setShowEditModal(true)
  }

  const handleViewInvoice = (invoice) => {
    navigate(`/invoices/${invoice.id}`)
  }

  const handleViewCustomer = (customerId) => {
    navigate(`/customer/${customerId}`)
  }

  const handleSaveInvoice = () => {
    fetchInvoices()
    setShowCreateModal(false)
    setShowEditModal(false)
  }

  const handleSendInvoiceSuccess = () => {
    fetchInvoices()
  }

  const handleMarkAsPaid = async (invoiceId) => {
    try {
      await invoicesAPI.updateStatus(invoiceId, 'paid', user.id)
      fetchInvoices()
      alert('Invoice marked as paid successfully!')
    } catch (error) {
      console.error('Error marking invoice as paid:', error)
      alert('Failed to mark invoice as paid. Please try again.')
    }
  }

  const handleDeleteInvoice = async (invoiceId) => {
    if (!window.confirm('Are you sure you want to delete this invoice?')) {
      return
    }
    
    try {
      await invoicesAPI.delete(invoiceId, user.id)
      fetchInvoices()
    } catch (error) {
      console.error('Error deleting invoice:', error)
      alert('Failed to delete invoice. Please try again.')
    }
  }

  const handleSendInvoice = async (invoiceId) => {
    try {
      await invoicesAPI.updateStatus(invoiceId, 'sent', user.id)
      fetchInvoices()
      alert('Invoice sent successfully!')
    } catch (error) {
      console.error('Error sending invoice:', error)
      alert('Failed to send invoice. Please try again.')
    }
  }

  const handleFilterChange = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
  }

  const handleRefresh = () => {
    fetchInvoices()
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800'
      case 'sent':
        return 'bg-blue-100 text-blue-800'
      case 'paid':
        return 'bg-green-100 text-green-800'
      case 'overdue':
        return 'bg-red-100 text-red-800'
      case 'cancelled':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status) => {
    switch (status) {
      case 'draft':
        return 'Draft'
      case 'sent':
        return 'Sent'
      case 'paid':
        return 'Paid'
      case 'overdue':
        return 'Overdue'
      case 'cancelled':
        return 'Cancelled'
      default:
        return 'Unknown'
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

  const isInvoiceOverdue = (dueDate, status) => {
    if (status === 'paid' || status === 'cancelled') return false
    if (!dueDate) return false
    return new Date(dueDate) < new Date()
  }

  const getTotalRevenue = () => {
    return invoices
      .filter(invoice => invoice.status === 'paid')
      .reduce((sum, invoice) => sum + (invoice.total_amount || 0), 0)
  }

  const getOutstandingAmount = () => {
    return invoices
      .filter(invoice => invoice.status === 'sent' || invoice.status === 'overdue')
      .reduce((sum, invoice) => sum + (invoice.total_amount || 0), 0)
  }

  if (!user) {
    return (
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
          <MobileHeader onMenuClick={() => setSidebarOpen(true)} />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Please log in</h2>
              <p className="text-gray-500">You need to be logged in to view invoices.</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        <MobileHeader onMenuClick={() => setSidebarOpen(true)} />
        
        <div className="flex-1 overflow-auto">
          <div className="px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
                  <p className="mt-1 text-sm text-gray-500">
                    Manage invoices and track payments
                  </p>
                  {debugInfo && (
                    <p className="mt-1 text-xs text-gray-400">{debugInfo}</p>
                  )}
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={handleRefresh}
                    disabled={loading}
                    className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                    title="Refresh invoices"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                  <button
                    onClick={handleCreateInvoice}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    New Invoice
                  </button>
                </div>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Receipt className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Total Invoices</p>
                    <p className="text-2xl font-bold text-gray-900">{invoices.length}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <DollarSign className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Total Revenue</p>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(getTotalRevenue())}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CreditCard className="h-8 w-8 text-orange-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Outstanding</p>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(getOutstandingAmount())}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search invoices..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange({ search: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>

                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                  <select
                    value={filters.status}
                    onChange={(e) => handleFilterChange({ status: e.target.value })}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    <option value="">All Status</option>
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                    <option value="cancelled">Cancelled</option>
                  </select>

                  <select
                    value={filters.customerId}
                    onChange={(e) => handleFilterChange({ customerId: e.target.value })}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    <option value="">All Customers</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.first_name} {customer.last_name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={`${filters.sortBy}:${filters.sortOrder}`}
                    onChange={(e) => {
                      const [sortBy, sortOrder] = e.target.value.split(":")
                      handleFilterChange({ sortBy, sortOrder })
                    }}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    <option value="created_at:DESC">Sort by: Newest First</option>
                    <option value="created_at:ASC">Sort by: Oldest First</option>
                    <option value="total_amount:DESC">Sort by: Highest Amount</option>
                    <option value="total_amount:ASC">Sort by: Lowest Amount</option>
                    <option value="due_date:ASC">Sort by: Due Soon</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Invoices List */}
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="flex items-center space-x-2">
                  <LoadingButton />
                  <span className="text-gray-500">Loading invoices...</span>
                </div>
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <AlertCircle className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">{error}</h3>
                    <p className="mt-1 text-sm text-red-700">
                      Please check your connection and try refreshing the page.
                    </p>
                  </div>
                </div>
              </div>
            ) : invoices.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No invoices found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {filters.status || filters.customerId || filters.search 
                    ? 'No invoices match your current filters. Try adjusting your search criteria.'
                    : 'Get started by creating your first invoice.'
                  }
                </p>
                <div className="mt-6">
                  <button
                    onClick={handleCreateInvoice}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Invoice
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                  {invoices.map((invoice) => (
                    <li key={invoice.id}>
                      <div className="px-4 py-4 sm:px-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="flex-shrink-0">
                              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                <FileText className="w-5 h-5 text-blue-600" />
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="flex items-center">
                                <p className="text-sm font-medium text-gray-900">
                                  Invoice #{invoice.id}
                                </p>
                                <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                                  {getStatusLabel(invoice.status)}
                                </span>
                                {isInvoiceOverdue(invoice.due_date, invoice.status) && (
                                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                    Overdue
                                  </span>
                                )}
                              </div>
                              <div className="mt-1 flex items-center text-sm text-gray-500">
                                <User className="w-4 h-4 mr-1" />
                                <button
                                  onClick={() => handleViewCustomer(invoice.customer_id)}
                                  className="hover:text-primary-600 hover:underline cursor-pointer transition-colors duration-200"
                                >
                                  {invoice.customer_first_name} {invoice.customer_last_name}
                                </button>
                                <span className="mx-2">•</span>
                                <DollarSign className="w-4 h-4 mr-1" />
                                <span>{formatCurrency(invoice.total_amount)}</span>
                                <span className="mx-2">•</span>
                                <Calendar className="w-4 h-4 mr-1" />
                                <span>Due {formatDate(invoice.due_date)}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleViewInvoice(invoice)}
                              className="p-2 text-gray-400 hover:text-gray-600"
                              title="View invoice"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            
                            {invoice.status === 'draft' && (
                              <>
                                <button
                                  onClick={() => handleSendInvoice(invoice.id)}
                                  className="p-2 text-gray-400 hover:text-blue-600"
                                  title="Send invoice"
                                >
                                  <Send className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleEditInvoice(invoice)}
                                  className="p-2 text-gray-400 hover:text-blue-600"
                                  title="Edit invoice"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            
                            {(invoice.status === 'sent' || invoice.status === 'overdue') && (
                              <button
                                onClick={() => handleMarkAsPaid(invoice.id)}
                                className="p-2 text-gray-400 hover:text-green-600"
                                title="Mark as paid"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            )}
                            
                            <button
                              onClick={() => handleDeleteInvoice(invoice.id)}
                              className="p-2 text-gray-400 hover:text-red-600"
                              title="Delete invoice"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* TODO: Add Create/Edit Invoice Modal */}
      {/* TODO: Add Invoice Preview Modal */}
    </div>
  )
}

export default ZenbookerInvoices 
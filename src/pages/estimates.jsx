"use client"

import { useState, useEffect } from "react"
import Sidebar from "../components/sidebar"
import MobileHeader from "../components/mobile-header"
import { Plus, Search, Filter, FileText, Send, Check, X, Eye, Edit, Trash2, Calendar, DollarSign, User, AlertCircle, RefreshCw } from "lucide-react"
import { useAuth } from "../context/AuthContext"
import { estimatesAPI, customersAPI, servicesAPI } from "../services/api"
import LoadingButton from "../components/loading-button"
import EstimateModal from "../components/estimate-modal"
import EstimatePreviewModal from "../components/estimate-preview-modal"

const ZenbookerEstimates = () => {
  const { user } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [estimates, setEstimates] = useState([])
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
  const [selectedEstimate, setSelectedEstimate] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)

  // Initial data fetch
  useEffect(() => {
    if (user?.id) {
      fetchEstimates()
      fetchCustomers()
      fetchServices()
    }
  }, [user])

  // Debounced search
  useEffect(() => {
    if (!user?.id) return
    
    const timeoutId = setTimeout(() => {
      fetchEstimates()
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [filters.status, filters.customerId, filters.search, filters.sortBy, filters.sortOrder, user])

  const fetchEstimates = async () => {
    if (!user?.id) {
      setDebugInfo("No user ID available")
      return
    }
    
    try {
      setLoading(true)
      setError("")
      setDebugInfo(`Fetching estimates for user: ${user.id}`)
      
      console.log('Making API call to estimates with user ID:', user.id)
      console.log('API base URL:', process.env.REACT_APP_API_URL || 'https://service-flow-backend-production.up.railway.app/api')
      
      const response = await estimatesAPI.getAll(user.id, {
        status: filters.status,
        customerId: filters.customerId,
        search: filters.search,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
        page: 1,
        limit: 50
      })
      
      console.log('Estimates API response:', response)
      
      // Handle different response formats
      const estimatesData = response.estimates || response || []
      setEstimates(Array.isArray(estimatesData) ? estimatesData : [])
      
      setDebugInfo(`Loaded ${estimatesData.length} estimates`)
    } catch (error) {
      console.error('Error fetching estimates:', error)
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        config: error.config
      })
      setError(`Failed to load estimates: ${error.message || 'Unknown error'}`)
      setDebugInfo(`Error: ${error.message} - Status: ${error.response?.status}`)
      setEstimates([])
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

  const handleCreateEstimate = () => {
    setShowCreateModal(true)
  }

  const handleEditEstimate = (estimate) => {
    setSelectedEstimate(estimate)
    setShowEditModal(true)
  }

  const handleViewEstimate = (estimate) => {
    setSelectedEstimate(estimate)
    setShowPreviewModal(true)
  }

  const handleSaveEstimate = () => {
    fetchEstimates()
    setShowCreateModal(false)
    setShowEditModal(false)
  }

  const handleSendEstimateSuccess = () => {
    fetchEstimates()
    setShowPreviewModal(false)
  }

  const handleConvertToInvoiceSuccess = () => {
    fetchEstimates()
    setShowPreviewModal(false)
  }

  const handleDeleteEstimate = async (estimateId) => {
    if (!window.confirm('Are you sure you want to delete this estimate?')) {
      return
    }
    
    try {
      await estimatesAPI.delete(estimateId)
      fetchEstimates()
    } catch (error) {
      console.error('Error deleting estimate:', error)
      alert('Failed to delete estimate. Please try again.')
    }
  }

  const handleSendEstimate = async (estimateId) => {
    try {
      await estimatesAPI.send(estimateId)
      fetchEstimates()
      alert('Estimate sent successfully!')
    } catch (error) {
      console.error('Error sending estimate:', error)
      alert('Failed to send estimate. Please try again.')
    }
  }

  const handleConvertToInvoice = async (estimateId) => {
    try {
      const dueDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      await estimatesAPI.convertToInvoice(estimateId, dueDate)
      fetchEstimates()
      alert('Estimate converted to invoice successfully!')
    } catch (error) {
      console.error('Error converting estimate to invoice:', error)
      alert('Failed to convert estimate to invoice. Please try again.')
    }
  }

  const handleFilterChange = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
  }

  const handleRefresh = () => {
    fetchEstimates()
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'sent':
        return 'bg-blue-100 text-blue-800'
      case 'accepted':
        return 'bg-green-100 text-green-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending':
        return 'Pending'
      case 'sent':
        return 'Sent'
      case 'accepted':
        return 'Accepted'
      case 'rejected':
        return 'Rejected'
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

  const isEstimateExpired = (validUntil) => {
    if (!validUntil) return false
    return new Date(validUntil) < new Date()
  }

  if (!user) {
    return (
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex flex-col min-w-0">
          <MobileHeader onMenuClick={() => setSidebarOpen(true)} />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Please log in</h2>
              <p className="text-gray-500">You need to be logged in to view estimates.</p>
            </div>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 lg:ml-64 xl:ml-72">
        <MobileHeader onMenuClick={() => setSidebarOpen(true)} />

        <div className="flex-1 overflow-auto">
          <div className="px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Estimates</h1>
                  <p className="mt-1 text-sm text-gray-500">
                    Create and manage estimates for your customers
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
                    title="Refresh estimates"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  </button>
            <button 
                    onClick={handleCreateEstimate}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
                    <Plus className="w-4 h-4 mr-2" />
                    New Estimate
            </button>
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
                    placeholder="Search estimates..."
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
                    <option value="pending">Pending</option>
                    <option value="sent">Sent</option>
                    <option value="accepted">Accepted</option>
                    <option value="rejected">Rejected</option>
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
                    <option value="valid_until:ASC">Sort by: Expiring Soon</option>
                  </select>
                </div>
          </div>
        </div>

            {/* Estimates List */}
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="flex items-center space-x-2">
                  <LoadingButton />
                  <span className="text-gray-500">Loading estimates...</span>
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
            ) : estimates.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No estimates found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {filters.status || filters.customerId || filters.search 
                    ? 'No estimates match your current filters. Try adjusting your search criteria.'
                    : 'Get started by creating your first estimate.'
                  }
                </p>
                <div className="mt-6">
                  <button
                    onClick={handleCreateEstimate}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Estimate
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                  {estimates.map((estimate) => (
                    <li key={estimate.id}>
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
                                  Estimate #{estimate.id}
                                </p>
                                <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(estimate.status)}`}>
                                  {getStatusLabel(estimate.status)}
                                </span>
                                {isEstimateExpired(estimate.valid_until) && (
                                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                    Expired
                                  </span>
                                )}
                              </div>
                              <div className="mt-1 flex items-center text-sm text-gray-500">
                                <User className="w-4 h-4 mr-1" />
                                <span>{estimate.customer_first_name} {estimate.customer_last_name}</span>
                                <span className="mx-2">•</span>
                                <DollarSign className="w-4 h-4 mr-1" />
                                <span>{formatCurrency(estimate.total_amount)}</span>
                                <span className="mx-2">•</span>
                                <Calendar className="w-4 h-4 mr-1" />
                                <span>Valid until {formatDate(estimate.valid_until)}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleViewEstimate(estimate)}
                              className="p-2 text-gray-400 hover:text-gray-600"
                              title="View estimate"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            
                            {estimate.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleSendEstimate(estimate.id)}
                                  className="p-2 text-gray-400 hover:text-blue-600"
                                  title="Send estimate"
                                >
                                  <Send className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleEditEstimate(estimate)}
                                  className="p-2 text-gray-400 hover:text-blue-600"
                                  title="Edit estimate"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            
                            {estimate.status === 'accepted' && (
                              <button
                                onClick={() => handleConvertToInvoice(estimate.id)}
                                className="p-2 text-gray-400 hover:text-green-600"
                                title="Convert to invoice"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            )}
                            
                            <button
                              onClick={() => handleDeleteEstimate(estimate.id)}
                              className="p-2 text-gray-400 hover:text-red-600"
                              title="Delete estimate"
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

      {/* Create/Edit Estimate Modal */}
      <EstimateModal
        isOpen={showCreateModal || showEditModal}
        onClose={() => {
          setShowCreateModal(false)
          setShowEditModal(false)
          setSelectedEstimate(null)
        }}
        onSave={handleSaveEstimate}
        editingEstimate={showEditModal ? selectedEstimate : null}
        userId={user?.id}
      />

      {/* Estimate Preview Modal */}
      <EstimatePreviewModal
        isOpen={showPreviewModal}
        onClose={() => {
          setShowPreviewModal(false)
          setSelectedEstimate(null)
        }}
        estimate={selectedEstimate}
        onSend={handleSendEstimateSuccess}
        onConvertToInvoice={handleConvertToInvoiceSuccess}
      />
    </div>
  )
}

export default ZenbookerEstimates

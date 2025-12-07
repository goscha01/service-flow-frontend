"use client"

import { useState, useEffect } from "react"
import Sidebar from "../components/sidebar"
import MobileHeader from "../components/mobile-header"
import CustomerModal from "../components/customer-modal"
import ExportCustomersModal from "../components/export-customers-modal"
import { Search, User, Plus, AlertCircle, Loader2, X } from "lucide-react"
import { customersAPI } from "../services/api"
import { useAuth } from "../context/AuthContext"
import { useNavigate, Link } from "react-router-dom"
import he from 'he';
import { formatPhoneNumber } from "../utils/phoneFormatter"

const ServiceFlowCustomers = () => {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [matchBookings, setMatchBookings] = useState(true)
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false)
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [customerToDelete, setCustomerToDelete] = useState(null)

  // API State
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [deleteLoading, setDeleteLoading] = useState(null)

  // Fetch customers when user is available
  useEffect(() => {
    if (!authLoading && user?.id) {
      fetchCustomers()
    } else if (!authLoading && !user?.id) {
      // If auth is done loading but no user, redirect to signin
      navigate('/signin')
    }
  }, [user?.id, authLoading])

  // Also fetch customers when the page becomes visible (handles page reload)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user?.id && !loading) {
        fetchCustomers()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [user?.id, loading])

  const fetchCustomers = async () => {
    if (!user?.id) {
      console.log('No user ID found:', user)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError("")
      console.log('Fetching all customers for user:', user.id)
      
      // Fetch all customers by setting a very high limit
      const response = await customersAPI.getAll(user.id, {
        limit: 10000, // Fetch up to 10,000 customers
        page: 1,
        sortBy: 'created_at',
        sortOrder: 'DESC'
      })
      
      console.log('Customers response:', response)
      
      // Handle different response formats
      if (response && response.customers) {
        setCustomers(response.customers)
      } else if (Array.isArray(response)) {
        setCustomers(response)
      } else if (response && Array.isArray(response.data)) {
        setCustomers(response.data)
      } else {
        setCustomers([])
      }
    } catch (error) {
      console.error('Error fetching customers:', error)
      setError("Failed to load customers. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleAddCustomer = () => {
    setIsCustomerModalOpen(true)
  }

  const handleExport = () => {
    setIsExportModalOpen(true)
  }

  const handleImport = () => {
    navigate('/import-customers')
  }

  const handleCustomerSave = async (customerData) => {
    if (!user?.id) return

    try {
      setError("")
      console.log('Saving customer:', customerData)
      const response = await customersAPI.create(customerData)
      console.log('Customer saved successfully:', response)

      // Add the new customer to the list
      setCustomers(prev => [response.customer || response, ...prev])

      // Show success message
      setSuccessMessage('Customer created successfully!')
      setTimeout(() => setSuccessMessage(''), 3000)

      // Navigate to customer details page
      const customerId = response.customer?.id || response.id
      if (customerId) {
        navigate(`/customer/${customerId}`)
      }

      // Return the customer data for navigation
      return response.customer || response
    } catch (error) {
      console.error('Error creating customer:', error)

      if (error.response) {
        const { status, data } = error.response
        switch (status) {
          case 400:
            setError(data?.error || "Please check your customer information and try again.")
            break
          case 500:
            setError("Server error. Please try again later.")
            break
          default:
            setError(data?.error || "Failed to create customer. Please try again.")
        }
      } else if (error.request) {
        setError("Network error. Please check your connection.")
      } else {
        setError("An unexpected error occurred.")
      }

      // Don't close the modal if there's an error
      console.log('Customer creation failed, keeping modal open')
      throw error // Re-throw to prevent modal from closing
    }
  }

  const handleDeleteCustomer = (customer) => {
    setCustomerToDelete(customer)
    setShowDeleteConfirm(true)
  }

  const confirmDeleteCustomer = async () => {
    if (!customerToDelete) return

    try {
      setDeleteLoading(customerToDelete.id)
      setError("")
      setSuccessMessage("")

      await customersAPI.delete(customerToDelete.id, user.id)

      // Remove from local state
      setCustomers(prev => prev.filter(customer => customer.id !== customerToDelete.id))
      setShowDeleteConfirm(false)
      setCustomerToDelete(null)

      // Show success message
      setSuccessMessage(`Customer "${customerToDelete.first_name} ${customerToDelete.last_name}" deleted successfully.`)

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(""), 3000)
    } catch (error) {
      console.error('Error deleting customer:', error)

      // Handle specific error messages from server
      if (error.response) {
        const { status, data } = error.response
        switch (status) {
          case 400:
            setError(data?.error || "Cannot delete customer with associated jobs or estimates. Please delete the associated records first.")
            break
          case 404:
            setError("Customer not found.")
            break
          case 500:
            setError("Server error. Please try again later.")
            break
          default:
            setError(data?.error || "Failed to delete customer. Please try again.")
        }
      } else {
        setError("Network error. Please check your connection and try again.")
      }
    } finally {
      setDeleteLoading(null)
    }
  }

  const handleViewCustomer = (customer) => {
    // Navigate to customer details page
    navigate(`/customer/${customer.id}`)
  }

  const handleRetry = () => {
    fetchCustomers()
  }

  const filteredCustomers = customers.filter(customer => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      return (
        customer.first_name?.toLowerCase().includes(searchLower) ||
        customer.last_name?.toLowerCase().includes(searchLower) ||
        customer.email?.toLowerCase().includes(searchLower) ||
        customer.phone?.includes(searchTerm) ||
        customer.city?.toLowerCase().includes(searchLower) ||
        customer.state?.toLowerCase().includes(searchLower)
      )
    }
    return true
  })

  // Show loading spinner while auth is loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    )
  }

  return (
    <div style={{fontFamily: 'Montserrat', fontWeight: 500}} className="flex h-screen bg-gray-50 overflow-hidden">

      
      <div className="flex-1 flex flex-col overflow-y-auto min-w-0 w-full">
      

        <div className="flex-1 w-full lg:mx-44 xl:mx-48">
          <div className="p-4 sm:p-6">
            {/* Header - Mobile Optimized */}
            <div className="mb-4 sm:mb-6">
              {/* Title and Count */}
              <div className="mb-4">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Customers</h1>
                <p className="mt-0.5 text-sm text-gray-500">
                  {customers.length} {customers.length === 1 ? 'customer' : 'customers'}
                </p>
              </div>

              {/* Search Bar - Full Width on Mobile */}
              <div className="mb-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search customers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border-0 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Action Buttons - Mobile Layout */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExport}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Export
                </button>
                <button
                  onClick={handleImport}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Import
                </button>
                <button
                  onClick={handleAddCustomer}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Add Customer
                </button>
              </div>
            </div>

            {/* Match Bookings Card */}
            <div className="mb-4 sm:mb-6 bg-gray-100 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">
                    Match Bookings to Existing Customers
                  </h3>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    When enabled, Zenbooker links new online bookings to existing customers based on email. New customers are created for emails without a match.
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <button
                    onClick={() => setMatchBookings(!matchBookings)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                      matchBookings ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        matchBookings ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 sm:mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <AlertCircle className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Error</h3>
                    <p className="mt-1 text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Success Message */}
            {successMessage && (
              <div className="mb-4 sm:mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <div className="h-5 w-5 text-green-400">✓</div>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800">Success</h3>
                    <p className="mt-1 text-sm text-green-700">{successMessage}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Customers List */}
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-lg p-8 sm:p-12 text-center">
                <User className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400" />
                <h3 className="mt-4 text-sm sm:text-base font-medium text-gray-900">No customers found</h3>
                <p className="mt-2 text-xs sm:text-sm text-gray-500">
                  {searchTerm
                    ? "Try adjusting your search terms."
                    : "Get started by adding your first customer."
                  }
                </p>
                {!searchTerm && (
                  <div className="mt-6">
                    <button
                      onClick={handleAddCustomer}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Customer
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <ul className="divide-y divide-gray-200">
                  {filteredCustomers.map((customer) => (
                    <li key={customer.id}>
                      <div 
                        onClick={() => handleViewCustomer(customer)}
                        className="px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          {/* Avatar */}
                          <div className="w-10 h-10 bg-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-white font-medium text-xs">
                              {customer.first_name?.[0]?.toUpperCase()}{customer.last_name?.[0]?.toUpperCase()}
                            </span>
                          </div>

                          {/* Customer Info */}
                          <div className="flex-1 min-w-0">
                            {/* Name and Location */}
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="font-semibold text-sm text-gray-900 truncate">
                                {customer.first_name} {customer.last_name}
                              </span>
                              {customer.city && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 flex-shrink-0">
                                  {he.decode(customer.city)}
                                </span>
                              )}
                            </div>

                            {/* Contact Info */}
                            <div className="text-xs text-gray-600 truncate">
                              {customer.email && (
                                <span className="truncate block sm:inline">{customer.email}</span>
                              )}
                              {customer.email && customer.phone && (
                                <span className="hidden sm:inline mx-1">•</span>
                              )}
                              {customer.phone && (
                                <span className="block sm:inline">{formatPhoneNumber(customer.phone)}</span>
                              )}
                            </div>
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

      {/* Modals */}
      <CustomerModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        onSave={handleCustomerSave}
      />

      <ExportCustomersModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && customerToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 text-red-600 mr-3" />
              <h3 className="text-base sm:text-lg font-medium text-gray-900">Delete Customer</h3>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 mb-6">
              Are you sure you want to delete <strong>{customerToDelete.first_name} {customerToDelete.last_name}</strong>?
              This action cannot be undone.
              {customerToDelete.jobs_count > 0 || customerToDelete.estimates_count > 0 ? (
                <span className="block mt-2 text-red-600">
                  ⚠️ This customer has associated jobs or estimates that must be deleted first.
                </span>
              ) : null}
            </p>
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setCustomerToDelete(null)
                }}
                className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteCustomer}
                disabled={deleteLoading === customerToDelete.id}
                className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
              >
                {deleteLoading === customerToDelete.id ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ServiceFlowCustomers
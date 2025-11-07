"use client"

import { useState, useEffect } from "react"
import Sidebar from "../components/sidebar"
import MobileHeader from "../components/mobile-header"
import CustomerModal from "../components/customer-modal"
import ExportCustomersModal from "../components/export-customers-modal"
import { Search, User, Plus, AlertCircle, Loader2, Trash2, Eye, X } from "lucide-react"
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
      console.log('Fetching customers for user:', user.id)
      const response = await customersAPI.getAll(user.id)
      console.log('Customers response:', response)
      setCustomers(response.customers || response)
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
    <div style={{fontFamily: 'ProximaNova-medium'}} className="flex h-screen bg-gray-50 overflow-hidden">

      <div className="flex-1 flex flex-col min-w-0  lg:mx-44 xl:mx-48">
        <MobileHeader onMenuClick={() => setSidebarOpen(true)} />

        <div className="flex-1 overflow-auto">
          <div className="px-4 sm:px-6 lg:px-8 py-6">
            {/* Header with Title, Search, and Actions */}
            <div className="mb-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                {/* Title and Count */}
                <div className="flex-shrink-0">
                  <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
                  <p className="mt-0.5 text-sm text-gray-500">
                    {customers.length} {customers.length === 1 ? 'customer' : 'customers'}
                  </p>
                </div>

                {/* Search Bar */}
                <div className="flex-1 max-w-md">
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

                {/* Action Buttons */}
                <div className="flex items-center gap-3 flex-shrink-0">
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
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Add Customer
                  </button>
                </div>
              </div>
            </div>

            {/* Match Bookings Card */}
            <div className="mb-6 bg-gray-100 rounded-lg p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-gray-900 mb-2">
                    Match Bookings to Existing Customers
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    When enabled, Zenbooker links new online bookings to existing customers based on email.
                    <br />
                    New customers are created for emails without a match.
                  </p>
                </div>
                <div className="ml-6 flex-shrink-0">
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
              <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
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
              <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
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
              <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
                <User className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-4 text-base font-medium text-gray-900">No customers found</h3>
                <p className="mt-2 text-sm text-gray-500">
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
                      <div className="px-6 py-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            {/* Avatar */}
                            <div className="w-12 h-12 bg-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-white font-medium text-sm">
                                {customer.first_name?.[0]?.toUpperCase()}{customer.last_name?.[0]?.toUpperCase()}
                              </span>
                            </div>

                            {/* Customer Info */}
                            <div className="flex-1 min-w-0">
                              {/* Name and Location */}
                              <div className="flex items-center gap-2 mb-1">
                                <button
                                  onClick={() => handleViewCustomer(customer)}
                                  className="font-semibold text-gray-900 hover:text-primary-600 transition-colors text-left"
                                >
                                  {customer.first_name} {customer.last_name}
                                </button>
                                {customer.city && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                                    {he.decode(customer.city)}
                                  </span>
                                )}
                              </div>

                              {/* Contact Info */}
                              <div className="flex items-center gap-4 text-sm text-gray-600">
                                {customer.email && (
                                  <span>{customer.email}</span>
                                )}
                                {customer.email && customer.phone && (
                                  <span className="text-gray-400">•</span>
                                )}
                                {customer.phone && (
                                  <span>{formatPhoneNumber(customer.phone)}</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2 ml-4">
                            <button
                              onClick={() => handleViewCustomer(customer)}
                              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                              title="View customer details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteCustomer(customer)}
                              disabled={deleteLoading === customer.id}
                              className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                              title="Delete customer"
                            >
                              {deleteLoading === customer.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
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
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center mb-4">
              <AlertCircle className="h-6 w-6 text-red-600 mr-3" />
              <h3 className="text-lg font-medium text-gray-900">Delete Customer</h3>
            </div>
            <p className="text-sm text-gray-500 mb-6">
              Are you sure you want to delete <strong>{customerToDelete.first_name} {customerToDelete.last_name}</strong>?
              This action cannot be undone.
              {customerToDelete.jobs_count > 0 || customerToDelete.estimates_count > 0 ? (
                <span className="block mt-2 text-red-600">
                  ⚠️ This customer has associated jobs or estimates that must be deleted first.
                </span>
              ) : null}
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setCustomerToDelete(null)
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteCustomer}
                disabled={deleteLoading === customerToDelete.id}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
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

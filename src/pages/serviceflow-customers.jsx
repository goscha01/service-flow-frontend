"use client"

import { useState, useEffect } from "react"
import Sidebar from "../components/sidebar"
import MobileHeader from "../components/mobile-header"
import CustomerModal from "../components/customer-modal"
import ExportCustomersModal from "../components/export-customers-modal"
import { Search, User, Plus, AlertCircle, Loader2, Trash2, Eye, X, Filter, Phone, Mail, Edit } from "lucide-react"
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
  const [selectedCity, setSelectedCity] = useState("")
  const [showCityFilter, setShowCityFilter] = useState(false)

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

  // Close city filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showCityFilter && !event.target.closest('.city-filter-container')) {
        setShowCityFilter(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showCityFilter])

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

  const handleEditCustomer = (customer) => {
    // For now, navigate to customer details page where editing can be done
    // In the future, this could open an edit modal directly
    navigate(`/customer/${customer.id}`)
  }

  const handleRetry = () => {
    fetchCustomers()
  }

  // Get unique cities for filtering
  const uniqueCities = [...new Set(customers.map(customer => customer.city).filter(Boolean))].sort()

  const filteredCustomers = customers.filter(customer => {
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      const matchesSearch = (
        customer.first_name?.toLowerCase().includes(searchLower) ||
        customer.last_name?.toLowerCase().includes(searchLower) ||
        customer.email?.toLowerCase().includes(searchLower) ||
        customer.phone?.includes(searchTerm) ||
        customer.city?.toLowerCase().includes(searchLower) ||
        customer.state?.toLowerCase().includes(searchLower)
      )
      if (!matchesSearch) return false
    }
    
    // City filter
    if (selectedCity && customer.city !== selectedCity) {
      return false
    }
    
    return true
  })

  const clearSearch = () => {
    setSearchTerm("")
  }

  const clearCityFilter = () => {
    setSelectedCity("")
  }

  // Show loading spinner while auth is loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
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
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
                  <p className="mt-1 text-sm text-gray-500">
                    Manage your customer database and track relationships
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                  <button
                    onClick={handleImport}
                    className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    Import
                  </button>
                  <button
                    onClick={handleExport}
                    className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    Export
                  </button>
                  <button
                    onClick={handleAddCustomer}
                    className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Customer
                  </button>
                </div>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="mb-6 space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search customers by name, email, phone, or location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
                {searchTerm && (
                  <button
                    onClick={clearSearch}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Filters and Results Count */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {/* City Filter */}
                  <div className="relative city-filter-container">
                    <button
                      onClick={() => setShowCityFilter(!showCityFilter)}
                      className={`inline-flex items-center px-3 py-1.5 border rounded-md text-sm font-medium ${
                        selectedCity 
                          ? 'border-primary-500 text-primary-700 bg-primary-50' 
                          : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                      }`}
                    >
                      <Filter className="w-4 h-4 mr-1" />
                      {selectedCity || 'Filter by City'}
                    </button>
                    
                    {showCityFilter && (
                      <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-300 rounded-md shadow-lg z-10 max-h-60 overflow-y-auto">
                        <div className="p-2">
                          <button
                            onClick={() => {
                              setSelectedCity("")
                              setShowCityFilter(false)
                            }}
                            className="w-full text-left px-2 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded"
                          >
                            All Cities
                          </button>
                          {uniqueCities.map(city => (
                            <button
                              key={city}
                              onClick={() => {
                                setSelectedCity(city)
                                setShowCityFilter(false)
                              }}
                              className="w-full text-left px-2 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded"
                            >
                              {city}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Clear City Filter */}
                  {selectedCity && (
                    <button
                      onClick={clearCityFilter}
                      className="inline-flex items-center px-2 py-1 text-sm text-gray-500 hover:text-gray-700"
                    >
                      <X className="w-3 h-3 mr-1" />
                      Clear city filter
                    </button>
                  )}
                </div>

                {/* Results Count */}
                <div className="text-sm text-gray-500">
                  {filteredCustomers.length} of {customers.length} customers
                  {(searchTerm || selectedCity) && (
                    <span className="text-gray-400"> (filtered)</span>
                  )}
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
              <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
                <User className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No customers found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {(searchTerm || selectedCity) 
                    ? "Try adjusting your search terms or filters." 
                    : "Get started by adding your first customer."
                  }
                </p>
                {!searchTerm && !selectedCity && (
                  <div className="mt-6">
                    <button
                      onClick={handleAddCustomer}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Customer
                    </button>
                  </div>
                )}
                {(searchTerm || selectedCity) && (
                  <div className="mt-6 space-x-3">
                    {searchTerm && (
                      <button
                        onClick={clearSearch}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Clear Search
                      </button>
                    )}
                    {selectedCity && (
                      <button
                        onClick={clearCityFilter}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Clear City Filter
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                  {filteredCustomers.map((customer) => (
                    <li key={customer.id}>
                      <div className="px-4 py-4 sm:px-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-blue-600 font-medium text-sm">
                                {customer.first_name?.[0]}{customer.last_name?.[0]}
                              </span>
                            </div>
                            <div>
                              <div className="flex flex-row justify-start items-center gap-3">
                              <button
                                onClick={() => handleViewCustomer(customer)}
                                style={{textDecoration: 'none'}}
                                className="font-bold decoration-none text-gray-900 hover:text-primary-600 hover:underline cursor-pointer transition-colors duration-200"
                              >
                                {customer.first_name} {customer.last_name} 
                              </button>
                              {(customer.city || customer.state) && (
                            

                               <p className="text-xs text-gray-500">
                                 {he.decode(`${customer.city}${customer.city && customer.state ? ', ' : ''}${customer.state}`)}
                               </p>
                              )}
                              </div>
                              <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                                <div className="flex flex-col space-y-1 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4">
                                  <div className="flex items-center space-x-2">
                                    <Phone className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm text-gray-600">
                                      {customer.phone ? formatPhoneNumber(customer.phone) : 'No phone'}
                                    </span>
                                  </div>
                                  {/* {customer.email && (
                                    <div className="flex items-center space-x-2">
                                      <Mail className="w-4 h-4 text-gray-400" />
                                      <span className="text-sm text-gray-600">{customer.email}</span>
                                    </div>
                                  )} */}
                                </div>
                                
                              </div>
                              
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleViewCustomer(customer)}
                              className="text-gray-400 hover:text-gray-600 p-1"
                              title="View customer details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteCustomer(customer)}
                              disabled={deleteLoading === customer.id}
                              className="text-red-600 hover:text-red-700 p-1 disabled:opacity-50"
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
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteCustomer}
                disabled={deleteLoading === customerToDelete.id}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
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

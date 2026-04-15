"use client"

import { useState, useEffect, useMemo } from "react"
import Sidebar from "../components/sidebar"
import CustomerModal from "../components/customer-modal"
import ExportCustomersModal from "../components/export-customers-modal"
import { Search, User, Plus, AlertCircle, Loader2, X, RotateCw, Filter, LayoutGrid, List, Mail, Phone, MapPin, Building2 } from "lucide-react"
import { customersAPI, jobsAPI } from "../services/api"
import { useAuth } from "../context/AuthContext"
import { useNavigate, Link } from "react-router-dom"
import he from 'he';
import { formatPhoneNumber } from "../utils/phoneFormatter"
import MobileHeader from "../components/mobile-header"

const ServiceFlowCustomers = () => {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false)
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [customerToDelete, setCustomerToDelete] = useState(null)
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false)
  const [deleteAllLoading, setDeleteAllLoading] = useState(false)

  // API State
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [deleteLoading, setDeleteLoading] = useState(null)
  const [recurringFilter, setRecurringFilter] = useState("all") // "all", "recurring", "non-recurring"
  const [locationFilter, setLocationFilter] = useState("all") // "all" or a city name
  const [viewTab, setViewTab] = useState("contacts") // "contacts", "companies"
  const [customersWithRecurring, setCustomersWithRecurring] = useState(new Set()) // Set of customer IDs with recurring jobs

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
      let customersList = [];
      if (response && response.customers) {
        customersList = response.customers
      } else if (Array.isArray(response)) {
        customersList = response
      } else if (response && Array.isArray(response.data)) {
        customersList = response.data
      }
      
      setCustomers(customersList)
      
      // Fetch jobs to determine which customers have recurring jobs
      if (customersList.length > 0) {
        await fetchRecurringCustomers(user.id)
      }
    } catch (error) {
      console.error('Error fetching customers:', error)
      setError("Failed to load customers. Please try again.")
    } finally {
      setLoading(false)
    }
  }
  
  const fetchRecurringCustomers = async (userId) => {
    try {
      // Fetch all jobs to check for recurring ones
      const jobsResponse = await jobsAPI.getAll(userId, "", "", 1, 10000)
      const allJobs = jobsResponse.jobs || []
      
      // Find all customer IDs that have at least one recurring job
      const recurringCustomerIds = new Set()
      allJobs.forEach(job => {
        if (job.is_recurring && job.customer_id) {
          recurringCustomerIds.add(job.customer_id)
        }
      })
      
      console.log(`📊 Found ${recurringCustomerIds.size} customers with recurring jobs`)
      setCustomersWithRecurring(recurringCustomerIds)
    } catch (error) {
      console.error('Error fetching recurring customers:', error)
      // Don't fail the whole page if this fails
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
      setSuccessMessage(`Customer "${he.decode(customerToDelete.first_name || '')} ${he.decode(customerToDelete.last_name || '')}" deleted successfully.`)

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

  const handleDeleteAll = () => {
    setShowDeleteAllConfirm(true)
  }

  const confirmDeleteAll = async () => {
    try {
      setDeleteAllLoading(true)
      setError("")
      setSuccessMessage("")

      await customersAPI.deleteAll()

      // Clear all customers from local state
      setCustomers([])
      setShowDeleteAllConfirm(false)

      // Show success message
      setSuccessMessage('All customers deleted successfully.')

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(""), 3000)
    } catch (error) {
      console.error('Error deleting all customers:', error)

      // Handle specific error messages from server
      if (error.response) {
        const { status, data } = error.response
        switch (status) {
          case 500:
            setError("Server error. Please try again later.")
            break
          default:
            setError(data?.error || "Failed to delete all customers. Please try again.")
        }
      } else {
        setError("Network error. Please check your connection and try again.")
      }
    } finally {
      setDeleteAllLoading(false)
    }
  }

  // Normalize field helper function (handles whitespace, null, undefined, and special characters)
  const normalizeField = (field) => {
    if (!field) return ''
    // Convert to string, decode HTML entities, trim, normalize whitespace, lowercase
    return he.decode(String(field))
      .trim()
      .replace(/\s+/g, ' ') // Collapse multiple spaces to single space
      .toLowerCase()
  }

  // Memoized filtered customers for better performance
  // Unique cities for location filter
  const uniqueCities = useMemo(() => {
    const cities = new Set()
    customers.forEach(c => {
      if (c.city) cities.add(he.decode(c.city).trim())
    })
    return Array.from(cities).sort()
  }, [customers])

  const filteredCustomers = useMemo(() => {
    let filtered = [...customers]

    // Apply recurring filter first
    if (recurringFilter === 'recurring') {
      filtered = filtered.filter(customer => customersWithRecurring.has(customer.id))
    } else if (recurringFilter === 'non-recurring') {
      filtered = filtered.filter(customer => !customersWithRecurring.has(customer.id))
    }

    // Apply location filter
    if (locationFilter !== 'all') {
      filtered = filtered.filter(customer => {
        const city = customer.city ? he.decode(customer.city).trim() : ''
        return city === locationFilter
      })
    }
    
    // Apply search filter
    if (searchTerm && searchTerm.trim() !== '') {
      // Normalize search term: trim and collapse whitespace
      const normalizedSearch = searchTerm.trim().replace(/\s+/g, ' ').toLowerCase()
      
      console.log('🔍 Searching with term:', searchTerm, '-> normalized:', normalizedSearch)
      console.log('🔍 Total customers to search:', filtered.length)
      
      filtered = filtered.filter(customer => {
        // Normalize customer fields for comparison (handle whitespace differences)
        const firstName = normalizeField(customer.first_name)
        const lastName = normalizeField(customer.last_name)
        const fullName = `${firstName} ${lastName}`.trim()
        const email = normalizeField(customer.email)
        const phone = customer.phone ? customer.phone.replace(/\D/g, '') : '' // Remove non-digits for phone
        const searchPhone = searchTerm.replace(/\D/g, '') // Remove non-digits from search
        const city = normalizeField(customer.city)
        const state = normalizeField(customer.state)
        
        const matches = (
          firstName.includes(normalizedSearch) ||
          lastName.includes(normalizedSearch) ||
          fullName.includes(normalizedSearch) ||
          email.includes(normalizedSearch) ||
          (phone && searchPhone && phone.includes(searchPhone)) ||
          city.includes(normalizedSearch) ||
          state.includes(normalizedSearch)
        )
        
        // Debug logging for first few matches
        if (matches && normalizedSearch === 'kat') {
          console.log('✅ Match found:', {
            original: `${customer.first_name} ${customer.last_name}`,
            normalized: fullName,
            searchTerm: normalizedSearch,
            matchedField: {
              firstName: firstName.includes(normalizedSearch),
              lastName: lastName.includes(normalizedSearch),
              fullName: fullName.includes(normalizedSearch)
            }
          })
        }
        
        return matches
      })
      
      console.log('🔍 Filtered results:', filtered.length, 'out of', customers.length)
    }
    
    return filtered
  }, [customers, searchTerm, recurringFilter, locationFilter, customersWithRecurring])

  // Show loading spinner while auth is loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[var(--sf-bg-page)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--sf-blue-500)]" />
      </div>
    )
  }

  return (
    <div style={{fontFamily: 'Montserrat', fontWeight: 500}} className="flex-1 h-screen bg-[var(--sf-bg-page)]">
      {/* Mobile Header */}
      <MobileHeader pageTitle="Customers" />

        <div className="flex-1 w-full">
          <div className="p-4 sm:p-6">
            {/* Header */}
            <div className="mb-4 sm:mb-6">
              {/* Row 1: Title */}
              <div className="mb-4">
                <h1 className="text-xl sm:text-2xl font-bold text-[var(--sf-text-primary)]">Customers</h1>
                <p className="mt-0.5 text-sm text-[var(--sf-text-secondary)]">
                  {filteredCustomers.length} {filteredCustomers.length === 1 ? 'customer' : 'customers'}
                </p>
              </div>

              {/* Row 2: Tabs + Search (own line) */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
                {/* View Toggle */}
                <div className="flex items-center bg-gray-100 rounded-lg p-1 flex-shrink-0 self-start sm:self-auto w-fit">
                  <button
                    onClick={() => setViewTab('contacts')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      viewTab === 'contacts'
                        ? 'bg-white text-[#2D2E2E] shadow-sm'
                        : 'text-[#595A5B] hover:text-[#2D2E2E]'
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    Contacts
                  </button>
                  <button
                    onClick={() => setViewTab('companies')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      viewTab === 'companies'
                        ? 'bg-white text-[#2D2E2E] shadow-sm'
                        : 'text-[#595A5B] hover:text-[#2D2E2E]'
                    }`}
                  >
                    <List className="w-3.5 h-3.5" />
                    Companies
                  </button>
                </div>

                {/* Search */}
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--sf-text-muted)] w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search customers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white border border-[var(--sf-border-light)] rounded-lg text-sm focus:ring-2 focus:ring-[var(--sf-blue-500)] focus:border-[var(--sf-blue-500)] focus:bg-white transition-colors"
                  />
                </div>
              </div>

              {/* Row 3: Filters + Actions */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3">
                {/* Recurring Filter */}
                <select
                  value={recurringFilter}
                  onChange={(e) => setRecurringFilter(e.target.value)}
                  className="px-3 py-2 text-sm border border-[var(--sf-border-light)] rounded-lg bg-white focus:ring-2 focus:ring-[var(--sf-blue-500)] cursor-pointer transition-colors"
                >
                  <option value="all">All Customers</option>
                  <option value="recurring">Recurring</option>
                  <option value="non-recurring">Non-Recurring</option>
                </select>

                {/* Location Filter */}
                <select
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="px-3 py-2 text-sm border border-[var(--sf-border-light)] rounded-lg bg-white focus:ring-2 focus:ring-[var(--sf-blue-500)] cursor-pointer transition-colors"
                >
                  <option value="all">All Locations</option>
                  {uniqueCities.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 flex-shrink-0 sm:ml-auto">
                  <button
                    onClick={handleExport}
                    className="px-3 py-2 text-sm font-medium text-[var(--sf-text-secondary)] bg-white border border-[var(--sf-border-light)] rounded-lg hover:bg-[var(--sf-bg-hover)] transition-colors"
                  >
                    Export
                  </button>
                  <button
                    onClick={handleImport}
                    className="px-3 py-2 text-sm font-medium text-[var(--sf-text-secondary)] bg-white border border-[var(--sf-border-light)] rounded-lg hover:bg-[var(--sf-bg-hover)] transition-colors"
                  >
                    Import
                  </button>
                  <button
                    onClick={handleAddCustomer}
                    className="sf-btn-primary px-4 py-2 text-sm font-medium flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    Add Customer
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

            {/* Customers Content */}
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="sf-card p-8 sm:p-12 text-center">
                <User className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-[var(--sf-text-muted)]" />
                <h3 className="mt-4 text-sm sm:text-base font-medium text-[var(--sf-text-primary)]">No customers found</h3>
                <p className="mt-2 text-xs sm:text-sm text-[var(--sf-text-secondary)]">
                  {searchTerm
                    ? "Try adjusting your search terms."
                    : "Get started by adding your first customer."
                  }
                </p>
                {!searchTerm && (
                  <div className="mt-6">
                    <button
                      onClick={handleAddCustomer}
                      className="sf-btn-primary inline-flex items-center px-4 py-2 text-sm font-medium"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Customer
                    </button>
                  </div>
                )}
              </div>
            ) : viewTab === 'contacts' ? (
              /* ═══ CONTACTS GRID VIEW ═══ */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredCustomers.map((customer) => (
                  <div
                    key={customer.id}
                    onClick={() => handleViewCustomer(customer)}
                    className="bg-white border border-[#EDF1F5] rounded-xl p-5 hover:shadow-md transition-all cursor-pointer group"
                  >
                    {/* Avatar + Name */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-medium text-xs">
                          {customer.first_name?.[0]?.toUpperCase()}{customer.last_name?.[0]?.toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-sm text-[#2D2E2E] truncate group-hover:text-[var(--sf-blue-500)] transition-colors">
                          {he.decode(customer.first_name || '')} {he.decode(customer.last_name || '')}
                        </div>
                        {customersWithRecurring.has(customer.id) && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[var(--sf-blue-500)]">
                            <RotateCw className="w-2.5 h-2.5" />
                            Recurring
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Contact Details */}
                    <div className="space-y-1.5 text-xs text-[#595A5B]">
                      {customer.email && (
                        <div className="flex items-center gap-2 truncate">
                          <Mail className="w-3.5 h-3.5 text-[#A6A9AC] flex-shrink-0" />
                          <span className="truncate">{customer.email}</span>
                        </div>
                      )}
                      {customer.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-[#A6A9AC] flex-shrink-0" />
                          <span>{formatPhoneNumber(customer.phone)}</span>
                        </div>
                      )}
                      {customer.city && (
                        <div className="flex items-center gap-2 truncate">
                          <MapPin className="w-3.5 h-3.5 text-[#A6A9AC] flex-shrink-0" />
                          <span className="truncate">{he.decode(customer.city)}{customer.state ? `, ${he.decode(customer.state)}` : ''}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* ═══ COMPANIES LIST VIEW ═══ */
              <div className="border border-[#EDF1F5] rounded-xl overflow-hidden">
                {/* Table Header */}
                <div className="grid grid-cols-12 schedule-grid bg-[#F9FAFB] text-left text-sm font-medium text-[#595A5B]">
                  <div className="col-span-3 px-4 py-3">Name</div>
                  <div className="col-span-3 px-4 py-3 border-l border-[#EDF1F5]">Email</div>
                  <div className="col-span-2 px-4 py-3 border-l border-[#EDF1F5]">Phone</div>
                  <div className="col-span-2 px-4 py-3 border-l border-[#EDF1F5]">Location</div>
                  <div className="col-span-2 px-4 py-3 border-l border-[#EDF1F5]">Status</div>
                </div>
                {/* Table Rows */}
                {filteredCustomers.map((customer) => (
                  <div
                    key={customer.id}
                    onClick={() => handleViewCustomer(customer)}
                    className="grid grid-cols-12 schedule-grid border-t border-[#EDF1F5] bg-white hover:bg-gray-50 transition-colors cursor-pointer text-sm"
                  >
                    <div className="col-span-3 px-4 py-3 flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-medium text-[10px]">
                          {customer.first_name?.[0]?.toUpperCase()}{customer.last_name?.[0]?.toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <span className="font-medium text-[#2D2E2E] truncate block">
                          {he.decode(customer.first_name || '')} {he.decode(customer.last_name || '')}
                        </span>
                        {customersWithRecurring.has(customer.id) && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-[var(--sf-blue-500)]">
                            <RotateCw className="w-2.5 h-2.5" />
                            Recurring
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="col-span-3 px-4 py-3 flex items-center border-l border-[#EDF1F5] text-[#595A5B] truncate">
                      {customer.email || '—'}
                    </div>
                    <div className="col-span-2 px-4 py-3 flex items-center border-l border-[#EDF1F5] text-[#595A5B]">
                      {customer.phone ? formatPhoneNumber(customer.phone) : '—'}
                    </div>
                    <div className="col-span-2 px-4 py-3 flex items-center border-l border-[#EDF1F5] text-[#595A5B] truncate">
                      {customer.city ? `${he.decode(customer.city)}${customer.state ? `, ${he.decode(customer.state)}` : ''}` : '—'}
                    </div>
                    <div className="col-span-2 px-4 py-3 flex items-center border-l border-[#EDF1F5]">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        customersWithRecurring.has(customer.id)
                          ? 'bg-green-50 text-[#16B364]'
                          : 'bg-gray-100 text-[#595A5B]'
                      }`}>
                        {customersWithRecurring.has(customer.id) ? 'Active' : 'Standard'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
              <h3 className="text-base sm:text-lg font-medium text-[var(--sf-text-primary)]">Delete Customer</h3>
            </div>
            <p className="text-xs sm:text-sm text-[var(--sf-text-muted)] mb-6">
              Are you sure you want to delete <strong>{he.decode(customerToDelete.first_name || '')} {he.decode(customerToDelete.last_name || '')}</strong>?
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
                className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-[var(--sf-text-primary)] bg-white border border-[var(--sf-border-light)] rounded-lg hover:bg-[var(--sf-bg-page)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
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

      {/* Delete All Confirmation Modal */}
      {showDeleteAllConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 text-red-600 mr-3" />
              <h3 className="text-base sm:text-lg font-medium text-[var(--sf-text-primary)]">Delete All Customers</h3>
            </div>
            <p className="text-xs sm:text-sm text-[var(--sf-text-muted)] mb-6">
              Are you sure you want to delete <strong>all {customers.length} customers</strong>? 
              This action cannot be undone and will permanently remove all customer records.
            </p>
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3">
              <button
                onClick={() => setShowDeleteAllConfirm(false)}
                className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-[var(--sf-text-primary)] bg-white border border-[var(--sf-border-light)] rounded-lg hover:bg-[var(--sf-bg-page)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteAll}
                disabled={deleteAllLoading}
                className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
              >
                {deleteAllLoading ? "Deleting..." : "Delete All"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ServiceFlowCustomers
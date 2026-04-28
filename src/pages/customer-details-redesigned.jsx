"use client"

import { useState, useEffect, useRef } from "react"
import { formatTime as formatTimeShared } from "../utils/formatTime"
import { useParams, useNavigate } from "react-router-dom"
import { 
  ChevronLeft, 
  MoreVertical, 
  Phone, 
  Mail, 
  MapPin, 
  Plus, 
  FileText, 
  Link, 
  RefreshCw, 
  CreditCard,
  Info,
  Calendar,
  Clock,
  User,
  Building,
  Edit,
  Trash2
} from "lucide-react"
import { customersAPI, customerPropertiesAPI, jobsAPI, estimatesAPI, invoicesAPI } from "../services/api"
import { useAuth } from "../context/AuthContext"
import Sidebar from "../components/sidebar"
import CustomerModal from "../components/customer-modal"
import ServiceAddressModal from "../components/service-address-modal"
import { formatPhoneNumber } from "../utils/phoneFormatter"
import { canCreateJobs, isAccountOwner } from "../utils/roleUtils"

const CustomerDetailsRedesigned = () => {
  const { customerId } = useParams()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const [customer, setCustomer] = useState(null)
  const [jobs, setJobs] = useState([])
  const [estimates, setEstimates] = useState([])
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [activeJobTab, setActiveJobTab] = useState("upcoming")
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [showMenuDropdown, setShowMenuDropdown] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const menuRef = useRef(null)
  const [properties, setProperties] = useState([])
  const [propertiesLoading, setPropertiesLoading] = useState(false)
  const [showPropertyModal, setShowPropertyModal] = useState(false)
  const [editingProperty, setEditingProperty] = useState(null)
  const [propertyMenuOpenId, setPropertyMenuOpenId] = useState(null)
  const propertyMenuRef = useRef(null)

  useEffect(() => {
    if (!authLoading && customerId && user?.id) {
      fetchCustomerData()
    } else if (!authLoading && !user?.id) {
      navigate('/signin')
    }
  }, [customerId, user?.id, authLoading])

  const fetchCustomerData = async () => {
    try {
      setLoading(true)
      setError("")

      const customerData = await customersAPI.getById(customerId)
      setCustomer(customerData)

      const [jobsData, estimatesData, invoicesData, propsData] = await Promise.all([
        jobsAPI.getAll(user.id, "", "", 1, 50, "", "", "scheduled_date", "DESC", "", "", customerId),
        estimatesAPI.getAll(user.id, { customerId: customerId }),
        invoicesAPI.getAll(user.id, { customerId: customerId }),
        customerPropertiesAPI.list(customerId).catch((e) => {
          console.error('Failed to load properties:', e)
          return []
        })
      ])

      setJobs(jobsData.jobs || jobsData)
      setEstimates(estimatesData.estimates || estimatesData)
      setInvoices(invoicesData.invoices || invoicesData)
      setProperties(propsData || [])

    } catch (error) {
      console.error('Error fetching customer data:', error)
      setError("Failed to load customer data. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const reloadProperties = async () => {
    try {
      setPropertiesLoading(true)
      const list = await customerPropertiesAPI.list(customerId)
      setProperties(list || [])
    } catch (e) {
      console.error('Error reloading properties:', e)
    } finally {
      setPropertiesLoading(false)
    }
  }

  const handleOpenAddProperty = () => {
    setEditingProperty(null)
    setShowPropertyModal(true)
    setPropertyMenuOpenId(null)
  }

  const handleOpenEditProperty = (property) => {
    setEditingProperty(property)
    setShowPropertyModal(true)
    setPropertyMenuOpenId(null)
  }

  const handleSavePropertyFromModal = async (addr) => {
    try {
      const payload = {
        street: addr.street || '',
        city: addr.city || '',
        state: addr.state || '',
        zipCode: addr.zipCode || '',
        country: addr.country || 'USA'
      }
      if (editingProperty) {
        await customerPropertiesAPI.update(customerId, editingProperty.id, payload)
      } else {
        await customerPropertiesAPI.create(customerId, payload)
      }
      await reloadProperties()
      setShowPropertyModal(false)
      setEditingProperty(null)
    } catch (e) {
      console.error('Error saving property:', e)
      setError('Failed to save property. Please try again.')
    }
  }

  const handleSetDefaultProperty = async (property) => {
    try {
      await customerPropertiesAPI.update(customerId, property.id, { isDefault: true })
      await reloadProperties()
      setPropertyMenuOpenId(null)
    } catch (e) {
      console.error('Error setting default property:', e)
    }
  }

  const handleDeleteProperty = async (property) => {
    if (!window.confirm('Delete this property? Existing jobs for this address will keep their history but will no longer reference a property.')) {
      setPropertyMenuOpenId(null)
      return
    }
    try {
      await customerPropertiesAPI.remove(customerId, property.id)
      await reloadProperties()
      setPropertyMenuOpenId(null)
    } catch (e) {
      console.error('Error deleting property:', e)
    }
  }

  const handleEditCustomer = () => {
    setShowEditModal(true)
    setShowMenuDropdown(false)
  }

  const handleNewJob = () => {
    navigate(`/createjob?customerId=${customerId}`)
    setShowMenuDropdown(false)
  }

  const handleDeleteCustomer = async () => {
    if (!window.confirm(`Are you sure you want to delete "${customer.first_name} ${customer.last_name}"? This action cannot be undone.`)) {
      setShowMenuDropdown(false)
      return
    }

    try {
      await customersAPI.delete(customerId, user.id)
      setSuccessMessage('Customer deleted successfully!')
      setTimeout(() => {
        navigate('/customers')
      }, 1000)
    } catch (error) {
      console.error('Error deleting customer:', error)
      setError("Failed to delete customer. Please try again.")
      setShowMenuDropdown(false)
    }
  }

  // Click outside handler for dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenuDropdown(false)
      }
      if (propertyMenuRef.current && !propertyMenuRef.current.contains(event.target)) {
        setPropertyMenuOpenId(null)
      }
    }

    if (showMenuDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMenuDropdown])

  const handleCustomerSave = async (customerData) => {
    try {
      setError("")
      const response = await customersAPI.update(customerId, customerData)
      setCustomer(response.customer || response)
      setSuccessMessage('Customer updated successfully!')
      setTimeout(() => setSuccessMessage(''), 3000)
      setShowEditModal(false)
    } catch (error) {
      console.error('Error updating customer:', error)
      setError("Failed to update customer. Please try again.")
      throw error
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatTime = (dateString) => {
    return formatTimeShared(dateString)
  }

  const getJobStatus = (job) => {
    const scheduledDate = new Date(job.scheduled_date)
    const now = new Date()
    
    if (job.status === 'completed' || job.status === 'paid') return 'completed'
    if (job.status === 'cancelled') return 'cancelled'
    if (scheduledDate < now) return 'past'
    return 'upcoming'
  }

  const upcomingJobs = jobs.filter(job => getJobStatus(job) === 'upcoming')
  const pastJobs = jobs.filter(job => getJobStatus(job) === 'past')
  const cancelledJobs = jobs.filter(job => getJobStatus(job) === 'cancelled')

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[var(--sf-bg-page)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--sf-bg-page)] flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-lg font-medium">{error}</div>
          <button
            onClick={() => navigate('/customers')}
            className="mt-4 px-4 py-2 bg-[var(--sf-blue-500)] text-white rounded-lg hover:bg-[var(--sf-blue-600)]"
          >
            Back to Customers
          </button>
        </div>
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="min-h-screen bg-[var(--sf-bg-page)] flex items-center justify-center">
        <div className="text-center">
          <div className="text-[var(--sf-text-muted)] text-lg font-medium">Customer not found</div>
          <button
            onClick={() => navigate('/customers')}
            className="mt-4 px-4 py-2 bg-[var(--sf-blue-500)] text-white rounded-lg hover:bg-[var(--sf-blue-600)]"
          >
            Back to Customers
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-[var(--sf-bg-page)]">
      
      <div className="flex-1 flex flex-col min-w-0 lg:mx-44 xl:mx-48">
        
        <div className="flex-1 overflow-auto">
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => navigate('/customers')}
                  className="flex items-center text-[var(--sf-text-secondary)] hover:text-[var(--sf-text-primary)] transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 mr-1" />
                  <span className="text-sm font-medium">All Customers</span>
                </button>
              </div>
              
              <div className="flex items-center space-x-4">
                <h1 className="text-2xl font-bold text-[var(--sf-text-primary)]" style={{ fontFamily: 'Montserrat', fontWeight: 700 }}>
                  {customer.first_name} {customer.last_name}
                </h1>
              </div>
            </div>

            {/* Success Message */}
            {successMessage && (
              <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <div className="w-5 h-5 text-green-400">✓</div>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-green-800">{successMessage}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-6">
                {/* DETAILS Card */}
                <div className="bg-white rounded-lg border border-[var(--sf-border-light)] p-6">
                  <h3 className="text-sm font-semibold text-[var(--sf-text-primary)] mb-4">DETAILS</h3>
                  
                  <div className="space-y-4">
                    {customer.phone && (
                      <div className="flex items-center space-x-3">
                        <Phone className="w-4 h-4 text-[var(--sf-text-muted)]" />
                        <span className="text-sm text-[var(--sf-text-primary)]">{formatPhoneNumber(customer.phone)}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-3">
                      <Mail className="w-4 h-4 text-[var(--sf-text-muted)]" />
                      <span className="text-sm text-[var(--sf-text-primary)]">
                        {customer.email || 'No email address'}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <MapPin className="w-4 h-4 text-[var(--sf-text-muted)]" />
                      <span className="text-sm text-[var(--sf-text-primary)]">
                        {(() => {
                          const addressParts = []
                          if (customer.address) addressParts.push(customer.address)
                          if (customer.city) addressParts.push(customer.city)
                          if (customer.state) addressParts.push(customer.state)
                          if (customer.zip_code) addressParts.push(customer.zip_code)
                          return addressParts.length > 0 ? addressParts.join(', ') : 'No address'
                        })()}
                      </span>
                    </div>

                    <div className="flex items-center space-x-3">
                      <Link className="w-4 h-4 text-[var(--sf-text-muted)] flex-shrink-0" />
                      <span className="text-sm text-[var(--sf-text-primary)]">{customer.source || customer.customer_source || 'No source'}</span>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-[var(--sf-border-light)]">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-[var(--sf-text-muted)] uppercase tracking-wide">CUSTOMER SINCE</span>
                      <span className="text-sm text-[var(--sf-text-primary)]">
                        {new Date(customer.created_at).toLocaleDateString('en-US', { 
                          month: 'long', 
                          year: 'numeric' 
                        })}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs font-medium text-[var(--sf-text-muted)] uppercase tracking-wide">SOURCE</span>
                      <span className="text-sm text-[var(--sf-text-primary)]">
                        {customer.source || customer.customer_source || 'No source'}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs font-medium text-[var(--sf-text-muted)] uppercase tracking-wide">TOTAL REVENUE</span>
                      <div className="flex items-center space-x-1">
                        <span className="text-sm text-[var(--sf-text-primary)]">
                          {(() => {
                            // Calculate total revenue from completed jobs and paid invoices
                            const completedJobs = jobs.filter(job => 
                              job.status === 'completed' && job.total
                            )
                            const paidInvoices = invoices.filter(inv => 
                              inv.status === 'paid' && inv.total
                            )
                            
                            let totalRevenue = 0
                            
                            // Sum from completed jobs
                            completedJobs.forEach(job => {
                              totalRevenue += parseFloat(job.total || job.total_amount || 0)
                            })
                            
                            // Sum from paid invoices (avoid double counting if job already counted)
                            paidInvoices.forEach(inv => {
                              const jobId = inv.job_id
                              const jobAlreadyCounted = completedJobs.some(j => j.id === jobId)
                              if (!jobAlreadyCounted) {
                                totalRevenue += parseFloat(inv.total || 0)
                              }
                            })
                            
                            return totalRevenue > 0 
                              ? `$${totalRevenue.toFixed(2)}` 
                              : '$0.00'
                          })()}
                        </span>
                        <Info className="w-3 h-3 text-[var(--sf-text-muted)]" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Jobs Card */}
                <div className="bg-white rounded-lg border border-[var(--sf-border-light)] p-6" style={{ overflow: 'visible' }}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-[var(--sf-text-primary)]" style={{ fontFamily: 'Montserrat', fontWeight: 600 }}>Jobs</h3>
                    <div className="flex items-center space-x-2">
                      {canCreateJobs(user) && (
                        <button
                          onClick={handleNewJob}
                          className="flex items-center space-x-1 px-3 py-1.5 bg-[var(--sf-blue-500)] text-white text-xs font-medium rounded-lg hover:bg-[var(--sf-blue-600)] transition-colors"
                          style={{ fontFamily: 'Montserrat', fontWeight: 500 }}
                        >
                          <Plus className="w-3 h-3" />
                          <span>New Job</span>
                        </button>
                      )}
                      {isAccountOwner(user) && (
                        <div className="relative" ref={menuRef}>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation()
                              setShowMenuDropdown(!showMenuDropdown)
                            }}
                            className="p-2 text-[var(--sf-text-muted)] hover:text-[var(--sf-text-secondary)] transition-colors"
                            type="button"
                          >
                            <MoreVertical className="w-5 h-5" />
                          </button>
                          
                          {showMenuDropdown && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-[var(--sf-border-light)] py-2 z-[9999]">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleEditCustomer()
                                }}
                                className="w-full text-left px-4 py-2.5 hover:bg-[var(--sf-bg-page)] transition-colors flex items-center gap-3 text-[var(--sf-text-primary)] font-medium text-sm"
                                style={{ fontFamily: 'Montserrat', fontWeight: 500 }}
                              >
                                <Edit className="w-4 h-4 text-[var(--sf-text-secondary)]" />
                                <span>Edit Customer</span>
                              </button>
                              {canCreateJobs(user) && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleNewJob()
                                  }}
                                  className="w-full text-left px-4 py-2.5 hover:bg-[var(--sf-bg-page)] transition-colors flex items-center gap-3 text-[var(--sf-text-primary)] font-medium text-sm"
                                  style={{ fontFamily: 'Montserrat', fontWeight: 500 }}
                                >
                                  <FileText className="w-4 h-4 text-[var(--sf-text-secondary)]" />
                                  <span>New Job</span>
                                </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteCustomer()
                                }}
                                className="w-full text-left px-4 py-2.5 hover:bg-[var(--sf-bg-page)] transition-colors flex items-center gap-3 text-red-600 font-medium text-sm"
                                style={{ fontFamily: 'Montserrat', fontWeight: 500 }}
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                                <span>Delete</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                  {/* Job Tabs */}
                  <div className="flex space-x-1 mb-4">
                    <button
                      onClick={() => setActiveJobTab("upcoming")}
                      className={`px-3 py-1.5 text-xs font-medium rounded ${
                        activeJobTab === "upcoming"
                          ? "bg-blue-100 text-[var(--sf-blue-500)]"
                          : "text-[var(--sf-text-muted)] hover:text-[var(--sf-text-primary)]"
                      }`}
                    >
                      Upcoming {upcomingJobs.length}
                    </button>
                    <button
                      onClick={() => setActiveJobTab("past")}
                      className={`px-3 py-1.5 text-xs font-medium rounded ${
                        activeJobTab === "past"
                          ? "bg-blue-100 text-[var(--sf-blue-500)]"
                          : "text-[var(--sf-text-muted)] hover:text-[var(--sf-text-primary)]"
                      }`}
                    >
                      Past {pastJobs.length}
                    </button>
                    <button
                      onClick={() => setActiveJobTab("cancelled")}
                      className={`px-3 py-1.5 text-xs font-medium rounded ${
                        activeJobTab === "cancelled"
                          ? "bg-blue-100 text-[var(--sf-blue-500)]"
                          : "text-[var(--sf-text-muted)] hover:text-[var(--sf-text-primary)]"
                      }`}
                    >
                      Canceled {cancelledJobs.length}
                    </button>
                  </div>

                  {/* Job List */}
                  <div className="space-y-3">
                    {activeJobTab === "upcoming" && upcomingJobs.map((job) => (
                      <div key={job.id} className="flex items-center space-x-3 p-3 bg-[var(--sf-blue-50)] rounded-lg">
                        <div className="w-12 h-12 bg-[var(--sf-blue-500)] rounded-lg flex items-center justify-center">
                          <Calendar className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="text-xs font-medium text-[var(--sf-blue-500)] uppercase">
                            {formatDate(job.scheduled_date)}
                          </div>
                          <div className="text-sm font-semibold text-[var(--sf-text-primary)]">
                            JOB-#{job.id}
                          </div>
                          <div className="text-sm text-[var(--sf-text-secondary)]">{job.service_name || 'Service'}</div>
                          <div className="text-xs text-[var(--sf-text-muted)]">
                            {formatTime(job.scheduled_date)}
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {activeJobTab === "past" && pastJobs.map((job) => (
                      <div key={job.id} className="flex items-center space-x-3 p-3 bg-[var(--sf-bg-page)] rounded-lg">
                        <div className="w-12 h-12 bg-gray-400 rounded-lg flex items-center justify-center">
                          <Calendar className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="text-xs font-medium text-[var(--sf-text-muted)] uppercase">
                            {formatDate(job.scheduled_date)}
                          </div>
                          <div className="text-sm font-semibold text-[var(--sf-text-primary)]">
                            JOB-#{job.id}
                          </div>
                          <div className="text-sm text-[var(--sf-text-secondary)]">{job.service_name || 'Service'}</div>
                          <div className="text-xs text-[var(--sf-text-muted)]">
                            {formatTime(job.scheduled_date)}
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {activeJobTab === "cancelled" && cancelledJobs.map((job) => (
                      <div key={job.id} className="flex items-center space-x-3 p-3 bg-red-50 rounded-lg">
                        <div className="w-12 h-12 bg-red-400 rounded-lg flex items-center justify-center">
                          <Calendar className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="text-xs font-medium text-red-500 uppercase">
                            {formatDate(job.scheduled_date)}
                          </div>
                          <div className="text-sm font-semibold text-[var(--sf-text-primary)]">
                            JOB-#{job.id}
                          </div>
                          <div className="text-sm text-[var(--sf-text-secondary)]">{job.service_name || 'Service'}</div>
                          <div className="text-xs text-[var(--sf-text-muted)]">
                            {formatTime(job.scheduled_date)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Requests Card */}
                <div className="bg-white rounded-lg border border-[var(--sf-border-light)] p-6">
                  <h3 className="text-sm font-semibold text-[var(--sf-text-primary)] mb-4">Requests</h3>
                  <div className="flex flex-col items-center justify-center py-8">
                    <FileText className="w-12 h-12 text-gray-300 mb-3" />
                    <p className="text-sm text-[var(--sf-text-muted)] text-center">
                      This customer hasn't submitted any booking or quote requests
                    </p>
                  </div>
                </div>

                {/* Estimates Card */}
                <div className="bg-white rounded-lg border border-[var(--sf-border-light)] p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-[var(--sf-text-primary)]">Estimates</h3>
                    {canCreateJobs(user) && (
                      <button className="flex items-center space-x-1 px-3 py-1.5 bg-[var(--sf-blue-500)] text-white text-xs font-medium rounded-lg hover:bg-[var(--sf-blue-600)]">
                        <Plus className="w-3 h-3" />
                        <span>New Estimate</span>
                      </button>
                    )}
                  </div>
                  <div className="flex flex-col items-center justify-center py-8">
                    <Link className="w-12 h-12 text-gray-300 mb-3" />
                    <p className="text-sm text-[var(--sf-text-muted)] text-center">
                      No bookable estimates have been sent to this customer
                    </p>
                  </div>
                </div>

                {/* Notes and Files Card */}
                <div className="bg-white rounded-lg border border-[var(--sf-border-light)] p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-[var(--sf-text-primary)]">Notes and Files</h3>
                    {canCreateJobs(user) && (
                      <button className="flex items-center space-x-1 px-3 py-1.5 bg-[var(--sf-blue-500)] text-white text-xs font-medium rounded-lg hover:bg-[var(--sf-blue-600)]">
                        <Plus className="w-3 h-3" />
                        <span>New Note</span>
                      </button>
                    )}
                  </div>
                  <div className="flex flex-col items-center justify-center py-8">
                    <FileText className="w-12 h-12 text-gray-300 mb-3" />
                    <p className="text-sm text-[var(--sf-text-muted)] text-center">
                      This customer doesn't have any notes attached to them
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {/* Properties Card */}
                <div className="bg-white rounded-lg border border-[var(--sf-border-light)] p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-[var(--sf-text-primary)]">Properties</h3>
                    {isAccountOwner(user) && (
                      <button
                        onClick={handleOpenAddProperty}
                        className="flex items-center space-x-1 px-3 py-1.5 bg-[var(--sf-blue-500)] text-white text-xs font-medium rounded-lg hover:bg-[var(--sf-blue-600)]"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Property</span>
                      </button>
                    )}
                  </div>

                  <div className="space-y-3">
                    {propertiesLoading && properties.length === 0 ? (
                      <div className="text-xs text-[var(--sf-text-muted)] py-4 text-center">Loading…</div>
                    ) : properties.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8">
                        <MapPin className="w-10 h-10 text-gray-300 mb-2" />
                        <p className="text-sm text-[var(--sf-text-muted)] text-center">No properties yet</p>
                      </div>
                    ) : (
                      properties.map((p) => {
                        const line1 = [p.street, p.suite].filter(Boolean).join(', ') || '—'
                        const line2 = [p.city, p.state, p.zip_code].filter(Boolean).join(', ')
                        const isMenuOpen = propertyMenuOpenId === p.id
                        return (
                          <div key={p.id} className="flex items-start justify-between p-3 bg-[var(--sf-bg-page)] rounded-lg">
                            <div className="flex items-start space-x-3 min-w-0">
                              <MapPin className="w-4 h-4 text-[var(--sf-text-muted)] mt-0.5 flex-shrink-0" />
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-[var(--sf-text-primary)] truncate">{line1}</div>
                                {line2 && (
                                  <div className="text-xs text-[var(--sf-text-muted)] truncate">{line2}</div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
                              {p.is_default && (
                                <span className="px-2 py-1 bg-blue-100 text-[var(--sf-blue-500)] text-xs font-medium rounded">
                                  Default
                                </span>
                              )}
                              {isAccountOwner(user) && (
                                <div className="relative" ref={isMenuOpen ? propertyMenuRef : null}>
                                  <button
                                    onClick={() => setPropertyMenuOpenId(isMenuOpen ? null : p.id)}
                                    className="p-1 text-[var(--sf-text-muted)] hover:text-[var(--sf-text-secondary)]"
                                  >
                                    <MoreVertical className="w-4 h-4" />
                                  </button>
                                  {isMenuOpen && (
                                    <div className="absolute right-0 mt-1 w-44 bg-white border border-[var(--sf-border-light)] rounded-lg shadow-lg z-10 py-1">
                                      <button
                                        onClick={() => handleOpenEditProperty(p)}
                                        className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--sf-bg-page)] text-[var(--sf-text-primary)]"
                                      >
                                        Edit
                                      </button>
                                      {!p.is_default && (
                                        <button
                                          onClick={() => handleSetDefaultProperty(p)}
                                          className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--sf-bg-page)] text-[var(--sf-text-primary)]"
                                        >
                                          Set as default
                                        </button>
                                      )}
                                      <button
                                        onClick={() => handleDeleteProperty(p)}
                                        className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--sf-bg-page)] text-red-600"
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>

                {/* Recurring Bookings Card */}
                <div className="bg-white rounded-lg border border-[var(--sf-border-light)] p-6">
                  <h3 className="text-sm font-semibold text-[var(--sf-text-primary)] mb-4">Recurring Bookings</h3>
                  <div className="flex flex-col items-center justify-center py-8">
                    <RefreshCw className="w-12 h-12 text-gray-300 mb-3" />
                    <p className="text-sm text-[var(--sf-text-muted)] text-center">
                      This customer doesn't have any recurring bookings
                    </p>
                  </div>
                </div>

                {/* Payment Methods Card */}
                <div className="bg-white rounded-lg border border-[var(--sf-border-light)] p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-[var(--sf-text-primary)]">Payment Methods</h3>
                    <div className="flex items-center space-x-2">
                      <button className="flex items-center space-x-1 px-3 py-1.5 bg-[var(--sf-blue-500)] text-white text-xs font-medium rounded-lg hover:bg-[var(--sf-blue-600)]">
                        <Plus className="w-3 h-3" />
                        <span>Add Card</span>
                      </button>
                      <button className="p-1 text-[var(--sf-text-muted)] hover:text-[var(--sf-text-secondary)]">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col items-center justify-center py-8">
                    <CreditCard className="w-12 h-12 text-gray-300 mb-3" />
                    <p className="text-sm text-[var(--sf-text-muted)] text-center">
                      This customer doesn't have any payment cards on file
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Customer Modal */}
      <CustomerModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSave={handleCustomerSave}
        customer={customer}
        isEditing={true}
      />

      <ServiceAddressModal
        isOpen={showPropertyModal}
        onClose={() => { setShowPropertyModal(false); setEditingProperty(null) }}
        onSave={handleSavePropertyFromModal}
        currentAddress={editingProperty ? {
          street: editingProperty.street || '',
          city: editingProperty.city || '',
          state: editingProperty.state || '',
          zipCode: editingProperty.zip_code || '',
          country: editingProperty.country || 'USA'
        } : null}
      />
    </div>
  )
}

export default CustomerDetailsRedesigned

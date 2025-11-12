"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { ChevronLeft, Edit, Trash2, Phone, Mail, MapPin, Calendar, DollarSign, FileText, AlertCircle, Loader2, CheckCircle, MoreVertical, Plus, Info } from "lucide-react"
import { customersAPI, jobsAPI, estimatesAPI, invoicesAPI } from "../services/api"
import { useAuth } from "../context/AuthContext"
import Sidebar from "../components/sidebar"
import MobileHeader from "../components/mobile-header"

import CustomerModal from "../components/customer-modal"
import { formatPhoneNumber } from "../utils/phoneFormatter"

const CustomerDetails = () => {
  const { customerId } = useParams()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const [customer, setCustomer] = useState(null)
  const [jobs, setJobs] = useState([])
  const [estimates, setEstimates] = useState([])
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [showMenuDropdown, setShowMenuDropdown] = useState(false)
  const menuRef = useRef(null)

  // New state for job filters
  const [jobFilter, setJobFilter] = useState("upcoming") // upcoming, past, canceled

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

      const [jobsData, estimatesData, invoicesData] = await Promise.all([
        jobsAPI.getAll(user.id, "", "", 1, 50, "", "", "scheduled_date", "DESC", "", "", customerId),
        estimatesAPI.getAll(user.id, { customerId: customerId }),
        invoicesAPI.getAll(user.id, { customerId: customerId })
      ])

      setJobs(jobsData.jobs || jobsData)
      setEstimates(estimatesData.estimates || estimatesData)
      setInvoices(invoicesData.invoices || invoicesData)

    } catch (error) {
      console.error('Error fetching customer data:', error)
      setError("Failed to load customer data. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleEditCustomer = () => {
    console.log('Opening edit modal for customer:', customer)
    setShowEditModal(true)
    setShowMenuDropdown(false)
  }

  const handleNewJob = () => {
    navigate(`/createjob?customerId=${customerId}`)
    setShowMenuDropdown(false)
  }

  const handleCustomerSave = async (customerData) => {
    try {
      setError("")
      console.log('Updating customer:', customerData)
      const response = await customersAPI.update(customerId, customerData)
      console.log('Customer updated successfully:', response)

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

  const handleDeleteCustomer = () => {
    setShowDeleteConfirm(true)
    setShowMenuDropdown(false)
  }

  // Click outside handler for dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenuDropdown(false)
      }
    }

    if (showMenuDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMenuDropdown])

  const confirmDeleteCustomer = async () => {
    try {
      setDeleteLoading(true)
      await customersAPI.delete(customerId)
      navigate('/customers')
    } catch (error) {
      console.error('Error deleting customer:', error)
      setError("Failed to delete customer.")
      setShowDeleteConfirm(false)
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleViewJob = (job) => {
    navigate(`/job/${job.id}`)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString()
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0)
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      case 'in_progress': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Filter jobs based on status
  const getFilteredJobs = () => {
    const now = new Date()
    if (jobFilter === "upcoming") {
      return jobs.filter(job =>
        new Date(job.scheduled_date) >= now &&
        job.status !== 'cancelled' &&
        job.status !== 'completed'
      )
    } else if (jobFilter === "past") {
      return jobs.filter(job => job.status === 'completed')
    } else if (jobFilter === "canceled") {
      return jobs.filter(job => job.status === 'cancelled')
    }
    return jobs
  }

  const upcomingCount = jobs.filter(job => {
    const now = new Date()
    return new Date(job.scheduled_date) >= now &&
           job.status !== 'cancelled' &&
           job.status !== 'completed'
  }).length

  const pastCount = jobs.filter(job => job.status === 'completed').length
  const canceledCount = jobs.filter(job => job.status === 'cancelled').length

  // Format job date for calendar display
  const getJobDateDisplay = (dateString) => {
    const date = new Date(dateString)
    return {
      month: date.toLocaleString('en-US', { month: 'short' }).toUpperCase(),
      day: date.getDate()
    }
  }

  // Format job time display
  const getJobTimeDisplay = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).toUpperCase()
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">{error}</h3>
          <div className="mt-6">
            <button
              onClick={() => navigate('/customers')}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
            >
              Back to Customers
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h3 className="mt-2 text-sm font-medium text-gray-900">Customer not found</h3>
          <div className="mt-6">
            <button
              onClick={() => navigate('/customers')}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
            >
              Back to Customers
            </button>
          </div>
        </div>
      </div>
    )
  }

  const filteredJobs = getFilteredJobs()

  return (
    <div style={{fontFamily: 'ProximaNova-bold'}} className="flex h-screen bg-gray-50 overflow-hidden">
     

      <div className="flex-1 flex flex-col min-w-0 lg:mx-44 xl:mx-48">
        <MobileHeader onMenuClick={() => setSidebarOpen(true)} />

        <div className="flex-1 overflow-auto">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
            <div className="px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => navigate('/customers')}
                  className="flex items-center text-sm text-gray-600 hover:text-gray-900"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="ml-1">All Customers</span>
                </button>
                <div className="relative" ref={menuRef}>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowMenuDropdown(!showMenuDropdown)
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    type="button"
                  >
                    <MoreVertical className="w-5 h-5 text-gray-600" />
                  </button>
                  
                  {showMenuDropdown && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-[9999]">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEditCustomer()
                        }}
                        className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors flex items-center gap-3 text-gray-800 font-medium text-sm"
                        style={{ fontFamily: 'ProximaNova-Medium' }}
                      >
                        <Edit className="w-4 h-4 text-gray-600" />
                        <span>Edit Customer</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleNewJob()
                        }}
                        className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors flex items-center gap-3 text-gray-800 font-medium text-sm"
                        style={{ fontFamily: 'ProximaNova-Medium' }}
                      >
                        <FileText className="w-4 h-4 text-gray-600" />
                        <span>New Job</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteCustomer()
                        }}
                        className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors flex items-center gap-3 text-red-600 font-medium text-sm"
                        style={{ fontFamily: 'ProximaNova-Medium' }}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                        <span>Delete</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <h1 className="text-2xl font-semibold text-gray-900 mt-3">
                {customer.first_name} {customer.last_name}
              </h1>
            </div>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className="px-4 sm:px-6 lg:px-8 pt-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <p className="ml-3 text-sm font-medium text-green-800">{successMessage}</p>
                </div>
              </div>
            </div>
          )}

          <div className="px-4 sm:px-6 lg:px-8 py-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Left Sidebar - Customer Details */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
                    DETAILS
                  </h3>

                  <div className="space-y-4">
                    {customer.phone && (
                      <div className="flex items-start">
                        <Phone className="w-4 h-4 text-gray-400 mt-0.5" />
                        <span className="ml-3 text-sm text-gray-900">{formatPhoneNumber(customer.phone)}</span>
                      </div>
                    )}

                    {customer.email && (
                      <div className="flex items-start">
                        <Mail className="w-4 h-4 text-gray-400 mt-0.5" />
                        <span className="ml-3 text-sm text-gray-900 break-all">{customer.email}</span>
                      </div>
                    )}

                    {customer.address && (
                      <div className="flex items-start">
                        <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                        <span className="ml-3 text-sm text-gray-900">
                          {customer.address}
                          {customer.suite && `, ${customer.suite}`}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-8 pt-6 border-t border-gray-200">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      CUSTOMER SINCE
                    </h3>
                    <p className="text-sm text-gray-900">
                      {customer.created_at ? new Date(customer.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'October, 2025'}
                    </p>
                  </div>

                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        TOTAL REVENUE
                      </h3>
                      <Info className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Content Area */}
              <div className="lg:col-span-3 space-y-6">
                {/* Jobs Section */}
                <div className="bg-white rounded-lg border border-gray-200">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-gray-900">Jobs</h2>
                      <button className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                        <Plus className="w-4 h-4 mr-1" />
                        New Job
                      </button>
                    </div>

                    {/* Job Filter Tabs */}
                    <div className="flex items-center space-x-6 mt-4">
                      <button
                        onClick={() => setJobFilter("upcoming")}
                        className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                          jobFilter === "upcoming"
                            ? "border-blue-600 text-blue-600"
                            : "border-transparent text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        Upcoming <span className="ml-1">{upcomingCount}</span>
                      </button>
                      <button
                        onClick={() => setJobFilter("past")}
                        className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                          jobFilter === "past"
                            ? "border-blue-600 text-blue-600"
                            : "border-transparent text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        Past <span className="ml-1">{pastCount}</span>
                      </button>
                      <button
                        onClick={() => setJobFilter("canceled")}
                        className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                          jobFilter === "canceled"
                            ? "border-blue-600 text-blue-600"
                            : "border-transparent text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        Canceled <span className="ml-1">{canceledCount}</span>
                      </button>
                    </div>
                  </div>

                  <div className="p-6">
                    {filteredJobs.length === 0 ? (
                      <div className="text-center py-12">
                        <Calendar className="mx-auto h-12 w-12 text-gray-300" />
                        <p className="mt-2 text-sm text-gray-500">No {jobFilter} jobs</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {filteredJobs.map((job) => {
                          const dateDisplay = getJobDateDisplay(job.scheduled_date)
                          const timeDisplay = getJobTimeDisplay(job.scheduled_date)

                          return (
                            <div
                              key={job.id}
                              className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-gray-300 cursor-pointer transition-colors"
                              onClick={() => handleViewJob(job)}
                            >
                              {/* Calendar Date */}
                              <div className="flex-shrink-0 w-14 h-14 bg-blue-600 rounded-lg flex flex-col items-center justify-center text-white mr-4">
                                <span className="text-xs font-semibold">{dateDisplay.month}</span>
                                <span className="text-xl font-bold leading-none">{dateDisplay.day}</span>
                              </div>

                              {/* Job Details */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-sm font-medium text-gray-500 mb-0.5">
                                      JOB #{job.id}
                                    </p>
                                    <p className="text-base font-medium text-gray-900">
                                      {job.service_name}
                                    </p>
                                  </div>
                                  <p className="text-sm text-gray-500 text-right ml-4">
                                    {timeDisplay}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Requests Section */}
                <div className="bg-white rounded-lg border border-gray-200">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">Requests</h2>
                  </div>
                  <div className="p-12">
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 rounded-lg mb-3">
                        <FileText className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-sm text-gray-500">
                        This customer hasn't submitted any booking or quote requests
                      </p>
                    </div>
                  </div>
                </div>

                {/* Estimates Section */}
                <div className="bg-white rounded-lg border border-gray-200">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-gray-900">Estimates</h2>
                      <button className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                        <Plus className="w-4 h-4 mr-1" />
                        New Estimate
                      </button>
                    </div>
                  </div>
                  <div className="p-12">
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 rounded-lg mb-3">
                        <FileText className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-sm text-gray-500">
                        No bookable estimates have been sent to this customer
                      </p>
                    </div>
                  </div>
                </div>

                {/* Notes and Files Section */}
                <div className="bg-white rounded-lg border border-gray-200">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-gray-900">Notes and Files</h2>
                      <button className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                        <Plus className="w-4 h-4 mr-1" />
                        New Note
                      </button>
                    </div>
                  </div>
                  <div className="p-12">
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 rounded-lg mb-3">
                        <FileText className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-sm text-gray-500">
                        This customer doesn't have any notes attached to them
                      </p>
                    </div>
                  </div>
                </div>

                {/* Properties Section */}
                <div className="bg-white rounded-lg border border-gray-200">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-gray-900">Properties</h2>
                      <button className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                        <Plus className="w-4 h-4 mr-1" />
                        Add Property
                      </button>
                    </div>
                  </div>
                  <div className="p-6">
                    {customer.address ? (
                      <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                            <MapPin className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <div className="flex items-center">
                              <p className="text-sm font-medium text-gray-900">
                                {customer.address.split(',')[0]}
                              </p>
                              <span className="ml-2 px-2 py-0.5 text-xs font-medium text-blue-700 bg-blue-50 rounded">
                                Default
                              </span>
                            </div>
                            <p className="text-sm text-gray-500">{customer.address}</p>
                          </div>
                        </div>
                        <button className="p-2 hover:bg-gray-100 rounded-lg">
                          <MoreVertical className="w-5 h-5 text-gray-400" />
                        </button>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <MapPin className="mx-auto h-12 w-12 text-gray-300" />
                        <p className="mt-2 text-sm text-gray-500">No properties added</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Recurring Bookings Section */}
                <div className="bg-white rounded-lg border border-gray-200">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">Recurring Bookings</h2>
                  </div>
                  <div className="p-12">
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 rounded-lg mb-3">
                        <Calendar className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-sm text-gray-500">
                        This customer doesn't have any recurring bookings
                      </p>
                    </div>
                  </div>
                </div>

                {/* Payment Methods Section */}
                <div className="bg-white rounded-lg border border-gray-200">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-gray-900">Payment Methods</h2>
                      <div className="flex items-center space-x-2">
                        <button className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                          <Plus className="w-4 h-4 mr-1" />
                          Add Card
                        </button>
                        <button className="p-2 hover:bg-gray-100 rounded-lg">
                          <MoreVertical className="w-5 h-5 text-gray-600" />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="p-12">
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 rounded-lg mb-3">
                        <DollarSign className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-sm text-gray-500">
                        This customer doesn't have any payment cards on file
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && customer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center mb-4">
              <AlertCircle className="h-6 w-6 text-red-600 mr-3" />
              <h3 className="text-lg font-medium text-gray-900">Delete Customer</h3>
            </div>
            <p className="text-sm text-gray-500 mb-6">
              Are you sure you want to delete <strong>{customer.first_name} {customer.last_name}</strong>?
              This action cannot be undone.
              {(jobs.length > 0 || estimates.length > 0 || invoices.length > 0) ? (
                <span className="block mt-2 text-red-600">
                  ⚠️ This customer has associated jobs, estimates, or invoices that must be deleted first.
                </span>
              ) : null}
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteCustomer}
                disabled={deleteLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
              >
                {deleteLoading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Customer Modal */}
      <CustomerModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSave={handleCustomerSave}
        customer={customer}
        isEditing={true}
      />
    </div>
  )
}

export default CustomerDetails

"use client"

import { useState, useEffect } from "react"
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
  Building
} from "lucide-react"
import { customersAPI, jobsAPI, estimatesAPI, invoicesAPI } from "../services/api"
import { useAuth } from "../context/AuthContext"
import Sidebar from "../components/sidebar"
import MobileHeader from "../components/mobile-header"
import CustomerModal from "../components/customer-modal"
import { formatPhoneNumber } from "../utils/phoneFormatter"

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
    setShowEditModal(true)
  }

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
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const getJobStatus = (job) => {
    const scheduledDate = new Date(job.scheduled_date)
    const now = new Date()
    
    if (job.status === 'completed') return 'completed'
    if (job.status === 'cancelled') return 'cancelled'
    if (scheduledDate < now) return 'past'
    return 'upcoming'
  }

  const upcomingJobs = jobs.filter(job => getJobStatus(job) === 'upcoming')
  const pastJobs = jobs.filter(job => getJobStatus(job) === 'past')
  const cancelledJobs = jobs.filter(job => getJobStatus(job) === 'cancelled')

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-lg font-medium">{error}</div>
          <button
            onClick={() => navigate('/customers')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Customers
          </button>
        </div>
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-500 text-lg font-medium">Customer not found</div>
          <button
            onClick={() => navigate('/customers')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Customers
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="flex-1 flex flex-col min-w-0">
        <MobileHeader onMenuClick={() => setSidebarOpen(true)} />
        
        <div className="flex-1 overflow-auto">
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => navigate('/customers')}
                  className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 mr-1" />
                  <span className="text-sm font-medium">All Customers</span>
                </button>
              </div>
              
              <div className="flex items-center space-x-4">
                <h1 className="text-2xl font-bold text-gray-900">
                  {customer.first_name} {customer.last_name}
                </h1>
                <button className="p-2 text-gray-400 hover:text-gray-600">
                  <MoreVertical className="w-5 h-5" />
                </button>
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
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">DETAILS</h3>
                  
                  <div className="space-y-4">
                    {customer.phone && (
                      <div className="flex items-center space-x-3">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-900">{formatPhoneNumber(customer.phone)}</span>
                      </div>
                    )}
                    
                    {customer.email && (
                      <div className="flex items-center space-x-3">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-900">{customer.email}</span>
                      </div>
                    )}
                    
                    {customer.address && (
                      <div className="flex items-center space-x-3">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-900">{customer.address}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">CUSTOMER SINCE</span>
                      <span className="text-sm text-gray-900">
                        {new Date(customer.created_at).toLocaleDateString('en-US', { 
                          month: 'long', 
                          year: 'numeric' 
                        })}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">TOTAL REVENUE</span>
                      <div className="flex items-center space-x-1">
                        <span className="text-sm text-gray-900">-</span>
                        <Info className="w-3 h-3 text-gray-400" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Jobs Card */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-gray-700">Jobs</h3>
                    <button className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700">
                      <Plus className="w-3 h-3" />
                      <span>New Job</span>
                    </button>
                  </div>

                  {/* Job Tabs */}
                  <div className="flex space-x-1 mb-4">
                    <button
                      onClick={() => setActiveJobTab("upcoming")}
                      className={`px-3 py-1.5 text-xs font-medium rounded ${
                        activeJobTab === "upcoming"
                          ? "bg-blue-100 text-blue-700"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      Upcoming {upcomingJobs.length}
                    </button>
                    <button
                      onClick={() => setActiveJobTab("past")}
                      className={`px-3 py-1.5 text-xs font-medium rounded ${
                        activeJobTab === "past"
                          ? "bg-blue-100 text-blue-700"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      Past {pastJobs.length}
                    </button>
                    <button
                      onClick={() => setActiveJobTab("cancelled")}
                      className={`px-3 py-1.5 text-xs font-medium rounded ${
                        activeJobTab === "cancelled"
                          ? "bg-blue-100 text-blue-700"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      Canceled {cancelledJobs.length}
                    </button>
                  </div>

                  {/* Job List */}
                  <div className="space-y-3">
                    {activeJobTab === "upcoming" && upcomingJobs.map((job) => (
                      <div key={job.id} className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                        <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                          <Calendar className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="text-xs font-medium text-blue-600 uppercase">
                            {formatDate(job.scheduled_date)}
                          </div>
                          <div className="text-sm font-semibold text-gray-900">
                            JOB-{job.id}
                          </div>
                          <div className="text-sm text-gray-600">{job.service_name}</div>
                          <div className="text-xs text-gray-500">
                            {formatDate(job.scheduled_date).toUpperCase()}, {formatDate(job.scheduled_date)} {formatTime(job.scheduled_date)} - {formatTime(new Date(new Date(job.scheduled_date).getTime() + (job.duration || 120) * 60000))}
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {activeJobTab === "past" && pastJobs.map((job) => (
                      <div key={job.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <div className="w-12 h-12 bg-gray-400 rounded-lg flex items-center justify-center">
                          <Calendar className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="text-xs font-medium text-gray-500 uppercase">
                            {formatDate(job.scheduled_date)}
                          </div>
                          <div className="text-sm font-semibold text-gray-900">
                            JOB-{job.id}
                          </div>
                          <div className="text-sm text-gray-600">{job.service_name}</div>
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
                          <div className="text-sm font-semibold text-gray-900">
                            JOB-{job.id}
                          </div>
                          <div className="text-sm text-gray-600">{job.service_name}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Requests Card */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">Requests</h3>
                  <div className="flex flex-col items-center justify-center py-8">
                    <FileText className="w-12 h-12 text-gray-300 mb-3" />
                    <p className="text-sm text-gray-500 text-center">
                      This customer hasn't submitted any booking or quote requests
                    </p>
                  </div>
                </div>

                {/* Estimates Card */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-gray-700">Estimates</h3>
                    <button className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700">
                      <Plus className="w-3 h-3" />
                      <span>New Estimate</span>
                    </button>
                  </div>
                  <div className="flex flex-col items-center justify-center py-8">
                    <Link className="w-12 h-12 text-gray-300 mb-3" />
                    <p className="text-sm text-gray-500 text-center">
                      No bookable estimates have been sent to this customer
                    </p>
                  </div>
                </div>

                {/* Notes and Files Card */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-gray-700">Notes and Files</h3>
                    <button className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700">
                      <Plus className="w-3 h-3" />
                      <span>New Note</span>
                    </button>
                  </div>
                  <div className="flex flex-col items-center justify-center py-8">
                    <FileText className="w-12 h-12 text-gray-300 mb-3" />
                    <p className="text-sm text-gray-500 text-center">
                      This customer doesn't have any notes attached to them
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {/* Properties Card */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-gray-700">Properties</h3>
                    <div className="flex items-center space-x-2">
                      <button className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700">
                        <Plus className="w-3 h-3" />
                        <span>Add Property</span>
                      </button>
                      <button className="p-1 text-gray-400 hover:text-gray-600">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">Victory Ave</div>
                          <div className="text-xs text-gray-500">Sochumi</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                          Default
                        </span>
                        <button className="p-1 text-gray-400 hover:text-gray-600">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recurring Bookings Card */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">Recurring Bookings</h3>
                  <div className="flex flex-col items-center justify-center py-8">
                    <RefreshCw className="w-12 h-12 text-gray-300 mb-3" />
                    <p className="text-sm text-gray-500 text-center">
                      This customer doesn't have any recurring bookings
                    </p>
                  </div>
                </div>

                {/* Payment Methods Card */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-gray-700">Payment Methods</h3>
                    <div className="flex items-center space-x-2">
                      <button className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700">
                        <Plus className="w-3 h-3" />
                        <span>Add Card</span>
                      </button>
                      <button className="p-1 text-gray-400 hover:text-gray-600">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col items-center justify-center py-8">
                    <CreditCard className="w-12 h-12 text-gray-300 mb-3" />
                    <p className="text-sm text-gray-500 text-center">
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
    </div>
  )
}

export default CustomerDetailsRedesigned

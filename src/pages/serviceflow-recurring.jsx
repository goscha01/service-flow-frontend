"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import Sidebar from "../components/sidebar"
import { Plus, RotateCcw, ChevronLeft, ChevronRight, RotateCw } from "lucide-react"
import { recurringBookingsAPI } from "../services/api"
import { formatDateLocal } from "../utils/dateUtils"
import { formatRecurringFrequency } from "../utils/recurringUtils"
import MobileHeader from "../components/mobile-header"

const ServiceFlowRecurring = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('active') // 'active' or 'canceled'
  const [recurringBookings, setRecurringBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  useEffect(() => {
    fetchRecurringBookings()
  }, [activeTab])

  const fetchRecurringBookings = async () => {
    try {
      setLoading(true)
      const response = await recurringBookingsAPI.getAll(activeTab)
      console.log('Recurring bookings response:', response)
      setRecurringBookings(response.recurringBookings || [])
    } catch (error) {
      console.error('Error fetching recurring bookings:', error)
      setRecurringBookings([]) // Set empty array on error
    } finally {
      setLoading(false)
    }
  }

  const handleCreateNew = () => {
    navigate("/createjob")
  }

  // Format recurring frequency for display
  const formatFrequency = (frequency, scheduledDate = null) => {
    // Use the utility function to format the frequency properly
    // It will return 'Never' if frequency is empty/null
    return formatRecurringFrequency(frequency || '', scheduledDate ? new Date(scheduledDate) : null)
  }

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return ''
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      })
    } catch (e) {
      return dateString
    }
  }

  // Format next job date
  const formatNextJob = (booking) => {
    if (!booking.nextJobDate && !booking.scheduledDate) return 'N/A'
    
    const date = booking.nextJobDate || booking.scheduledDate
    try {
      const jobDate = new Date(date)
      const weekday = jobDate.toLocaleDateString('en-US', { weekday: 'short' })
      const month = jobDate.toLocaleDateString('en-US', { month: 'short' })
      const day = jobDate.getDate()
      const year = jobDate.getFullYear()
      const time = booking.scheduledDate ? new Date(booking.scheduledDate).toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      }) : ''
      
      return `${time} ${weekday} - ${month} ${day}, ${year} Job #${booking.nextJobId || booking.jobId}`
    } catch (e) {
      return date
    }
  }

  // Calculate pagination
  const totalPages = Math.ceil(recurringBookings.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedBookings = recurringBookings.slice(startIndex, endIndex)

  // Count active and canceled - need to fetch both to get accurate counts
  const [activeCount, setActiveCount] = useState(0)
  const [canceledCount, setCanceledCount] = useState(0)
  
  useEffect(() => {
    // Fetch counts for both tabs
    const fetchCounts = async () => {
      try {
        const [activeResponse, canceledResponse] = await Promise.all([
          recurringBookingsAPI.getAll('active'),
          recurringBookingsAPI.getAll('canceled')
        ])
        setActiveCount(activeResponse.recurringBookings?.length || 0)
        setCanceledCount(canceledResponse.recurringBookings?.length || 0)
      } catch (error) {
        console.error('Error fetching recurring booking counts:', error)
      }
    }
    fetchCounts()
  }, [recurringBookings]) // Update counts when bookings change

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Main Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} activePage="recurring" />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 lg:mx-44 xl:mx-48">
        {/* Mobile Header */}
        <MobileHeader pageTitle="Recurring" />

        {/* Desktop Header */}
        <div className="hidden lg:flex bg-white border-b border-gray-200 px-6 py-4 items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 700 }}>
            Recurring Bookings
          </h1>
          <button 
            onClick={handleCreateNew}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center space-x-2"
            style={{ fontFamily: 'Montserrat', fontWeight: 500 }}
          >
            <Plus className="w-4 h-4" />
            <span>Create New</span>
          </button>
        </div>

        {/* Mobile Header Content */}
        <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 700 }}>
              Recurring Bookings
            </h1>
            <button 
              onClick={handleCreateNew}
              className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center space-x-1"
              style={{ fontFamily: 'Montserrat', fontWeight: 500 }}
            >
              <Plus className="w-4 h-4" />
              <span>Create New</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto bg-white">
          {/* Tabs */}
          <div className="border-b border-gray-200 px-6 pt-4">
            <div className="flex space-x-8">
              <button
                onClick={() => {
                  setActiveTab('active')
                  setCurrentPage(1)
                }}
                className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'active'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
                style={{ fontFamily: 'Montserrat', fontWeight: 500 }}
              >
                Active ({activeCount})
              </button>
              <button
                onClick={() => {
                  setActiveTab('canceled')
                  setCurrentPage(1)
                }}
                className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'canceled'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
                style={{ fontFamily: 'Montserrat', fontWeight: 500 }}
              >
                Canceled ({canceledCount})
              </button>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : paginatedBookings.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <RotateCcw className="w-8 h-8 text-gray-400" />
            </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2" style={{ fontFamily: 'Montserrat', fontWeight: 600 }}>
                  No {activeTab} recurring bookings
                </h3>
                <p className="text-gray-600 mb-6 leading-relaxed" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
                  {activeTab === 'active' 
                    ? 'Create a recurring booking to get started.'
                    : 'No canceled recurring bookings.'}
                </p>
                {activeTab === 'active' && (
                  <button 
                    onClick={handleCreateNew}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                    style={{ fontFamily: 'Montserrat', fontWeight: 500 }}
                  >
                    Create New Recurring Booking
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full" style={{ fontFamily: 'Montserrat' }}>
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider" style={{ fontFamily: 'Montserrat', fontWeight: 600 }}>
                        CUSTOMER
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider" style={{ fontFamily: 'Montserrat', fontWeight: 600 }}>
                        SERVICE
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider" style={{ fontFamily: 'Montserrat', fontWeight: 600 }}>
                        FREQUENCY
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider" style={{ fontFamily: 'Montserrat', fontWeight: 600 }}>
                        NEXT JOB
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider" style={{ fontFamily: 'Montserrat', fontWeight: 600 }}>
                        CREATED
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider" style={{ fontFamily: 'Montserrat', fontWeight: 600 }}>
                        STATUS
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedBookings.map((booking) => (
                      <tr key={booking.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/job/${booking.jobId}`)}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 500 }}>
                            {booking.customerName}
                          </div>
                          <div className="text-sm text-gray-500" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
                            {booking.customerCity}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
                            {booking.serviceName}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
                            {formatFrequency(booking.frequency, booking.scheduledDate || booking.nextJobDate)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
                            {formatNextJob(booking)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
                            {formatDate(booking.createdDate)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            booking.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`} style={{ fontFamily: 'Montserrat', fontWeight: 500 }}>
                            {booking.status === 'active' ? 'Active' : 'Canceled'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                  <div className="text-sm text-gray-700" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
                    Showing {startIndex + 1} to {Math.min(endIndex, recurringBookings.length)} of {recurringBookings.length} results
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm text-gray-700 px-2" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
          </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default ServiceFlowRecurring

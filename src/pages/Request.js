"use client"

import { useState, useEffect, useMemo } from "react"
import Sidebar from "../components/sidebar"
import RequestsSidebar from "../components/requests-sidebar"
import EmptyState from "../components/empty-state"
import { ChevronDown, Filter, AlertTriangle, CheckCircle, Clock, RefreshCw, User } from "lucide-react"
import { useAuth } from "../context/AuthContext"
import { requestsAPI } from "../services/api"
import { useNavigate } from "react-router-dom"

const ServiceFlowRequests = () => {
  const { user } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeFilter, setActiveFilter] = useState("all")
  const [requestsSidebarOpen, setRequestsSidebarOpen] = useState(false)
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [message, setMessage] = useState({ type: '', text: '' })
  const navigate = useNavigate()

  // Get current user with useMemo to prevent infinite re-renders
  const currentUser = useMemo(() => user, [user])

  useEffect(() => {
    if (currentUser?.id) {
      loadRequests()
    } else if (!currentUser) {
      console.log('❌ No authenticated user, redirecting to signin')
      navigate('/signin')
    }
  }, [currentUser, activeFilter, navigate]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadRequests = async () => {
    if (!currentUser?.id) return
    
    try {
      setLoading(true)
      setError("")
      
      console.log('🔄 Loading requests for user:', currentUser.id)
      const response = await requestsAPI.getAll(currentUser.id, {
        filter: activeFilter,
        page: 1,
        limit: 50
      })
      
      console.log('✅ Requests loaded:', response)
      setRequests(response.requests || response || [])
    } catch (error) {
      console.error('❌ Error loading requests:', error)
      if (error.response?.status === 403) {
        setError("Authentication required. Please log in again.")
        navigate('/signin')
      } else {
        setError("Failed to load requests. Please try again.")
      }
      setRequests([])
    } finally {
      setLoading(false)
    }
  }

  const handleApproveRequest = async (requestId) => {
    try {
      setLoading(true)
      await requestsAPI.approve(requestId)
      setMessage({ type: 'success', text: 'Request approved successfully!' })
      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
      loadRequests() // Reload the requests
    } catch (error) {
      console.error('Error approving request:', error)
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to approve request' })
    } finally {
      setLoading(false)
    }
  }

  const handleRejectRequest = async (requestId) => {
    try {
      setLoading(true)
      const reason = prompt('Please provide a reason for rejection:')
      if (reason) {
        await requestsAPI.reject(requestId, reason)
        setMessage({ type: 'success', text: 'Request rejected successfully!' })
        setTimeout(() => setMessage({ type: '', text: '' }), 3000)
        loadRequests() // Reload the requests
      }
    } catch (error) {
      console.error('Error rejecting request:', error)
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to reject request' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Main Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64 xl:ml-72">
        {/* Mobile Header */}

        {/* Desktop Header */}
        <div className="hidden lg:flex bg-white border-b border-gray-200 px-6 py-5 items-center justify-between shadow-sm">
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <h1 className="text-2xl font-display font-semibold text-gray-900">Requests</h1>
              <div className="flex items-center space-x-1">
                <button className="px-4 py-2 text-sm font-medium text-gray-900 bg-white border-b-2 border-primary-600 hover:text-primary-700 transition-colors">
                  All
                </button>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button 
                onClick={loadRequests}
                disabled={loading}
                className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all duration-200 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span>{loading ? 'Loading...' : 'Refresh'}</span>
              </button>
              <button className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all duration-200">
                <span>Open</span>
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Header Content */}
        <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-display font-semibold text-gray-900">Requests</h1>
            <button
              onClick={() => setRequestsSidebarOpen(!requestsSidebarOpen)}
              className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all duration-200"
            >
              <Filter className="w-4 h-4" />
              <span>Filter</span>
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center space-x-1 mt-3">
            <button className="px-4 py-2 text-sm font-medium text-gray-900 bg-white border-b-2 border-primary-600 hover:text-primary-700 transition-colors">
              All
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Requests Sidebar - Desktop */}
          <div className="hidden lg:block w-64 border-r border-gray-200 bg-white">
            <RequestsSidebar activeFilter={activeFilter} onFilterChange={setActiveFilter} />
          </div>

          {/* Requests Sidebar - Mobile Overlay */}
          {requestsSidebarOpen && (
            <>
              <div
                className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-40 lg:hidden"
                onClick={() => setRequestsSidebarOpen(false)}
              />
              <div className="fixed inset-y-0 left-0 z-50 w-64 lg:hidden">
                <div className="h-full bg-white shadow-xl">
                  <RequestsSidebar activeFilter={activeFilter} onFilterChange={setActiveFilter} />
                </div>
              </div>
            </>
          )}

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col bg-white">
            {/* Mobile Filter Dropdown */}
            {requestsSidebarOpen && (
              <div className="lg:hidden bg-gray-50 border-b border-gray-200 p-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">REQUEST TYPE</h3>
                <div className="space-y-1">
                  {["all", "booking", "quote"].map((type) => (
                    <button
                      key={type}
                      onClick={() => {
                        setActiveFilter(type)
                        setRequestsSidebarOpen(false)
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeFilter === type 
                          ? "bg-primary-50 text-primary-700" 
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      {type === "all" && "All"}
                      {type === "booking" && "Booking Requests"}
                      {type === "quote" && "Quote Requests"}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Message Display */}
            {message.text && (
              <div className={`px-6 py-3 ${message.type === 'success' ? 'bg-green-50 border-l-4 border-green-400' : 'bg-red-50 border-l-4 border-red-400'}`}>
                <div className="flex items-center">
                  {message.type === 'success' ? (
                    <CheckCircle className="w-5 h-5 text-green-400 mr-2" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-red-400 mr-2" />
                  )}
                  <span className={`text-sm ${message.type === 'success' ? 'text-green-700' : 'text-red-700'}`}>
                    {message.text}
                  </span>
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 m-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <AlertTriangle className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="ml-3 flex-1">
                    <h3 className="text-sm font-medium text-red-800">{error}</h3>
                    <p className="mt-1 text-sm text-red-700">
                      Please check your connection and try refreshing the page.
                    </p>
                  </div>
                  <div className="ml-3">
                    <button
                      onClick={loadRequests}
                      disabled={loading}
                      className="bg-red-100 text-red-800 px-3 py-1 rounded text-sm font-medium hover:bg-red-200 disabled:opacity-50"
                    >
                      {loading ? 'Loading...' : 'Retry'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Content */}
            <div className="flex-1 p-6">
              <div className="max-w-4xl mx-auto">
                {!currentUser ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                      <p className="mt-4 text-gray-600">Checking authentication...</p>
                    </div>
                  </div>
                ) : loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                      <p className="mt-4 text-gray-600">Loading requests...</p>
                    </div>
                  </div>
                ) : requests.length > 0 ? (
                  <div className="space-y-4">
                    {requests.map((request) => (
                      <div key={request.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900">
                                {request.type === 'booking' ? 'Booking Request' : 'Quote Request'}
                              </h3>
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                request.status === 'approved' ? 'bg-green-100 text-green-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {request.status}
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                              <div className="flex items-center space-x-2">
                                <User className="w-4 h-4" />
                                <span>{request.customer_name || `${request.customer_first_name} ${request.customer_last_name}`}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Clock className="w-4 h-4" />
                                <span>{new Date(request.created_at).toLocaleDateString()}</span>
                              </div>
                              {request.service_name && (
                                <div className="flex items-center space-x-2">
                                  <span className="font-medium">Service:</span>
                                  <span>{request.service_name}</span>
                                </div>
                              )}
                              {request.estimated_duration && (
                                <div className="flex items-center space-x-2">
                                  <span className="font-medium">Duration:</span>
                                  <span>{request.estimated_duration}</span>
                                </div>
                              )}
                              {request.estimated_price && (
                                <div className="flex items-center space-x-2">
                                  <span className="font-medium">Price:</span>
                                  <span>${request.estimated_price}</span>
                                </div>
                              )}
                            </div>
                            
                            {request.notes && (
                              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                                <p className="text-sm text-gray-700">{request.notes}</p>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-2 ml-4">
                            {request.status === 'pending' && (
                              <>
                                <button 
                                  onClick={() => handleApproveRequest(request.id)}
                                  disabled={loading}
                                  className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
                                >
                                  Approve
                                </button>
                                <button 
                                  onClick={() => handleRejectRequest(request.id)}
                                  disabled={loading}
                                  className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ServiceFlowRequests

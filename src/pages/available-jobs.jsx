"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { jobsAPI } from "../services/api"
import { useAuth } from "../context/AuthContext"
import { MapPin, Clock, DollarSign, Calendar, CheckCircle, XCircle, AlertCircle, Loader2, RefreshCw, ClipboardList } from "lucide-react"
import { formatDateLocal } from "../utils/dateUtils"
import WorkerBottomNav from "../components/worker-bottom-nav"
import { isWorker } from "../utils/roleUtils"

const AvailableJobs = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [claimingJobId, setClaimingJobId] = useState(null)
  const [successMessage, setSuccessMessage] = useState("")
  const [lastSynced, setLastSynced] = useState(null)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (user && isWorker(user)) {
      fetchAvailableJobs()
    }
  }, [user])

  const fetchAvailableJobs = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setError("")
      const response = await jobsAPI.getAvailableForWorkers()
      setJobs(response.jobs || [])
      setLastSynced(new Date())
    } catch (err) {
      console.error("Error fetching available jobs:", err)
      setError(err.response?.data?.error || "Failed to load available jobs")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const getTimeAgo = (date) => {
    if (!date) return "Never"
    const seconds = Math.floor((new Date() - date) / 1000)
    if (seconds < 60) return "Just now"
    if (seconds < 120) return "A minute ago"
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`
    if (seconds < 7200) return "An hour ago"
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`
    return `${Math.floor(seconds / 86400)} days ago`
  }

  const getUserInitials = () => {
    if (!user) return "U"
    const firstName = user.firstName || user.first_name || ""
    const lastName = user.lastName || user.last_name || ""
    if (firstName && lastName) {
      return (firstName[0] + lastName[0]).toUpperCase()
    }
    if (user.email) {
      return user.email[0].toUpperCase()
    }
    return "U"
  }

  const handleClaimJob = async (jobId) => {
    try {
      setClaimingJobId(jobId)
      setError("")
      setSuccessMessage("")
      
      const response = await jobsAPI.claim(jobId)
      
      setSuccessMessage(response.message || "Job claimed successfully!")
      setTimeout(() => setSuccessMessage(""), 5000)
      
      // Refresh the list
      await fetchAvailableJobs()
      
      // Optionally navigate to the job details
      // navigate(`/job/${jobId}`)
    } catch (err) {
      console.error("Error claiming job:", err)
      setError(err.response?.data?.error || "Failed to claim job")
      setTimeout(() => setError(""), 5000)
    } finally {
      setClaimingJobId(null)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return "N/A"
    try {
      return formatDateLocal(dateString)
    } catch (e) {
      return dateString
    }
  }

  const formatTimeFromDate = (dateString) => {
    if (!dateString) return "N/A"
    try {
      const date = new Date(dateString)
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      })
    } catch (e) {
      return "N/A"
    }
  }

  if (!user || !isWorker(user)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">You must be a worker to view available jobs.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white pb-20 lg:pb-0">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-semibold text-sm">
              {getUserInitials()}
            </span>
          </div>
          
          {/* Title - Centered */}
          <div className="flex-1 text-center">
            <h1 className="text-lg font-semibold text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 700 }}>
              Job Offers
            </h1>
            {lastSynced && (
              <p className="text-xs text-gray-500 mt-0.5" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
                Synced {getTimeAgo(lastSynced)}
              </p>
            )}
          </div>
          
          {/* Refresh Button */}
          <button
            onClick={() => fetchAvailableJobs(true)}
            disabled={refreshing || loading}
            className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 flex-shrink-0"
            title="Refresh"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="mx-4 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
          <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-800" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="mx-4 mt-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-2">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          <p className="text-sm text-green-800" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>{successMessage}</p>
        </div>
      )}

      {/* Content */}
      <div className="p-4 lg:px-6 lg:py-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <ClipboardList className="w-20 h-20 text-gray-300 mb-6" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2" style={{ fontFamily: 'Montserrat', fontWeight: 600 }}>
              No jobs available
            </h3>
            <p className="text-sm text-gray-500 text-center max-w-sm" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
              Check back later to see if there are new jobs you can claim.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-4 lg:p-6"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1" style={{ fontFamily: 'Montserrat', fontWeight: 600 }}>
                      {job.service_name || job.services?.name || "Service"}
                    </h3>
                    {job.customers && (
                      <p className="text-sm text-gray-600" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
                        {job.customers.first_name} {job.customers.last_name}
                      </p>
                    )}
                  </div>
                  {job.total && (
                    <div className="text-right">
                      <p className="text-lg font-semibold text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 600 }}>
                        ${parseFloat(job.total || job.price || 0).toFixed(2)}
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
                      {formatDate(job.scheduled_date)} at {formatTimeFromDate(job.scheduled_date)}
                    </span>
                  </div>

                  {job.service_address_street && (
                    <div className="flex items-start text-sm text-gray-600">
                      <MapPin className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                      <span style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
                        {job.service_address_street}
                        {job.service_address_city && `, ${job.service_address_city}`}
                        {job.service_address_state && `, ${job.service_address_state}`}
                      </span>
                    </div>
                  )}

                  {job.duration && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="w-4 h-4 mr-2 flex-shrink-0" />
                      <span style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
                        {Math.floor(job.duration / 60)}h {job.duration % 60}m
                      </span>
                    </div>
                  )}

                  {job.notes && (
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <p className="text-sm text-gray-600" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
                        {job.notes}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-3 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => navigate(`/job/${job.id}`)}
                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    style={{ fontFamily: 'Montserrat', fontWeight: 500 }}
                  >
                    View Details
                  </button>
                  <button
                    onClick={() => handleClaimJob(job.id)}
                    disabled={claimingJobId === job.id}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                    style={{ fontFamily: 'Montserrat', fontWeight: 500 }}
                  >
                    {claimingJobId === job.id ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Claiming...
                      </>
                    ) : (
                      "Claim Job"
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Worker Bottom Nav */}
      {isWorker(user) && <WorkerBottomNav />}
    </div>
  )
}

export default AvailableJobs


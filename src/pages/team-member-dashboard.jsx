"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Phone, 
  Mail, 
  CheckCircle, 
  AlertCircle, 
  Play, 
  Pause,
  LogOut,
  Bell,
  Settings,
  ChevronLeft,
  ChevronRight
} from "lucide-react"
import { useTeamMemberAuth } from "../context/TeamMemberAuthContext"

const TeamMemberDashboard = () => {
  const navigate = useNavigate()
  const { teamMember, logout, getDashboardData, updateJobStatus, loading } = useTeamMemberAuth()
  const [dashboardData, setDashboardData] = useState(null)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [activeTab, setActiveTab] = useState('today')
  const [selectedJob, setSelectedJob] = useState(null)

  useEffect(() => {
    if (teamMember) {
      loadDashboardData()
    }
  }, [teamMember, selectedDate])

  const loadDashboardData = async () => {
    const startDate = selectedDate.toISOString().split('T')[0]
    const endDate = new Date(selectedDate.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    
    const result = await getDashboardData(startDate, endDate)
    if (result.success) {
      setDashboardData(result.data)
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/team-member/login')
  }

  // Redirect to field app on mount
  useEffect(() => {
    if (teamMember) {
      navigate('/team-member/field-app')
    }
  }, [teamMember, navigate])

  const handleJobStatusUpdate = async (jobId, newStatus) => {
    const result = await updateJobStatus(jobId, newStatus)
    if (result.success) {
      loadDashboardData() // Refresh data
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Date placeholder'
    // Extract date part directly from the string (format: "2024-01-15 10:00:00")
    const datePart = dateString.split(' ')[0]
    if (!datePart) return 'Date placeholder'
    
    const [year, month, day] = datePart.split('-')
    if (!year || !month || !day) return 'Date placeholder'
    
    const date = new Date(year, month - 1, day) // month is 0-indexed
    if (isNaN(date.getTime())) return 'Date placeholder'
    
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatTime = (dateString) => {
    if (!dateString) return 'Time placeholder'
    // Extract time part directly from the string (format: "2024-01-15 10:00:00")
    const timePart = dateString.split(' ')[1]
    if (!timePart) return 'Time placeholder'
    
    const [hours, minutes] = timePart.split(':')
    const hour = parseInt(hours, 10)
    const minute = parseInt(minutes, 10)
    
    if (isNaN(hour) || isNaN(minute)) return 'Time placeholder'
    
    // Convert to 12-hour format
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    const displayMinute = minute.toString().padStart(2, '0')
    
    return `${displayHour}:${displayMinute} ${ampm}`
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'in_progress': return 'bg-blue-100 text-blue-800'
      case 'confirmed': return 'bg-yellow-100 text-yellow-800'
      case 'pending': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />
      case 'in_progress': return <Play className="w-4 h-4" />
      case 'confirmed': return <AlertCircle className="w-4 h-4" />
      case 'pending': return <Clock className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
    }
  }

  if (!teamMember) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  const todayJobs = dashboardData?.jobs?.filter(job => {
    if (!job.scheduled_date) return false
    const today = new Date().toISOString().split('T')[0]
    return job.scheduled_date.split(' ')[0] === today
  }) || []

  const upcomingJobs = dashboardData?.jobs?.filter(job => {
    if (!job.scheduled_date) return false
    const today = new Date().toISOString().split('T')[0]
    return job.scheduled_date.split(' ')[0] > today
  }) || []

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold">
                  {teamMember.first_name.charAt(0)}{teamMember.last_name.charAt(0)}
                </span>
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  {teamMember.first_name} {teamMember.last_name}
                </h1>
                <p className="text-sm text-gray-600">{teamMember.role}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button className="p-2 text-gray-400 hover:text-gray-600">
                <Bell className="w-5 h-5" />
              </button>
              <button className="p-2 text-gray-400 hover:text-gray-600">
                <Settings className="w-5 h-5" />
              </button>
              <button 
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="p-4">
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Today's Jobs</p>
                <p className="text-2xl font-bold text-gray-900">{dashboardData?.stats?.todayJobs || 0}</p>
              </div>
              <Calendar className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-gray-900">{dashboardData?.stats?.completedJobs || 0}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 mb-4">
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('today')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium ${
              activeTab === 'today' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium ${
              activeTab === 'upcoming' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Upcoming
          </button>
        </div>
      </div>

      {/* Jobs List */}
      <div className="px-4 pb-6">
        {activeTab === 'today' && (
          <div className="space-y-4">
            {todayJobs.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No jobs scheduled for today</p>
              </div>
            ) : (
              todayJobs.map((job) => (
                <div key={job.id} className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{job.service_name}</h3>
                      <p className="text-sm text-gray-600">
                        {formatTime(job.scheduled_date)} • {job.duration || 60} min
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                      {job.status.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Customer Info */}
                  <div className="mb-3">
                    <div className="flex items-center space-x-2 mb-1">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900">
                        {job.customer_first_name} {job.customer_last_name}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 mb-1">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">{job.customer_address}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">{job.customer_phone}</span>
                    </div>
                  </div>

                  {/* Job Actions */}
                  {job.status === 'pending' && (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleJobStatusUpdate(job.id, 'confirmed')}
                        className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-blue-700"
                      >
                        Accept Job
                      </button>
                    </div>
                  )}
                  {job.status === 'confirmed' && (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleJobStatusUpdate(job.id, 'in_progress')}
                        className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-green-700"
                      >
                        Start Job
                      </button>
                    </div>
                  )}
                  {job.status === 'in_progress' && (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleJobStatusUpdate(job.id, 'completed')}
                        className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-green-700"
                      >
                        Complete Job
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'upcoming' && (
          <div className="space-y-4">
            {upcomingJobs.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No upcoming jobs</p>
              </div>
            ) : (
              upcomingJobs.map((job) => (
                <div key={job.id} className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{job.service_name}</h3>
                      <p className="text-sm text-gray-600">
                        {formatDate(job.scheduled_date)} at {formatTime(job.scheduled_date)}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                      {job.status.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Customer Info */}
                  <div className="mb-3">
                    <div className="flex items-center space-x-2 mb-1">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900">
                        {job.customer_first_name} {job.customer_last_name}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">{job.customer_address}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default TeamMemberDashboard 
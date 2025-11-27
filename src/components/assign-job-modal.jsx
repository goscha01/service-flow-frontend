import React, { useState, useEffect, useMemo } from 'react'
import { X, Check, MapPin, Clock, User, Search, ChevronDown, Play } from 'lucide-react'
import { teamAPI, jobsAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { getImageUrl } from '../utils/imageUtils'
import { normalizeAPIResponse } from '../utils/dataHandler'

const AssignJobModal = ({ job, isOpen, onClose, onAssign }) => {
  const { user } = useAuth()
  const [teamMembers, setTeamMembers] = useState([])
  const [selectedMemberId, setSelectedMemberId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSkill, setSelectedSkill] = useState('none')
  const [showDriveTime, setShowDriveTime] = useState(true)
  const [loading, setLoading] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [memberAvailability, setMemberAvailability] = useState({})
  const [driveTimes, setDriveTimes] = useState({})

  // Fetch team members when modal opens
  useEffect(() => {
    if (isOpen && job) {
      fetchTeamMembers()
      setSelectedMemberId(null)
      setSearchQuery('')
      setSelectedSkill('none')
    } else {
      // Reset state when modal closes
      setSelectedMemberId(null)
      setSearchQuery('')
      setSelectedSkill('none')
      setAssigning(false)
    }
  }, [isOpen, job])

  // Fetch availability for all members when modal opens
  useEffect(() => {
    if (isOpen && job && teamMembers.length > 0) {
      fetchMemberAvailability()
      if (showDriveTime) {
        calculateDriveTimes()
      }
    }
  }, [isOpen, job, teamMembers, showDriveTime])

  const fetchTeamMembers = async () => {
    try {
      setLoading(true)
      const response = await teamAPI.getAll(user.id, {
        status: 'active',
        page: 1,
        limit: 100
      })
      
      // Filter to only service providers (workers, schedulers, managers)
      const providers = (response.teamMembers || response || []).filter(member => 
        member.is_service_provider && 
        member.status === 'active' &&
        (member.role === 'worker' || member.role === 'scheduler' || member.role === 'manager')
      )
      
      setTeamMembers(providers)
    } catch (error) {
      console.error('Error fetching team members:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMemberAvailability = async () => {
    if (!job?.scheduled_date) return

    const jobDate = new Date(job.scheduled_date)
    const dateStr = jobDate.toISOString().split('T')[0]
    
    const availabilityPromises = teamMembers.map(async (member) => {
      try {
        // Get member's jobs for the day to check availability
        const jobsResponse = await jobsAPI.getAll(
          user.id,
          '', // status
          '', // search
          1, // page
          100, // limit
          null, // dateFilter
          dateStr, // dateRange
          null, // sortBy
          null, // sortOrder
          member.id, // teamMember
          null, // invoiceStatus
          null, // customerId
          null, // territoryId
          null // signal
        )
        
        const memberJobs = normalizeAPIResponse(jobsResponse, 'jobs') || []
        const jobStart = new Date(job.scheduled_date)
        const jobEnd = new Date(jobStart.getTime() + (job.service_duration || 0) * 60000)
        
        // Check if member has conflicting jobs
        const hasConflict = memberJobs.some(existingJob => {
          if (!existingJob.scheduled_date) return false
          const existingStart = new Date(existingJob.scheduled_date)
          const existingEnd = new Date(existingStart.getTime() + (existingJob.service_duration || 0) * 60000)
          
          return (jobStart < existingEnd && jobEnd > existingStart)
        })
        
        // Default availability (9 AM - 6 PM) - you can enhance this with actual availability data
        return {
          available: !hasConflict,
          availableFrom: '9:00 AM',
          availableTo: '6:00 PM',
          hasConflict
        }
      } catch (error) {
        console.error(`Error fetching availability for member ${member.id}:`, error)
        return {
          available: true,
          availableFrom: '9:00 AM',
          availableTo: '6:00 PM',
          hasConflict: false
        }
      }
    })

    const availabilityResults = await Promise.all(availabilityPromises)
    const availabilityMap = {}
    teamMembers.forEach((member, index) => {
      availabilityMap[member.id] = availabilityResults[index]
    })
    setMemberAvailability(availabilityMap)
  }

  const calculateDriveTimes = async () => {
    if (!job?.customer_address) {
      setDriveTimes({})
      return
    }

    // For now, we'll simulate drive times
    // In a real implementation, you'd use Google Maps API or similar
    const driveTimeMap = {}
    teamMembers.forEach((member, index) => {
      // Simulate drive time (40+ min, 20 min, etc.)
      const times = ['40+ min', '25 min', '15 min', '5 min']
      driveTimeMap[member.id] = times[index % times.length]
    })
    setDriveTimes(driveTimeMap)
  }

  // Filter and search team members
  const filteredMembers = useMemo(() => {
    let filtered = teamMembers

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(member => {
        const fullName = `${member.first_name || ''} ${member.last_name || ''}`.toLowerCase()
        const email = (member.email || '').toLowerCase()
        return fullName.includes(query) || email.includes(query)
      })
    }

    // Skills filter (placeholder - you can enhance this with actual skills data)
    if (selectedSkill !== 'none') {
      // For now, we'll just return all if skill is selected
      // You can add actual skill filtering logic here
    }

    // Filter to only available members
    filtered = filtered.filter(member => {
      const availability = memberAvailability[member.id]
      return availability?.available !== false
    })

    return filtered
  }, [teamMembers, searchQuery, selectedSkill, memberAvailability])

  const handleAssign = async () => {
    if (!selectedMemberId) return

    try {
      setAssigning(true)
      // Call the parent's assign handler with the team member ID
      if (onAssign) {
        await onAssign(selectedMemberId)
      }
      onClose()
    } catch (error) {
      console.error('Error assigning job:', error)
      setAssigning(false)
    }
  }

  const getInitials = (member) => {
    const firstName = member.first_name || ''
    const lastName = member.last_name || ''
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || 'AA'
  }

  const formatDate = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatTime = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const startTime = date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    })
    
    if (job?.service_duration) {
      const endDate = new Date(date.getTime() + job.service_duration * 60000)
      const endTime = endDate.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      })
      return `${startTime} - ${endTime}`
    }
    
    return startTime
  }

  const formatDuration = (duration) => {
    if (!duration) return 'N/A'
    const hours = Math.floor(duration / 60)
    const minutes = duration % 60
    if (hours > 0 && minutes > 0) {
      return `${hours} hr ${minutes} min`
    } else if (hours > 0) {
      return `${hours} hr`
    } else {
      return `${minutes} min`
    }
  }

  // Get currently assigned members count
  // Check if job has assigned_team_member_id or team_member_id
  const assignedMemberId = job?.assigned_team_member_id || job?.team_member_id
  const assignedCount = assignedMemberId ? 1 : 0
  const workersNeeded = job?.workers_needed || 1

  if (!isOpen || !job) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-full transition-colors -ml-2"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
          <h2 className="text-lg font-semibold text-gray-900">Assign Job</h2>
          <button
            onClick={handleAssign}
            disabled={!selectedMemberId || assigning}
            className={`px-5 py-2 text-sm font-medium rounded-lg transition-all ${
              selectedMemberId && !assigning
                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {assigning ? 'Assigning...' : 'Assign'}
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Job Details Section */}
          <div className="mb-6 pb-6 border-b border-gray-200">
            <div className="text-sm text-gray-600 mb-1">{formatDate(job.scheduled_date)}</div>
            <div className="text-base font-semibold text-gray-900 mb-3">{formatTime(job.scheduled_date)}</div>
            
            {/* Assignment Status */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm text-gray-600">
                {assignedCount}/{workersNeeded} assigned
              </span>
              {assignedMemberId && (
                <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-semibold">
                  {(() => {
                    const assignedMember = teamMembers.find(m => m.id === assignedMemberId)
                    return assignedMember ? getInitials(assignedMember) : 'EC'
                  })()}
                </div>
              )}
            </div>

            {/* Assigned Member Name */}
            {assignedMemberId && (
              <div className="text-sm font-medium text-gray-900 mb-4">
                {(() => {
                  const assignedMember = teamMembers.find(m => m.id === assignedMemberId)
                  return assignedMember 
                    ? `${assignedMember.first_name} ${assignedMember.last_name}`
                    : 'Assigned'
                })()}
              </div>
            )}

            {/* Job Type */}
            <div className="text-sm font-medium text-gray-900 mb-2">
              {job.service_name || job.service_type || 'Service'}
            </div>

            {/* Duration */}
            <div className="text-sm text-gray-600 mb-3">
              {formatDuration(job.service_duration)}
            </div>

            {/* Location */}
            <div className="text-sm text-gray-700 mb-4 leading-relaxed">
              {job.customer_address || job.address || 'Address not provided'}
            </div>

            {/* Drive Time Toggle */}
            <div className="flex items-center gap-2.5">
              <input
                type="checkbox"
                id="driveTimeToggle"
                checked={showDriveTime}
                onChange={(e) => setShowDriveTime(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
              />
              <label htmlFor="driveTimeToggle" className="text-sm text-gray-700 cursor-pointer select-none">
                Show approximate drive time
              </label>
            </div>
          </div>

          {/* Search and Filter Section */}
          <div className="mb-5 space-y-3">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search providers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Skills Dropdown */}
            <div className="relative">
              <select
                value={selectedSkill}
                onChange={(e) => setSelectedSkill(e.target.value)}
                className="w-full pl-4 pr-10 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white cursor-pointer transition-all"
              >
                <option value="none">Skills</option>
                <option value="painting">Painting</option>
                <option value="plumbing">Plumbing</option>
                <option value="electrical">Electrical</option>
                <option value="carpentry">Carpentry</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Available Providers Section */}
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
              Available {filteredMembers.length}
            </div>

            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading providers...</div>
            ) : filteredMembers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No available providers found</div>
            ) : (
              <div className="space-y-3">
                {filteredMembers.map((member) => {
                  const isSelected = selectedMemberId === member.id
                  const availability = memberAvailability[member.id] || {}
                  const driveTime = driveTimes[member.id]

                  return (
                    <div
                      key={member.id}
                      onClick={() => setSelectedMemberId(member.id)}
                      className={`border rounded-lg p-4 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50 shadow-sm'
                          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Selection Indicator */}
                        <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                          isSelected
                            ? 'border-blue-600 bg-blue-600'
                            : 'border-gray-300 bg-white'
                        }`}>
                          {isSelected && (
                            <Check className="w-3 h-3 text-white" strokeWidth={3} />
                          )}
                        </div>

                        {/* Avatar */}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 shadow-sm ${
                          isSelected ? 'bg-blue-600' : 'bg-gray-400'
                        }`}>
                          {member.profile_picture ? (
                            <img
                              src={getImageUrl(member.profile_picture)}
                              alt={`${member.first_name} ${member.last_name}`}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            getInitials(member)
                          )}
                        </div>

                        {/* Member Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <h3 className="text-sm font-medium text-gray-900">
                              {member.first_name} {member.last_name}
                            </h3>
                            <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"></div>
                          </div>
                          
                          {availability.availableFrom && availability.availableTo && (
                            <div className="text-xs text-gray-600 mb-1.5">
                              Available from {availability.availableFrom} to {availability.availableTo}
                            </div>
                          )}

                          {showDriveTime && driveTime && (
                            <div className="text-xs text-gray-500 mb-2">
                              {driveTime} away
                            </div>
                          )}

                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              // Navigate to member schedule - you can implement this
                              console.log('View schedule for', member.id)
                            }}
                            className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 mt-1 transition-colors"
                          >
                            <Play className="w-3 h-3" />
                            View Schedule
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AssignJobModal


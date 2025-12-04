import React, { useState, useEffect, useMemo } from 'react'
import { X, Check, MapPin, Clock, User, Wrench, Search, ChevronDown, ChevronUp } from 'lucide-react'
import { teamAPI, jobsAPI, availabilityAPI } from '../services/api'
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
  const [expandedSchedules, setExpandedSchedules] = useState({})
  const [allSkills, setAllSkills] = useState([])

  // Fetch team members when modal opens
  useEffect(() => {
    if (isOpen && job) {
      fetchTeamMembers()
      setSelectedMemberId(null)
      setSearchQuery('')
      setSelectedSkill('none')
      setExpandedSchedules({})
    } else {
      setSelectedMemberId(null)
      setSearchQuery('')
      setSelectedSkill('none')
      setAssigning(false)
      setExpandedSchedules({})
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
      
      // Filter to only service providers (workers, schedulers, managers, account owner)
      const providers = (response.teamMembers || response || []).filter(member => 
        (member.is_service_provider || member.role === 'owner' || member.role === 'account owner') && 
        member.status === 'active'
      )
      
      setTeamMembers(providers)
      
      // Extract unique skills from all members
      const skillsSet = new Set()
      providers.forEach(member => {
        if (member.skills) {
          let skills = member.skills
          if (typeof skills === 'string') {
            try {
              skills = JSON.parse(skills)
            } catch (e) {
              skills = skills.split(',').map(s => s.trim())
            }
          }
          if (Array.isArray(skills)) {
            skills.forEach(skill => {
              if (skill && typeof skill === 'string') {
                skillsSet.add(skill.trim())
              } else if (skill && typeof skill === 'object' && skill.name) {
                skillsSet.add(skill.name.trim())
              }
            })
          }
        }
      })
      setAllSkills(Array.from(skillsSet).sort())
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
    const dayOfWeek = jobDate.getDay() // 0 = Sunday, 6 = Saturday
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const dayName = dayNames[dayOfWeek]
    
    const availabilityPromises = teamMembers.map(async (member) => {
      try {
        // Parse member's availability
        let workingHours = null
        let customAvailability = []
        
        if (member.availability) {
          let availData = member.availability
          if (typeof availData === 'string') {
            try {
              availData = JSON.parse(availData)
            } catch (e) {
              console.error('Error parsing availability:', e)
            }
          }
          
          if (availData && typeof availData === 'object') {
            workingHours = availData.workingHours || availData
            customAvailability = availData.customAvailability || []
          }
        }
        
        // Check for date-specific availability override
        const dateOverride = customAvailability.find(item => item.date === dateStr)
        let dayAvailability = null
        
        if (dateOverride) {
          // Use date-specific override
          if (dateOverride.available === false) {
            // Day is unavailable
            dayAvailability = { enabled: false }
          } else if (dateOverride.hours && Array.isArray(dateOverride.hours) && dateOverride.hours.length > 0) {
            // Use custom hours for this date
            dayAvailability = {
              enabled: true,
              timeSlots: dateOverride.hours
            }
          }
        }
        
        // If no date override, use working hours for the day
        if (!dayAvailability && workingHours) {
          const dayHours = workingHours[dayName] || workingHours[dayOfWeek]
          if (dayHours) {
            if (dayHours.enabled === false) {
              dayAvailability = { enabled: false }
            } else if (dayHours.timeSlots && Array.isArray(dayHours.timeSlots) && dayHours.timeSlots.length > 0) {
              dayAvailability = {
                enabled: true,
                timeSlots: dayHours.timeSlots.filter(slot => slot.enabled !== false)
              }
            } else if (dayHours.start && dayHours.end) {
              dayAvailability = {
                enabled: true,
                timeSlots: [{ start: dayHours.start, end: dayHours.end, enabled: true }]
              }
            }
          }
        }
        
        // Default availability if nothing found
        if (!dayAvailability || !dayAvailability.enabled) {
          dayAvailability = {
            enabled: true,
            timeSlots: [{ start: '09:00', end: '18:00', enabled: true }]
          }
        }
        
        // Get member's jobs for the day
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
        const jobDuration = job.service_duration || job.duration || 360 // default 6 hours in minutes
        const jobEnd = new Date(jobStart.getTime() + jobDuration * 60000)
        
        // Extract job time in minutes for easier comparison
        const jobStartMinutes = timeToMinutes(formatTimeFromDate(jobStart))
        const jobEndMinutes = timeToMinutes(formatTimeFromDate(jobEnd))
        
        // Check if member has conflicting jobs (only jobs assigned to THIS member)
        // IMPORTANT: Only check conflicts for jobs assigned to this specific member
        // Jobs assigned to other members should NOT block this member's availability
        const conflictingJobs = memberJobs.filter(existingJob => {
          if (!existingJob.scheduled_date || existingJob.id === job.id) return false
          
          // Only consider jobs that are actually assigned to this member
          const isAssignedToMember = 
            existingJob.team_member_id === member.id ||
            existingJob.assigned_team_member_id === member.id ||
            (existingJob.team_assignments && Array.isArray(existingJob.team_assignments) &&
             existingJob.team_assignments.some(ta => ta.team_member_id === member.id))
          
          if (!isAssignedToMember) return false // Skip jobs assigned to other members
          
          const existingStart = new Date(existingJob.scheduled_date)
          const existingDuration = existingJob.service_duration || existingJob.duration || 360
          const existingEnd = new Date(existingStart.getTime() + existingDuration * 60000)
          
          return (jobStart < existingEnd && jobEnd > existingStart)
        })
        
        const hasConflict = conflictingJobs.length > 0
        
        // Calculate free time slots by subtracting jobs from available hours
        const freeTimeSlots = []
        
        if (dayAvailability.enabled && dayAvailability.timeSlots && dayAvailability.timeSlots.length > 0) {
          dayAvailability.timeSlots.forEach(slot => {
            let slotStart = timeToMinutes(slot.start || slot.startTime)
            let slotEnd = timeToMinutes(slot.end || slot.endTime)
            
            // Get all jobs that overlap with this time slot
            const overlappingJobs = conflictingJobs.filter(existingJob => {
              if (!existingJob.scheduled_date) return false
              const existingStart = new Date(existingJob.scheduled_date)
              const existingDuration = existingJob.service_duration || existingJob.duration || 360
              const existingEnd = new Date(existingStart.getTime() + existingDuration * 60000)
              
              const jobStartMinutes = timeToMinutes(formatTimeFromDate(existingStart))
              const jobEndMinutes = timeToMinutes(formatTimeFromDate(existingEnd))
              
              return (jobStartMinutes < slotEnd && jobEndMinutes > slotStart)
            })
            
            // Sort overlapping jobs by start time
            overlappingJobs.sort((a, b) => {
              const aStart = new Date(a.scheduled_date)
              const bStart = new Date(b.scheduled_date)
              return aStart - bStart
            })
            
            // Calculate free time segments
            let currentStart = slotStart
            
            overlappingJobs.forEach(existingJob => {
              const existingStart = new Date(existingJob.scheduled_date)
              const existingDuration = existingJob.service_duration || existingJob.duration || 360
              const existingEnd = new Date(existingStart.getTime() + existingDuration * 60000)
              
              const jobStartMinutes = timeToMinutes(formatTimeFromDate(existingStart))
              const jobEndMinutes = timeToMinutes(formatTimeFromDate(existingEnd))
              
              // If there's free time before this job, add it
              if (jobStartMinutes > currentStart) {
                freeTimeSlots.push({
                  start: minutesToTime(currentStart),
                  end: minutesToTime(jobStartMinutes),
                  startMinutes: currentStart,
                  endMinutes: jobStartMinutes
                })
              }
              
              currentStart = Math.max(currentStart, jobEndMinutes)
            })
            
            // Add remaining free time after last job
            if (currentStart < slotEnd) {
              freeTimeSlots.push({
                start: minutesToTime(currentStart),
                end: minutesToTime(slotEnd),
                startMinutes: currentStart,
                endMinutes: slotEnd
              })
            }
          })
        }
        
        // Format free time slots for display
        const availableHours = freeTimeSlots.map(slot => ({
          start: slot.start,
          end: slot.end,
          label: `${formatTime24To12(slot.start)} - ${formatTime24To12(slot.end)}`
        }))
        
        // Check if the job time slot fits within the member's available hours
        // The job is available if:
        // 1. No conflicts with this member's existing jobs
        // 2. The job time fits within at least one of the member's available time slots
        let jobFitsInAvailableHours = false
        if (dayAvailability.enabled && dayAvailability.timeSlots && dayAvailability.timeSlots.length > 0) {
          jobFitsInAvailableHours = dayAvailability.timeSlots.some(slot => {
            const slotStart = timeToMinutes(slot.start || slot.startTime)
            const slotEnd = timeToMinutes(slot.end || slot.endTime)
            // Check if job fits within this time slot
            return jobStartMinutes >= slotStart && jobEndMinutes <= slotEnd
          })
        } else if (dayAvailability.enabled) {
          // If no specific time slots, assume available during default hours
          jobFitsInAvailableHours = true
        }
        
        // Also check if job fits in any free time slot (after subtracting conflicts)
        if (!jobFitsInAvailableHours && freeTimeSlots.length > 0) {
          jobFitsInAvailableHours = freeTimeSlots.some(slot => {
            return jobStartMinutes >= slot.startMinutes && jobEndMinutes <= slot.endMinutes
          })
        }
        
        // Get overall availability range
        let availableFrom = '9:00 AM'
        let availableTo = '6:00 PM'
        if (availableHours.length > 0) {
          availableFrom = formatTime24To12(availableHours[0].start)
          availableTo = formatTime24To12(availableHours[availableHours.length - 1].end)
        } else if (dayAvailability.timeSlots && dayAvailability.timeSlots.length > 0) {
          const firstSlot = dayAvailability.timeSlots[0]
          const lastSlot = dayAvailability.timeSlots[dayAvailability.timeSlots.length - 1]
          availableFrom = formatTime24To12(firstSlot.start || firstSlot.startTime)
          availableTo = formatTime24To12(lastSlot.end || lastSlot.endTime)
        }
        
        // Member is available if:
        // 1. No conflicts with their own jobs
        // 2. Job time fits within their available hours
        const isAvailable = !hasConflict && jobFitsInAvailableHours
        
        return {
          available: isAvailable,
          availableFrom,
          availableTo,
          availableHours,
          hasConflict,
          freeTimeSlots
        }
      } catch (error) {
        console.error(`Error fetching availability for member ${member.id}:`, error)
        return {
          available: true,
          availableFrom: '9:00 AM',
          availableTo: '6:00 PM',
          availableHours: [{ start: '09:00', end: '18:00', label: '9:00 AM - 6:00 PM' }],
          hasConflict: false,
          freeTimeSlots: []
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

  // Helper functions for time calculations
  const timeToMinutes = (timeStr) => {
    if (!timeStr) return 0
    const [hours, minutes] = timeStr.split(':').map(Number)
    return (hours || 0) * 60 + (minutes || 0)
  }

  const minutesToTime = (minutes) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
  }

  const formatTimeFromDate = (date) => {
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${hours}:${minutes}`
  }

  const formatTime24To12 = (time24) => {
    if (!time24) return '9:00 AM'
    const [hours, minutes] = time24.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const hour12 = hour % 12 || 12
    return `${hour12}:${minutes || '00'} ${ampm}`
  }

  const calculateDriveTimes = async () => {
    if (!job?.service_address_street && !job?.customer_address) {
      setDriveTimes({})
      return
    }

    const jobAddress = job.service_address_street || job.customer_address || ''
    const jobCity = job.service_address_city || job.customer_city || ''
    const jobState = job.service_address_state || job.customer_state || ''
    const fullAddress = `${jobAddress}, ${jobCity}, ${jobState}`.trim()

    // For now, we'll simulate drive times based on member location
    // In production, you'd use Google Maps Distance Matrix API
    const driveTimeMap = {}
    teamMembers.forEach((member, index) => {
      // Simulate drive time (you can enhance this with actual geocoding)
      const times = ['40+ min', '25 min', '15 min', '5 min', '20 min', '30 min']
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
        const businessName = (member.business_name || '').toLowerCase()
        return fullName.includes(query) || email.includes(query) || businessName.includes(query)
      })
    }

    // Skills filter
    if (selectedSkill !== 'none') {
      filtered = filtered.filter(member => {
        if (!member.skills) return false
        let skills = member.skills
        if (typeof skills === 'string') {
          try {
            skills = JSON.parse(skills)
          } catch (e) {
            skills = skills.split(',').map(s => s.trim())
          }
        }
        if (Array.isArray(skills)) {
          return skills.some(skill => {
            const skillName = typeof skill === 'string' ? skill : (skill?.name || '')
            return skillName.toLowerCase().includes(selectedSkill.toLowerCase())
          })
        }
        return false
      })
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
      if (onAssign) {
        await onAssign(selectedMemberId)
      }
      onClose()
    } catch (error) {
      console.error('Error assigning job:', error)
      setAssigning(false)
    }
  }

  const toggleScheduleExpansion = (memberId, e) => {
    e.stopPropagation()
    setExpandedSchedules(prev => ({
      ...prev,
      [memberId]: !prev[memberId]
    }))
  }

  const getInitials = (member) => {
    if (member.business_name && !member.first_name) {
      return member.business_name.substring(0, 2).toUpperCase()
    }
    const firstName = member.first_name || ''
    const lastName = member.last_name || ''
    const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
    return initials || 'AA'
  }

  const formatDate = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'short', 
      day: 'numeric'
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
    
    const duration = job?.service_duration || job?.duration || 360
    const endDate = new Date(date.getTime() + duration * 60000)
    const endTime = endDate.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    })
    return `${startTime} - ${endTime}`
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

  // Get currently assigned members
  const assignedMemberId = job?.assigned_team_member_id || job?.team_member_id
  const assignedCount = assignedMemberId ? 1 : 0
  const workersNeeded = job?.workers_needed || 1
  const assignedMember = assignedMemberId ? teamMembers.find(m => m.id === assignedMemberId) : null

  if (!isOpen || !job) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-50 rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col shadow-xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 rounded-t-lg">
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
          <h2 className="text-lg font-bold text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 700 }}>Assign Job</h2>
          <button
            onClick={handleAssign}
            disabled={!selectedMemberId || assigning}
            className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all ${
              selectedMemberId && !assigning
                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
            style={{ fontFamily: 'Montserrat', fontWeight: 600 }}
          >
            {assigning ? 'Assigning...' : 'Assign'}
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Job Details Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-5 mb-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900 mb-1" style={{ fontFamily: 'Montserrat', fontWeight: 500 }}>
                  {formatDate(job.scheduled_date)}
                </div>
                <div className="text-base font-bold text-gray-900 mb-4" style={{ fontFamily: 'Montserrat', fontWeight: 700 }}>
                  {formatTime(job.scheduled_date)}
                </div>
              </div>
              
              {/* Assignment Status Badge */}
              <div className="flex items-center gap-2 bg-gray-100 rounded-full px-3 py-1.5">
                <span className="text-xs font-medium text-gray-700" style={{ fontFamily: 'Montserrat', fontWeight: 500 }}>
                  {assignedCount}/{workersNeeded} assigned
                </span>
                {assignedMember && (
                  <div 
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                    style={{ backgroundColor: assignedMember.color || '#DC2626' }}
                  >
                    {getInitials(assignedMember)}
                  </div>
                )}
              </div>
            </div>

            {/* Worker Name */}
            {assignedMember && (
              <div className="flex items-center gap-2 mb-3">
                <User className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 500 }}>
                  {assignedMember.first_name && assignedMember.last_name
                    ? `${assignedMember.first_name} ${assignedMember.last_name}`
                    : assignedMember.business_name || 'Assigned'}
                </span>
              </div>
            )}

            {/* Service Type */}
            <div className="flex items-center gap-2 mb-3">
              <Wrench className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 500 }}>
                {job.service_name || job.service_type || 'Service'}
              </span>
            </div>

            {/* Duration */}
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-700" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
                {formatDuration(job.service_duration || job.duration)}
              </span>
            </div>

            {/* Location */}
            <div className="flex items-start gap-2 mb-4">
              <MapPin className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
              <span className="text-sm text-gray-700 leading-relaxed" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
                {job.service_address_street || job.customer_address || job.address || 'Address not provided'}
                {job.service_address_city && `, ${job.service_address_city}`}
                {job.service_address_state && `, ${job.service_address_state}`}
              </span>
            </div>

            {/* Drive Time Toggle */}
            <div className="flex items-center gap-2.5 pt-3 border-t border-gray-200">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={showDriveTime}
                  onChange={(e) => setShowDriveTime(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
              <span className="text-sm text-gray-700 cursor-pointer select-none" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
                Show approximate drive time
              </span>
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
                className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
                style={{ fontFamily: 'Montserrat', fontWeight: 400 }}
              />
            </div>

            {/* Skills Dropdown */}
            <div className="relative">
              <select
                value={selectedSkill}
                onChange={(e) => setSelectedSkill(e.target.value)}
                className="w-full pl-4 pr-10 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white cursor-pointer transition-all"
                style={{ fontFamily: 'Montserrat', fontWeight: 400 }}
              >
                <option value="none">Skills None</option>
                {allSkills.map((skill, index) => (
                  <option key={index} value={skill}>{skill}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Available Providers Section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs font-bold text-gray-900 uppercase tracking-wider" style={{ fontFamily: 'Montserrat', fontWeight: 700 }}>
                Available
              </span>
              <span className="px-2 py-0.5 bg-gray-200 rounded-full text-xs font-medium text-gray-700" style={{ fontFamily: 'Montserrat', fontWeight: 500 }}>
                {filteredMembers.length}
              </span>
            </div>

            {loading ? (
              <div className="text-center py-8 text-gray-500" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>Loading providers...</div>
            ) : filteredMembers.length === 0 ? (
              <div className="text-center py-8 text-gray-500" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>No available providers found</div>
            ) : (
              <div className="space-y-3">
                {filteredMembers.map((member) => {
                  const isSelected = selectedMemberId === member.id
                  const availability = memberAvailability[member.id] || {}
                  const driveTime = driveTimes[member.id]
                  const isExpanded = expandedSchedules[member.id]

                  return (
                    <div
                      key={member.id}
                      onClick={() => setSelectedMemberId(member.id)}
                      className={`bg-white border rounded-lg p-4 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        {/* Large Selection Indicator */}
                        <div className={`mt-1 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                          isSelected
                            ? 'bg-blue-600'
                            : 'bg-gray-200'
                        }`}>
                          {isSelected && (
                            <Check className="w-5 h-5 text-white" strokeWidth={3} />
                          )}
                        </div>

                        {/* Avatar with Green Dot */}
                        <div className="relative flex-shrink-0">
                          <div 
                            className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-semibold ${
                              isSelected ? 'ring-2 ring-blue-600' : ''
                            }`}
                            style={{ backgroundColor: member.color || '#9CA3AF' }}
                          >
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
                          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                        </div>

                        {/* Member Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1.5">
                            <h3 className="text-sm font-bold text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 700 }}>
                              {member.first_name && member.last_name
                                ? `${member.first_name} ${member.last_name}`
                                : member.business_name || 'Provider'}
                            </h3>
                            {showDriveTime && driveTime && (
                              <span className="text-xs text-gray-500 ml-2" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
                                {driveTime} away
                              </span>
                            )}
                          </div>
                          
                          {availability.availableFrom && availability.availableTo && (
                            <div className="text-xs text-gray-600 mb-2" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
                              Available from {availability.availableFrom} to {availability.availableTo}
                            </div>
                          )}

                          {/* View Schedule Button */}
                          <button
                            onClick={(e) => toggleScheduleExpansion(member.id, e)}
                            className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 mb-2 transition-colors"
                            style={{ fontFamily: 'Montserrat', fontWeight: 500 }}
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="w-3 h-3" />
                                View Schedule
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-3 h-3" />
                                View Schedule
                              </>
                            )}
                          </button>

                          {/* Expanded Schedule View */}
                          {isExpanded && availability.availableHours && availability.availableHours.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              {availability.availableHours.map((hourBlock, idx) => (
                                <div key={idx} className="mb-3 last:mb-0">
                                  <div className="text-xs text-gray-700 mb-1.5" style={{ fontFamily: 'Montserrat', fontWeight: 500 }}>
                                    {hourBlock.label}
                                  </div>
                                  <div className="relative h-6 bg-gray-100 rounded overflow-hidden">
                                    <div 
                                      className="absolute inset-0 bg-green-500 opacity-30"
                                      style={{
                                        backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.3) 10px, rgba(255,255,255,0.3) 20px)'
                                      }}
                                    ></div>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <span className="text-xs font-medium text-gray-700" style={{ fontFamily: 'Montserrat', fontWeight: 500 }}>
                                        Available
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
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

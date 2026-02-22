import React, { useState, useEffect, useMemo } from 'react'
import { X, Check, MapPin, Clock, User, Wrench, Search, ChevronDown, ChevronUp } from 'lucide-react'
import { teamAPI, jobsAPI, availabilityAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { getImageUrl } from '../utils/imageUtils'
import { normalizeAPIResponse } from '../utils/dataHandler'
import { decodeHtmlEntities } from '../utils/htmlUtils'

const AssignJobModal = ({ job, isOpen, onClose, onAssign, companyDrivingTimeMinutes }) => {
  const { user } = useAuth()
  const [teamMembers, setTeamMembers] = useState([])
  const [selectedMemberIds, setSelectedMemberIds] = useState(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSkill, setSelectedSkill] = useState('none')
  const [showDriveTime, setShowDriveTime] = useState(true)
  const [loading, setLoading] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [memberAvailability, setMemberAvailability] = useState({})
  const [expandedSchedules, setExpandedSchedules] = useState({})
  const [allSkills, setAllSkills] = useState([])
  const [companyDrivingTime, setCompanyDrivingTime] = useState(companyDrivingTimeMinutes ?? null)

  // Fetch company driving time when modal opens (for fallback when member has no per-member driving time)
  useEffect(() => {
    if (!isOpen) return
    if (companyDrivingTimeMinutes != null) {
      setCompanyDrivingTime(companyDrivingTimeMinutes)
      return
    }
    if (user?.id && companyDrivingTime == null) {
      availabilityAPI.getAvailability(user.id).then((data) => {
        const hours = data?.businessHours || data?.business_hours
        const parsed = typeof hours === 'string' ? (() => { try { return JSON.parse(hours) } catch (e) { return null } })() : hours
        if (parsed && typeof parsed.drivingTime === 'number') setCompanyDrivingTime(parsed.drivingTime)
        else if (parsed && parsed.drivingTime != null) setCompanyDrivingTime(parseInt(parsed.drivingTime, 10) || 0)
      }).catch(() => {})
    }
  }, [isOpen, user?.id, companyDrivingTimeMinutes])

  // Fetch team members when modal opens
  useEffect(() => {
    if (isOpen && job) {
      fetchTeamMembers()
      // Get all currently assigned team members from team_assignments array
      const assignedIds = new Set()
      if (job?.team_assignments && Array.isArray(job.team_assignments) && job.team_assignments.length > 0) {
        job.team_assignments.forEach(assignment => {
          if (assignment.team_member_id) {
            assignedIds.add(Number(assignment.team_member_id))
          }
        })
      }
      // Fallback to single assignment fields
      if (assignedIds.size === 0) {
        const currentAssignedId = job?.assigned_team_member_id || job?.team_member_id
        if (currentAssignedId) {
          assignedIds.add(Number(currentAssignedId))
        }
      }
      setSelectedMemberIds(assignedIds)
      console.log('Assign modal opened - pre-selected member IDs:', Array.from(assignedIds))
      setSearchQuery('')
      setSelectedSkill('none')
      setExpandedSchedules({})
    } else {
      setSelectedMemberIds(new Set())
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
    }
  }, [isOpen, job, teamMembers])

  const fetchTeamMembers = async () => {
    try {
      setLoading(true)
      const response = await teamAPI.getAll(user.id, {
        status: 'active',
        page: 1,
        limit: 100
      })
      
      // Normalize the response
      const teamMembersData = normalizeAPIResponse(response, 'teamMembers') || []
      
      // Filter to only service providers (workers, schedulers, managers, account owner)
      const providers = teamMembersData.filter(member => 
        (member.is_service_provider || member.role === 'owner' || member.role === 'account owner') && 
        member.status === 'active'
      )
      
      // Log for debugging
      console.log('Fetched team members:', providers.map(m => ({
        id: m.id,
        first_name: m.first_name,
        last_name: m.last_name,
        business_name: m.business_name
      })))
      
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
        
        // Default availability if nothing found (but don't override if explicitly disabled)
        if (!dayAvailability) {
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
        const jobDuration = job.estimated_duration ?? job.service_duration ?? job.duration ?? (job.service && (job.service.duration ?? job.service.service_duration)) ?? 60
        const jobDurationMinutes = typeof jobDuration === 'number' ? jobDuration : parseInt(jobDuration, 10) || 60
        const jobEnd = new Date(jobStart.getTime() + jobDurationMinutes * 60000)
        
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
        
        // Calculate free time slots by subtracting jobs + driving time from available hours
        const freeTimeSlots = []
        const drivingBuffer = getMemberDrivingTime(member)

        // Build job time ranges and driving time ranges
        const jobTimeRanges = []
        const drivingTimeRanges = []

        // Get ALL member jobs for the day (not just conflicting ones) to compute busy/driving
        const allMemberJobs = memberJobs.filter(ej => {
          if (!ej.scheduled_date || ej.id === job.id) return false
          const isAssigned =
            ej.team_member_id === member.id ||
            ej.assigned_team_member_id === member.id ||
            (ej.team_assignments && Array.isArray(ej.team_assignments) &&
             ej.team_assignments.some(ta => ta.team_member_id === member.id))
          return isAssigned
        })

        allMemberJobs.forEach(ej => {
          const ejStart = new Date(ej.scheduled_date)
          const ejDuration = ej.service_duration || ej.duration || 360
          const ejStartMin = timeToMinutes(formatTimeFromDate(ejStart))
          const ejEndMin = ejStartMin + ejDuration
          jobTimeRanges.push({ start: ejStartMin, end: ejEndMin })
        })

        // Compute driving time buffers before and after each job
        if (drivingBuffer > 0 && jobTimeRanges.length > 0 && dayAvailability.enabled && dayAvailability.timeSlots?.length > 0) {
          const availStart = timeToMinutes(dayAvailability.timeSlots[0].start || dayAvailability.timeSlots[0].startTime || '09:00')
          const availEnd = timeToMinutes(dayAvailability.timeSlots[dayAvailability.timeSlots.length - 1].end || dayAvailability.timeSlots[dayAvailability.timeSlots.length - 1].endTime || '18:00')
          const sorted = [...jobTimeRanges].sort((a, b) => a.start - b.start)
          sorted.forEach(jr => {
            const beforeStart = Math.max(jr.start - drivingBuffer, availStart)
            if (beforeStart < jr.start) drivingTimeRanges.push({ start: beforeStart, end: jr.start })
            const afterEnd = Math.min(jr.end + drivingBuffer, availEnd)
            if (afterEnd > jr.end) drivingTimeRanges.push({ start: jr.end, end: afterEnd })
          })
        }

        // Merge all blocked ranges (jobs + driving)
        const allBlocked = [...jobTimeRanges, ...drivingTimeRanges]
          .sort((a, b) => a.start - b.start)
          .reduce((merged, range) => {
            if (merged.length === 0 || merged[merged.length - 1].end < range.start) {
              merged.push({ ...range })
            } else {
              merged[merged.length - 1].end = Math.max(merged[merged.length - 1].end, range.end)
            }
            return merged
          }, [])

        if (dayAvailability.enabled && dayAvailability.timeSlots && dayAvailability.timeSlots.length > 0) {
          dayAvailability.timeSlots.forEach(slot => {
            const slotStart = timeToMinutes(slot.start || slot.startTime)
            const slotEnd = timeToMinutes(slot.end || slot.endTime)

            // Subtract all blocked ranges to get free time
            let currentStart = slotStart
            const relevantBlocked = allBlocked.filter(b => b.start < slotEnd && b.end > slotStart).sort((a, b) => a.start - b.start)

            relevantBlocked.forEach(blocked => {
              if (currentStart < blocked.start) {
                freeTimeSlots.push({
                  start: minutesToTime(currentStart),
                  end: minutesToTime(blocked.start),
                  startMinutes: currentStart,
                  endMinutes: blocked.start
                })
              }
              currentStart = Math.max(currentStart, blocked.end)
            })

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

        // Compute totals
        const totalBusy = jobTimeRanges.reduce((sum, r) => sum + (r.end - r.start), 0)
        const totalDriving = drivingTimeRanges.reduce((sum, r) => {
          // Only count driving that doesn't overlap with jobs
          let dur = r.end - r.start
          jobTimeRanges.forEach(jr => {
            const overlapStart = Math.max(r.start, jr.start)
            const overlapEnd = Math.min(r.end, jr.end)
            if (overlapStart < overlapEnd) dur -= (overlapEnd - overlapStart)
          })
          return sum + Math.max(dur, 0)
        }, 0)
        const totalAvailable = freeTimeSlots.reduce((sum, s) => sum + (s.endMinutes - s.startMinutes), 0)
        
        // If the day is explicitly marked as unavailable, member is not available
        if (dayAvailability.enabled === false) {
          return {
            available: false,
            availableFrom: '',
            availableTo: '',
            availableHours: [],
            hasConflict: false,
            freeTimeSlots: [],
            totalBusy: 0,
            totalDriving: 0,
            totalAvailable: 0
          }
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
        // 1. Day is enabled (not explicitly unavailable)
        // 2. No conflicts with their own jobs
        // 3. Job time fits within their available hours
        const isAvailable = dayAvailability.enabled && !hasConflict && jobFitsInAvailableHours
        
        return {
          available: isAvailable,
          availableFrom,
          availableTo,
          availableHours,
          hasConflict,
          freeTimeSlots,
          totalBusy,
          totalDriving,
          totalAvailable
        }
      } catch (error) {
        console.error(`Error fetching availability for member ${member.id}:`, error)
        return {
          available: true,
          availableFrom: '9:00 AM',
          availableTo: '6:00 PM',
          availableHours: [{ start: '09:00', end: '18:00', label: '9:00 AM - 6:00 PM' }],
          hasConflict: false,
          freeTimeSlots: [],
          totalBusy: 0,
          totalDriving: 0,
          totalAvailable: 0
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

  // Get a member's driving time: per-member availability.drivingTime overrides company default.
  const getMemberDrivingTime = (member) => {
    const companyDefault = companyDrivingTime ?? 0
    if (!member) return companyDefault
    try {
      const avail = member.availability
        ? (typeof member.availability === 'string' ? JSON.parse(member.availability) : member.availability)
        : null
      if (avail && avail.drivingTime !== undefined && avail.drivingTime !== null) {
        return parseInt(avail.drivingTime) || 0
      }
    } catch (e) {
      // ignore parse errors
    }
    return companyDefault
  }

  // Get currently assigned member IDs to ensure they're always shown
  const currentlyAssignedIds = useMemo(() => {
    const assignedIds = new Set()
    if (job?.team_assignments && Array.isArray(job.team_assignments)) {
      job.team_assignments.forEach(assignment => {
        if (assignment.team_member_id) {
          assignedIds.add(Number(assignment.team_member_id))
        }
      })
    }
    // Fallback to single assignment fields
    if (assignedIds.size === 0) {
      const currentAssignedId = job?.assigned_team_member_id || job?.team_member_id
      if (currentAssignedId) {
        assignedIds.add(Number(currentAssignedId))
      }
    }
    return assignedIds
  }, [job])

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

    // Always include currently assigned members, even if they don't match filters
    const assignedMembers = teamMembers.filter(member => currentlyAssignedIds.has(Number(member.id)))
    const assignedMemberIds = new Set(assignedMembers.map(m => m.id))

    // Show: assigned members always; others when they have availability (free time) for this job.
    // Until availability has been fetched for at least one member, show all (avoids showing only assigned due to load race).
    const availabilityLoaded = Object.keys(memberAvailability).length > 0
    filtered = filtered.filter(member => {
      const isAssigned = assignedMemberIds.has(member.id)
      if (isAssigned) return true // Always show assigned members

      if (!availabilityLoaded) return true // Show all until fetch completes so list isn't only assigned
      const availability = memberAvailability[member.id]
      if (availability == null) return true // This member's data not ready yet
      return availability.available === true // Only show members with free time for this job
    })

    // Merge assigned members that might not be in filtered list
    const filteredIds = new Set(filtered.map(m => m.id))
    assignedMembers.forEach(member => {
      if (!filteredIds.has(member.id)) {
        filtered.push(member)
      }
    })

    return filtered
  }, [teamMembers, searchQuery, selectedSkill, memberAvailability, currentlyAssignedIds])

  const handleAssign = async () => {
    try {
      setAssigning(true)
      if (onAssign) {
        // Convert Set to Array for the handler
        const memberIdsArray = Array.from(selectedMemberIds)
        await onAssign(memberIdsArray)
      }
      onClose()
    } catch (error) {
      console.error('Error assigning job:', error)
      setAssigning(false)
    }
  }

  const toggleMemberSelection = (memberId) => {
    setSelectedMemberIds(prev => {
      const newSet = new Set(prev)
      const id = Number(memberId) // Ensure consistent number type
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
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
  const assignedMemberIds = new Set()
  if (job?.team_assignments && Array.isArray(job.team_assignments)) {
    job.team_assignments.forEach(assignment => {
      if (assignment.team_member_id) {
        assignedMemberIds.add(Number(assignment.team_member_id))
      }
    })
  }
  // Fallback to single assignment fields
  if (assignedMemberIds.size === 0) {
    const currentAssignedId = job?.assigned_team_member_id || job?.team_member_id
    if (currentAssignedId) {
      assignedMemberIds.add(Number(currentAssignedId))
    }
  }
  const assignedCount = assignedMemberIds.size
  const workersNeeded = job?.workers_needed || 1
  const assignedMembers = teamMembers.filter(m => assignedMemberIds.has(Number(m.id)))

  if (!isOpen || !job) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[10000] flex items-center justify-center p-4" onClick={onClose}>
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
            disabled={assigning}
            className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all ${
              !assigning
                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
            style={{ fontFamily: 'Montserrat', fontWeight: 600 }}
          >
            {assigning ? 'Updating...' : 'Update Assignment'}
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
                {assignedMembers.length > 0 && (
                  <div className="flex items-center gap-1">
                    {assignedMembers.slice(0, 3).map((member, idx) => (
                  <div 
                        key={member.id}
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                        style={{ backgroundColor: member.color || '#DC2626' }}
                        title={`${member.first_name || ''} ${member.last_name || ''}`.trim() || member.business_name}
                  >
                        {getInitials(member)}
                  </div>
                    ))}
                    {assignedMembers.length > 3 && (
                      <span className="text-xs text-gray-600">+{assignedMembers.length - 3}</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Assigned Members List */}
            {assignedMembers.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <User className="w-4 h-4 text-gray-500" />
                <div className="flex flex-wrap gap-2">
                  {assignedMembers.map((member) => (
                    <span 
                      key={member.id}
                      className="text-sm font-medium text-gray-900" 
                      style={{ fontFamily: 'Montserrat', fontWeight: 500 }}
                    >
                      {(() => {
                        const firstName = (member.first_name || '').trim()
                        const lastName = (member.last_name || '').trim()
                        const businessName = (member.business_name || '').trim()
                        
                        if (firstName || lastName) {
                          return `${firstName} ${lastName}`.trim() || businessName || 'Assigned'
                        }
                        return businessName || 'Assigned'
                      })()}
                      {assignedMembers.length > 1 && assignedMembers.indexOf(member) < assignedMembers.length - 1 && ','}
                </span>
                  ))}
                </div>
              </div>
            )}

            {/* Service Type */}
            <div className="flex items-center gap-2 mb-3">
              <Wrench className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 500 }}>
                {decodeHtmlEntities(job.service_name || job.service_type || 'Service')}
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
                  const memberId = Number(member.id) // Ensure consistent number type
                  const isSelected = selectedMemberIds.has(memberId)
                  const availability = memberAvailability[member.id] || {}
                  const isExpanded = expandedSchedules[member.id]

                  return (
                    <div
                      key={member.id}
                      onClick={() => toggleMemberSelection(memberId)}
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
                                alt={(() => {
                                  const firstName = (member.first_name || '').trim()
                                  const lastName = (member.last_name || '').trim()
                                  const businessName = (member.business_name || '').trim()
                                  if (firstName || lastName) {
                                    return `${firstName} ${lastName}`.trim() || businessName || 'Provider'
                                  }
                                  return businessName || 'Provider'
                                })()}
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
                              {(() => {
                                const firstName = (member.first_name || '').trim()
                                const lastName = (member.last_name || '').trim()
                                const businessName = (member.business_name || '').trim()
                                
                                if (firstName || lastName) {
                                  return `${firstName} ${lastName}`.trim() || businessName || 'Provider'
                                }
                                return businessName || 'Provider'
                              })()}
                            </h3>
                            {showDriveTime && getMemberDrivingTime(member) > 0 && (
                              <span className="text-xs text-amber-600 ml-2" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
                                +{getMemberDrivingTime(member)}min buffer
                              </span>
                            )}
                          </div>
                          
                          {availability.availableFrom && availability.availableTo && (
                            <div className="text-xs text-gray-600 mb-1" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
                              Available {availability.availableFrom} - {availability.availableTo}
                            </div>
                          )}

                          {/* Time breakdown: available / busy / driving */}
                          {(availability.totalAvailable > 0 || availability.totalBusy > 0 || availability.totalDriving > 0) && (
                            <div className="flex flex-wrap gap-2 mb-2">
                              {availability.totalAvailable > 0 && (
                                <span className="text-xs font-medium text-green-700 bg-green-50 px-1.5 py-0.5 rounded" style={{ fontFamily: 'Montserrat', fontWeight: 500 }}>
                                  {formatDuration(availability.totalAvailable)} free
                                </span>
                              )}
                              {availability.totalBusy > 0 && (
                                <span className="text-xs font-medium text-orange-700 bg-orange-50 px-1.5 py-0.5 rounded" style={{ fontFamily: 'Montserrat', fontWeight: 500 }}>
                                  {formatDuration(availability.totalBusy)} busy
                                </span>
                              )}
                              {availability.totalDriving > 0 && (
                                <span className="text-xs font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded" style={{ fontFamily: 'Montserrat', fontWeight: 500 }}>
                                  {formatDuration(availability.totalDriving)} travel
                                </span>
                              )}
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

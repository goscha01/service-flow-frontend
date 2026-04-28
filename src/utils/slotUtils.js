/**
 * Slot and driving-time utilities for cleaner-based scheduling.
 *
 * Core principles:
 * - Scheduling is cleaner-based: every booking is assigned to one or more cleaners.
 * - Driving time blocks the cleaner's schedule (before/after each job).
 * - A bookable time slot = service duration + driving time must fit inside a cleaner's free window.
 * - Company availability = union of all cleaners' valid available slots.
 * - For services requiring 2+ cleaners, availability = intersection of those cleaners' free time.
 */

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

/**
 * @param {string} time24 - "HH:MM" or "HH:MM:SS"
 * @returns {number} minutes since midnight
 */
export function timeToMinutes(time24) {
  if (!time24) return 0
  const parts = String(time24).trim().split(':')
  const hours = parseInt(parts[0], 10) || 0
  const minutes = parseInt(parts[1], 10) || 0
  return hours * 60 + minutes
}

/**
 * @param {number} minutes - minutes since midnight
 * @returns {string} "HH:MM"
 */
export function minutesToTime(minutes) {
  const h = Math.floor(Math.max(0, minutes) / 60) % 24
  const m = Math.max(0, minutes) % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/**
 * Get driving time for a cleaner in minutes.
 * Uses per-member availability.drivingTime first, then company default.
 * @param {object} member - team member with optional availability
 * @param {number} companyDrivingTimeMinutes - company-level default (e.g. from settings)
 * @returns {number}
 */
export function getMemberDrivingTime(member, companyDrivingTimeMinutes = 0) {
  if (!member) return typeof companyDrivingTimeMinutes === 'number' ? companyDrivingTimeMinutes : 0
  try {
    const avail = member.availability
      ? (typeof member.availability === 'string' ? JSON.parse(member.availability) : member.availability)
      : null
    if (avail && (avail.drivingTime !== undefined && avail.drivingTime !== null)) {
      const v = parseInt(avail.drivingTime, 10)
      return Number.isFinite(v) ? v : companyDrivingTimeMinutes
    }
  } catch (e) {
    // ignore
  }
  return typeof companyDrivingTimeMinutes === 'number' ? companyDrivingTimeMinutes : 0
}

/**
 * Merge overlapping or adjacent time ranges (each { start, end } in minutes).
 * @param {Array<{ start: number, end: number }>} ranges
 * @returns {Array<{ start: number, end: number }>}
 */
export function mergeTimeRanges(ranges) {
  if (!ranges || ranges.length === 0) return []
  const sorted = [...ranges].sort((a, b) => a.start - b.start)
  const merged = [{ ...sorted[0] }]
  for (let i = 1; i < sorted.length; i++) {
    const prev = merged[merged.length - 1]
    const curr = sorted[i]
    if (curr.start <= prev.end) {
      prev.end = Math.max(prev.end, curr.end)
    } else {
      merged.push({ ...curr })
    }
  }
  return merged
}

/**
 * Get personal availability for a member on a day (working hours only, no jobs).
 * @param {object} member - team member with availability / workingHours
 * @param {string} dayOfWeek - 'monday' .. 'sunday'
 * @param {object} memberAvailabilityMap - optional map memberId -> raw availability from API
 * @returns {{ start: string, end: string } | null} time in "HH:MM"
 */
export function getPersonalAvailabilityForDay(member, dayOfWeek, memberAvailabilityMap = null) {
  if (!member) return null
  let workingHours = null

  const raw = memberAvailabilityMap && member.id ? memberAvailabilityMap[member.id] : null
  if (raw) {
    const avail = typeof raw === 'string' ? (() => { try { return JSON.parse(raw) } catch (e) { return null } })() : raw
    workingHours = avail?.workingHours || null
  }
  if (!workingHours && member.availability) {
    try {
      const avail = typeof member.availability === 'string' ? JSON.parse(member.availability) : member.availability
      workingHours = avail?.workingHours || null
    } catch (e) {
      return null
    }
  }
  if (!workingHours) return null

  const dayHours = workingHours[dayOfWeek]
  if (!dayHours || dayHours.available === false) return null
  if (dayHours.timeSlots && Array.isArray(dayHours.timeSlots) && dayHours.timeSlots.length > 0) {
    const first = dayHours.timeSlots[0]
    return { start: first.start || first.startTime, end: first.end || first.endTime }
  }
  if (dayHours.start && dayHours.end) return { start: dayHours.start, end: dayHours.end }
  return null
}

/**
 * Check if a job is assigned to a team member (by id).
 * @param {object} job - job with team_assignments or assigned_team_member_id / team_member_id
 * @param {string|number} memberId
 * @returns {boolean}
 */
export function isJobAssignedTo(job, memberId) {
  const id = Number(memberId)
  if (job.team_assignments && Array.isArray(job.team_assignments)) {
    if (job.team_assignments.some(ta => Number(ta.team_member_id) === id)) return true
  }
  if (Number(job.assigned_team_member_id) === id || Number(job.team_member_id) === id) return true
  return false
}

/**
 * Parse job start time in minutes from scheduled_date / scheduledDate.
 * @param {object} job
 * @returns {{ start: number, end: number } | null}
 */
export function jobToTimeRange(job, dateString) {
  let jobStartTime = null
  let jobDuration = job.duration || job.service_duration || job.estimated_duration || 60
  if (typeof jobDuration === 'string') jobDuration = parseInt(jobDuration, 10) || 60

  const sd = job.scheduled_date || job.scheduledDate
  if (!sd) return null

  let datePart
  let timePart
  if (typeof sd === 'string') {
    if (sd.includes(' ')) {
      [datePart, timePart] = sd.split(' ')
    } else if (sd.includes('T')) {
      [datePart, timePart] = sd.split('T')
    } else {
      datePart = sd
      timePart = '00:00:00'
    }
  } else {
    const d = new Date(sd)
    if (isNaN(d.getTime())) return null
    datePart = d.toISOString().split('T')[0]
    jobStartTime = d.getHours() * 60 + d.getMinutes()
    return { start: jobStartTime, end: jobStartTime + jobDuration }
  }

  if (datePart !== dateString) return null
  if (timePart) {
    const [h, m] = timePart.split(':').map(Number)
    jobStartTime = (h || 0) * 60 + (m || 0)
  }
  if (jobStartTime == null) return null
  return { start: jobStartTime, end: jobStartTime + jobDuration }
}

/**
 * Get free time slots for one cleaner on a date after subtracting jobs and driving buffers.
 * Driving time is applied before and after each job and blocks the cleaner.
 *
 * @param {object} opts
 * @param {object} opts.member - team member
 * @param {Date} opts.date - date to compute for
 * @param {object} opts.companyDayHours - { enabled, start, end } for the day
 * @param {Array<object>} opts.dayJobs - jobs assigned to this member on this date
 * @param {number} opts.drivingTimeMinutes - driving buffer before/after each job
 * @param {object} opts.memberAvailabilityMap - optional memberId -> availability
 * @returns {Array<{ start: string, end: string }>} free slots in "HH:MM"
 */
export function getCleanerFreeSlotsForDay({
  member,
  date,
  companyDayHours,
  dayJobs,
  drivingTimeMinutes,
  memberAvailabilityMap = null
}) {
  const dayOfWeek = DAYS[date.getDay()]
  const dateString = date.toISOString().split('T')[0]

  if (!companyDayHours || !companyDayHours.enabled) return []
  const companyStart = timeToMinutes(companyDayHours.start)
  const companyEnd = timeToMinutes(companyDayHours.end)

  const personal = getPersonalAvailabilityForDay(member, dayOfWeek, memberAvailabilityMap)
  if (!personal) return []
  const personalStart = timeToMinutes(personal.start)
  const personalEnd = timeToMinutes(personal.end)
  const intersectionStart = Math.max(companyStart, personalStart)
  const intersectionEnd = Math.min(companyEnd, personalEnd)
  if (intersectionStart >= intersectionEnd) return []

  const intersectionTimeSlots = [{ start: intersectionStart, end: intersectionEnd }]

  const jobTimeRanges = (dayJobs || [])
    .map(job => jobToTimeRange(job, dateString))
    .filter(Boolean)

  let drivingTimeRanges = []
  const driving = typeof drivingTimeMinutes === 'number' ? drivingTimeMinutes : 0
  if (driving > 0 && jobTimeRanges.length > 0) {
    const sorted = [...jobTimeRanges].sort((a, b) => a.start - b.start)
    sorted.forEach(job => {
      drivingTimeRanges.push({ start: Math.max(job.start - driving, intersectionStart), end: job.start })
      drivingTimeRanges.push({ start: job.end, end: Math.min(job.end + driving, intersectionEnd) })
    })
    drivingTimeRanges = mergeTimeRanges(drivingTimeRanges)
  }

  const allBlocked = mergeTimeRanges([...jobTimeRanges, ...drivingTimeRanges])
  const remaining = []

  intersectionTimeSlots.forEach(slot => {
    let currentStart = slot.start
    const relevant = allBlocked
      .filter(b => b.start < slot.end && b.end > slot.start)
      .sort((a, b) => a.start - b.start)
    relevant.forEach(b => {
      if (currentStart < b.start) {
        remaining.push({ start: minutesToTime(currentStart), end: minutesToTime(b.start) })
      }
      currentStart = Math.max(currentStart, b.end)
    })
    if (currentStart < slot.end) {
      remaining.push({ start: minutesToTime(currentStart), end: minutesToTime(slot.end) })
    }
  })

  return remaining
}

/**
 * Generate bookable start times for a date.
 * A slot is only included if at least one cleaner (or the required set) can fit
 * (service duration + driving time) within their working hours without overlap.
 *
 * @param {object} opts
 * @param {Date} opts.date
 * @param {number} opts.serviceDurationMinutes - job/service length
 * @param {number} opts.drivingTimeMinutes - buffer before/after (blocks cleaner)
 * @param {number} opts.requiredCleaners - 1 = any one cleaner; 2+ = all must be free together
 * @param {Array<object>} opts.teamMembers - active cleaners
 * @param {object} opts.companyHours - day name -> { enabled, start, end }
 * @param {Array<object>} opts.jobs - all jobs (will be filtered by date and assignment)
 * @param {object} opts.memberAvailabilityMap - optional memberId -> availability
 * @param {number} opts.slotIntervalMinutes - optional step for slot start (default 15)
 * @returns {Array<{ time: string, endTime: string, availableWorkerIds: number[] }>}
 */
export function generateBookableSlots({
  date,
  serviceDurationMinutes,
  drivingTimeMinutes = 0,
  requiredCleaners = 1,
  teamMembers,
  companyHours,
  jobs,
  memberAvailabilityMap = null,
  slotIntervalMinutes = 15
}) {
  const dayOfWeek = DAYS[date.getDay()]
  const dateString = date.toISOString().split('T')[0]
  const companyDayHours = companyHours && companyHours[dayOfWeek]
  if (!companyDayHours || !companyDayHours.enabled) return []

  const totalBlockMinutes = serviceDurationMinutes + (drivingTimeMinutes || 0) * 2 // before + after
  const interval = Math.max(1, slotIntervalMinutes || 15)

  // Per-member free slots (after jobs + driving)
  const memberFreeSlots = new Map()
  for (const member of teamMembers || []) {
    const memberId = Number(member.id)
    const dayJobs = (jobs || []).filter(job => isJobAssignedTo(job, memberId))
    const driving = getMemberDrivingTime(member, drivingTimeMinutes)
    const freeSlots = getCleanerFreeSlotsForDay({
      member,
      date,
      companyDayHours,
      dayJobs,
      drivingTimeMinutes: driving,
      memberAvailabilityMap
    })
    memberFreeSlots.set(memberId, freeSlots)
  }

  if (requiredCleaners >= 2) {
    // Intersection: find windows where at least requiredCleaners have overlapping free time
    const allSlots = []
    memberFreeSlots.forEach((slots, memberId) => {
      slots.forEach(s => {
        allSlots.push({
          start: timeToMinutes(s.start),
          end: timeToMinutes(s.end),
          memberId
        })
      })
    })
    const memberIds = Array.from(memberFreeSlots.keys())
    const combinations = getCombinations(memberIds, requiredCleaners)
    const resultSlots = new Map() // startMinutes -> Set<memberIds>

    for (const combo of combinations) {
      const slotsPerMember = combo.map(id => memberFreeSlots.get(id) || [])
      const intersection = intersectSlotRanges(slotsPerMember)
      intersection.forEach(({ start, end }) => {
        for (let t = start; t + totalBlockMinutes <= end; t += interval) {
          const key = t
          if (!resultSlots.has(key)) resultSlots.set(key, new Set())
          combo.forEach(id => resultSlots.get(key).add(id))
        }
      })
    }

    return Array.from(resultSlots.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([startMin]) => ({
        time: minutesToTime(startMin),
        endTime: minutesToTime(startMin + serviceDurationMinutes),
        availableWorkerIds: Array.from(resultSlots.get(startMin))
      }))
  }

  // requiredCleaners === 1: union of all start times where at least one cleaner can fit the block
  const startToWorkers = new Map()
  memberFreeSlots.forEach((slots, memberId) => {
    slots.forEach(s => {
      const startMin = timeToMinutes(s.start)
      const endMin = timeToMinutes(s.end)
      for (let t = startMin; t + totalBlockMinutes <= endMin; t += interval) {
        if (!startToWorkers.has(t)) startToWorkers.set(t, [])
        startToWorkers.get(t).push(memberId)
      }
    })
  })

  return Array.from(startToWorkers.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([startMin]) => ({
      time: minutesToTime(startMin),
      endTime: minutesToTime(startMin + serviceDurationMinutes),
      availableWorkerIds: startToWorkers.get(startMin) || []
    }))
}

function getCombinations(arr, k) {
  if (k <= 0 || k > arr.length) return []
  if (k === 1) return arr.map(a => [a])
  const out = []
  for (let i = 0; i <= arr.length - k; i++) {
    const rest = getCombinations(arr.slice(i + 1), k - 1)
    rest.forEach(r => out.push([arr[i], ...r]))
  }
  return out
}

function intersectSlotRanges(slotsPerMember) {
  if (!slotsPerMember.length) return []
  let current = (slotsPerMember[0] || []).map(s => ({
    start: timeToMinutes(s.start),
    end: timeToMinutes(s.end)
  }))
  for (let i = 1; i < slotsPerMember.length; i++) {
    const next = (slotsPerMember[i] || []).map(s => ({
      start: timeToMinutes(s.start),
      end: timeToMinutes(s.end)
    }))
    const newCurrent = []
    current.forEach(a => {
      next.forEach(b => {
        const start = Math.max(a.start, b.start)
        const end = Math.min(a.end, b.end)
        if (start < end) newCurrent.push({ start, end })
      })
    })
    current = mergeTimeRanges(newCurrent)
  }
  return current
}

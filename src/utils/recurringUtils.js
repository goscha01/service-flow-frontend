/**
 * Formats recurring frequency for display
 * @param {string} frequency - The frequency string (e.g., "weekly", "2 weeks", "monthly", "3 months")
 * @param {Date|string|null} scheduledDate - The scheduled date to calculate weekday/month day
 * @returns {string} Formatted frequency string
 */
export const formatRecurringFrequency = (frequency, scheduledDate = null) => {
  if (!frequency || frequency === 'never' || frequency === '') {
    return 'Never'
  }

  const freq = frequency.toLowerCase().trim()
  let date = null
  
  if (scheduledDate) {
    date = scheduledDate instanceof Date ? scheduledDate : new Date(scheduledDate)
  }

  // Handle weekly frequencies FIRST (before daily, since "friday" contains "day")
  // Check for patterns like "weekly-friday", "2 weeks-friday", etc.
  if (freq.includes('week')) {
    const parts = freq.split('-')
    const weekMatch = parts[0].match(/(\d+)\s*weeks?/) || parts[0].match(/weekly/)
    const weeks = weekMatch && weekMatch[1] ? parseInt(weekMatch[1]) : 1
    
    // Check if day of week is specified in the format
    let weekday = null
    if (parts.length > 1) {
      const dayPart = parts[parts.length - 1]
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
      const dayLabels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      const dayIndex = dayNames.findIndex(day => dayPart.includes(day))
      if (dayIndex !== -1) {
        weekday = dayLabels[dayIndex]
      }
    }
    
    // Use date if weekday not found in format
    if (!weekday && date) {
      weekday = date.toLocaleDateString('en-US', { weekday: 'long' })
    }
    
    if (weekday) {
      if (weeks === 1) {
        return `Every week on ${weekday}`
      } else if (weeks === 2) {
        return `Every 2 weeks on ${weekday}`
      } else {
        return `Every ${weeks} weeks on ${weekday}`
      }
    } else {
      if (weeks === 1) {
        return 'Every week'
      } else if (weeks === 2) {
        return 'Every 2 weeks'
      } else {
        return `Every ${weeks} weeks`
      }
    }
  }

  // Handle monthly frequencies
  if (freq.includes('month')) {
    const parts = freq.split('-')
    const monthMatch = parts[0].match(/(\d+)\s*months?/) || parts[0].match(/monthly/)
    const months = monthMatch && monthMatch[1] ? parseInt(monthMatch[1]) : 1
    
    // Check if it's "day" format: monthly-day-12 or X months-day-12
    if (parts.includes('day') && parts.length > 2) {
      const dayValue = parseInt(parts[parts.length - 1])
      if (dayValue && dayValue >= 1 && dayValue <= 31) {
        const getOrdinal = (n) => {
          const s = ["th", "st", "nd", "rd"]
          const v = n % 100
          return n + (s[(v - 20) % 10] || s[v] || s[0])
        }
        if (months === 1) {
          return `Every month on the ${getOrdinal(dayValue)}`
        } else {
          return `Every ${months} months on the ${getOrdinal(dayValue)}`
        }
      }
    }
    // Check if it's "ordinal-weekday" format: monthly-2nd-friday or X months-2nd-friday
    else if (parts.length > 2) {
      const ordinalsList = ["1st", "2nd", "3rd", "4th", "last"]
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
      const dayLabels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      
      let ordinal = null
      let weekday = null
      
      for (const part of parts) {
        const lowerPart = part.toLowerCase()
        if (ordinalsList.some(ord => lowerPart.includes(ord.toLowerCase()))) {
          ordinal = ordinalsList.find(ord => lowerPart.includes(ord.toLowerCase()))
        }
        const dayIndex = dayNames.findIndex(day => lowerPart.includes(day))
        if (dayIndex !== -1) {
          weekday = dayLabels[dayIndex]
        }
      }
      
      if (ordinal && weekday) {
        if (months === 1) {
          return `Every month on the ${ordinal} ${weekday}`
        } else {
          return `Every ${months} months on the ${ordinal} ${weekday}`
        }
      }
    }
    
    // Fallback to date-based calculation
    if (date) {
      const dayOfMonth = date.getDate()
      const weekday = date.toLocaleDateString('en-US', { weekday: 'long' })
      // Calculate which occurrence of the weekday (e.g., "fourth Tuesday")
      const weekOfMonth = Math.ceil(dayOfMonth / 7)
      const weekNames = ['first', 'second', 'third', 'fourth', 'fifth']
      const weekName = weekNames[weekOfMonth - 1] || `${weekOfMonth}th`
      
      if (months === 1) {
        return `Every month on the ${weekName} ${weekday}`
      } else {
        return `Every ${months} months on the ${weekName} ${weekday}`
      }
    } else {
      if (months === 1) {
        return 'Every month'
      } else {
        return `Every ${months} months`
      }
    }
  }

  // Handle bi-weekly (special case)
  if (freq === 'biweekly' || freq === 'bi-weekly') {
    if (date) {
      const weekday = date.toLocaleDateString('en-US', { weekday: 'long' })
      return `Every 2 weeks on ${weekday}`
    }
    return 'Every 2 weeks'
  }

  // Handle daily frequencies LAST (after weekly/monthly, to avoid matching "friday" or "day-12")
  // Only match if it's specifically "daily" or a number followed by "days" (not part of weekday names)
  // Check for patterns like "daily", "1 day", "2 days", etc. but NOT "friday", "monday", etc.
  const weekdayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  const isWeekday = weekdayNames.some(day => freq === day || freq.includes(`-${day}`) || freq.includes(`${day}-`))
  
  if (!isWeekday && (freq === 'daily' || /^\d+\s*days?$/.test(freq))) {
    const dayMatch = freq.match(/(\d+)\s*days?/) || (freq === 'daily' ? ['', '1'] : null)
    const days = dayMatch ? parseInt(dayMatch[1]) : 1
    
    if (days === 1 || freq === 'daily') {
      return 'Every day'
    } else {
      return `Every ${days} days`
    }
  }

  // Default: return as-is or "Never"
  return frequency || 'Never'
}

/**
 * Formats recurring frequency for display in a compact format (used in job cards)
 * @param {string} frequency - The frequency string
 * @param {Date|string|null} scheduledDate - The scheduled date
 * @returns {string} Compact formatted frequency string
 */
export const formatRecurringFrequencyCompact = (frequency, scheduledDate = null) => {
  const fullFormat = formatRecurringFrequency(frequency, scheduledDate)
  
  // For compact display, simplify some formats
  if (fullFormat === 'Every day') {
    return 'Daily'
  }
  if (fullFormat.includes('Every week on') || fullFormat === 'Every week') {
    return 'Weekly'
  }
  if (fullFormat.includes('Every 2 weeks on') || fullFormat === 'Every 2 weeks') {
    return 'Bi-weekly'
  }
  if (fullFormat.includes('Every month on') || fullFormat === 'Every month') {
    return 'Monthly'
  }
  
  return fullFormat
}


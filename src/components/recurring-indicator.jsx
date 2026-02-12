import React from 'react'
import { RotateCw } from 'lucide-react'
import { formatRecurringFrequencyCompact } from '../utils/recurringUtils'

/**
 * RecurringIndicator Component
 * Displays a visual indicator for recurring jobs with frequency information
 * 
 * @param {Object} props
 * @param {boolean} props.isRecurring - Whether the job is recurring
 * @param {string} props.frequency - The recurring frequency string
 * @param {Date|string} props.scheduledDate - The scheduled date for the job
 * @param {string} props.size - Size variant: 'sm' | 'md' | 'lg' (default: 'sm')
 * @param {boolean} props.showText - Whether to show the frequency text (default: true)
 * @param {string} props.className - Additional CSS classes
 */
const RecurringIndicator = ({ 
  isRecurring, 
  frequency, 
  scheduledDate, 
  size = 'sm',
  showText = true,
  className = ''
}) => {
  if (!isRecurring) return null

  const sizeClasses = {
    sm: {
      icon: 'w-3 h-3',
      text: 'text-xs',
      gap: 'gap-1.5'
    },
    md: {
      icon: 'w-4 h-4',
      text: 'text-sm',
      gap: 'gap-2'
    },
    lg: {
      icon: 'w-5 h-5',
      text: 'text-base',
      gap: 'gap-2'
    }
  }

  const sizes = sizeClasses[size] || sizeClasses.sm

  const formattedFrequency = formatRecurringFrequencyCompact(
    frequency || '', 
    scheduledDate ? (scheduledDate instanceof Date ? scheduledDate : new Date(scheduledDate)) : null
  )

  return (
    <div className={`flex items-center ${sizes.gap} ${className}`}>
      <RotateCw className={`${sizes.icon} text-blue-600 flex-shrink-0`} />
      {showText && (
        <span className={`${sizes.text} text-gray-700 font-medium`}>
          {formattedFrequency}
        </span>
      )}
    </div>
  )
}

export default RecurringIndicator


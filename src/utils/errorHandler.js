/**
 * Enhanced error handling utility for team deletion and other operations
 */

// Error types and their corresponding user-friendly messages
export const ERROR_TYPES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  BUSINESS_RULE_VIOLATION: 'BUSINESS_RULE_VIOLATION',
  DATABASE_ERROR: 'DATABASE_ERROR',
  CONSTRAINT_VIOLATION: 'CONSTRAINT_VIOLATION',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  PERMISSION_DENIED: 'PERMISSION_DENIED'
}

// Default error messages for different scenarios
export const ERROR_MESSAGES = {
  [ERROR_TYPES.VALIDATION_ERROR]: 'The request data is invalid. Please check your input and try again.',
  [ERROR_TYPES.NOT_FOUND]: 'The requested resource was not found.',
  [ERROR_TYPES.BUSINESS_RULE_VIOLATION]: 'This action violates business rules.',
  [ERROR_TYPES.DATABASE_ERROR]: 'A database error occurred. Please try again later.',
  [ERROR_TYPES.CONSTRAINT_VIOLATION]: 'This action cannot be completed due to system constraints.',
  [ERROR_TYPES.SERVICE_UNAVAILABLE]: 'The service is temporarily unavailable. Please try again in a few moments.',
  [ERROR_TYPES.INTERNAL_ERROR]: 'An unexpected error occurred. Please try again later or contact support.',
  [ERROR_TYPES.NETWORK_ERROR]: 'Network error. Please check your internet connection and try again.',
  [ERROR_TYPES.PERMISSION_DENIED]: 'You do not have permission to perform this action.'
}

/**
 * Extract user-friendly error message from API error response
 * @param {Object} error - The error object from API call
 * @returns {Object} - Object containing error message, type, and additional details
 */
export const extractErrorMessage = (error) => {
  let errorMessage = 'An unexpected error occurred. Please try again.'
  let errorType = ERROR_TYPES.INTERNAL_ERROR
  let details = null

  if (error.response?.data) {
    const errorData = error.response.data
    
    // Use user-friendly message if available
    if (errorData.userMessage) {
      errorMessage = errorData.userMessage
    } else if (errorData.error) {
      errorMessage = errorData.error
    }
    
    errorType = errorData.errorType || ERROR_TYPES.INTERNAL_ERROR
    details = errorData.details || null
  } else if (error.message) {
    errorMessage = error.message
  }

  // Handle specific HTTP status codes
  if (error.response?.status) {
    switch (error.response.status) {
      case 400:
        errorType = ERROR_TYPES.BUSINESS_RULE_VIOLATION
        break
      case 401:
        errorType = ERROR_TYPES.PERMISSION_DENIED
        errorMessage = 'You are not authorized to perform this action. Please log in again.'
        break
      case 403:
        errorType = ERROR_TYPES.PERMISSION_DENIED
        errorMessage = 'You do not have permission to perform this action.'
        break
      case 404:
        errorType = ERROR_TYPES.NOT_FOUND
        errorMessage = 'The requested resource was not found.'
        break
      case 500:
        errorType = ERROR_TYPES.INTERNAL_ERROR
        errorMessage = 'Server error occurred. Please try again later or contact support.'
        break
      case 503:
        errorType = ERROR_TYPES.SERVICE_UNAVAILABLE
        errorMessage = 'Service temporarily unavailable. Please try again in a few moments.'
        break
      default:
        // For other status codes, keep the default error type and message
        break
    }
  }

  // Handle network errors
  if (error.code === 'NETWORK_ERROR' || !navigator.onLine) {
    errorType = ERROR_TYPES.NETWORK_ERROR
    errorMessage = 'Network error. Please check your internet connection and try again.'
  }

  return {
    message: errorMessage,
    type: errorType,
    details,
    status: error.response?.status,
    originalError: error
  }
}

/**
 * Get help text for specific error types
 * @param {string} errorType - The error type
 * @param {Object} details - Additional error details
 * @returns {string|null} - Help text or null
 */
export const getErrorHelpText = (errorType, details = null) => {
  switch (errorType) {
    case ERROR_TYPES.BUSINESS_RULE_VIOLATION:
      if (details?.activeJobsCount > 0) {
        return {
          title: 'What you can do:',
          suggestions: [
            'Complete or reassign their active jobs first',
            'Deactivate the team member instead of deleting',
            'Contact support if you need assistance'
          ]
        }
      }
      if (details?.isLastAdmin) {
        return {
          title: 'What you can do:',
          suggestions: [
            'Assign another team member as admin first',
            'Deactivate this team member instead of deleting'
          ]
        }
      }
      break
    case ERROR_TYPES.CONSTRAINT_VIOLATION:
      return {
        title: 'What you can do:',
        suggestions: [
          'Check if the team member has related records',
          'Contact support if you need assistance'
        ]
      }
    case ERROR_TYPES.NETWORK_ERROR:
      return {
        title: 'Troubleshooting:',
        suggestions: [
          'Check your internet connection',
          'Try refreshing the page',
          'Contact support if the problem persists'
        ]
      }
    case ERROR_TYPES.SERVICE_UNAVAILABLE:
      return {
        title: 'What you can do:',
        suggestions: [
          'Wait a few moments and try again',
          'Contact support if the problem persists'
        ]
      }
    default:
      // No specific help text for other error types
      break
  }
  return null
}

/**
 * Format error message for display in UI
 * @param {Object} error - The error object from extractErrorMessage
 * @returns {Object} - Formatted error object for UI display
 */
export const formatErrorForUI = (error) => {
  const helpText = getErrorHelpText(error.type, error.details)
  
  return {
    message: error.message,
    type: error.type,
    details: error.details,
    helpText,
    status: error.status,
    isRetryable: error.type === ERROR_TYPES.NETWORK_ERROR || 
                 error.type === ERROR_TYPES.SERVICE_UNAVAILABLE ||
                 error.type === ERROR_TYPES.INTERNAL_ERROR
  }
}

/**
 * Handle team deletion errors specifically
 * @param {Object} error - The error object from API call
 * @returns {Object} - Formatted error object for team deletion
 */
export const handleTeamDeletionError = (error) => {
  const extractedError = extractErrorMessage(error)
  return formatErrorForUI(extractedError)
}

/**
 * Create error notification object
 * @param {Object} error - The error object from formatErrorForUI
 * @returns {Object} - Notification object for UI
 */
export const createErrorNotification = (error) => {
  return {
    type: 'error',
    message: error.message,
    helpText: error.helpText,
    isRetryable: error.isRetryable,
    duration: 5000 // 5 seconds for error notifications
  }
}

/**
 * Create success notification object
 * @param {string} message - Success message
 * @returns {Object} - Notification object for UI
 */
export const createSuccessNotification = (message) => {
  return {
    type: 'success',
    message,
    duration: 3000 // 3 seconds for success notifications
  }
}

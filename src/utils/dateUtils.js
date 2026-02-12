/**
 * Date utility functions to handle timezone issues
 */

/**
 * Convert a Date object to YYYY-MM-DD format using local timezone
 * This avoids the timezone issues that occur with toISOString()
 * @param {Date} date - The date to format
 * @returns {string} - Date in YYYY-MM-DD format
 */
export const formatDateLocal = (date) => {
  if (!date) return '';
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

/**
 * Convert a Date object to YYYY-MM-DD format using local timezone
 * Alias for formatDateLocal for backward compatibility
 * @param {Date} date - The date to format
 * @returns {string} - Date in YYYY-MM-DD format
 */
export const toLocalDateString = (date) => {
  return formatDateLocal(date);
};

/**
 * Get today's date in YYYY-MM-DD format using local timezone
 * @returns {string} - Today's date in YYYY-MM-DD format
 */
export const getTodayLocal = () => {
  return formatDateLocal(new Date());
};

/**
 * Add days to a date and return in YYYY-MM-DD format using local timezone
 * @param {Date} date - The base date
 * @param {number} days - Number of days to add
 * @returns {string} - New date in YYYY-MM-DD format
 */
export const addDaysLocal = (date, days) => {
  const newDate = new Date(date);
  newDate.setDate(newDate.getDate() + days);
  return formatDateLocal(newDate);
};

/**
 * Parse a date string and return a Date object in local timezone
 * @param {string} dateString - Date string in YYYY-MM-DD format
 * @returns {Date} - Date object in local timezone
 */
export const parseLocalDate = (dateString) => {
  if (!dateString) return new Date();
  
  // If it's already a Date object, return it
  if (dateString instanceof Date) return dateString;
  
  // Parse YYYY-MM-DD format
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
};

/**
 * Format a date string to display format without timezone conversion
 * @param {string} dateString - Date string in YYYY-MM-DD format
 * @returns {string} - Formatted date string like "Oct 7, 2025"
 */
export const formatDateDisplay = (dateString) => {
  if (!dateString) return '';
  
  // Parse YYYY-MM-DD format directly without Date object
  const [year, month, day] = dateString.split('-').map(Number);
  
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  return `${months[month - 1]} ${day}, ${year}`;
};

// Standardized data handler for consistent API response processing
export const normalizeAPIResponse = (response, dataKey = null) => {
  try {
    // Handle different response formats
    if (Array.isArray(response)) {
      return response;
    }
    
    if (response && typeof response === 'object') {
      // If dataKey is specified, look for that key first
      if (dataKey && response[dataKey]) {
        return Array.isArray(response[dataKey]) ? response[dataKey] : [response[dataKey]];
      }
      
      // Common data keys to check
      const commonKeys = ['data', 'items', 'results', 'services', 'jobs', 'customers', 'invoices', 'estimates'];
      
      for (const key of commonKeys) {
        if (response[key] && Array.isArray(response[key])) {
          return response[key];
        }
      }
      
      // If no array found, return the response as is
      return response;
    }
    
    return [];
  } catch (error) {
    console.error('Error normalizing API response:', error);
    return [];
  }
};

// Standardized error handler
export const handleAPIError = (error, context = 'API call') => {
  console.error(`${context} error:`, error);
  
  if (error.response) {
    const { status, data } = error.response;
    return {
      message: data?.error || `Server error (${status})`,
      status,
      type: 'server_error'
    };
  } else if (error.request) {
    return {
      message: 'Network error - please check your connection',
      status: 0,
      type: 'network_error'
    };
  } else {
    return {
      message: error.message || 'Unknown error occurred',
      status: 0,
      type: 'unknown_error'
    };
  }
};

// Data validation helper
export const validateData = (data, requiredFields = []) => {
  if (!data) return false;
  
  for (const field of requiredFields) {
    if (!data[field] && data[field] !== 0) {
      console.warn(`Missing required field: ${field}`);
      return false;
    }
  }
  
  return true;
};

// Safe data access helper
export const safeGet = (obj, path, defaultValue = null) => {
  try {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : defaultValue;
    }, obj);
  } catch (error) {
    console.warn('Error accessing nested property:', error);
    return defaultValue;
  }
};

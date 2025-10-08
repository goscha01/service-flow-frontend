import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'https://service-flow-backend-production-4568.up.railway.app/api',
  timeout: 30000, // Back to 30 seconds since we fixed the email hanging issue
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    console.log('API Request:', config.method?.toUpperCase(), config.url, 'Token:', token ? 'Present' : 'Missing');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log('API Response:', response.status, response.config.url);
    return response;
  },
  (error) => {
    // Don't log canceled requests as errors - they're expected behavior
    if (error.message === 'canceled' || error.code === 'ERR_CANCELED') {
      console.log('🔄 Request was canceled - this is expected behavior');
      return Promise.reject(error);
    }
    
    console.error('API Error:', error.response?.status, error.response?.config?.url, error.message);
    
    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 401:
          console.error('Unauthorized - redirecting to login');
          localStorage.removeItem('authToken');
          localStorage.removeItem('user');
          // Redirect to signin page
          window.location.href = '/signin';
          break;
        case 403:
          console.error('Access forbidden');
          break;
        case 404:
          console.error('Resource not found');
          break;
        case 500:
          console.error('Server error occurred');
          break;
        default:
          console.error('API error:', data?.error || 'Unknown error');
      }
    } else if (error.request) {
      console.error('Network error - no response received');
    } else {
      console.error('Request setup error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

// Authentication API functions
export const authAPI = {
  signup: async (userData) => {
    try {
      const response = await api.post('/auth/signup', userData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  signin: async (credentials) => {
    try {
      const response = await api.post('/auth/signin', credentials);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  signout: () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
  },

  getCurrentUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  isAuthenticated: () => {
    return !!localStorage.getItem('authToken');
  },

  googleAuth: async (googleData) => {
    try {
      const response = await api.post('/auth/google', googleData);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

// Services API functions
export const servicesAPI = {
  getAll: async (userId) => {
    try {
      console.log('🌐 API: Fetching services for user:', userId)
      const response = await api.get(`/services?userId=${userId}`);
      console.log('🌐 API: Services response:', response.data)
      return response.data;
    } catch (error) {
      console.error('🌐 API: Services fetch error:', error)
      throw error;
    }
  },

  getById: async (id) => {
    try {
      console.log('🔍 API: Getting service by ID:', id);
      const response = await api.get(`/services/${id}`);
      console.log('🔍 API: Service response:', response.data);
      console.log('🔍 API: Service modifiers:', response.data.modifiers);
      return response.data;
    } catch (error) {
      console.error('🔍 API: Error getting service:', error);
      throw error;
    }
  },

  create: async (serviceData) => {
    try {
      const response = await api.post('/services', serviceData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  update: async (id, serviceData) => {
    try {
      const response = await api.put(`/services/${id}`, serviceData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  delete: async (id) => {
    try {
      const response = await api.delete(`/services/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getServiceSettings: async () => {
    try {
      const response = await api.get('/services/settings');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateServiceSettings: async (settings) => {
    try {
      const response = await api.put('/services/settings', settings);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getServiceCategories: async (userId) => {
    try {
      const response = await api.get(`/services/categories?userId=${userId}`);
      // The server returns { data: categories }, so we need to extract the data property
      return response.data.data || response.data;
    } catch (error) {
      throw error;
    }
  },

  createCategory: async (categoryData) => {
    try {
      const response = await api.post('/services/categories', categoryData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateCategory: async (id, categoryData) => {
    try {
      const response = await api.put(`/services/categories/${id}`, categoryData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  deleteCategory: async (id) => {
    try {
      console.log('🔄 deleteCategory API called with id:', id);
      console.log('🔄 Making DELETE request to:', `/services/categories/${id}`);
      console.log('🔄 About to make API call...');
      
      const response = await api.delete(`/services/categories/${id}`);
      console.log('✅ DELETE response received:', response);
      console.log('✅ DELETE response data:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ DELETE request failed:', error);
      console.error('❌ Error type:', typeof error);
      console.error('❌ Error name:', error.name);
      console.error('❌ Error message:', error.message);
      if (error.response) {
        console.error('❌ Response status:', error.response.status);
        console.error('❌ Response data:', error.response.data);
      }
      throw error;
    }
  },

  getServices: async () => {
    try {
      const response = await api.get('/services');
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};


export const customersAPI = {
  getAll: async (userId, params = {}) => {
    try {
      const queryParams = new URLSearchParams({ userId });
      
      if (params.search) queryParams.append('search', params.search);
      if (params.status) queryParams.append('status', params.status);
      if (params.page) queryParams.append('page', params.page);
      if (params.limit) queryParams.append('limit', params.limit);
      if (params.sortBy) queryParams.append('sortBy', params.sortBy);
      if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);
      
      console.log('Making customers API call with params:', { userId, ...params });
      const response = await api.get(`/customers?${queryParams}`);
      console.log('Customers API response:', response);
      
      return response.data.customers || response.data;
    } catch (error) {
      console.error('Customers API error:', error);
      throw error;
    }
  },

  getById: async (id) => {
    try {
      const response = await api.get(`/customers/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  create: async (customerData) => {
    try {
      const response = await api.post('/customers', customerData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  update: async (id, customerData) => {
    try {
      const response = await api.put(`/customers/${id}`, customerData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  delete: async (id, userId) => {
    try {
      const response = await api.delete(`/customers/${id}?userId=${userId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  export: async (format = 'csv') => {
    try {
      if (format === 'csv') {
        // For CSV, we need to get the raw response text
        const response = await api.get(`/customers/export?format=${format}`, {
          responseType: 'text'
        });
        return response.data;
      } else {
        // For JSON, return the parsed data
        const response = await api.get(`/customers/export?format=${format}`);
        return response.data;
      }
    } catch (error) {
      throw error;
    }
  },

  importCustomers: async (customers) => {
    try {
      const response = await api.post('/customers/import', { customers });
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};


// Estimates API functions
export const estimatesAPI = {
  getAll: async (userId, params = {}) => {
    try {
      const queryParams = new URLSearchParams({ userId });
      
      if (params.status) queryParams.append('status', params.status);
      if (params.customerId) queryParams.append('customerId', params.customerId);
      if (params.page) queryParams.append('page', params.page);
      if (params.limit) queryParams.append('limit', params.limit);
      if (params.sortBy) queryParams.append('sortBy', params.sortBy);
      if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);
      
      const response = await api.get(`/estimates?${queryParams}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getById: async (id) => {
    try {
      const response = await api.get(`/estimates/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  create: async (estimateData) => {
    try {
      const response = await api.post('/estimates', estimateData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  update: async (id, estimateData) => {
    try {
      const response = await api.put(`/estimates/${id}`, estimateData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  delete: async (id) => {
    try {
      const response = await api.delete(`/estimates/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  send: async (id) => {
    try {
      const response = await api.post(`/estimates/${id}/send`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  convertToInvoice: async (id, dueDate) => {
    try {
      const response = await api.post(`/estimates/${id}/convert-to-invoice`, { dueDate });
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

// Invoices API functions
export const invoicesAPI = {
  getAll: async (userId, params = {}) => {
    try {
      const queryParams = new URLSearchParams({ userId });
      
      if (params.search) queryParams.append('search', params.search);
      if (params.status) queryParams.append('status', params.status);
      if (params.page) queryParams.append('page', params.page);
      if (params.limit) queryParams.append('limit', params.limit);
      if (params.sortBy) queryParams.append('sortBy', params.sortBy);
      if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);
      if (params.customerId) queryParams.append('customerId', params.customerId);
      
      const response = await api.get(`/invoices?${queryParams}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getById: async (id, userId) => {
    try {
      const response = await api.get(`/invoices/${id}?userId=${userId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  create: async (invoiceData) => {
    try {
      const response = await api.post('/invoices', invoiceData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  update: async (id, invoiceData, userId) => {
    try {
      const response = await api.put(`/invoices/${id}`, { ...invoiceData, userId });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateStatus: async (id, status, userId) => {
    try {
      const response = await api.put(`/invoices/${id}/status`, { userId, status });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  delete: async (id, userId) => {
    try {
      const response = await api.delete(`/invoices/${id}?userId=${userId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

// User profile API functions
export const userProfileAPI = {
  getProfile: async (userId) => {
    try {
      const response = await api.get(`/user/profile?userId=${userId}`);
      console.log('🔍 userProfileAPI.getProfile response:', response.data);
      return response.data;
    } catch (error) {
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        throw new Error('Request timeout - please check your connection');
      }
      throw error;
    }
  },

  updateProfile: async (profileData) => {
    try {
      const response = await api.put('/user/profile', profileData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateProfilePicture: async (userId, file) => {
    try {
      console.log('🔍 Uploading profile picture for user:', userId);
      
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('profilePicture', file);
      formData.append('userId', userId);
      
      // Upload to server
      const apiUrl = process.env.REACT_APP_API_URL || 'https://service-flow-backend-production-4568.up.railway.app/api';
      console.log('🔍 Uploading to:', `${apiUrl}/upload/profile-picture`);
      
      const response = await fetch(`${apiUrl}/upload/profile-picture`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('🔍 Profile picture uploaded successfully:', result.profilePictureUrl);
        return { profilePicture: result.profilePictureUrl };
      } else {
        console.error('🔍 Profile picture upload failed:', response.status);
        throw new Error('Failed to upload profile picture');
      }
    } catch (error) {
      console.error('🔍 Profile picture upload error:', error);
      throw error;
    }
  },

  removeProfilePicture: async (userId) => {
    try {
      console.log('🔍 Removing profile picture for user:', userId);
      
      const apiUrl = process.env.REACT_APP_API_URL || 'https://service-flow-backend-production-4568.up.railway.app/api';
      console.log('🔍 Removing from:', `${apiUrl}/user/profile-picture`);
      
      const response = await fetch(`${apiUrl}/user/profile-picture`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ userId })
      });
      
      if (response.ok) {
        console.log('🔍 Profile picture removed successfully');
        return { success: true };
      } else {
        console.error('🔍 Profile picture removal failed:', response.status);
        throw new Error('Failed to remove profile picture');
      }
    } catch (error) {
      console.error('🔍 Profile picture removal error:', error);
      throw error;
    }
  },

  updatePassword: async (passwordData) => {
    try {
      const response = await api.put('/user/password', passwordData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateEmail: async (emailData) => {
    try {
      const response = await api.put('/user/email', emailData);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

// Notification Templates API functions
export const notificationTemplatesAPI = {
  getTemplates: async (userId, templateType = null, notificationName = null) => {
    try {
      const params = new URLSearchParams({ userId });
      if (templateType) params.append('templateType', templateType);
      if (notificationName) params.append('notificationName', notificationName);
      
      const response = await api.get(`/user/notification-templates?${params}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateTemplate: async (templateData) => {
    try {
      const response = await api.put('/user/notification-templates', templateData);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

// Notification Settings API functions
export const notificationSettingsAPI = {
  getSettings: async (userId) => {
    try {
      const response = await api.get(`/user/notification-settings?userId=${userId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateSetting: async (settingData) => {
    try {
      const response = await api.put('/user/notification-settings', settingData);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

// Public booking API functions
export const publicBookingAPI = {
  getUserBySlug: async (slug) => {
    try {
      const response = await api.get(`/public/user/${slug}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getServices: async (userId) => {
    try {
      const response = await api.get(`/public/services/${userId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getBusinessInfo: async (userId) => {
    try {
      const response = await api.get(`/public/user/${userId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getAvailability: async (userId, date) => {
    try {
      const response = await api.get(`/public/availability/${userId}?date=${date}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  createBooking: async (bookingData) => {
    try {
      const response = await api.post('/public/bookings', bookingData);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

// Jobs API functions
export const jobsAPI = {
  getAll: async (userId, status, search, page = 1, limit = 20, dateFilter, dateRange, sortBy, sortOrder, teamMember, invoiceStatus, customerId, territoryId, signal) => {
    try {
      const params = new URLSearchParams({ userId });
      if (status) params.append('status', status);
      if (search) params.append('search', search);
      if (page) params.append('page', page);
      if (limit) params.append('limit', limit);
      if (dateFilter) params.append('dateFilter', dateFilter);
      if (dateRange) params.append('dateRange', dateRange);
      if (sortBy) params.append('sortBy', sortBy);
      if (sortOrder) params.append('sortOrder', sortOrder);
      if (teamMember) params.append('teamMember', teamMember);
      if (invoiceStatus) params.append('invoiceStatus', invoiceStatus);
      if (customerId) params.append('customerId', customerId);
      if (territoryId) params.append('territoryId', territoryId);
      
      const config = signal ? { signal } : {};
      const response = await api.get(`/jobs?${params}`, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getById: async (id) => {
    try {
      const response = await api.get(`/jobs/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  create: async (jobData) => {
    try {
      const response = await api.post('/jobs', jobData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  update: async (id, jobData) => {
    try {
      const response = await api.put(`/jobs/${id}`, jobData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  delete: async (id) => {
    try {
      const response = await api.delete(`/jobs/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateStatus: async (id, status) => {
    try {
      const response = await api.patch(`/jobs/${id}/status`, { status });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  assignToTeamMember: async (jobId, teamMemberId) => {
    try {
      const response = await api.post(`/jobs/${jobId}/assign`, { teamMemberId });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  removeTeamMember: async (jobId, teamMemberId) => {
    try {
      const response = await api.delete(`/jobs/${jobId}/assign/${teamMemberId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  assignMultipleTeamMembers: async (jobId, teamMemberIds, primaryMemberId) => {
    try {
      const response = await api.post(`/jobs/${jobId}/assign-multiple`, { 
        teamMemberIds, 
        primaryMemberId 
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getTeamAssignments: async (jobId) => {
    try {
      const response = await api.get(`/jobs/${jobId}/assignments`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  export: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
          params.append(key, filters[key]);
        }
      });
      
      const response = await api.get(`/jobs/export?${params.toString()}`, {
        responseType: 'text'
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  importJobs: async (jobs) => {
    try {
      const response = await api.post('/jobs/import', { jobs });
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

// Team Management API functions
export const teamAPI = {
  getAll: async (userId, params = {}) => {
    try {
      const queryParams = new URLSearchParams({ userId });
      
      if (params.status) queryParams.append('status', params.status);
      if (params.search) queryParams.append('search', params.search);
      if (params.page) queryParams.append('page', params.page);
      if (params.limit) queryParams.append('limit', params.limit);
      if (params.sortBy) queryParams.append('sortBy', params.sortBy);
      if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);
      
      const response = await api.get(`/team-members?${queryParams}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getById: async (id) => {
    try {
      const response = await api.get(`/team-members/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  create: async (teamMemberData) => {
    try {
      const response = await api.post('/team-members/register', teamMemberData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  update: async (id, teamMemberData) => {
    try {
      const response = await api.put(`/team-members/${id}`, teamMemberData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  delete: async (id) => {
    try {
      const response = await api.delete(`/team-members/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getAvailability: async (id, startDate, endDate) => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const response = await api.get(`/team-members/${id}/availability?${params}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateAvailability: async (id, availability) => {
    try {
      const response = await api.put(`/team-members/${id}/availability`, { availability });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getAnalytics: async (userId, startDate, endDate) => {
    try {
      const params = new URLSearchParams({ userId });
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const response = await api.get(`/team-analytics?${params}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  resendInvite: async (memberId) => {
    try {
      const response = await api.post(`/team-members/${memberId}/resend-invite`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getPerformance: async (memberId) => {
    try {
      const response = await api.get(`/team-members/${memberId}/performance`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getSettings: async (memberId) => {
    try {
      const response = await api.get(`/team-members/${memberId}/settings`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateSettings: async (memberId, settings) => {
    try {
      const response = await api.put(`/team-members/${memberId}/settings`, { settings });
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

// Service Templates API functions
export const serviceTemplatesAPI = {
  getAll: async () => {
    try {
      const response = await api.get('/service-templates');
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

// Service Availability API functions
export const serviceAvailabilityAPI = {
  getAvailability: async (serviceId) => {
    try {
      const response = await api.get(`/services/${serviceId}/availability`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateAvailability: async (serviceId, availabilityData) => {
    try {
      const response = await api.put(`/services/${serviceId}/availability`, availabilityData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  createSchedulingRule: async (serviceId, ruleData) => {
    try {
      const response = await api.post(`/services/${serviceId}/scheduling-rules`, ruleData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  deleteSchedulingRule: async (serviceId, ruleId) => {
    try {
      const response = await api.delete(`/services/${serviceId}/scheduling-rules/${ruleId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  createTimeslotTemplate: async (serviceId, templateData) => {
    try {
      const response = await api.post(`/services/${serviceId}/timeslot-templates`, templateData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateTimeslotTemplate: async (serviceId, templateId, templateData) => {
    try {
      const response = await api.put(`/services/${serviceId}/timeslot-templates/${templateId}`, templateData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  deleteTimeslotTemplate: async (serviceId, templateId) => {
    try {
      const response = await api.delete(`/services/${serviceId}/timeslot-templates/${templateId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

// Availability API functions
export const availabilityAPI = {
  getAvailability: async (userId) => {
    try {
      const response = await api.get(`/user/availability?userId=${userId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateAvailability: async (availabilityData) => {
    try {
      const response = await api.put('/user/availability', availabilityData);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

// Service areas API functions
export const serviceAreasAPI = {
  getServiceAreas: async (userId) => {
    try {
      const response = await api.get(`/user/service-areas?userId=${userId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateServiceAreas: async (serviceAreasData) => {
    try {
      const response = await api.put('/user/service-areas', serviceAreasData);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

// Billing API functions
export const billingAPI = {
  getBilling: async (userId) => {
    try {
      const response = await api.get(`/user/billing?userId=${userId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  createSetupIntent: async (userData) => {
    try {
      const response = await api.post('/user/billing/setup-intent', userData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  createSubscription: async (subscriptionData) => {
    try {
      const response = await api.post('/user/billing/subscription', subscriptionData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getPaymentMethods: async (userId) => {
    try {
      const response = await api.get(`/user/billing/payment-methods?userId=${userId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  cancelSubscription: async (userId) => {
    try {
      const response = await api.post('/user/billing/cancel-subscription', { userId });
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

// Payment settings API functions
export const paymentSettingsAPI = {
  getPaymentSettings: async () => {
    try {
      const response = await api.get('/user/payment-settings');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updatePaymentSettings: async (settings) => {
    try {
      const response = await api.put('/user/payment-settings', settings);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  setupPaymentProcessor: async (processor) => {
    try {
      const response = await api.post('/user/payment-processor/setup', { processor });
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

// Payment methods API functions
export const paymentMethodsAPI = {
  getPaymentMethods: async () => {
    try {
      const response = await api.get('/user/payment-methods');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  createPaymentMethod: async (paymentMethod) => {
    try {
      const response = await api.post('/user/payment-methods', paymentMethod);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updatePaymentMethod: async (id, paymentMethod) => {
    try {
      const response = await api.put(`/user/payment-methods/${id}`, paymentMethod);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  deletePaymentMethod: async (id) => {
    try {
      const response = await api.delete(`/user/payment-methods/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

// Branding API functions
export const brandingAPI = {
  getBranding: async (userId) => {
    try {
      console.log('🔍 Frontend: Calling getBranding with userId:', userId);
      
      // Add a timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 10000)
      );
      
      const apiPromise = api.get(`/user/branding?userId=${userId}`);
      const response = await Promise.race([apiPromise, timeoutPromise]);
      
      console.log('🔍 Frontend: getBranding response:', response.data);
      return response.data;
    } catch (error) {
      console.error('🔍 Frontend: getBranding error:', error);
      throw error;
    }
  },

  updateBranding: async (brandingData) => {
    try {
      console.log('🔍 Frontend: Calling updateBranding with data:', brandingData);
      const response = await api.put('/user/branding', brandingData);
      console.log('🔍 Frontend: updateBranding response:', response.data);
      return response.data;
    } catch (error) {
      console.error('🔍 Frontend: updateBranding error:', error);
      throw error;
    }
  }
};

// Business Details API functions
export const businessDetailsAPI = {
  getBusinessDetails: async (userId) => {
    try {
      const response = await api.get(`/user/business-details?userId=${userId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateBusinessDetails: async (businessData) => {
    try {
      const response = await api.put('/user/business-details', businessData);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

// Territory Management API functions
export const territoriesAPI = {
  getAll: async (userId, params = {}) => {
    try {
      const queryParams = new URLSearchParams({ userId });
      
      if (params.status) queryParams.append('status', params.status);
      if (params.search) queryParams.append('search', params.search);
      if (params.page) queryParams.append('page', params.page);
      if (params.limit) queryParams.append('limit', params.limit);
      if (params.sortBy) queryParams.append('sortBy', params.sortBy);
      if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);
      
      const response = await api.get(`/territories?${queryParams}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getById: async (id) => {
    try {
      const response = await api.get(`/territories/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  create: async (territoryData) => {
    try {
      const response = await api.post('/territories', territoryData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  update: async (id, territoryData) => {
    try {
      const response = await api.put(`/territories/${id}`, territoryData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  delete: async (id) => {
    try {
      const response = await api.delete(`/territories/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getPricing: async (id) => {
    try {
      const response = await api.get(`/territories/${id}/pricing`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updatePricing: async (id, pricingData) => {
    try {
      const response = await api.post(`/territories/${id}/pricing`, pricingData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getAnalytics: async (id, startDate, endDate) => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const response = await api.get(`/territories/${id}/analytics?${params}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Territory detection based on customer location
  detectTerritory: async (userId, customerAddress, customerZipCode) => {
    try {
      const response = await api.post('/territories/detect', {
        userId,
        customerAddress,
        customerZipCode
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get available team members for a territory
  getTerritoryTeamMembers: async (territoryId) => {
    try {
      const response = await api.get(`/territories/${territoryId}/team-members`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get territory business hours
  getTerritoryBusinessHours: async (territoryId) => {
    try {
      const response = await api.get(`/territories/${territoryId}/business-hours`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

// Analytics API functions
export const analyticsAPI = {
  getOverview: async (userId, startDate, endDate) => {
    try {
      const params = new URLSearchParams({ userId });
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const response = await api.get(`/analytics/overview?${params}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getRevenue: async (userId, startDate, endDate, groupBy = 'day') => {
    try {
      const params = new URLSearchParams({ userId, groupBy });
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const response = await api.get(`/analytics/revenue?${params}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getTeamPerformance: async (userId, startDate, endDate) => {
    try {
      const params = new URLSearchParams({ userId });
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const response = await api.get(`/analytics/team-performance?${params}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getCustomerInsights: async (userId, startDate, endDate) => {
    try {
      const params = new URLSearchParams({ userId });
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const response = await api.get(`/analytics/customer-insights?${params}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getServicePerformance: async (userId, startDate, endDate) => {
    try {
      const params = new URLSearchParams({ userId });
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const response = await api.get(`/analytics/service-performance?${params}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

// Payment API functions
export const paymentAPI = {
  createPaymentIntent: async (amount, currency = 'usd', metadata = {}) => {
    try {
      const response = await api.post('/payments/create-payment-intent', {
        amount,
        currency,
        metadata
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  confirmPayment: async (paymentIntentId, invoiceId, customerId) => {
    try {
      const response = await api.post('/payments/confirm-payment', {
        paymentIntentId,
        invoiceId,
        customerId
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  createSubscription: async (customerId, priceId, metadata = {}) => {
    try {
      const response = await api.post('/payments/create-subscription', {
        customerId,
        priceId,
        metadata
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

// Tax API functions
export const taxAPI = {
  calculateTax: async (subtotal, state, city, zipCode) => {
    try {
      const response = await api.post('/tax/calculate', {
        subtotal,
        state,
        city,
        zipCode
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

// Notification API functions
export const notificationAPI = {
  sendEmail: async (to, subject, html, text) => {
    try {
      const response = await api.post('/notifications/send-email', {
        to,
        subject,
        html,
        text
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getPreferences: async (customerId) => {
    try {
      const response = await api.get(`/customers/${customerId}/notifications`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updatePreferences: async (customerId, preferences) => {
    try {
      const response = await api.put(`/customers/${customerId}/notifications`, preferences);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getHistory: async (customerId) => {
    try {
      const response = await api.get(`/customers/${customerId}/notifications/history`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

// Google Calendar API functions
export const calendarAPI = {
  syncJob: async (jobData) => {
    try {
      const response = await api.post('/calendar/sync-job', jobData);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

// Google Sheets API functions
export const sheetsAPI = {
  exportCustomers: async (userId) => {
    try {
      const response = await api.post('/sheets/export-customers', { userId });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  exportJobs: async (userId, dateRange = null) => {
    try {
      const response = await api.post('/sheets/export-jobs', { userId, dateRange });
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

// SMS API functions
export const smsAPI = {
  sendSMS: async (to, message) => {
    try {
      const response = await api.post('/sms/send', { to, message });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  sendJobConfirmation: async (customerPhone, jobDetails, customerName) => {
    try {
      const response = await api.post('/sms/job-confirmation', { 
        customerPhone, 
        jobDetails, 
        customerName 
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  sendPaymentReminder: async (customerPhone, invoiceDetails, customerName) => {
    try {
      const response = await api.post('/sms/payment-reminder', { 
        customerPhone, 
        invoiceDetails, 
        customerName 
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

// Twilio Connect API functions
export const twilioConnectAPI = {
  createAccountLink: async () => {
    try {
      const response = await api.post('/twilio/connect/account-link');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getAccountStatus: async () => {
    try {
      const response = await api.get('/twilio/connect/account-status');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  disconnect: async () => {
    try {
      const response = await api.delete('/twilio/connect/disconnect');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  sendSMS: async (to, message) => {
    try {
      const response = await api.post('/twilio/connect/send-sms', { to, message });
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

// Health check API
export const healthAPI = {
  check: async () => {
    try {
      const response = await api.get('/health');
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

// Requests API functions
export const requestsAPI = {
  getAll: async (userId, params = {}) => {
    try {
      const queryParams = new URLSearchParams({ userId });
      
      if (params.filter) queryParams.append('filter', params.filter);
      if (params.status) queryParams.append('status', params.status);
      if (params.page) queryParams.append('page', params.page);
      if (params.limit) queryParams.append('limit', params.limit);
      if (params.sortBy) queryParams.append('sortBy', params.sortBy);
      if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);
      
      console.log('Making requests API call with params:', params);
      const response = await api.get(`/requests?${queryParams}`);
      console.log('Requests API response:', response);
      
      return response.data.requests || response.data;
    } catch (error) {
      console.error('Requests API error:', error);
      throw error;
    }
  },

  getById: async (id) => {
    try {
      const response = await api.get(`/requests/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  create: async (requestData) => {
    try {
      const response = await api.post('/requests', requestData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  update: async (id, requestData) => {
    try {
      const response = await api.put(`/requests/${id}`, requestData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  delete: async (id) => {
    try {
      const response = await api.delete(`/requests/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  approve: async (id) => {
    try {
      const response = await api.post(`/requests/${id}/approve`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  reject: async (id, reason) => {
    try {
      const response = await api.post(`/requests/${id}/reject`, { reason });
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

// Address Validation API functions
export const addressValidationAPI = {
  validate: async (address) => {
    try {
      const response = await api.post('/address/validate', { address });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  geocode: async (address) => {
    try {
      const response = await api.post('/address/geocode', { address });
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

// Google Places API functions
export const placesAPI = {
  autocomplete: async (input) => {
    try {
      const response = await api.get(`/places/autocomplete?input=${encodeURIComponent(input)}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getDetails: async (placeId) => {
    try {
      const response = await api.get(`/places/details?place_id=${placeId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

export default api; 
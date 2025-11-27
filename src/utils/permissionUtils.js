/**
 * Permission-based access control utilities
 * 
 * This utility checks specific permissions for team members based on:
 * 1. Their role (owner, manager, scheduler, worker)
 * 2. Their stored permissions object (from database)
 * 
 * Permissions are stored in the user object as user.permissions
 */

/**
 * Get user permissions from user object
 * @param {Object} user - User object from AuthContext
 * @returns {Object} - Permissions object or empty object
 */
export const getUserPermissions = (user) => {
  if (!user) return {};
  
  // Permissions might be stored as:
  // - user.permissions (object)
  // - user.permissions (JSON string - needs parsing)
  // - user.teamMember?.permissions
  let permissions = user.permissions || user.teamMember?.permissions || {};
  
  // If permissions is a string, parse it
  if (typeof permissions === 'string') {
    try {
      permissions = JSON.parse(permissions);
    } catch (e) {
      console.error('Error parsing permissions:', e);
      permissions = {};
    }
  }
  
  return permissions || {};
};

/**
 * Get user role (from roleUtils)
 */
import { getUserRole, isAccountOwner, isManager, isScheduler, isWorker } from './roleUtils';

/**
 * Check if user has a specific permission
 * @param {Object} user - User object from AuthContext
 * @param {string} permission - Permission name to check
 * @returns {boolean}
 */
export const hasPermission = (user, permission) => {
  if (!user) return false;
  
  const role = getUserRole(user);
  const permissions = getUserPermissions(user);
  
  // Account owners and managers have all permissions by default
  if (role === 'owner' || role === 'manager') {
    return true;
  }
  
  // Schedulers: check specific permission, default to true unless explicitly false
  if (role === 'scheduler') {
    // If permission is explicitly set to false, deny it
    if (permissions[permission] === false) {
      return false;
    }
    // If permission is explicitly set to true, allow it
    if (permissions[permission] === true) {
      return true;
    }
    // If not set, default to true for schedulers (they have broader access)
    return true;
  }
  
  // Workers: ONLY allow if permission is explicitly set to true
  // Each checkbox must be checked individually - no defaults
  if (role === 'worker') {
    // Workers must have the permission explicitly enabled (checked)
    return permissions[permission] === true;
  }
  
  // Default: no permission
  return false;
};

/**
 * Permission checkers for specific actions
 */

// Availability permissions
export const canEditOwnAvailability = (user) => {
  if (isAccountOwner(user) || isManager(user)) return true;
  if (isScheduler(user)) {
    // Schedulers can edit availability unless explicitly denied
    return hasPermission(user, 'editAvailability');
  }
  // Workers: must have permission explicitly checked
  return hasPermission(user, 'editAvailability');
};

// Customer permissions
export const canViewCustomerContact = (user) => {
  if (isAccountOwner(user) || isManager(user)) return true;
  if (isScheduler(user)) {
    // Schedulers have access by default
    return hasPermission(user, 'viewCustomerContact');
  }
  // Workers: must have permission explicitly checked
  return hasPermission(user, 'viewCustomerContact');
};

export const canViewCustomerNotes = (user) => {
  if (isAccountOwner(user) || isManager(user)) return true;
  if (isScheduler(user)) {
    // Schedulers have access by default
    return hasPermission(user, 'viewCustomerNotes');
  }
  // Workers: must have permission explicitly checked
  return hasPermission(user, 'viewCustomerNotes');
};

// Job status permissions
export const canMarkJobStatus = (user) => {
  if (isAccountOwner(user) || isManager(user)) return true;
  if (isScheduler(user)) {
    // Schedulers can mark job status by default
    return hasPermission(user, 'markJobStatus');
  }
  // Workers: must have permission explicitly checked
  return hasPermission(user, 'markJobStatus');
};

export const canResetJobStatuses = (user) => {
  if (isAccountOwner(user) || isManager(user)) return true;
  if (isScheduler(user)) {
    // Schedulers can reset statuses by default
    return hasPermission(user, 'resetJobStatuses');
  }
  // Workers: must have permission explicitly checked
  return hasPermission(user, 'resetJobStatuses');
};

// Job editing permissions
export const canEditJobDetails = (user) => {
  if (isAccountOwner(user) || isManager(user)) return true;
  if (isScheduler(user)) {
    // Schedulers can edit job details by default
    return hasPermission(user, 'editJobDetails');
  }
  // Workers: must have permission explicitly checked
  return hasPermission(user, 'editJobDetails');
};

export const canViewEditJobPrice = (user) => {
  if (isAccountOwner(user) || isManager(user)) return true;
  if (isScheduler(user)) {
    // Schedulers can view/edit prices by default
    return hasPermission(user, 'viewEditJobPrice');
  }
  // Workers: must have permission explicitly checked
  return hasPermission(user, 'viewEditJobPrice');
};

export const canRescheduleJobs = (user) => {
  if (isAccountOwner(user) || isManager(user)) return true;
  if (isScheduler(user)) {
    // Schedulers can reschedule by default
    return hasPermission(user, 'rescheduleJobs');
  }
  // Workers: must have permission explicitly checked
  return hasPermission(user, 'rescheduleJobs');
};

// Payment permissions
export const canProcessPayments = (user) => {
  if (isAccountOwner(user) || isManager(user)) return true;
  // Both schedulers and workers need explicit permission for payments
  return hasPermission(user, 'processPayments');
};

// Team member visibility
export const canSeeOtherProviders = (user) => {
  if (isAccountOwner(user) || isManager(user)) return true;
  if (isScheduler(user)) {
    // Schedulers can see other providers by default
    return hasPermission(user, 'seeOtherProviders');
  }
  // Workers: must have permission explicitly checked
  return hasPermission(user, 'seeOtherProviders');
};

/**
 * Check if user can view/edit a specific job
 * Workers can only view/edit jobs assigned to them
 * @param {Object} user - User object
 * @param {Object} job - Job object
 * @returns {boolean}
 */
export const canAccessJob = (user, job) => {
  if (!user || !job) return false;
  
  const role = getUserRole(user);
  
  // Owners, managers, and schedulers can access all jobs
  if (role === 'owner' || role === 'manager' || role === 'scheduler') {
    return true;
  }
  
  // Workers can only access jobs assigned to them
  if (role === 'worker') {
    // Check if job is assigned to this worker
    // Job might have assigned_workers array or team_member_id
    const assignedWorkers = job.assigned_workers || job.team_members || [];
    const workerId = user.teamMemberId || user.id;
    
    if (Array.isArray(assignedWorkers)) {
      return assignedWorkers.some(worker => {
        const id = typeof worker === 'object' ? worker.id || worker.team_member_id : worker;
        return id === workerId;
      });
    }
    
    // Fallback: check team_member_id
    return job.team_member_id === workerId;
  }
  
  return false;
};

/**
 * Get default permissions for a role
 * @param {string} role - User role
 * @returns {Object} - Default permissions object
 */
export const getDefaultPermissionsForRole = (role) => {
  const normalizedRole = role?.toLowerCase();
  
  if (normalizedRole === 'manager' || normalizedRole === 'owner' || normalizedRole === 'account owner') {
    return {
      editAvailability: true,
      viewCustomerContact: true,
      viewCustomerNotes: true,
      markJobStatus: true,
      resetJobStatuses: true,
      editJobDetails: true,
      viewEditJobPrice: true,
      processPayments: true,
      rescheduleJobs: true,
      seeOtherProviders: true
    };
  }
  
  if (normalizedRole === 'scheduler') {
    return {
      editAvailability: true,
      viewCustomerContact: true,
      viewCustomerNotes: true,
      markJobStatus: true,
      resetJobStatuses: true,
      editJobDetails: true,
      viewEditJobPrice: true,
      processPayments: false, // Default unchecked for scheduler
      rescheduleJobs: true,
      seeOtherProviders: true
    };
  }
  
  if (normalizedRole === 'worker') {
    return {
      editAvailability: true,
      viewCustomerContact: false,
      viewCustomerNotes: false,
      markJobStatus: true,
      resetJobStatuses: false,
      editJobDetails: true,
      viewEditJobPrice: false,
      processPayments: false,
      rescheduleJobs: true,
      seeOtherProviders: true
    };
  }
  
  // Default: no permissions
  return {};
};


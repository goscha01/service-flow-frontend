import { getUserRole, isAccountOwner, isManager, isScheduler, isWorker, canAccessRoute, canCreateJobs, getAllowedSidebarItems } from './roleUtils';

describe('roleUtils', () => {
  describe('getUserRole', () => {
    it('returns null for null/undefined user', () => {
      expect(getUserRole(null)).toBeNull();
      expect(getUserRole(undefined)).toBeNull();
    });

    it('returns owner for users with no role', () => {
      expect(getUserRole({})).toBe('owner');
    });

    it('returns owner for "account owner" role', () => {
      expect(getUserRole({ role: 'account owner' })).toBe('owner');
    });

    it('returns owner for "admin" role', () => {
      expect(getUserRole({ role: 'admin' })).toBe('owner');
    });

    it('returns manager for manager role', () => {
      expect(getUserRole({ role: 'manager' })).toBe('manager');
    });

    it('returns scheduler for scheduler role', () => {
      expect(getUserRole({ role: 'scheduler' })).toBe('scheduler');
    });

    it('returns worker for worker role', () => {
      expect(getUserRole({ role: 'worker' })).toBe('worker');
    });

    it('returns worker for technician role', () => {
      expect(getUserRole({ role: 'technician' })).toBe('worker');
    });

    it('returns worker for field_worker role', () => {
      expect(getUserRole({ role: 'field_worker' })).toBe('worker');
    });

    it('returns worker for team member with no explicit role', () => {
      expect(getUserRole({ teamMemberId: 123 })).toBe('worker');
    });

    it('reads role from teamMemberRole field', () => {
      expect(getUserRole({ teamMemberRole: 'scheduler' })).toBe('scheduler');
    });

    it('reads role from nested teamMember.role', () => {
      expect(getUserRole({ teamMember: { role: 'manager' } })).toBe('manager');
    });

    it('is case-insensitive', () => {
      expect(getUserRole({ role: 'Manager' })).toBe('manager');
      expect(getUserRole({ role: 'WORKER' })).toBe('worker');
    });
  });

  describe('role check helpers', () => {
    it('isAccountOwner', () => {
      expect(isAccountOwner({ role: 'owner' })).toBe(true);
      expect(isAccountOwner({ role: 'manager' })).toBe(false);
    });

    it('isManager', () => {
      expect(isManager({ role: 'manager' })).toBe(true);
      expect(isManager({ role: 'owner' })).toBe(false);
    });

    it('isScheduler', () => {
      expect(isScheduler({ role: 'scheduler' })).toBe(true);
      expect(isScheduler({ role: 'worker' })).toBe(false);
    });

    it('isWorker', () => {
      expect(isWorker({ role: 'worker' })).toBe(true);
      expect(isWorker({ role: 'scheduler' })).toBe(false);
    });
  });

  describe('canCreateJobs', () => {
    it('allows owners to create jobs', () => {
      expect(canCreateJobs({ role: 'owner' })).toBe(true);
    });

    it('allows managers to create jobs', () => {
      expect(canCreateJobs({ role: 'manager' })).toBe(true);
    });

    it('allows schedulers to create jobs', () => {
      expect(canCreateJobs({ role: 'scheduler' })).toBe(true);
    });

    it('denies workers from creating jobs', () => {
      expect(canCreateJobs({ role: 'worker' })).toBe(false);
    });
  });

  describe('canAccessRoute', () => {
    const owner = { role: 'owner' };
    const manager = { role: 'manager' };
    const worker = { role: 'worker', teamMemberId: 5 };

    it('gives owners full access', () => {
      expect(canAccessRoute(owner, '/dashboard')).toBe(true);
      expect(canAccessRoute(owner, '/analytics')).toBe(true);
      expect(canAccessRoute(owner, '/settings/billing')).toBe(true);
    });

    it('restricts analytics to owners only', () => {
      expect(canAccessRoute(manager, '/analytics')).toBe(false);
      expect(canAccessRoute(worker, '/analytics')).toBe(false);
    });

    it('restricts billing for managers', () => {
      expect(canAccessRoute(manager, '/settings/billing')).toBe(false);
      expect(canAccessRoute(manager, '/settings/account')).toBe(false);
    });

    it('allows workers to access dashboard and schedule', () => {
      expect(canAccessRoute(worker, '/dashboard')).toBe(true);
      expect(canAccessRoute(worker, '/schedule')).toBe(true);
      expect(canAccessRoute(worker, '/jobs')).toBe(true);
    });

    it('restricts workers from stripe and sms settings', () => {
      expect(canAccessRoute(worker, '/settings/stripe-connect')).toBe(false);
      expect(canAccessRoute(worker, '/settings/sms-settings')).toBe(false);
    });

    it('allows all users to access availability', () => {
      expect(canAccessRoute(owner, '/availability')).toBe(true);
      expect(canAccessRoute(manager, '/availability')).toBe(true);
      expect(canAccessRoute(worker, '/availability')).toBe(true);
    });
  });

  describe('getAllowedSidebarItems', () => {
    it('returns analytics for owners only', () => {
      const ownerItems = getAllowedSidebarItems({ role: 'owner' });
      const managerItems = getAllowedSidebarItems({ role: 'manager' });
      expect(ownerItems).toContain('/analytics');
      expect(managerItems).not.toContain('/analytics');
    });

    it('returns limited items for workers', () => {
      const workerItems = getAllowedSidebarItems({ role: 'worker' });
      expect(workerItems).toContain('/dashboard');
      expect(workerItems).toContain('/schedule');
      expect(workerItems).toContain('/jobs');
      expect(workerItems).not.toContain('/customers');
      expect(workerItems).not.toContain('/invoices');
    });
  });
});

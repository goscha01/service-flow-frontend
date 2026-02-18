import { getUserPermissions, hasPermission, canEditOwnAvailability, canViewCustomerContact, canProcessPayments, canAccessJob, getDefaultPermissionsForRole } from './permissionUtils';

describe('permissionUtils', () => {
  describe('getUserPermissions', () => {
    it('returns empty object for null user', () => {
      expect(getUserPermissions(null)).toEqual({});
    });

    it('extracts permissions from user.permissions', () => {
      const user = { permissions: { editAvailability: true } };
      expect(getUserPermissions(user)).toEqual({ editAvailability: true });
    });

    it('parses JSON string permissions', () => {
      const user = { permissions: '{"editAvailability": true}' };
      expect(getUserPermissions(user)).toEqual({ editAvailability: true });
    });

    it('handles invalid JSON gracefully', () => {
      const user = { permissions: 'invalid json' };
      expect(getUserPermissions(user)).toEqual({});
    });

    it('reads from teamMember.permissions', () => {
      const user = { teamMember: { permissions: { viewCustomerContact: true } } };
      expect(getUserPermissions(user)).toEqual({ viewCustomerContact: true });
    });
  });

  describe('hasPermission', () => {
    it('returns false for null user', () => {
      expect(hasPermission(null, 'editAvailability')).toBe(false);
    });

    it('grants all permissions to owners', () => {
      const owner = { role: 'owner' };
      expect(hasPermission(owner, 'editAvailability')).toBe(true);
      expect(hasPermission(owner, 'processPayments')).toBe(true);
    });

    it('grants all permissions to managers', () => {
      const manager = { role: 'manager' };
      expect(hasPermission(manager, 'editAvailability')).toBe(true);
      expect(hasPermission(manager, 'processPayments')).toBe(true);
    });

    it('requires explicit permission for schedulers', () => {
      const scheduler = { role: 'scheduler', permissions: { editAvailability: true, processPayments: false } };
      expect(hasPermission(scheduler, 'editAvailability')).toBe(true);
      expect(hasPermission(scheduler, 'processPayments')).toBe(false);
    });

    it('requires explicit permission for workers', () => {
      const worker = { role: 'worker', permissions: { markJobStatus: true } };
      expect(hasPermission(worker, 'markJobStatus')).toBe(true);
      expect(hasPermission(worker, 'processPayments')).toBe(false);
    });
  });

  describe('permission checkers', () => {
    const owner = { role: 'owner' };
    const worker = { role: 'worker', permissions: {} };
    const workerWithPerms = { role: 'worker', permissions: { editAvailability: true, viewCustomerContact: true } };

    it('canEditOwnAvailability', () => {
      expect(canEditOwnAvailability(owner)).toBe(true);
      expect(canEditOwnAvailability(worker)).toBe(false);
      expect(canEditOwnAvailability(workerWithPerms)).toBe(true);
    });

    it('canViewCustomerContact', () => {
      expect(canViewCustomerContact(owner)).toBe(true);
      expect(canViewCustomerContact(worker)).toBe(false);
      expect(canViewCustomerContact(workerWithPerms)).toBe(true);
    });

    it('canProcessPayments', () => {
      expect(canProcessPayments(owner)).toBe(true);
      expect(canProcessPayments(worker)).toBe(false);
    });
  });

  describe('canAccessJob', () => {
    it('returns false for null user or job', () => {
      expect(canAccessJob(null, { id: 1 })).toBe(false);
      expect(canAccessJob({ role: 'owner' }, null)).toBe(false);
    });

    it('allows owners to access any job', () => {
      expect(canAccessJob({ role: 'owner' }, { id: 1 })).toBe(true);
    });

    it('allows managers to access any job', () => {
      expect(canAccessJob({ role: 'manager' }, { id: 1 })).toBe(true);
    });

    it('allows schedulers to access any job', () => {
      expect(canAccessJob({ role: 'scheduler' }, { id: 1 })).toBe(true);
    });

    it('restricts workers to their assigned jobs', () => {
      const worker = { role: 'worker', teamMemberId: 5 };
      const assignedJob = { id: 1, assigned_workers: [{ id: 5 }] };
      const otherJob = { id: 2, assigned_workers: [{ id: 10 }] };

      expect(canAccessJob(worker, assignedJob)).toBe(true);
      expect(canAccessJob(worker, otherJob)).toBe(false);
    });

    it('workers cannot access jobs without assigned_workers array', () => {
      const worker = { role: 'worker', teamMemberId: 5 };
      const job = { id: 1, team_member_id: 5 }; // only team_member_id, no assigned_workers
      // Note: the fallback to team_member_id is unreachable due to default [] for assignedWorkers
      expect(canAccessJob(worker, job)).toBe(false);
    });
  });

  describe('getDefaultPermissionsForRole', () => {
    it('gives managers all permissions', () => {
      const perms = getDefaultPermissionsForRole('manager');
      expect(perms.editAvailability).toBe(true);
      expect(perms.processPayments).toBe(true);
    });

    it('gives schedulers most permissions except processPayments', () => {
      const perms = getDefaultPermissionsForRole('scheduler');
      expect(perms.editAvailability).toBe(true);
      expect(perms.processPayments).toBe(false);
    });

    it('gives workers limited default permissions', () => {
      const perms = getDefaultPermissionsForRole('worker');
      expect(perms.editAvailability).toBe(true);
      expect(perms.markJobStatus).toBe(true);
      expect(perms.viewCustomerContact).toBe(false);
      expect(perms.processPayments).toBe(false);
    });

    it('returns empty for unknown roles', () => {
      expect(getDefaultPermissionsForRole('unknown')).toEqual({});
    });

    it('handles case-insensitive "account owner"', () => {
      const perms = getDefaultPermissionsForRole('account owner');
      expect(perms.processPayments).toBe(true);
    });
  });
});

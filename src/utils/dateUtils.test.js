import { formatDateLocal, toLocalDateString, addDaysLocal, parseLocalDate, formatDateDisplay } from './dateUtils';

describe('dateUtils', () => {
  describe('formatDateLocal', () => {
    it('formats a date to YYYY-MM-DD', () => {
      const date = new Date(2025, 0, 15); // Jan 15, 2025
      expect(formatDateLocal(date)).toBe('2025-01-15');
    });

    it('pads single-digit month and day', () => {
      const date = new Date(2025, 2, 5); // Mar 5, 2025
      expect(formatDateLocal(date)).toBe('2025-03-05');
    });

    it('returns empty string for null/undefined', () => {
      expect(formatDateLocal(null)).toBe('');
      expect(formatDateLocal(undefined)).toBe('');
    });

    it('handles December correctly', () => {
      const date = new Date(2025, 11, 31); // Dec 31, 2025
      expect(formatDateLocal(date)).toBe('2025-12-31');
    });
  });

  describe('toLocalDateString', () => {
    it('is an alias for formatDateLocal', () => {
      const date = new Date(2025, 5, 20);
      expect(toLocalDateString(date)).toBe(formatDateLocal(date));
    });
  });

  describe('addDaysLocal', () => {
    it('adds days to a date', () => {
      const date = new Date(2025, 0, 1); // Jan 1
      expect(addDaysLocal(date, 5)).toBe('2025-01-06');
    });

    it('handles month rollover', () => {
      const date = new Date(2025, 0, 30); // Jan 30
      expect(addDaysLocal(date, 3)).toBe('2025-02-02');
    });

    it('handles negative days', () => {
      const date = new Date(2025, 1, 3); // Feb 3
      expect(addDaysLocal(date, -5)).toBe('2025-01-29');
    });

    it('handles year rollover', () => {
      const date = new Date(2025, 11, 30); // Dec 30
      expect(addDaysLocal(date, 5)).toBe('2026-01-04');
    });
  });

  describe('parseLocalDate', () => {
    it('parses YYYY-MM-DD string to Date object', () => {
      const result = parseLocalDate('2025-03-15');
      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(2); // 0-indexed
      expect(result.getDate()).toBe(15);
    });

    it('returns current date for null/undefined', () => {
      const before = new Date();
      const result = parseLocalDate(null);
      const after = new Date();
      expect(result.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(result.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('returns Date objects as-is', () => {
      const date = new Date(2025, 5, 15);
      expect(parseLocalDate(date)).toBe(date);
    });
  });

  describe('formatDateDisplay', () => {
    it('formats YYYY-MM-DD to readable display format', () => {
      expect(formatDateDisplay('2025-10-07')).toBe('Oct 7, 2025');
    });

    it('handles January', () => {
      expect(formatDateDisplay('2025-01-01')).toBe('Jan 1, 2025');
    });

    it('handles December', () => {
      expect(formatDateDisplay('2025-12-25')).toBe('Dec 25, 2025');
    });

    it('returns empty string for null/undefined', () => {
      expect(formatDateDisplay(null)).toBe('');
      expect(formatDateDisplay(undefined)).toBe('');
      expect(formatDateDisplay('')).toBe('');
    });
  });
});

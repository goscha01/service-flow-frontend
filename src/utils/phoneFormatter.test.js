import { formatPhoneNumber, unformatPhoneNumber } from './phoneFormatter';

describe('phoneFormatter', () => {
  describe('formatPhoneNumber', () => {
    it('formats 10-digit US numbers', () => {
      expect(formatPhoneNumber('5551234567')).toBe('(555) 123-4567');
    });

    it('formats 11-digit US numbers with country code', () => {
      expect(formatPhoneNumber('15551234567')).toBe('+1 (555) 123-4567');
    });

    it('returns international numbers with + prefix as-is', () => {
      expect(formatPhoneNumber('+447911123456')).toBe('+447911123456');
    });

    it('strips non-digit characters before formatting', () => {
      expect(formatPhoneNumber('(555) 123-4567')).toBe('(555) 123-4567');
    });

    it('returns original for short numbers', () => {
      expect(formatPhoneNumber('12345')).toBe('12345');
    });

    it('returns null/undefined as-is', () => {
      expect(formatPhoneNumber(null)).toBe(null);
      expect(formatPhoneNumber(undefined)).toBe(undefined);
      expect(formatPhoneNumber('')).toBe('');
    });

    it('formats numbers with international prefix (>10 digits)', () => {
      expect(formatPhoneNumber('441234567890')).toBe('+441234567890');
    });
  });

  describe('unformatPhoneNumber', () => {
    it('strips formatting characters', () => {
      expect(unformatPhoneNumber('(555) 123-4567')).toBe('5551234567');
    });

    it('preserves + in international numbers', () => {
      expect(unformatPhoneNumber('+1 (555) 123-4567')).toBe('+15551234567');
    });

    it('returns null/undefined as-is', () => {
      expect(unformatPhoneNumber(null)).toBe(null);
      expect(unformatPhoneNumber(undefined)).toBe(undefined);
    });
  });
});

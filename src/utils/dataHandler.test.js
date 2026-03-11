import { normalizeAPIResponse, handleAPIError, validateData, safeGet } from './dataHandler';

describe('dataHandler', () => {
  describe('normalizeAPIResponse', () => {
    it('returns arrays as-is', () => {
      const arr = [{ id: 1 }, { id: 2 }];
      expect(normalizeAPIResponse(arr)).toBe(arr);
    });

    it('extracts data from specified key', () => {
      const response = { services: [{ id: 1 }, { id: 2 }] };
      expect(normalizeAPIResponse(response, 'services')).toEqual([{ id: 1 }, { id: 2 }]);
    });

    it('wraps single object from specified key in array', () => {
      const response = { data: { id: 1, name: 'test' } };
      expect(normalizeAPIResponse(response, 'data')).toEqual([{ id: 1, name: 'test' }]);
    });

    it('auto-detects common keys (data, items, results, etc.)', () => {
      expect(normalizeAPIResponse({ data: [1, 2, 3] })).toEqual([1, 2, 3]);
      expect(normalizeAPIResponse({ items: [1, 2] })).toEqual([1, 2]);
      expect(normalizeAPIResponse({ results: [1] })).toEqual([1]);
      expect(normalizeAPIResponse({ jobs: [{ id: 1 }] })).toEqual([{ id: 1 }]);
      expect(normalizeAPIResponse({ customers: [{ id: 1 }] })).toEqual([{ id: 1 }]);
    });

    it('returns object as-is if no array key found', () => {
      const obj = { foo: 'bar', count: 5 };
      expect(normalizeAPIResponse(obj)).toEqual(obj);
    });

    it('returns empty array for null/undefined', () => {
      expect(normalizeAPIResponse(null)).toEqual([]);
      expect(normalizeAPIResponse(undefined)).toEqual([]);
    });
  });

  describe('handleAPIError', () => {
    it('handles server errors with response', () => {
      const error = { response: { status: 500, data: { error: 'Internal error' } } };
      const result = handleAPIError(error, 'test');
      expect(result.message).toBe('Internal error');
      expect(result.status).toBe(500);
      expect(result.type).toBe('server_error');
    });

    it('handles network errors', () => {
      const error = { request: {} };
      const result = handleAPIError(error);
      expect(result.type).toBe('network_error');
      expect(result.status).toBe(0);
    });

    it('handles unknown errors', () => {
      const error = { message: 'Something went wrong' };
      const result = handleAPIError(error);
      expect(result.type).toBe('unknown_error');
      expect(result.message).toBe('Something went wrong');
    });

    it('falls back to status code message if no error text', () => {
      const error = { response: { status: 404, data: {} } };
      const result = handleAPIError(error);
      expect(result.message).toBe('Server error (404)');
    });
  });

  describe('validateData', () => {
    it('returns true when all required fields present', () => {
      expect(validateData({ name: 'John', email: 'john@test.com' }, ['name', 'email'])).toBe(true);
    });

    it('returns false when a required field is missing', () => {
      expect(validateData({ name: 'John' }, ['name', 'email'])).toBe(false);
    });

    it('returns false for null/undefined data', () => {
      expect(validateData(null, ['name'])).toBe(false);
      expect(validateData(undefined, ['name'])).toBe(false);
    });

    it('treats 0 as a valid value', () => {
      expect(validateData({ count: 0 }, ['count'])).toBe(true);
    });

    it('returns true with no required fields', () => {
      expect(validateData({ anything: true })).toBe(true);
    });
  });

  describe('safeGet', () => {
    it('accesses nested properties', () => {
      const obj = { a: { b: { c: 'deep' } } };
      expect(safeGet(obj, 'a.b.c')).toBe('deep');
    });

    it('returns default value for missing paths', () => {
      expect(safeGet({ a: 1 }, 'b.c', 'default')).toBe('default');
    });

    it('returns null by default for missing paths', () => {
      expect(safeGet({ a: 1 }, 'x.y.z')).toBeNull();
    });

    it('accesses top-level properties', () => {
      expect(safeGet({ name: 'test' }, 'name')).toBe('test');
    });

    it('handles null/undefined objects', () => {
      expect(safeGet(null, 'a.b')).toBeNull();
      expect(safeGet(undefined, 'a.b')).toBeNull();
    });
  });
});

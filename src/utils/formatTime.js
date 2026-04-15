// Business-wide time formatting. Single source of truth for every call site.
// The current format is tracked at module level so any file can just
// `import { formatTime } from '../utils/formatTime'` without needing the
// React context. TimeFormatContext keeps _currentFormat in sync with the
// logged-in business's preference.

let _currentFormat = (() => {
  try { return localStorage.getItem('time_format') || '12h'; } catch { return '12h'; }
})();
const _subscribers = new Set();

export const getTimeFormat = () => _currentFormat;

export const setTimeFormat = (fmt) => {
  const normalized = fmt === '24h' ? '24h' : '12h';
  if (normalized === _currentFormat) return;
  _currentFormat = normalized;
  try { localStorage.setItem('time_format', normalized); } catch {}
  _subscribers.forEach((fn) => { try { fn(normalized); } catch {} });
};

export const subscribeTimeFormat = (fn) => {
  _subscribers.add(fn);
  return () => _subscribers.delete(fn);
};

const parseToDate = (input) => {
  if (!input) return null;
  if (input instanceof Date) return isNaN(input.getTime()) ? null : input;
  const raw = String(input);
  // "HH:mm" or "HH:mm:ss" — attach today's date for parsing
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(raw)) {
    const today = new Date();
    const [h, m, s] = raw.split(':');
    today.setHours(Number(h), Number(m), Number(s || 0), 0);
    return today;
  }
  // Normalize "YYYY-MM-DD HH:mm:ss" to ISO
  const iso = raw.includes('T') ? raw : raw.replace(' ', 'T');
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
};

// Format a date/time-like value using the business time format.
// Pass a `format` override if you need to force 12h/24h regardless.
export const formatTime = (input, format) => {
  const d = parseToDate(input);
  if (!d) return '';
  const fmt = format || _currentFormat;
  const hour12 = fmt !== '24h';
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12
  });
};

export const formatTimeRange = (start, end, format) => {
  const s = formatTime(start, format);
  const e = formatTime(end, format);
  if (!s && !e) return '';
  if (!e) return s;
  return `${s} - ${e}`;
};

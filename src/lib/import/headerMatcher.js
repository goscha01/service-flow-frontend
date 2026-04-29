// Header matcher — given CSV headers, suggest which SF target field each one
// maps to. Used to auto-fill the mapping UI when no preset is selected (or
// when the chosen preset doesn't cover every field).

// Synonym table: SF field key → list of header strings/patterns that should
// map to it. Match is case- and whitespace-insensitive. Order matters —
// earlier entries win.
const SYNONYMS = {
  // ── Names ──────────────────────────────────────────────────────
  firstName: ['first name', 'firstname', 'first_name', 'fname', 'given name'],
  lastName: ['last name', 'lastname', 'last_name', 'lname', 'surname', 'family name'],
  customerFirstName: ['customer first name', 'first name', 'firstname', 'first_name'],
  customerLastName: ['customer last name', 'last name', 'lastname', 'last_name'],

  // ── Contact ────────────────────────────────────────────────────
  email: ['email', 'email address', 'e-mail', 'emailaddress'],
  customerEmail: ['customer email', 'email', 'email address', 'e-mail'],
  phone: ['phone', 'phone number', 'phone_number', 'mobile', 'cell', 'tel', 'telephone'],
  customerPhone: ['customer phone', 'phone', 'phone number'],
  additionalPhone: ['additional phone', 'additional phone number', 'secondary phone', 'phone 2'],

  // ── Address ────────────────────────────────────────────────────
  address: ['address', 'street address', 'street', 'service address', 'address 1', 'address line 1'],
  apt: ['apt', 'apt.', 'apt no', 'apt no.', 'apt. no.', 'apartment', 'unit', 'suite', 'address 2'],
  city: ['city', 'town'],
  state: ['state', 'province', 'region'],
  zipCode: ['zip', 'zip code', 'zipcode', 'postal code', 'postal', 'zip/postal code', 'zip/postal'],
  country: ['country'],

  // ── Customer extras ────────────────────────────────────────────
  companyName: ['company', 'company name', 'business', 'business name', 'organization'],
  notes: ['note', 'notes', 'comments', 'description', 'booking note', 'private customer note'],
  status: ['status', 'state', 'booking status'],
  tags: ['tags', 'labels'],

  // ── Job-specific ───────────────────────────────────────────────
  serviceName: ['service', 'service name', 'service_name', 'service type'],
  scheduledDate: ['date', 'scheduled date', 'booking date', 'booking start date time', 'start date'],
  scheduledTime: ['time', 'scheduled time', 'start time', 'booking time'],
  bookingStartDateTime: ['booking start date time', 'start datetime', 'start_datetime'],
  bookingEndDateTime: ['booking end date time', 'end datetime', 'end_datetime'],
  duration: ['duration', 'duration (minutes)', 'estimated job length', 'estimated job length (hh:mm)', 'length'],
  price: ['price', 'amount', 'final amount', 'final amount (usd)', 'total', 'total amount'],
  serviceTotal: ['service total', 'service total (usd)', 'subtotal'],
  finalAmount: ['final amount', 'final amount (usd)'],
  amountPaidByCustomer: ['amount paid', 'amount paid by customer', 'amount paid by customer (usd)', 'paid'],
  amountOwed: ['amount owed', 'amount owed by customer', 'amount owed by customer (usd)', 'balance'],
  paymentMethod: ['payment method', 'payment_method', 'paid by'],
  isRecurring: ['is recurring', 'recurring', 'frequency'],
  recurringFrequency: ['recurring frequency', 'frequency'],
  extras: ['extras', 'add-ons', 'addons'],
  excludes: ['excludes', 'exclusions'],
  assignedCrewExternalId: ['provider', 'provider details', 'provider/team', 'assigned crew', 'crew', 'team'],
  serviceRegionExternalId: ['location', 'territory', 'region', 'location id', 'service region'],
  externalId: ['booking id', 'job id', 'id', '_id', 'external id'],
  jobRandomId: ['job random id', 'job_random_id_text'],

  // ── Team member ────────────────────────────────────────────────
  role: ['role', 'position', 'title'],
  hourlyRate: ['hourly rate', 'hourly_rate', 'rate', 'pay rate', 'wage'],
  commission: ['commission', 'commission %', 'commission percent', 'commission_percentage'],
  isActive: ['active', 'is active', 'is_active', 'enabled'],
  color: ['color', 'colour'],

  // ── Service ────────────────────────────────────────────────────
  name: ['name', 'service name', 'territory name'],
  description: ['description', 'desc'],
  category: ['category', 'group', 'type'],

  // ── Territory ──────────────────────────────────────────────────
  location: ['location', 'address'],
  radius: ['radius', 'radius (miles)', 'radius_miles'],
  timezone: ['timezone', 'tz', 'time zone'],
  zipCodes: ['zip codes', 'zip_codes', 'zips', 'postal codes'],
};

const norm = (s) => String(s || '').toLowerCase().trim().replace(/\s+/g, ' ');

// Levenshtein distance (kept small — only for short header strings)
function distance(a, b) {
  if (a === b) return 0;
  if (!a || !b) return Math.max(a?.length || 0, b?.length || 0);
  const m = a.length;
  const n = b.length;
  let prev = new Array(n + 1).fill(0).map((_, i) => i);
  for (let i = 1; i <= m; i++) {
    const curr = [i];
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr.push(Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost));
    }
    prev = curr;
  }
  return prev[n];
}

/**
 * Suggest a mapping (sfFieldKey → csvHeader) for the given headers, restricted
 * to the target type's allowed fields.
 *
 * @param {string[]} headers       CSV headers from the uploaded file
 * @param {Array<{key:string}>} targetFields  TARGET_FIELDS[target]
 * @returns {Object<string,string>}  { sfFieldKey: csvHeader }
 */
export function suggestMapping(headers, targetFields) {
  const out = {};
  if (!Array.isArray(headers) || !Array.isArray(targetFields)) return out;

  const headersNorm = headers.map((h) => ({ raw: h, norm: norm(h) }));
  const usedHeaders = new Set();

  // Pass 1 — exact synonym match (case/space insensitive)
  for (const field of targetFields) {
    const synonyms = SYNONYMS[field.key] || [field.key];
    for (const syn of synonyms) {
      const synNorm = norm(syn);
      const found = headersNorm.find((h) => h.norm === synNorm && !usedHeaders.has(h.raw));
      if (found) {
        out[field.key] = found.raw;
        usedHeaders.add(found.raw);
        break;
      }
    }
  }

  // Pass 2 — substring match for fields still unmapped
  for (const field of targetFields) {
    if (out[field.key]) continue;
    const synonyms = SYNONYMS[field.key] || [field.key];
    for (const syn of synonyms) {
      const synNorm = norm(syn);
      const found = headersNorm.find(
        (h) => !usedHeaders.has(h.raw) && (h.norm.includes(synNorm) || synNorm.includes(h.norm)),
      );
      if (found) {
        out[field.key] = found.raw;
        usedHeaders.add(found.raw);
        break;
      }
    }
  }

  // Pass 3 — fuzzy match (Levenshtein ≤ 2) on remaining unmapped fields
  for (const field of targetFields) {
    if (out[field.key]) continue;
    const synonyms = SYNONYMS[field.key] || [field.key];
    let best = null;
    for (const syn of synonyms) {
      const synNorm = norm(syn);
      for (const h of headersNorm) {
        if (usedHeaders.has(h.raw)) continue;
        const d = distance(h.norm, synNorm);
        if (d <= 2 && (!best || d < best.d)) best = { raw: h.raw, d };
      }
    }
    if (best) {
      out[field.key] = best.raw;
      usedHeaders.add(best.raw);
    }
  }

  return out;
}

/**
 * Best-guess detection of the source format from headers — used to pre-select
 * a system preset when the user uploads a file.
 */
export function detectSource(headers) {
  if (!Array.isArray(headers)) return null;
  const joined = headers.map(norm).join('|');

  if (/start_time_for_full_cal_date|job_random_id_text|customer_email_text/.test(joined)) {
    return 'ZenBooker';
  }
  if (/booking start date time|booking status|final amount \(usd\)/.test(joined)) {
    return 'Booking Koala';
  }
  return null;
}

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
  source: ['source', 'lead source', 'referral source', 'how heard', 'how did you hear', 'referred by', 'channel'],
  createdAt: ['created at', 'created date', 'created on', 'date created', 'date added', 'lead date', 'lead created', 'signup date', 'signed up', 'first contact', 'inquiry date'],
  leadValue: ['value', 'lead value', 'lead price', 'estimated value', 'deal value', 'opportunity value', 'estimated price', 'quote', 'quote amount', 'estimate'],
  leadCost: ['lead cost', 'cost per lead', 'cpl', 'acquisition cost', 'cost', 'lead fee', 'thumbtack price', 'lead spend', 'paid for lead', 'amount paid'],
  leadServiceId: ['service id', 'service interested', 'interested service', 'service of interest'],
  lastTaskDate: ['last task date', 'last task', 'last activity', 'last activity date', 'last contact', 'last contact date', 'last touched', 'last followup', 'last follow up', 'last follow-up', 'last interaction'],
  lastTaskTitle: ['last task title', 'last task name', 'last activity title', 'last activity name'],
  nextTaskDate: ['next task date', 'next task', 'next followup', 'next follow up', 'next follow-up', 'follow up date', 'follow-up date', 'followup date', 'next contact', 'next activity', 'next due', 'due date', 'next call'],
  nextTaskTitle: ['next task title', 'next task name', 'follow up title', 'follow-up title', 'next activity title'],
  assignedTeamMemberName: ['assigned to', 'assigned team member', 'team member', 'cleaner', 'cleaner name', 'worker', 'pro', 'assigned cleaner', 'crew', 'crew name', 'tech', 'technician', 'staff'],
  assignedTeamMemberEmail: ['team member email', 'cleaner email', 'worker email', 'pro email', 'crew email', 'tech email', 'staff email', 'assigned email'],

  // Cleaner salary override (per-job dollar amount)
  cleanerSalaryOverride: ['cleaner salary', 'salary', 'cleaner pay', 'pay', 'payout', 'cleaner payout', 'worker pay', 'cleaner amount', 'tech pay'],

  // Job expenses
  expenseAmount: ['expense', 'expense amount', 'reimbursement', 'reimbursement amount', 'reimburse'],
  expenseType: ['expense type', 'expense category', 'reimbursement type'],
  expenseDescription: ['expense description', 'expense note', 'expense details', 'reimbursement description'],
  expensePaidBy: ['expense paid by', 'paid by', 'expense payer'],
  expenseReimbursable: ['reimbursable', 'is reimbursable', 'reimburse to cleaner', 'reimburse cleaner'],
  expenseCustomerBillable: ['billable', 'customer billable', 'bill to customer', 'billable to customer'],
  expenseStatus: ['expense status', 'reimbursement status'],
  expenseTeamMemberEmail: ['expense team member email', 'expense cleaner email', 'expense paid by email', 'reimbursee email'],

  // Reviews
  rating: ['rating', 'stars', 'star rating', 'score', 'review rating'],
  ratingMax: ['rating max', 'rating scale', 'max rating', 'out of'],
  reviewText: ['review', 'review text', 'review body', 'feedback', 'comment', 'comments', 'testimonial'],
  reviewerName: ['reviewer', 'reviewer name', 'review by', 'review author', 'author', 'reviewed by'],
  reviewerEmail: ['reviewer email', 'review email', 'author email'],
  reviewSource: ['source', 'review source', 'platform', 'review platform', 'channel', 'review channel'],
  reviewDate: ['review date', 'reviewed at', 'reviewed on', 'date', 'created'],
  reviewExternalId: ['review id', 'external review id', 'review external id', 'id'],
  reviewExternalUrl: ['review url', 'review link', 'url', 'link'],
  reviewResponse: ['response', 'pro response', 'reply', 'owner response', 'owner reply'],
  reviewResponseDate: ['response date', 'reply date', 'responded at'],
  reviewJobExternalId: ['job id', 'job external id', 'booking id', 'order id'],

  // ── Job-specific ───────────────────────────────────────────────
  serviceName: ['service', 'service name', 'service_name', 'service type'],
  scheduledDate: ['date', 'scheduled date', 'booking date', 'booking start date time', 'start date'],
  scheduledTime: ['time', 'scheduled time', 'start time', 'booking time'],
  bookingStartDateTime: ['booking start date time', 'start datetime', 'start_datetime'],
  bookingEndDateTime: ['booking end date time', 'end datetime', 'end_datetime'],
  duration: ['duration', 'duration (minutes)', 'estimated job length', 'estimated job length (hh:mm)', 'length'],
  estimatedDuration: ['estimated duration', 'est duration', 'est. duration', 'planned duration'],
  price: ['price', 'amount', 'final amount', 'final amount (usd)'],
  servicePrice: ['service price', 'service_price', 'pre-tax price', 'subtotal'],
  serviceTotal: ['service total', 'service total (usd)'],
  total: ['total', 'total amount', 'grand total'],
  finalAmount: ['final amount', 'final amount (usd)'],
  discount: ['discount', 'discount amount', 'off'],
  additionalFees: ['additional fees', 'fees', 'extra fees', 'surcharge'],
  taxes: ['tax', 'taxes', 'sales tax', 'tax amount', 'vat'],
  tipAmount: ['tip', 'tip amount', 'gratuity', 'tip total'],
  incentiveAmount: ['incentive', 'incentive amount', 'bonus', 'bonus amount', 'commission bonus'],
  hoursWorked: ['hours worked', 'actual hours', 'worked hours', 'real hours', 'cleaner hours', 'time worked'],
  startTime: ['actual start', 'actual start time', 'real start', 'started at', 'check in', 'check-in'],
  endTime: ['actual end', 'actual end time', 'real end', 'ended at', 'check out', 'check-out', 'finish time'],
  amountPaidByCustomer: ['amount paid', 'amount paid by customer', 'amount paid by customer (usd)', 'paid', 'paid amount'],
  amountOwed: ['amount owed', 'amount owed by customer', 'amount owed by customer (usd)', 'balance', 'balance due', 'owed'],
  paymentMethod: ['payment method', 'payment_method', 'paid by', 'method of payment'],
  paymentStatus: ['payment status', 'payment_status', 'paid status', 'paid?', 'is paid'],
  invoiceId: ['invoice id', 'invoice number', 'invoice #', 'invoice'],
  invoiceAmount: ['invoice amount', 'invoice total', 'invoice_amount'],
  invoiceDate: ['invoice date', 'invoice_date', 'billed on'],
  paymentDate: ['payment date', 'paid on', 'paid date', 'payment_date'],
  isRecurring: ['is recurring', 'recurring'],
  recurringFrequency: ['recurring frequency', 'frequency'],
  extras: ['extras', 'add-ons', 'addons'],
  excludes: ['excludes', 'exclusions'],
  bedroomCount: ['bedrooms', 'bedroom count', 'beds', '# bedrooms', 'br'],
  bathroomCount: ['bathrooms', 'bathroom count', 'baths', '# bathrooms', 'ba'],
  workersNeeded: ['workers needed', 'workers', 'crew size', '# of workers', 'team size'],
  customerNotes: ['customer notes', 'customer note', 'client notes', 'customer comments'],
  internalNotes: ['internal notes', 'internal note', 'admin notes', 'staff notes', 'private notes'],
  specialInstructions: ['special instructions', 'instructions', 'special note', 'special notes', 'access', 'access notes'],
  assignedCrewExternalId: ['provider', 'provider details', 'provider/team', 'assigned crew', 'crew', 'team'],
  serviceRegionExternalId: ['location', 'region', 'location id', 'service region'],
  territory: ['territory', 'service area', 'area'],
  externalId: ['booking id', 'job id', 'id', '_id', 'external id'],
  jobRandomId: ['job random id', 'job_random_id_text'],

  // ── Team member ────────────────────────────────────────────────
  role: ['role', 'position', 'title'],
  hourlyRate: ['hourly rate', 'hourly_rate', 'rate', 'pay rate', 'wage'],
  commission: ['commission', 'commission %', 'commission percent', 'commission_percentage'],
  salaryStartDate: ['salary start date', 'salary_start_date', 'pay start date', 'start date', 'hire date', 'hired on'],
  payoutScheduleType: ['payout schedule', 'payout frequency', 'pay frequency', 'pay schedule'],
  payoutDayOfWeek: ['payout day', 'payout day of week', 'pay day'],
  payoutIntervalDays: ['payout interval', 'payout interval days', 'pay interval'],
  isActive: ['active', 'is active', 'is_active', 'enabled'],
  isServiceProvider: ['is service provider', 'service provider', 'is_service_provider', 'provider'],
  skills: ['skills', 'specialties', 'capabilities'],
  color: ['color', 'colour'],
  location: ['location', 'home base', 'office location'],

  // ── Service ────────────────────────────────────────────────────
  name: ['name', 'service name', 'territory name'],
  description: ['description', 'desc'],
  category: ['category', 'group', 'type'],
  requirePaymentMethod: ['require payment method', 'requires payment', 'payment required', 'cc required'],

  // ── Territory ──────────────────────────────────────────────────
  radius: ['radius', 'radius (miles)', 'radius_miles'],
  timezone: ['timezone', 'tz', 'time zone'],
  zipCodes: ['zip codes', 'zip_codes', 'zips', 'postal codes'],
  pricingMultiplier: ['pricing multiplier', 'price multiplier', 'multiplier', 'pricing_multiplier'],

  // ── Job flags ──────────────────────────────────────────────────
  priority: ['priority', 'urgency'],
  workers: ['workers', '# workers', 'crew count', 'team count'],
  qualityCheck: ['quality check', 'qc', 'qa'],
  photosRequired: ['photos required', 'photos', 'photo required', 'photo proof'],
  customerSignature: ['customer signature', 'signature required', 'signature'],
  autoInvoice: ['auto invoice', 'auto-invoice', 'auto_invoice'],
  autoReminders: ['auto reminders', 'auto-reminders', 'auto_reminders', 'send reminders'],
  recurringEndDate: ['recurring end date', 'recurring end', 'end date', 'recurring until'],
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

// Target field definitions for the Data Import flow.
//
// Each entry describes one field a user can map a CSV column to. The wizard
// uses this catalog to build the right-hand "SF field" dropdowns and to
// validate that required fields have been mapped.

export const TARGET_FIELDS = {
  customers: [
    { key: 'firstName', label: 'First Name', required: true, group: 'Identity' },
    { key: 'lastName', label: 'Last Name', required: true, group: 'Identity' },
    { key: 'companyName', label: 'Company Name', group: 'Identity' },
    { key: 'email', label: 'Email', group: 'Contact' },
    { key: 'phone', label: 'Phone', group: 'Contact' },
    { key: 'additionalPhone', label: 'Additional Phone', group: 'Contact' },
    { key: 'address', label: 'Address', group: 'Address' },
    { key: 'apt', label: 'Apt / Suite', group: 'Address' },
    { key: 'city', label: 'City', group: 'Address' },
    { key: 'state', label: 'State', group: 'Address' },
    { key: 'zipCode', label: 'Zip / Postal Code', group: 'Address' },
    { key: 'source', label: 'Lead Source', group: 'Other' },
    { key: 'createdAt', label: 'Lead Created Date / Date Added', group: 'Other' },
    { key: 'notes', label: 'Notes', group: 'Other' },
    { key: 'status', label: 'Status (active/inactive/archived)', group: 'Other' },
    { key: 'tags', label: 'Tags', group: 'Other' },
  ],

  jobs: [
    // Customer identity (one of email/name required so backend can find/create)
    { key: 'customerFirstName', label: 'Customer First Name', required: true, group: 'Customer' },
    { key: 'customerLastName', label: 'Customer Last Name', required: true, group: 'Customer' },
    { key: 'customerEmail', label: 'Customer Email', group: 'Customer' },
    { key: 'phone', label: 'Customer Phone', group: 'Customer' },
    // Service address
    { key: 'address', label: 'Service Address', group: 'Address' },
    { key: 'apt', label: 'Apt / Suite', group: 'Address' },
    { key: 'city', label: 'City', group: 'Address' },
    { key: 'state', label: 'State', group: 'Address' },
    { key: 'zipCode', label: 'Zip / Postal Code', group: 'Address' },
    // Schedule
    { key: 'scheduledDate', label: 'Scheduled Date', required: true, group: 'Schedule' },
    { key: 'scheduledTime', label: 'Scheduled Time', group: 'Schedule' },
    { key: 'bookingStartDateTime', label: 'Booking Start (ISO datetime)', group: 'Schedule' },
    { key: 'bookingEndDateTime', label: 'Booking End (ISO datetime)', group: 'Schedule' },
    { key: 'duration', label: 'Duration (min or HH:MM)', group: 'Schedule' },
    { key: 'estimatedDuration', label: 'Estimated Duration (min)', group: 'Schedule' },
    { key: 'isRecurring', label: 'Is Recurring', group: 'Schedule' },
    { key: 'recurringFrequency', label: 'Recurring Frequency', group: 'Schedule' },
    // Service
    { key: 'serviceName', label: 'Service Name', group: 'Service' },
    { key: 'bedroomCount', label: 'Bedrooms', group: 'Service' },
    { key: 'bathroomCount', label: 'Bathrooms', group: 'Service' },
    { key: 'workersNeeded', label: 'Workers Needed', group: 'Service' },
    { key: 'extras', label: 'Extras', group: 'Service' },
    { key: 'excludes', label: 'Excludes', group: 'Service' },
    // Pricing
    { key: 'price', label: 'Price', group: 'Pricing' },
    { key: 'servicePrice', label: 'Service Price (pre-tax)', group: 'Pricing' },
    { key: 'serviceTotal', label: 'Service Total', group: 'Pricing' },
    { key: 'discount', label: 'Discount', group: 'Pricing' },
    { key: 'additionalFees', label: 'Additional Fees', group: 'Pricing' },
    { key: 'taxes', label: 'Taxes', group: 'Pricing' },
    { key: 'total', label: 'Total', group: 'Pricing' },
    { key: 'finalAmount', label: 'Final Amount', group: 'Pricing' },
    { key: 'tipAmount', label: 'Tip', group: 'Pricing' },
    // Payment
    { key: 'amountPaidByCustomer', label: 'Amount Paid', group: 'Payment' },
    { key: 'amountOwed', label: 'Amount Owed', group: 'Payment' },
    { key: 'paymentMethod', label: 'Payment Method', group: 'Payment' },
    { key: 'paymentStatus', label: 'Payment Status (paid/unpaid/partial)', group: 'Payment' },
    { key: 'invoiceId', label: 'Invoice ID', group: 'Payment' },
    { key: 'invoiceAmount', label: 'Invoice Amount', group: 'Payment' },
    { key: 'invoiceDate', label: 'Invoice Date', group: 'Payment' },
    { key: 'paymentDate', label: 'Payment Date', group: 'Payment' },
    // Status / assignment
    { key: 'status', label: 'Job Status', group: 'Status' },
    { key: 'priority', label: 'Priority', group: 'Status' },
    { key: 'workers', label: 'Workers Assigned (#)', group: 'Status' },
    { key: 'assignedCrewExternalId', label: 'Assigned Crew (external ID)', group: 'Status' },
    { key: 'serviceRegionExternalId', label: 'Service Region / Location', group: 'Status' },
    { key: 'territory', label: 'Territory', group: 'Status' },
    // Flags
    { key: 'qualityCheck', label: 'Quality Check (true/false)', group: 'Flags' },
    { key: 'photosRequired', label: 'Photos Required (true/false)', group: 'Flags' },
    { key: 'customerSignature', label: 'Customer Signature (true/false)', group: 'Flags' },
    { key: 'autoInvoice', label: 'Auto-Invoice (true/false)', group: 'Flags' },
    { key: 'autoReminders', label: 'Auto-Reminders (true/false)', group: 'Flags' },
    { key: 'recurringEndDate', label: 'Recurring End Date', group: 'Flags' },
    // Notes / metadata
    { key: 'notes', label: 'Notes', group: 'Notes' },
    { key: 'customerNotes', label: 'Customer Notes', group: 'Notes' },
    { key: 'internalNotes', label: 'Internal Notes', group: 'Notes' },
    { key: 'specialInstructions', label: 'Special Instructions', group: 'Notes' },
    { key: 'tags', label: 'Tags (comma-separated)', group: 'Notes' },
    { key: 'externalId', label: 'External Job ID (dedup key)', group: 'Notes' },
  ],

  team_members: [
    { key: 'firstName', label: 'First Name', required: true, group: 'Identity' },
    { key: 'lastName', label: 'Last Name', required: true, group: 'Identity' },
    { key: 'email', label: 'Email', required: true, group: 'Identity' },
    { key: 'phone', label: 'Phone', group: 'Identity' },
    { key: 'role', label: 'Role (cleaner / manager / office / admin)', group: 'Identity' },
    { key: 'color', label: 'Color', group: 'Identity' },
    // Address
    { key: 'location', label: 'Location', group: 'Address' },
    { key: 'city', label: 'City', group: 'Address' },
    { key: 'state', label: 'State', group: 'Address' },
    { key: 'zipCode', label: 'Zip / Postal Code', group: 'Address' },
    // Pay / salary
    { key: 'hourlyRate', label: 'Hourly Rate', group: 'Pay' },
    { key: 'commission', label: 'Commission %', group: 'Pay' },
    { key: 'salaryStartDate', label: 'Salary Start Date', group: 'Pay' },
    { key: 'payoutScheduleType', label: 'Payout Schedule (weekly/biweekly/monthly)', group: 'Pay' },
    { key: 'payoutDayOfWeek', label: 'Payout Day of Week (0=Sun … 6=Sat)', group: 'Pay' },
    { key: 'payoutIntervalDays', label: 'Payout Interval (days)', group: 'Pay' },
    // Status
    { key: 'status', label: 'Status (active/inactive/archived)', group: 'Status' },
    { key: 'isActive', label: 'Active (true/false)', group: 'Status' },
    { key: 'isServiceProvider', label: 'Is Service Provider (true/false)', group: 'Status' },
    { key: 'skills', label: 'Skills (comma-separated)', group: 'Status' },
  ],

  services: [
    { key: 'name', label: 'Name', required: true },
    { key: 'description', label: 'Description' },
    { key: 'price', label: 'Price' },
    { key: 'duration', label: 'Duration (min or HH:MM)' },
    { key: 'category', label: 'Category' },
    { key: 'isActive', label: 'Active (true/false)' },
    { key: 'requirePaymentMethod', label: 'Require Payment Method (true/false)' },
  ],

  territories: [
    { key: 'name', label: 'Name', required: true },
    { key: 'description', label: 'Description' },
    { key: 'location', label: 'Location' },
    { key: 'city', label: 'City' },
    { key: 'state', label: 'State' },
    { key: 'radius', label: 'Radius (miles)' },
    { key: 'timezone', label: 'Timezone' },
    { key: 'zipCodes', label: 'Zip Codes (comma/space separated)' },
    { key: 'status', label: 'Status (active/inactive)' },
    { key: 'pricingMultiplier', label: 'Pricing Multiplier (e.g. 1.25)' },
  ],
};

export const TARGET_TYPE_LABELS = {
  customers: 'Customers',
  jobs: 'Jobs',
  team_members: 'Team Members',
  services: 'Services',
  territories: 'Territories',
};

export const TARGET_TYPES = Object.keys(TARGET_FIELDS);

export function getRequiredFields(target) {
  return (TARGET_FIELDS[target] || []).filter((f) => f.required).map((f) => f.key);
}

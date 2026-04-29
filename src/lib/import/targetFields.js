// Target field definitions for the Data Import flow.
//
// Each entry describes one field a user can map a CSV column to. The wizard
// uses this catalog to build the right-hand "SF field" dropdowns and to
// validate that required fields have been mapped.

export const TARGET_FIELDS = {
  customers: [
    { key: 'firstName', label: 'First Name', required: true },
    { key: 'lastName', label: 'Last Name', required: true },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'additionalPhone', label: 'Additional Phone' },
    { key: 'address', label: 'Address' },
    { key: 'apt', label: 'Apt / Suite' },
    { key: 'city', label: 'City' },
    { key: 'state', label: 'State' },
    { key: 'zipCode', label: 'Zip / Postal Code' },
    { key: 'companyName', label: 'Company Name' },
    { key: 'notes', label: 'Notes' },
    { key: 'status', label: 'Status' },
    { key: 'tags', label: 'Tags' },
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
    // Job details
    { key: 'serviceName', label: 'Service Name', group: 'Job' },
    { key: 'scheduledDate', label: 'Scheduled Date', required: true, group: 'Job' },
    { key: 'scheduledTime', label: 'Scheduled Time', group: 'Job' },
    { key: 'bookingStartDateTime', label: 'Booking Start (ISO datetime)', group: 'Job' },
    { key: 'bookingEndDateTime', label: 'Booking End (ISO datetime)', group: 'Job' },
    { key: 'duration', label: 'Duration (min or HH:MM)', group: 'Job' },
    { key: 'status', label: 'Status', group: 'Job' },
    { key: 'price', label: 'Price', group: 'Job' },
    { key: 'serviceTotal', label: 'Service Total', group: 'Job' },
    { key: 'finalAmount', label: 'Final Amount', group: 'Job' },
    { key: 'amountPaidByCustomer', label: 'Amount Paid', group: 'Job' },
    { key: 'amountOwed', label: 'Amount Owed', group: 'Job' },
    { key: 'paymentMethod', label: 'Payment Method', group: 'Job' },
    { key: 'notes', label: 'Notes', group: 'Job' },
    { key: 'isRecurring', label: 'Is Recurring', group: 'Job' },
    { key: 'recurringFrequency', label: 'Recurring Frequency', group: 'Job' },
    { key: 'extras', label: 'Extras', group: 'Job' },
    { key: 'excludes', label: 'Excludes', group: 'Job' },
    { key: 'assignedCrewExternalId', label: 'Assigned Crew (external ID)', group: 'Job' },
    { key: 'serviceRegionExternalId', label: 'Service Region / Location', group: 'Job' },
    { key: 'externalId', label: 'External Job ID (dedup key)', group: 'Job' },
  ],

  team_members: [
    { key: 'firstName', label: 'First Name', required: true },
    { key: 'lastName', label: 'Last Name', required: true },
    { key: 'email', label: 'Email', required: true },
    { key: 'phone', label: 'Phone' },
    { key: 'role', label: 'Role (cleaner / manager / office / admin)' },
    { key: 'hourlyRate', label: 'Hourly Rate' },
    { key: 'commission', label: 'Commission %' },
    { key: 'isActive', label: 'Active (true/false)' },
    { key: 'city', label: 'City' },
    { key: 'state', label: 'State' },
    { key: 'zipCode', label: 'Zip / Postal Code' },
    { key: 'color', label: 'Color' },
  ],

  services: [
    { key: 'name', label: 'Name', required: true },
    { key: 'description', label: 'Description' },
    { key: 'price', label: 'Price' },
    { key: 'duration', label: 'Duration (min or HH:MM)' },
    { key: 'category', label: 'Category' },
    { key: 'isActive', label: 'Active (true/false)' },
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

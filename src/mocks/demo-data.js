// ─── Demo seed data — mirrors real API response shapes ────────────────────────
// Used by DemoPageWrapper to provide realistic content without a live backend.

// ─── Shared IDs ───────────────────────────────────────────────────────────────
export const DEMO_USER_ID = "demo-user-001"

export const DEMO_USER = {
  id: DEMO_USER_ID,
  role: "admin",
  teamMemberRole: "admin",
  permissions: JSON.stringify({ all: true }),
  businessName: "Sparkle Clean Co.",
  business_name: "Sparkle Clean Co.",
  email: "demo@sparkleclean.com",
  name: "Alex Rivera",
  firstName: "Alex",
  lastName: "Rivera",
  phone: "555-0100",
  profilePicture: null,
  slug: "sparkleclean",
}

// ─── Territories ──────────────────────────────────────────────────────────────
export const DEMO_TERRITORIES = [
  { _id: "t1", name: "Downtown", zipCodes: ["60601","60602","60603"], color: "#3B82F6", active: true, jobCount: 24, teamMemberCount: 3 },
  { _id: "t2", name: "North Side", zipCodes: ["60610","60611","60614"], color: "#10B981", active: true, jobCount: 18, teamMemberCount: 2 },
  { _id: "t3", name: "South Loop", zipCodes: ["60605","60616"], color: "#F59E0B", active: true, jobCount: 11, teamMemberCount: 2 },
]

// ─── Team members ─────────────────────────────────────────────────────────────
export const DEMO_TEAM = [
  {
    _id: "tm1", userId: DEMO_USER_ID,
    firstName: "Maria", lastName: "Santos", name: "Maria Santos",
    email: "maria@sparkleclean.com", phone: "555-0201",
    role: "cleaner", status: "active",
    payRate: 22, payType: "hourly",
    territories: ["t1", "t2"],
    skills: ["Deep Clean", "Move-Out"],
    rating: 4.9, jobsCompleted: 148,
    profilePicture: null,
    availability: { monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: false, sunday: false },
  },
  {
    _id: "tm2", userId: DEMO_USER_ID,
    firstName: "James", lastName: "Kim", name: "James Kim",
    email: "james@sparkleclean.com", phone: "555-0202",
    role: "cleaner", status: "active",
    payRate: 20, payType: "hourly",
    territories: ["t1", "t3"],
    skills: ["Office Clean", "Standard Clean"],
    rating: 4.7, jobsCompleted: 92,
    profilePicture: null,
    availability: { monday: true, tuesday: true, wednesday: false, thursday: true, friday: true, saturday: true, sunday: false },
  },
  {
    _id: "tm3", userId: DEMO_USER_ID,
    firstName: "Sofia", lastName: "Reyes", name: "Sofia Reyes",
    email: "sofia@sparkleclean.com", phone: "555-0203",
    role: "cleaner", status: "active",
    payRate: 21, payType: "hourly",
    territories: ["t2", "t3"],
    skills: ["Deep Clean", "Standard Clean", "Window Cleaning"],
    rating: 4.8, jobsCompleted: 116,
    profilePicture: null,
    availability: { monday: false, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: true, sunday: false },
  },
  {
    _id: "tm4", userId: DEMO_USER_ID,
    firstName: "Derek", lastName: "Osei", name: "Derek Osei",
    email: "derek@sparkleclean.com", phone: "555-0204",
    role: "supervisor", status: "active",
    payRate: 28, payType: "hourly",
    territories: ["t1", "t2", "t3"],
    skills: ["Deep Clean", "Standard Clean", "Move-Out", "Office Clean"],
    rating: 5.0, jobsCompleted: 203,
    profilePicture: null,
    availability: { monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: false, sunday: false },
  },
  {
    _id: "tm5", userId: DEMO_USER_ID,
    firstName: "Priya", lastName: "Nair", name: "Priya Nair",
    email: "priya@sparkleclean.com", phone: "555-0205",
    role: "cleaner", status: "inactive",
    payRate: 19, payType: "hourly",
    territories: ["t3"],
    skills: ["Standard Clean"],
    rating: 4.5, jobsCompleted: 47,
    profilePicture: null,
    availability: { monday: true, tuesday: false, wednesday: true, thursday: false, friday: true, saturday: false, sunday: false },
  },
]

// ─── Services ─────────────────────────────────────────────────────────────────
export const DEMO_SERVICES = [
  {
    _id: "svc1", userId: DEMO_USER_ID,
    name: "Standard Clean", category: "Residential",
    description: "Regular maintenance cleaning — perfect for weekly or bi-weekly visits.",
    price: 120, duration: 2, active: true,
    bookable: true, popular: true,
    modifiers: [
      { name: "Extra Bathroom", price: 15 },
      { name: "Inside Oven", price: 20 },
    ],
  },
  {
    _id: "svc2", userId: DEMO_USER_ID,
    name: "Deep Clean", category: "Residential",
    description: "Thorough top-to-bottom clean including inside appliances, baseboards, and more.",
    price: 220, duration: 4, active: true,
    bookable: true, popular: true,
    modifiers: [
      { name: "Inside Fridge", price: 25 },
      { name: "Window Interior", price: 30 },
    ],
  },
  {
    _id: "svc3", userId: DEMO_USER_ID,
    name: "Move-In / Move-Out", category: "Residential",
    description: "Complete empty-home cleaning for tenants or home-sellers.",
    price: 280, duration: 5, active: true,
    bookable: true, popular: false,
    modifiers: [
      { name: "Garage", price: 40 },
      { name: "Carpet Steam Clean", price: 60 },
    ],
  },
  {
    _id: "svc4", userId: DEMO_USER_ID,
    name: "Office Cleaning", category: "Commercial",
    description: "Professional office cleaning — desks, restrooms, kitchen, and common areas.",
    price: 180, duration: 3, active: true,
    bookable: true, popular: false,
    modifiers: [
      { name: "Conference Rooms (+2)", price: 30 },
      { name: "After-Hours Premium", price: 25 },
    ],
  },
]

// ─── Customers ────────────────────────────────────────────────────────────────
export const DEMO_CUSTOMERS = [
  {
    _id: "c1", userId: DEMO_USER_ID,
    name: "Jennifer Walsh", email: "j.walsh@email.com", phone: "555-1001",
    address: "214 W Erie St, Chicago, IL 60654",
    notes: "Prefers eco-friendly products. Has a dog — Labrador.",
    totalSpent: 1440, jobCount: 12, lastServiceDate: "2025-02-10",
    source: "online-booking", tags: ["VIP", "Recurring"],
    createdAt: "2024-03-15",
  },
  {
    _id: "c2", userId: DEMO_USER_ID,
    name: "Marcus Thompson", email: "mthompson@biz.com", phone: "555-1002",
    address: "455 N Cityfront Plaza Dr, Chicago, IL 60611",
    notes: "Commercial account — office on 12th floor. Badge required at reception.",
    totalSpent: 3600, jobCount: 20, lastServiceDate: "2025-02-14",
    source: "referral", tags: ["Commercial", "Recurring"],
    createdAt: "2024-01-08",
  },
  {
    _id: "c3", userId: DEMO_USER_ID,
    name: "Chloe Bennett", email: "chloe.b@gmail.com", phone: "555-1003",
    address: "1600 N Wells St, Chicago, IL 60614",
    notes: "Allergic to bleach. Use green cleaners only.",
    totalSpent: 360, jobCount: 3, lastServiceDate: "2025-01-28",
    source: "google", tags: [],
    createdAt: "2024-11-02",
  },
  {
    _id: "c4", userId: DEMO_USER_ID,
    name: "Omar Hassan", email: "ohassan@outlook.com", phone: "555-1004",
    address: "3100 N Sheridan Rd, Chicago, IL 60657",
    notes: "Leave key under mat. No arrival calls needed.",
    totalSpent: 840, jobCount: 7, lastServiceDate: "2025-02-01",
    source: "facebook", tags: ["Recurring"],
    createdAt: "2024-05-20",
  },
  {
    _id: "c5", userId: DEMO_USER_ID,
    name: "Rachel Nguyen", email: "rachel.n@corp.io", phone: "555-1005",
    address: "500 W Madison St Ste 3700, Chicago, IL 60661",
    notes: "New commercial client. Quarterly deep-clean contract.",
    totalSpent: 840, jobCount: 3, lastServiceDate: "2025-01-15",
    source: "cold-outreach", tags: ["Commercial"],
    createdAt: "2024-09-01",
  },
  {
    _id: "c6", userId: DEMO_USER_ID,
    name: "Tom Erikson", email: "tom.erikson@me.com", phone: "555-1006",
    address: "2200 N Lincoln Park W, Chicago, IL 60614",
    notes: "Prefers morning slots. 2-bedroom condo, 2 cats.",
    totalSpent: 600, jobCount: 5, lastServiceDate: "2025-01-22",
    source: "referral", tags: [],
    createdAt: "2024-06-11",
  },
  {
    _id: "c7", userId: DEMO_USER_ID,
    name: "Amara Okonkwo", email: "amara.ok@email.com", phone: "555-1007",
    address: "720 N Michigan Ave, Chicago, IL 60611",
    notes: "Move-out clean before Feb 28 deadline.",
    totalSpent: 280, jobCount: 1, lastServiceDate: "2025-02-05",
    source: "google", tags: ["One-time"],
    createdAt: "2025-01-20",
  },
  {
    _id: "c8", userId: DEMO_USER_ID,
    name: "David Park", email: "d.park@startupco.com", phone: "555-1008",
    address: "1 N Dearborn St, Chicago, IL 60602",
    notes: "Startup office, open floorplan, 30 desks.",
    totalSpent: 1080, jobCount: 6, lastServiceDate: "2025-02-12",
    source: "online-booking", tags: ["Commercial", "Recurring"],
    createdAt: "2024-08-15",
  },
]

// ─── Jobs ─────────────────────────────────────────────────────────────────────
const today = new Date()
const d = (offsetDays, h = 9, m = 0) => {
  const dt = new Date(today)
  dt.setDate(dt.getDate() + offsetDays)
  dt.setHours(h, m, 0, 0)
  return dt.toISOString()
}

export const DEMO_JOBS = [
  {
    _id: "j1", userId: DEMO_USER_ID,
    title: "Standard Clean — Walsh", status: "completed",
    customer: DEMO_CUSTOMERS[0], service: DEMO_SERVICES[0],
    address: DEMO_CUSTOMERS[0].address, territory: DEMO_TERRITORIES[0],
    assignedTeamMembers: [DEMO_TEAM[0]],
    scheduledDate: d(-2, 9), duration: 2,
    price: 120, paid: true, paymentMethod: "card",
    notes: "Completed on time. Client very satisfied.",
    createdAt: d(-10),
  },
  {
    _id: "j2", userId: DEMO_USER_ID,
    title: "Office Clean — Thompson", status: "completed",
    customer: DEMO_CUSTOMERS[1], service: DEMO_SERVICES[3],
    address: DEMO_CUSTOMERS[1].address, territory: DEMO_TERRITORIES[0],
    assignedTeamMembers: [DEMO_TEAM[1], DEMO_TEAM[3]],
    scheduledDate: d(-1, 18), duration: 3,
    price: 210, paid: true, paymentMethod: "invoice",
    notes: "After-hours clean. Badge left with reception.",
    createdAt: d(-7),
  },
  {
    _id: "j3", userId: DEMO_USER_ID,
    title: "Deep Clean — Bennett", status: "scheduled",
    customer: DEMO_CUSTOMERS[2], service: DEMO_SERVICES[1],
    address: DEMO_CUSTOMERS[2].address, territory: DEMO_TERRITORIES[1],
    assignedTeamMembers: [DEMO_TEAM[2]],
    scheduledDate: d(1, 10), duration: 4,
    price: 220, paid: false, paymentMethod: "card",
    notes: "Avoid bleach. Use green products only.",
    createdAt: d(-3),
  },
  {
    _id: "j4", userId: DEMO_USER_ID,
    title: "Standard Clean — Hassan", status: "scheduled",
    customer: DEMO_CUSTOMERS[3], service: DEMO_SERVICES[0],
    address: DEMO_CUSTOMERS[3].address, territory: DEMO_TERRITORIES[1],
    assignedTeamMembers: [DEMO_TEAM[0]],
    scheduledDate: d(0, 13), duration: 2,
    price: 120, paid: false, paymentMethod: "cash",
    notes: "Key under mat.",
    createdAt: d(-2),
  },
  {
    _id: "j5", userId: DEMO_USER_ID,
    title: "Quarterly Deep Clean — Nguyen", status: "scheduled",
    customer: DEMO_CUSTOMERS[4], service: DEMO_SERVICES[1],
    address: DEMO_CUSTOMERS[4].address, territory: DEMO_TERRITORIES[0],
    assignedTeamMembers: [DEMO_TEAM[1], DEMO_TEAM[3]],
    scheduledDate: d(2, 8), duration: 5,
    price: 340, paid: false, paymentMethod: "invoice",
    notes: "Quarterly contract. 3 conference rooms.",
    createdAt: d(-1),
  },
  {
    _id: "j6", userId: DEMO_USER_ID,
    title: "Standard Clean — Erikson", status: "in_progress",
    customer: DEMO_CUSTOMERS[5], service: DEMO_SERVICES[0],
    address: DEMO_CUSTOMERS[5].address, territory: DEMO_TERRITORIES[1],
    assignedTeamMembers: [DEMO_TEAM[2]],
    scheduledDate: d(0, 9), duration: 2,
    price: 120, paid: false, paymentMethod: "card",
    notes: "2 cats in the apartment — heads up.",
    createdAt: d(-1),
  },
  {
    _id: "j7", userId: DEMO_USER_ID,
    title: "Move-Out Clean — Okonkwo", status: "scheduled",
    customer: DEMO_CUSTOMERS[6], service: DEMO_SERVICES[2],
    address: DEMO_CUSTOMERS[6].address, territory: DEMO_TERRITORIES[0],
    assignedTeamMembers: [DEMO_TEAM[0], DEMO_TEAM[3]],
    scheduledDate: d(3, 9), duration: 5,
    price: 280, paid: false, paymentMethod: "card",
    notes: "Deadline is Feb 28. Unit should be empty.",
    createdAt: d(-2),
  },
  {
    _id: "j8", userId: DEMO_USER_ID,
    title: "Office Clean — Park Startup", status: "completed",
    customer: DEMO_CUSTOMERS[7], service: DEMO_SERVICES[3],
    address: DEMO_CUSTOMERS[7].address, territory: DEMO_TERRITORIES[0],
    assignedTeamMembers: [DEMO_TEAM[1]],
    scheduledDate: d(-3, 19), duration: 3,
    price: 180, paid: true, paymentMethod: "invoice",
    notes: "30-desk open plan. Weekly recurring.",
    createdAt: d(-14),
  },
  {
    _id: "j9", userId: DEMO_USER_ID,
    title: "Standard Clean — Walsh", status: "scheduled",
    customer: DEMO_CUSTOMERS[0], service: DEMO_SERVICES[0],
    address: DEMO_CUSTOMERS[0].address, territory: DEMO_TERRITORIES[0],
    assignedTeamMembers: [DEMO_TEAM[0]],
    scheduledDate: d(4, 9), duration: 2,
    price: 120, paid: false, paymentMethod: "card",
    notes: "Regular visit — weekly recurring.",
    createdAt: d(-7),
  },
  {
    _id: "j10", userId: DEMO_USER_ID,
    title: "Deep Clean — Hassan", status: "cancelled",
    customer: DEMO_CUSTOMERS[3], service: DEMO_SERVICES[1],
    address: DEMO_CUSTOMERS[3].address, territory: DEMO_TERRITORIES[1],
    assignedTeamMembers: [],
    scheduledDate: d(-4, 11), duration: 4,
    price: 220, paid: false, paymentMethod: "card",
    notes: "Client cancelled 24 hrs before. Cancellation fee applied.",
    createdAt: d(-10),
  },
  {
    _id: "j11", userId: DEMO_USER_ID,
    title: "Office Clean — Thompson", status: "scheduled",
    customer: DEMO_CUSTOMERS[1], service: DEMO_SERVICES[3],
    address: DEMO_CUSTOMERS[1].address, territory: DEMO_TERRITORIES[0],
    assignedTeamMembers: [DEMO_TEAM[1], DEMO_TEAM[3]],
    scheduledDate: d(5, 18), duration: 3,
    price: 210, paid: false, paymentMethod: "invoice",
    notes: "Bi-weekly recurring.",
    createdAt: d(-14),
  },
  {
    _id: "j12", userId: DEMO_USER_ID,
    title: "Standard Clean — Park Startup", status: "scheduled",
    customer: DEMO_CUSTOMERS[7], service: DEMO_SERVICES[3],
    address: DEMO_CUSTOMERS[7].address, territory: DEMO_TERRITORIES[0],
    assignedTeamMembers: [DEMO_TEAM[1]],
    scheduledDate: d(6, 19), duration: 3,
    price: 180, paid: false, paymentMethod: "invoice",
    notes: "Weekly recurring.",
    createdAt: d(-7),
  },
]

// ─── Invoices ─────────────────────────────────────────────────────────────────
export const DEMO_INVOICES = [
  {
    _id: "inv1", userId: DEMO_USER_ID, invoiceNumber: "INV-2025-001",
    customer: DEMO_CUSTOMERS[1], job: DEMO_JOBS[1],
    services: [{ name: "Office Cleaning", price: 180 }, { name: "After-Hours Premium", price: 25 }],
    subtotal: 205, tax: 5, discount: 0, total: 210,
    status: "paid", dueDate: d(-7), paidDate: d(-2),
    paymentMethod: "bank-transfer", notes: "",
    createdAt: d(-10),
  },
  {
    _id: "inv2", userId: DEMO_USER_ID, invoiceNumber: "INV-2025-002",
    customer: DEMO_CUSTOMERS[7], job: DEMO_JOBS[7],
    services: [{ name: "Office Cleaning", price: 180 }],
    subtotal: 180, tax: 0, discount: 0, total: 180,
    status: "paid", dueDate: d(-3), paidDate: d(-1),
    paymentMethod: "card", notes: "Recurring weekly invoice.",
    createdAt: d(-7),
  },
  {
    _id: "inv3", userId: DEMO_USER_ID, invoiceNumber: "INV-2025-003",
    customer: DEMO_CUSTOMERS[4], job: DEMO_JOBS[4],
    services: [{ name: "Deep Clean", price: 220 }, { name: "Conference Rooms (+2)", price: 60 }, { name: "After-Hours Premium", price: 25 }],
    subtotal: 305, tax: 35, discount: 0, total: 340,
    status: "pending", dueDate: d(7), paidDate: null,
    paymentMethod: "invoice", notes: "Net 30 terms.",
    createdAt: d(-1),
  },
  {
    _id: "inv4", userId: DEMO_USER_ID, invoiceNumber: "INV-2025-004",
    customer: DEMO_CUSTOMERS[1], job: DEMO_JOBS[10],
    services: [{ name: "Office Cleaning", price: 180 }, { name: "After-Hours Premium", price: 25 }],
    subtotal: 205, tax: 5, discount: 0, total: 210,
    status: "pending", dueDate: d(10), paidDate: null,
    paymentMethod: "invoice", notes: "",
    createdAt: d(0),
  },
  {
    _id: "inv5", userId: DEMO_USER_ID, invoiceNumber: "INV-2025-005",
    customer: DEMO_CUSTOMERS[7], job: DEMO_JOBS[11],
    services: [{ name: "Office Cleaning", price: 180 }],
    subtotal: 180, tax: 0, discount: 0, total: 180,
    status: "pending", dueDate: d(13), paidDate: null,
    paymentMethod: "invoice", notes: "Weekly recurring.",
    createdAt: d(0),
  },
  {
    _id: "inv6", userId: DEMO_USER_ID, invoiceNumber: "INV-2025-006",
    customer: DEMO_CUSTOMERS[3], job: DEMO_JOBS[9],
    services: [{ name: "Cancellation Fee", price: 50 }],
    subtotal: 50, tax: 0, discount: 0, total: 50,
    status: "overdue", dueDate: d(-5), paidDate: null,
    paymentMethod: "card", notes: "Cancellation fee — 24hr notice.",
    createdAt: d(-8),
  },
]

// ─── Estimates ────────────────────────────────────────────────────────────────
export const DEMO_ESTIMATES = [
  {
    _id: "est1", userId: DEMO_USER_ID, estimateNumber: "EST-2025-001",
    customer: DEMO_CUSTOMERS[4],
    services: [{ name: "Office Cleaning", price: 180 }, { name: "Conference Rooms (+2)", price: 30 }],
    subtotal: 210, tax: 0, discount: 0, total: 210,
    status: "accepted", expiryDate: d(20), notes: "Quarterly contract proposal.",
    createdAt: d(-5),
  },
  {
    _id: "est2", userId: DEMO_USER_ID, estimateNumber: "EST-2025-002",
    customer: DEMO_CUSTOMERS[6],
    services: [{ name: "Move-In / Move-Out", price: 280 }, { name: "Carpet Steam Clean", price: 60 }],
    subtotal: 340, tax: 0, discount: 20, total: 320,
    status: "sent", expiryDate: d(7), notes: "10% first-time discount applied.",
    createdAt: d(-2),
  },
  {
    _id: "est3", userId: DEMO_USER_ID, estimateNumber: "EST-2025-003",
    customer: DEMO_CUSTOMERS[2],
    services: [{ name: "Deep Clean", price: 220 }, { name: "Inside Fridge", price: 25 }, { name: "Window Interior", price: 30 }],
    subtotal: 275, tax: 0, discount: 0, total: 275,
    status: "draft", expiryDate: d(14), notes: "",
    createdAt: d(0),
  },
]

// ─── Payments ─────────────────────────────────────────────────────────────────
export const DEMO_PAYMENTS = [
  { _id: "pay1", userId: DEMO_USER_ID, amount: 210, method: "bank-transfer", status: "completed", customer: DEMO_CUSTOMERS[1], invoice: DEMO_INVOICES[0], date: d(-2), notes: "" },
  { _id: "pay2", userId: DEMO_USER_ID, amount: 180, method: "card", status: "completed", customer: DEMO_CUSTOMERS[7], invoice: DEMO_INVOICES[1], date: d(-1), notes: "" },
  { _id: "pay3", userId: DEMO_USER_ID, amount: 120, method: "card", status: "completed", customer: DEMO_CUSTOMERS[0], invoice: null, date: d(-2), notes: "On-site card payment." },
  { _id: "pay4", userId: DEMO_USER_ID, amount: 120, method: "cash", status: "completed", customer: DEMO_CUSTOMERS[5], invoice: null, date: d(-6), notes: "" },
  { _id: "pay5", userId: DEMO_USER_ID, amount: 180, method: "card", status: "completed", customer: DEMO_CUSTOMERS[7], invoice: null, date: d(-10), notes: "" },
]

// ─── Leads ────────────────────────────────────────────────────────────────────
export const DEMO_LEADS = [
  {
    _id: "l1", userId: DEMO_USER_ID,
    name: "Sandra Lee", email: "slee@homemail.com", phone: "555-2001",
    service: "Standard Clean", address: "4500 N Clark St, Chicago, IL",
    notes: "Looking for bi-weekly cleaning, 3BR condo.",
    status: "new", priority: "high",
    source: "google-ads",
    estimatedValue: 240, assignedTo: DEMO_TEAM[3],
    createdAt: d(-1),
  },
  {
    _id: "l2", userId: DEMO_USER_ID,
    name: "Kevin Murphy", email: "kmurphy@corp.com", phone: "555-2002",
    service: "Office Cleaning", address: "303 E Wacker Dr, Chicago, IL",
    notes: "20-person office, needs nightly cleaning contract.",
    status: "contacted", priority: "high",
    source: "referral",
    estimatedValue: 1440, assignedTo: DEMO_TEAM[3],
    createdAt: d(-3),
  },
  {
    _id: "l3", userId: DEMO_USER_ID,
    name: "Nina Patel", email: "npatel@email.com", phone: "555-2003",
    service: "Deep Clean", address: "800 N Michigan Ave, Chicago, IL",
    notes: "One-time deep clean before selling the condo.",
    status: "quoted", priority: "medium",
    source: "online-booking",
    estimatedValue: 220, assignedTo: DEMO_TEAM[0],
    createdAt: d(-5),
  },
  {
    _id: "l4", userId: DEMO_USER_ID,
    name: "Carlos Mejia", email: "cmejia@gmail.com", phone: "555-2004",
    service: "Move-In / Move-Out", address: "1200 W Diversey Pkwy, Chicago, IL",
    notes: "Moving out end of month. Needs full clean.",
    status: "new", priority: "medium",
    source: "facebook",
    estimatedValue: 280, assignedTo: null,
    createdAt: d(0),
  },
  {
    _id: "l5", userId: DEMO_USER_ID,
    name: "Yuki Tanaka", email: "ytanaka@email.com", phone: "555-2005",
    service: "Standard Clean", address: "2900 N Sheffield Ave, Chicago, IL",
    notes: "Weekly recurring. 2BR apartment.",
    status: "follow-up", priority: "low",
    source: "instagram",
    estimatedValue: 480, assignedTo: DEMO_TEAM[2],
    createdAt: d(-7),
  },
  {
    _id: "l6", userId: DEMO_USER_ID,
    name: "Greg Williams", email: "gwilliams@tech.io", phone: "555-2006",
    service: "Office Cleaning", address: "222 W Adams St, Chicago, IL",
    notes: "Small tech office, 10 desks, monthly deep-clean.",
    status: "lost", priority: "low",
    source: "cold-outreach",
    estimatedValue: 220, assignedTo: null,
    createdAt: d(-14),
  },
]

// ─── Notifications ────────────────────────────────────────────────────────────
export const DEMO_NOTIFICATIONS = [
  { _id: "n1", userId: DEMO_USER_ID, type: "job_completed", title: "Job Completed", message: "Office Clean — Thompson marked as complete.", read: false, createdAt: d(-1, 19) },
  { _id: "n2", userId: DEMO_USER_ID, type: "new_booking", title: "New Booking", message: "Jennifer Walsh booked a Standard Clean for Friday.", read: false, createdAt: d(0, 8) },
  { _id: "n3", userId: DEMO_USER_ID, type: "payment_received", title: "Payment Received", message: "$180 received from David Park (INV-2025-002).", read: true, createdAt: d(-1, 14) },
  { _id: "n4", userId: DEMO_USER_ID, type: "invoice_overdue", title: "Invoice Overdue", message: "INV-2025-006 for Omar Hassan is 5 days overdue.", read: false, createdAt: d(0, 7) },
  { _id: "n5", userId: DEMO_USER_ID, type: "new_lead", title: "New Lead", message: "Carlos Mejia submitted a Move-Out Clean request.", read: true, createdAt: d(0, 6) },
  { _id: "n6", userId: DEMO_USER_ID, type: "review", title: "5-Star Review", message: "Jennifer Walsh left a 5-star review: 'Always spotless!'", read: true, createdAt: d(-2, 20) },
]

// ─── Analytics ────────────────────────────────────────────────────────────────
const months = ["Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb"]
export const DEMO_ANALYTICS = {
  totalRevenue: 18740,
  totalJobs: 147,
  averageJobValue: 127.5,
  repeatCustomerRate: 0.72,
  jobsByStatus: { completed: 118, scheduled: 20, in_progress: 2, cancelled: 7 },
  revenueByMonth: months.map((m, i) => ({ month: m, revenue: [2100, 2450, 2700, 3200, 2850, 2620, 2820][i] })),
  jobsByMonth: months.map((m, i) => ({ month: m, count: [17, 19, 21, 25, 22, 21, 22][i] })),
  topServices: [
    { name: "Standard Clean", count: 78, revenue: 9360 },
    { name: "Deep Clean", count: 34, revenue: 7480 },
    { name: "Office Cleaning", count: 22, revenue: 3960 },
    { name: "Move-In/Out", count: 13, revenue: 3640 },
  ],
  topTeamMembers: DEMO_TEAM.slice(0, 4).map((m, i) => ({
    name: m.name, jobsCompleted: [48, 37, 32, 30][i], revenue: [5760, 4440, 3840, 3600][i], rating: m.rating,
  })),
}

// ─── Payroll ──────────────────────────────────────────────────────────────────
export const DEMO_PAYROLL = DEMO_TEAM.slice(0, 4).map((m) => ({
  teamMember: m,
  hoursWorked: Math.floor(Math.random() * 20 + 60),
  jobsCompleted: Math.floor(Math.random() * 10 + 20),
  grossPay: (Math.floor(Math.random() * 20 + 60)) * m.payRate,
  tips: Math.floor(Math.random() * 40),
  deductions: 0,
  netPay: (Math.floor(Math.random() * 20 + 60)) * m.payRate + Math.floor(Math.random() * 40),
  period: "Feb 1 – Feb 15, 2025",
}))

// ─── API response wrappers ────────────────────────────────────────────────────
// These match the shapes the page components expect from the API.

export const RESPONSES = {
  jobs: {
    jobs: DEMO_JOBS,
    total: DEMO_JOBS.length,
    page: 1,
    limit: 20,
    stats: {
      scheduled: DEMO_JOBS.filter((j) => j.status === "scheduled").length,
      in_progress: DEMO_JOBS.filter((j) => j.status === "in_progress").length,
      completed: DEMO_JOBS.filter((j) => j.status === "completed").length,
      cancelled: DEMO_JOBS.filter((j) => j.status === "cancelled").length,
    },
  },
  customers: {
    customers: DEMO_CUSTOMERS,
    total: DEMO_CUSTOMERS.length,
    page: 1,
    limit: 20,
  },
  invoices: {
    invoices: DEMO_INVOICES,
    total: DEMO_INVOICES.length,
    page: 1,
    limit: 20,
    totalRevenue: DEMO_INVOICES.filter((i) => i.status === "paid").reduce((s, i) => s + i.total, 0),
    pendingAmount: DEMO_INVOICES.filter((i) => i.status === "pending").reduce((s, i) => s + i.total, 0),
    overdueAmount: DEMO_INVOICES.filter((i) => i.status === "overdue").reduce((s, i) => s + i.total, 0),
  },
  estimates: {
    estimates: DEMO_ESTIMATES,
    total: DEMO_ESTIMATES.length,
  },
  payments: {
    payments: DEMO_PAYMENTS,
    total: DEMO_PAYMENTS.length,
    totalAmount: DEMO_PAYMENTS.reduce((s, p) => s + p.amount, 0),
  },
  team: {
    teamMembers: DEMO_TEAM,
    total: DEMO_TEAM.length,
  },
  services: {
    services: DEMO_SERVICES,
    total: DEMO_SERVICES.length,
    categories: ["Residential", "Commercial"],
  },
  territories: {
    territories: DEMO_TERRITORIES,
    total: DEMO_TERRITORIES.length,
  },
  leads: {
    leads: DEMO_LEADS,
    total: DEMO_LEADS.length,
    stats: {
      new: DEMO_LEADS.filter((l) => l.status === "new").length,
      contacted: DEMO_LEADS.filter((l) => l.status === "contacted").length,
      quoted: DEMO_LEADS.filter((l) => l.status === "quoted").length,
      "follow-up": DEMO_LEADS.filter((l) => l.status === "follow-up").length,
      lost: DEMO_LEADS.filter((l) => l.status === "lost").length,
    },
  },
  notifications: {
    notifications: DEMO_NOTIFICATIONS,
    unreadCount: DEMO_NOTIFICATIONS.filter((n) => !n.read).length,
    total: DEMO_NOTIFICATIONS.length,
  },
  analytics: DEMO_ANALYTICS,
  payroll: {
    payroll: DEMO_PAYROLL,
    total: DEMO_PAYROLL.length,
    period: "Feb 1 – Feb 15, 2025",
  },
  userProfile: {
    ...DEMO_USER,
    businessSettings: {
      currency: "USD",
      timezone: "America/Chicago",
      logo: null,
      primaryColor: "#1a1a2e",
    },
  },
  // Generic success for write operations
  success: { success: true, message: "Demo mode — no changes persisted." },
}

// ─── URL → response matcher ───────────────────────────────────────────────────
export function matchDemoResponse(url = "", method = "get") {
  // Write ops always succeed silently
  if (["post", "put", "patch", "delete"].includes(method.toLowerCase())) {
    return RESPONSES.success
  }

  if (/\/jobs/.test(url))            return RESPONSES.jobs
  if (/\/customers/.test(url))       return RESPONSES.customers
  if (/\/invoices/.test(url))        return RESPONSES.invoices
  if (/\/estimates/.test(url))       return RESPONSES.estimates
  if (/\/payments/.test(url))        return RESPONSES.payments
  if (/\/team/.test(url))            return RESPONSES.team
  if (/\/services/.test(url))        return RESPONSES.services
  if (/\/territories/.test(url))     return RESPONSES.territories
  if (/\/leads/.test(url))           return RESPONSES.leads
  if (/\/notifications/.test(url))   return RESPONSES.notifications
  if (/\/analytics/.test(url))       return RESPONSES.analytics
  if (/\/payroll/.test(url))         return RESPONSES.payroll
  if (/\/user-profile/.test(url))    return RESPONSES.userProfile
  if (/\/availability/.test(url))    return { availability: [], slots: [] }
  if (/\/coupons/.test(url))         return { coupons: [], total: 0 }
  if (/\/recurring/.test(url))       return { recurringBookings: [], total: 0 }
  if (/\/service-templates/.test(url)) return { templates: [] }
  if (/\/settings/.test(url))        return { settings: {} }
  if (/\/branding/.test(url))        return { branding: { primaryColor: "#1a1a2e", logo: null } }
  if (/\/business/.test(url))        return RESPONSES.userProfile

  return RESPONSES.success
}

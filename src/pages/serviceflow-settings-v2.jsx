"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { useNavigate } from "react-router-dom"
import {
  Building2,
  Palette,
  Calendar,
  CalendarCheck,
  CalendarX,
  MapPin,
  Users,
  MessageSquare,
  Bell,
  Star,
  CreditCard,
  Calculator,
  CalendarDays,
  Code,
  Smartphone,
  ChevronRight,
  Settings as SettingsIcon,
  FileSpreadsheet,
  Upload,
  Zap,
  Banknote,
  Radio,
  Search as SearchIcon,
  CreditCard as BillingIcon,
  User as UserIcon,
  CheckCircle2,
  Sparkles,
} from "lucide-react"
import { useAuth } from "../context/AuthContext"
import { canEditAccountOwnerSettings } from "../utils/roleUtils"
import BusinessDetailsModal from "../components/business-details-modal"
import SchedulingBookingModal from "../components/scheduling-booking-modal"
import MobileHeader from "../components/mobile-header"
import {
  SfCard,
  SfButton,
  SfTag,
  SfAvatar,
  SfPageHeader,
  sfInitials,
} from "../components/sf-primitives"

/**
 * Settings hub v2 (Wave 6) — Service Blue redesign of /settings.
 *
 * Layout: left section-rail (sticky on lg+) + right scrolling
 * content. Top: profile + billing cards. Each section is an SfCard
 * group with title and item rows. Search field at top filters in
 * place across every section.
 *
 * Sub-pages (40+) keep their existing implementations; this is the
 * hub redesign only.
 */

// ── Sections definition (single source of truth) ───────────

const SECTIONS = [
  {
    id: "business",
    title: "Business",
    items: [
      { id: "business-details",    icon: Building2,      title: "Business details",
        desc: "View and update your business details", active: true, action: "modal" },
      { id: "branding",            icon: Palette,        title: "Branding",
        desc: "Customize your branding for emails, invoices, and the rescheduling page", active: false, to: "/settings/branding" },
      { id: "services",            icon: SettingsIcon,   title: "Services",
        desc: "Configure default service settings and manage categories", active: true, to: "/services" },
      { id: "service-areas",       icon: MapPin,         title: "Territories",
        desc: "Customize the geographic areas you service", active: true, to: "/territories" },
    ],
  },
  {
    id: "scheduling",
    title: "Scheduling & booking",
    items: [
      { id: "availability",        icon: Calendar,       title: "Availability",
        desc: "Set hours of operation and add unexpected schedule changes", active: true, to: "/settings/availability" },
      { id: "scheduling-policies", icon: CalendarCheck,  title: "Scheduling policies",
        desc: "Customize scheduling rules and how availability is determined", active: false, action: "modal" },
      { id: "rescheduling-cancellation", icon: CalendarX, title: "Rescheduling & cancellation",
        desc: "Allow your customers to reschedule and cancel online", active: false, to: "/settings/rescheduling-cancellation" },
      { id: "booking-quote-requests", icon: MessageSquare, title: "Booking & quote requests",
        desc: "Configure how customers submit booking and quote requests", active: false, to: "/settings/booking-quote-requests" },
      { id: "job-assignment",      icon: Users,          title: "Job assignment",
        desc: "Configure assignment and dispatch options for your providers", active: false, to: "/settings/job-assignment" },
      { id: "leads-settings",      icon: Zap,            title: "Leads",
        desc: "Configure lead stage automation for Thumbtack and Yelp", active: true, to: "/settings/leads" },
    ],
  },
  {
    id: "communications",
    title: "Communications",
    items: [
      { id: "client-team-notifications", icon: Bell,     title: "Client & team notifications",
        desc: "Edit the emails and text messages sent to clients and team members", active: true, to: "/settings/client-team-notifications" },
      { id: "sms-settings",        icon: MessageSquare,  title: "SMS",
        desc: "Configure Twilio SMS integration for customer notifications", active: true, to: "/settings/sms-settings" },
      { id: "communication-hub",   icon: Radio,          title: "Communication hub",
        desc: "Connect SMS, Yelp, Thumbtack, WhatsApp, Email and control conversation sync", active: true, to: "/settings/communication-hub" },
      { id: "feedback-reviews",    icon: Star,           title: "Feedback & reviews",
        desc: "Collect feedback and invite customers to leave reviews", active: false, to: "/settings/feedback-reviews" },
    ],
  },
  {
    id: "invoicing",
    title: "Invoicing & payments",
    items: [
      { id: "payments",            icon: CreditCard,     title: "Payments",
        desc: "Payment processing, tip calculation, and processing fees", active: true, to: "/settings/payments" },
      { id: "taxes-fees",          icon: Calculator,     title: "Taxes & fees",
        desc: "Tax rates, fees, and adjustment rules for your services", active: true, to: "/settings/taxes-fees" },
      { id: "invoicing",           icon: FileSpreadsheet, title: "Invoicing",
        desc: "Invoice templates, memos, footer, and payment terms", active: true, to: "/settings/invoicing" },
      { id: "payout-settings",     icon: Banknote,       title: "Payouts",
        desc: "Payout frequency, pay period, payout method, and auto-payout", active: true, to: "/settings/payout-settings" },
    ],
  },
  {
    id: "integrations",
    title: "Integrations",
    items: [
      { id: "calendar-syncing",    icon: CalendarDays,   title: "Calendar syncing",
        desc: "Sync your ServiceFlow schedule to external calendar apps", active: true, to: "/settings/calendar-syncing" },
      { id: "google-sheets",       icon: FileSpreadsheet, title: "Google Sheets",
        desc: "Export data to Google Sheets and import from spreadsheets", active: true, to: "/settings/google-sheets" },
      { id: "stripe-connect",      icon: Zap,            title: "Stripe Connect",
        desc: "Connect Stripe for payment processing", active: true, to: "/settings/stripe-connect" },
      { id: "data-import",         icon: Upload,         title: "Data import",
        desc: "Import customers, jobs, team, services, or territories from CSV/Excel", active: true, to: "/settings/data-import" },
      { id: "zenbooker",           icon: Calendar,       title: "Zenbooker",
        desc: "Sync jobs, customers, and team from Zenbooker in real-time", active: true, to: "/settings/zenbooker" },
    ],
  },
  {
    id: "advanced",
    title: "Advanced",
    items: [
      { id: "field-app",           icon: Smartphone,     title: "Field app",
        desc: "Customize the mobile web app for service providers", active: false, to: "/settings/field-app" },
      { id: "developers",          icon: Code,           title: "Developers",
        desc: "Manage webhooks and API credentials", active: true, to: "/settings/developers" },
    ],
  },
]

// ── Component ──────────────────────────────────────────────

const ServiceFlowSettingsV2 = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [businessOpen, setBusinessOpen] = useState(false)
  const [schedulingOpen, setSchedulingOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [showInactive, setShowInactive] = useState(() => {
    try {
      return localStorage.getItem("showInactiveCards") === "true"
    } catch {
      return false
    }
  })
  const [activeSection, setActiveSection] = useState("business")
  const sectionRefs = useRef({})

  // Team-member redirect (mirrors v1 behavior)
  useEffect(() => {
    if (user?.teamMemberId) navigate("/settings/account")
  }, [user, navigate])

  useEffect(() => {
    try {
      localStorage.setItem("showInactiveCards", String(showInactive))
    } catch {}
  }, [showInactive])

  // Search filter — applies across every section. An empty search
  // shows everything. Section headers hide when their items all
  // filter out.
  const filteredSections = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q && showInactive) return SECTIONS
    return SECTIONS.map((s) => {
      const items = s.items.filter((it) => {
        if (!showInactive && it.active === false) return false
        if (!q) return true
        return (
          it.title.toLowerCase().includes(q) ||
          (it.desc || "").toLowerCase().includes(q)
        )
      })
      return { ...s, items }
    }).filter((s) => s.items.length > 0)
  }, [search, showInactive])

  // Track scroll position to highlight the active anchor in the rail.
  useEffect(() => {
    const onScroll = () => {
      const offsets = filteredSections.map((s) => {
        const el = sectionRefs.current[s.id]
        return el ? { id: s.id, top: el.getBoundingClientRect().top } : null
      }).filter(Boolean)
      const above = offsets.filter((o) => o.top < 140)
      if (above.length) {
        setActiveSection(above[above.length - 1].id)
      } else if (offsets[0]) {
        setActiveSection(offsets[0].id)
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener("scroll", onScroll)
  }, [filteredSections])

  const handleClick = (item) => {
    if (item.action === "modal") {
      if (item.id === "business-details") setBusinessOpen(true)
      else if (item.id === "scheduling-policies") setSchedulingOpen(true)
      return
    }
    if (item.to) navigate(item.to)
  }

  const scrollToSection = (id) => {
    const el = sectionRefs.current[id]
    if (!el) return
    const y = el.getBoundingClientRect().top + window.scrollY - 100
    window.scrollTo({ top: y, behavior: "smooth" })
  }

  const totalItems = SECTIONS.reduce((s, sec) => s + sec.items.length, 0)
  const activeItems = SECTIONS.reduce(
    (s, sec) => s + sec.items.filter((i) => i.active !== false).length,
    0
  )

  return (
    <div
      className="min-h-screen bg-[var(--sf-bg-page)]"
      style={{ fontFamily: "var(--sf-font-ui)" }}
    >
      <MobileHeader title="Settings" />

      <SfPageHeader
        eyebrow="System"
        title="Settings"
        subtitle={`${activeItems} active · ${totalItems - activeItems} coming soon`}
        actions={
          <div className="flex items-center gap-2">
            <div
              className="hidden md:flex items-center gap-2 rounded-md bg-[var(--sf-panel)] border border-[var(--sf-border-soft)] px-3 py-[6px]"
              style={{ width: 280 }}
            >
              <SearchIcon size={14} className="text-[var(--sf-ink-3)] flex-shrink-0" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search settings"
                className="flex-1 bg-transparent border-none outline-none text-[12.5px] text-[var(--sf-ink)]"
                style={{ fontFamily: "var(--sf-font-ui)", padding: 0, boxShadow: "none" }}
              />
            </div>
          </div>
        }
      />

      <div className="px-4 sm:px-6 lg:px-8 py-5 grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
        {/* Section rail (sticky on lg+) */}
        <aside className="hidden lg:block">
          <div className="sticky top-4">
            <SfCard padding={"10px 8px"}>
              <SectionLabel>Jump to</SectionLabel>
              {filteredSections.map((s) => (
                <button
                  key={s.id}
                  onClick={() => scrollToSection(s.id)}
                  className="w-full text-left rounded-md"
                  style={{
                    padding: "7px 10px",
                    background: activeSection === s.id ? "var(--sf-blue-soft)" : "transparent",
                    color: activeSection === s.id ? "var(--sf-blue-dark)" : "var(--sf-ink-2)",
                    fontSize: 12.5,
                    fontWeight: activeSection === s.id ? 600 : 500,
                    border: "none",
                    cursor: "pointer",
                    fontFamily: "var(--sf-font-ui)",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span className="flex-1 truncate">{s.title}</span>
                  <span
                    className="text-[10.5px] font-semibold"
                    style={{
                      color: activeSection === s.id ? "var(--sf-blue-dark)" : "var(--sf-ink-3)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {s.items.length}
                  </span>
                </button>
              ))}
            </SfCard>

            {canEditAccountOwnerSettings(user) && (
              <SfCard padding={"12px 14px"} className="mt-3">
                <div className="flex items-center gap-2">
                  <Sparkles size={13} className="text-[var(--sf-amber)]" />
                  <span className="text-[11px] font-bold uppercase text-[var(--sf-ink-3)]" style={{ letterSpacing: ".04em" }}>
                    Developer mode
                  </span>
                </div>
                <div className="text-[11.5px] text-[var(--sf-ink-2)] mt-1 leading-snug">
                  Show settings that aren't enabled yet.
                </div>
                <label className="mt-2 flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showInactive}
                    onChange={(e) => setShowInactive(e.target.checked)}
                    style={{
                      width: 14,
                      height: 14,
                      margin: 0,
                      accentColor: "var(--sf-blue)",
                      cursor: "pointer",
                    }}
                  />
                  <span className="text-[11.5px] font-semibold text-[var(--sf-ink-2)]">
                    Show inactive
                  </span>
                </label>
              </SfCard>
            )}
          </div>
        </aside>

        {/* Main column */}
        <main className="min-w-0">
          {/* Profile + Billing cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
            <ProfileCard user={user} onClick={() => navigate("/settings/account")} />
            {canEditAccountOwnerSettings(user) && (
              <BillingCard onClick={() => navigate("/settings/billing")} />
            )}
          </div>

          {/* Mobile search */}
          <div className="md:hidden mb-4">
            <div
              className="flex items-center gap-2 rounded-md bg-[var(--sf-panel)] border border-[var(--sf-border-soft)] px-3 py-[7px]"
            >
              <SearchIcon size={14} className="text-[var(--sf-ink-3)] flex-shrink-0" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search settings"
                className="flex-1 bg-transparent border-none outline-none text-[13px] text-[var(--sf-ink)]"
                style={{ fontFamily: "var(--sf-font-ui)", padding: 0, boxShadow: "none" }}
              />
            </div>
          </div>

          {filteredSections.length === 0 ? (
            <SfCard>
              <div className="py-10 text-center text-[12.5px] text-[var(--sf-ink-3)]">
                No settings match "{search}". Try a broader term.
              </div>
            </SfCard>
          ) : (
            filteredSections.map((section) => (
              <div
                key={section.id}
                ref={(el) => (sectionRefs.current[section.id] = el)}
                className="mb-6"
              >
                <h2
                  className="text-[14.5px] font-bold text-[var(--sf-ink)] mb-3"
                  style={{ letterSpacing: "-0.01em" }}
                >
                  {section.title}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {section.items.map((item) => (
                    <SettingsCard
                      key={item.id}
                      item={item}
                      onClick={() => handleClick(item)}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </main>
      </div>

      <BusinessDetailsModal isOpen={businessOpen} onClose={() => setBusinessOpen(false)} />
      <SchedulingBookingModal
        isOpen={schedulingOpen}
        onClose={() => setSchedulingOpen(false)}
        userId={user?.id}
      />
    </div>
  )
}

// ── Profile + Billing cards ────────────────────────────────

const ProfileCard = ({ user, onClick }) => {
  const name =
    user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`
      : user?.firstName || user?.email || "User"
  return (
    <SfCard
      padding={0}
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={onClick}
      style={{ background: "var(--sf-blue-soft)", border: "1px solid var(--sf-blue-soft-2)" }}
    >
      <div className="flex items-center gap-3 p-4">
        <SfAvatar initials={sfInitials(name)} color="var(--sf-blue)" size={40} />
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] font-semibold text-[var(--sf-ink)] truncate">
            {name}
          </div>
          <div className="text-[11.5px] text-[var(--sf-ink-2)] mt-0.5">
            Manage your ServiceFlow account
          </div>
        </div>
        <ChevronRight size={16} className="text-[var(--sf-blue-dark)] flex-shrink-0" />
      </div>
    </SfCard>
  )
}

const BillingCard = ({ onClick }) => (
  <SfCard
    padding={0}
    className="cursor-pointer transition-shadow hover:shadow-md"
    onClick={onClick}
  >
    <div className="flex items-center gap-3 p-4">
      <div
        className="w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0"
        style={{ background: "var(--sf-green-soft)", color: "var(--sf-green-dark)" }}
      >
        <BillingIcon size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[13.5px] font-semibold text-[var(--sf-ink)]">Billing</div>
        <div className="text-[11.5px] text-[var(--sf-ink-2)] mt-0.5">
          Manage your plan and billing information
        </div>
      </div>
      <ChevronRight size={16} className="text-[var(--sf-ink-3)] flex-shrink-0" />
    </div>
  </SfCard>
)

// ── Single setting row card ────────────────────────────────

const SettingsCard = ({ item, onClick }) => {
  const Icon = item.icon || UserIcon
  const active = item.active !== false
  return (
    <SfCard
      padding={0}
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={onClick}
      style={{ opacity: active ? 1 : 0.65 }}
    >
      <div className="flex items-start gap-3 p-4">
        <div
          className="w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0"
          style={{
            background: active ? "var(--sf-blue-soft)" : "var(--sf-panel-soft)",
            color: active ? "var(--sf-blue-dark)" : "var(--sf-ink-3)",
          }}
        >
          <Icon size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[13px] font-semibold text-[var(--sf-ink)]">
              {item.title}
            </span>
            {active ? (
              <CheckCircle2 size={12} className="text-[var(--sf-green)] flex-shrink-0" />
            ) : (
              <SfTag color="var(--sf-ink-3)" bg="var(--sf-panel-soft)">Soon</SfTag>
            )}
          </div>
          <div className="text-[12px] text-[var(--sf-ink-2)] mt-1 leading-snug">
            {item.desc}
          </div>
        </div>
        <ChevronRight size={15} className="text-[var(--sf-ink-3)] flex-shrink-0 mt-px" />
      </div>
    </SfCard>
  )
}

const SectionLabel = ({ children }) => (
  <div
    className="text-[10.5px] font-bold uppercase text-[var(--sf-ink-3)]"
    style={{ padding: "4px 10px 8px", letterSpacing: ".06em" }}
  >
    {children}
  </div>
)

export default ServiceFlowSettingsV2

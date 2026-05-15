"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom"
import {
  ArrowLeft,
  ChevronRight,
  Mail as MailIcon,
  Phone as PhoneIcon,
  MapPin,
  Calendar as CalendarIcon,
  MessageSquare,
  Edit,
  Plus,
  Briefcase,
  RotateCw,
  ArrowUp,
  ArrowRight,
  Building,
  DollarSign,
  FileText,
  CheckCircle2,
  Clock,
  Archive,
  Search as SearchIcon,
  MoreHorizontal,
} from "lucide-react"
import { useAuth } from "../context/AuthContext"
import { customersAPI, jobsAPI, invoicesAPI, estimatesAPI } from "../services/api"
import { normalizeAPIResponse } from "../utils/dataHandler"
import { formatTime as formatTimeShared } from "../utils/formatTime"
import MobileHeader from "../components/mobile-header"
import {
  SfCard,
  SfCardHeader,
  SfButton,
  SfKPI,
  SfStatusPill,
  SfTag,
  SfFilterChip,
  SfTab,
  SfAvatar,
  sfInitials,
} from "../components/sf-primitives"

/**
 * Customer detail — Service Blue redesign (Wave 3.2).
 *
 * Sticky header (breadcrumb, avatar+name, tags, contact row, action
 * cluster, 5-stat strip), 8-tab strip with URL state, and the
 * Overview/Jobs/Invoices tabs wired against real APIs. The remaining
 * five tabs (Estimates / Properties / Messages / Files / Activity)
 * are stubbed with the API path or schema work that needs to land
 * before they go live.
 */

// ── Helpers ────────────────────────────────────────────────

const formatMoney = (n) =>
  `$${(Number.isFinite(n) ? n : 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`

const jobDateStr = (j) => String(j.scheduled_date || "").split("T")[0].split(" ")[0]
const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

const jobStatusLabel = (raw) => {
  const s = (raw || "").toLowerCase()
  if (s.includes("progress") || s === "in_progress") return "In progress"
  if (s === "en_route" || s === "en route" || s === "enroute") return "En route"
  if (s === "completed" || s === "complete" || s === "done") return "Completed"
  if (s === "cancelled" || s === "canceled") return "Cancelled"
  return "Scheduled"
}

const isCancelledJob = (j) => {
  const s = (j.status || "").toLowerCase()
  return s === "cancelled" || s === "canceled"
}
const isCompletedJob = (j) => {
  const s = (j.status || "").toLowerCase()
  return s === "completed" || s === "complete" || s === "done"
}
const isUpcomingJob = (j) =>
  !isCancelledJob(j) && !isCompletedJob(j) && jobDateStr(j) >= today()

const TABS = [
  { id: "overview",   label: "Overview",   counted: false },
  { id: "jobs",       label: "Jobs",       counted: true  },
  { id: "invoices",   label: "Invoices",   counted: true  },
  { id: "estimates",  label: "Estimates",  counted: true  },
  { id: "properties", label: "Properties", counted: true  },
  { id: "messages",   label: "Messages",   counted: true  },
  { id: "files",      label: "Files",      counted: false },
  { id: "activity",   label: "Activity",   counted: false },
]

// ── Page component ─────────────────────────────────────────

const CustomerDetailsV2 = () => {
  const { customerId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const initialTab = TABS.find((t) => t.id === searchParams.get("tab"))?.id || "overview"
  const [tab, setTab] = useState(initialTab)

  const [loading, setLoading] = useState(true)
  const [customer, setCustomer] = useState(null)
  const [jobs, setJobs] = useState([])
  const [invoices, setInvoices] = useState([])
  const [estimates, setEstimates] = useState([])

  // URL ↔ tab sync (both directions). Browser back/forward updates `tab`;
  // clicking a tab updates the URL with `replace` so the back button
  // pops back to /customers, not through every tab.
  useEffect(() => {
    const urlTab = searchParams.get("tab")
    if (urlTab && urlTab !== tab && TABS.some((t) => t.id === urlTab)) {
      setTab(urlTab)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const setTabBoth = useCallback(
    (next) => {
      setTab(next)
      setSearchParams(
        (sp) => {
          const out = new URLSearchParams(sp)
          out.set("tab", next)
          return out
        },
        { replace: true }
      )
    },
    [setSearchParams]
  )

  const fetchAll = useCallback(async () => {
    if (!user?.id || !customerId) return
    setLoading(true)
    try {
      const [custResp, jobsResp, invResp, estResp] = await Promise.allSettled([
        customersAPI.getById(customerId),
        jobsAPI.getAll(user.id, "", "", 1, 500, null, null, "scheduled_date", "DESC", null, null, customerId),
        invoicesAPI.getAll(user.id, { customerId, page: 1, limit: 500 }),
        estimatesAPI.getAll(user.id, { customerId, page: 1, limit: 500 }),
      ])
      const cust = custResp.status === "fulfilled" ? (custResp.value?.customer || custResp.value) : null
      const jobsList = jobsResp.status === "fulfilled" ? normalizeAPIResponse(jobsResp.value, "jobs") : []
      const invList = invResp.status === "fulfilled" ? normalizeAPIResponse(invResp.value, "invoices") : []
      const estList = estResp.status === "fulfilled" ? normalizeAPIResponse(estResp.value, "estimates") : []
      setCustomer(cust)
      // Belt-and-braces filter: server-side filter MAY ignore unknown
      // customerId param shapes in some endpoints, so also filter
      // client-side.
      setJobs(jobsList.filter((j) => String(j.customer_id) === String(customerId)))
      setInvoices(invList.filter((i) => String(i.customer_id) === String(customerId)))
      setEstimates(estList.filter((e) => String(e.customer_id) === String(customerId)))
    } finally {
      setLoading(false)
    }
  }, [user?.id, customerId])

  useEffect(() => { fetchAll() }, [fetchAll])

  // ── Derived ────────────────────────────────────────────────

  const name = useMemo(() => {
    if (!customer) return "Customer"
    return (
      customer.name ||
      `${customer.first_name || ""} ${customer.last_name || ""}`.trim() ||
      customer.email ||
      "Customer"
    )
  }, [customer])

  const stats = useMemo(() => {
    const completed = jobs.filter(isCompletedJob)
    const totalSpent = jobs.reduce((s, j) => {
      if (isCancelledJob(j)) return s
      return s + parseFloat(j.total || j.service_price || 0)
    }, 0)
    const totalJobs = jobs.filter((j) => !isCancelledJob(j)).length
    const avgJob = totalJobs > 0 ? totalSpent / totalJobs : 0
    const ratings = completed.map((j) => parseFloat(j.rating)).filter((n) => Number.isFinite(n) && n > 0)
    const avgRating = ratings.length ? ratings.reduce((s, n) => s + n, 0) / ratings.length : null
    const upcoming = jobs.filter(isUpcomingJob)
    const nextJob = upcoming.length
      ? [...upcoming].sort((a, b) => jobDateStr(a).localeCompare(jobDateStr(b)))[0]
      : null
    return { totalSpent, totalJobs, avgJob, avgRating, nextJob }
  }, [jobs])

  const counts = useMemo(() => ({
    overview:   undefined,
    jobs:       jobs.filter((j) => !isCancelledJob(j)).length,
    invoices:   invoices.length,
    estimates:  estimates.length,
    properties: customer ? 1 : 0,
    messages:   undefined,
    files:      undefined,
    activity:   undefined,
  }), [jobs, invoices, estimates, customer])

  // ── Render ────────────────────────────────────────────────

  if (loading && !customer) {
    return (
      <div
        className="min-h-screen bg-[var(--sf-bg-page)] flex items-center justify-center"
        style={{ fontFamily: "var(--sf-font-ui)" }}
      >
        <div className="text-[13px] text-[var(--sf-ink-3)]">Loading customer…</div>
      </div>
    )
  }

  if (!customer) {
    return (
      <div
        className="min-h-screen bg-[var(--sf-bg-page)] flex flex-col items-center justify-center gap-3"
        style={{ fontFamily: "var(--sf-font-ui)" }}
      >
        <div className="text-[15px] font-semibold text-[var(--sf-ink)]">Couldn't load this customer</div>
        <SfButton variant="secondary" size="md" icon={ArrowLeft} onClick={() => navigate("/customers")}>
          Back to customers
        </SfButton>
      </div>
    )
  }

  const email = customer.email
  const phone = customer.phone
  const cityState = [customer.city, customer.state].filter(Boolean).join(", ")
  const isActive = (customer.status || "").toLowerCase() === "active"
  const isVIP = Array.isArray(customer.tags) && customer.tags.some((t) => String(t).toLowerCase() === "vip")

  return (
    <div
      className="min-h-screen bg-[var(--sf-bg-page)]"
      style={{ fontFamily: "var(--sf-font-ui)" }}
    >
      <MobileHeader title={name} />

      {/* Header */}
      <div className="px-4 sm:px-6 lg:px-8 pt-4 bg-[var(--sf-panel)] border-b border-[var(--sf-border-soft)]">
        <div className="flex items-center gap-1.5 text-[12px] text-[var(--sf-ink-2)] mb-3">
          <Link
            to="/customers"
            className="inline-flex items-center gap-1 hover:text-[var(--sf-ink)] transition-colors"
            style={{ color: "inherit", textDecoration: "none" }}
          >
            <ArrowLeft size={12} /> Customers
          </Link>
          <ChevronRight size={11} className="text-[var(--sf-ink-4)]" />
          <span className="text-[var(--sf-ink)] font-semibold truncate">{name}</span>
        </div>

        <div className="flex items-start gap-4 flex-wrap pb-3">
          <SfAvatar
            initials={sfInitials(name)}
            color="var(--sf-ink)"
            size={60}
            style={{ fontSize: 22 }}
          />
          <div className="min-w-0 flex-[1_1_360px]">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1
                className="text-[22px] sm:text-[24px] font-bold text-[var(--sf-ink)] m-0"
                style={{ letterSpacing: "-0.02em" }}
              >
                {name}
              </h1>
              {isVIP && <SfTag color="var(--sf-purple)" bg="var(--sf-purple-soft)">VIP</SfTag>}
              {customer.source && (
                <SfTag color="var(--sf-blue-dark)" bg="var(--sf-blue-soft)">
                  {customer.source}
                </SfTag>
              )}
            </div>
            <div className="flex items-center gap-3 mt-2 text-[12.5px] text-[var(--sf-ink-2)] flex-wrap">
              {email && (
                <span className="inline-flex items-center gap-1.5">
                  <MailIcon size={13} className="text-[var(--sf-ink-3)]" /> {email}
                </span>
              )}
              {phone && (
                <span className="inline-flex items-center gap-1.5">
                  <PhoneIcon size={13} className="text-[var(--sf-ink-3)]" /> {phone}
                </span>
              )}
              {cityState && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin size={13} className="text-[var(--sf-ink-3)]" /> {cityState}
                </span>
              )}
              {customer.created_at && (
                <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                  <CalendarIcon size={13} className="text-[var(--sf-ink-3)]" />
                  Customer since{" "}
                  {new Date(customer.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {phone && (
              <a href={`sms:${phone}`} style={{ textDecoration: "none" }}>
                <SfButton variant="secondary" size="md" icon={MessageSquare}>Message</SfButton>
              </a>
            )}
            {email && (
              <a href={`mailto:${email}`} style={{ textDecoration: "none" }}>
                <SfButton variant="secondary" size="md" icon={MailIcon}>Email</SfButton>
              </a>
            )}
            <SfButton variant="secondary" size="md" icon={Edit}>Edit</SfButton>
            <SfButton variant="primary" size="md" icon={Plus} onClick={() => navigate(`/createjob?customerId=${customer.id}`)}>
              New job
            </SfButton>
          </div>
        </div>

        {/* 5-stat strip */}
        <div className="flex flex-wrap gap-x-8 gap-y-3 pb-3">
          <Stat label="Lifetime value" value={formatMoney(stats.totalSpent)} tone="var(--sf-green-dark)" />
          <Stat label="Total jobs" value={stats.totalJobs} />
          <Stat label="Avg job value" value={stats.avgJob > 0 ? formatMoney(stats.avgJob) : "—"} />
          <Stat
            label="Rating"
            value={stats.avgRating != null ? `★ ${stats.avgRating.toFixed(1)}` : "—"}
            tone="var(--sf-amber-dark)"
          />
          <Stat
            label="Status"
            value={isActive ? "Active" : (customer.status || "—")}
            tone={isActive ? "var(--sf-green-dark)" : "var(--sf-teal)"}
          />
        </div>

        {/* Tab strip */}
        <div
          className="flex items-center overflow-x-auto scrollbar-hide -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8"
          style={{ borderTop: "1px solid var(--sf-border-soft)" }}
        >
          {TABS.map((t) => (
            <SfTab
              key={t.id}
              active={tab === t.id}
              count={t.counted ? counts[t.id] : undefined}
              onClick={() => setTabBoth(t.id)}
            >
              {t.label}
            </SfTab>
          ))}
        </div>
      </div>

      {/* Body */}
      {tab === "overview" && (
        <OverviewTab
          customer={customer}
          jobs={jobs}
          invoices={invoices}
          stats={stats}
          onJobClick={(id) => navigate(`/job/${id}`)}
          onSeeAllJobs={() => setTabBoth("jobs")}
          onSeeAllInvoices={() => setTabBoth("invoices")}
        />
      )}
      {tab === "jobs" && (
        <JobsTab
          jobs={jobs}
          stats={stats}
          onJobClick={(id) => navigate(`/job/${id}`)}
          onNewJob={() => navigate(`/createjob?customerId=${customer.id}`)}
        />
      )}
      {tab === "invoices" && (
        <InvoicesTab
          invoices={invoices}
          jobs={jobs}
          onInvoiceClick={(id) => navigate(`/invoices/${id}`)}
        />
      )}
      {(tab === "estimates" || tab === "properties" || tab === "messages" || tab === "files" || tab === "activity") && (
        <TabStub tab={tab} estimates={estimates} />
      )}
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────

const Stat = ({ label, value, tone }) => (
  <div>
    <div
      className="text-[11px] font-semibold text-[var(--sf-ink-3)] uppercase"
      style={{ letterSpacing: ".04em" }}
    >
      {label}
    </div>
    <div
      className="text-[20px] font-bold mt-1"
      style={{
        color: tone || "var(--sf-ink)",
        letterSpacing: "-0.01em",
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {value}
    </div>
  </div>
)

// ── Overview tab ───────────────────────────────────────────

const OverviewTab = ({ customer, jobs, invoices, stats, onJobClick, onSeeAllJobs, onSeeAllInvoices }) => {
  const recentJobs = useMemo(
    () => [...jobs].sort((a, b) => jobDateStr(b).localeCompare(jobDateStr(a))).slice(0, 3),
    [jobs]
  )
  const recentInvoices = useMemo(
    () =>
      [...invoices]
        .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
        .slice(0, 5),
    [invoices]
  )

  // Build 6-month revenue trend from completed/paid jobs
  const trend = useMemo(() => buildMonthlyTrend(jobs), [jobs])

  const property = useMemo(() => {
    if (!customer) return null
    const addr = customer.address || ""
    return {
      address: addr,
      city: [customer.city, customer.state, customer.zip_code].filter(Boolean).join(", "),
    }
  }, [customer])

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-4 grid grid-cols-1 lg:grid-cols-[66fr_34fr] gap-4 items-start">
      {/* Main column */}
      <div className="flex flex-col gap-4 min-w-0">
        {/* Job history */}
        <SfCard padding={0}>
          <div className="flex items-center px-4 py-3 border-b border-[var(--sf-border-soft)]">
            <div className="text-[13px] font-semibold text-[var(--sf-ink)]">Job history</div>
            <span className="text-[11.5px] text-[var(--sf-ink-3)] ml-2">
              · {stats.totalJobs} job{stats.totalJobs === 1 ? "" : "s"}
            </span>
            <div className="flex-1" />
            <SfButton variant="ghost" size="sm" iconRight={ArrowRight} onClick={onSeeAllJobs}>
              View all
            </SfButton>
          </div>
          {recentJobs.length === 0 ? (
            <EmptyRow
              icon={Briefcase}
              title="No jobs yet"
              subtitle="When this customer books, jobs will appear here."
            />
          ) : (
            recentJobs.map((j, i) => (
              <JobMiniRow
                key={j.id}
                job={j}
                isLast={i === recentJobs.length - 1}
                onClick={() => onJobClick(j.id)}
              />
            ))
          )}
        </SfCard>

        {/* Revenue trend */}
        <SfCard>
          <SfCardHeader
            title="Revenue trend"
            subtitle="Last 6 months · this customer"
            right={
              <div className="inline-flex items-baseline gap-1.5">
                <span
                  className="text-[18px] font-bold text-[var(--sf-ink)]"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {formatMoney(stats.totalSpent)}
                </span>
                {trend.deltaPct != null && trend.deltaPct !== 0 && (
                  <span
                    className="text-[11px] font-semibold inline-flex items-center gap-px"
                    style={{
                      color: trend.deltaPct > 0 ? "var(--sf-green-dark)" : "var(--sf-red-dark)",
                    }}
                  >
                    <ArrowUp
                      size={10}
                      strokeWidth={2.4}
                      style={{ transform: trend.deltaPct < 0 ? "rotate(180deg)" : "none" }}
                    />
                    {Math.abs(Math.round(trend.deltaPct))}%
                  </span>
                )}
              </div>
            }
          />
          <div className="flex items-end gap-2" style={{ height: 80 }}>
            {trend.values.map((v, i, a) => {
              const max = Math.max(1, ...a)
              const h = (v / max) * 100
              const isRecent = i >= a.length - 3
              return (
                <div
                  key={i}
                  className="flex-1 relative"
                  style={{
                    height: `${Math.max(2, h)}%`,
                    background: isRecent ? "var(--sf-blue)" : "var(--sf-blue-soft-2)",
                    borderRadius: "3px 3px 0 0",
                  }}
                  title={`${trend.labels[i]}: ${formatMoney(v)}`}
                >
                  {i === a.length - 1 && v > 0 && (
                    <div
                      className="absolute text-[10px] font-bold text-[var(--sf-ink)] whitespace-nowrap"
                      style={{
                        top: -22,
                        left: "50%",
                        transform: "translateX(-50%)",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {formatMoney(v)}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <div className="flex gap-2 mt-1.5 text-[10px] text-[var(--sf-ink-3)] font-medium">
            {trend.labels.map((m) => (
              <div key={m} className="flex-1 text-center">{m}</div>
            ))}
          </div>
        </SfCard>

        {/* Invoices */}
        <SfCard padding={0}>
          <div className="flex items-center px-4 py-3 border-b border-[var(--sf-border-soft)]">
            <div className="text-[13px] font-semibold text-[var(--sf-ink)]">Invoices</div>
            <div className="flex-1" />
            <SfButton variant="ghost" size="sm" iconRight={ArrowRight} onClick={onSeeAllInvoices}>
              View all
            </SfButton>
          </div>
          {recentInvoices.length === 0 ? (
            <EmptyRow
              icon={FileText}
              title="No invoices yet"
              subtitle="Invoices for this customer will appear here."
            />
          ) : (
            recentInvoices.map((inv, i) => (
              <InvoiceMiniRow
                key={inv.id}
                invoice={inv}
                isLast={i === recentInvoices.length - 1}
              />
            ))
          )}
        </SfCard>
      </div>

      {/* Side rail */}
      <div className="flex flex-col gap-4 min-w-0">
        {/* Internal notes */}
        <SfCard>
          <SfCardHeader
            title="Internal notes"
            right={
              <SfButton variant="ghost" size="sm" icon={Plus}>
                Add
              </SfButton>
            }
          />
          {customer?.notes ? (
            <div
              className="rounded-lg px-3 py-2.5"
              style={{
                background: "var(--sf-amber-soft)",
                border: "1px solid rgba(217,119,6,.15)",
              }}
            >
              <div className="text-[12px] text-[var(--sf-ink-2)] leading-snug whitespace-pre-wrap">
                {customer.notes}
              </div>
            </div>
          ) : (
            <div className="py-3 text-[11.5px] text-[var(--sf-ink-3)] text-center">
              No notes yet.
            </div>
          )}
        </SfCard>

        {/* Property */}
        {property?.address && (
          <SfCard>
            <SfCardHeader title="Property" />
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: "var(--sf-blue-soft)", color: "var(--sf-blue-dark)" }}
              >
                <Building size={18} />
              </div>
              <div className="min-w-0">
                <div className="text-[13px] font-semibold text-[var(--sf-ink)] truncate">
                  {property.address}
                </div>
                {property.city && (
                  <div className="text-[11px] text-[var(--sf-ink-3)] mt-0.5 truncate">
                    {property.city}
                  </div>
                )}
              </div>
            </div>
          </SfCard>
        )}

        {/* Recent activity */}
        <SfCard>
          <SfCardHeader title="Recent activity" />
          <ActivityList jobs={jobs} invoices={invoices} />
        </SfCard>
      </div>
    </div>
  )
}

const JobMiniRow = ({ job, isLast, onClick }) => {
  const status = jobStatusLabel(job.status)
  const value = parseFloat(job.total || job.service_price || 0)
  const date = job.scheduled_date
    ? new Date(String(job.scheduled_date).includes("T") ? job.scheduled_date : String(job.scheduled_date).replace(" ", "T"))
    : null
  const dateStr = date && !isNaN(date)
    ? date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "—"
  const time = date && !isNaN(date) ? formatTimeShared(date) : ""
  const dur = parseInt(job.duration || job.estimated_duration || 0, 10)
  const isRecurring = job.is_recurring === true

  return (
    <button
      onClick={onClick}
      className="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-[var(--sf-panel-alt)] transition-colors"
      style={{
        borderBottom: isLast ? "none" : "1px solid var(--sf-border-soft)",
        background: "transparent",
        border: "none",
        borderRadius: 0,
        cursor: "pointer",
        fontFamily: "var(--sf-font-ui)",
      }}
    >
      <span
        className="rounded-sm flex-shrink-0"
        style={{
          width: 3,
          height: 32,
          background: isCancelledJob(job) ? "var(--sf-ink-4)" : "var(--sf-blue)",
          borderRadius: 2,
        }}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="text-[13px] font-semibold text-[var(--sf-ink)] truncate"
            style={{
              textDecoration: isCancelledJob(job) ? "line-through" : "none",
              opacity: isCancelledJob(job) ? 0.65 : 1,
            }}
          >
            {job.service_name || "Service"}
          </span>
          {isRecurring && <SfTag color="var(--sf-purple)" bg="var(--sf-purple-soft)">↻</SfTag>}
        </div>
        <div
          className="text-[11px] text-[var(--sf-ink-3)] mt-0.5"
          style={{ fontFamily: "var(--sf-font-mono)" }}
        >
          #{String(job.id).slice(-4)} · {dateStr}
          {time ? ` · ${time}` : ""}
          {dur ? ` · ${dur}m` : ""}
        </div>
      </div>
      <div
        className="text-[13px] font-semibold text-[var(--sf-ink)] flex-shrink-0"
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {value ? formatMoney(value) : "—"}
      </div>
      <div className="flex-shrink-0" style={{ width: 110 }}>
        <SfStatusPill status={status} />
      </div>
    </button>
  )
}

const InvoiceMiniRow = ({ invoice, isLast }) => {
  const code = invoice.id ? `INV-${String(invoice.id).slice(-4)}` : "—"
  const issued = invoice.created_at
    ? new Date(invoice.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "—"
  const due = invoice.due_date
    ? new Date(invoice.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "—"
  const value = parseFloat(invoice.total_amount || invoice.amount || 0)
  const status = capitalize(invoice.status)
  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5"
      style={{ borderBottom: isLast ? "none" : "1px solid var(--sf-border-soft)" }}
    >
      <FileText size={16} className="text-[var(--sf-ink-3)] flex-shrink-0" />
      <div className="min-w-0 flex-1">
        <div
          className="text-[12.5px] font-semibold text-[var(--sf-ink)]"
          style={{ fontFamily: "var(--sf-font-mono)" }}
        >
          {code}
        </div>
        <div className="text-[11px] text-[var(--sf-ink-3)] mt-px">
          {issued} → due {due}
        </div>
      </div>
      <div
        className="text-[13px] font-semibold text-[var(--sf-ink)]"
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {formatMoney(value)}
      </div>
      <SfStatusPill status={status} />
    </div>
  )
}

const EmptyRow = ({ icon: Icon, title, subtitle }) => (
  <div className="py-10 px-6 flex flex-col items-center text-center">
    <div
      className="w-10 h-10 rounded-xl flex items-center justify-center mb-2"
      style={{ background: "var(--sf-panel-soft)", color: "var(--sf-ink-3)" }}
    >
      <Icon size={18} />
    </div>
    <div className="text-[13px] font-semibold text-[var(--sf-ink)]">{title}</div>
    {subtitle && (
      <div className="text-[12px] text-[var(--sf-ink-2)] mt-1 max-w-xs">{subtitle}</div>
    )}
  </div>
)

const ActivityList = ({ jobs, invoices }) => {
  const events = useMemo(() => {
    const out = []
    jobs.forEach((j) => {
      const status = (j.status || "").toLowerCase()
      const d = j.scheduled_date ? new Date(j.scheduled_date) : null
      const id = `#${String(j.id).slice(-4)}`
      if (status === "completed" || status === "complete" || status === "done") {
        out.push({
          kind: "completed",
          when: new Date(j.completed_at || j.end_time || j.updated_at || j.scheduled_date),
          text: `${j.service_name || "Job"} ${id} completed`,
        })
      } else if (status === "in_progress" || status === "in progress") {
        out.push({ kind: "started", when: d, text: `${j.service_name || "Job"} ${id} started` })
      }
    })
    invoices.forEach((inv) => {
      if ((inv.status || "").toLowerCase() === "paid") {
        out.push({
          kind: "paid",
          when: new Date(inv.updated_at || inv.created_at),
          text: `Invoice #${String(inv.id).slice(-4)} paid`,
        })
      }
    })
    return out
      .filter((e) => e.when && !isNaN(e.when))
      .sort((a, b) => b.when.getTime() - a.when.getTime())
      .slice(0, 5)
  }, [jobs, invoices])

  const ICON_META = {
    completed: { icon: CheckCircle2, c: "var(--sf-green-dark)" },
    started:   { icon: Clock, c: "var(--sf-blue-dark)" },
    paid:      { icon: DollarSign, c: "var(--sf-green-dark)" },
  }

  if (events.length === 0) {
    return (
      <div className="text-[11.5px] text-[var(--sf-ink-3)] text-center py-3">
        No recent activity.
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-2.5">
      {events.map((e, i) => {
        const m = ICON_META[e.kind] || ICON_META.completed
        const Icon = m.icon
        return (
          <div key={i} className="flex items-start gap-2.5">
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
              style={{ background: `${m.c}1a`, color: m.c, border: `1px solid ${m.c}22` }}
            >
              <Icon size={11} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[12px] text-[var(--sf-ink)] font-medium">{e.text}</div>
              <div className="text-[10.5px] text-[var(--sf-ink-3)] mt-px">
                {e.when.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Jobs tab ───────────────────────────────────────────────

const JOB_FILTERS = [
  { id: "all",       label: "All" },
  { id: "upcoming",  label: "Upcoming" },
  { id: "completed", label: "Completed" },
  { id: "recurring", label: "Recurring" },
  { id: "cancelled", label: "Cancelled" },
]

const JobsTab = ({ jobs, stats, onJobClick, onNewJob }) => {
  const [filter, setFilter] = useState("all")
  const [search, setSearch] = useState("")

  const filtered = useMemo(() => {
    let out = jobs
    if (filter === "upcoming") out = jobs.filter(isUpcomingJob)
    else if (filter === "completed") out = jobs.filter(isCompletedJob)
    else if (filter === "recurring") out = jobs.filter((j) => j.is_recurring === true)
    else if (filter === "cancelled") out = jobs.filter(isCancelledJob)
    const q = search.trim().toLowerCase()
    if (q) {
      out = out.filter((j) => {
        const haystack = `${j.service_name || ""} ${String(j.id || "")} ${j.scheduled_date || ""}`.toLowerCase()
        return haystack.includes(q)
      })
    }
    return [...out].sort((a, b) => jobDateStr(b).localeCompare(jobDateStr(a)))
  }, [jobs, filter, search])

  const upcoming = useMemo(() => jobs.filter(isUpcomingJob), [jobs])
  const upcomingValue = upcoming.reduce(
    (s, j) => s + parseFloat(j.total || j.service_price || 0),
    0
  )
  const hasRecurring = jobs.some((j) => j.is_recurring === true)
  const recurringJob = jobs.find((j) => j.is_recurring === true)

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-4 flex flex-col gap-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <SfKPI label="Lifetime jobs" value={stats.totalJobs} accent="var(--sf-blue)" sub="all-time" />
        <SfKPI label="Total spent" value={formatMoney(stats.totalSpent)} accent="var(--sf-green)" sub="this customer" />
        <SfKPI label="Avg job value" value={stats.avgJob > 0 ? formatMoney(stats.avgJob) : "—"} accent="var(--sf-purple)" sub="across jobs" />
        <SfKPI label="Avg rating" value={stats.avgRating != null ? stats.avgRating.toFixed(1) : "—"} accent="var(--sf-amber)" sub="completed jobs" />
        <SfKPI
          label="Next scheduled"
          value={stats.nextJob ? new Date(stats.nextJob.scheduled_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
          accent="var(--sf-teal)"
          sub={stats.nextJob?.service_name || "—"}
        />
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div
          className="flex items-center gap-2 rounded-[8px] bg-[var(--sf-panel)] border border-[var(--sf-border-soft)] px-3 py-[6px]"
          style={{ width: 280, maxWidth: "100%" }}
        >
          <SearchIcon size={14} className="text-[var(--sf-ink-3)] flex-shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search this customer's jobs"
            className="flex-1 bg-transparent border-none outline-none text-[12.5px] text-[var(--sf-ink)]"
            style={{ fontFamily: "var(--sf-font-ui)", padding: 0, boxShadow: "none" }}
          />
        </div>
        {JOB_FILTERS.map((f) => (
          <SfFilterChip
            key={f.id}
            active={filter === f.id}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </SfFilterChip>
        ))}
        <div className="flex-1" />
        <SfButton variant="primary" size="md" icon={Plus} onClick={onNewJob}>
          New job
        </SfButton>
      </div>

      {/* Recurring banner */}
      {hasRecurring && recurringJob && (
        <SfCard
          padding={0}
          className="overflow-hidden"
          style={{ background: "linear-gradient(135deg, var(--sf-blue) 0%, var(--sf-purple) 100%)", color: "#fff" }}
        >
          <div className="flex items-center gap-3 p-4">
            <div
              className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(255,255,255,.18)" }}
            >
              <RotateCw size={20} strokeWidth={2.2} color="#fff" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-bold">Recurring subscription</div>
              <div className="text-[12px] opacity-90 mt-0.5">
                {recurringJob.recurring_frequency || "Recurring"}
                {recurringJob.service_name ? ` · ${recurringJob.service_name}` : ""}
              </div>
            </div>
          </div>
        </SfCard>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <SfCard padding={0}>
          <div
            className="px-4 py-3 flex items-center"
            style={{ background: "var(--sf-blue-soft)", borderBottom: "1px solid var(--sf-border-soft)" }}
          >
            <div className="text-[13px] font-semibold text-[var(--sf-blue-dark)]">
              Upcoming · {upcoming.length} job{upcoming.length === 1 ? "" : "s"}
            </div>
            <div className="flex-1" />
            <div
              className="text-[12px] font-semibold text-[var(--sf-blue-dark)]"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {formatMoney(upcomingValue)} forecast
            </div>
          </div>
          {upcoming.slice(0, 5).map((j, i) => (
            <JobMiniRow
              key={j.id}
              job={j}
              isLast={i === Math.min(4, upcoming.length - 1)}
              onClick={() => onJobClick(j.id)}
            />
          ))}
        </SfCard>
      )}

      {/* Filter-driven list */}
      <SfCard padding={0}>
        <div className="px-4 py-3 flex items-center border-b border-[var(--sf-border-soft)]">
          <Archive size={14} className="text-[var(--sf-ink-3)] mr-2" />
          <div className="text-[13px] font-semibold text-[var(--sf-ink)]">
            {JOB_FILTERS.find((f) => f.id === filter)?.label} · {filtered.length} job{filtered.length === 1 ? "" : "s"}
          </div>
        </div>
        {filtered.length === 0 ? (
          <EmptyRow icon={Briefcase} title="Nothing in this view" subtitle="Try a different filter." />
        ) : (
          filtered.slice(0, 30).map((j, i) => (
            <JobMiniRow
              key={j.id}
              job={j}
              isLast={i === Math.min(29, filtered.length - 1)}
              onClick={() => onJobClick(j.id)}
            />
          ))
        )}
      </SfCard>
    </div>
  )
}

// ── Invoices tab ───────────────────────────────────────────

const InvoicesTab = ({ invoices, jobs, onInvoiceClick }) => {
  const outstanding = useMemo(
    () =>
      invoices.filter((inv) => {
        const s = (inv.status || "").toLowerCase()
        return s !== "paid" && s !== "void" && s !== "refunded"
      }),
    [invoices]
  )
  const paid = useMemo(
    () => invoices.filter((inv) => (inv.status || "").toLowerCase() === "paid"),
    [invoices]
  )
  const outstandingTotal = outstanding.reduce(
    (s, inv) => s + parseFloat(inv.total_amount || inv.amount || 0),
    0
  )
  const paidTotal = paid.reduce(
    (s, inv) => s + parseFloat(inv.total_amount || inv.amount || 0),
    0
  )
  const avgInvoice = invoices.length
    ? (outstandingTotal + paidTotal) / invoices.length
    : 0
  const avgDaysToPay = useMemo(() => {
    const samples = paid
      .map((inv) => {
        const created = new Date(inv.created_at)
        const updated = new Date(inv.updated_at || inv.paid_at || inv.created_at)
        if (isNaN(created) || isNaN(updated)) return null
        return Math.max(0, Math.round((updated - created) / 86400000))
      })
      .filter((n) => n != null)
    if (!samples.length) return null
    return Math.round(samples.reduce((s, n) => s + n, 0) / samples.length)
  }, [paid])

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-4 flex flex-col gap-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <SfKPI label="Outstanding" value={formatMoney(outstandingTotal)} accent="var(--sf-amber)" sub={`${outstanding.length} invoice${outstanding.length === 1 ? "" : "s"}`} />
        <SfKPI label="Paid all-time" value={formatMoney(paidTotal)} accent="var(--sf-green)" sub={`${paid.length} invoice${paid.length === 1 ? "" : "s"}`} />
        <SfKPI label="Avg invoice" value={avgInvoice > 0 ? formatMoney(avgInvoice) : "—"} accent="var(--sf-blue)" sub="per invoice" />
        <SfKPI label="Avg days to pay" value={avgDaysToPay != null ? `${avgDaysToPay}d` : "—"} accent="var(--sf-purple)" sub={paid.length ? `from ${paid.length} paid` : "—"} />
        <SfKPI label="Auto-pay" value="—" accent="var(--sf-teal)" sub="not yet wired" />
      </div>

      {/* Outstanding card */}
      <SfCard padding={0}>
        <div
          className="px-4 py-3 flex items-center"
          style={{ background: "var(--sf-amber-soft)", borderBottom: "1px solid var(--sf-border-soft)" }}
        >
          <Clock size={14} className="text-[var(--sf-amber-dark)] mr-2" />
          <div className="text-[13px] font-semibold text-[var(--sf-amber-dark)]">
            Outstanding · {outstanding.length} invoice{outstanding.length === 1 ? "" : "s"}
          </div>
          <div className="flex-1" />
          <div
            className="text-[12px] font-semibold text-[var(--sf-amber-dark)]"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {formatMoney(outstandingTotal)}
          </div>
        </div>
        <InvoiceTable invoices={outstanding} onInvoiceClick={onInvoiceClick} emptyText="Nothing outstanding." />
      </SfCard>

      {/* Paid card */}
      <SfCard padding={0}>
        <div className="px-4 py-3 flex items-center border-b border-[var(--sf-border-soft)]">
          <CheckCircle2 size={14} className="text-[var(--sf-green-dark)] mr-2" />
          <div className="text-[13px] font-semibold text-[var(--sf-ink)]">
            Payment history · {paid.length} invoice{paid.length === 1 ? "" : "s"}
          </div>
          <div className="flex-1" />
          <SfButton variant="ghost" size="sm">Export</SfButton>
        </div>
        <InvoiceTable invoices={paid} onInvoiceClick={onInvoiceClick} emptyText="No paid invoices yet." />
      </SfCard>
    </div>
  )
}

const InvoiceTable = ({ invoices, onInvoiceClick, emptyText }) => {
  if (invoices.length === 0) {
    return <div className="py-8 text-center text-[12px] text-[var(--sf-ink-3)]">{emptyText}</div>
  }
  return (
    <div>
      <div
        className="hidden md:flex items-center gap-2 px-4 py-2"
        style={{
          background: "var(--sf-panel-alt)",
          borderBottom: "1px solid var(--sf-border-soft)",
          fontSize: 10.5,
          color: "var(--sf-ink-3)",
          fontWeight: 700,
          letterSpacing: ".05em",
          textTransform: "uppercase",
        }}
      >
        <div style={{ width: 90 }}>Invoice</div>
        <div style={{ width: 70 }}>Job</div>
        <div style={{ width: 90 }}>Issued</div>
        <div style={{ width: 90 }}>Due</div>
        <div className="flex-1" />
        <div style={{ width: 90, textAlign: "right" }}>Amount</div>
        <div style={{ width: 110 }}>Status</div>
        <div style={{ width: 24 }} />
      </div>
      {invoices.slice(0, 30).map((inv, i, arr) => {
        const code = `INV-${String(inv.id).slice(-4)}`
        const jobCode = inv.job_id ? `#${String(inv.job_id).slice(-4)}` : "—"
        const issued = inv.created_at
          ? new Date(inv.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
          : "—"
        const due = inv.due_date
          ? new Date(inv.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
          : "—"
        const value = parseFloat(inv.total_amount || inv.amount || 0)
        const status = capitalize(inv.status)
        return (
          <button
            key={inv.id}
            onClick={() => onInvoiceClick?.(inv.id)}
            className="w-full text-left flex items-center gap-2 px-4 py-2.5 hover:bg-[var(--sf-panel-alt)] transition-colors"
            style={{
              borderBottom: i === arr.length - 1 ? "none" : "1px solid var(--sf-border-soft)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              fontFamily: "var(--sf-font-ui)",
            }}
          >
            <div
              style={{ width: 90, fontFamily: "var(--sf-font-mono)" }}
              className="text-[12.5px] font-semibold text-[var(--sf-ink)]"
            >
              {code}
            </div>
            <div
              style={{ width: 70, fontFamily: "var(--sf-font-mono)" }}
              className="text-[11.5px] text-[var(--sf-ink-3)]"
            >
              {jobCode}
            </div>
            <div style={{ width: 90 }} className="text-[11.5px] text-[var(--sf-ink-2)]">{issued}</div>
            <div style={{ width: 90 }} className="text-[11.5px] text-[var(--sf-ink-2)]">{due}</div>
            <div className="flex-1" />
            <div
              style={{ width: 90, textAlign: "right", fontVariantNumeric: "tabular-nums" }}
              className="text-[13px] font-semibold text-[var(--sf-ink)]"
            >
              {formatMoney(value)}
            </div>
            <div style={{ width: 110 }}>
              <SfStatusPill status={status} />
            </div>
            <span style={{ width: 24 }} className="text-[var(--sf-ink-3)] text-right">
              <MoreHorizontal size={14} />
            </span>
          </button>
        )
      })}
    </div>
  )
}

// ── Stub tabs ──────────────────────────────────────────────

const TabStub = ({ tab, estimates }) => {
  const STUB_META = {
    estimates: {
      title: `Estimates · ${estimates.length}`,
      copy:
        "Estimate card layout (purple icon, EST-#### code, items, value, accept-rate KPIs, Sent → Viewed → Accepted/Declined timeline) is queued for the next slice. The estimatesAPI is already wired — once the card UI ships you'll see them here.",
    },
    properties: {
      title: "Properties",
      copy:
        "Per-customer Property records (multiple addresses, bedrooms/bathrooms/sqft/pets/access notes, primary flag) need a new properties table. Schema lives in the addon doc.",
    },
    messages: {
      title: "Messages",
      copy:
        "SMS / Email / Reviews history. Compose form + 6-KPI strip. Will surface threads from the existing communications system (Sigcore-backed) once the per-customer endpoint lands.",
    },
    files: {
      title: "Files",
      copy:
        "Photos + documents (drop zone + file grid). Needs a new customer_files table + the upload flow before it can ship.",
    },
    activity: {
      title: "Activity",
      copy:
        "Unified activity feed (jobs / payments / messages / reviews / notes / lifecycle events) with left filter rail. Will plug in once the server-side union view ships.",
    },
  }
  const meta = STUB_META[tab]
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-2xl">
      <SfCard>
        <SfCardHeader title={meta.title} />
        <div className="text-[12.5px] text-[var(--sf-ink-2)] leading-relaxed">{meta.copy}</div>
      </SfCard>
    </div>
  )
}

// ── Utilities ──────────────────────────────────────────────

const buildMonthlyTrend = (jobs) => {
  // Last 6 months ending this month
  const now = new Date()
  const buckets = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    buckets.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, label: d.toLocaleDateString("en-US", { month: "short" }), value: 0 })
  }
  jobs.forEach((j) => {
    if (isCancelledJob(j)) return
    const d = j.completed_at || j.scheduled_date
    if (!d) return
    const dt = new Date(String(d).includes("T") ? d : String(d).replace(" ", "T"))
    if (isNaN(dt)) return
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`
    const b = buckets.find((x) => x.key === key)
    if (b) {
      b.value += parseFloat(j.total || j.service_price || 0)
    }
  })
  const values = buckets.map((b) => b.value)
  const labels = buckets.map((b) => b.label)
  const recent = values[values.length - 1] || 0
  const prior = values[values.length - 2] || 0
  const deltaPct = prior > 0 ? ((recent - prior) / prior) * 100 : null
  return { values, labels, deltaPct }
}

const capitalize = (s) =>
  s ? String(s).charAt(0).toUpperCase() + String(s).slice(1).toLowerCase() : "—"

export default CustomerDetailsV2

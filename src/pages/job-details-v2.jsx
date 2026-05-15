"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import {
  ArrowLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Briefcase,
  MessageSquare,
  Phone as PhoneIcon,
  Edit,
  Check,
  CheckCircle2,
  AlertCircle,
  Plus,
  Truck,
  Mail as MailIcon,
  ExternalLink,
  Copy,
  RotateCw,
  Star,
  DollarSign,
  User as UserIcon,
  ChevronDown,
  MoreHorizontal,
  Trash2,
} from "lucide-react"
import { useAuth } from "../context/AuthContext"
import { jobsAPI, teamAPI, customersAPI, invoicesAPI } from "../services/api"
import { formatTime as formatTimeShared } from "../utils/formatTime"
import { getGoogleMapsApiKey } from "../config/maps"
import MobileHeader from "../components/mobile-header"
import {
  SfCard,
  SfCardHeader,
  SfButton,
  SfStatusPill,
  SfTag,
  SfTab,
  SfAvatar,
  sfInitials,
  sfAssignTeamColors,
} from "../components/sf-primitives"

/**
 * Job detail — Service Blue redesign (Wave 2.3).
 *
 * Header with breadcrumb / title / status / actions, tabs row, then a
 * two-column body: live banner + map + job details on the left,
 * customer / assignment (with team-lead picker) / timeline on the right.
 *
 * Reuses jobsAPI for data and the same mutation endpoints the legacy
 * page uses (updateStatus, cancel, assignMultipleTeamMembers).
 */

// ── Helpers ────────────────────────────────────────────────

const formatDateLong = (iso) => {
  if (!iso) return "—"
  const d = new Date(iso.includes("T") ? iso : iso.replace(" ", "T"))
  if (isNaN(d)) return "—"
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
}

const formatTimeRange = (job) => {
  const iso = job.scheduled_date || job.start_time || job.service_time
  if (!iso) return "—"
  const start = new Date(String(iso).includes("T") ? iso : String(iso).replace(" ", "T"))
  if (isNaN(start)) return "—"
  const duration = parseInt(job.duration || job.service_duration || job.estimated_duration || 0, 10)
  const startStr = formatTimeShared(start)
  if (!duration) return startStr
  const end = new Date(start.getTime() + duration * 60000)
  return `${startStr} – ${formatTimeShared(end)}`
}

const formatMoney = (n) => `$${(Number.isFinite(n) ? n : 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`

const jobStatusLabel = (raw) => {
  const s = (raw || "").toLowerCase()
  if (s.includes("progress") || s === "in_progress") return "In progress"
  if (s === "en_route" || s === "en route" || s === "enroute") return "En route"
  if (s === "completed" || s === "complete" || s === "done") return "Completed"
  if (s === "cancelled" || s === "canceled") return "Cancelled"
  return "Scheduled"
}

const assigneesFor = (job) => {
  const out = []
  const seen = new Set()
  const add = (id, name) => {
    const k = String(id || "")
    if (!k || seen.has(k)) return
    seen.add(k)
    out.push({ id: k, name: name || "" })
  }
  if (Array.isArray(job.assigned_providers)) {
    job.assigned_providers.forEach((p) => {
      const id = p?.id || p?.team_member_id || p?.provider_id
      const n =
        p?.name ||
        `${p?.first_name || ""} ${p?.last_name || ""}`.trim() ||
        p?.email ||
        ""
      add(id, n)
    })
  }
  if (Array.isArray(job.team_members)) {
    job.team_members.forEach((m) => {
      const id = m?.id || m?.team_member_id
      const n = m?.name || `${m?.first_name || ""} ${m?.last_name || ""}`.trim() || m?.email || ""
      add(id, n)
    })
  }
  if (Array.isArray(job.job_team_assignments)) {
    job.job_team_assignments.forEach((a) => {
      add(a?.team_member_id || a?.id, a?.team_member_name)
    })
  }
  if (Array.isArray(job.team_assignments)) {
    job.team_assignments.forEach((a) => {
      add(a?.team_member_id || a?.id, a?.team_member_name)
    })
  }
  if (job.team_member_id) add(job.team_member_id, job.team_member_name)
  if (job.assigned_to) add(job.assigned_to, job.assigned_to_name)
  return out
}

const teamLeadId = (job) =>
  job?.lead_cleaner_id ??
  job?.team_lead_id ??
  job?.lead_team_member_id ??
  job?.primary_member_id ??
  job?.primary_team_member_id ??
  null

// Derive where this job originated from. Surfaces the relevant fields
// the various source systems stamp on a job:
//   - zenbooker_id → "Zenbooker"
//   - lead_id      → "Lead"
//   - booking_id   → "Online booking" (public widget)
//   - imported_*   → "Imported"
//   - source       → freeform string set on creation
//   - everything else → "Manual"
const jobSource = (j) => {
  if (!j) return null
  if (j.zenbooker_id) return { label: "Zenbooker", detail: j.zenbooker_id, kind: "zenbooker" }
  if (j.leadbridge_id || j.lb_id) return { label: "LeadBridge", detail: j.leadbridge_id || j.lb_id, kind: "leadbridge" }
  if (j.lead_id) return { label: "Lead conversion", detail: `Lead #${String(j.lead_id).slice(-4)}`, kind: "lead" }
  if (j.booking_id || j.booking_request_id) return { label: "Online booking", detail: j.booking_id || j.booking_request_id, kind: "booking" }
  if (j.imported_at || j.imported_from || j.import_source) {
    return { label: "Imported", detail: j.imported_from || j.import_source || "—", kind: "import" }
  }
  if (j.source && String(j.source).trim()) {
    const raw = String(j.source).trim()
    return { label: raw.charAt(0).toUpperCase() + raw.slice(1), detail: null, kind: "freeform" }
  }
  if (j.created_via) {
    const raw = String(j.created_via).trim()
    return { label: raw.charAt(0).toUpperCase() + raw.slice(1), detail: null, kind: "freeform" }
  }
  return { label: "Manual", detail: null, kind: "manual" }
}

const paymentState = (j) => {
  const total = parseFloat(j.total || j.service_price || 0)
  if (total === 0) return null
  const raw = String(j.payment_status || j.payment_state || "").toLowerCase()
  if (raw === "paid" || raw === "complete" || raw === "completed") return "paid"
  if (raw === "partial" || raw === "partial_paid" || raw === "partially_paid") return "partial"
  if (raw === "refunded") return "refunded"
  return "unpaid"
}

const onShiftStatuses = new Set(["en route", "en_route", "in progress", "in_progress", "in-progress", "onsite", "on_site"])

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "notes",    label: "Notes" },
  { id: "photos",   label: "Photos" },
  { id: "tasks",    label: "Tasks" },
  { id: "invoice",  label: "Invoice" },
  { id: "activity", label: "Activity" },
]

// ── Component ──────────────────────────────────────────────

const JobDetailsV2 = () => {
  const { jobId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [tab, setTab] = useState("overview")
  const [job, setJob] = useState(null)
  const [loading, setLoading] = useState(true)
  const [teamMembers, setTeamMembers] = useState([])
  const [customer, setCustomer] = useState(null)
  const [invoice, setInvoice] = useState(null)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const [showLeadPicker, setShowLeadPicker] = useState(false)
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const moreMenuRef = useRef(null)

  // Close more-actions menu on outside click
  useEffect(() => {
    if (!showMoreMenu) return
    const onClick = (e) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target)) {
        setShowMoreMenu(false)
      }
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [showMoreMenu])

  const loadJob = useCallback(async () => {
    if (!jobId) return
    setLoading(true)
    setError("")
    try {
      const resp = await jobsAPI.getById(jobId)
      const j = resp?.job || resp
      setJob(j)
      // Customer + invoice + team in parallel (best-effort)
      const customerId = j?.customer_id
      const invoiceId = j?.invoice_id
      const promises = [
        user?.id ? teamAPI.getAll(user.id, { page: 1, limit: 200 }) : Promise.resolve(null),
        customerId ? customersAPI.getById(customerId).catch(() => null) : Promise.resolve(null),
        invoiceId && user?.id ? invoicesAPI.getById(invoiceId, user.id).catch(() => null) : Promise.resolve(null),
      ]
      const [teamResp, custResp, invResp] = await Promise.all(promises)
      if (teamResp) setTeamMembers(teamResp.teamMembers || teamResp || [])
      if (custResp) setCustomer(custResp.customer || custResp)
      if (invResp) setInvoice(invResp.invoice || invResp)
    } catch (e) {
      setError(e?.message || "Could not load this job.")
    } finally {
      setLoading(false)
    }
  }, [jobId, user?.id])

  useEffect(() => { loadJob() }, [loadJob])

  // Name + color lookups
  const memberNameById = useMemo(() => {
    const map = new Map()
    teamMembers.forEach((m) => {
      if (m?.id == null) return
      const n = m.name || `${m.first_name || ""} ${m.last_name || ""}`.trim() || m.email || ""
      if (n) map.set(String(m.id), n)
    })
    return map
  }, [teamMembers])

  const assignees = useMemo(() => (job ? assigneesFor(job) : []), [job])
  const cleanerColors = useMemo(
    () => sfAssignTeamColors(assignees.map((a) => a.id)),
    [assignees]
  )
  const isTeamJob = assignees.length >= 2
  const leadIdResolved = teamLeadId(job)
  const lead = leadIdResolved
    ? assignees.find((a) => String(a.id) === String(leadIdResolved)) || null
    : null
  const leadName = lead ? (memberNameById.get(String(lead.id)) || lead.name) : null

  // ── Actions ────────────────────────────────────────────────

  const onMarkComplete = async () => {
    if (!job) return
    if (!window.confirm("Mark this job as completed?")) return
    setBusy(true)
    try {
      await jobsAPI.updateStatus(job.id, "completed")
      await loadJob()
    } catch (e) {
      alert(e?.message || "Could not update status.")
    } finally {
      setBusy(false)
    }
  }

  const onCancel = async () => {
    if (!job) return
    const reason = window.prompt("Reason for cancellation (optional):")
    if (reason === null) return
    setBusy(true)
    try {
      await jobsAPI.cancel(job.id, { reason })
      await loadJob()
    } catch (e) {
      alert(e?.message || "Could not cancel the job.")
    } finally {
      setBusy(false)
    }
  }

  const onDelete = async () => {
    if (!job) return
    setShowMoreMenu(false)
    const confirmed = window.confirm(
      "Delete this job permanently? This removes the booking and any related ledger entries. " +
        "Prefer Cancel if you just want to keep the record but stop the job."
    )
    if (!confirmed) return
    setBusy(true)
    try {
      await jobsAPI.delete(job.id)
      navigate("/jobs")
    } catch (e) {
      alert(e?.message || "Could not delete the job.")
      setBusy(false)
    }
  }

  const onSetLead = async (newLeadId) => {
    if (!job) return
    setBusy(true)
    setShowLeadPicker(false)
    try {
      const ids = assignees.map((a) => a.id)
      await jobsAPI.assignMultipleTeamMembers(job.id, ids, newLeadId)
      await loadJob()
    } catch (e) {
      alert(e?.message || "Could not set the team lead.")
    } finally {
      setBusy(false)
    }
  }

  // ── Render ────────────────────────────────────────────────

  if (loading && !job) {
    return (
      <div
        className="min-h-screen bg-[var(--sf-bg-page)] flex items-center justify-center"
        style={{ fontFamily: "var(--sf-font-ui)" }}
      >
        <div className="text-[13px] text-[var(--sf-ink-3)]">Loading job…</div>
      </div>
    )
  }

  if (error || !job) {
    return (
      <div
        className="min-h-screen bg-[var(--sf-bg-page)] flex flex-col items-center justify-center gap-3"
        style={{ fontFamily: "var(--sf-font-ui)" }}
      >
        <div className="text-[15px] font-semibold text-[var(--sf-ink)]">Couldn't load this job</div>
        <div className="text-[12.5px] text-[var(--sf-ink-3)] max-w-md text-center">
          {error || "Job not found."}
        </div>
        <SfButton variant="secondary" size="md" icon={ArrowLeft} onClick={() => navigate("/jobs")}>
          Back to jobs
        </SfButton>
      </div>
    )
  }

  const idDisp = `#${String(job.id).slice(-4)}`
  const status = jobStatusLabel(job.status)
  const isLive = onShiftStatuses.has((job.status || "").toLowerCase())
  const isCancelledStatus = (job.status || "").toLowerCase().includes("cancel")
  const isCompletedStatus = ["completed", "complete", "done"].includes((job.status || "").toLowerCase())
  const customerName =
    customer?.name ||
    `${customer?.first_name || job.customer_first_name || ""} ${customer?.last_name || job.customer_last_name || ""}`.trim() ||
    job.customer_name ||
    "Customer"
  const customerPhone = customer?.phone || job.customer_phone
  const customerEmail = customer?.email || job.customer_email
  const serviceAddress = job.service_address || job.customer_address || customer?.address || ""
  const serviceCity = job.service_city || job.customer_city || customer?.city || ""
  const serviceName = job.service_name || "Service"
  const value = parseFloat(job.total || job.service_price || 0)
  const isRecurring = job.is_recurring === true
  const payState = paymentState(job)
  const banner = isLive ? assignees[0] : null
  const bannerColor = banner ? (cleanerColors.get(banner.id) || "#2563EB") : "#2563EB"

  return (
    <div
      className="min-h-screen bg-[var(--sf-bg-page)]"
      style={{ fontFamily: "var(--sf-font-ui)" }}
    >
      <MobileHeader title="Job" />

      {/* Header */}
      <div className="px-4 sm:px-6 lg:px-8 pt-4 bg-[var(--sf-panel)] border-b border-[var(--sf-border-soft)]">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-[12px] text-[var(--sf-ink-2)] mb-2.5">
          <Link
            to="/jobs"
            className="inline-flex items-center gap-1 hover:text-[var(--sf-ink)] transition-colors"
            style={{ color: "inherit", textDecoration: "none" }}
          >
            <ArrowLeft size={12} /> Jobs
          </Link>
          <ChevronRight size={11} className="text-[var(--sf-ink-4)]" />
          <span
            className="text-[var(--sf-ink)] font-semibold"
            style={{ fontFamily: "var(--sf-font-mono)" }}
          >
            {idDisp}
          </span>
        </div>

        {/* Title + meta + actions */}
        <div className="flex items-start gap-4 flex-wrap pb-3">
          <div className="min-w-0 flex-[1_1_460px]">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1
                className="text-[20px] sm:text-[22px] font-bold text-[var(--sf-ink)] m-0"
                style={{ letterSpacing: "-0.02em" }}
              >
                {serviceName} · {customerName}
              </h1>
              <SfStatusPill status={status} />
              {isRecurring && (
                <SfTag color="var(--sf-purple)" bg="var(--sf-purple-soft)">
                  ↻ Recurring
                </SfTag>
              )}
            </div>
            <div className="flex items-center gap-3 mt-2 text-[12.5px] text-[var(--sf-ink-2)] flex-wrap">
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                <CalendarIcon size={13} className="text-[var(--sf-ink-3)]" />
                {formatDateLong(job.scheduled_date)}
              </span>
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                <Clock size={13} className="text-[var(--sf-ink-3)]" />
                {formatTimeRange(job)}
              </span>
              {serviceAddress && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin size={13} className="text-[var(--sf-ink-3)] flex-shrink-0" />
                  <span className="truncate">{serviceAddress}{serviceCity ? `, ${serviceCity}` : ""}</span>
                </span>
              )}
              {job.bedrooms && (
                <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                  <Briefcase size={13} className="text-[var(--sf-ink-3)]" />
                  {job.bedrooms} bedrooms
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {customerPhone && (
              <SfButton variant="secondary" size="md" icon={MessageSquare}>
                Message
              </SfButton>
            )}
            {customerPhone && (
              <a href={`tel:${customerPhone}`} className="inline-block" style={{ textDecoration: "none" }}>
                <SfButton variant="secondary" size="md" icon={PhoneIcon}>
                  Call
                </SfButton>
              </a>
            )}
            <SfButton
              variant="secondary"
              size="md"
              icon={Edit}
              onClick={() => navigate(`/job/${job.id}?edit=1`)}
            >
              Edit
            </SfButton>
            {!isCompletedStatus && !isCancelledStatus && (
              <SfButton variant="danger" size="md" onClick={onCancel} disabled={busy}>
                Cancel
              </SfButton>
            )}
            {!isCompletedStatus && !isCancelledStatus && (
              <SfButton variant="primary" size="md" icon={Check} onClick={onMarkComplete} disabled={busy}>
                Mark complete
              </SfButton>
            )}

            {/* More actions menu */}
            <div className="relative" ref={moreMenuRef}>
              <button
                onClick={() => setShowMoreMenu((v) => !v)}
                aria-label="More actions"
                disabled={busy}
                className="w-9 h-9 inline-flex items-center justify-center rounded-[8px] bg-[var(--sf-panel)] border border-[var(--sf-border-2)] text-[var(--sf-ink-2)] hover:bg-[var(--sf-panel-soft)] transition-colors"
                style={{ cursor: busy ? "not-allowed" : "pointer" }}
              >
                <MoreHorizontal size={16} strokeWidth={2} />
              </button>
              {showMoreMenu && (
                <div
                  className="absolute right-0 top-full mt-1.5 w-48 rounded-[10px] bg-[var(--sf-panel)] border border-[var(--sf-border-soft)] py-1.5 z-50"
                  style={{ boxShadow: "var(--sf-shadow-l)" }}
                >
                  <button
                    onClick={onDelete}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-[12.5px] font-medium hover:bg-[var(--sf-red-soft)] transition-colors"
                    style={{ color: "var(--sf-red-dark)" }}
                  >
                    <Trash2 size={14} strokeWidth={1.85} />
                    Delete job
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div
          className="flex items-center overflow-x-auto scrollbar-hide -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8"
          style={{ borderTop: "1px solid var(--sf-border-soft)" }}
        >
          {TABS.map((t) => (
            <SfTab key={t.id} active={tab === t.id} onClick={() => setTab(t.id)}>
              {t.label}
            </SfTab>
          ))}
        </div>
      </div>

      {/* Body */}
      {tab === "invoice" ? (
        <InvoiceTabBody
          job={job}
          invoice={invoice}
          customer={customer}
          user={user}
          customerName={customerName}
          serviceAddress={serviceAddress}
          serviceCity={serviceCity}
          payState={payState}
          busy={busy}
          onMarkPaid={async () => {
            if (!invoice?.id || !user?.id) return
            setBusy(true)
            try {
              await invoicesAPI.updateStatus(invoice.id, "paid", user.id)
              await loadJob()
            } catch (e) {
              alert(e?.message || "Could not mark as paid.")
            } finally {
              setBusy(false)
            }
          }}
          onGenerateInvoice={async (payload) => {
            if (!user?.id || !job?.id) return
            const customerId = job.customer_id || customer?.id
            if (!customerId) {
              alert("This job has no customer linked — set a customer before generating the invoice.")
              return
            }
            if (!(payload.totalAmount > 0)) {
              alert("Set a service price on the job before generating the invoice.")
              return
            }
            setBusy(true)
            try {
              await invoicesAPI.create({
                userId: user.id,
                customerId,
                jobId: job.id,
                totalAmount: payload.totalAmount,
                taxAmount: payload.taxAmount || 0,
                status: "draft",
                dueDate: payload.dueDate,
              })
              await loadJob()
            } catch (e) {
              alert(e?.response?.data?.error || e?.message || "Could not generate the invoice.")
            } finally {
              setBusy(false)
            }
          }}
          onOpenInvoice={() => invoice?.id && navigate(`/invoices/${invoice.id}`)}
          onEditInvoice={() => invoice?.id && navigate(`/invoices/${invoice.id}/edit`)}
        />
      ) : (
      <div className="px-4 sm:px-6 lg:px-8 py-4 grid grid-cols-1 lg:grid-cols-[64fr_36fr] gap-4">
        {/* Main column */}
        <div className="flex flex-col gap-4 min-w-0">
          {tab === "overview" && (
            <>
              {/* Live status banner */}
              {isLive && banner && (
                <div
                  className="flex items-center gap-3 rounded-[10px] text-white p-4"
                  style={{
                    background: `linear-gradient(135deg, ${bannerColor}, ${bannerColor}cc)`,
                    boxShadow: "var(--sf-shadow-m)",
                  }}
                >
                  <div
                    className="w-[42px] h-[42px] rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(255,255,255,.18)" }}
                  >
                    <Truck size={22} strokeWidth={2.2} color="#fff" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-bold">
                      {leadName || memberNameById.get(banner.id) || "Team"}{" "}
                      {(job.status || "").toLowerCase().includes("progress") ? "is on site" : "is en route"}
                    </div>
                    <div className="text-[12.5px] mt-0.5 opacity-90">
                      Started {formatTimeShared(job.start_time || job.scheduled_date)}
                      {isTeamJob && ` · ${assignees.length} cleaners`}
                    </div>
                  </div>
                </div>
              )}

              {/* Map */}
              {serviceAddress && (
                <SfCard padding={0}>
                  <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[var(--sf-border-soft)]">
                    <div className="text-[13px] font-semibold text-[var(--sf-ink)]">Location</div>
                    <div className="flex-1" />
                    <SfButton
                      variant="ghost"
                      size="sm"
                      icon={Copy}
                      onClick={() => {
                        navigator.clipboard?.writeText(`${serviceAddress}${serviceCity ? `, ${serviceCity}` : ""}`)
                      }}
                    >
                      Copy address
                    </SfButton>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${serviceAddress}, ${serviceCity}`)}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ textDecoration: "none" }}
                    >
                      <SfButton variant="ghost" size="sm" iconRight={ExternalLink}>
                        Open in Maps
                      </SfButton>
                    </a>
                  </div>
                  <div style={{ height: 240 }}>
                    <iframe
                      title="Job location"
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      src={`https://www.google.com/maps/embed/v1/place?key=${getGoogleMapsApiKey()}&q=${encodeURIComponent(`${serviceAddress}, ${serviceCity}`)}&zoom=14`}
                    />
                  </div>
                </SfCard>
              )}

              {/* Job details */}
              <SfCard>
                <SfCardHeader title="Job details" />
                <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                  <DetailItem label="Service" value={serviceName} />
                  <DetailItem label="Date" value={formatDateLong(job.scheduled_date)} />
                  <DetailItem label="Time" value={formatTimeRange(job)} />
                  <DetailItem
                    label="Estimated duration"
                    value={
                      parseInt(job.duration || job.estimated_duration || 0, 10)
                        ? `${parseInt(job.duration || job.estimated_duration, 10)} min`
                        : "—"
                    }
                  />
                  <DetailItem label="Total" value={value ? formatMoney(value) : "—"} />
                  <DetailItem
                    label="Property"
                    value={job.bedrooms ? `${job.bedrooms} bedrooms` : "—"}
                  />
                  {job.bathroom_count && (
                    <DetailItem label="Bathrooms" value={job.bathroom_count} />
                  )}
                  <DetailItem
                    label="Recurrence"
                    value={isRecurring ? (job.recurring_frequency || "Recurring") : "One-time"}
                  />
                  <DetailItem
                    label="Source"
                    value={<SourceDisplay source={jobSource(job)} />}
                  />
                  <DetailItem
                    label="Created"
                    value={
                      job.created_at
                        ? new Date(job.created_at).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                        : "—"
                    }
                  />
                </div>

                {/* Customer note */}
                {(job.notes || job.customer_notes) && (
                  <div
                    className="mt-5 p-3 rounded-lg flex items-start gap-2.5"
                    style={{
                      background: "var(--sf-amber-soft)",
                      borderLeft: "3px solid var(--sf-amber)",
                    }}
                  >
                    <AlertCircle size={16} className="text-[var(--sf-amber-dark)] flex-shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <div className="text-[12px] font-bold text-[var(--sf-amber-dark)]">Customer note</div>
                      <div className="text-[12.5px] text-[var(--sf-ink-2)] mt-0.5 whitespace-pre-wrap">
                        {job.notes || job.customer_notes}
                      </div>
                    </div>
                  </div>
                )}
              </SfCard>
            </>
          )}

          {tab !== "overview" && (
            <SfCard>
              <SfCardHeader title={TABS.find((t) => t.id === tab)?.label} />
              <div className="py-8 text-center text-[12.5px] text-[var(--sf-ink-3)]">
                This tab is coming in a later wave of the redesign.
              </div>
            </SfCard>
          )}
        </div>

        {/* Side rail */}
        <div className="flex flex-col gap-4 min-w-0">
          {/* Customer */}
          <SfCard>
            <div className="flex items-start gap-3">
              <SfAvatar
                initials={sfInitials(customerName)}
                color="var(--sf-ink)"
                size={44}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[15px] font-bold text-[var(--sf-ink)] truncate">
                    {customerName}
                  </span>
                  {customer?.tags?.includes?.("VIP") && (
                    <SfTag color="var(--sf-purple)" bg="var(--sf-purple-soft)">VIP</SfTag>
                  )}
                </div>
                <div className="text-[11.5px] text-[var(--sf-ink-3)] mt-1 truncate">
                  {customer?.created_at && `Customer since ${new Date(customer.created_at).getFullYear()}`}
                  {customer?.total_jobs && ` · ${customer.total_jobs} jobs`}
                  {customer?.lifetime_value && ` · ${formatMoney(customer.lifetime_value)} LTV`}
                </div>
              </div>
              {customer?.id && (
                <SfButton
                  variant="ghost"
                  size="sm"
                  iconRight={ChevronRight}
                  onClick={() => navigate(`/customer/${customer.id}`)}
                >
                  View
                </SfButton>
              )}
            </div>

            <div className="flex gap-2 mt-3">
              {customerPhone && (
                <a
                  href={`tel:${customerPhone}`}
                  className="flex-1"
                  style={{ textDecoration: "none" }}
                >
                  <SfButton variant="secondary" size="sm" icon={PhoneIcon} className="w-full justify-center">
                    Call
                  </SfButton>
                </a>
              )}
              {customerPhone && (
                <a
                  href={`sms:${customerPhone}`}
                  className="flex-1"
                  style={{ textDecoration: "none" }}
                >
                  <SfButton variant="secondary" size="sm" icon={MessageSquare} className="w-full justify-center">
                    SMS
                  </SfButton>
                </a>
              )}
              {customerEmail && (
                <a
                  href={`mailto:${customerEmail}`}
                  className="flex-1"
                  style={{ textDecoration: "none" }}
                >
                  <SfButton variant="secondary" size="sm" icon={MailIcon} className="w-full justify-center">
                    Email
                  </SfButton>
                </a>
              )}
            </div>

            <div className="mt-3 pt-3 border-t border-[var(--sf-border-soft)] flex flex-col gap-2">
              {customerPhone && (
                <div className="flex items-center gap-2 text-[12px] text-[var(--sf-ink-2)]">
                  <PhoneIcon size={13} className="text-[var(--sf-ink-3)]" />
                  {customerPhone}
                </div>
              )}
              {customerEmail && (
                <div className="flex items-center gap-2 text-[12px] text-[var(--sf-ink-2)]">
                  <MailIcon size={13} className="text-[var(--sf-ink-3)]" />
                  {customerEmail}
                </div>
              )}
              {serviceAddress && (
                <div className="flex items-start gap-2 text-[12px] text-[var(--sf-ink-2)]">
                  <MapPin size={13} className="text-[var(--sf-ink-3)] flex-shrink-0 mt-0.5" />
                  <span className="min-w-0">
                    {serviceAddress}{serviceCity ? `, ${serviceCity}` : ""}
                  </span>
                </div>
              )}
            </div>
          </SfCard>

          {/* Assignment */}
          <SfCard>
            <SfCardHeader
              title="Assignment"
              right={
                assignees.length > 0 && (
                  <SfButton variant="ghost" size="sm" icon={RotateCw}>
                    Reassign
                  </SfButton>
                )
              }
            />
            {assignees.length === 0 ? (
              <div>
                <SfButton
                  variant="primary"
                  size="md"
                  icon={Plus}
                  className="w-full justify-center"
                >
                  Assign team
                </SfButton>
                <div className="text-[11.5px] text-[var(--sf-ink-3)] mt-2 text-center">
                  No cleaners assigned yet.
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {/* Cleaners list */}
                <div className="flex flex-col gap-2">
                  {assignees.map((a) => {
                    const isLead = lead && String(lead.id) === String(a.id)
                    const color = cleanerColors.get(a.id) || "#94A3B8"
                    const name = memberNameById.get(a.id) || a.name || "Team member"
                    return (
                      <div key={a.id} className="flex items-center gap-2.5">
                        <SfAvatar
                          initials={sfInitials(name)}
                          color={color}
                          size={28}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-[12.5px] font-semibold text-[var(--sf-ink)] leading-tight truncate">
                            {name}
                          </div>
                          {isLead && (
                            <div className="text-[10.5px] text-[var(--sf-blue-dark)] font-semibold leading-tight mt-px">
                              Team lead
                            </div>
                          )}
                        </div>
                        {isLead && (
                          <SfTag color="var(--sf-blue-dark)" bg="var(--sf-blue-soft)">
                            <Star size={9} strokeWidth={2.4} /> Lead
                          </SfTag>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Team lead picker — only for multi-cleaner jobs */}
                {isTeamJob && (
                  <div className="pt-3 border-t border-[var(--sf-border-soft)]">
                    <div className="text-[11px] font-semibold text-[var(--sf-ink-3)] uppercase tracking-wide mb-2">
                      Team lead
                    </div>
                    <div className="relative">
                      <button
                        onClick={() => setShowLeadPicker((v) => !v)}
                        disabled={busy}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-md bg-[var(--sf-panel)] border border-[var(--sf-border-soft)] hover:bg-[var(--sf-panel-soft)] transition-colors"
                        style={{ fontFamily: "var(--sf-font-ui)", cursor: busy ? "not-allowed" : "pointer" }}
                      >
                        {lead ? (
                          <>
                            <SfAvatar
                              initials={sfInitials(leadName || "")}
                              color={cleanerColors.get(lead.id) || "#94A3B8"}
                              size={20}
                            />
                            <span className="flex-1 text-left text-[12.5px] font-semibold text-[var(--sf-ink)] truncate">
                              {leadName || "Team lead"}
                            </span>
                          </>
                        ) : (
                          <span className="flex-1 text-left text-[12.5px] text-[var(--sf-ink-3)]">
                            No lead selected (optional)
                          </span>
                        )}
                        <ChevronDown size={13} className="text-[var(--sf-ink-3)] flex-shrink-0" />
                      </button>
                      {showLeadPicker && (
                        <div
                          className="absolute left-0 right-0 top-full mt-1.5 z-20 rounded-md bg-[var(--sf-panel)] border border-[var(--sf-border-soft)] py-1"
                          style={{ boxShadow: "var(--sf-shadow-l)" }}
                        >
                          <button
                            onClick={() => onSetLead(null)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-left text-[12.5px] text-[var(--sf-ink-2)] hover:bg-[var(--sf-panel-soft)]"
                          >
                            No team lead
                          </button>
                          <div className="my-1 border-t border-[var(--sf-border-soft)]" />
                          {assignees.map((a) => {
                            const name = memberNameById.get(a.id) || a.name || "Team member"
                            const sel = lead && String(lead.id) === String(a.id)
                            return (
                              <button
                                key={a.id}
                                onClick={() => onSetLead(a.id)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-left text-[12.5px]"
                                style={{
                                  background: sel ? "var(--sf-blue-soft)" : "transparent",
                                  color: sel ? "var(--sf-blue-dark)" : "var(--sf-ink)",
                                  fontWeight: sel ? 600 : 500,
                                }}
                              >
                                <SfAvatar
                                  initials={sfInitials(name)}
                                  color={cleanerColors.get(a.id) || "#94A3B8"}
                                  size={20}
                                />
                                <span className="flex-1 truncate">{name}</span>
                                {sel && <Check size={12} strokeWidth={2.4} />}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                    <div className="text-[10.5px] text-[var(--sf-ink-3)] mt-1.5">
                      The lead shows up as “{leadName ? leadName.split(" ")[0] : "Tatiana"}’s team” on the schedule timeline. Optional.
                    </div>
                  </div>
                )}

                {/* Quick stats */}
                <div className="pt-3 border-t border-[var(--sf-border-soft)] grid grid-cols-3 gap-3">
                  <div>
                    <div className="text-[10.5px] text-[var(--sf-ink-3)] font-semibold uppercase tracking-wide">
                      Cleaners
                    </div>
                    <div
                      className="text-[14px] font-bold text-[var(--sf-ink)] mt-1"
                      style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                      {assignees.length}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10.5px] text-[var(--sf-ink-3)] font-semibold uppercase tracking-wide">
                      Status
                    </div>
                    <div className="text-[12px] font-semibold mt-1">
                      <SfStatusPill status={status} />
                    </div>
                  </div>
                  <div>
                    <div className="text-[10.5px] text-[var(--sf-ink-3)] font-semibold uppercase tracking-wide">
                      Value
                    </div>
                    <div
                      className="text-[14px] font-bold text-[var(--sf-ink)] mt-1"
                      style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                      {value ? formatMoney(value) : "—"}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </SfCard>

          {/* Invoice */}
          {(invoice || value > 0) && (
            <SfCard>
              <SfCardHeader
                title="Invoice"
                right={
                  invoice?.id && (
                    <SfButton
                      variant="ghost"
                      size="sm"
                      iconRight={ChevronRight}
                      onClick={() => navigate(`/invoices/${invoice.id}`)}
                    >
                      View
                    </SfButton>
                  )
                }
              />
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0"
                  style={{
                    background: payState === "paid" ? "var(--sf-green-soft)" : "var(--sf-amber-soft)",
                    color: payState === "paid" ? "var(--sf-green-dark)" : "var(--sf-amber-dark)",
                  }}
                >
                  {payState === "paid" ? <CheckCircle2 size={18} /> : <DollarSign size={18} />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-bold text-[var(--sf-ink)]">
                    {formatMoney(parseFloat(invoice?.total_amount || invoice?.amount || invoice?.total || value || 0))}
                  </div>
                  <div className="text-[11.5px] text-[var(--sf-ink-3)] mt-0.5 capitalize">
                    {payState || "no invoice"}
                  </div>
                </div>
                {payState !== "paid" && !isCancelledStatus && (
                  <SfButton variant="primary" size="sm">
                    Collect
                  </SfButton>
                )}
              </div>
            </SfCard>
          )}

          {/* Timeline */}
          <SfCard>
            <SfCardHeader title="Timeline" />
            <Timeline job={job} status={status} />
          </SfCard>
        </div>
      </div>
      )}
    </div>
  )
}

// ── Invoice tab ────────────────────────────────────────────

const INVOICE_STATUS_META = {
  draft:    { label: "Draft",       c: "var(--sf-ink-2)",      bg: "var(--sf-panel-soft)", note: "Will be sent when ready" },
  pending:  { label: "Pending",     c: "var(--sf-amber-dark)", bg: "var(--sf-amber-soft)", note: "Awaiting send" },
  sent:     { label: "Sent",        c: "var(--sf-blue-dark)",  bg: "var(--sf-blue-soft)",  note: "Sent · awaiting payment" },
  viewed:   { label: "Viewed",      c: "#0E7490",              bg: "var(--sf-teal-soft)",  note: "Customer viewed · awaiting payment" },
  paid:     { label: "Paid",        c: "var(--sf-green-dark)", bg: "var(--sf-green-soft)", note: "Fully paid" },
  overdue:  { label: "Overdue",     c: "var(--sf-red-dark)",   bg: "var(--sf-red-soft)",   note: "Past due · send reminder" },
  void:     { label: "Void",        c: "var(--sf-ink-3)",      bg: "var(--sf-panel-soft)", note: "Voided" },
  refunded: { label: "Refunded",    c: "var(--sf-ink-2)",      bg: "var(--sf-panel-soft)", note: "Refunded" },
}

const invoiceStatusMeta = (raw, hasInvoice, jobHasPrice, jobPaid) => {
  if (hasInvoice) {
    const k = String(raw || "").toLowerCase()
    return INVOICE_STATUS_META[k] || INVOICE_STATUS_META.draft
  }
  // No invoice row yet — derive a sensible state from the job itself.
  if (jobPaid) {
    return { ...INVOICE_STATUS_META.paid, note: "Marked paid on the job — no formal invoice generated" }
  }
  if (jobHasPrice) {
    return { ...INVOICE_STATUS_META.draft, note: "Drafted from the job — Generate invoice when ready to bill" }
  }
  return { ...INVOICE_STATUS_META.pending, label: "Not yet priced", note: "Set a service price on the job to draft the invoice" }
}

const formatMoneyExact = (n) =>
  `$${(Number.isFinite(n) ? n : 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`

const InvoiceTabBody = ({
  job,
  invoice,
  customer,
  user,
  customerName,
  serviceAddress,
  serviceCity,
  payState,
  busy,
  onMarkPaid,
  onGenerateInvoice,
  onOpenInvoice,
  onEditInvoice,
}) => {
  // Build line items from job + invoice. The invoice schema in this
  // codebase is flat (no separate line_items table), so we derive items
  // from the job's pricing fields:
  //   - base service price → main line
  //   - additional_fees → "Add-ons"
  //   - discount → negative line
  //   - tip_amount → "Tip"
  const baseService = parseFloat(job.service_price || 0)
  const additionalFees = parseFloat(job.additional_fees || 0)
  const discount = parseFloat(job.discount || 0)
  const tip = parseFloat(job.tip_amount || 0)
  const fallbackTotal = parseFloat(invoice?.total_amount || invoice?.amount || job.total || 0)

  const items = []
  if (baseService > 0) {
    items.push({
      desc: job.service_name || "Service",
      detail: job.bedrooms ? `${job.bedrooms} bedrooms${job.bathroom_count ? ` · ${job.bathroom_count} bath` : ""}` : null,
      qty: 1,
      rate: baseService,
      total: baseService,
    })
  } else if (fallbackTotal > 0) {
    items.push({
      desc: job.service_name || "Service",
      detail: null,
      qty: 1,
      rate: fallbackTotal,
      total: fallbackTotal,
    })
  }
  if (additionalFees > 0) {
    items.push({ desc: "Add-ons", detail: null, qty: 1, rate: additionalFees, total: additionalFees })
  }
  if (discount > 0) {
    items.push({ desc: "Discount", detail: null, qty: 1, rate: -discount, total: -discount })
  }
  if (tip > 0) {
    items.push({ desc: "Tip", detail: null, qty: 1, rate: tip, total: tip })
  }
  const subtotal = items.reduce((s, it) => s + it.total, 0)
  const tax = parseFloat(invoice?.tax_amount || 0)
  const total = invoice?.total_amount != null
    ? parseFloat(invoice.total_amount)
    : (subtotal + tax)

  const jobHasPrice = baseService > 0 || fallbackTotal > 0 || total > 0
  const jobPaid = payState === "paid"
  const meta = invoiceStatusMeta(
    invoice?.status || (jobPaid ? "paid" : "draft"),
    Boolean(invoice),
    jobHasPrice,
    jobPaid
  )
  const isPaid = jobPaid

  const invoiceCode = invoice?.id
    ? `INV-${String(invoice.id).slice(-4)}`
    : jobHasPrice
    ? `Draft · #${String(job.id).slice(-4)}`
    : "—"
  const issuedDate = invoice?.created_at
    ? new Date(invoice.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "—"
  const dueDate = invoice?.due_date
    ? new Date(invoice.due_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "—"
  const businessName = user?.business_name || user?.businessName || "Service Flow"
  const businessEmail = user?.email
  const businessPhone = user?.phone || user?.business_phone
  const businessAddress = user?.business_address || user?.address

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-4 grid grid-cols-1 lg:grid-cols-[64fr_36fr] gap-4 items-start">
      {/* Main column */}
      <div className="flex flex-col gap-4 min-w-0">
        <SfCard padding={0} className="overflow-hidden">
          {/* Status ribbon */}
          <div
            className="flex items-center gap-2.5 px-5 py-3 border-b border-[var(--sf-border-soft)]"
            style={{ background: meta.bg }}
          >
            <DollarSign size={15} style={{ color: meta.c }} />
            <span className="text-[13px] font-bold" style={{ color: meta.c }}>
              {meta.label}
            </span>
            <span className="text-[12px] text-[var(--sf-ink-2)]">· {meta.note}</span>
            <div className="flex-1" />
            {isPaid && invoice?.updated_at && (
              <span
                className="text-[11.5px] font-semibold"
                style={{ color: "var(--sf-green-dark)", fontVariantNumeric: "tabular-nums" }}
              >
                Paid {new Date(invoice.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            )}
          </div>

          {/* Header band — invoice id, dates, total */}
          <div className="px-5 sm:px-7 pt-6">
            <div className="flex items-start justify-between gap-5 flex-wrap mb-5">
              <div>
                <div
                  className="text-[10.5px] font-bold uppercase text-[var(--sf-ink-3)]"
                  style={{ letterSpacing: ".08em" }}
                >
                  Invoice
                </div>
                <div
                  className="text-[20px] sm:text-[22px] font-bold text-[var(--sf-ink)] mt-0.5"
                  style={{ fontFamily: "var(--sf-font-mono)", letterSpacing: "-0.01em" }}
                >
                  {invoiceCode}
                </div>
                <div className="flex gap-5 mt-3 flex-wrap">
                  <InvoiceMeta label="Issued" value={issuedDate} />
                  <InvoiceMeta
                    label="Due"
                    value={dueDate}
                    valueClass={meta.label === "Overdue" ? "text-[var(--sf-red-dark)]" : undefined}
                  />
                  <InvoiceMeta label="Linked to job" value={`#${String(job.id).slice(-4)}`} mono />
                </div>
              </div>
              <div className="text-right">
                <div
                  className="text-[10.5px] font-bold uppercase text-[var(--sf-ink-3)]"
                  style={{ letterSpacing: ".06em" }}
                >
                  Total due
                </div>
                <div
                  className="text-[28px] sm:text-[32px] font-bold text-[var(--sf-ink)] leading-none mt-1"
                  style={{
                    letterSpacing: "-0.025em",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {formatMoneyExact(total)}
                </div>
                {isPaid && (
                  <div
                    className="inline-flex items-center gap-1 mt-2 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase"
                    style={{
                      background: "var(--sf-green-soft)",
                      color: "var(--sf-green-dark)",
                      border: "1px solid rgba(22,163,74,.3)",
                      letterSpacing: ".04em",
                    }}
                  >
                    <CheckCircle2 size={11} /> Paid in full
                  </div>
                )}
              </div>
            </div>

            {/* From / To */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pb-5 border-b border-[var(--sf-border-soft)]">
              <div>
                <div
                  className="text-[10.5px] font-bold uppercase text-[var(--sf-ink-3)] mb-1.5"
                  style={{ letterSpacing: ".04em" }}
                >
                  From
                </div>
                <div className="text-[13.5px] font-bold text-[var(--sf-ink)]">{businessName}</div>
                <div className="text-[11.5px] text-[var(--sf-ink-2)] mt-1 leading-relaxed">
                  {businessAddress && <>{businessAddress}<br /></>}
                  {businessEmail}
                  {businessEmail && businessPhone && " · "}
                  {businessPhone}
                </div>
              </div>
              <div>
                <div
                  className="text-[10.5px] font-bold uppercase text-[var(--sf-ink-3)] mb-1.5"
                  style={{ letterSpacing: ".04em" }}
                >
                  Bill to
                </div>
                <div className="flex items-center gap-2">
                  <SfAvatar initials={sfInitials(customerName)} color="var(--sf-ink)" size={24} />
                  <span className="text-[13.5px] font-bold text-[var(--sf-ink)] truncate">{customerName}</span>
                  {customer?.tags?.includes?.("VIP") && (
                    <SfTag color="var(--sf-purple)" bg="var(--sf-purple-soft)">VIP</SfTag>
                  )}
                </div>
                <div className="text-[11.5px] text-[var(--sf-ink-2)] mt-1.5 leading-relaxed">
                  {serviceAddress && <>{serviceAddress}<br /></>}
                  {serviceCity && <>{serviceCity}<br /></>}
                  {customer?.email}
                  {customer?.email && customer?.phone && " · "}
                  {customer?.phone}
                </div>
              </div>
            </div>
          </div>

          {/* Line items */}
          <div className="px-5 sm:px-7 pb-6 pt-1">
            <div
              className="flex items-center py-2 border-b-[1.5px] border-[var(--sf-ink)] text-[10.5px] font-bold uppercase text-[var(--sf-ink)]"
              style={{ letterSpacing: ".05em" }}
            >
              <div className="flex-1">Description</div>
              <div style={{ width: 60, textAlign: "center" }}>Qty</div>
              <div style={{ width: 90, textAlign: "right" }}>Rate</div>
              <div style={{ width: 100, textAlign: "right" }}>Amount</div>
            </div>
            {items.length === 0 ? (
              <div className="py-6 text-center text-[12.5px] text-[var(--sf-ink-3)]">
                No line items yet — set a service price on the job to generate the invoice.
              </div>
            ) : (
              items.map((it, i) => (
                <div
                  key={i}
                  className="flex items-start py-3 border-b border-[var(--sf-border-soft)] text-[12.5px]"
                >
                  <div className="flex-1 min-w-0 pr-3">
                    <div
                      className="text-[13px] font-semibold"
                      style={{ color: it.total < 0 ? "var(--sf-green-dark)" : "var(--sf-ink)" }}
                    >
                      {it.desc}
                    </div>
                    {it.detail && (
                      <div className="text-[11px] text-[var(--sf-ink-3)] mt-0.5">{it.detail}</div>
                    )}
                  </div>
                  <div
                    style={{ width: 60, textAlign: "center", fontVariantNumeric: "tabular-nums" }}
                    className="text-[12.5px] text-[var(--sf-ink-2)] mt-0.5"
                  >
                    {it.qty}
                  </div>
                  <div
                    style={{ width: 90, textAlign: "right", fontVariantNumeric: "tabular-nums" }}
                    className="text-[12.5px] text-[var(--sf-ink-2)] mt-0.5"
                  >
                    {it.rate < 0 ? `-${formatMoneyExact(Math.abs(it.rate))}` : formatMoneyExact(it.rate)}
                  </div>
                  <div
                    style={{
                      width: 100,
                      textAlign: "right",
                      fontVariantNumeric: "tabular-nums",
                      color: it.total < 0 ? "var(--sf-green-dark)" : "var(--sf-ink)",
                    }}
                    className="text-[13px] font-bold mt-0.5"
                  >
                    {it.total < 0 ? `-${formatMoneyExact(Math.abs(it.total))}` : formatMoneyExact(it.total)}
                  </div>
                </div>
              ))
            )}

            {/* Totals */}
            {items.length > 0 && (
              <div className="flex justify-end mt-3">
                <div style={{ width: 280 }}>
                  <TotalsRow label="Subtotal" value={formatMoneyExact(subtotal)} />
                  {tax > 0 && (
                    <TotalsRow label="Sales tax" value={formatMoneyExact(tax)} />
                  )}
                  <div
                    className="flex items-baseline py-3 mt-2"
                    style={{ borderTop: "1.5px solid var(--sf-ink)" }}
                  >
                    <span className="flex-1 text-[13px] font-bold text-[var(--sf-ink)]">Total</span>
                    <span
                      className="text-[20px] font-bold text-[var(--sf-ink)]"
                      style={{ letterSpacing: "-0.015em", fontVariantNumeric: "tabular-nums" }}
                    >
                      {formatMoneyExact(total)}
                    </span>
                  </div>
                  {isPaid && (
                    <TotalsRow
                      label="Amount paid"
                      value={`-${formatMoneyExact(total)}`}
                      bold
                      tone="var(--sf-green-dark)"
                    />
                  )}
                  <div
                    className="flex items-center py-2 mt-1"
                    style={{ borderTop: "1px solid var(--sf-border-soft)" }}
                  >
                    <span
                      className="flex-1 text-[13px] font-bold"
                      style={{ color: isPaid ? "var(--sf-green-dark)" : "var(--sf-ink)" }}
                    >
                      Balance due
                    </span>
                    <span
                      className="text-[20px] font-bold"
                      style={{
                        color: isPaid ? "var(--sf-green-dark)" : "var(--sf-ink)",
                        letterSpacing: "-0.015em",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {formatMoneyExact(isPaid ? 0 : total)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            {(job.notes || job.customer_notes) && (
              <div
                className="mt-5 p-3 rounded-lg"
                style={{
                  background: "var(--sf-panel-alt)",
                  border: "1px solid var(--sf-border-soft)",
                  borderLeft: "3px solid var(--sf-blue)",
                }}
              >
                <div
                  className="text-[10.5px] font-bold uppercase text-[var(--sf-ink-3)] mb-1"
                  style={{ letterSpacing: ".04em" }}
                >
                  Notes
                </div>
                <div className="text-[12px] text-[var(--sf-ink-2)] leading-relaxed whitespace-pre-wrap">
                  {job.notes || job.customer_notes}
                </div>
              </div>
            )}
          </div>
        </SfCard>
      </div>

      {/* Side rail */}
      <div className="flex flex-col gap-4 min-w-0">
        {/* Actions */}
        <SfCard>
          <SfCardHeader title="Actions" />
          <div className="flex flex-col gap-2">
            {!invoice && jobHasPrice && (
              <SfButton
                variant="primary"
                size="md"
                icon={Plus}
                className="w-full justify-center"
                disabled={busy}
                onClick={() => {
                  const dueDate = (() => {
                    // Default Net-14 from the job's scheduled date (or today).
                    const base = job.scheduled_date
                      ? new Date(String(job.scheduled_date).includes("T") ? job.scheduled_date : String(job.scheduled_date).replace(" ", "T"))
                      : new Date()
                    if (isNaN(base)) return null
                    base.setDate(base.getDate() + 14)
                    return `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, "0")}-${String(base.getDate()).padStart(2, "0")}`
                  })()
                  onGenerateInvoice?.({
                    totalAmount: Number(total.toFixed(2)),
                    taxAmount: tax > 0 ? Number(tax.toFixed(2)) : 0,
                    dueDate,
                  })
                }}
              >
                Generate invoice
              </SfButton>
            )}
            {!isPaid && invoice && (
              <SfButton
                variant="primary"
                size="md"
                icon={DollarSign}
                className="w-full justify-center"
                onClick={onMarkPaid}
                disabled={busy}
              >
                Record payment
              </SfButton>
            )}
            <div className="flex gap-2">
              <SfButton
                variant="secondary"
                size="md"
                icon={MailIcon}
                className="flex-1 justify-center"
                disabled={!invoice}
              >
                Resend
              </SfButton>
              <SfButton
                variant="secondary"
                size="md"
                icon={MessageSquare}
                className="flex-1 justify-center"
                disabled={!invoice}
              >
                Remind
              </SfButton>
            </div>
            <div className="flex gap-2">
              <SfButton
                variant="secondary"
                size="md"
                icon={ExternalLink}
                className="flex-1 justify-center"
                onClick={onOpenInvoice}
                disabled={!invoice?.id}
              >
                Open
              </SfButton>
              <SfButton
                variant="secondary"
                size="md"
                icon={Copy}
                className="flex-1 justify-center"
                disabled={!invoice?.id}
                onClick={() => invoice?.id && navigator.clipboard?.writeText(`${window.location.origin}/public/invoice/${invoice.id}`)}
              >
                Copy link
              </SfButton>
            </div>
            <SfButton
              variant="ghost"
              size="md"
              icon={Edit}
              className="w-full"
              style={{ justifyContent: "flex-start" }}
              onClick={onEditInvoice}
              disabled={!invoice?.id}
            >
              Edit invoice
            </SfButton>
          </div>
        </SfCard>

        {/* Payment summary */}
        <SfCard>
          <SfCardHeader title="Payment" subtitle="Status & method" />
          <div
            className="flex items-center gap-3 p-3 rounded-lg"
            style={{
              background: isPaid ? "var(--sf-green-soft)" : "var(--sf-amber-soft)",
              border: `1px solid ${isPaid ? "rgba(22,163,74,.2)" : "rgba(217,119,6,.2)"}`,
            }}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-white"
              style={{ background: isPaid ? "var(--sf-green)" : "var(--sf-amber)" }}
            >
              {isPaid ? <Check size={16} strokeWidth={2.4} /> : <Clock size={15} />}
            </div>
            <div className="flex-1">
              <div
                className="text-[13px] font-bold"
                style={{ color: isPaid ? "var(--sf-green-dark)" : "var(--sf-amber-dark)" }}
              >
                {isPaid ? "Paid in full" : "Awaiting payment"}
              </div>
              <div className="text-[11px] text-[var(--sf-ink-2)] mt-0.5">
                {isPaid && invoice?.updated_at
                  ? `Settled ${new Date(invoice.updated_at).toLocaleDateString()}`
                  : invoice?.due_date
                  ? `Due ${new Date(invoice.due_date).toLocaleDateString()}`
                  : "—"}
              </div>
            </div>
            <div
              className="text-[15px] font-bold text-[var(--sf-ink)]"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {formatMoneyExact(isPaid ? 0 : total)}
            </div>
          </div>

          <div className="flex flex-col gap-2 mt-3 text-[12px]">
            <PaymentLine label="Method" value={job.payment_method ? capitalize(job.payment_method) : "—"} />
            <PaymentLine
              label="Issued"
              value={issuedDate}
              mono
            />
            <PaymentLine
              label="Due"
              value={dueDate}
              mono
            />
            {tax > 0 && (
              <PaymentLine
                label="Tax"
                value={formatMoneyExact(tax)}
                mono
              />
            )}
          </div>
        </SfCard>

        {/* Related */}
        <SfCard>
          <SfCardHeader title="Related" subtitle="Linked records" />
          <div className="flex flex-col gap-2">
            <RelatedTile
              icon={DollarSign}
              code={invoiceCode}
              tone="green"
              subtitle="This invoice"
              onClick={onOpenInvoice}
              disabled={!invoice?.id}
            />
            <RelatedTile
              icon={UserIcon}
              code={`#${String(job.id).slice(-4)}`}
              tone="blue"
              subtitle="This job"
            />
            {customer?.id && (
              <RelatedTile
                avatar={sfInitials(customerName)}
                code={customerName}
                tone="ink"
                subtitle="Customer"
                onClick={() => window.location.assign(`/customer/${customer.id}`)}
              />
            )}
          </div>
        </SfCard>
      </div>
    </div>
  )
}

const InvoiceMeta = ({ label, value, mono, valueClass }) => (
  <div>
    <div
      className="text-[10.5px] font-bold uppercase text-[var(--sf-ink-3)]"
      style={{ letterSpacing: ".04em" }}
    >
      {label}
    </div>
    <div
      className={`text-[12.5px] font-semibold text-[var(--sf-ink)] mt-0.5 ${valueClass || ""}`}
      style={{
        fontVariantNumeric: "tabular-nums",
        fontFamily: mono ? "var(--sf-font-mono)" : undefined,
      }}
    >
      {value}
    </div>
  </div>
)

const TotalsRow = ({ label, value, bold, tone }) => (
  <div className="flex py-1 text-[12.5px]">
    <span className="flex-1" style={{ color: tone || "var(--sf-ink-2)" }}>{label}</span>
    <span
      style={{
        color: tone || "var(--sf-ink)",
        fontWeight: bold ? 700 : 600,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {value}
    </span>
  </div>
)

const PaymentLine = ({ label, value, mono }) => (
  <div className="flex">
    <span className="flex-1 text-[var(--sf-ink-2)]">{label}</span>
    <span
      className="font-semibold text-[var(--sf-ink)]"
      style={{
        fontVariantNumeric: "tabular-nums",
        fontFamily: mono ? "var(--sf-font-mono)" : undefined,
      }}
    >
      {value}
    </span>
  </div>
)

const RELATED_TONES = {
  green: { bg: "var(--sf-green-soft)", fg: "var(--sf-green-dark)" },
  blue:  { bg: "var(--sf-blue-soft)",  fg: "var(--sf-blue-dark)" },
  ink:   { bg: "var(--sf-panel-soft)", fg: "var(--sf-ink)" },
}

const RelatedTile = ({ icon: Icon, avatar, code, subtitle, tone, onClick, disabled }) => {
  const t = RELATED_TONES[tone] || RELATED_TONES.ink
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-2.5 p-2.5 rounded-lg bg-[var(--sf-panel)] border border-[var(--sf-border-soft)] hover:bg-[var(--sf-panel-soft)] transition-colors w-full text-left"
      style={{
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.55 : 1,
        fontFamily: "var(--sf-font-ui)",
      }}
    >
      {Icon ? (
        <div
          className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0"
          style={{ background: t.bg, color: t.fg }}
        >
          <Icon size={14} />
        </div>
      ) : (
        <SfAvatar initials={avatar} color="var(--sf-ink)" size={32} />
      )}
      <div className="min-w-0 flex-1">
        <div
          className="text-[12.5px] font-bold text-[var(--sf-ink)] truncate"
          style={{ fontFamily: Icon ? "var(--sf-font-mono)" : "var(--sf-font-ui)" }}
        >
          {code}
        </div>
        <div className="text-[11px] text-[var(--sf-ink-3)] mt-px">{subtitle}</div>
      </div>
      <ChevronRight size={13} className="text-[var(--sf-ink-3)] flex-shrink-0" />
    </button>
  )
}

const capitalize = (s) =>
  s ? String(s).charAt(0).toUpperCase() + String(s).slice(1).toLowerCase() : "—"

// ── Sub-components ─────────────────────────────────────────

const SOURCE_STYLE = {
  zenbooker:  { dot: "#7C3AED", bg: "var(--sf-purple-soft)", fg: "#7C3AED" },
  leadbridge: { dot: "#0891B2", bg: "var(--sf-teal-soft)",   fg: "#0E7490" },
  lead:       { dot: "#D97706", bg: "var(--sf-amber-soft)",  fg: "var(--sf-amber-dark)" },
  booking:    { dot: "#2563EB", bg: "var(--sf-blue-soft)",   fg: "var(--sf-blue-dark)" },
  import:     { dot: "#5F6775", bg: "var(--sf-panel-soft)",  fg: "var(--sf-ink-2)" },
  manual:     { dot: "#94A3B8", bg: "var(--sf-panel-soft)",  fg: "var(--sf-ink-2)" },
  freeform:   { dot: "#16A34A", bg: "var(--sf-green-soft)",  fg: "var(--sf-green-dark)" },
}

const SourceDisplay = ({ source }) => {
  if (!source) return <span className="text-[var(--sf-ink-3)]">—</span>
  const s = SOURCE_STYLE[source.kind] || SOURCE_STYLE.manual
  return (
    <span className="inline-flex items-center gap-2 flex-wrap">
      <span
        className="inline-flex items-center gap-1.5 px-2 py-[3px] rounded-full"
        style={{
          background: s.bg,
          color: s.fg,
          fontSize: 11.5,
          fontWeight: 600,
          border: `1px solid ${s.dot}25`,
        }}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.dot }} />
        {source.label}
      </span>
      {source.detail && (
        <span
          className="text-[10.5px] text-[var(--sf-ink-3)]"
          style={{ fontFamily: "var(--sf-font-mono)" }}
          title={String(source.detail)}
        >
          {String(source.detail).length > 16
            ? `…${String(source.detail).slice(-12)}`
            : String(source.detail)}
        </span>
      )}
    </span>
  )
}

const DetailItem = ({ label, value }) => (
  <div>
    <div
      className="text-[10.5px] text-[var(--sf-ink-3)] font-semibold uppercase"
      style={{ letterSpacing: ".04em" }}
    >
      {label}
    </div>
    <div className="text-[13px] text-[var(--sf-ink)] mt-1 font-medium">
      {value}
    </div>
  </div>
)

const TimelineStep = ({ icon: Icon, title, when, who, active, done, last }) => (
  <div className="flex gap-3 relative">
    <div className="relative flex-shrink-0">
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center"
        style={{
          background: done ? "var(--sf-green-soft)" : active ? "var(--sf-blue-soft)" : "var(--sf-panel-soft)",
          color: done ? "var(--sf-green-dark)" : active ? "var(--sf-blue-dark)" : "var(--sf-ink-3)",
          border: `1.5px solid ${done ? "var(--sf-green)" : active ? "var(--sf-blue)" : "var(--sf-border-2)"}`,
        }}
      >
        {done ? <Check size={13} strokeWidth={2.4} /> : <Icon size={13} strokeWidth={2} />}
      </div>
      {!last && (
        <div
          className="absolute"
          style={{
            top: 28,
            left: 13,
            bottom: -14,
            width: 2,
            background: done ? "var(--sf-green)" : "var(--sf-border-2)",
          }}
        />
      )}
    </div>
    <div className="flex-1 pb-3.5">
      <div className="flex items-baseline gap-2">
        <div
          className="text-[13px] font-semibold"
          style={{ color: done || active ? "var(--sf-ink)" : "var(--sf-ink-2)" }}
        >
          {title}
        </div>
        {active && (
          <span
            className="text-[9.5px] font-bold tracking-wider"
            style={{
              color: "var(--sf-blue)",
              fontFamily: "var(--sf-font-mono)",
            }}
          >
            LIVE
          </span>
        )}
      </div>
      <div className="text-[11.5px] text-[var(--sf-ink-3)] mt-0.5">
        {when}
        {who ? ` · ${who}` : ""}
      </div>
    </div>
  </div>
)

const Timeline = ({ job, status }) => {
  const isCancelledStatus = (job.status || "").toLowerCase().includes("cancel")
  const isCompleted = ["completed", "complete", "done"].includes((job.status || "").toLowerCase())

  const steps = [
    {
      icon: Plus,
      title: "Booked",
      when: job.created_at ? new Date(job.created_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "—",
      done: true,
    },
    {
      icon: CalendarIcon,
      title: "Scheduled",
      when: job.scheduled_date ? new Date(job.scheduled_date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) : "—",
      done: true,
    },
    {
      icon: UserIcon,
      title: "Team assigned",
      when: assigneesFor(job).length > 0 ? "Assigned" : "Pending",
      done: assigneesFor(job).length > 0,
    },
    {
      icon: Truck,
      title: "En route",
      when: status === "En route" ? "Now" : job.start_time ? formatTimeShared(job.start_time) : "—",
      done: ["In progress", "Completed"].includes(status),
      active: status === "En route",
    },
    {
      icon: CheckCircle2,
      title: isCancelledStatus ? "Cancelled" : "Job complete",
      when: isCompleted && job.end_time
        ? formatTimeShared(job.end_time)
        : isCancelledStatus
        ? "Cancelled"
        : "—",
      done: isCompleted,
      active: status === "In progress",
    },
    {
      icon: DollarSign,
      title: "Invoice & payment",
      when: paymentState(job) === "paid" ? "Paid" : isCompleted ? "Pending" : "—",
      done: paymentState(job) === "paid",
      last: true,
    },
  ]

  return (
    <div>
      {steps.map((s, i) => (
        <TimelineStep key={i} {...s} />
      ))}
    </div>
  )
}

export default JobDetailsV2

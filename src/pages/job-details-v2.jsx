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
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────

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

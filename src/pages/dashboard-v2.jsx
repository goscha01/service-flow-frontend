"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import {
  Plus,
  Calendar as CalendarIcon,
  ArrowRight,
  MapPin,
  Tag as TagIcon,
  MoreHorizontal,
} from "lucide-react"
import { useAuth } from "../context/AuthContext"
import { useLocationScope, filterByLocation } from "../context/LocationContext"
import { jobsAPI, teamAPI, invoicesAPI, leadsAPI } from "../services/api"
import { normalizeAPIResponse } from "../utils/dataHandler"
import MobileHeader from "../components/mobile-header"
import {
  SfCard,
  SfCardHeader,
  SfButton,
  SfKPI,
  SfStatusPill,
  SfTag,
  SfFilterChip,
  SfAvatar,
  SfAvatarStack,
  SfSegmented,
  sfInitials,
  sfTeamColor,
} from "../components/sf-primitives"

/**
 * Service Blue dashboard (Wave 2 of the redesign).
 *
 * Top-down: greeting + 6 KPIs → today's schedule timeline → two-column
 * zone with job queue (left) and team / hot leads (right). Pulls live
 * data from jobsAPI/teamAPI/invoicesAPI/leadsAPI — the same endpoints
 * the legacy dashboard uses — so swapping the route is non-destructive.
 */

// ── Helpers ────────────────────────────────────────────────

const greeting = () => {
  const h = new Date().getHours()
  if (h < 12) return "Good morning"
  if (h < 17) return "Good afternoon"
  return "Good evening"
}

const todayString = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

const formatEyebrowDate = () => {
  const d = new Date()
  return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })
}

const formatMoney = (n) => {
  const v = Number.isFinite(n) ? n : 0
  if (v >= 10000) return `$${Math.round(v / 1000).toLocaleString()}k`
  return `$${Math.round(v).toLocaleString()}`
}

const formatMoneyExact = (n) => `$${(Number.isFinite(n) ? n : 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`

// Parse "HH:MM" or "HH:MM AM/PM" to {h, m, label}
const parseTime = (s) => {
  if (!s) return null
  // Accept "08:30", "08:30 AM", "8:30 PM", "08:30:00"
  const m = String(s).trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM|am|pm)?$/)
  if (!m) return null
  let h = parseInt(m[1], 10)
  const min = parseInt(m[2], 10)
  const mer = m[3]?.toUpperCase()
  if (mer === "PM" && h < 12) h += 12
  if (mer === "AM" && h === 12) h = 0
  if (h < 0 || h > 23 || min < 0 || min > 59) return null
  const label = mer
    ? `${m[1]}:${m[2]} ${mer}`
    : `${h % 12 === 0 ? 12 : h % 12}:${String(min).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`
  return { h, m: min, label, minutes: h * 60 + min }
}

const jobStatusLabel = (raw) => {
  const s = (raw || "").toLowerCase()
  if (s.includes("progress") || s === "in_progress" || s === "in-progress") return "In progress"
  if (s === "en_route" || s === "en route" || s === "enroute") return "En route"
  if (s === "completed" || s === "complete" || s === "done") return "Completed"
  if (s === "cancelled" || s === "canceled") return "Cancelled"
  if (s === "scheduled" || s === "pending" || s === "new") return "Scheduled"
  return "Scheduled"
}

// Return all cleaner assignees on a job as { id, name } pairs. A multi-cleaner
// job (a "team" in business terms) has length >= 2. Empty array = unassigned.
const assigneesFor = (job) => {
  const out = []
  if (Array.isArray(job.assigned_providers) && job.assigned_providers.length) {
    job.assigned_providers.forEach((p) => {
      const id = p?.id || p?.team_member_id || p?.provider_id
      if (!id) return
      const name =
        p?.name ||
        `${p?.first_name || ""} ${p?.last_name || ""}`.trim() ||
        p?.email ||
        ""
      out.push({ id: String(id), name })
    })
  } else if (Array.isArray(job.team_members) && job.team_members.length) {
    job.team_members.forEach((m) => {
      const id = m?.id || m?.team_member_id
      if (!id) return
      const name =
        m?.name ||
        `${m?.first_name || ""} ${m?.last_name || ""}`.trim() ||
        m?.email ||
        ""
      out.push({ id: String(id), name })
    })
  } else if (Array.isArray(job.job_team_assignments) && job.job_team_assignments.length) {
    job.job_team_assignments.forEach((a) => {
      const id = a?.team_member_id || a?.id
      if (!id) return
      out.push({ id: String(id), name: a?.team_member_name || "" })
    })
  } else if (job.team_member_id) {
    out.push({ id: String(job.team_member_id), name: job.team_member_name || "" })
  } else if (job.assigned_to) {
    out.push({ id: String(job.assigned_to), name: job.assigned_to_name || "" })
  }
  return out
}

const isAssigned = (job) => assigneesFor(job).length > 0

// Resolve the team lead for a multi-cleaner job. Looks at a few possible
// fields (the lead-assign UI is still TBD, so the field name may settle
// later). Returns the assignee object or null when no lead is set.
const teamLeadFor = (job) => {
  const assignees = assigneesFor(job)
  if (assignees.length < 2) return null
  const leadId =
    job.lead_cleaner_id ??
    job.team_lead_id ??
    job.lead_team_member_id ??
    job.lead_id ??
    null
  if (leadId == null) return null
  return assignees.find((a) => String(a.id) === String(leadId)) || null
}

// First name helper for team labels like "Tatiana's team".
const firstName = (name) => {
  if (!name) return ""
  return String(name).trim().split(/\s+/)[0]
}

// Read planned vs real duration in minutes. Real comes from
// start_time/end_time if both present and span a sensible delta.
const durationsFor = (job) => {
  const planned = parseInt(job.duration || job.service_duration || job.estimated_duration || 0, 10) || 0
  let real = 0
  const s = job.start_time || job.started_at
  const e = job.end_time || job.completed_at
  if (s && e) {
    const sd = new Date(s)
    const ed = new Date(e)
    if (!isNaN(sd) && !isNaN(ed)) {
      const diff = Math.round((ed - sd) / 60000)
      if (diff > 0 && diff < 24 * 60) real = diff
    }
  }
  const hoursWorked = parseFloat(job.hours_worked)
  if (!real && Number.isFinite(hoursWorked) && hoursWorked > 0) {
    real = Math.round(hoursWorked * 60)
  }
  return { planned, real }
}

const onShiftStatuses = new Set(["en route", "en_route", "in progress", "in_progress", "in-progress", "onsite", "on_site"])

// Tiny string hash for stable per-cleaner colors. Doesn't need to be
// cryptographic — just a number from a string id.
const stableHash = (s) => {
  const str = String(s ?? "")
  let h = 0
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0
  return Math.abs(h)
}

// ── Page ───────────────────────────────────────────────────

const DashboardV2 = () => {
  const { user } = useAuth()
  const { locationId, selectedLocation, setLocationId } = useLocationScope()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [jobsAll, setJobsAll] = useState([])
  const [invoicesAll, setInvoicesAll] = useState([])
  const [teamMembersAll, setTeamMembersAll] = useState([])
  const [leadsAll, setLeadsAll] = useState([])
  const [scheduleView, setScheduleView] = useState("Day")
  const [queueFilter, setQueueFilter] = useState("all")

  const today = todayString()

  // Apply the current location filter to all top-level datasets so
  // every section of the page reacts when the switcher changes.
  const jobs = useMemo(() => filterByLocation(jobsAll, locationId), [jobsAll, locationId])
  const invoices = useMemo(() => filterByLocation(invoicesAll, locationId), [invoicesAll, locationId])
  const teamMembers = useMemo(() => filterByLocation(teamMembersAll, locationId), [teamMembersAll, locationId])
  const leads = useMemo(() => filterByLocation(leadsAll, locationId), [leadsAll, locationId])

  // Fetch dashboard data — last 7 days range to get "new leads this week" etc.
  const fetchData = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const sevenString = `${sevenDaysAgo.getFullYear()}-${String(sevenDaysAgo.getMonth() + 1).padStart(2, "0")}-${String(sevenDaysAgo.getDate()).padStart(2, "0")}`
      const dateRange = `${sevenString} to ${today}`

      const [jobsResp, invoicesResp, teamResp] = await Promise.allSettled([
        jobsAPI.getAll(user.id, "", "", 1, 500, null, dateRange),
        invoicesAPI.getAll(user.id, { page: 1, limit: 200 }),
        teamAPI.getAll(user.id, { page: 1, limit: 100 }),
      ])
      const jobsList = jobsResp.status === "fulfilled" ? normalizeAPIResponse(jobsResp.value, "jobs") : []
      const invoicesList = invoicesResp.status === "fulfilled" ? normalizeAPIResponse(invoicesResp.value, "invoices") : []
      const teamList =
        teamResp.status === "fulfilled" ? (teamResp.value.teamMembers || teamResp.value || []) : []
      setJobsAll(jobsList)
      setInvoicesAll(invoicesList)
      setTeamMembersAll(teamList)

      // Leads are best-effort — leadsAPI.getAll may not be available for all roles
      try {
        const leadsList = await leadsAPI.getAll()
        setLeadsAll(Array.isArray(leadsList) ? leadsList : [])
      } catch {
        setLeadsAll([])
      }
    } finally {
      setLoading(false)
    }
  }, [user?.id, today])

  useEffect(() => { fetchData() }, [fetchData])

  // ── Derived ────────────────────────────────────────────────

  const todayJobs = useMemo(() => {
    return jobs
      .filter((j) => {
        const d = (j.scheduled_date || "").split("T")[0].split(" ")[0]
        return d === today
      })
      .sort((a, b) => {
        const at = parseTime(a.service_time || a.scheduled_time || a.start_time)?.minutes ?? 0
        const bt = parseTime(b.service_time || b.scheduled_time || b.start_time)?.minutes ?? 0
        return at - bt
      })
  }, [jobs, today])

  const kpiData = useMemo(() => {
    const revenueToday = todayJobs.reduce((sum, j) => {
      const inv = invoices.find((i) => i.job_id === j.id || i.jobId === j.id)
      return sum + parseFloat(inv?.total_amount || inv?.amount || j.total || j.service_price || 0)
    }, 0)
    const unassigned = todayJobs.filter((j) => !isAssigned(j)).length
    const onShift = todayJobs.filter((j) => onShiftStatuses.has((j.status || "").toLowerCase())).length
    const newLeadsWk = leads.filter((l) => {
      const c = l.created_at || l.createdAt
      if (!c) return false
      const created = new Date(c)
      const now = new Date()
      return now - created < 7 * 24 * 60 * 60 * 1000
    }).length
    const past7DaysCompleted = jobs.filter(
      (j) => (j.status || "").toLowerCase() === "completed"
    )
    const onTime = past7DaysCompleted.length
      ? Math.round(
          (past7DaysCompleted.filter((j) => !j.late && !j.was_late).length /
            past7DaysCompleted.length) *
            100
        )
      : null

    return {
      jobsToday: todayJobs.length,
      revenueToday,
      unassigned,
      onShift,
      teamSize: teamMembers.length || 0,
      newLeadsWk,
      onTime,
    }
  }, [todayJobs, invoices, jobs, leads, teamMembers])

  const queueJobs = useMemo(() => {
    const live = todayJobs.filter((j) => onShiftStatuses.has((j.status || "").toLowerCase()))
    const unassigned = todayJobs.filter((j) => !isAssigned(j))
    if (queueFilter === "live") return live
    if (queueFilter === "unassigned") return unassigned
    return todayJobs
  }, [todayJobs, queueFilter])

  const teamForDisplay = useMemo(() => teamMembers.slice(0, 5), [teamMembers])

  // Unique cleaners with at least one job today (for the greeting line)
  const cleanersOnDuty = useMemo(() => {
    const ids = new Set()
    todayJobs.forEach((j) => assigneesFor(j).forEach((a) => ids.add(a.id)))
    return ids.size
  }, [todayJobs])

  // Multi-cleaner jobs today (a "team" in business terms)
  const teamJobsToday = useMemo(
    () => todayJobs.filter((j) => assigneesFor(j).length >= 2).length,
    [todayJobs]
  )

  const recentLeads = useMemo(() => {
    return [...leads]
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
      .slice(0, 4)
  }, [leads])

  // ── Render ────────────────────────────────────────────────

  const greetingName = user?.firstName || user?.first_name || user?.email?.split("@")[0] || "there"

  return (
    <div
      className="min-h-screen bg-[var(--sf-bg-page)] flex flex-col"
      style={{ fontFamily: "var(--sf-font-ui)" }}
    >
      <MobileHeader title="Dashboard" />

      {/* Greeting + KPIs */}
      <div className="px-4 sm:px-6 lg:px-8 pt-5 pb-3">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-4">
          <div className="min-w-0 flex-1">
            <div
              className="text-[11.5px] font-semibold text-[var(--sf-ink-3)] uppercase mb-1"
              style={{ letterSpacing: ".04em" }}
            >
              {formatEyebrowDate()}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1
                className="text-[22px] sm:text-[24px] font-bold text-[var(--sf-ink)] m-0"
                style={{ letterSpacing: "-0.02em", lineHeight: 1.15 }}
              >
                {greeting()}, {greetingName}
              </h1>
              {selectedLocation && (
                <ScopedToChip location={selectedLocation} onClear={() => setLocationId("all")} />
              )}
            </div>
            <div className="text-[13px] text-[var(--sf-ink-2)] mt-1">
              {loading ? (
                "Loading today's overview…"
              ) : kpiData.jobsToday === 0 ? (
                <>No jobs scheduled for today. Enjoy the quiet.</>
              ) : (
                <>
                  You have <b className="text-[var(--sf-ink)]">{kpiData.jobsToday} job{kpiData.jobsToday === 1 ? "" : "s"}</b> today
                  {cleanersOnDuty > 0 && (
                    <> across <b className="text-[var(--sf-ink)]">{cleanersOnDuty} {cleanersOnDuty === 1 ? "cleaner" : "cleaners"}</b></>
                  )}
                  {teamJobsToday > 0 && (
                    <> · <b className="text-[var(--sf-ink)]">{teamJobsToday} team{teamJobsToday === 1 ? "" : "s"}</b></>
                  )}
                  .
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <SfButton variant="secondary" size="md" icon={CalendarIcon} onClick={() => navigate("/schedule")}>
              Schedule
            </SfButton>
            <SfButton variant="primary" size="md" icon={Plus} onClick={() => navigate("/createjob")}>
              New job
            </SfButton>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-4">
          <SfKPI
            label="Jobs today"
            value={kpiData.jobsToday}
            accent="var(--sf-blue)"
            sub="scheduled"
          />
          <SfKPI
            label="Revenue today"
            value={formatMoney(kpiData.revenueToday)}
            accent="var(--sf-green)"
            sub="projected"
          />
          <SfKPI
            label="Unassigned"
            value={kpiData.unassigned}
            accent="var(--sf-red)"
            sub={kpiData.unassigned > 0 ? "needs attention" : "all assigned"}
          />
          <SfKPI
            label="On shift"
            value={`${kpiData.onShift} / ${kpiData.teamSize || "—"}`}
            accent="var(--sf-purple)"
            sub={kpiData.teamSize ? `${Math.max(0, kpiData.teamSize - kpiData.onShift)} idle` : "—"}
            mono
          />
          <SfKPI
            label="New leads · wk"
            value={kpiData.newLeadsWk}
            accent="var(--sf-amber)"
            sub="past 7 days"
          />
          <SfKPI
            label="On-time rate"
            value={kpiData.onTime != null ? `${kpiData.onTime}%` : "—"}
            accent="var(--sf-teal)"
            sub="last 7 days"
          />
        </div>
      </div>

      {/* Schedule timeline */}
      <div className="px-4 sm:px-6 lg:px-8 pb-3">
        <ScheduleTimelineCard
          jobs={todayJobs}
          teamMembers={teamMembers}
          scheduleView={scheduleView}
          setScheduleView={setScheduleView}
          onJobClick={(id) => navigate(`/job/${id}`)}
          onOpenSchedule={() => navigate("/schedule")}
        />
      </div>

      {/* Two-column zone */}
      <div className="px-4 sm:px-6 lg:px-8 pb-8 grid grid-cols-1 lg:grid-cols-[62fr_38fr] gap-4">
        <div className="flex flex-col gap-4 min-w-0">
          <JobQueueCard
            jobs={queueJobs}
            totalToday={todayJobs.length}
            filter={queueFilter}
            setFilter={setQueueFilter}
            unassignedCount={todayJobs.filter((j) => !isAssigned(j)).length}
            liveCount={todayJobs.filter((j) => onShiftStatuses.has((j.status || "").toLowerCase())).length}
            onJobClick={(id) => navigate(`/job/${id}`)}
            onSeeAll={() => navigate("/jobs")}
          />
        </div>
        <div className="flex flex-col gap-4 min-w-0">
          <TeamOnShiftCard
            members={teamForDisplay}
            jobs={todayJobs}
            onMember={(id) => navigate(`/team/${id}`)}
            onSeeMap={() => navigate("/staff-locations")}
          />
          <HotLeadsCard leads={recentLeads} onSeePipeline={() => navigate("/leads")} />
        </div>
      </div>
    </div>
  )
}

// ── Schedule timeline ──────────────────────────────────────

const ScheduleTimelineCard = ({ jobs, teamMembers = [], scheduleView, setScheduleView, onJobClick, onOpenSchedule }) => {
  // Build an id → display-name lookup so timeline rows show the actual
  // cleaner instead of a generic "Team member" fallback. Jobs in this
  // codebase carry team_member_id but not the name — the name lives on
  // the team_members rows we already fetched.
  const memberNameById = useMemo(() => {
    const map = new Map()
    teamMembers.forEach((m) => {
      if (m?.id == null) return
      const name =
        m.name ||
        `${m.first_name || ""} ${m.last_name || ""}`.trim() ||
        m.email ||
        ""
      if (name) map.set(String(m.id), name)
    })
    return map
  }, [teamMembers])

  const resolveName = useCallback(
    (id, fallback) => {
      if (!id) return fallback || ""
      const looked = memberNameById.get(String(id))
      return looked || fallback || ""
    },
    [memberNameById]
  )

  // Hour range: derive from jobs, clamp to a sensible default
  const startHr = 7
  const endHr = 19
  const hours = []
  for (let h = startHr; h <= endHr; h++) hours.push(h)

  const pct = (mins) => Math.max(0, Math.min(100, ((mins - startHr * 60) / ((endHr - startHr) * 60)) * 100))

  // Now-line
  const now = new Date()
  const nowMins = now.getHours() * 60 + now.getMinutes()
  const nowPct = pct(nowMins)
  const showNow = now.getHours() >= startHr && now.getHours() <= endHr

  // One row per cleaner. Multi-cleaner jobs (a "team") render on every
  // assigned cleaner's row with a small team badge. Unassigned jobs land
  // in a single "Unassigned" row at the bottom.
  const rows = useMemo(() => {
    const map = new Map() // cleanerId -> { id, name, jobs: [...] }
    jobs.forEach((j) => {
      const assignees = assigneesFor(j)
      const teamSize = assignees.length
      const augmented = { ...j, _teamSize: teamSize }
      if (teamSize === 0) {
        if (!map.has("unassigned")) map.set("unassigned", { id: "unassigned", name: "Unassigned", jobs: [] })
        map.get("unassigned").jobs.push(augmented)
        return
      }
      assignees.forEach((a) => {
        if (!map.has(a.id)) map.set(a.id, { id: a.id, name: a.name, jobs: [] })
        // Prefer the first non-empty name we encounter
        if (!map.get(a.id).name && a.name) map.get(a.id).name = a.name
        map.get(a.id).jobs.push(augmented)
      })
    })
    const arr = Array.from(map.values()).sort((a, b) => {
      if (a.id === "unassigned") return 1
      if (b.id === "unassigned") return -1
      return 0
    })
    return arr.map((row) => {
      const resolved = row.id === "unassigned" ? "Unassigned" : resolveName(row.id, row.name)
      return {
        ...row,
        label: resolved || "Team member",
        color: row.id === "unassigned" ? "var(--sf-red)" : sfTeamColor(stableHash(row.id)),
      }
    })
  }, [jobs, resolveName])

  const cleanerRowCount = rows.filter((r) => r.id !== "unassigned").length
  const teamJobCount = jobs.filter((j) => assigneesFor(j).length >= 2).length

  return (
    <SfCard padding={0}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 sm:px-5 py-3">
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] font-semibold text-[var(--sf-ink)]" style={{ letterSpacing: "-0.005em" }}>
            Today's schedule
          </div>
          <div className="text-[11.5px] text-[var(--sf-ink-3)] mt-0.5">
            {cleanerRowCount} {cleanerRowCount === 1 ? "cleaner" : "cleaners"}
            {teamJobCount > 0 && <> · {teamJobCount} {teamJobCount === 1 ? "team" : "teams"}</>}
            {" · "}{jobs.length} {jobs.length === 1 ? "job" : "jobs"}
          </div>
        </div>
        <SfSegmented options={["Day", "Week", "Month"]} value={scheduleView} onChange={setScheduleView} />
        <SfButton variant="secondary" size="sm" iconRight={ArrowRight} onClick={onOpenSchedule}>
          Open schedule
        </SfButton>
      </div>

      {jobs.length === 0 ? (
        <div className="px-5 pb-8 pt-2 text-center text-[12.5px] text-[var(--sf-ink-3)]">
          No jobs scheduled for today.
        </div>
      ) : (
        <div className="px-4 sm:px-5 pb-4">
          {/* Hour ruler */}
          <div
            className="flex"
            style={{
              marginLeft: 100,
              fontSize: 10.5,
              color: "var(--sf-ink-3)",
              fontWeight: 500,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {hours.map((h, i) => (
              <div
                key={h}
                className="flex-1 pl-1 pb-1"
                style={{ borderLeft: i === 0 ? "none" : "1px dashed var(--sf-border-soft)" }}
              >
                {h > 12 ? `${h - 12}p` : h === 12 ? "12p" : `${h}a`}
              </div>
            ))}
          </div>
          {/* Team rows */}
          <div className="flex flex-col gap-2 mt-1">
            {rows.map((row) => {
              const teamJobsHere = row.jobs.filter((x) => (x._teamSize ?? 1) >= 2).length
              return (
              <div key={row.id} className="flex items-center gap-2.5">
                <div className="w-[120px] flex items-center gap-2 flex-shrink-0">
                  {row.id === "unassigned" ? (
                    <span className="w-2 h-2 rounded-full" style={{ background: row.color }} />
                  ) : (
                    <SfAvatar
                      initials={sfInitials(row.label) || "—"}
                      color={row.color}
                      size={22}
                    />
                  )}
                  <div className="min-w-0">
                    <div className="text-[11.5px] font-semibold text-[var(--sf-ink)] leading-tight truncate">
                      {row.label}
                    </div>
                    <div className="text-[10px] text-[var(--sf-ink-3)] mt-px">
                      {row.jobs.length} job{row.jobs.length === 1 ? "" : "s"}
                      {teamJobsHere > 0 && <> · {teamJobsHere} team</>}
                    </div>
                  </div>
                </div>
                <div
                  className="relative flex-1 h-9 rounded-md"
                  style={{ background: "var(--sf-panel-alt)", border: "1px solid var(--sf-border-soft)" }}
                >
                  {/* hour grid lines */}
                  {hours.slice(1).map((h, j) => (
                    <span
                      key={h}
                      className="absolute"
                      style={{
                        top: 6,
                        bottom: 6,
                        left: `${((j + 1) / (endHr - startHr)) * 100}%`,
                        width: 1,
                        background: "var(--sf-border-soft)",
                      }}
                    />
                  ))}
                  {/* now line */}
                  {showNow && (
                    <span
                      className="absolute z-10"
                      style={{
                        top: -4,
                        bottom: -4,
                        left: `${nowPct}%`,
                        width: 2,
                        background: "var(--sf-red)",
                        borderRadius: 1,
                      }}
                    >
                      <span
                        className="absolute"
                        style={{
                          top: -6,
                          left: -3,
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          background: "var(--sf-red)",
                          boxShadow: "0 0 0 3px var(--sf-red-soft)",
                        }}
                      />
                    </span>
                  )}
                  {/* job blocks */}
                  {row.jobs.map((j) => {
                    const start = parseTime(j.service_time || j.scheduled_time || j.start_time)
                    if (!start) return null
                    const { planned, real } = durationsFor(j)
                    const duration = planned || real || 60
                    const left = pct(start.minutes)
                    const widthPct = Math.max(3, (duration / ((endHr - startHr) * 60)) * 100)
                    const statusRaw = (j.status || "").toLowerCase()
                    const isLive = onShiftStatuses.has(statusRaw)
                    const isCompleted = statusRaw === "completed" || statusRaw === "complete" || statusRaw === "done"
                    const teamSize = j._teamSize ?? 1
                    const isTeamJob = teamSize >= 2
                    const lead = isTeamJob ? teamLeadFor(j) : null
                    const leadName = lead ? resolveName(lead.id, lead.name) : ""
                    const isLead = lead && String(lead.id) === String(row.id)
                    const customer = j.customer_first_name || (j.customer_name || "").split(" ")[0] || "—"

                    // Block label varies by team role on this row.
                    let blockTitle
                    if (isTeamJob && lead && isLead) {
                      blockTitle = `${firstName(leadName) || "Team"}'s team · ${customer}`
                    } else if (isTeamJob && lead && !isLead) {
                      blockTitle = `w/ ${firstName(leadName) || "team"} · ${customer}`
                    } else if (isTeamJob) {
                      blockTitle = `Team · ${customer}`
                    } else {
                      blockTitle = j.service_name ? `${customer} · ${j.service_name}` : customer
                    }

                    // Overtime / undertime — only meaningful for completed jobs
                    // where both planned and real are known.
                    const showDelta = isCompleted && planned > 0 && real > 0 && Math.abs(real - planned) >= 3
                    const overtimeMins = showDelta && real > planned ? real - planned : 0
                    const undertimeMins = showDelta && real < planned ? planned - real : 0
                    // Overtime renders as a sibling extension past the block.
                    const overtimePct = overtimeMins
                      ? Math.max(0.5, (overtimeMins / ((endHr - startHr) * 60)) * 100)
                      : 0
                    // Undertime overlays the right side of the block as an "unused" strip.
                    const undertimePctOfBlock = undertimeMins && duration
                      ? (undertimeMins / duration) * 100
                      : 0

                    return (
                      <span key={`${row.id}-${j.id}`} className="contents">
                        <button
                          onClick={() => onJobClick(j.id)}
                          className="absolute flex flex-col justify-center text-left overflow-hidden cursor-pointer"
                          style={{
                            top: 3,
                            bottom: 3,
                            left: `${left}%`,
                            width: `${widthPct}%`,
                            background: isLive ? row.color : `${row.color}1f`,
                            borderLeft: `3px solid ${row.color}`,
                            color: isLive ? "#fff" : row.color,
                            borderRadius: overtimeMins ? "5px 0 0 5px" : 5,
                            padding: "3px 7px",
                            fontSize: 11,
                            fontWeight: 600,
                            fontFamily: "var(--sf-font-ui)",
                            boxShadow: isLive ? `0 1px 4px ${row.color}40` : "none",
                            border: "none",
                          }}
                          title={`${blockTitle}${planned ? ` · planned ${planned}m` : ""}${real ? ` · real ${real}m` : ""}${overtimeMins ? ` · +${overtimeMins}m overtime` : undertimeMins ? ` · −${undertimeMins}m undertime` : ""}`}
                        >
                          {/* undertime: shade the unused trailing slice of the block */}
                          {undertimeMins > 0 && (
                            <span
                              className="absolute top-0 bottom-0 right-0"
                              style={{
                                width: `${undertimePctOfBlock}%`,
                                background:
                                  "repeating-linear-gradient(45deg, rgba(22,163,74,.18) 0 4px, rgba(22,163,74,.05) 4px 8px)",
                                borderLeft: "1px dashed rgba(22,163,74,.5)",
                                pointerEvents: "none",
                              }}
                            />
                          )}

                          {/* team count badge top-right */}
                          {isTeamJob && (
                            <span
                              className="absolute top-[2px] right-[3px] flex items-center justify-center"
                              style={{
                                minWidth: 14,
                                height: 14,
                                padding: "0 3px",
                                borderRadius: 7,
                                fontSize: 9,
                                fontWeight: 700,
                                fontFamily: "var(--sf-font-mono)",
                                background: isLive ? "rgba(255,255,255,.25)" : `${row.color}33`,
                                color: isLive ? "#fff" : row.color,
                                letterSpacing: "0",
                              }}
                            >
                              +{teamSize - 1}
                            </span>
                          )}

                          <span
                            className="whitespace-nowrap overflow-hidden text-ellipsis"
                            style={{ lineHeight: 1.1 }}
                          >
                            {blockTitle}
                          </span>
                          <span style={{ fontSize: 9.5, opacity: 0.85, fontWeight: 500 }}>
                            {start.label} · {planned || duration}m
                            {overtimeMins > 0 && (
                              <span style={{ marginLeft: 4, color: isLive ? "#fff" : "var(--sf-red-dark)", fontWeight: 700 }}>
                                +{overtimeMins}m
                              </span>
                            )}
                            {undertimeMins > 0 && (
                              <span style={{ marginLeft: 4, color: isLive ? "#fff" : "var(--sf-green-dark)", fontWeight: 700 }}>
                                −{undertimeMins}m
                              </span>
                            )}
                          </span>
                        </button>

                        {/* overtime extension (red striped) past the planned end */}
                        {overtimeMins > 0 && (
                          <span
                            className="absolute"
                            style={{
                              top: 3,
                              bottom: 3,
                              left: `${left + widthPct}%`,
                              width: `${overtimePct}%`,
                              background:
                                "repeating-linear-gradient(45deg, var(--sf-red) 0 6px, var(--sf-red-dark) 6px 12px)",
                              borderRadius: "0 5px 5px 0",
                              pointerEvents: "none",
                            }}
                            title={`+${overtimeMins}m overtime`}
                          />
                        )}
                      </span>
                    )
                  })}
                </div>
              </div>
            )})}
          </div>
        </div>
      )}
    </SfCard>
  )
}

// ── Job queue ──────────────────────────────────────────────

const JobQueueCard = ({ jobs, totalToday, filter, setFilter, unassignedCount, liveCount, onJobClick, onSeeAll }) => (
  <SfCard padding={0}>
    <div className="flex items-center gap-3 px-4 sm:px-5 py-3 border-b border-[var(--sf-border-soft)]">
      <div>
        <div className="text-[13.5px] font-semibold text-[var(--sf-ink)]">Job queue</div>
        <div className="text-[11.5px] text-[var(--sf-ink-3)] mt-0.5">
          {jobs.length} of {totalToday} today
        </div>
      </div>
      <div className="flex-1" />
      <div className="flex items-center gap-1.5 flex-wrap justify-end">
        <SfFilterChip active={filter === "all"} count={totalToday} onClick={() => setFilter("all")}>
          All
        </SfFilterChip>
        <SfFilterChip active={filter === "live"} count={liveCount} onClick={() => setFilter("live")}>
          Live
        </SfFilterChip>
        <SfFilterChip
          active={filter === "unassigned"}
          count={unassignedCount}
          onClick={() => setFilter("unassigned")}
        >
          Unassigned
        </SfFilterChip>
      </div>
    </div>
    <div>
      {jobs.length === 0 ? (
        <div className="px-5 py-10 text-center text-[12.5px] text-[var(--sf-ink-3)]">
          Nothing in this view.
        </div>
      ) : (
        jobs.slice(0, 6).map((j, i) => {
          const t = parseTime(j.service_time || j.scheduled_time || j.start_time)
          const duration = parseInt(j.duration || j.service_duration || j.estimated_duration || 0, 10)
          const customer = j.customer_name || `${j.customer_first_name || ""} ${j.customer_last_name || ""}`.trim() || "—"
          const value = parseFloat(j.total || j.service_price || 0)
          const idDisplay = j.id ? `#${String(j.id).slice(-4)}` : ""
          const status = jobStatusLabel(j.status)
          const teamColor = isAssigned(j) ? sfTeamColor(i) : "var(--sf-red)"
          return (
            <button
              key={j.id || i}
              onClick={() => onJobClick(j.id)}
              className="w-full flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3 text-left bg-transparent hover:bg-[var(--sf-panel-alt)] transition-colors"
              style={{
                borderBottom: i === Math.min(5, jobs.length - 1) ? "none" : "1px solid var(--sf-border-soft)",
                fontFamily: "var(--sf-font-ui)",
                border: "none",
                borderRadius: 0,
                cursor: "pointer",
              }}
            >
              <div className="w-[58px] text-center flex-shrink-0">
                <div
                  className="text-[13.5px] font-bold text-[var(--sf-ink)]"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {t?.label.split(" ")[0] || "—"}
                </div>
                <div className="text-[10px] text-[var(--sf-ink-3)] font-medium mt-px">
                  {duration ? `${duration}m` : ""}
                </div>
              </div>
              <div
                className="w-[3px] h-9 rounded flex-shrink-0"
                style={{ background: teamColor }}
              />
              <SfAvatar initials={sfInitials(customer)} color="var(--sf-ink)" size={32} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[13.5px] font-semibold text-[var(--sf-ink)] truncate">
                    {customer}
                  </span>
                  {j.is_recurring && (
                    <SfTag color="var(--sf-purple)" bg="var(--sf-purple-soft)">
                      ↻ Recurring
                    </SfTag>
                  )}
                </div>
                <div className="text-[11.5px] text-[var(--sf-ink-2)] mt-0.5 flex items-center gap-1.5 truncate">
                  <span className="truncate">{j.service_name || "Service"}</span>
                  {(j.service_address || j.customer_address) && (
                    <>
                      <span className="text-[var(--sf-ink-4)]">·</span>
                      <MapPin size={11} className="text-[var(--sf-ink-3)] flex-shrink-0" />
                      <span className="truncate">
                        {(j.service_address || j.customer_address || "").split(",")[0]}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="text-right flex-shrink-0 hidden sm:block">
                <div
                  className="text-[13.5px] font-semibold text-[var(--sf-ink)]"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {value ? formatMoneyExact(value) : "—"}
                </div>
                <div
                  className="text-[10.5px] text-[var(--sf-ink-3)] mt-px"
                  style={{ fontFamily: "var(--sf-font-mono)" }}
                >
                  {idDisplay}
                </div>
              </div>
              <div className="hidden md:block w-[110px] flex-shrink-0">
                <SfStatusPill status={status} />
              </div>
              <MoreHorizontal size={16} className="text-[var(--sf-ink-3)] flex-shrink-0" />
            </button>
          )
        })
      )}
    </div>
    {jobs.length > 0 && (
      <div className="px-4 py-2.5 border-t border-[var(--sf-border-soft)] text-center">
        <SfButton variant="ghost" size="sm" iconRight={ArrowRight} onClick={onSeeAll}>
          View all jobs
        </SfButton>
      </div>
    )}
  </SfCard>
)

// ── Team on shift ──────────────────────────────────────────

const TeamOnShiftCard = ({ members, jobs, onMember, onSeeMap }) => {
  const statusOf = (memberId) => {
    const m = jobs.find((j) => {
      const k = j.team_member_id || j.assigned_to
      return k === memberId
    })
    const raw = (m?.status || "").toLowerCase()
    if (raw === "en route" || raw === "en_route") return { label: "En route",  c: "var(--sf-blue-dark)",  bg: "var(--sf-blue-soft)" }
    if (raw === "in progress" || raw === "in_progress" || raw === "onsite") return { label: "On site",   c: "var(--sf-green-dark)", bg: "var(--sf-green-soft)" }
    if (m) return { label: "Scheduled", c: "var(--sf-ink-2)", bg: "var(--sf-panel-soft)" }
    return { label: "Off today", c: "var(--sf-ink-3)", bg: "var(--sf-panel-alt)" }
  }

  return (
    <SfCard>
      <SfCardHeader
        title="Team on shift"
        right={
          <SfButton variant="ghost" size="sm" iconRight={ArrowRight} onClick={onSeeMap}>
            Map
          </SfButton>
        }
      />
      {members.length === 0 ? (
        <div className="py-6 text-center text-[12.5px] text-[var(--sf-ink-3)]">
          No team members yet.
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {members.map((m, i) => {
            const name = m.first_name && m.last_name ? `${m.first_name} ${m.last_name}` : m.name || m.email || "Team member"
            const s = statusOf(m.id)
            const color = sfTeamColor(i)
            return (
              <button
                key={m.id || i}
                onClick={() => onMember(m.id)}
                className="flex items-center gap-2.5 text-left w-full bg-transparent border-none cursor-pointer py-1"
              >
                <SfAvatarStack items={[{ initials: sfInitials(name), color }]} size={28} />
                <div className="min-w-0 flex-1">
                  <div className="text-[12.5px] font-semibold text-[var(--sf-ink)] leading-tight truncate">
                    {name}
                  </div>
                  <div className="text-[10.5px] text-[var(--sf-ink-3)] mt-px truncate">
                    {m.role || "Cleaner"}
                  </div>
                </div>
                <span
                  className="text-[10.5px] font-semibold rounded"
                  style={{
                    color: s.c,
                    background: s.bg,
                    padding: "3px 8px",
                    border: `1px solid ${s.c}22`,
                  }}
                >
                  {s.label}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </SfCard>
  )
}

// ── Hot leads ──────────────────────────────────────────────

const HotLeadsCard = ({ leads, onSeePipeline }) => {
  const ageOf = (createdAt) => {
    if (!createdAt) return "—"
    const d = new Date(createdAt)
    const diff = Date.now() - d.getTime()
    const days = Math.floor(diff / (24 * 60 * 60 * 1000))
    if (days === 0) {
      const hrs = Math.floor(diff / (60 * 60 * 1000))
      if (hrs === 0) return "just now"
      return `${hrs}h ago`
    }
    return `${days}d ago`
  }
  return (
    <SfCard>
      <SfCardHeader
        title={
          <span className="inline-flex items-center gap-2">
            Hot leads
            {leads.length > 0 && (
              <span
                className="text-[10.5px] font-bold text-white bg-[var(--sf-red)] px-1.5 py-px rounded"
                style={{ fontFamily: "var(--sf-font-mono)" }}
              >
                {leads.length} NEW
              </span>
            )}
          </span>
        }
        right={
          <SfButton variant="ghost" size="sm" iconRight={ArrowRight} onClick={onSeePipeline}>
            Pipeline
          </SfButton>
        }
      />
      {leads.length === 0 ? (
        <div className="py-6 text-center text-[12.5px] text-[var(--sf-ink-3)]">
          No recent leads.
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {leads.map((l) => {
            const name = l.name || `${l.first_name || ""} ${l.last_name || ""}`.trim() || "Lead"
            const value = parseFloat(l.estimated_value || l.value || 0)
            return (
              <div key={l.id} className="flex items-center gap-2.5">
                <SfAvatar initials={sfInitials(name)} color="var(--sf-blue)" size={28} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[12.5px] font-semibold text-[var(--sf-ink)] leading-tight truncate">
                      {name}
                    </span>
                  </div>
                  <div className="text-[10.5px] text-[var(--sf-ink-3)] mt-px flex items-center gap-1 truncate">
                    <TagIcon size={10} />
                    {l.source || "—"} · {l.stage || "new"} · {ageOf(l.created_at)}
                  </div>
                </div>
                {value > 0 && (
                  <div
                    className="text-[13px] font-semibold text-[var(--sf-ink)] flex-shrink-0"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {formatMoneyExact(value)}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </SfCard>
  )
}

// ── Location filter indicator chip ─────────────────────────

const ScopedToChip = ({ location, onClear }) => (
  <span
    className="inline-flex items-center gap-1.5 px-2 py-[3px] rounded-full text-[11.5px] font-semibold"
    style={{
      background: "var(--sf-blue-soft)",
      color: "var(--sf-blue-dark)",
      border: `1px solid ${location?.color || "var(--sf-blue)"}25`,
    }}
  >
    <span
      className="w-1.5 h-1.5 rounded-full"
      style={{ background: location?.color || "var(--sf-blue)" }}
    />
    {location?.name}
    <button
      type="button"
      onClick={onClear}
      aria-label="Clear location filter"
      className="opacity-70 hover:opacity-100 transition-opacity ml-px"
      style={{
        background: "transparent",
        border: "none",
        padding: 0,
        cursor: "pointer",
        color: "inherit",
        fontFamily: "inherit",
        fontSize: 13,
        fontWeight: 600,
        lineHeight: 1,
      }}
    >
      ×
    </button>
  </span>
)

export default DashboardV2

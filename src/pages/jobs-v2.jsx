"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import {
  Plus,
  Upload,
  Download,
  MapPin,
  Search as SearchIcon,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Clock,
  Users as UsersIcon,
  Tag as TagIcon,
  Calendar as CalendarIcon,
  List,
  LayoutGrid,
  CalendarRange,
} from "lucide-react"
import { useAuth } from "../context/AuthContext"
import { useLocationScope, filterByLocation } from "../context/LocationContext"
import { jobsAPI, teamAPI } from "../services/api"
import { normalizeAPIResponse } from "../utils/dataHandler"
import MobileHeader from "../components/mobile-header"
import {
  SfCard,
  SfButton,
  SfStatusPill,
  SfTag,
  SfFilterChip,
  SfTab,
  SfAvatar,
  SfPageHeader,
  sfInitials,
  sfAssignTeamColors,
} from "../components/sf-primitives"

/**
 * Jobs list — Service Blue redesign (Wave 2.2).
 *
 * Reuses jobsAPI.getAll for data and integrates the LocationContext
 * filter. Layout follows the design pack: tabs by date/status, toolbar
 * with search + filter chips + view toggle, dense table with checkbox,
 * time block, customer cell, address, team cell, value, status pill,
 * row-end overflow, paginated footer.
 */

// ── Helpers ────────────────────────────────────────────────

const todayString = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

const addDays = (dateStr, n) => {
  const [y, m, d] = dateStr.split("-").map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + n)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`
}

const jobDateStr = (j) => {
  const raw = j.scheduled_date || ""
  return String(raw).split("T")[0].split(" ")[0]
}

const parseTime = (s) => {
  if (!s) return null
  const m = String(s).trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM|am|pm)?$/)
  if (!m) return null
  let h = parseInt(m[1], 10)
  const min = parseInt(m[2], 10)
  const mer = m[3]?.toUpperCase()
  if (mer === "PM" && h < 12) h += 12
  if (mer === "AM" && h === 12) h = 0
  if (h < 0 || h > 23 || min < 0 || min > 59) return null
  const display = `${h % 12 === 0 ? 12 : h % 12}:${String(min).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`
  return { h, m: min, label: display, minutes: h * 60 + min }
}

const jobStatusLabel = (raw) => {
  const s = (raw || "").toLowerCase()
  if (s.includes("progress") || s === "in_progress") return "In progress"
  if (s === "en_route" || s === "en route" || s === "enroute") return "En route"
  if (s === "completed" || s === "complete" || s === "done") return "Completed"
  if (s === "cancelled" || s === "canceled") return "Cancelled"
  return "Scheduled"
}

const isAssigned = (job) =>
  Boolean(
    job.team_member_id ||
      job.assigned_to ||
      (Array.isArray(job.assigned_providers) && job.assigned_providers.length > 0) ||
      (Array.isArray(job.team_members) && job.team_members.length > 0)
  )

const assigneeIdsOf = (job) => {
  const ids = []
  if (Array.isArray(job.assigned_providers)) {
    job.assigned_providers.forEach((p) => {
      const id = p?.id || p?.team_member_id || p?.provider_id
      if (id) ids.push(String(id))
    })
  } else if (Array.isArray(job.team_members)) {
    job.team_members.forEach((m) => {
      const id = m?.id || m?.team_member_id
      if (id) ids.push(String(id))
    })
  }
  if (ids.length === 0 && job.team_member_id) ids.push(String(job.team_member_id))
  if (ids.length === 0 && job.assigned_to) ids.push(String(job.assigned_to))
  return ids
}

const formatMoney = (n) => `$${(Number.isFinite(n) ? n : 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`

// ── Date-window helpers for the tabs ───────────────────────

const isInWeek = (dateStr) => {
  // "This week" = today through next 6 days
  if (!dateStr) return false
  const today = todayString()
  const end = addDays(today, 6)
  return dateStr >= today && dateStr <= end
}

// ── Component ──────────────────────────────────────────────

const TABS = [
  { id: "today",       label: "Today" },
  { id: "tomorrow",    label: "Tomorrow" },
  { id: "week",        label: "This week" },
  { id: "inProgress",  label: "In progress" },
  { id: "unassigned",  label: "Unassigned" },
  { id: "all",         label: "All" },
]

const PAGE_SIZE = 50

const JobsV2 = () => {
  const { user } = useAuth()
  const { locationId, selectedLocation, setLocationId } = useLocationScope()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const initialTab = TABS.find((t) => t.id === searchParams.get("tab"))?.id || "today"

  const [tab, setTab] = useState(initialTab)
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [view, setView] = useState("list") // list | cards | cal
  const [sortMode, setSortMode] = useState("time")
  const [page, setPage] = useState(1)

  const [loading, setLoading] = useState(true)
  const [jobsAll, setJobsAll] = useState([])
  const [teamMembers, setTeamMembers] = useState([])

  // Sync tab → URL so refresh keeps state
  useEffect(() => {
    setSearchParams((sp) => {
      const next = new URLSearchParams(sp)
      next.set("tab", tab)
      return next
    }, { replace: true })
  }, [tab, setSearchParams])

  // Debounce the search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 200)
    return () => clearTimeout(t)
  }, [search])

  // Fetch jobs spanning [today − 7 days, today + 30 days] so tabs other
  // than "All" stay client-side cheap. "All" uses the same slice — for
  // a truly unbounded archive, pagination would need to drive the API.
  const fetchJobs = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const today = todayString()
      const start = addDays(today, -7)
      const end = addDays(today, 30)
      const dateRange = `${start} to ${end}`
      const [jobsResp, teamResp] = await Promise.allSettled([
        jobsAPI.getAll(user.id, "", "", 1, 500, null, dateRange, "scheduled_date", "ASC"),
        teamAPI.getAll(user.id, { page: 1, limit: 200 }),
      ])
      const jobsList = jobsResp.status === "fulfilled" ? normalizeAPIResponse(jobsResp.value, "jobs") : []
      const teamList = teamResp.status === "fulfilled" ? (teamResp.value.teamMembers || teamResp.value || []) : []
      setJobsAll(jobsList)
      setTeamMembers(teamList)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => { fetchJobs() }, [fetchJobs])

  // Location filter
  const jobs = useMemo(() => filterByLocation(jobsAll, locationId), [jobsAll, locationId])

  // Tab counts
  const counts = useMemo(() => {
    const today = todayString()
    const tomorrow = addDays(today, 1)
    return {
      today:      jobs.filter((j) => jobDateStr(j) === today).length,
      tomorrow:   jobs.filter((j) => jobDateStr(j) === tomorrow).length,
      week:       jobs.filter((j) => isInWeek(jobDateStr(j))).length,
      inProgress: jobs.filter((j) => {
        const s = (j.status || "").toLowerCase()
        return s === "in progress" || s === "in_progress" || s === "en route" || s === "en_route"
      }).length,
      unassigned: jobs.filter((j) => !isAssigned(j)).length,
      all:        jobs.length,
    }
  }, [jobs])

  // Filter by tab
  const tabFiltered = useMemo(() => {
    const today = todayString()
    const tomorrow = addDays(today, 1)
    switch (tab) {
      case "today":      return jobs.filter((j) => jobDateStr(j) === today)
      case "tomorrow":   return jobs.filter((j) => jobDateStr(j) === tomorrow)
      case "week":       return jobs.filter((j) => isInWeek(jobDateStr(j)))
      case "inProgress": return jobs.filter((j) => {
        const s = (j.status || "").toLowerCase()
        return s === "in progress" || s === "in_progress" || s === "en route" || s === "en_route"
      })
      case "unassigned": return jobs.filter((j) => !isAssigned(j))
      default:           return jobs
    }
  }, [jobs, tab])

  // Apply search
  const searched = useMemo(() => {
    if (!debouncedSearch) return tabFiltered
    const q = debouncedSearch.toLowerCase()
    return tabFiltered.filter((j) => {
      const customer = `${j.customer_first_name || ""} ${j.customer_last_name || ""} ${j.customer_name || ""}`.toLowerCase()
      const addr = (j.service_address || j.customer_address || "").toLowerCase()
      const id = String(j.id || "").toLowerCase()
      return customer.includes(q) || addr.includes(q) || id.includes(q)
    })
  }, [tabFiltered, debouncedSearch])

  // Apply sort
  const sorted = useMemo(() => {
    const out = [...searched]
    out.sort((a, b) => {
      if (sortMode === "value") {
        const av = parseFloat(a.total || a.service_price || 0)
        const bv = parseFloat(b.total || b.service_price || 0)
        return bv - av
      }
      if (sortMode === "customer") {
        const ac = (a.customer_name || "").toLowerCase()
        const bc = (b.customer_name || "").toLowerCase()
        return ac.localeCompare(bc)
      }
      // default: time (scheduled_date then service_time)
      const ad = jobDateStr(a)
      const bd = jobDateStr(b)
      if (ad !== bd) return ad < bd ? -1 : 1
      const at = parseTime(a.service_time || a.start_time)?.minutes ?? 0
      const bt = parseTime(b.service_time || b.start_time)?.minutes ?? 0
      return at - bt
    })
    return out
  }, [searched, sortMode])

  // Pagination
  useEffect(() => { setPage(1) }, [tab, debouncedSearch, sortMode, locationId])
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageStart = (currentPage - 1) * PAGE_SIZE
  const pageRows = sorted.slice(pageStart, pageStart + PAGE_SIZE)

  // Cleaner color + name lookups
  const memberNameById = useMemo(() => {
    const map = new Map()
    teamMembers.forEach((m) => {
      if (m?.id == null) return
      const n =
        m.name ||
        `${m.first_name || ""} ${m.last_name || ""}`.trim() ||
        m.email ||
        ""
      if (n) map.set(String(m.id), n)
    })
    return map
  }, [teamMembers])

  const allAssigneeIds = useMemo(() => {
    const set = new Set()
    jobs.forEach((j) => assigneeIdsOf(j).forEach((id) => set.add(id)))
    return Array.from(set)
  }, [jobs])

  const cleanerColors = useMemo(() => sfAssignTeamColors(allAssigneeIds), [allAssigneeIds])

  // ── Render ────────────────────────────────────────────────

  return (
    <div
      className="min-h-screen bg-[var(--sf-bg-page)] flex flex-col"
      style={{ fontFamily: "var(--sf-font-ui)" }}
    >
      <MobileHeader title="Jobs" />

      <SfPageHeader
        title="Jobs"
        subtitle={
          loading
            ? "Loading…"
            : `${counts.all} job${counts.all === 1 ? "" : "s"} in the window · ${counts.unassigned} unassigned`
        }
        actions={
          <>
            <SfButton variant="secondary" size="md" icon={Upload} className="hidden sm:inline-flex">
              Import
            </SfButton>
            <SfButton variant="secondary" size="md" icon={Download} className="hidden sm:inline-flex">
              Export
            </SfButton>
            <SfButton variant="primary" size="md" icon={Plus} onClick={() => navigate("/createjob")}>
              New job
            </SfButton>
          </>
        }
        tabs={
          <>
            {TABS.map((t) => (
              <SfTab
                key={t.id}
                active={tab === t.id}
                count={counts[t.id]}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </SfTab>
            ))}
          </>
        }
      />

      {/* Optional scope indicator */}
      {selectedLocation && (
        <div className="px-6 lg:px-8 pt-3 flex">
          <span
            className="inline-flex items-center gap-1.5 px-2 py-[3px] rounded-full text-[11.5px] font-semibold"
            style={{
              background: "var(--sf-blue-soft)",
              color: "var(--sf-blue-dark)",
              border: `1px solid ${selectedLocation?.color || "var(--sf-blue)"}25`,
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: selectedLocation?.color || "var(--sf-blue)" }} />
            {selectedLocation.name}
            <button
              type="button"
              onClick={() => setLocationId("all")}
              aria-label="Clear location filter"
              className="opacity-70 hover:opacity-100 ml-px"
              style={{ background: "transparent", border: "none", padding: 0, cursor: "pointer", color: "inherit", fontSize: 13, fontWeight: 600, lineHeight: 1 }}
            >
              ×
            </button>
          </span>
        </div>
      )}

      {/* Toolbar */}
      <div className="px-4 sm:px-6 lg:px-8 pt-3 pb-2 flex items-center gap-2 flex-wrap">
        <div
          className="flex items-center gap-2 rounded-[8px] bg-[var(--sf-panel)] border border-[var(--sf-border-soft)] px-3 py-[6px]"
          style={{ width: 340, maxWidth: "100%" }}
        >
          <SearchIcon size={14} className="text-[var(--sf-ink-3)] flex-shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search jobs by customer, ID, or address…"
            className="flex-1 bg-transparent border-none outline-none text-[12.5px] text-[var(--sf-ink)]"
            style={{ fontFamily: "var(--sf-font-ui)", padding: 0, boxShadow: "none" }}
          />
        </div>
        <SfFilterChip icon={UsersIcon}>Team</SfFilterChip>
        <SfFilterChip icon={TagIcon}>Service</SfFilterChip>
        <SfFilterChip icon={MapPin}>Area</SfFilterChip>
        <SfFilterChip icon={CalendarIcon}>Date</SfFilterChip>
        <div className="flex-1" />
        <span className="text-[11.5px] text-[var(--sf-ink-3)] font-medium hidden md:inline">Sort:</span>
        <SfFilterChip icon={Clock} active={sortMode === "time"} onClick={() => setSortMode("time")}>
          Time
        </SfFilterChip>
        <SfFilterChip active={sortMode === "value"} onClick={() => setSortMode("value")}>
          Value
        </SfFilterChip>
        <SfFilterChip active={sortMode === "customer"} onClick={() => setSortMode("customer")}>
          Customer
        </SfFilterChip>
        <div className="hidden md:flex items-center bg-[var(--sf-panel-soft)] rounded-[7px] p-[2px] ml-1">
          {[
            { id: "list",  Icon: List },
            { id: "cards", Icon: LayoutGrid },
            { id: "cal",   Icon: CalendarRange },
          ].map(({ id, Icon }) => (
            <button
              key={id}
              onClick={() => setView(id)}
              className="px-2 py-[5px] rounded-[5px] flex items-center justify-center transition-colors"
              style={{
                background: view === id ? "var(--sf-panel)" : "transparent",
                color: view === id ? "var(--sf-ink)" : "var(--sf-ink-2)",
                boxShadow: view === id ? "0 1px 2px rgba(0,0,0,.06)" : "none",
                border: "none",
                cursor: "pointer",
              }}
              aria-label={`${id} view`}
            >
              <Icon size={13} />
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="px-4 sm:px-6 lg:px-8 pb-8 flex-1">
        <SfCard padding={0}>
          {/* Head */}
          <div
            className="hidden md:flex items-center gap-2.5 px-4 py-2.5"
            style={{
              background: "var(--sf-panel-alt)",
              borderBottom: "1px solid var(--sf-border-soft)",
              fontSize: 11,
              color: "var(--sf-ink-3)",
              fontWeight: 700,
              letterSpacing: ".05em",
              textTransform: "uppercase",
            }}
          >
            <div style={{ width: 100 }}>Job · Time</div>
            <div className="flex-1 min-w-0">Customer · Service</div>
            <div style={{ width: 200 }}>Address</div>
            <div style={{ width: 140 }}>Team</div>
            <div style={{ width: 80, textAlign: "right" }}>Value</div>
            <div style={{ width: 120 }}>Status</div>
            <div style={{ width: 28 }} />
          </div>

          {/* Rows */}
          {loading ? (
            <div className="py-16 text-center text-[12.5px] text-[var(--sf-ink-3)]">
              Loading jobs…
            </div>
          ) : pageRows.length === 0 ? (
            <div className="py-16 text-center text-[12.5px] text-[var(--sf-ink-3)]">
              {debouncedSearch ? "No jobs match that search." : "No jobs in this view."}
            </div>
          ) : (
            pageRows.map((j, i) => (
              <JobRow
                key={j.id || i}
                job={j}
                isLast={i === pageRows.length - 1}
                cleanerColors={cleanerColors}
                memberNameById={memberNameById}
                onClick={() => navigate(`/job/${j.id}`)}
              />
            ))
          )}

          {/* Footer */}
          <div
            className="flex items-center gap-3 px-4 py-3 flex-wrap"
            style={{
              borderTop: "1px solid var(--sf-border-soft)",
              fontSize: 12,
              color: "var(--sf-ink-2)",
              background: "var(--sf-panel-alt)",
            }}
          >
            <span>
              Showing <b className="text-[var(--sf-ink)]">{pageRows.length}</b> of {sorted.length}
              {sorted.length !== counts.all && counts.all > 0 && (
                <> · <span className="text-[var(--sf-ink-3)]">{counts.all} total</span></>
              )}
            </span>
            <div className="flex-1" />
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11.5px] font-semibold"
                  style={{
                    background: "transparent",
                    color: currentPage === 1 ? "var(--sf-ink-4)" : "var(--sf-ink-2)",
                    border: "none",
                    cursor: currentPage === 1 ? "default" : "pointer",
                  }}
                >
                  <ChevronLeft size={13} /> Prev
                </button>
                <PaginationNumbers total={totalPages} current={currentPage} onChange={setPage} />
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11.5px] font-semibold"
                  style={{
                    background: "transparent",
                    color: currentPage === totalPages ? "var(--sf-ink-4)" : "var(--sf-ink-2)",
                    border: "none",
                    cursor: currentPage === totalPages ? "default" : "pointer",
                  }}
                >
                  Next <ChevronRight size={13} />
                </button>
              </div>
            )}
          </div>
        </SfCard>
      </div>
    </div>
  )
}

// ── Single row ─────────────────────────────────────────────

const JobRow = ({ job, isLast, cleanerColors, memberNameById, onClick }) => {
  const j = job
  const t = parseTime(j.service_time || j.start_time)
  const duration = parseInt(j.duration || j.service_duration || j.estimated_duration || 0, 10)
  const customer =
    j.customer_name ||
    `${j.customer_first_name || ""} ${j.customer_last_name || ""}`.trim() ||
    "—"
  const idDisp = j.id ? `#${String(j.id).slice(-4)}` : ""
  const value = parseFloat(j.total || j.service_price || 0)
  const status = jobStatusLabel(j.status)
  const isRecurring = j.is_recurring === true
  const addr = j.service_address || j.customer_address || ""
  const addrFirstLine = addr.split(",")[0] || ""
  const addrCity = (j.service_city || j.customer_city || addr.split(",")[1] || "").trim()

  const assignees = assigneeIdsOf(j)
  const teamColor = assignees.length ? cleanerColors.get(assignees[0]) || "#94A3B8" : "#DC2626"
  const cleanerName = assignees.length ? memberNameById.get(assignees[0]) : null
  const otherCount = assignees.length > 1 ? assignees.length - 1 : 0

  // Bedrooms / property size from common field shapes
  const beds = j.bedrooms || j.property_bedrooms || j.beds || null

  return (
    <button
      onClick={onClick}
      className="w-full text-left flex items-center gap-2.5 px-4 py-3 hover:bg-[var(--sf-panel-alt)] transition-colors"
      style={{
        borderBottom: isLast ? "none" : "1px solid var(--sf-border-soft)",
        background: "transparent",
        border: "none",
        borderRadius: 0,
        cursor: "pointer",
        fontFamily: "var(--sf-font-ui)",
      }}
    >
      {/* Job · Time */}
      <div style={{ width: 100 }} className="flex-shrink-0">
        <div
          className="text-[10.5px] text-[var(--sf-ink-3)] font-semibold"
          style={{ fontFamily: "var(--sf-font-mono)" }}
        >
          {idDisp}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span
            className="text-[12.5px] font-bold text-[var(--sf-ink)]"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {t?.label.split(" ")[0] || "—"}
          </span>
          <span className="text-[10px] text-[var(--sf-ink-3)]">{duration ? `${duration}m` : ""}</span>
        </div>
      </div>

      {/* Customer · Service */}
      <div className="flex-1 min-w-0 pr-2">
        <div className="flex items-center gap-2 min-w-0">
          <SfAvatar initials={sfInitials(customer)} color="var(--sf-ink)" size={26} />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[12.5px] font-semibold text-[var(--sf-ink)] truncate">
                {customer}
              </span>
              {isRecurring && (
                <SfTag color="var(--sf-purple)" bg="var(--sf-purple-soft)">↻</SfTag>
              )}
            </div>
            <div className="text-[11px] text-[var(--sf-ink-2)] mt-0.5 flex items-center gap-1.5 truncate">
              <span className="truncate">{j.service_name || "Service"}</span>
              {beds && (
                <>
                  <span className="text-[var(--sf-ink-4)]">·</span>
                  <span className="truncate">{beds} bd</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Address */}
      <div
        style={{ width: 200 }}
        className="hidden md:flex items-center gap-1.5 flex-shrink-0 pr-2 text-[11.5px] text-[var(--sf-ink-2)]"
      >
        <MapPin size={11} className="text-[var(--sf-ink-3)] flex-shrink-0" />
        <div className="min-w-0">
          <div className="truncate">{addrFirstLine || "—"}</div>
          {addrCity && <div className="text-[10px] text-[var(--sf-ink-3)] truncate">{addrCity}</div>}
        </div>
      </div>

      {/* Team */}
      <div style={{ width: 140 }} className="hidden md:flex items-center gap-2 flex-shrink-0">
        {assignees.length ? (
          <>
            <span
              className="rounded-sm flex-shrink-0"
              style={{ width: 6, height: 24, background: teamColor, borderRadius: 1.5 }}
            />
            <div className="min-w-0">
              <div className="text-[11.5px] font-semibold text-[var(--sf-ink)] leading-tight truncate">
                {cleanerName || "Team member"}
              </div>
              {otherCount > 0 && (
                <div className="text-[10px] text-[var(--sf-ink-3)] leading-tight mt-px">
                  + {otherCount} more
                </div>
              )}
            </div>
          </>
        ) : (
          <span
            className="inline-flex items-center gap-1 text-[11px] font-semibold rounded-md"
            style={{
              color: "var(--sf-red-dark)",
              background: "var(--sf-red-soft)",
              padding: "3px 8px",
              border: `1px dashed rgba(220,38,38,.35)`,
            }}
          >
            <Plus size={11} strokeWidth={2.4} /> Assign
          </span>
        )}
      </div>

      {/* Value */}
      <div
        style={{ width: 80, textAlign: "right" }}
        className="hidden sm:block flex-shrink-0 text-[13px] font-semibold text-[var(--sf-ink)]"
      >
        <span style={{ fontVariantNumeric: "tabular-nums" }}>
          {value ? formatMoney(value) : "—"}
        </span>
      </div>

      {/* Status */}
      <div style={{ width: 120 }} className="hidden sm:flex flex-shrink-0">
        <SfStatusPill status={status} />
      </div>

      <span className="text-[var(--sf-ink-3)] flex-shrink-0" style={{ width: 28, textAlign: "center" }}>
        <MoreHorizontal size={15} />
      </span>
    </button>
  )
}

// ── Pagination numbers ─────────────────────────────────────

const PaginationNumbers = ({ total, current, onChange }) => {
  // Show: first, current-1, current, current+1, last (with … gaps)
  const pages = []
  const push = (p) => { if (!pages.includes(p)) pages.push(p) }

  push(1)
  if (current - 1 > 2) push("…l")
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) push(p)
  if (current + 1 < total - 1) push("…r")
  if (total > 1) push(total)

  return (
    <span className="inline-flex gap-0.5 mx-0.5">
      {pages.map((p, i) => {
        if (typeof p === "string") {
          return (
            <span key={`${p}-${i}`} className="px-1 text-[var(--sf-ink-3)] text-[11.5px]">…</span>
          )
        }
        const sel = p === current
        return (
          <button
            key={p}
            onClick={() => onChange(p)}
            className="min-w-[24px] px-1.5 py-[3px] rounded-md text-[11.5px] font-semibold"
            style={{
              background: sel ? "var(--sf-blue)" : "transparent",
              color: sel ? "#fff" : "var(--sf-ink-2)",
              border: "none",
              cursor: "pointer",
              fontFamily: "var(--sf-font-ui)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {p}
          </button>
        )
      })}
    </span>
  )
}

export default JobsV2

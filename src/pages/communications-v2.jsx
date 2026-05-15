"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import {
  Inbox as InboxIcon,
  Mail as MailIcon,
  MessageSquare,
  Star,
  Archive,
  RefreshCw,
  Send,
  Search as SearchIcon,
  User as UserIcon,
  Briefcase,
  MoreHorizontal,
  Paperclip,
  Smile,
  Zap,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Check,
} from "lucide-react"
import { useAuth } from "../context/AuthContext"
import { useLocationScope } from "../context/LocationContext"
import { communicationsAPI } from "../services/api"
import { formatTime as formatTimeShared } from "../utils/formatTime"
import MobileHeader from "../components/mobile-header"
import {
  SfCard,
  SfButton,
  SfTag,
  SfAvatar,
  sfInitials,
} from "../components/sf-primitives"

/**
 * Inbox v2 (Wave 4) — Service Blue redesign of /communications.
 *
 * Three panes:
 *   Left  (200px): folders rail (All / Unread / SMS / Email / Reviews
 *                  / Archive) + connected channels.
 *   Mid   (340px): thread list with search + filter-driven rows.
 *   Right (flex):  conversation header + messages + composer.
 *
 * Uses the existing communicationsAPI so no backend changes are
 * required. Reads and writes go through:
 *   - getConversations({ filter, search, channel, archived })
 *   - getProviderAccounts()
 *   - getConversation(id)
 *   - sendMessage(id, { text, channel })
 */

const FOLDERS = [
  { id: "all",     label: "All",     icon: InboxIcon },
  { id: "unread",  label: "Unread",  icon: MessageSquare, urgent: true },
  { id: "sms",     label: "SMS",     icon: MessageSquare, channel: "sms" },
  { id: "email",   label: "Email",   icon: MailIcon,      channel: "email" },
  { id: "reviews", label: "Reviews", icon: Star,          channel: "review" },
  { id: "archive", label: "Archive", icon: Archive,       archived: true },
]

const CommunicationsV2 = () => {
  const { user } = useAuth()
  const { locationId } = useLocationScope()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const initialFolder = FOLDERS.find((f) => f.id === searchParams.get("folder"))?.id || "all"
  const initialConv = searchParams.get("conversation")

  const [folder, setFolder] = useState(initialFolder)
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [conversations, setConversations] = useState([])
  const [accounts, setAccounts] = useState([])
  const [loadingList, setLoadingList] = useState(true)

  const [selectedId, setSelectedId] = useState(initialConv || null)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const [composeText, setComposeText] = useState("")
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef(null)

  // URL sync
  useEffect(() => {
    setSearchParams((sp) => {
      const next = new URLSearchParams(sp)
      next.set("folder", folder)
      if (selectedId) next.set("conversation", String(selectedId))
      else next.delete("conversation")
      return next
    }, { replace: true })
  }, [folder, selectedId, setSearchParams])

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 200)
    return () => clearTimeout(t)
  }, [search])

  // Load conversations + accounts
  const fetchConversations = useCallback(async () => {
    if (!user?.id) return
    setLoadingList(true)
    try {
      const f = FOLDERS.find((x) => x.id === folder)
      const params = {}
      if (folder === "unread") params.filter = "unread"
      if (f?.channel) params.channel = f.channel
      if (f?.archived) params.archived = "true"
      if (debouncedSearch) params.search = debouncedSearch
      if (locationId && locationId !== "all") params.locationId = locationId
      const resp = await communicationsAPI.getConversations(params)
      const list = Array.isArray(resp)
        ? resp
        : Array.isArray(resp?.conversations)
        ? resp.conversations
        : []
      setConversations(list)
      // Auto-select first if nothing currently selected
      if (!selectedId && list.length > 0) {
        setSelectedId(list[0].id)
      }
    } finally {
      setLoadingList(false)
    }
  }, [user?.id, folder, debouncedSearch, locationId, selectedId])

  useEffect(() => { fetchConversations() }, [fetchConversations])

  // Load provider accounts once
  useEffect(() => {
    let cancelled = false
    communicationsAPI.getProviderAccounts()
      .then((resp) => {
        if (cancelled) return
        const list = Array.isArray(resp) ? resp : (resp?.accounts || [])
        setAccounts(Array.isArray(list) ? list : [])
      })
      .catch(() => setAccounts([]))
    return () => { cancelled = true }
  }, [user?.id])

  // Load conversation detail when selected changes
  useEffect(() => {
    if (!selectedId) {
      setDetail(null)
      return
    }
    let cancelled = false
    setDetailLoading(true)
    communicationsAPI.getConversation(selectedId, { limit: 100 })
      .then((data) => {
        if (cancelled) return
        setDetail(data)
        // Mark read locally
        setConversations((prev) =>
          prev.map((c) =>
            String(c.id) === String(selectedId) ? { ...c, unreadCount: 0 } : c
          )
        )
      })
      .catch(() => { if (!cancelled) setDetail(null) })
      .finally(() => { if (!cancelled) setDetailLoading(false) })
    return () => { cancelled = true }
  }, [selectedId])

  // Auto-scroll to bottom when new messages load
  useEffect(() => {
    if (!detail) return
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
    })
  }, [detail])

  const onSend = async () => {
    const text = composeText.trim()
    if (!text || !selectedId || sending) return
    setSending(true)
    try {
      await communicationsAPI.sendMessage(selectedId, { text, channel: detail?.conversation?.channel || "sms" })
      setComposeText("")
      // Refresh detail
      const fresh = await communicationsAPI.getConversation(selectedId, { limit: 100 })
      setDetail(fresh)
      // Bump preview in the list
      setConversations((prev) =>
        prev.map((c) =>
          String(c.id) === String(selectedId)
            ? { ...c, lastPreview: text, lastEventAt: new Date().toISOString() }
            : c
        )
      )
    } catch (e) {
      alert(e?.response?.data?.error || e?.message || "Could not send the message.")
    } finally {
      setSending(false)
    }
  }

  const onKeyDownCompose = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault()
      onSend()
    }
  }

  // Compute folder counts client-side from the current list
  const folderCounts = useMemo(() => {
    const counts = { all: 0, unread: 0, sms: 0, email: 0, reviews: 0, archive: 0 }
    conversations.forEach((c) => {
      counts.all += 1
      if ((c.unreadCount ?? 0) > 0) counts.unread += 1
      const ch = (c.channel || "").toLowerCase()
      if (ch === "sms") counts.sms += 1
      else if (ch === "email") counts.email += 1
      else if (ch === "review") counts.reviews += 1
      if (c.isArchived) counts.archive += 1
    })
    return counts
  }, [conversations])

  const selectedConv = useMemo(
    () => conversations.find((c) => String(c.id) === String(selectedId)) || null,
    [conversations, selectedId]
  )

  return (
    <div
      className="bg-[var(--sf-bg-page)] flex flex-col"
      style={{ minHeight: "100vh", fontFamily: "var(--sf-font-ui)" }}
    >
      <MobileHeader title="Inbox" />

      {/* Page header */}
      <div className="px-4 sm:px-6 lg:px-8 pt-5">
        <div className="flex items-end gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <h1
              className="text-[22px] sm:text-[24px] font-bold text-[var(--sf-ink)] m-0"
              style={{ letterSpacing: "-0.02em" }}
            >
              Inbox
            </h1>
            <div className="text-[13px] text-[var(--sf-ink-2)] mt-1">
              {folderCounts.unread} unread · {accounts.length || 0} channel{accounts.length === 1 ? "" : "s"} connected
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SfButton variant="secondary" size="md" icon={RefreshCw} onClick={fetchConversations}>
              Sync
            </SfButton>
            <SfButton variant="primary" size="md" icon={Send}>
              New message
            </SfButton>
          </div>
        </div>
      </div>

      {/* 3-pane body */}
      <div
        className="px-4 sm:px-6 lg:px-8 pt-3 pb-6 flex gap-3.5"
        style={{ height: "calc(100vh - 110px)", minHeight: 520 }}
      >
        {/* Folders rail */}
        <div className="hidden md:flex flex-col gap-3.5" style={{ width: 200, flexShrink: 0 }}>
          <SfCard padding={"10px 8px"}>
            <SectionLabel>Folders</SectionLabel>
            {FOLDERS.map((f) => {
              const active = folder === f.id
              const Icon = f.icon
              return (
                <button
                  key={f.id}
                  onClick={() => { setFolder(f.id); setSelectedId(null); }}
                  className="flex items-center gap-2.5 w-full text-left rounded-md"
                  style={{
                    padding: "7px 10px",
                    background: active ? "var(--sf-blue-soft)" : "transparent",
                    color: active ? "var(--sf-blue-dark)" : "var(--sf-ink-2)",
                    border: "none",
                    fontSize: 12.5,
                    fontWeight: active ? 600 : 500,
                    cursor: "pointer",
                    fontFamily: "var(--sf-font-ui)",
                  }}
                >
                  <Icon size={14} color={f.urgent ? "var(--sf-red)" : undefined} />
                  <span className="flex-1">{f.label}</span>
                  <span
                    style={{
                      fontSize: 11,
                      color: active ? "var(--sf-blue-dark)" : "var(--sf-ink-3)",
                      fontWeight: 600,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {folderCounts[f.id] || 0}
                  </span>
                </button>
              )
            })}
          </SfCard>

          <SfCard padding={"10px 8px"}>
            <SectionLabel>Channels</SectionLabel>
            {accounts.length === 0 ? (
              <div className="px-2 py-2 text-[11px] text-[var(--sf-ink-3)]">
                No channels connected.
              </div>
            ) : (
              accounts.map((a) => {
                const ch = (a.channel || "").toLowerCase()
                const meta =
                  ch === "email"
                    ? { c: "var(--sf-blue)", icon: MailIcon, sub: "Email" }
                    : ch === "review"
                    ? { c: "var(--sf-amber)", icon: Star, sub: "Reviews" }
                    : { c: "var(--sf-green)", icon: MessageSquare, sub: "SMS / Calls" }
                const Icon = meta.icon
                return (
                  <div key={a.id || a.display_name} className="flex items-center gap-2.5" style={{ padding: "7px 10px" }}>
                    <div
                      className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                      style={{ background: `${meta.c}1a`, color: meta.c }}
                    >
                      <Icon size={12} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div
                        className="text-[11.5px] font-semibold text-[var(--sf-ink)] leading-tight truncate"
                        title={a.display_name || a.external_account_id}
                      >
                        {a.display_name || a.external_account_id}
                      </div>
                      <div className="text-[10px] text-[var(--sf-ink-3)] mt-px">{meta.sub}</div>
                    </div>
                  </div>
                )
              })
            )}
          </SfCard>
        </div>

        {/* Thread list */}
        <SfCard
          padding={0}
          className="hidden sm:flex flex-col"
          style={{ width: 340, flexShrink: 0, minHeight: 0 }}
        >
          <div className="px-3 py-2.5" style={{ borderBottom: "1px solid var(--sf-border-soft)" }}>
            <div
              className="flex items-center gap-2 rounded-md bg-[var(--sf-panel-alt)] border border-[var(--sf-border-soft)] px-2.5 py-[5px]"
            >
              <SearchIcon size={13} className="text-[var(--sf-ink-3)] flex-shrink-0" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search inbox"
                className="flex-1 bg-transparent border-none outline-none text-[12px] text-[var(--sf-ink)]"
                style={{ padding: 0, boxShadow: "none", fontFamily: "var(--sf-font-ui)" }}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
            {loadingList ? (
              <div className="py-10 text-center text-[12px] text-[var(--sf-ink-3)]">Loading…</div>
            ) : conversations.length === 0 ? (
              <div className="py-10 px-4 text-center text-[12px] text-[var(--sf-ink-3)]">
                {debouncedSearch ? "No conversations match." : "No conversations in this folder."}
              </div>
            ) : (
              conversations.map((c) => (
                <ThreadRow
                  key={c.id}
                  conv={c}
                  active={String(c.id) === String(selectedId)}
                  onSelect={() => setSelectedId(c.id)}
                />
              ))
            )}
          </div>
        </SfCard>

        {/* Conversation */}
        <SfCard padding={0} className="flex-1 flex flex-col min-w-0" style={{ minHeight: 0 }}>
          {!selectedId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
                style={{ background: "var(--sf-panel-soft)", color: "var(--sf-ink-3)" }}
              >
                <InboxIcon size={22} />
              </div>
              <div className="text-[14px] font-semibold text-[var(--sf-ink)]">No conversation selected</div>
              <div className="text-[12.5px] text-[var(--sf-ink-2)] mt-1 max-w-sm">
                Pick a thread from the list to see the full message history.
              </div>
            </div>
          ) : (
            <ConversationPane
              conv={selectedConv}
              detail={detail}
              loading={detailLoading}
              composeText={composeText}
              setComposeText={setComposeText}
              onSend={onSend}
              onKeyDownCompose={onKeyDownCompose}
              sending={sending}
              messagesEndRef={messagesEndRef}
              onViewCustomer={() => {
                const cid = detail?.lead?.id || selectedConv?.customerId
                if (cid) navigate(`/customer/${cid}`)
              }}
              onCreateJob={() => {
                const cid = detail?.lead?.id || selectedConv?.customerId
                navigate(cid ? `/createjob?customerId=${cid}` : "/createjob")
              }}
            />
          )}
        </SfCard>
      </div>
    </div>
  )
}

// ── Section label inside a card ────────────────────────────

const SectionLabel = ({ children }) => (
  <div
    className="text-[10.5px] font-bold uppercase text-[var(--sf-ink-3)]"
    style={{ padding: "4px 10px 8px", letterSpacing: ".06em" }}
  >
    {children}
  </div>
)

// ── Thread row ─────────────────────────────────────────────

const ThreadRow = ({ conv, active, onSelect }) => {
  const channel = (conv.channel || "").toLowerCase()
  const channelMeta =
    channel === "email"
      ? { c: "var(--sf-purple)" }
      : channel === "review"
      ? { c: "var(--sf-amber)" }
      : { c: "var(--sf-green)" }
  const ChannelIcon =
    channel === "email" ? MailIcon : channel === "review" ? Star : MessageSquare
  const unread = (conv.unreadCount ?? 0) > 0
  const name = conv.displayName || conv.fallbackIdentifier || "Unknown"
  const isLead = conv.leadId && !conv.customerId

  return (
    <button
      onClick={onSelect}
      className="w-full text-left flex items-start gap-2.5 px-3 py-3 hover:bg-[var(--sf-panel-alt)] transition-colors"
      style={{
        background: active ? "var(--sf-blue-soft)" : "transparent",
        borderLeft: active ? "3px solid var(--sf-blue)" : "3px solid transparent",
        borderBottom: "1px solid var(--sf-border-soft)",
        border: "none",
        borderRadius: 0,
        cursor: "pointer",
        fontFamily: "var(--sf-font-ui)",
      }}
    >
      <div className="relative flex-shrink-0">
        <SfAvatar
          initials={sfInitials(name)}
          color="var(--sf-ink)"
          size={32}
        />
        {unread && (
          <span
            style={{
              position: "absolute",
              top: -2,
              right: -2,
              width: 9,
              height: 9,
              borderRadius: 5,
              background: "var(--sf-blue)",
              border: "1.5px solid var(--sf-panel)",
            }}
          />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span
            className="text-[12.5px] truncate flex-1"
            style={{ fontWeight: unread ? 700 : 600, color: "var(--sf-ink)" }}
          >
            {name}
          </span>
          <span
            className="text-[10.5px] text-[var(--sf-ink-3)] flex-shrink-0"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {formatRelative(conv.lastEventAt)}
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <ChannelIcon size={11} style={{ color: channelMeta.c, opacity: 0.8 }} />
          {conv.company && (
            <span
              className="text-[10.5px] text-[var(--sf-ink-3)] font-medium truncate"
              style={{ maxWidth: 120 }}
            >
              {conv.company}
            </span>
          )}
        </div>
        {conv.lastPreview && (
          <div
            className="text-[11.5px] text-[var(--sf-ink-3)] mt-1 leading-snug"
            style={{
              display: "-webkit-box",
              WebkitLineClamp: 1,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {conv.lastPreview}
          </div>
        )}
        {isLead && (
          <div className="mt-1.5">
            <SfTag color="#0E7490" bg="var(--sf-teal-soft)">Lead</SfTag>
          </div>
        )}
      </div>
    </button>
  )
}

// ── Conversation pane ──────────────────────────────────────

const ConversationPane = ({
  conv,
  detail,
  loading,
  composeText,
  setComposeText,
  onSend,
  onKeyDownCompose,
  sending,
  messagesEndRef,
  onViewCustomer,
  onCreateJob,
}) => {
  const events = useMemo(() => detail?.events || [], [detail])
  const lead = detail?.lead || null
  const channel = (detail?.conversation?.channel || conv?.channel || "sms").toLowerCase()
  const name = detail?.conversation?.displayName || conv?.displayName || conv?.fallbackIdentifier || "Unknown"
  const subline =
    channel === "email"
      ? detail?.conversation?.participantEmail || conv?.participantEmail || conv?.fallbackIdentifier
      : detail?.conversation?.participantPhone || conv?.fallbackIdentifier

  // Group events by calendar day for date dividers
  const grouped = useMemo(() => groupByDay(events), [events])

  return (
    <>
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 sm:px-5 py-3 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--sf-border-soft)" }}
      >
        <SfAvatar initials={sfInitials(name)} color="var(--sf-ink)" size={36} />
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-bold text-[var(--sf-ink)] truncate">{name}</div>
          <div className="flex items-center gap-1.5 text-[11.5px] text-[var(--sf-ink-3)] mt-0.5">
            {channel === "email" ? <MailIcon size={11} /> : <MessageSquare size={11} />}
            <span className="truncate">{subline || "—"}</span>
            {lead?.lifetime_value != null && (
              <>
                <span className="text-[var(--sf-ink-4)]">·</span>
                <span>${Math.round(lead.lifetime_value || 0).toLocaleString()} LTV</span>
              </>
            )}
            {lead?.entityType === "lead" && (
              <>
                <span className="text-[var(--sf-ink-4)]">·</span>
                <span>Lead</span>
              </>
            )}
          </div>
        </div>
        <SfButton variant="secondary" size="sm" icon={UserIcon} onClick={onViewCustomer} disabled={!lead?.id && !conv?.customerId}>
          View customer
        </SfButton>
        <SfButton variant="secondary" size="sm" icon={Briefcase} onClick={onCreateJob}>
          Create job
        </SfButton>
        <button
          aria-label="More actions"
          className="w-7 h-7 inline-flex items-center justify-center rounded-md text-[var(--sf-ink-3)] hover:bg-[var(--sf-panel-soft)] transition-colors"
          style={{ background: "transparent", border: "none", cursor: "pointer" }}
        >
          <MoreHorizontal size={15} />
        </button>
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 flex flex-col gap-3"
        style={{ background: "var(--sf-panel-alt)", minHeight: 0 }}
      >
        {loading ? (
          <div className="text-center text-[12px] text-[var(--sf-ink-3)] py-8">Loading messages…</div>
        ) : events.length === 0 ? (
          <div className="text-center text-[12px] text-[var(--sf-ink-3)] py-8">No messages yet.</div>
        ) : (
          grouped.map((group, gi) => (
            <div key={gi} className="flex flex-col gap-3">
              <div className="flex justify-center">
                <span
                  className="text-[10.5px] font-bold uppercase rounded-full"
                  style={{
                    padding: "3px 10px",
                    background: "var(--sf-panel)",
                    border: "1px solid var(--sf-border-soft)",
                    color: "var(--sf-ink-3)",
                    letterSpacing: ".04em",
                  }}
                >
                  {group.label}
                </span>
              </div>
              {group.events.map((e) => (
                <EventBubble key={e.id} event={e} name={name} />
              ))}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Composer */}
      <div
        className="px-4 sm:px-5 pt-3 pb-3 flex-shrink-0"
        style={{ borderTop: "1px solid var(--sf-border-soft)", background: "var(--sf-panel)" }}
      >
        <div
          className="flex items-start gap-2.5 rounded-[10px] px-3 py-2.5"
          style={{ border: "1.5px solid var(--sf-border-2)", background: "var(--sf-panel)" }}
        >
          <textarea
            value={composeText}
            onChange={(e) => setComposeText(e.target.value)}
            onKeyDown={onKeyDownCompose}
            placeholder={`Reply to ${name.split(" ")[0] || "this thread"}…`}
            rows={2}
            className="flex-1 bg-transparent outline-none border-none text-[13px] text-[var(--sf-ink)]"
            style={{
              resize: "none",
              padding: 0,
              boxShadow: "none",
              fontFamily: "var(--sf-font-ui)",
            }}
          />
        </div>
        <div className="flex items-center gap-2 mt-2">
          <SfButton variant="ghost" size="sm" icon={Paperclip} disabled>
            Attach
          </SfButton>
          <SfButton variant="ghost" size="sm" icon={Smile} disabled>
            Emoji
          </SfButton>
          <SfButton variant="ghost" size="sm" icon={Zap} disabled>
            Templates
          </SfButton>
          <div className="flex-1" />
          <div className="text-[11px] text-[var(--sf-ink-3)]">
            Sending as {channel === "email" ? "Email" : channel === "review" ? "Review reply" : "SMS"}
          </div>
          <SfButton
            variant="primary"
            size="md"
            icon={Send}
            kbd="⌘↵"
            onClick={onSend}
            disabled={sending || !composeText.trim()}
          >
            {sending ? "Sending…" : "Send"}
          </SfButton>
        </div>
      </div>
    </>
  )
}

// ── Event bubble (message or call) ─────────────────────────

const EventBubble = ({ event, name }) => {
  const isCall = event.type === "call_in" || event.type === "call_out" || event.channel === "call"
  const isOut = event.type === "message_out" || event.type === "call_out"

  if (isCall) {
    const incoming = event.type === "call_in"
    const missed = (event.text || "").toLowerCase().includes("missed")
    const Icon = missed ? PhoneMissed : incoming ? PhoneIncoming : PhoneOutgoing
    const dur = event.callDurationSeconds
      ? `${Math.floor(event.callDurationSeconds / 60)}m ${event.callDurationSeconds % 60}s`
      : null
    return (
      <div className="flex justify-center">
        <div
          className="inline-flex items-center gap-2 rounded-full"
          style={{
            padding: "5px 12px",
            background: missed ? "var(--sf-red-soft)" : "var(--sf-panel)",
            color: missed ? "var(--sf-red-dark)" : "var(--sf-ink-2)",
            border: `1px solid ${missed ? "rgba(220,38,38,.25)" : "var(--sf-border-soft)"}`,
            fontSize: 11.5,
            fontWeight: 600,
            fontFamily: "var(--sf-font-ui)",
          }}
        >
          <Icon size={12} />
          <span>{event.text || (incoming ? "Incoming call" : "Outgoing call")}</span>
          {dur && (
            <span
              className="text-[10.5px] text-[var(--sf-ink-3)]"
              style={{ fontFamily: "var(--sf-font-mono)" }}
            >
              {dur}
            </span>
          )}
          <span
            className="text-[10.5px] text-[var(--sf-ink-3)]"
            style={{ fontFamily: "var(--sf-font-mono)" }}
          >
            {formatTimeShared(event.timestamp)}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div
      className="flex gap-2.5"
      style={{
        flexDirection: isOut ? "row-reverse" : "row",
        alignItems: "flex-end",
      }}
    >
      <SfAvatar
        initials={isOut ? "Me" : sfInitials(name)}
        color={isOut ? "var(--sf-blue)" : "var(--sf-ink)"}
        size={28}
      />
      <div
        style={{
          maxWidth: "70%",
          display: "flex",
          flexDirection: "column",
          alignItems: isOut ? "flex-end" : "flex-start",
        }}
      >
        <div
          style={{
            padding: "9px 13px",
            background: isOut ? "var(--sf-blue)" : "var(--sf-panel)",
            color: isOut ? "#fff" : "var(--sf-ink)",
            borderRadius: isOut ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
            fontSize: 13,
            lineHeight: 1.5,
            boxShadow: isOut ? "0 1px 2px rgba(37,99,235,.25)" : "var(--sf-shadow)",
            border: isOut ? "none" : "1px solid var(--sf-border-soft)",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {event.text || ""}
          {event.mediaUrl && (
            <div className="mt-2">
              {event.mediaType === "image" || (event.mediaMimetype || "").startsWith("image/") ? (
                <img
                  src={event.mediaUrl}
                  alt={event.mediaFilename || "attachment"}
                  className="rounded-md max-w-full"
                  style={{ maxHeight: 240 }}
                />
              ) : (
                <a
                  href={event.mediaUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[12px] underline"
                  style={{ color: isOut ? "#cfe1ff" : "var(--sf-blue-dark)" }}
                >
                  {event.mediaFilename || "attachment"}
                </a>
              )}
            </div>
          )}
        </div>
        <div
          className="text-[10.5px] text-[var(--sf-ink-3)] mt-1 inline-flex items-center gap-1"
          style={{ paddingLeft: isOut ? 0 : 4, paddingRight: isOut ? 4 : 0 }}
        >
          <span>{formatTimeShared(event.timestamp)}</span>
          {isOut && <Check size={10} />}
        </div>
      </div>
    </div>
  )
}

// ── Helpers ────────────────────────────────────────────────

const groupByDay = (events) => {
  if (!events.length) return []
  const groups = []
  let currentKey = null
  let currentLabel = null
  let currentList = []
  events.forEach((e) => {
    const d = new Date(e.timestamp)
    if (isNaN(d)) return
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    if (key !== currentKey) {
      if (currentList.length) groups.push({ label: currentLabel, events: currentList })
      currentKey = key
      currentLabel = labelForDay(d)
      currentList = []
    }
    currentList.push(e)
  })
  if (currentList.length) groups.push({ label: currentLabel, events: currentList })
  return groups
}

const labelForDay = (d) => {
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const sameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  if (sameDay(d, today)) return "Today"
  if (sameDay(d, yesterday)) return "Yesterday"
  return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })
}

const formatRelative = (iso) => {
  if (!iso) return "—"
  const d = new Date(iso)
  if (isNaN(d)) return "—"
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "now"
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d`
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export default CommunicationsV2

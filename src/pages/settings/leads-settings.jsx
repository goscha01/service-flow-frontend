"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { leadAutomationAPI, leadSourcesAPI, leadSourceMappingsAPI, openPhoneAPI, leadbridgeAPI, sourceIssuesAPI, participantsAPI } from "../../services/api"
import { ChevronLeft, Zap, Loader2, Plus, X, Pencil, Check, Trash2, Wand2, GripVertical, ChevronDown, Search, RefreshCw, AlertTriangle, Users, HelpCircle, Database, Link2 } from "lucide-react"

const EVENT_DEFS = [
  { event: 'lead_received', label: 'Lead Received', desc: 'New lead arrives from Thumbtack or Yelp' },
  { event: 'first_reply_sent', label: 'First Reply Sent', desc: 'You send the first message to the lead' },
  { event: 'conversation_ongoing', label: 'Conversation Ongoing', desc: 'Further messages exchanged before proposal' },
  { event: 'proposal_sent', label: 'Proposal / Quote Sent', desc: 'Quote or proposal sent to the customer' },
  { event: 'job_created', label: 'Job Created', desc: 'Job created for this lead — converts to customer' },
]

const PROV_SHORT = { openphone: 'OP', leadbridge: 'LB', customer: 'CR' }
const PROV_COLOR = { openphone: 'bg-blue-50 text-blue-600 border-blue-100', leadbridge: 'bg-amber-50 text-amber-600 border-amber-100', customer: 'bg-violet-50 text-violet-600 border-violet-100' }

const LeadsSettings = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(null)
  const [rules, setRules] = useState([])
  const [stages, setStages] = useState([])
  const [backfilling, setBackfilling] = useState(false)
  const [backfillResult, setBackfillResult] = useState(null)

  const [sources, setSources] = useState([])
  const [sourcesLoading, setSourcesLoading] = useState(true)
  const [newSourceName, setNewSourceName] = useState('')
  const [addingSource, setAddingSource] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [savingSource, setSavingSource] = useState(null)

  const [mappings, setMappings] = useState([])
  const [unmapped, setUnmapped] = useState([])
  const [mappingsLoading, setMappingsLoading] = useState(true)
  const [savingMapping, setSavingMapping] = useState(null)
  const [suggesting, setSuggesting] = useState(false)
  const [openDropdown, setOpenDropdown] = useState(null) // source name with open dropdown

  // Drag
  const [dragIdx, setDragIdx] = useState(null)
  const [dragOverIdx, setDragOverIdx] = useState(null)

  // Sync (pulls fresh company data from OpenPhone + LeadBridge)
  const [syncing, setSyncing] = useState(false)
  const [syncProgress, setSyncProgress] = useState(null)
  const [syncResult, setSyncResult] = useState(null)

  // Source issues (post-sync manual resolution)
  const [issues, setIssues] = useState(null)
  const [issuesLoading, setIssuesLoading] = useState(false)
  const [mergingPair, setMergingPair] = useState(null) // "srcId-targetId"

  // Participant backfill + reconcile (PR4)
  const [pBackfillBusy, setPBackfillBusy] = useState(false)
  const [pBackfillResult, setPBackfillResult] = useState(null)
  const [reconcileBusy, setReconcileBusy] = useState(false)
  const [reconcileResult, setReconcileResult] = useState(null)

  useEffect(() => { loadRules(); loadSources(); loadMappings(); loadIssues() }, [])

  const loadIssues = async () => {
    setIssuesLoading(true)
    try { setIssues(await sourceIssuesAPI.list()) }
    catch (e) { console.error('Failed to load issues:', e) }
    finally { setIssuesLoading(false) }
  }

  const handleMergeCustomers = async (sourceId, targetId) => {
    if (!window.confirm(`Merge customer #${sourceId} INTO #${targetId}?\n\nThis moves all jobs/invoices/etc from the source record, then deletes the source. Cannot be undone.`)) return
    const key = `${sourceId}-${targetId}`
    setMergingPair(key)
    try {
      await sourceIssuesAPI.mergeCustomers(sourceId, targetId)
      await loadIssues()
    } catch (e) { alert('Merge failed: ' + (e.response?.data?.error || e.message)) }
    finally { setMergingPair(null) }
  }

  // PR4 — Participant backfill + reconcile handlers
  const handleBackfillDryRun = async () => {
    setPBackfillBusy(true); setPBackfillResult(null)
    try { setPBackfillResult({ ...(await participantsAPI.backfillDryRun()) }) }
    catch (e) { setPBackfillResult({ error: e.response?.data?.error || e.message }) }
    finally { setPBackfillBusy(false) }
  }
  const handleBackfillApply = async () => {
    if (!window.confirm('Apply participant mapping backfill? This creates mapping rows for all existing OpenPhone conversations, reusing legacy CRM links where present. Non-destructive.')) return
    setPBackfillBusy(true); setPBackfillResult({ progress: { phase: 'starting' } })
    try {
      // Kick off async job — returns 202 immediately
      await participantsAPI.backfillApply()
      // Poll progress every 2s until done
      let lastProgress = null
      for (let attempt = 0; attempt < 150; attempt++) { // up to 5 min
        await new Promise(r => setTimeout(r, 2000))
        const p = await participantsAPI.backfillProgress()
        lastProgress = p
        setPBackfillResult({ progress: p })
        if (p.status === 'done' || p.status === 'error' || p.status === 'idle') break
      }
      if (lastProgress?.status === 'error') {
        setPBackfillResult({ error: lastProgress.error || 'Backfill failed' })
      } else if (lastProgress?.summary) {
        setPBackfillResult({ summary: lastProgress.summary })
      }
      await loadIssues()
    } catch (e) {
      setPBackfillResult({ error: e.response?.data?.error || e.message })
    } finally {
      setPBackfillBusy(false)
    }
  }
  const handleReconcile = async () => {
    setReconcileBusy(true); setReconcileResult(null)
    try {
      setReconcileResult({ ...(await participantsAPI.reconcile()) })
      await loadIssues()
    } catch (e) { setReconcileResult({ error: e.response?.data?.error || e.message }) }
    finally { setReconcileBusy(false) }
  }

  const loadRules = async () => {
    setLoading(true)
    try {
      const data = await leadAutomationAPI.getRules()
      setRules(data.rules || []); setStages(data.stages || [])
      if (!(data.rules || []).length) {
        await leadAutomationAPI.seedDefaults()
        const r = await leadAutomationAPI.getRules()
        setRules(r.rules || []); setStages(r.stages || [])
      }
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }
  const loadSources = async () => {
    setSourcesLoading(true)
    try {
      const data = await leadSourcesAPI.list()
      let list = data.sources || []
      if (!list.length) { list = (await leadSourcesAPI.seed()).sources || [] }
      setSources(list)
    } catch (e) { console.error(e) } finally { setSourcesLoading(false) }
  }
  const loadMappings = async () => {
    setMappingsLoading(true)
    try {
      const data = await leadSourceMappingsAPI.list()
      setMappings(data.mappings || []); setUnmapped(data.unmapped || [])
    } catch (e) { console.error(e) } finally { setMappingsLoading(false) }
  }
  const reload = () => Promise.all([loadSources(), loadMappings()])

  // All raw values (mapped + unmapped), keyed for quick lookup
  const allRawValues = useMemo(() => {
    const list = []
    for (const u of unmapped) list.push({ ...u, mapped: false })
    for (const m of mappings) list.push({ raw_value: m.raw_value, provider: m.provider, count: null, mapped: true, mappingId: m.id, source_name: m.source_name })
    return list
  }, [unmapped, mappings])

  // Available (unmapped) values for dropdown — exclude already mapped ones
  const availableForDropdown = useMemo(() => {
    return allRawValues.filter(v => !v.mapped)
  }, [allRawValues])

  // Group mappings by source
  const sourceRows = useMemo(() => {
    const map = {}
    for (const s of sources) map[s.name] = { ...s, mappedValues: [] }
    for (const m of mappings) {
      if (map[m.source_name]) map[m.source_name].mappedValues.push(m)
    }
    return Object.values(map)
  }, [sources, mappings])

  // Source actions
  const handleAddSource = async () => {
    if (!newSourceName.trim()) return
    setSavingSource('new')
    try { await leadSourcesAPI.create(newSourceName.trim()); setNewSourceName(''); setAddingSource(false); await reload() }
    catch (e) { alert('Failed: ' + (e.response?.data?.error || e.message)) }
    finally { setSavingSource(null) }
  }
  const handleRenameSource = async (id) => {
    if (!editName.trim()) return
    setSavingSource(id)
    try { await leadSourcesAPI.update(id, { name: editName.trim() }); setEditingId(null); setEditName(''); await reload() }
    catch (e) { alert('Failed: ' + (e.response?.data?.error || e.message)) }
    finally { setSavingSource(null) }
  }
  const handleDeleteSource = async (id, name) => {
    if (!window.confirm(`Delete "${name}"?`)) return
    setSavingSource(id)
    try { await leadSourcesAPI.remove(id); await reload() }
    catch (e) { alert('Failed: ' + (e.response?.data?.error || e.message)) }
    finally { setSavingSource(null) }
  }

  // Mapping actions
  const handleAddMapping = async (sourceName, raw_value, provider) => {
    const key = `${provider}:${raw_value}`
    setSavingMapping(key)
    try { await leadSourceMappingsAPI.save({ raw_value, source_name: sourceName, provider }); await loadMappings() }
    catch (e) { alert('Failed: ' + (e.response?.data?.error || e.message)) }
    finally { setSavingMapping(null) }
  }
  const handleDeleteMapping = async (id) => {
    setSavingMapping(id)
    try { await leadSourceMappingsAPI.remove(id); await loadMappings() }
    catch (e) { alert('Failed: ' + (e.response?.data?.error || e.message)) }
    finally { setSavingMapping(null) }
  }
  const handleAutoSuggest = async () => {
    setSuggesting(true)
    try {
      const data = await leadSourceMappingsAPI.autoSuggest()
      const toSave = (data.suggestions || []).map(s => ({ raw_value: s.raw_value, source_name: s.source_name, provider: s.provider }))
      if (toSave.length) { await leadSourceMappingsAPI.saveBulk(toSave); await loadMappings() }
    } catch (e) { console.error(e) }
    finally { setSuggesting(false) }
  }

  // Drag reorder
  const handleDragStart = (e, idx) => { setDragIdx(idx); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', idx) }
  const handleDragOver = (e, idx) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverIdx(idx) }
  const handleDrop = async (e, dropIdx) => {
    e.preventDefault(); setDragOverIdx(null)
    if (dragIdx === null || dragIdx === dropIdx) { setDragIdx(null); return }
    const ids = sourceRows.map(s => s.id).filter(Boolean)
    const moved = ids.splice(dragIdx, 1)[0]
    if (!moved) { setDragIdx(null); return }
    ids.splice(dropIdx, 0, moved); setDragIdx(null)
    try { const r = await leadSourcesAPI.reorder(ids); setSources(r.sources || []) }
    catch (e) { await loadSources() }
  }
  const handleDragEnd = () => { setDragIdx(null); setDragOverIdx(null) }

  // Automation
  const handleStageChange = async (eventType, stageId) => {
    if (!stageId) return; setSaving(eventType)
    try {
      for (const ch of ['thumbtack', 'yelp']) await leadAutomationAPI.saveRule({ channel: ch, eventType, targetStageId: parseInt(stageId), enabled: true, autoConvertToCustomer: eventType === 'job_created' })
      setRules((await leadAutomationAPI.getRules()).rules || [])
    } catch (e) { alert('Failed: ' + (e.response?.data?.error || e.message)) }
    finally { setSaving(null) }
  }
  const getRuleForEvent = (et) => rules.find(r => r.eventType === et && r.channel === 'thumbtack') || rules.find(r => r.eventType === et)

  // Sync all sources (OpenPhone + LeadBridge) — pulls fresh company data
  const handleSyncAll = async () => {
    setSyncing(true); setSyncResult(null); setSyncProgress({ op: 'starting', lb: 'starting' })
    try {
      // Kick off both syncs in parallel
      const [opStart, lbStart] = await Promise.allSettled([
        openPhoneAPI.sync().catch(e => ({ error: e?.response?.data?.error || e.message })),
        leadbridgeAPI.sync(null).catch(e => ({ error: e?.response?.data?.error || e.message })),
      ])

      // Poll both sync progresses until both are done
      const poll = async () => {
        const [opP, lbP] = await Promise.all([
          openPhoneAPI.getSyncProgress().catch(() => ({ status: 'idle' })),
          leadbridgeAPI.getSyncProgress().catch(() => ({ status: 'idle' })),
        ])
        setSyncProgress({
          op: opP.status, opSynced: opP.synced, opTotal: opP.total,
          lb: lbP.status, lbSynced: lbP.synced, lbTotal: lbP.total,
        })
        return opP.status !== 'running' && lbP.status !== 'running'
      }

      // Poll every 2 seconds for up to 5 minutes
      const maxAttempts = 150
      for (let i = 0; i < maxAttempts; i++) {
        await new Promise(r => setTimeout(r, 2000))
        if (await poll()) break
      }

      setSyncResult({
        ok: true,
        message: 'Sync complete. Refresh to see updated sources.'
      })
      // Reload mappings + issues (unmapped list + duplicates/missing will update)
      await Promise.all([loadMappings(), loadIssues()])
    } catch (e) {
      setSyncResult({ error: e?.response?.data?.error || e.message })
    } finally {
      setSyncing(false)
    }
  }

  const isLoading = sourcesLoading || mappingsLoading
  const unmappedCount = unmapped.length

  return (
    <div className="min-h-screen bg-[var(--sf-bg-page)]">
      <div>
        <div className="bg-white border-b border-[var(--sf-border-light)] px-6 py-4 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/settings')} className="p-1.5 rounded-lg hover:bg-[var(--sf-bg-hover)] text-[var(--sf-text-muted)]"><ChevronLeft size={20} /></button>
            <div className="flex items-center gap-2">
              <Zap size={20} className="text-[var(--sf-blue-500)]" />
              <h1 className="text-lg font-bold text-[var(--sf-text-primary)]">Leads Settings</h1>
            </div>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">

          {/* ── LEAD SOURCES WITH INLINE MAPPING ── */}
          <section>
            <div className="mb-4 flex items-end justify-between gap-3 flex-wrap">
              <div>
                <h2 className="text-lg font-semibold text-[var(--sf-text-primary)]">Lead Sources</h2>
                <p className="text-sm text-[var(--sf-text-muted)] mt-0.5">
                  Map incoming values from OpenPhone and LeadBridge to your sources.
                  {unmappedCount > 0 && <span className="text-amber-600 font-medium"> {unmappedCount} unmapped</span>}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={handleSyncAll} disabled={syncing}
                  className="px-3 py-1.5 text-xs border border-[var(--sf-border-light)] rounded-lg hover:bg-[var(--sf-bg-hover)] text-[var(--sf-text-secondary)] disabled:opacity-50 flex items-center gap-1.5"
                  title="Pull fresh source data from OpenPhone + LeadBridge">
                  {syncing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                  {syncing ? 'Syncing...' : 'Sync All Sources'}
                </button>
                {unmappedCount > 0 && (
                  <button onClick={handleAutoSuggest} disabled={suggesting}
                    className="px-3 py-1.5 text-xs border border-[var(--sf-border-light)] rounded-lg hover:bg-[var(--sf-bg-hover)] text-[var(--sf-text-secondary)] disabled:opacity-50 flex items-center gap-1.5">
                    {suggesting ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                    Auto-map
                  </button>
                )}
              </div>
            </div>

            {/* Sync progress / result */}
            {(syncing || syncResult) && (
              <div className={`rounded-lg p-3 mb-3 text-xs ${syncResult?.error ? 'bg-red-50 text-red-600' : syncing ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'}`}>
                {syncing ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 font-medium"><Loader2 size={12} className="animate-spin" /> Syncing sources...</div>
                    {syncProgress && (
                      <div className="grid grid-cols-2 gap-3 mt-1.5">
                        <div>OpenPhone: {syncProgress.opSynced ?? 0}/{syncProgress.opTotal ?? '...'} ({syncProgress.op || 'starting'})</div>
                        <div>LeadBridge: {syncProgress.lbSynced ?? 0}/{syncProgress.lbTotal ?? '...'} ({syncProgress.lb || 'starting'})</div>
                      </div>
                    )}
                  </div>
                ) : syncResult?.error ? (
                  `Error: ${syncResult.error}`
                ) : (
                  syncResult?.message
                )}
              </div>
            )}

            {isLoading ? (
              <div className="bg-white rounded-xl border border-[var(--sf-border-light)] flex items-center justify-center py-12">
                <Loader2 size={24} className="animate-spin text-[var(--sf-text-muted)]" />
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-[var(--sf-border-light)]">
                <div className="divide-y divide-[var(--sf-border-light)]">
                  {sourceRows.map((s, idx) => (
                    <SourceRow key={s.name} s={s} idx={idx}
                      editingId={editingId} editName={editName} setEditName={setEditName} setEditingId={setEditingId}
                      savingSource={savingSource} savingMapping={savingMapping}
                      handleRenameSource={handleRenameSource} handleDeleteSource={handleDeleteSource}
                      handleAddMapping={handleAddMapping} handleDeleteMapping={handleDeleteMapping}
                      reloadMappings={loadMappings}
                      availableForDropdown={availableForDropdown}
                      openDropdown={openDropdown} setOpenDropdown={setOpenDropdown}
                      dragIdx={dragIdx} dragOverIdx={dragOverIdx}
                      handleDragStart={handleDragStart} handleDragOver={handleDragOver}
                      handleDrop={handleDrop} handleDragEnd={handleDragEnd}
                    />
                  ))}
                </div>

                {/* Add source */}
                <div className="border-t border-[var(--sf-border-light)] px-5 py-3">
                  {addingSource ? (
                    <div className="flex items-center gap-2">
                      <input autoFocus value={newSourceName} onChange={e => setNewSourceName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleAddSource(); if (e.key === 'Escape') { setAddingSource(false); setNewSourceName('') } }}
                        placeholder="Source name..." className="flex-1 text-sm border border-[var(--sf-border-light)] rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[var(--sf-blue-500)]" />
                      <button onClick={handleAddSource} disabled={savingSource === 'new' || !newSourceName.trim()}
                        className="px-3 py-1.5 text-sm bg-[var(--sf-blue-500)] text-white rounded-lg hover:bg-[var(--sf-blue-600)] disabled:opacity-50 flex items-center gap-1.5">
                        {savingSource === 'new' ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} Add
                      </button>
                      <button onClick={() => { setAddingSource(false); setNewSourceName('') }}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-[var(--sf-text-muted)]"><X size={14} /></button>
                    </div>
                  ) : (
                    <button onClick={() => setAddingSource(true)}
                      className="flex items-center gap-1.5 text-sm text-[var(--sf-blue-500)] hover:text-[var(--sf-blue-600)] font-medium">
                      <Plus size={14} /> Add Source
                    </button>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* ── PARTICIPANT HEALTH (PR4) ── */}
          <section>
            <div className="mb-4 flex items-center gap-2">
              <Link2 size={18} className="text-[var(--sf-blue-500)]" />
              <div>
                <h2 className="text-lg font-semibold text-[var(--sf-text-primary)]">Participant Identity</h2>
                <p className="text-sm text-[var(--sf-text-muted)] mt-0.5">
                  Sigcore participant mapping — the long-term identity root for every conversation.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-[var(--sf-border-light)] p-5 space-y-4">
              {/* Metrics */}
              {issues?.participantMetrics ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-green-50 border border-green-100 rounded-lg p-3">
                    <div className="text-[10px] uppercase tracking-wider text-green-700 font-semibold">Mapped</div>
                    <div className="text-lg font-bold text-green-800 mt-0.5">{issues.participantMetrics.mapped || 0}</div>
                  </div>
                  <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                    <div className="text-[10px] uppercase tracking-wider text-amber-700 font-semibold">Ambiguous</div>
                    <div className="text-lg font-bold text-amber-800 mt-0.5">{issues.participantMetrics.ambiguous || 0}</div>
                  </div>
                  <div className="bg-gray-50 border border-gray-100 rounded-lg p-3">
                    <div className="text-[10px] uppercase tracking-wider text-gray-600 font-semibold">Unmapped</div>
                    <div className="text-lg font-bold text-gray-800 mt-0.5">{issues.participantMetrics.unmapped || 0}</div>
                  </div>
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                    <div className="text-[10px] uppercase tracking-wider text-blue-700 font-semibold">Pending</div>
                    <div className="text-lg font-bold text-blue-800 mt-0.5">{issues.participantMetrics.participant_pending_total || 0}</div>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-[var(--sf-text-muted)]">No metrics yet — run backfill to populate.</div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-2 items-center pt-2 border-t border-[var(--sf-border-light)]">
                <button onClick={handleBackfillDryRun} disabled={pBackfillBusy}
                  className="px-3 py-1.5 text-xs border border-[var(--sf-border-light)] rounded-lg hover:bg-[var(--sf-bg-hover)] text-[var(--sf-text-secondary)] disabled:opacity-50 flex items-center gap-1.5"
                  title="Preview mapping counts without writing">
                  {pBackfillBusy ? <Loader2 size={12} className="animate-spin" /> : <Database size={12} />}
                  Backfill (Dry-run)
                </button>
                <button onClick={handleBackfillApply} disabled={pBackfillBusy}
                  className="px-3 py-1.5 text-xs bg-[var(--sf-blue-500)] text-white rounded-lg hover:bg-[var(--sf-blue-600)] disabled:opacity-50 flex items-center gap-1.5"
                  title="Create mapping rows for all existing conversations (non-destructive — reuses legacy CRM links)">
                  {pBackfillBusy ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                  Backfill & Apply
                </button>
                <button onClick={handleReconcile} disabled={reconcileBusy}
                  className="px-3 py-1.5 text-xs border border-[var(--sf-border-light)] rounded-lg hover:bg-[var(--sf-bg-hover)] text-[var(--sf-text-secondary)] disabled:opacity-50 flex items-center gap-1.5"
                  title="Attach pending conversations to existing mappings by phone">
                  {reconcileBusy ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                  Reconcile Pending
                </button>
                <span className="text-[10px] text-[var(--sf-text-muted)] ml-auto">
                  Run Backfill first after deploying PR4, then Reconcile after new Sigcore syncs.
                </span>
              </div>

              {/* Backfill progress (while running) */}
              {pBackfillResult?.progress && pBackfillBusy && (
                <div className="rounded-lg p-3 text-xs bg-blue-50 text-blue-800 flex items-center gap-2">
                  <Loader2 size={12} className="animate-spin" />
                  <span>Backfill running — phase: <strong>{pBackfillResult.progress.phase || 'starting'}</strong>{pBackfillResult.progress.total ? ` (${pBackfillResult.progress.linked || 0}/${pBackfillResult.progress.total})` : ''}</span>
                </div>
              )}

              {/* Backfill result */}
              {pBackfillResult && !pBackfillBusy && (
                <div className={`rounded-lg p-3 text-xs ${pBackfillResult.error ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-800'}`}>
                  {pBackfillResult.error ? (
                    `Error: ${pBackfillResult.error}`
                  ) : pBackfillResult.summary ? (
                    <div className="space-y-1">
                      <div className="font-semibold">{pBackfillResult.dryRun ? 'Dry-run preview:' : 'Backfill complete:'}</div>
                      <div className="grid grid-cols-3 gap-2 mt-1">
                        <div>Scanned: {pBackfillResult.summary.scanned}</div>
                        <div>Mapped: {pBackfillResult.summary.mapped}</div>
                        <div>Ambiguous: {pBackfillResult.summary.ambiguous}</div>
                        <div>Unmapped: {pBackfillResult.summary.unmapped}</div>
                        <div>Pending: {pBackfillResult.summary.pending}</div>
                        <div>Reused existing: {pBackfillResult.summary.reused}</div>
                      </div>
                      {pBackfillResult.summary.errors > 0 && (
                        <div className="text-red-600 mt-1">Errors: {pBackfillResult.summary.errors}</div>
                      )}
                    </div>
                  ) : null}
                </div>
              )}

              {/* Reconcile result */}
              {reconcileResult && !reconcileBusy && (
                <div className={`rounded-lg p-3 text-xs ${reconcileResult.error ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
                  {reconcileResult.error ? `Error: ${reconcileResult.error}` : `Attached ${reconcileResult.attached} of ${reconcileResult.pending} pending conversations.`}
                </div>
              )}

              {/* Additional details */}
              {issues?.participantMetrics && (
                <div className="text-[11px] text-[var(--sf-text-muted)] pt-2 border-t border-[var(--sf-border-light)]">
                  {(issues.participantMetrics.participant_id_missing_total || 0) > 0 && (
                    <div>• {issues.participantMetrics.participant_id_missing_total} mappings use <strong>participantKey</strong> only (waiting for Sigcore to assign participantId)</div>
                  )}
                  {(issues.participantMetrics.participant_phone_missing_total || 0) > 0 && (
                    <div>• {issues.participantMetrics.participant_phone_missing_total} conversations have no phone AND no participant identity</div>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* ── ISSUES / MANUAL RESOLUTION ── */}
          {(issues?.duplicateCustomerCount > 0 || issues?.namedContactsMissingCompany?.count > 0 || issues?.unknownContacts?.count > 0 || issues?.unresolvedCustomerSources?.length > 0) && (
            <section>
              <div className="mb-4 flex items-center gap-2">
                <AlertTriangle size={18} className="text-amber-500" />
                <div>
                  <h2 className="text-lg font-semibold text-[var(--sf-text-primary)]">Issues to Resolve</h2>
                  <p className="text-sm text-[var(--sf-text-muted)] mt-0.5">Post-sync issues that need manual attention.</p>
                </div>
              </div>

              <div className="space-y-3">
                {/* Duplicate customers */}
                {issues.duplicateCustomerCount > 0 && (
                  <div className="bg-white rounded-xl border border-[var(--sf-border-light)] overflow-hidden">
                    <div className="px-5 py-3 border-b border-[var(--sf-border-light)] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users size={14} className="text-[var(--sf-text-muted)]" />
                        <h3 className="text-sm font-semibold text-[var(--sf-text-primary)]">Duplicate Customers ({issues.duplicateCustomerCount})</h3>
                      </div>
                      <span className="text-[10px] text-[var(--sf-text-muted)]">Keep record with jobs, merge or delete empty duplicates</span>
                    </div>
                    <div className="divide-y divide-[var(--sf-border-light)] max-h-[400px] overflow-y-auto">
                      {issues.duplicateCustomers.map(group => (
                        <div key={group.name} className="px-5 py-3">
                          <div className="text-xs font-semibold text-[var(--sf-text-primary)] mb-2">{group.name}</div>
                          <div className="space-y-1.5">
                            {group.records.map(r => {
                              const targets = group.records.filter(o => o.id !== r.id)
                              return (
                                <div key={r.id} className="flex items-center gap-2 text-xs bg-[var(--sf-bg-page)] rounded-lg px-3 py-2">
                                  <a href={`/customer/${r.id}`} target="_blank" rel="noreferrer"
                                    className="font-mono text-[var(--sf-blue-500)] hover:underline flex-shrink-0">#{r.id}</a>
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${r.job_count > 0 ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                                    {r.job_count} {r.job_count === 1 ? 'job' : 'jobs'}
                                  </span>
                                  <span className="text-[var(--sf-text-secondary)] truncate">
                                    {r.phone || 'no phone'} {r.address ? `• ${r.address}` : ''}
                                  </span>
                                  <div className="flex-1" />
                                  {targets.length > 0 && (
                                    <select
                                      onChange={e => {
                                        const t = parseInt(e.target.value)
                                        if (t) handleMergeCustomers(r.id, t)
                                        e.target.value = ''
                                      }}
                                      disabled={!!mergingPair}
                                      className="text-[10px] border border-[var(--sf-border-light)] rounded px-1.5 py-0.5 bg-white"
                                      defaultValue="">
                                      <option value="">Merge into...</option>
                                      {targets.map(t => (
                                        <option key={t.id} value={t.id}>#{t.id} ({t.job_count} jobs)</option>
                                      ))}
                                    </select>
                                  )}
                                  {mergingPair?.startsWith(`${r.id}-`) && <Loader2 size={11} className="animate-spin" />}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Named contacts missing company (ACTIONABLE) */}
                {issues.namedContactsMissingCompany?.count > 0 && (
                  <div className="bg-white rounded-xl border border-amber-200 p-5">
                    <div className="flex items-start gap-2">
                      <AlertTriangle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold text-[var(--sf-text-primary)]">
                          {issues.namedContactsMissingCompany.count} Named Contacts Missing Company
                        </h3>
                        <p className="text-xs text-[var(--sf-text-muted)] mt-0.5">
                          These OpenPhone contacts have a <strong>name</strong> but no <strong>Company</strong> tag. Open each in OpenPhone and add a company to fix the source.
                        </p>
                        <details className="mt-2">
                          <summary className="text-xs text-[var(--sf-blue-500)] cursor-pointer hover:text-[var(--sf-blue-600)]">
                            View list ({issues.namedContactsMissingCompany.sample.length} shown)
                          </summary>
                          <div className="mt-2 max-h-64 overflow-y-auto space-y-0.5 text-xs text-[var(--sf-text-muted)]">
                            {issues.namedContactsMissingCompany.sample.map(c => (
                              <div key={c.id} className="font-mono py-0.5">
                                <span className="text-[var(--sf-text-primary)]">{c.participant_name}</span>
                                <span className="ml-2">{c.participant_phone}</span>
                              </div>
                            ))}
                          </div>
                        </details>
                      </div>
                    </div>
                  </div>
                )}

                {/* Unknown contacts (INFO ONLY) */}
                {issues.unknownContacts?.count > 0 && (
                  <div className="bg-white rounded-xl border border-[var(--sf-border-light)] p-5">
                    <div className="flex items-start gap-2">
                      <HelpCircle size={14} className="text-[var(--sf-text-muted)] flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold text-[var(--sf-text-muted)]">
                          {issues.unknownContacts.count} Unknown Numbers (not in OpenPhone contacts)
                        </h3>
                        <p className="text-xs text-[var(--sf-text-muted)] mt-0.5">
                          SMS/call conversations from numbers that were never saved as contacts in OpenPhone. No name, no company — usually spam, wrong numbers, or one-off inquiries. Nothing to fix unless you want to save them as contacts in OpenPhone.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Unresolved customer.source values */}
                {issues.unresolvedCustomerSources?.length > 0 && (
                  <div className="bg-white rounded-xl border border-[var(--sf-border-light)] p-5">
                    <div className="flex items-start gap-2">
                      <AlertTriangle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold text-[var(--sf-text-primary)]">
                          Unresolved Customer Sources ({issues.unresolvedCustomerSources.length})
                        </h3>
                        <p className="text-xs text-[var(--sf-text-muted)] mt-0.5">
                          These raw source values are on customer records but aren't mapped yet. Scroll to the Lead Sources section above — they appear as <span className="font-semibold text-violet-600">CR</span> badges.
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {issues.unresolvedCustomerSources.map(u => (
                            <span key={u.raw_value} className="text-[10px] px-2 py-0.5 rounded-full bg-violet-50 text-violet-600 border border-violet-100">
                              {u.raw_value} ({u.count})
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ── LEAD STAGE AUTOMATION ── */}
          <section>
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-[var(--sf-text-primary)]">Lead Stage Automation</h2>
              <p className="text-sm text-[var(--sf-text-muted)] mt-0.5">Configure how leads from Thumbtack and Yelp automatically progress through your pipeline stages.</p>
            </div>
            <div className="bg-white rounded-xl border border-[var(--sf-border-light)] overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center py-12"><Loader2 size={24} className="animate-spin text-[var(--sf-text-muted)]" /></div>
              ) : (
                <div className="divide-y divide-[var(--sf-border-light)]">
                  {EVENT_DEFS.map((evt, i) => {
                    const rule = getRuleForEvent(evt.event); const isSaving = saving === evt.event
                    return (
                      <div key={evt.event} className="flex items-center justify-between px-5 py-4">
                        <div className="flex-1 min-w-0 pr-4">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-[var(--sf-blue-50)] text-[var(--sf-blue-500)] text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                            <span className="text-sm font-medium text-[var(--sf-text-primary)]">{evt.label}</span>
                          </div>
                          <p className="text-xs text-[var(--sf-text-muted)] mt-0.5 ml-8">{evt.desc}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {isSaving && <Loader2 size={14} className="animate-spin text-[var(--sf-text-muted)]" />}
                          <span className="text-xs text-[var(--sf-text-muted)]">→</span>
                          <select value={rule?.targetStageId || ''} onChange={e => handleStageChange(evt.event, e.target.value)}
                            className="text-sm border border-[var(--sf-border-light)] rounded-lg px-3 py-1.5 bg-white min-w-[160px] focus:outline-none focus:ring-1 focus:ring-[var(--sf-blue-500)]">
                            <option value="">Select stage...</option>
                            {stages.map(s => (<option key={s.id} value={s.id}>{s.name}</option>))}
                          </select>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
            <p className="text-xs text-[var(--sf-text-muted)] mt-3">Leads only advance forward — they never move backwards automatically. Applies to Thumbtack and Yelp leads.</p>
          </section>

          {/* Apply to existing */}
          <section>
            <div className="bg-white rounded-xl border border-[var(--sf-border-light)] p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-[var(--sf-text-primary)]">Apply Rules to Existing Leads</h3>
                  <p className="text-xs text-[var(--sf-text-muted)] mt-0.5">Update existing leads based on conversation history.</p>
                </div>
                <button disabled={backfilling} onClick={async () => {
                  setBackfilling(true); setBackfillResult(null)
                  try { setBackfillResult(await leadAutomationAPI.backfill()) } catch (e) { setBackfillResult({ error: e.response?.data?.error || e.message }) }
                  finally { setBackfilling(false) }
                }} className="px-4 py-2 text-sm border border-[var(--sf-border-light)] rounded-lg hover:bg-[var(--sf-bg-hover)] text-[var(--sf-text-secondary)] disabled:opacity-50 flex items-center gap-2">
                  {backfilling && <Loader2 size={14} className="animate-spin" />}{backfilling ? 'Applying...' : 'Apply Now'}
                </button>
              </div>
              {backfillResult && !backfilling && (
                <div className={`mt-3 rounded-lg p-3 text-xs ${backfillResult.error ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
                  {backfillResult.error ? `Error: ${backfillResult.error}` : `Updated ${backfillResult.updated} of ${backfillResult.total} leads`}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

// ── Source Row Component ──
function SourceRow({ s, idx, editingId, editName, setEditName, setEditingId,
  savingSource, savingMapping, handleRenameSource, handleDeleteSource,
  handleAddMapping, handleDeleteMapping, availableForDropdown, reloadMappings,
  openDropdown, setOpenDropdown,
  dragIdx, dragOverIdx, handleDragStart, handleDragOver, handleDrop, handleDragEnd }) {

  const isOpen = openDropdown === s.name
  const dropdownRef = useRef(null)
  const triggerRef = useRef(null)
  const [dropSearch, setDropSearch] = useState('')
  const [selectedKeys, setSelectedKeys] = useState(new Set())
  const [savingBulk, setSavingBulk] = useState(false)
  const [dropDirection, setDropDirection] = useState('down') // 'down' | 'up'
  const [dropMaxHeight, setDropMaxHeight] = useState(480)
  const [dropWidth, setDropWidth] = useState(384) // w-96
  const [resizing, setResizing] = useState(false)
  const mapped = s.mappedValues || []

  // Resize handlers — drag corner to resize dropdown
  const startResize = (e) => {
    e.preventDefault(); e.stopPropagation()
    setResizing(true)
    const startX = e.clientX
    const startY = e.clientY
    const startH = dropMaxHeight
    const startW = dropWidth
    const dirDown = dropDirection === 'down'
    const onMove = (ev) => {
      const dx = ev.clientX - startX
      const dy = ev.clientY - startY
      setDropMaxHeight(Math.max(200, Math.min(window.innerHeight - 100, startH + (dirDown ? dy : -dy))))
      setDropWidth(Math.max(320, Math.min(window.innerWidth - 40, startW + dx)))
    }
    const onUp = () => {
      setResizing(false)
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  // Compute direction + max height whenever dropdown opens
  useEffect(() => {
    if (!isOpen || !triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const STICKY_HEADER = 80 // page's sticky header height + padding
    const spaceBelow = window.innerHeight - rect.bottom - 16
    const spaceAbove = rect.top - STICKY_HEADER
    const preferred = 520
    if (spaceBelow >= 320 || spaceBelow >= spaceAbove) {
      setDropDirection('down')
      setDropMaxHeight(Math.max(240, Math.min(preferred, spaceBelow)))
    } else {
      setDropDirection('up')
      setDropMaxHeight(Math.max(240, Math.min(preferred, spaceAbove)))
    }
  }, [isOpen])

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen) { setDropSearch(''); setSelectedKeys(new Set()); return }
    const handler = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpenDropdown(null) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isOpen, setOpenDropdown])

  const filteredDropdown = dropSearch.trim()
    ? availableForDropdown.filter(v => v.raw_value.toLowerCase().includes(dropSearch.toLowerCase()))
    : availableForDropdown

  const toggleSelect = (key) => {
    setSelectedKeys(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
      return next
    })
  }

  const selectAllFiltered = () => {
    const allKeys = filteredDropdown.map(v => `${v.provider}:${v.raw_value}`)
    const allSelected = allKeys.every(k => selectedKeys.has(k))
    setSelectedKeys(prev => {
      const next = new Set(prev)
      if (allSelected) allKeys.forEach(k => next.delete(k))
      else allKeys.forEach(k => next.add(k))
      return next
    })
  }

  const handleBulkMap = async () => {
    if (selectedKeys.size === 0) return
    setSavingBulk(true)
    const toMap = availableForDropdown
      .filter(v => selectedKeys.has(`${v.provider}:${v.raw_value}`))
      .map(v => ({ raw_value: v.raw_value, source_name: s.name, provider: v.provider }))
    try {
      await leadSourceMappingsAPI.saveBulk(toMap)
      setSelectedKeys(new Set())
      setOpenDropdown(null)
      await reloadMappings()
    } catch (e) {
      alert('Failed: ' + (e.response?.data?.error || e.message))
    } finally { setSavingBulk(false) }
  }

  const isDragging = dragIdx === idx
  const isDragOver = dragOverIdx === idx && dragIdx !== idx

  return (
    <div
      draggable={!!s.id && editingId !== s.id}
      onDragStart={e => handleDragStart(e, idx)} onDragOver={e => handleDragOver(e, idx)}
      onDrop={e => handleDrop(e, idx)} onDragEnd={handleDragEnd}
      style={{ opacity: isDragging ? 0.4 : 1 }}>
      {isDragOver && <div className="h-0.5 bg-[var(--sf-blue-500)]" />}

      <div className="px-5 py-3 group">
        {/* Header: grip + name + dropdown trigger + actions */}
        <div className="flex items-center gap-2">
          {editingId === s.id ? (
            <>
              <input autoFocus value={editName} onChange={e => setEditName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleRenameSource(s.id); if (e.key === 'Escape') setEditingId(null) }}
                className="flex-1 text-sm border border-[var(--sf-blue-500)] rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[var(--sf-blue-500)]" />
              <button onClick={() => handleRenameSource(s.id)} disabled={savingSource === s.id}
                className="p-1.5 rounded-lg hover:bg-green-50 text-green-600">
                {savingSource === s.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              </button>
              <button onClick={() => setEditingId(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-[var(--sf-text-muted)]"><X size={14} /></button>
            </>
          ) : (
            <>
              <GripVertical size={14} className="text-[var(--sf-text-muted)] opacity-0 group-hover:opacity-50 cursor-grab flex-shrink-0" />
              <span className="text-sm font-medium text-[var(--sf-text-primary)]">{s.name}</span>
              {mapped.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-[var(--sf-text-muted)]">{mapped.length}</span>
              )}
              <div className="flex-1" />
              {/* Dropdown trigger */}
              <div className="relative" ref={dropdownRef}>
                <button ref={triggerRef} onClick={() => setOpenDropdown(isOpen ? null : s.name)}
                  className="px-2.5 py-1 text-xs border border-dashed border-[var(--sf-border-light)] rounded-lg hover:border-[var(--sf-blue-500)] hover:text-[var(--sf-blue-500)] text-[var(--sf-text-muted)] flex items-center gap-1">
                  <Plus size={11} /> Map values <ChevronDown size={11} />
                </button>
                {isOpen && availableForDropdown.length > 0 && (
                  <div className={`absolute right-0 bg-white border border-[var(--sf-border-light)] rounded-xl shadow-lg z-50 flex flex-col ${dropDirection === 'up' ? 'bottom-full mb-1' : 'top-full mt-1'} ${resizing ? 'select-none' : ''}`}
                    style={{ height: `${dropMaxHeight}px`, width: `${dropWidth}px` }}>
                    {/* Top: Map button + actions header */}
                    <div className="px-3 py-2 border-b border-[var(--sf-border-light)] flex-shrink-0 flex items-center justify-between gap-2 bg-[var(--sf-bg-page)]">
                      <span className="text-[11px] text-[var(--sf-text-secondary)] font-medium">
                        Map to <span className="text-[var(--sf-text-primary)]">{s.name}</span>
                      </span>
                      <button onClick={handleBulkMap} disabled={selectedKeys.size === 0 || savingBulk}
                        className="px-3 py-1 text-xs bg-[var(--sf-blue-500)] text-white rounded-lg hover:bg-[var(--sf-blue-600)] disabled:opacity-50 flex items-center gap-1.5">
                        {savingBulk ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                        Map {selectedKeys.size > 0 ? selectedKeys.size : ''}
                      </button>
                    </div>
                    {/* Search + select-all */}
                    <div className="p-2 border-b border-[var(--sf-border-light)] flex-shrink-0 space-y-2">
                      <div className="relative">
                        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--sf-text-muted)]" />
                        <input autoFocus value={dropSearch} onChange={e => setDropSearch(e.target.value)}
                          placeholder={`Search ${availableForDropdown.length} unmapped...`}
                          className="w-full text-xs pl-7 pr-2 py-1.5 border border-[var(--sf-border-light)] rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--sf-blue-500)]" />
                      </div>
                      <div className="flex items-center justify-between">
                        <button onClick={selectAllFiltered}
                          className="text-[11px] text-[var(--sf-blue-500)] hover:text-[var(--sf-blue-600)] font-medium">
                          {filteredDropdown.length > 0 && filteredDropdown.every(v => selectedKeys.has(`${v.provider}:${v.raw_value}`))
                            ? 'Deselect all' : `Select all${dropSearch ? ' filtered' : ''}`}
                        </button>
                        <span className="text-[10px] text-[var(--sf-text-muted)]">
                          {selectedKeys.size > 0 ? `${selectedKeys.size} selected` : `${filteredDropdown.length} of ${availableForDropdown.length}`}
                        </span>
                      </div>
                    </div>
                    {/* Scrollable list */}
                    <div className="overflow-y-auto flex-1 min-h-0">
                      {filteredDropdown.length === 0 ? (
                        <div className="px-3 py-6 text-center text-xs text-[var(--sf-text-muted)]">No matches</div>
                      ) : filteredDropdown.map(v => {
                        const key = `${v.provider}:${v.raw_value}`
                        const isSaving = savingMapping === key
                        const isSelected = selectedKeys.has(key)
                        return (
                          <label key={key} className={`w-full px-3 py-2 hover:bg-[var(--sf-bg-hover)] flex items-center gap-2 text-sm cursor-pointer ${isSelected ? 'bg-[var(--sf-blue-50)]' : ''}`}>
                            <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(key)}
                              className="w-3.5 h-3.5 rounded border-gray-300 text-[var(--sf-blue-500)] focus:ring-[var(--sf-blue-500)] cursor-pointer flex-shrink-0" />
                            {isSaving ? <Loader2 size={11} className="animate-spin flex-shrink-0" /> : (
                              <span className={`text-[8px] font-bold px-1 py-0.5 rounded ${PROV_COLOR[v.provider] || 'bg-gray-100 text-gray-500'} flex-shrink-0`}>
                                {PROV_SHORT[v.provider]}
                              </span>
                            )}
                            <span className="truncate flex-1" title={v.raw_value}>{v.raw_value}</span>
                            {v.count != null && <span className="text-[10px] text-[var(--sf-text-muted)] flex-shrink-0">({v.count})</span>}
                          </label>
                        )
                      })}
                    </div>
                    {/* Resize grip — corner (opposite of dropdown direction anchor) */}
                    <div
                      onMouseDown={startResize}
                      title="Drag to resize"
                      className={`absolute right-0 ${dropDirection === 'up' ? 'top-0' : 'bottom-0'} w-4 h-4 ${dropDirection === 'up' ? 'cursor-ne-resize' : 'cursor-se-resize'} flex items-center justify-center opacity-40 hover:opacity-100 transition-opacity`}
                      style={{
                        background: dropDirection === 'up'
                          ? 'linear-gradient(45deg, transparent 50%, rgba(0,0,0,0.25) 50%)'
                          : 'linear-gradient(-45deg, transparent 50%, rgba(0,0,0,0.25) 50%)'
                      }}
                    />
                  </div>
                )}
                {isOpen && availableForDropdown.length === 0 && (
                  <div className={`absolute right-0 w-56 bg-white border border-[var(--sf-border-light)] rounded-xl shadow-lg z-50 p-4 text-center ${dropDirection === 'up' ? 'bottom-full mb-1' : 'top-full mt-1'}`}>
                    <p className="text-xs text-[var(--sf-text-muted)]">All values are mapped</p>
                  </div>
                )}
              </div>
              {/* Edit / delete */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {s.id && (
                  <>
                    <button onClick={() => { setEditingId(s.id); setEditName(s.name) }}
                      className="p-1.5 rounded-lg hover:bg-[var(--sf-bg-hover)] text-[var(--sf-text-muted)]" title="Rename"><Pencil size={13} /></button>
                    <button onClick={() => handleDeleteSource(s.id, s.name)} disabled={savingSource === s.id}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-[var(--sf-text-muted)] hover:text-red-500" title="Delete">
                      {savingSource === s.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {/* Mapped value tags */}
        {mapped.length > 0 && editingId !== s.id && (
          <div className="flex flex-wrap gap-1.5 mt-2 ml-6">
            {mapped.map(m => (
              <span key={m.id} className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border ${PROV_COLOR[m.provider] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                <span className="font-medium">{PROV_SHORT[m.provider]}</span>
                <span>{m.raw_value}</span>
                <button onClick={() => handleDeleteMapping(m.id)} disabled={savingMapping === m.id}
                  className="ml-0.5 hover:text-red-500 transition-colors">
                  {savingMapping === m.id ? <Loader2 size={9} className="animate-spin" /> : <X size={9} />}
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default LeadsSettings

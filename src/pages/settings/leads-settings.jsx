"use client"

import { useState, useEffect, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import Sidebar from "../../components/sidebar"
import { leadAutomationAPI, leadSourcesAPI, leadSourceMappingsAPI } from "../../services/api"
import { ChevronLeft, Zap, Loader2, Plus, X, Pencil, Check, Trash2, ArrowRight, Wand2, ChevronDown, ChevronRight, GripVertical } from "lucide-react"

const EVENT_DEFS = [
  { event: 'lead_received', label: 'Lead Received', desc: 'New lead arrives from Thumbtack or Yelp' },
  { event: 'first_reply_sent', label: 'First Reply Sent', desc: 'You send the first message to the lead' },
  { event: 'conversation_ongoing', label: 'Conversation Ongoing', desc: 'Further messages exchanged before proposal' },
  { event: 'proposal_sent', label: 'Proposal / Quote Sent', desc: 'Quote or proposal sent to the customer' },
  { event: 'job_created', label: 'Job Created', desc: 'Job created for this lead — converts to customer' },
]

const PROV_LABEL = { openphone: 'OpenPhone', leadbridge: 'LeadBridge' }
const PROV_SHORT = { openphone: 'OP', leadbridge: 'LB' }
const PROV_COLOR = { openphone: 'bg-blue-50 text-blue-600', leadbridge: 'bg-amber-50 text-amber-600' }

const LeadsSettings = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(null)
  const [rules, setRules] = useState([])
  const [stages, setStages] = useState([])
  const [backfilling, setBackfilling] = useState(false)
  const [backfillResult, setBackfillResult] = useState(null)

  // Sources
  const [sources, setSources] = useState([])
  const [sourcesLoading, setSourcesLoading] = useState(true)
  const [newSourceName, setNewSourceName] = useState('')
  const [addingSource, setAddingSource] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [savingSource, setSavingSource] = useState(null)

  // Mappings
  const [mappings, setMappings] = useState([])
  const [unmapped, setUnmapped] = useState([])
  const [mappingsLoading, setMappingsLoading] = useState(true)
  const [suggesting, setSuggesting] = useState(false)
  const [savingMapping, setSavingMapping] = useState(null)
  const [pendingMappings, setPendingMappings] = useState({})
  const [expandedSources, setExpandedSources] = useState({})

  useEffect(() => {
    loadRules()
    loadSources()
    loadMappings()
  }, [])

  // ── Data loaders ──
  const loadRules = async () => {
    setLoading(true)
    try {
      const data = await leadAutomationAPI.getRules()
      setRules(data.rules || [])
      setStages(data.stages || [])
      if ((data.rules || []).length === 0) {
        await leadAutomationAPI.seedDefaults()
        const refreshed = await leadAutomationAPI.getRules()
        setRules(refreshed.rules || [])
        setStages(refreshed.stages || [])
      }
    } catch (e) { console.error('Failed to load rules:', e) }
    finally { setLoading(false) }
  }

  const loadSources = async () => {
    setSourcesLoading(true)
    try {
      const data = await leadSourcesAPI.list()
      let list = data.sources || []
      if (list.length === 0) {
        const seeded = await leadSourcesAPI.seed()
        list = seeded.sources || []
      }
      setSources(list)
    } catch (e) { console.error('Failed to load sources:', e) }
    finally { setSourcesLoading(false) }
  }

  const loadMappings = async () => {
    setMappingsLoading(true)
    try {
      const data = await leadSourceMappingsAPI.list()
      setMappings(data.mappings || [])
      setUnmapped(data.unmapped || [])
    } catch (e) { console.error('Failed to load mappings:', e) }
    finally { setMappingsLoading(false) }
  }

  const reload = () => Promise.all([loadSources(), loadMappings()])

  // ── Source-centric view: group mappings by source_name ──
  const sourceWithMappings = useMemo(() => {
    const map = {}
    for (const s of sources) map[s.name] = { ...s, mappedValues: [] }
    for (const m of mappings) {
      if (!map[m.source_name]) map[m.source_name] = { id: null, name: m.source_name, mappedValues: [] }
      map[m.source_name].mappedValues.push(m)
    }
    return Object.values(map)
  }, [sources, mappings])

  // ── Source actions ──
  const handleAddSource = async () => {
    if (!newSourceName.trim()) return
    setSavingSource('new')
    try {
      await leadSourcesAPI.create(newSourceName.trim())
      setNewSourceName('')
      setAddingSource(false)
      await reload()
    } catch (e) { alert('Failed: ' + (e.response?.data?.error || e.message)) }
    finally { setSavingSource(null) }
  }

  const handleRenameSource = async (id) => {
    if (!editName.trim()) return
    setSavingSource(id)
    try {
      await leadSourcesAPI.update(id, { name: editName.trim() })
      setEditingId(null)
      setEditName('')
      await reload()
    } catch (e) { alert('Failed: ' + (e.response?.data?.error || e.message)) }
    finally { setSavingSource(null) }
  }

  const handleDeleteSource = async (id, name) => {
    if (!window.confirm(`Delete "${name}"? Existing leads with this source won't be affected.`)) return
    setSavingSource(id)
    try {
      await leadSourcesAPI.remove(id)
      await reload()
    } catch (e) { alert('Failed: ' + (e.response?.data?.error || e.message)) }
    finally { setSavingSource(null) }
  }

  // ── Mapping actions ──
  const handleSaveMapping = async (raw_value, provider) => {
    const key = `${provider}:${raw_value}`
    const source_name = pendingMappings[key]
    if (!source_name) return
    setSavingMapping(key)
    try {
      await leadSourceMappingsAPI.save({ raw_value, source_name, provider })
      setPendingMappings(prev => { const n = { ...prev }; delete n[key]; return n })
      await loadMappings()
    } catch (e) { alert('Failed: ' + (e.response?.data?.error || e.message)) }
    finally { setSavingMapping(null) }
  }

  const handleSaveAllMappings = async () => {
    const toSave = Object.entries(pendingMappings).map(([key, source_name]) => {
      const [provider, ...rest] = key.split(':')
      return { raw_value: rest.join(':'), source_name, provider }
    }).filter(m => m.source_name)
    if (!toSave.length) return
    setSavingMapping('all')
    try {
      await leadSourceMappingsAPI.saveBulk(toSave)
      setPendingMappings({})
      await loadMappings()
    } catch (e) { alert('Failed: ' + (e.response?.data?.error || e.message)) }
    finally { setSavingMapping(null) }
  }

  const handleDeleteMapping = async (id) => {
    setSavingMapping(id)
    try {
      await leadSourceMappingsAPI.remove(id)
      await loadMappings()
    } catch (e) { alert('Failed: ' + (e.response?.data?.error || e.message)) }
    finally { setSavingMapping(null) }
  }

  const handlePromoteAsSource = async (raw_value, provider) => {
    const key = `${provider}:${raw_value}`
    setSavingMapping(key)
    try {
      await leadSourcesAPI.create(raw_value)
      await leadSourceMappingsAPI.save({ raw_value, source_name: raw_value, provider })
      await reload()
    } catch (e) { alert('Failed: ' + (e.response?.data?.error || e.message)) }
    finally { setSavingMapping(null) }
  }

  const handleAutoSuggest = async () => {
    setSuggesting(true)
    try {
      const data = await leadSourceMappingsAPI.autoSuggest()
      const pending = {}
      for (const s of (data.suggestions || [])) {
        pending[`${s.provider}:${s.raw_value}`] = s.source_name
      }
      setPendingMappings(prev => ({ ...prev, ...pending }))
    } catch (e) { console.error('Failed to auto-suggest:', e) }
    finally { setSuggesting(false) }
  }

  // ── Automation ──
  const handleStageChange = async (eventType, stageId) => {
    if (!stageId) return
    setSaving(eventType)
    try {
      for (const ch of ['thumbtack', 'yelp']) {
        await leadAutomationAPI.saveRule({ channel: ch, eventType, targetStageId: parseInt(stageId), enabled: true, autoConvertToCustomer: eventType === 'job_created' })
      }
      const data = await leadAutomationAPI.getRules()
      setRules(data.rules || [])
    } catch (e) { alert('Failed: ' + (e.response?.data?.error || e.message)) }
    finally { setSaving(null) }
  }

  const getRuleForEvent = (eventType) => rules.find(r => r.eventType === eventType && r.channel === 'thumbtack') || rules.find(r => r.eventType === eventType)

  const toggleExpanded = (name) => setExpandedSources(prev => ({ ...prev, [name]: !prev[name] }))

  // ── Drag and drop reorder ──
  const [dragIdx, setDragIdx] = useState(null)
  const [dragOverIdx, setDragOverIdx] = useState(null)

  const handleDragStart = (e, idx) => {
    setDragIdx(idx)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', idx)
  }

  const handleDragOver = (e, idx) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIdx(idx)
  }

  const handleDrop = async (e, dropIdx) => {
    e.preventDefault()
    setDragOverIdx(null)
    if (dragIdx === null || dragIdx === dropIdx) { setDragIdx(null); return }
    // Reorder sourceWithMappings (which follows sources order)
    const ids = sourceWithMappings.map(s => s.id).filter(Boolean)
    const moved = ids.splice(dragIdx, 1)[0]
    if (!moved) { setDragIdx(null); return }
    ids.splice(dropIdx, 0, moved)
    setDragIdx(null)
    // Optimistic UI update
    const reordered = [...sourceWithMappings]
    const [item] = reordered.splice(dragIdx, 1)
    reordered.splice(dropIdx, 0, item)
    // Persist
    try {
      const result = await leadSourcesAPI.reorder(ids)
      setSources(result.sources || [])
    } catch (e) { console.error('Reorder failed:', e); await loadSources() }
  }

  const handleDragEnd = () => { setDragIdx(null); setDragOverIdx(null) }

  const isLoading = sourcesLoading || mappingsLoading

  return (
    <div className="min-h-screen bg-[var(--sf-bg-page)]">
      <div>
        <div className="bg-white border-b border-[var(--sf-border-light)] px-6 py-4 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/settings')} className="p-1.5 rounded-lg hover:bg-[var(--sf-bg-hover)] text-[var(--sf-text-muted)]">
              <ChevronLeft size={20} />
            </button>
            <div className="flex items-center gap-2">
              <Zap size={20} className="text-[var(--sf-blue-500)]" />
              <h1 className="text-lg font-bold text-[var(--sf-text-primary)]">Leads Settings</h1>
            </div>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">

          {/* ══════════════════════════════════════════════════════ */}
          {/* SECTION 1: SOURCE MAPPING (source-centric)           */}
          {/* ══════════════════════════════════════════════════════ */}
          <section>
            <div className="mb-4 flex items-end justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[var(--sf-text-primary)]">Lead Sources</h2>
                <p className="text-sm text-[var(--sf-text-muted)] mt-0.5">
                  Your canonical sources. Each source can have multiple raw values mapped from OpenPhone and LeadBridge.
                </p>
              </div>
            </div>

            {isLoading ? (
              <div className="bg-white rounded-xl border border-[var(--sf-border-light)] flex items-center justify-center py-12">
                <Loader2 size={24} className="animate-spin text-[var(--sf-text-muted)]" />
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-[var(--sf-border-light)] overflow-hidden">
                {/* Source rows */}
                <div className="divide-y divide-[var(--sf-border-light)]">
                  {sourceWithMappings.map((s, idx) => {
                    const isExpanded = expandedSources[s.name]
                    const count = s.mappedValues.length
                    const isDragging = dragIdx === idx
                    const isDragOver = dragOverIdx === idx && dragIdx !== idx
                    return (
                      <div key={s.name}
                        draggable={!!s.id && editingId !== s.id}
                        onDragStart={e => handleDragStart(e, idx)}
                        onDragOver={e => handleDragOver(e, idx)}
                        onDrop={e => handleDrop(e, idx)}
                        onDragEnd={handleDragEnd}
                        style={{ opacity: isDragging ? 0.4 : 1 }}>
                        {isDragOver && <div className="h-0.5 bg-[var(--sf-blue-500)]" />}
                        {/* Source header row */}
                        <div className="flex items-center gap-2 px-5 py-3 group">
                          {editingId === s.id ? (
                            <>
                              <input autoFocus value={editName} onChange={e => setEditName(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') handleRenameSource(s.id); if (e.key === 'Escape') setEditingId(null) }}
                                className="flex-1 text-sm border border-[var(--sf-blue-500)] rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[var(--sf-blue-500)]" />
                              <button onClick={() => handleRenameSource(s.id)} disabled={savingSource === s.id}
                                className="p-1.5 rounded-lg hover:bg-green-50 text-green-600">
                                {savingSource === s.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                              </button>
                              <button onClick={() => setEditingId(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-[var(--sf-text-muted)]">
                                <X size={14} />
                              </button>
                            </>
                          ) : (
                            <>
                              <GripVertical size={14} className="text-[var(--sf-text-muted)] opacity-0 group-hover:opacity-50 cursor-grab flex-shrink-0" />
                              <button onClick={() => count > 0 && toggleExpanded(s.name)} className="p-0.5 text-[var(--sf-text-muted)]" disabled={count === 0}>
                                {count > 0 ? (isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : <span className="w-3.5" />}
                              </button>
                              <span className="text-sm font-medium text-[var(--sf-text-primary)] flex-1">{s.name}</span>
                              {count > 0 && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-[var(--sf-text-muted)]">
                                  {count} mapped
                                </span>
                              )}
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {s.id && (
                                  <>
                                    <button onClick={() => { setEditingId(s.id); setEditName(s.name) }}
                                      className="p-1.5 rounded-lg hover:bg-[var(--sf-bg-hover)] text-[var(--sf-text-muted)]" title="Rename">
                                      <Pencil size={13} />
                                    </button>
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

                        {/* Expanded: mapped raw values */}
                        {isExpanded && count > 0 && (
                          <div className="bg-[var(--sf-bg-page)] border-t border-[var(--sf-border-light)]">
                            {s.mappedValues.map(m => (
                              <div key={m.id} className="flex items-center gap-2.5 pl-12 pr-5 py-2 group/item">
                                <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${PROV_COLOR[m.provider] || 'bg-gray-100 text-gray-500'}`}>
                                  {PROV_SHORT[m.provider] || m.provider}
                                </span>
                                <span className="text-sm text-[var(--sf-text-secondary)]">{m.raw_value}</span>
                                <div className="flex-1" />
                                <button onClick={() => handleDeleteMapping(m.id)} disabled={savingMapping === m.id}
                                  className="p-1 rounded hover:bg-red-50 text-[var(--sf-text-muted)] hover:text-red-500 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                  {savingMapping === m.id ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
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

          {/* ══════════════════════════════════════════════════════ */}
          {/* SECTION 2: UNMAPPED VALUES                           */}
          {/* ══════════════════════════════════════════════════════ */}
          {!isLoading && unmapped.length > 0 && (
            <section>
              <div className="mb-4 flex items-end justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-[var(--sf-text-primary)]">Unmapped Values ({unmapped.length})</h2>
                  <p className="text-sm text-[var(--sf-text-muted)] mt-0.5">
                    Raw values from OpenPhone and LeadBridge not yet connected to a source. Map to an existing source or add as new.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={handleAutoSuggest} disabled={suggesting}
                    className="px-3 py-1.5 text-xs border border-[var(--sf-border-light)] rounded-lg hover:bg-[var(--sf-bg-hover)] text-[var(--sf-text-secondary)] disabled:opacity-50 flex items-center gap-1.5">
                    {suggesting ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                    Auto-suggest
                  </button>
                  {Object.keys(pendingMappings).length > 0 && (
                    <button onClick={handleSaveAllMappings} disabled={savingMapping === 'all'}
                      className="px-3 py-1.5 text-xs bg-[var(--sf-blue-500)] text-white rounded-lg hover:bg-[var(--sf-blue-600)] disabled:opacity-50 flex items-center gap-1.5">
                      {savingMapping === 'all' ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                      Save All ({Object.keys(pendingMappings).length})
                    </button>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-[var(--sf-border-light)] overflow-hidden">
                <div className="divide-y divide-[var(--sf-border-light)] max-h-[500px] overflow-y-auto">
                  {unmapped.map(u => {
                    const key = `${u.provider}:${u.raw_value}`
                    const provLabel = PROV_SHORT[u.provider] || u.provider
                    const provColor = PROV_COLOR[u.provider] || 'bg-gray-100 text-gray-500'
                    return (
                      <div key={key} className="flex items-center gap-2.5 px-5 py-2.5">
                        <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${provColor} flex-shrink-0`} title={PROV_LABEL[u.provider]}>
                          {provLabel}
                        </span>
                        <div className="min-w-0 flex items-center gap-1.5">
                          <span className="text-sm text-[var(--sf-text-primary)] font-medium">{u.raw_value}</span>
                          <span className="text-[10px] text-[var(--sf-text-muted)]">({u.count})</span>
                        </div>
                        <ArrowRight size={14} className="text-[var(--sf-text-muted)] flex-shrink-0 ml-auto" />
                        <select
                          value={pendingMappings[key] || ''}
                          onChange={e => setPendingMappings(prev => ({ ...prev, [key]: e.target.value }))}
                          className="text-sm border border-[var(--sf-border-light)] rounded-lg px-2.5 py-1.5 bg-white min-w-[140px] focus:outline-none focus:ring-1 focus:ring-[var(--sf-blue-500)]">
                          <option value="">Map to...</option>
                          {sources.map(s => (
                            <option key={s.id} value={s.name}>{s.name}</option>
                          ))}
                        </select>
                        {pendingMappings[key] ? (
                          <button onClick={() => handleSaveMapping(u.raw_value, u.provider)}
                            disabled={savingMapping === key}
                            className="p-1.5 rounded-lg hover:bg-green-50 text-green-600 flex-shrink-0" title="Save mapping">
                            {savingMapping === key ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                          </button>
                        ) : (
                          <button onClick={() => handlePromoteAsSource(u.raw_value, u.provider)}
                            disabled={savingMapping === key}
                            className="px-2 py-1 text-[10px] rounded border border-[var(--sf-border-light)] hover:bg-violet-50 hover:border-violet-200 text-[var(--sf-text-secondary)] hover:text-violet-600 flex-shrink-0 whitespace-nowrap"
                            title="Add as a new source">
                            {savingMapping === key ? <Loader2 size={11} className="animate-spin" /> : '+ Add as source'}
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </section>
          )}

          {/* ══════════════════════════════════════════════════════ */}
          {/* SECTION 3: LEAD STAGE AUTOMATION                     */}
          {/* ══════════════════════════════════════════════════════ */}
          <section>
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-[var(--sf-text-primary)]">Lead Stage Automation</h2>
              <p className="text-sm text-[var(--sf-text-muted)] mt-0.5">
                Configure how leads from Thumbtack and Yelp automatically progress through your pipeline stages.
              </p>
            </div>

            <div className="bg-white rounded-xl border border-[var(--sf-border-light)] overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={24} className="animate-spin text-[var(--sf-text-muted)]" />
                </div>
              ) : (
                <div className="divide-y divide-[var(--sf-border-light)]">
                  {EVENT_DEFS.map((evt, i) => {
                    const rule = getRuleForEvent(evt.event)
                    const isSaving = saving === evt.event
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
            <p className="text-xs text-[var(--sf-text-muted)] mt-3">
              Leads only advance forward through stages — they never move backwards automatically. These rules apply to both Thumbtack and Yelp leads.
            </p>
          </section>

          {/* Apply to existing leads */}
          <section>
            <div className="bg-white rounded-xl border border-[var(--sf-border-light)] p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-[var(--sf-text-primary)]">Apply Rules to Existing Leads</h3>
                  <p className="text-xs text-[var(--sf-text-muted)] mt-0.5">Update existing leads based on their conversation history. Only advances forward.</p>
                </div>
                <button disabled={backfilling} onClick={async () => {
                  setBackfilling(true); setBackfillResult(null)
                  try { setBackfillResult(await leadAutomationAPI.backfill()) }
                  catch (e) { setBackfillResult({ error: e.response?.data?.error || e.message }) }
                  finally { setBackfilling(false) }
                }} className="px-4 py-2 text-sm border border-[var(--sf-border-light)] rounded-lg hover:bg-[var(--sf-bg-hover)] text-[var(--sf-text-secondary)] disabled:opacity-50 flex items-center gap-2">
                  {backfilling && <Loader2 size={14} className="animate-spin" />}
                  {backfilling ? 'Applying...' : 'Apply Now'}
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

export default LeadsSettings

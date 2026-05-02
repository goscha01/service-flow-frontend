"use client"

import React, { useState, useEffect, useMemo } from "react"
import { FileText, Mail, Eye, Trash2, Plus, Loader2, X, AlertCircle, Send, RefreshCw, Users, CheckCircle2, Download } from "lucide-react"
import { paystubsAPI } from "../services/api"
import PaystubPreview from "./paystub-preview"

const formatDate = (s) => {
  if (!s) return '—'
  const str = String(s)
  const isBareDate = /^\d{4}-\d{2}-\d{2}$/.test(str)
  const d = new Date(isBareDate ? str + 'T00:00:00' : str)
  if (isNaN(d.getTime())) return str
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const formatDateTime = (s) => {
  if (!s) return '—'
  const d = new Date(s)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

const fmt = (n) => `$${(parseFloat(n) || 0).toFixed(2)}`

function StatusBadge({ status }) {
  const styles = {
    draft:  'bg-gray-100 text-gray-600',
    issued: 'bg-blue-100 text-blue-700',
    sent:   'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${styles[status] || styles.draft}`}>
      {status || 'draft'}
    </span>
  )
}

export default function PaystubsTab({ teamMembers = [], periodStart, periodEnd, payoutBatches = [] }) {
  const [paystubs, setPaystubs] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Filters
  const [filterMember, setFilterMember] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  // Generate modal
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [genMemberId, setGenMemberId] = useState('')
  const [genBatchId, setGenBatchId] = useState('')
  const [genPeriodStart, setGenPeriodStart] = useState(periodStart || '')
  const [genPeriodEnd, setGenPeriodEnd] = useState(periodEnd || '')
  const [genSource, setGenSource] = useState('batch') // 'batch' | 'period'
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState(null)

  // Preview modal
  const [previewPaystub, setPreviewPaystub] = useState(null)
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState(null)
  const [downloading, setDownloading] = useState(false)

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // Bulk send + success banner
  const [bulkSending, setBulkSending] = useState(false)
  const [successMsg, setSuccessMsg] = useState(null)

  const loadPaystubs = async () => {
    setLoading(true); setError(null)
    try {
      const params = {}
      if (filterMember) params.teamMemberId = filterMember
      if (filterStatus) params.status = filterStatus
      const data = await paystubsAPI.list(params)
      setPaystubs(data.paystubs || [])
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to load paystubs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadPaystubs() }, [filterMember, filterStatus])

  const memberById = useMemo(() => {
    const map = {}
    for (const m of teamMembers) map[m.id] = m
    return map
  }, [teamMembers])

  const getMemberName = (id) => {
    const m = memberById[id]
    return m ? `${m.first_name || ''} ${m.last_name || ''}`.trim() : `Member #${id}`
  }

  // Filter payout batches to selected member only
  const memberBatches = useMemo(() => {
    if (!genMemberId) return []
    return payoutBatches.filter(b => String(b.team_member_id) === String(genMemberId))
  }, [payoutBatches, genMemberId])

  const handleGenerate = async () => {
    setGenerating(true); setGenError(null); setSuccessMsg(null)
    try {
      // Bulk path — "All team members" selected
      if (genMemberId === '__all__') {
        if (!genPeriodStart || !genPeriodEnd) { setGenError('Enter both period dates'); setGenerating(false); return }
        const result = await paystubsAPI.bulkCreate({
          periodStart: genPeriodStart,
          periodEnd: genPeriodEnd,
          useBatches: true,
        })
        const s = result.summary || {}
        const parts = [`${s.createdCount || 0} generated`]
        if (s.skippedCount) parts.push(`${s.skippedCount} skipped`)
        if (s.errorCount) parts.push(`${s.errorCount} failed`)
        setSuccessMsg(`Bulk generate: ${parts.join(', ')}.`)
        setShowGenerateModal(false)
        setGenMemberId(''); setGenBatchId('')
        await loadPaystubs()
        return
      }

      // Single-member path
      const body = { teamMemberId: parseInt(genMemberId) }
      if (genSource === 'batch') {
        if (!genBatchId) { setGenError('Select a payout batch'); setGenerating(false); return }
        body.payoutBatchId = parseInt(genBatchId)
      } else {
        if (!genPeriodStart || !genPeriodEnd) { setGenError('Enter both period dates'); setGenerating(false); return }
        body.periodStart = genPeriodStart
        body.periodEnd = genPeriodEnd
      }
      await paystubsAPI.create(body)
      setShowGenerateModal(false)
      setGenMemberId(''); setGenBatchId('')
      await loadPaystubs()
    } catch (e) {
      setGenError(e.response?.data?.error || 'Failed to generate paystub')
    } finally {
      setGenerating(false)
    }
  }

  const handleBulkSend = async () => {
    if (!window.confirm('Send all unsent paystubs (issued or failed) by email? Paystubs already marked sent will be skipped.')) return
    setBulkSending(true); setError(null); setSuccessMsg(null)
    try {
      const result = await paystubsAPI.bulkSend({ includeSent: false })
      const s = result.summary || {}
      const parts = [`${s.sentCount || 0} sent`]
      if (s.skippedCount) parts.push(`${s.skippedCount} skipped (no email)`)
      if (s.errorCount) parts.push(`${s.errorCount} failed`)
      setSuccessMsg(`Bulk send: ${parts.join(', ')}.`)
      await loadPaystubs()
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to bulk send paystubs')
    } finally {
      setBulkSending(false)
    }
  }

  const unsentCount = useMemo(
    () => paystubs.filter(p => p.status === 'issued' || p.status === 'failed').length,
    [paystubs]
  )

  const handleSend = async (paystub) => {
    setSending(true); setSendError(null)
    try {
      const updated = await paystubsAPI.send(paystub.id)
      setPreviewPaystub(updated)
      await loadPaystubs()
    } catch (e) {
      setSendError(e.response?.data?.error || 'Failed to send paystub')
    } finally {
      setSending(false)
    }
  }

  const handleDownload = async (paystub) => {
    if (!paystub) return
    setDownloading(true); setSendError(null)
    try {
      const memberName = getMemberName(paystub.team_member_id).replace(/[^0-9A-Za-z_-]/g, '_')
      const filename = `paystub_${memberName}_${paystub.period_start}_${paystub.period_end}.pdf`
      await paystubsAPI.downloadPdf(paystub.id, filename)
    } catch (e) {
      setSendError(e.response?.data?.error || 'Failed to download paystub PDF')
    } finally {
      setDownloading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await paystubsAPI.delete(deleteTarget.id)
      setDeleteTarget(null)
      await loadPaystubs()
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to delete paystub')
    } finally {
      setDeleting(false)
    }
  }

  const getNetPaid = (paystub) => paystub.snapshot_json?.totals?.netPayout || 0
  const getCleanerEmail = (paystub) => paystub.snapshot_json?.cleaner?.email || null

  return (
    <div className="space-y-4">
      {/* Top bar: filters + generate button */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-[var(--sf-border-light)]">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filterMember}
            onChange={(e) => setFilterMember(e.target.value)}
            className="text-sm border border-[var(--sf-border-light)] rounded-lg px-3 py-2 bg-white"
          >
            <option value="">All team members</option>
            {teamMembers.map(m => (
              <option key={m.id} value={m.id}>
                {m.first_name} {m.last_name}
              </option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-sm border border-[var(--sf-border-light)] rounded-lg px-3 py-2 bg-white"
          >
            <option value="">All statuses</option>
            <option value="issued">Issued</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleBulkSend}
            disabled={bulkSending || unsentCount === 0}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-[var(--sf-border-light)] text-[var(--sf-text-primary)] rounded-lg hover:bg-gray-50 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            title={unsentCount === 0 ? 'No unsent paystubs' : `Send ${unsentCount} unsent paystub${unsentCount === 1 ? '' : 's'}`}
          >
            {bulkSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Send Unsent{unsentCount > 0 ? ` (${unsentCount})` : ''}
          </button>
          <button
            onClick={() => {
              setShowGenerateModal(true)
              setGenMemberId(''); setGenBatchId('')
              setGenPeriodStart(periodStart || ''); setGenPeriodEnd(periodEnd || '')
              setGenError(null)
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-[var(--sf-blue-500)] text-white rounded-lg hover:bg-[var(--sf-blue-600)] text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> Generate Paystub
          </button>
        </div>
      </div>

      {/* Success banner */}
      {successMsg && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> {successMsg}</div>
          <button onClick={() => setSuccessMsg(null)} className="text-green-700 hover:text-green-900"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* List */}
      <div className="bg-white rounded-xl border border-[var(--sf-border-light)] overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--sf-text-muted)]" />
          </div>
        ) : paystubs.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-[var(--sf-text-secondary)] font-medium">No paystubs yet</p>
            <p className="text-xs text-[var(--sf-text-muted)] mt-1">
              Generate a paystub from a payout batch or payroll period to get started.
            </p>
            <button
              onClick={() => setShowGenerateModal(true)}
              className="mt-4 flex items-center gap-1.5 px-4 py-2 bg-[var(--sf-blue-500)] text-white rounded-lg hover:bg-[var(--sf-blue-600)] text-sm font-medium mx-auto"
            >
              <Plus className="w-4 h-4" /> Generate first paystub
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-[var(--sf-border-light)]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--sf-text-muted)] uppercase tracking-wider">Team Member</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--sf-text-muted)] uppercase tracking-wider">Period</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--sf-text-muted)] uppercase tracking-wider">Net Paid</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--sf-text-muted)] uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--sf-text-muted)] uppercase tracking-wider">Issued</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--sf-text-muted)] uppercase tracking-wider">Sent</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--sf-text-muted)] uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--sf-border-light)]">
              {paystubs.map(p => {
                const hasEmail = !!getCleanerEmail(p)
                return (
                  <tr key={p.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setPreviewPaystub(p)}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-[var(--sf-text-primary)]">{getMemberName(p.team_member_id)}</div>
                      {!hasEmail && <div className="text-[10px] text-amber-600">No email on file</div>}
                    </td>
                    <td className="px-4 py-3 text-[var(--sf-text-secondary)]">
                      {formatDate(p.period_start)} – {formatDate(p.period_end)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-[var(--sf-text-primary)]">
                      {fmt(getNetPaid(p))}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                    <td className="px-4 py-3 text-xs text-[var(--sf-text-muted)]">{formatDateTime(p.issued_at)}</td>
                    <td className="px-4 py-3 text-xs text-[var(--sf-text-muted)]">{formatDateTime(p.sent_at)}</td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setPreviewPaystub(p)}
                          className="p-1.5 text-[var(--sf-text-muted)] hover:text-[var(--sf-text-primary)] rounded"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDownload(p)}
                          disabled={downloading}
                          className="p-1.5 text-[var(--sf-text-muted)] hover:text-[var(--sf-text-primary)] disabled:opacity-30 rounded"
                          title="Download PDF"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleSend(p)}
                          disabled={!hasEmail || sending}
                          className="p-1.5 text-[var(--sf-blue-500)] hover:text-[var(--sf-blue-600)] disabled:opacity-30 disabled:cursor-not-allowed rounded"
                          title={hasEmail ? (p.status === 'sent' ? 'Resend email' : 'Send email') : 'No email on file'}
                        >
                          {p.status === 'sent' ? <RefreshCw className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => setDeleteTarget(p)}
                          className="p-1.5 text-red-500 hover:text-red-700 rounded"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Generate Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[var(--sf-text-primary)]">Generate Paystub</h3>
              <button onClick={() => setShowGenerateModal(false)} className="text-[var(--sf-text-muted)] hover:text-[var(--sf-text-primary)]">
                <X className="w-5 h-5" />
              </button>
            </div>

            {genError && (
              <div className="text-sm text-red-600 bg-red-50 p-2 rounded mb-3">{genError}</div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-[var(--sf-text-secondary)] block mb-1">Team member</label>
                <select
                  value={genMemberId}
                  onChange={(e) => { setGenMemberId(e.target.value); setGenBatchId('') }}
                  className="w-full text-sm border border-[var(--sf-border-light)] rounded-lg px-3 py-2"
                >
                  <option value="">Select...</option>
                  <option value="__all__">All team members (bulk)</option>
                  {teamMembers.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.first_name} {m.last_name}{!m.email ? ' (no email)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {genMemberId === '__all__' ? (
                <div className="text-xs text-[var(--sf-text-secondary)] bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-start gap-2">
                  <Users className="w-4 h-4 mt-0.5 text-[var(--sf-blue-500)]" />
                  <div>
                    For each active team member with activity in the period, a paystub will be generated.
                    If a payout batch exists for the exact period, it will be linked automatically.
                    Members with no activity are skipped.
                  </div>
                </div>
              ) : (
                <div>
                  <label className="text-xs font-medium text-[var(--sf-text-secondary)] block mb-1">Source</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setGenSource('batch')}
                      className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg border ${genSource === 'batch' ? 'bg-[var(--sf-blue-500)] text-white border-[var(--sf-blue-500)]' : 'bg-white text-[var(--sf-text-secondary)] border-[var(--sf-border-light)]'}`}
                    >
                      Payout Batch
                    </button>
                    <button
                      type="button"
                      onClick={() => setGenSource('period')}
                      className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg border ${genSource === 'period' ? 'bg-[var(--sf-blue-500)] text-white border-[var(--sf-blue-500)]' : 'bg-white text-[var(--sf-text-secondary)] border-[var(--sf-border-light)]'}`}
                    >
                      Date Range
                    </button>
                  </div>
                </div>
              )}

              {genMemberId === '__all__' ? (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-medium text-[var(--sf-text-secondary)] block mb-1">Period start</label>
                    <input
                      type="date"
                      value={genPeriodStart}
                      onChange={(e) => setGenPeriodStart(e.target.value)}
                      className="w-full text-sm border border-[var(--sf-border-light)] rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[var(--sf-text-secondary)] block mb-1">Period end</label>
                    <input
                      type="date"
                      value={genPeriodEnd}
                      onChange={(e) => setGenPeriodEnd(e.target.value)}
                      className="w-full text-sm border border-[var(--sf-border-light)] rounded-lg px-3 py-2"
                    />
                  </div>
                </div>
              ) : genSource === 'batch' ? (
                <div>
                  <label className="text-xs font-medium text-[var(--sf-text-secondary)] block mb-1">Payout batch</label>
                  <select
                    value={genBatchId}
                    onChange={(e) => setGenBatchId(e.target.value)}
                    disabled={!genMemberId}
                    className="w-full text-sm border border-[var(--sf-border-light)] rounded-lg px-3 py-2 disabled:bg-gray-50"
                  >
                    <option value="">
                      {!genMemberId ? 'Select team member first' : memberBatches.length === 0 ? 'No batches for this member' : 'Select batch...'}
                    </option>
                    {memberBatches.map(b => (
                      <option key={b.id} value={b.id}>
                        {formatDate(b.period_start)} – {formatDate(b.period_end)} · {fmt(b.total_amount)} · {b.status}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-medium text-[var(--sf-text-secondary)] block mb-1">Period start</label>
                    <input
                      type="date"
                      value={genPeriodStart}
                      onChange={(e) => setGenPeriodStart(e.target.value)}
                      className="w-full text-sm border border-[var(--sf-border-light)] rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[var(--sf-text-secondary)] block mb-1">Period end</label>
                    <input
                      type="date"
                      value={genPeriodEnd}
                      onChange={(e) => setGenPeriodEnd(e.target.value)}
                      className="w-full text-sm border border-[var(--sf-border-light)] rounded-lg px-3 py-2"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setShowGenerateModal(false)}
                className="px-4 py-2 text-sm font-medium text-[var(--sf-text-secondary)] border border-[var(--sf-border-light)] rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                disabled={generating || !genMemberId}
                className="px-4 py-2 text-sm font-medium bg-[var(--sf-blue-500)] text-white rounded-lg hover:bg-[var(--sf-blue-600)] disabled:opacity-50 flex items-center gap-1.5"
              >
                {generating && <Loader2 className="w-4 h-4 animate-spin" />}
                {genMemberId === '__all__' ? 'Generate for All' : 'Generate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewPaystub && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full my-8 max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white flex items-center justify-between p-4 border-b border-[var(--sf-border-light)] z-10">
              <h3 className="text-lg font-bold text-[var(--sf-text-primary)]">Paystub Preview</h3>
              <button
                onClick={() => { setPreviewPaystub(null); setSendError(null) }}
                className="text-[var(--sf-text-muted)] hover:text-[var(--sf-text-primary)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4">
              {sendError && (
                <div className="text-sm text-red-600 bg-red-50 p-2 rounded mb-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" /> {sendError}
                </div>
              )}
              <PaystubPreview snapshot={previewPaystub.snapshot_json} />
            </div>

            <div className="sticky bottom-0 bg-white p-4 border-t border-[var(--sf-border-light)] flex items-center justify-between">
              <div className="text-xs text-[var(--sf-text-muted)]">
                Status: <StatusBadge status={previewPaystub.status} />
                {previewPaystub.sent_at && <span className="ml-2">Last sent: {formatDateTime(previewPaystub.sent_at)}</span>}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setPreviewPaystub(null); setSendError(null) }}
                  className="px-4 py-2 text-sm font-medium text-[var(--sf-text-secondary)] border border-[var(--sf-border-light)] rounded-lg hover:bg-gray-50"
                >
                  Close
                </button>
                <button
                  onClick={() => handleDownload(previewPaystub)}
                  disabled={downloading}
                  className="px-4 py-2 text-sm font-medium text-[var(--sf-text-secondary)] border border-[var(--sf-border-light)] rounded-lg hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  Download PDF
                </button>
                <button
                  onClick={() => handleSend(previewPaystub)}
                  disabled={sending || !getCleanerEmail(previewPaystub)}
                  className="px-4 py-2 text-sm font-medium bg-[var(--sf-blue-500)] text-white rounded-lg hover:bg-[var(--sf-blue-600)] disabled:opacity-50 flex items-center gap-1.5"
                  title={!getCleanerEmail(previewPaystub) ? 'No email on file' : ''}
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : (previewPaystub.status === 'sent' ? <RefreshCw className="w-4 h-4" /> : <Mail className="w-4 h-4" />)}
                  {previewPaystub.status === 'sent' ? 'Resend Email' : 'Send Email'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-base font-bold text-[var(--sf-text-primary)] mb-2">Delete paystub?</h3>
            <p className="text-sm text-[var(--sf-text-secondary)] mb-4">
              This will delete the paystub for <strong>{getMemberName(deleteTarget.team_member_id)}</strong> ({formatDate(deleteTarget.period_start)} – {formatDate(deleteTarget.period_end)}). You can regenerate it later.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm font-medium text-[var(--sf-text-secondary)] border border-[var(--sf-border-light)] rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 flex items-center gap-1.5"
              >
                {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

import React, { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { jobsAPI } from '../services/api'

const CANCEL_REASONS = [
  { value: '', label: 'Select a reason (optional)' },
  { value: 'client_cancelled_late', label: 'Client cancelled late' },
  { value: 'client_no_show', label: 'Client no-show' },
  { value: 'locked_out', label: 'Locked out / no access' },
  { value: 'cleaner_en_route', label: 'Cleaner already en route' },
  { value: 'other', label: 'Other' },
]

// Normalize various shapes (team_assignments / assigned_team_member_id / team_member_id)
// into a deduped list of { id, name } for the reimbursement picker.
function resolveAssignees(job, teamMembers) {
  const out = new Map()
  const pushMember = (id, first, last, email) => {
    if (!id) return
    const key = Number(id)
    if (out.has(key)) return
    const name = [first, last].filter(Boolean).join(' ').trim() || email || `Member #${key}`
    out.set(key, { id: key, name })
  }

  const tas = Array.isArray(job?.team_assignments) ? job.team_assignments : []
  for (const a of tas) {
    const id = a.team_member_id || a.team_members?.id
    const src = a.team_members || a
    pushMember(id, src.first_name, src.last_name, src.email)
  }
  const single = job?.assigned_team_member_id || job?.team_member_id
  if (single) {
    const m = (teamMembers || []).find(tm => Number(tm.id) === Number(single))
    pushMember(single, m?.first_name, m?.last_name, m?.email)
  }
  return Array.from(out.values())
}

export default function CancelJobModal({ job, teamMembers, onClose, onCancelled, onError }) {
  const assignees = useMemo(() => resolveAssignees(job, teamMembers), [job, teamMembers])
  const [fee, setFee] = useState('')
  const [reimb, setReimb] = useState('')
  const [memberId, setMemberId] = useState(assignees.length === 1 ? String(assignees[0].id) : '')
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [localError, setLocalError] = useState('')

  const feeNum = fee === '' ? 0 : parseFloat(fee)
  const reimbNum = reimb === '' ? 0 : parseFloat(reimb)
  const needsMember = reimbNum > 0
  const mustPickMember = needsMember && assignees.length > 1 && !memberId

  const validate = () => {
    if (fee !== '' && (isNaN(feeNum) || feeNum < 0)) return 'Cancellation fee must be a non-negative number.'
    if (reimb !== '' && (isNaN(reimbNum) || reimbNum < 0)) return 'Cleaner reimbursement must be a non-negative number.'
    if (needsMember && !memberId) return 'Select which team member to reimburse.'
    return null
  }

  const handleSubmit = async () => {
    const err = validate()
    if (err) { setLocalError(err); return }
    setLocalError('')
    setSubmitting(true)
    try {
      const payload = {
        cancellation_fee: feeNum || 0,
        cleaner_reimbursement: reimbNum || 0,
        reimbursement_team_member_id: needsMember ? parseInt(memberId) : null,
        reason: reason || null,
        notes: notes || null,
      }
      const result = await jobsAPI.cancel(job.id, payload)
      if (result?.reimbursement?.error) {
        // Job cancelled successfully but reimbursement failed — surface the issue.
        setLocalError(`Job cancelled, but reimbursement failed: ${result.reimbursement.error}`)
        onCancelled && onCancelled(result)
        return
      }
      if (result?.reimbursement?.ledger?.action === 'locked') {
        setLocalError('Reimbursement could not be created — entry already in a payout batch.')
        onCancelled && onCancelled(result)
        return
      }
      onCancelled && onCancelled(result || {})
    } catch (e) {
      const msg = e?.response?.data?.error || e?.message || 'Failed to cancel job'
      setLocalError(msg)
      onError && onError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const bothZero = feeNum === 0 && reimbNum === 0

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] flex flex-col">
        <div className="p-6 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-[var(--sf-text-primary)]">Cancel Job</h3>
            <button onClick={onClose} className="text-[var(--sf-text-muted)] hover:text-[var(--sf-text-secondary)] p-1">
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-sm text-[var(--sf-text-secondary)] mb-5">
            This job will be marked as cancelled. Add financial adjustments only if a cancellation fee should be
            charged or a cleaner commute should be reimbursed.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--sf-text-primary)] mb-1">Client cancellation fee</label>
              <div className="flex items-center">
                <span className="px-3 py-2 bg-gray-100 border border-r-0 border-gray-300 rounded-l-md text-gray-600 text-sm">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={fee}
                  onChange={(e) => setFee(e.target.value)}
                  placeholder="0.00"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-r-md focus:outline-none focus:ring-1 focus:ring-[var(--sf-blue-500)]"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Recorded as an open receivable. Not added to service revenue.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--sf-text-primary)] mb-1">Cleaner reimbursement</label>
              <div className="flex items-center">
                <span className="px-3 py-2 bg-gray-100 border border-r-0 border-gray-300 rounded-l-md text-gray-600 text-sm">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={reimb}
                  onChange={(e) => setReimb(e.target.value)}
                  placeholder="0.00"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-r-md focus:outline-none focus:ring-1 focus:ring-[var(--sf-blue-500)]"
                />
              </div>
              {needsMember && (
                <div className="mt-2">
                  <label className="block text-xs text-gray-600 mb-1">Reimburse which cleaner?</label>
                  <select
                    value={memberId}
                    onChange={(e) => setMemberId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[var(--sf-blue-500)]"
                  >
                    <option value="">Select team member…</option>
                    {assignees.map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                  {assignees.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">No assigned team member on this job — reimbursement will be skipped.</p>
                  )}
                </div>
              )}
              <p className="text-xs text-gray-500 mt-1">Flows through payroll as a reimbursement — distinct from earnings.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--sf-text-primary)] mb-1">Reason</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[var(--sf-blue-500)]"
              >
                {CANCEL_REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--sf-text-primary)] mb-1">Internal notes</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional — not shown to the customer"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[var(--sf-blue-500)]"
              />
            </div>

            {bothZero && (
              <div className="text-xs text-gray-500 bg-gray-50 rounded p-2">
                No amounts entered — this will be a normal cancellation with no financial entries.
              </div>
            )}
            {localError && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">{localError}</div>
            )}
          </div>
        </div>

        <div className="border-t border-gray-200 p-4 flex flex-col sm:flex-row justify-end gap-2">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-[var(--sf-text-secondary)] hover:text-[var(--sf-text-primary)] order-2 sm:order-1 disabled:opacity-50"
          >
            Keep Job
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || mustPickMember}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 order-1 sm:order-2 disabled:opacity-50"
          >
            {submitting ? 'Cancelling…' : 'Cancel Job'}
          </button>
        </div>
      </div>
    </div>
  )
}

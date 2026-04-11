"use client"

import React, { useState, useEffect } from "react"
import { Plus, Check, X, Trash2, Loader2, AlertCircle, Receipt, Pencil } from "lucide-react"
import { jobExpensesAPI } from "../services/api"

const EXPENSE_TYPES = [
  { value: 'parking', label: 'Parking' },
  { value: 'toll', label: 'Toll' },
  { value: 'supplies', label: 'Supplies' },
  { value: 'other', label: 'Other' },
]

const PAID_BY_OPTIONS = [
  { value: 'team_member', label: 'Team member' },
  { value: 'company', label: 'Company' },
  { value: 'customer', label: 'Customer' },
]

const fmt = (n) => `$${(parseFloat(n) || 0).toFixed(2)}`

function StatusBadge({ status }) {
  const styles = {
    pending:  'bg-amber-100 text-amber-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${styles[status] || styles.pending}`}>
      {status}
    </span>
  )
}

export default function JobExpensesSection({ jobId, teamMembers = [], onTotalChange }) {
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [actionId, setActionId] = useState(null)

  const [form, setForm] = useState({
    expense_type: 'parking',
    description: '',
    amount: '',
    team_member_id: '',
    paid_by: 'team_member',
    reimbursable_to_team_member: true,
    note: '',
  })

  // Inline edit state
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})

  const load = async () => {
    if (!jobId) return
    setLoading(true); setError(null)
    try {
      const data = await jobExpensesAPI.list(jobId)
      setExpenses(data.expenses || [])
      if (onTotalChange) {
        const approved = (data.expenses || []).filter(e => e.status === 'approved' && e.reimbursable_to_team_member && e.paid_by === 'team_member')
        onTotalChange(approved.reduce((s, e) => s + parseFloat(e.amount || 0), 0))
      }
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to load expenses')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [jobId])

  const resetForm = () => setForm({
    expense_type: 'parking',
    description: '',
    amount: '',
    team_member_id: '',
    paid_by: 'team_member',
    reimbursable_to_team_member: true,
    note: '',
  })

  const handleAdd = async () => {
    if (!form.expense_type || !form.amount) { setError('Type and amount are required'); return }
    setSaving(true); setError(null)
    try {
      await jobExpensesAPI.create(jobId, {
        expense_type: form.expense_type,
        description: form.description || null,
        amount: parseFloat(form.amount),
        team_member_id: form.team_member_id ? parseInt(form.team_member_id) : null,
        paid_by: form.paid_by,
        reimbursable_to_team_member: !!form.reimbursable_to_team_member,
        note: form.note || null,
      })
      resetForm()
      setShowAddForm(false)
      await load()
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to create expense')
    } finally {
      setSaving(false)
    }
  }

  const handleApprove = async (expense) => {
    setActionId(expense.id); setError(null)
    try {
      await jobExpensesAPI.approve(expense.id)
      await load()
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to approve expense')
    } finally {
      setActionId(null)
    }
  }

  const handleReject = async (expense) => {
    setActionId(expense.id); setError(null)
    try {
      await jobExpensesAPI.reject(expense.id)
      await load()
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to reject expense')
    } finally {
      setActionId(null)
    }
  }

  const handleDelete = async (expense) => {
    if (!window.confirm(`Delete expense "${expense.expense_type}" for ${fmt(expense.amount)}?`)) return
    setActionId(expense.id); setError(null)
    try {
      await jobExpensesAPI.delete(expense.id)
      await load()
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to delete expense')
    } finally {
      setActionId(null)
    }
  }

  const startEdit = (expense) => {
    setEditingId(expense.id)
    setEditForm({
      expense_type: expense.expense_type,
      description: expense.description || '',
      amount: String(expense.amount),
      team_member_id: expense.team_member_id ? String(expense.team_member_id) : '',
      paid_by: expense.paid_by,
      reimbursable_to_team_member: !!expense.reimbursable_to_team_member,
      note: expense.note || '',
    })
    setError(null)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm({})
  }

  const handleSaveEdit = async (expense) => {
    if (!editForm.amount) { setError('Amount is required'); return }
    setActionId(expense.id); setError(null)
    try {
      await jobExpensesAPI.update(expense.id, {
        expense_type: editForm.expense_type,
        description: editForm.description || null,
        amount: parseFloat(editForm.amount),
        team_member_id: editForm.team_member_id ? parseInt(editForm.team_member_id) : null,
        paid_by: editForm.paid_by,
        reimbursable_to_team_member: !!editForm.reimbursable_to_team_member,
        note: editForm.note || null,
      })
      setEditingId(null)
      setEditForm({})
      await load()
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to update expense')
    } finally {
      setActionId(null)
    }
  }

  const getMemberName = (id) => {
    const m = teamMembers.find(x => x.id === id)
    return m ? `${m.first_name || ''} ${m.last_name || ''}`.trim() : '—'
  }

  const totalApproved = expenses.filter(e => e.status === 'approved').reduce((s, e) => s + parseFloat(e.amount || 0), 0)

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold text-[var(--sf-text-primary)] flex items-center gap-2">
          <Receipt className="w-4 h-4" />
          Expenses / Reimbursements
          {totalApproved > 0 && (
            <span className="text-xs font-normal text-[var(--sf-text-muted)]">
              · {fmt(totalApproved)} approved
            </span>
          )}
        </h4>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-[var(--sf-blue-500)] text-white rounded-lg hover:bg-[var(--sf-blue-600)]"
        >
          <Plus className="w-3.5 h-3.5" /> Add Expense
        </button>
      </div>

      {error && (
        <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-2 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {/* Add form */}
      {showAddForm && (
        <div className="mb-4 p-4 bg-gray-50 border border-[var(--sf-border-light)] rounded-lg space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-[var(--sf-text-secondary)] block mb-1">Type</label>
              <select
                value={form.expense_type}
                onChange={e => setForm({ ...form, expense_type: e.target.value })}
                className="w-full text-sm border border-[var(--sf-border-light)] rounded-lg px-3 py-2"
              >
                {EXPENSE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--sf-text-secondary)] block mb-1">Amount</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.amount}
                onChange={e => setForm({ ...form, amount: e.target.value })}
                placeholder="0.00"
                className="w-full text-sm border border-[var(--sf-border-light)] rounded-lg px-3 py-2"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--sf-text-secondary)] block mb-1">Description</label>
            <input
              type="text"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="e.g. parking meter downtown"
              className="w-full text-sm border border-[var(--sf-border-light)] rounded-lg px-3 py-2"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-[var(--sf-text-secondary)] block mb-1">Team member</label>
              <select
                value={form.team_member_id}
                onChange={e => setForm({ ...form, team_member_id: e.target.value })}
                className="w-full text-sm border border-[var(--sf-border-light)] rounded-lg px-3 py-2"
              >
                <option value="">Select...</option>
                {teamMembers.map(m => (
                  <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--sf-text-secondary)] block mb-1">Paid by</label>
              <select
                value={form.paid_by}
                onChange={e => setForm({ ...form, paid_by: e.target.value })}
                className="w-full text-sm border border-[var(--sf-border-light)] rounded-lg px-3 py-2"
              >
                {PAID_BY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="reimbursable"
              checked={form.reimbursable_to_team_member}
              onChange={e => setForm({ ...form, reimbursable_to_team_member: e.target.checked })}
              className="rounded"
            />
            <label htmlFor="reimbursable" className="text-sm text-[var(--sf-text-secondary)]">
              Reimbursable to team member
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => { setShowAddForm(false); resetForm() }}
              className="px-3 py-1.5 text-sm border border-[var(--sf-border-light)] rounded-lg hover:bg-white text-[var(--sf-text-secondary)]"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={saving}
              className="px-4 py-1.5 text-sm font-medium bg-[var(--sf-blue-500)] text-white rounded-lg hover:bg-[var(--sf-blue-600)] disabled:opacity-50 flex items-center gap-1"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Save
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="py-8 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-[var(--sf-text-muted)]" />
        </div>
      ) : expenses.length === 0 ? (
        <div className="py-8 text-center text-sm text-[var(--sf-text-muted)] bg-gray-50 rounded-lg">
          No expenses recorded for this job yet.
        </div>
      ) : (
        <div className="border border-[var(--sf-border-light)] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-[var(--sf-border-light)]">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--sf-text-muted)]">Type</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--sf-text-muted)]">Description</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--sf-text-muted)]">Team Member</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--sf-text-muted)]">Paid By</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-[var(--sf-text-muted)]">Amount</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--sf-text-muted)]">Status</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-[var(--sf-text-muted)]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--sf-border-light)]">
              {expenses.map(e => {
                const memberName = e.team_members ? `${e.team_members.first_name || ''} ${e.team_members.last_name || ''}`.trim() : getMemberName(e.team_member_id)
                const isBusy = actionId === e.id
                const isEditing = editingId === e.id

                if (isEditing) {
                  return (
                    <tr key={e.id} className="bg-blue-50/40">
                      <td className="px-3 py-2">
                        <select
                          value={editForm.expense_type}
                          onChange={ev => setEditForm({ ...editForm, expense_type: ev.target.value })}
                          className="w-full text-xs border border-[var(--sf-border-light)] rounded px-2 py-1 bg-white"
                        >
                          {EXPENSE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={editForm.description}
                          onChange={ev => setEditForm({ ...editForm, description: ev.target.value })}
                          placeholder="Description"
                          className="w-full text-xs border border-[var(--sf-border-light)] rounded px-2 py-1 bg-white"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={editForm.team_member_id}
                          onChange={ev => setEditForm({ ...editForm, team_member_id: ev.target.value })}
                          className="w-full text-xs border border-[var(--sf-border-light)] rounded px-2 py-1 bg-white"
                        >
                          <option value="">—</option>
                          {teamMembers.map(m => (
                            <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={editForm.paid_by}
                          onChange={ev => setEditForm({ ...editForm, paid_by: ev.target.value })}
                          className="w-full text-xs border border-[var(--sf-border-light)] rounded px-2 py-1 bg-white"
                        >
                          {PAID_BY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={editForm.amount}
                          onChange={ev => setEditForm({ ...editForm, amount: ev.target.value })}
                          className="w-full text-xs border border-[var(--sf-border-light)] rounded px-2 py-1 text-right bg-white"
                        />
                      </td>
                      <td className="px-3 py-2"><StatusBadge status={e.status} /></td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleSaveEdit(e)}
                            disabled={isBusy}
                            className="p-1 text-green-600 hover:text-green-700 disabled:opacity-30"
                            title="Save changes"
                          >
                            {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={cancelEdit}
                            disabled={isBusy}
                            className="p-1 text-[var(--sf-text-muted)] hover:text-red-600 disabled:opacity-30"
                            title="Cancel"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                }

                return (
                  <tr key={e.id}>
                    <td className="px-3 py-2 capitalize">{e.expense_type}</td>
                    <td className="px-3 py-2 text-[var(--sf-text-secondary)]">{e.description || '—'}</td>
                    <td className="px-3 py-2 text-[var(--sf-text-secondary)]">{memberName || '—'}</td>
                    <td className="px-3 py-2 text-[var(--sf-text-secondary)] capitalize">{e.paid_by.replace('_', ' ')}</td>
                    <td className="px-3 py-2 text-right font-semibold">{fmt(e.amount)}</td>
                    <td className="px-3 py-2"><StatusBadge status={e.status} /></td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {e.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(e)}
                              disabled={isBusy}
                              className="p-1 text-green-600 hover:text-green-700 disabled:opacity-30"
                              title="Approve"
                            >
                              {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => handleReject(e)}
                              disabled={isBusy}
                              className="p-1 text-red-600 hover:text-red-700 disabled:opacity-30"
                              title="Reject"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {e.status === 'approved' && (
                          <button
                            onClick={() => handleReject(e)}
                            disabled={isBusy}
                            className="p-1 text-amber-600 hover:text-amber-700 disabled:opacity-30"
                            title="Reject (removes from ledger if unbatched)"
                          >
                            {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                          </button>
                        )}
                        <button
                          onClick={() => startEdit(e)}
                          disabled={isBusy || editingId !== null}
                          className="p-1 text-[var(--sf-blue-500)] hover:text-[var(--sf-blue-600)] disabled:opacity-30"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(e)}
                          disabled={isBusy}
                          className="p-1 text-[var(--sf-text-muted)] hover:text-red-600 disabled:opacity-30"
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
        </div>
      )}
    </div>
  )
}

import React from 'react'
import { XCircle } from 'lucide-react'

const REASON_LABELS = {
  client_cancelled_late: 'Client cancelled late',
  client_no_show: 'Client no-show',
  locked_out: 'Locked out / no access',
  cleaner_en_route: 'Cleaner already en route',
  other: 'Other',
}

function formatMoney(n) {
  const v = parseFloat(n)
  if (isNaN(v)) return null
  return `$${v.toFixed(2)}`
}

// Shows cancellation details on a cancelled job: fee (with status), reason, notes.
// Cleaner reimbursement shows up through the existing JobExpensesSection — not duplicated here.
export default function CancellationSummary({ job }) {
  if (!job || job.status !== 'cancelled') return null
  const fee = job.cancellation_fee != null && job.cancellation_fee !== '' ? parseFloat(job.cancellation_fee) : null
  const hasFee = fee != null && !isNaN(fee) && fee > 0
  const reason = job.cancellation_reason
  const notes = job.cancellation_notes
  if (!hasFee && !reason && !notes) return null

  const feeStatus = job.cancellation_fee_status || 'pending'
  const feeBadgeColor = feeStatus === 'paid'
    ? 'bg-green-100 text-green-700'
    : feeStatus === 'void'
      ? 'bg-gray-200 text-gray-600'
      : 'bg-amber-100 text-amber-700'

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-red-800 mb-1">Cancellation details</div>
          <div className="space-y-1 text-sm text-[var(--sf-text-secondary)]">
            {hasFee && (
              <div className="flex items-center gap-2 flex-wrap">
                <span>Cancellation fee:</span>
                <span className="font-medium text-[var(--sf-text-primary)]">{formatMoney(fee)}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${feeBadgeColor}`}>{feeStatus}</span>
                <span className="text-xs text-gray-500">(not counted in service revenue)</span>
              </div>
            )}
            {reason && (
              <div>
                <span>Reason:</span>{' '}
                <span className="text-[var(--sf-text-primary)]">{REASON_LABELS[reason] || reason}</span>
              </div>
            )}
            {notes && (
              <div className="pt-1">
                <div className="text-xs text-gray-500">Internal notes</div>
                <div className="text-[var(--sf-text-primary)] whitespace-pre-wrap">{notes}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

"use client"

import React from "react"

/**
 * PaystubPreview — renders a paystub snapshot as a React component.
 * Mirrors the email HTML template layout for consistency.
 *
 * Props:
 *   snapshot: { cleaner, company, period, totals, lineItems, payout }
 */

const fmt = (n) => {
  const v = parseFloat(n) || 0
  return `$${v.toFixed(2)}`
}

const fmtNeg = (n) => {
  const v = parseFloat(n) || 0
  return v < 0 ? `-$${Math.abs(v).toFixed(2)}` : `$${v.toFixed(2)}`
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return String(dateStr)
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function PaystubPreview({ snapshot }) {
  if (!snapshot) return null
  const cleaner = snapshot.cleaner || {}
  const company = snapshot.company || {}
  const period = snapshot.period || {}
  const totals = snapshot.totals || {}
  const lineItems = snapshot.lineItems || []
  const payout = snapshot.payout || {}

  const cleanerName = `${cleaner.firstName || ''} ${cleaner.lastName || ''}`.trim() || 'Team Member'
  const companyName = company.name || 'Service Flow'
  const periodLabel = `${formatDate(period.start)} – ${formatDate(period.end)}`

  return (
    <div className="bg-white rounded-xl border border-[var(--sf-border-light)] overflow-hidden">
      {/* Header */}
      <div className="bg-[var(--sf-blue-500)] text-white px-6 py-4">
        <div className="text-xs uppercase tracking-wider opacity-90">{companyName}</div>
        <div className="text-xl font-bold mt-0.5">Paystub</div>
      </div>

      {/* Body */}
      <div className="p-6">
        <div className="text-sm text-[var(--sf-text-primary)]">
          Hello <strong>{cleanerName}</strong>,
        </div>
        <div className="text-xs text-[var(--sf-text-muted)] mt-1">
          Pay period: <strong className="text-[var(--sf-text-secondary)]">{periodLabel}</strong>
        </div>
        {payout.paidAt && (
          <div className="text-xs text-[var(--sf-text-muted)] mt-1">
            Paid on {formatDate(payout.paidAt)}
          </div>
        )}

        {/* Summary */}
        <h3 className="text-sm font-semibold text-[var(--sf-text-primary)] mt-6 mb-2">Summary</h3>
        <table className="w-full text-sm bg-gray-50 rounded-lg overflow-hidden">
          <tbody>
            <tr>
              <td className="px-4 py-2.5 text-[var(--sf-text-secondary)]">Earnings</td>
              <td className="px-4 py-2.5 text-right font-medium">{fmt(totals.earnings)}</td>
            </tr>
            <tr className="border-t border-gray-200">
              <td className="px-4 py-2.5 text-[var(--sf-text-secondary)]">Tips</td>
              <td className="px-4 py-2.5 text-right font-medium">{fmt(totals.tips)}</td>
            </tr>
            <tr className="border-t border-gray-200">
              <td className="px-4 py-2.5 text-[var(--sf-text-secondary)]">Incentives</td>
              <td className="px-4 py-2.5 text-right font-medium">{fmt(totals.incentives)}</td>
            </tr>
            <tr className="border-t border-gray-200">
              <td className="px-4 py-2.5 text-[var(--sf-text-secondary)]">Reimbursements</td>
              <td className="px-4 py-2.5 text-right font-medium">{fmt(totals.reimbursements)}</td>
            </tr>
            <tr className="border-t border-gray-200">
              <td className="px-4 py-2.5 text-[var(--sf-text-secondary)]">Adjustments</td>
              <td className="px-4 py-2.5 text-right font-medium">{fmtNeg(totals.adjustments)}</td>
            </tr>
            <tr className="border-t border-gray-200">
              <td className="px-4 py-2.5 text-[var(--sf-text-secondary)]">Cash collected</td>
              <td className="px-4 py-2.5 text-right font-medium">{fmtNeg(totals.cashCollected)}</td>
            </tr>
            <tr className="border-t-2 border-[var(--sf-text-primary)]">
              <td className="px-4 py-3 font-bold text-[var(--sf-text-primary)]">Net Paid</td>
              <td className="px-4 py-3 text-right font-bold text-[var(--sf-text-primary)]">{fmt(totals.netPayout)}</td>
            </tr>
          </tbody>
        </table>

        {/* Line items */}
        {lineItems.length > 0 && (
          <>
            <h3 className="text-sm font-semibold text-[var(--sf-text-primary)] mt-6 mb-2">Jobs</h3>
            <div className="border border-[var(--sf-border-light)] rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-[var(--sf-text-muted)] font-semibold">Date</th>
                    <th className="px-3 py-2 text-left text-[var(--sf-text-muted)] font-semibold">Service</th>
                    <th className="px-3 py-2 text-left text-[var(--sf-text-muted)] font-semibold">Customer</th>
                    <th className="px-3 py-2 text-right text-[var(--sf-text-muted)] font-semibold">Earning</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item, idx) => (
                    <tr key={item.jobId || idx} className="border-t border-[var(--sf-border-light)]">
                      <td className="px-3 py-2 text-[var(--sf-text-secondary)]">{formatDate(item.date)}</td>
                      <td className="px-3 py-2 text-[var(--sf-text-secondary)]">{item.service}</td>
                      <td className="px-3 py-2 text-[var(--sf-text-secondary)]">{item.customerName}</td>
                      <td className="px-3 py-2 text-right font-medium">{fmt(item.earning)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <p className="text-xs text-[var(--sf-text-muted)] mt-6">
          If anything looks incorrect, please contact your administrator.
        </p>
      </div>
    </div>
  )
}

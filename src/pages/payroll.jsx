"use client"

import React, { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import {
  ChevronLeft, Calendar, DollarSign, Clock, Users, Download, Filter,
  AlertCircle, ChevronDown, ChevronRight, Plus, Minus, CreditCard,
  Check, X, ArrowUpDown, BookOpen, Banknote, ClipboardCopy, Pencil
} from "lucide-react"
import { payrollAPI, ledgerAPI, teamAPI } from "../services/api"
import api from "../services/api"
import { useAuth } from "../context/AuthContext"
import Sidebar from "../components/sidebar"
import MobileHeader from "../components/mobile-header"

// Inline editable cell with pen icon → input + save/cancel
const EditableCell = ({ value, onSave, format = 'number', placeholder = '-' }) => {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const display = format === 'hours'
    ? (value > 0 ? parseFloat(value.toFixed(1)) : '0')
    : (value > 0 ? `$${value.toFixed(0)}` : placeholder)

  const startEdit = (e) => {
    e.stopPropagation()
    setDraft(value > 0 ? (format === 'hours' ? parseFloat(value.toFixed(1)) : value.toFixed(0)) : '')
    setEditing(true)
  }
  const cancel = (e) => { e.stopPropagation(); setEditing(false) }
  const save = async (e) => {
    e.stopPropagation()
    const val = parseFloat(draft) || 0
    if (val === (value || 0)) { setEditing(false); return }
    setSaving(true)
    try { await onSave(val); } catch (err) { console.error('Save failed:', err) }
    setSaving(false)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="flex items-center justify-end gap-0.5" onClick={e => e.stopPropagation()}>
        <input
          type="text" inputMode="decimal" autoFocus
          className="w-12 text-right bg-white border border-[var(--sf-text-active)] rounded px-1 py-0 text-xs focus:outline-none"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') save(e); if (e.key === 'Escape') cancel(e) }}
          disabled={saving}
        />
        <button onClick={save} disabled={saving} className="p-0.5 text-green-600 hover:text-green-800"><Check size={12} /></button>
        <button onClick={cancel} className="p-0.5 text-red-500 hover:text-red-700"><X size={12} /></button>
      </div>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 group">
      <span>{display}</span>
      <Pencil size={10} className="text-[var(--sf-text-muted)] opacity-0 group-hover:opacity-100 cursor-pointer" onClick={startEdit} />
    </span>
  )
}

const toLocalDateString = (d) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const TYPE_LABELS = {
  earning: 'Earning',
  tip: 'Tip',
  incentive: 'Incentive',
  cash_collected: 'Cash Collected',
  cash_to_company: 'Cash to Company',
  adjustment: 'Adjustment',
  payout: 'Payout'
}

const TYPE_COLORS = {
  earning: 'bg-green-100 text-green-800',
  tip: 'bg-blue-100 text-blue-800',
  incentive: 'bg-purple-100 text-purple-800',
  cash_collected: 'bg-orange-100 text-orange-800',
  cash_to_company: 'bg-cyan-100 text-cyan-800',
  adjustment: 'bg-yellow-100 text-yellow-800',
  payout: 'bg-[var(--sf-bg-page)] text-[var(--sf-text-primary)]'
}

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0)
}

const formatDate = (dateString) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

const formatShortDate = (dateString) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const QUICK_RANGES = [
  { id: 'today', label: 'Today' },
  { id: 'this_week', label: 'This Week' },
  { id: 'this_period', label: 'This Pay Period' },
  { id: 'last_period', label: 'Last Pay Period' },
  { id: 'this_month', label: 'This Month' },
  { id: 'last_month', label: 'Last Month' },
  { id: 'last_year', label: 'Last Year' },
  { id: 'all_time', label: 'All Time' },
  { id: 'custom', label: 'Custom Range' },
]

// payoutFrequency: 'daily'|'weekly'|'biweekly'|'manual', startDay: 0-6 (day of week, 0=Sun, 1=Mon)
const getQuickRange = (rangeId, payoutFrequency, startDay = 1) => {
  const now = new Date()
  const today = toLocalDateString(now)
  const dow = now.getDay() // 0=Sun

  // Helper: get most recent occurrence of a day-of-week on or before today
  const lastOccurrence = (dayOfWeek) => {
    const d = new Date(now)
    const diff = (dow - dayOfWeek + 7) % 7
    d.setDate(d.getDate() - diff)
    return d
  }

  switch (rangeId) {
    case 'today':
      return { start: today, end: today }
    case 'this_week': {
      const d = lastOccurrence(startDay)
      return { start: toLocalDateString(d), end: today }
    }
    case 'this_period': {
      if (payoutFrequency === 'daily') {
        return { start: today, end: today }
      } else if (payoutFrequency === 'weekly') {
        const d = lastOccurrence(startDay)
        const endD = new Date(d); endD.setDate(endD.getDate() + 6)
        return { start: toLocalDateString(d), end: toLocalDateString(endD) }
      } else if (payoutFrequency === 'biweekly') {
        const d = lastOccurrence(startDay)
        const daysAgo = Math.floor((now - d) / (1000 * 60 * 60 * 24))
        if (daysAgo >= 7) {
          d.setDate(d.getDate() - 7)
        }
        const endD = new Date(d); endD.setDate(endD.getDate() + 13)
        return { start: toLocalDateString(d), end: toLocalDateString(endD) }
      } else {
        // manual / monthly — use 1st to last day of month
        const d = new Date(now); d.setDate(1)
        const endD = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        return { start: toLocalDateString(d), end: toLocalDateString(endD) }
      }
    }
    case 'last_period': {
      if (payoutFrequency === 'daily') {
        const d = new Date(now); d.setDate(d.getDate() - 1)
        const yesterday = toLocalDateString(d)
        return { start: yesterday, end: yesterday }
      } else if (payoutFrequency === 'weekly') {
        const thisStart = lastOccurrence(startDay)
        const prevEnd = new Date(thisStart); prevEnd.setDate(prevEnd.getDate() - 1)
        const prevStart = new Date(thisStart); prevStart.setDate(prevStart.getDate() - 7)
        return { start: toLocalDateString(prevStart), end: toLocalDateString(prevEnd) }
      } else if (payoutFrequency === 'biweekly') {
        const thisStart = lastOccurrence(startDay)
        const daysAgo = Math.floor((now - thisStart) / (1000 * 60 * 60 * 24))
        const periodStart = new Date(thisStart)
        if (daysAgo >= 7) periodStart.setDate(periodStart.getDate() - 7)
        const prevEnd = new Date(periodStart); prevEnd.setDate(prevEnd.getDate() - 1)
        const prevStart = new Date(periodStart); prevStart.setDate(prevStart.getDate() - 14)
        return { start: toLocalDateString(prevStart), end: toLocalDateString(prevEnd) }
      } else {
        // manual / monthly
        const d = new Date(now); d.setMonth(d.getMonth() - 1); d.setDate(1)
        const end = new Date(now.getFullYear(), now.getMonth(), 0)
        return { start: toLocalDateString(d), end: toLocalDateString(end) }
      }
    }
    case 'this_month': {
      const d = new Date(now); d.setDate(1)
      const endD = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      return { start: toLocalDateString(d), end: toLocalDateString(endD) }
    }
    case 'last_month': {
      const d = new Date(now.getFullYear(), now.getMonth() - 1, 1) // 1st of prev month
      const endD = new Date(now.getFullYear(), now.getMonth(), 0) // last day of prev month
      return { start: toLocalDateString(d), end: toLocalDateString(endD) }
    }
    case 'last_year': {
      const d = new Date(now.getFullYear() - 1, 0, 1)
      const endD = new Date(now.getFullYear() - 1, 11, 31)
      return { start: toLocalDateString(d), end: toLocalDateString(endD) }
    }
    case 'all_time':
      return { start: '', end: '' }
    default:
      return null
  }
}

const QuickTimeFilter = ({ activeRange, onSelect, startDate, endDate, onStartChange, onEndChange, onApply, payoutFrequency = 'manual', payoutStartDay = 1 }) => (
  <div className="flex flex-wrap items-center gap-2">
    {QUICK_RANGES.map(r => (
      <button
        key={r.id}
        onClick={() => {
          if (r.id === 'custom') {
            onSelect('custom')
          } else {
            const range = getQuickRange(r.id, payoutFrequency, payoutStartDay)
            if (range) {
              onStartChange(range.start)
              onEndChange(range.end)
              onSelect(r.id)
              if (onApply) onApply(range.start, range.end)
            }
          }
        }}
        style={{
          padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 500, cursor: 'pointer',
          border: activeRange === r.id ? '1.5px solid var(--sf-blue-500)' : '1.5px solid var(--sf-border-light)',
          background: activeRange === r.id ? 'var(--sf-blue-50)' : 'white',
          color: activeRange === r.id ? 'var(--sf-blue-500)' : 'var(--sf-text-secondary)',
          boxShadow: 'none',
        }}
      >
        {r.label}
      </button>
    ))}
    {activeRange === 'custom' && (
      <div className="flex items-center gap-2 ml-1">
        <input type="date" value={startDate} onChange={e => onStartChange(e.target.value)}
          className="border rounded-lg px-2 py-1 text-xs" />
        <span className="text-xs text-[var(--sf-text-muted)]">to</span>
        <input type="date" value={endDate} onChange={e => onEndChange(e.target.value)}
          className="border rounded-lg px-2 py-1 text-xs" />
      </div>
    )}
  </div>
)

const Payroll = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('payroll')

  // ── Payroll tab state ──
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [payrollData, setPayrollData] = useState(null)
  const [error, setError] = useState("")
  const [payrollAllTime, setPayrollAllTime] = useState(false)
  const [payrollQuickRange, setPayrollQuickRange] = useState('this_period')
  const [payrollOnlyWithEarnings, setPayrollOnlyWithEarnings] = useState(true)
  const [payrollJobFilter, setPayrollJobFilter] = useState('completed') // 'completed' or 'all'
  const [startDate, setStartDate] = useState(() => {
    const date = new Date(); date.setDate(1); return toLocalDateString(date)
  })
  const [endDate, setEndDate] = useState(() => toLocalDateString(new Date()))
  const [selectedMemberId, setSelectedMemberId] = useState('all')
  const [expandedMembers, setExpandedMembers] = useState(new Set())

  // ── Balances tab state ──
  const [balances, setBalances] = useState([])
  const [balancesTotalUniqueJobs, setBalancesTotalUniqueJobs] = useState(0)
  const [balancesLoading, setBalancesLoading] = useState(false)
  const [balancesAllTime, setBalancesAllTime] = useState(true)
  const [balancesQuickRange, setBalancesQuickRange] = useState('this_period')
  const [balancesStartDate, setBalancesStartDate] = useState(() => {
    const d = new Date(); d.setDate(1); return toLocalDateString(d)
  })
  const [balancesEndDate, setBalancesEndDate] = useState(() => toLocalDateString(new Date()))
  const [showOnlyWithEarnings, setShowOnlyWithEarnings] = useState(true)
  const [backfillLoading, setBackfillLoading] = useState(false)
  const [backfillResult, setBackfillResult] = useState(null)
  const [backfillPreview, setBackfillPreview] = useState(null)
  const [backfillProgress, setBackfillProgress] = useState(0)
  const [backfillProcessed, setBackfillProcessed] = useState(0)
  const [backfillTotal, setBackfillTotal] = useState(0)
  const [backfillPhase, setBackfillPhase] = useState('')

  // ── Cash modal type state ──
  const [cashType, setCashType] = useState('paid_in_cash') // 'paid_in_cash' or 'cash_to_company'

  // ── Ledger entries tab state ──
  const [entries, setEntries] = useState([])
  const [entriesTotal, setEntriesTotal] = useState(0)
  const [entriesPage, setEntriesPage] = useState(1)
  const [entriesLoading, setEntriesLoading] = useState(false)
  const [filterMember, setFilterMember] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterPayoutStatus, setFilterPayoutStatus] = useState('')
  const [ledgerQuickRange, setLedgerQuickRange] = useState('this_period')
  const [filterStartDate, setFilterStartDate] = useState(() => {
    const d = new Date(); d.setDate(1); return toLocalDateString(d)
  })
  const [filterEndDate, setFilterEndDate] = useState(() => toLocalDateString(new Date()))

  // ── Payouts tab state ──
  const [payoutsQuickRange, setPayoutsQuickRange] = useState('this_period')
  const [payoutsStartDate, setPayoutsStartDate] = useState(() => { const d = new Date(); d.setDate(1); return toLocalDateString(d) })
  const [payoutsEndDate, setPayoutsEndDate] = useState(() => toLocalDateString(new Date()))
  const [batches, setBatches] = useState([])
  const [batchesLoading, setBatchesLoading] = useState(false)
  const [expandedBatch, setExpandedBatch] = useState(null)
  const [batchDetail, setBatchDetail] = useState(null)

  // ── Shared state ──
  const [teamMembers, setTeamMembers] = useState([])
  const [payoutFrequency, setPayoutFrequency] = useState('manual')
  const [payoutStartDay, setPayoutStartDay] = useState(1)

  // ── Modals ──
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false)
  const [showPayoutModal, setShowPayoutModal] = useState(false)
  const [showCashModal, setShowCashModal] = useState(false)
  const [modalLoading, setModalLoading] = useState(false)
  const [modalError, setModalError] = useState('')

  // Adjustment form
  const [adjTeamMember, setAdjTeamMember] = useState('')
  const [adjAmount, setAdjAmount] = useState('')
  const [adjDirection, setAdjDirection] = useState('positive')
  const [adjNote, setAdjNote] = useState('')
  const [adjJobId, setAdjJobId] = useState('')

  // Payout form
  const [payTeamMember, setPayTeamMember] = useState('')
  const [payPeriodStart, setPayPeriodStart] = useState('')
  const [payPeriodEnd, setPayPeriodEnd] = useState('')
  const [payNote, setPayNote] = useState('')

  // Cash form
  const [cashTeamMember, setCashTeamMember] = useState('')
  const [cashAmount, setCashAmount] = useState('')
  const [cashJobId, setCashJobId] = useState('')
  const [cashNote, setCashNote] = useState('')

  const [copiedPayroll, setCopiedPayroll] = useState(false)
  const [copiedBalances, setCopiedBalances] = useState(false)

  const copyPayrollTable = () => {
    if (!payrollData?.teamMembers) return
    const header = ['Name', 'Role', 'Pay Method', 'Jobs', 'Hours', 'Total', 'Hourly Salary', 'Commission', 'Tips', 'Incentives', 'Total Salary'].join('\t')
    const rows = (payrollData.teamMembers || []).map(m => [
      m.teamMember.name,
      m.teamMember.role || '',
      [m.teamMember.commissionPercentage ? `${m.teamMember.commissionPercentage}%` : '', m.teamMember.hourlyRate ? `$${m.teamMember.hourlyRate}/hr` : ''].filter(Boolean).join(' + ') || 'Not set',
      m.jobCount,
      m.totalHours.toFixed(1),
      (m.totalJobRevenue || 0).toFixed(2),
      (m.hourlySalary || 0).toFixed(2),
      (m.commissionSalary || 0).toFixed(2),
      (m.totalTips || 0).toFixed(2),
      (m.totalIncentives || 0).toFixed(2),
      (m.totalSalary || 0).toFixed(2)
    ].join('\t'))
    navigator.clipboard.writeText([header, ...rows].join('\n'))
    setCopiedPayroll(true)
    setTimeout(() => setCopiedPayroll(false), 2000)
  }

  const copyBalancesTable = () => {
    if (!balances.length) return
    const header = ['Name', 'Role', 'Jobs', 'Balance', 'Earnings', 'Tips', 'Incentives', 'Cash Offset', 'Adjustments', 'Schedule'].join('\t')
    const rows = balances.map(b => [
      b.name || `ID ${b.team_member_id}`,
      b.role || '',
      b.job_count || 0,
      (b.current_balance || 0).toFixed(2),
      (b.unpaid_earnings || 0).toFixed(2),
      (b.unpaid_tips || 0).toFixed(2),
      (b.unpaid_incentives || 0).toFixed(2),
      (b.unpaid_cash_offsets || 0).toFixed(2),
      (b.unpaid_adjustments || 0).toFixed(2),
      b.payout_schedule || 'manual'
    ].join('\t'))
    navigator.clipboard.writeText([header, ...rows].join('\n'))
    setCopiedBalances(true)
    setTimeout(() => setCopiedBalances(false), 2000)
  }

  // ── Data fetchers ──

  const fetchPayrollData = async (overrideStart, overrideEnd) => {
    if (!user?.id) return
    try {
      if (!payrollData) setLoading(true)
      else setRefreshing(true)
      setError("")
      const s = overrideStart !== undefined ? overrideStart : startDate
      const e = overrideEnd !== undefined ? overrideEnd : endDate
      const data = payrollAllTime
        ? await payrollAPI.getPayroll('', '', payrollJobFilter)
        : await payrollAPI.getPayroll(s, e, payrollJobFilter)
      setPayrollData(data)
    } catch (err) {
      console.error('Error fetching payroll data:', err)
      setError(err.response?.data?.error || 'Failed to load payroll data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const fetchTeamMembers = useCallback(async () => {
    if (!user?.id) return
    try {
      const data = await teamAPI.getAll(user.id, { status: 'active' })
      setTeamMembers(data.teamMembers || data || [])
    } catch (err) {
      console.error('Error fetching team members:', err)
    }
  }, [user?.id])

  const fetchBalances = useCallback(async (overrideStart, overrideEnd) => {
    try {
      setBalancesLoading(true)
      const params = {}
      const s = overrideStart !== undefined ? overrideStart : balancesStartDate
      const e = overrideEnd !== undefined ? overrideEnd : balancesEndDate
      if (s) params.startDate = s
      if (e) params.endDate = e
      console.log('📊 fetchBalances params:', JSON.stringify(params), 'overrides:', overrideStart, overrideEnd, 'state:', balancesStartDate, balancesEndDate)
      const data = await ledgerAPI.getBalances(params)
      console.log('📊 fetchBalances response entries:', Array.isArray(data) ? data.length : data?.balances?.length, 'total:', Array.isArray(data) ? data.reduce((s,b) => s + (b.current_balance||0), 0) : '?')
      // Handle both old format (array) and new format ({ balances, totalUniqueJobs })
      if (Array.isArray(data)) {
        setBalances(data)
        setBalancesTotalUniqueJobs(0)
      } else {
        setBalances(data.balances || [])
        setBalancesTotalUniqueJobs(data.totalUniqueJobs || 0)
      }
    } catch (err) {
      console.error('Error fetching balances:', err)
    } finally {
      setBalancesLoading(false)
    }
  }, [balancesStartDate, balancesEndDate])

  const fetchEntries = useCallback(async () => {
    try {
      setEntriesLoading(true)
      const data = await ledgerAPI.getEntries({
        teamMemberId: filterMember || undefined,
        startDate: filterStartDate || undefined,
        endDate: filterEndDate || undefined,
        type: filterType || undefined,
        payoutStatus: filterPayoutStatus || undefined,
        page: entriesPage,
        limit: 50
      })
      setEntries(data.entries || [])
      setEntriesTotal(data.total || 0)
    } catch (err) {
      console.error('Error fetching entries:', err)
    } finally {
      setEntriesLoading(false)
    }
  }, [filterMember, filterStartDate, filterEndDate, filterType, filterPayoutStatus, entriesPage])

  const fetchBatches = useCallback(async () => {
    try {
      setBatchesLoading(true)
      const data = await ledgerAPI.getPayoutBatches()
      setBatches(data.batches || [])
    } catch (err) {
      console.error('Error fetching batches:', err)
    } finally {
      setBatchesLoading(false)
    }
  }, [])

  // ── Load payout settings and apply date range ──
  const loadPayoutSettings = useCallback((activeRange) => {
    if (!user?.id) return
    api.get('/user/payout-settings').then(res => {
      const d = res.data || {}
      const freq = d.payout_frequency || 'manual'
      const day = d.pay_period_start_day ?? 1
      setPayoutFrequency(freq)
      setPayoutStartDay(day)
      // Recalculate using the currently active quick range (not always 'this_period')
      const rangeId = activeRange || payrollQuickRange || 'this_period'
      if (rangeId === 'custom') { fetchPayrollData(); return }
      const range = getQuickRange(rangeId, freq, day)
      if (range) {
        setStartDate(range.start)
        setEndDate(range.end)
        setBalancesStartDate(range.start)
        setBalancesEndDate(range.end)
        setBalancesAllTime(false)
        setFilterStartDate(range.start)
        setFilterEndDate(range.end)
        setPayoutsStartDate(range.start)
        setPayoutsEndDate(range.end)
      }
      fetchPayrollData(range?.start, range?.end)
    }).catch(() => {
      fetchPayrollData()
    })
  }, [user?.id, payrollQuickRange])

  // ── Initial load ──
  useEffect(() => {
    if (user?.id) {
      fetchTeamMembers()
      loadPayoutSettings()
    }
  }, [user?.id])

  // ── Re-fetch settings when page regains focus (e.g. after changing settings) ──
  useEffect(() => {
    const onFocus = () => {
      if (!user?.id) return
      // Only update frequency/day — don't override current date range
      api.get('/user/payout-settings').then(res => {
        const d = res.data || {}
        setPayoutFrequency(d.payout_frequency || 'manual')
        setPayoutStartDay(d.pay_period_start_day ?? 1)
      }).catch(() => {})
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [user?.id])

  // ── Auto-refetch when job filter changes (dates handled by loadPayoutSettings and quick range buttons) ──
  useEffect(() => {
    if (user?.id && activeTab === 'payroll' && payoutFrequency !== 'manual') {
      fetchPayrollData()
    }
  }, [payrollJobFilter])

  // Auto-refetch balances removed — onApply handles it directly

  // ── Tab-driven fetches ──
  useEffect(() => {
    if (activeTab === 'balances' && user?.id) {
      fetchBalances(balancesStartDate || undefined, balancesEndDate || undefined)
    }
  }, [activeTab, user?.id])

  useEffect(() => {
    if (activeTab === 'ledger') fetchEntries()
  }, [activeTab, fetchEntries])

  useEffect(() => {
    if (activeTab === 'payouts') fetchBatches()
  }, [activeTab, fetchBatches])

  // ── Handlers ──

  const handleCreateAdjustment = async () => {
    if (!adjTeamMember || !adjAmount || !adjNote.trim()) {
      setModalError('Team member, amount, and note are required'); return
    }
    setModalLoading(true); setModalError('')
    try {
      const amount = adjDirection === 'negative' ? -Math.abs(parseFloat(adjAmount)) : Math.abs(parseFloat(adjAmount))
      await ledgerAPI.createAdjustment({ teamMemberId: adjTeamMember, amount, note: adjNote, jobId: adjJobId || undefined })
      setShowAdjustmentModal(false)
      setAdjTeamMember(''); setAdjAmount(''); setAdjNote(''); setAdjJobId('')
      if (activeTab === 'balances') fetchBalances()
      if (activeTab === 'ledger') fetchEntries()
    } catch (err) {
      setModalError(err.response?.data?.error || 'Failed to create adjustment')
    } finally { setModalLoading(false) }
  }

  const handleRecordCash = async () => {
    if (!cashTeamMember || !cashAmount) {
      setModalError('Team member and amount are required'); return
    }
    setModalLoading(true); setModalError('')
    try {
      if (cashType === 'cash_to_company') {
        await ledgerAPI.recordCashToCompany({ teamMemberId: cashTeamMember, amount: parseFloat(cashAmount), note: cashNote || undefined, jobId: cashJobId || undefined })
      } else {
        await ledgerAPI.recordCashCollected({ teamMemberId: cashTeamMember, amount: parseFloat(cashAmount), note: cashNote || undefined, jobId: cashJobId || undefined })
      }
      setShowCashModal(false)
      setCashTeamMember(''); setCashAmount(''); setCashNote(''); setCashJobId(''); setCashType('paid_in_cash')
      if (activeTab === 'balances') fetchBalances()
      if (activeTab === 'ledger') fetchEntries()
    } catch (err) {
      setModalError(err.response?.data?.error || 'Failed to record cash')
    } finally { setModalLoading(false) }
  }

  const handleCreatePayout = async () => {
    if (!payTeamMember || !payPeriodStart || !payPeriodEnd) {
      setModalError('Team member and period dates are required'); return
    }
    setModalLoading(true); setModalError('')
    try {
      await ledgerAPI.createPayoutBatch({ teamMemberId: payTeamMember, periodStart: payPeriodStart, periodEnd: payPeriodEnd, note: payNote || undefined })
      setShowPayoutModal(false)
      setPayTeamMember(''); setPayPeriodStart(''); setPayPeriodEnd(''); setPayNote('')
      fetchBatches(); fetchBalances()
    } catch (err) {
      setModalError(err.response?.data?.error || 'Failed to create payout batch')
    } finally { setModalLoading(false) }
  }

  const handleMarkPaid = async (batchId) => {
    if (!window.confirm('Mark this payout batch as paid?')) return
    try { await ledgerAPI.markBatchPaid(batchId); fetchBatches(); fetchBalances() }
    catch (err) { alert(err.response?.data?.error || 'Failed to mark batch as paid') }
  }

  const handleCancelBatch = async (batchId) => {
    if (!window.confirm('Cancel this payout batch? Entries will become unpaid again.')) return
    try { await ledgerAPI.cancelBatch(batchId); fetchBatches(); fetchBalances() }
    catch (err) { alert(err.response?.data?.error || 'Failed to cancel batch') }
  }

  const handleViewBatch = async (batchId) => {
    if (expandedBatch === batchId) { setExpandedBatch(null); setBatchDetail(null); return }
    try {
      const data = await ledgerAPI.getPayoutBatch(batchId)
      setBatchDetail(data); setExpandedBatch(batchId)
    } catch (err) { console.error('Error fetching batch detail:', err) }
  }

  const handleBackfillPreview = async () => {
    setBackfillLoading(true)
    setBackfillResult(null)
    setBackfillProgress(0)
    try {
      const preview = await ledgerAPI.backfill({ dryRun: true })
      setBackfillPreview(preview)
    } catch (err) { alert(err.response?.data?.error || 'Failed to check backfill status') }
    finally { setBackfillLoading(false) }
  }

  const startBackfillPolling = () => {
    const interval = setInterval(async () => {
      try {
        const progress = await ledgerAPI.getBackfillProgress()
        if (progress.status === 'processing') {
          setBackfillProcessed(progress.processed || 0)
          setBackfillTotal(progress.total || 0)
          setBackfillPhase(progress.phase || 'jobs')
          const pct = progress.total > 0 ? Math.round((progress.processed / progress.total) * 100) : 0
          setBackfillProgress(progress.phase === 'manager_salary' ? Math.max(pct, 95) : pct)
        } else if (progress.status === 'complete' || progress.status === 'error') {
          clearInterval(interval)
        }
      } catch { /* ignore polling errors */ }
    }, 1500)
    return interval
  }

  const handleBackfillRun = async () => {
    setBackfillLoading(true)
    setBackfillProgress(0)
    setBackfillProcessed(0)
    setBackfillTotal(backfillPreview?.would_process || 0)
    setBackfillPhase('jobs')
    setBackfillPreview(null)
    setBackfillResult(null)
    try {
      await ledgerAPI.backfill({ dryRun: false })
      // Response is immediate — backfill runs in background. Poll until complete.
      const interval = setInterval(async () => {
        try {
          const progress = await ledgerAPI.getBackfillProgress()
          setBackfillProcessed(progress.processed || 0)
          setBackfillTotal(progress.total || 0)
          setBackfillPhase(progress.phase || 'jobs')
          const pct = progress.total > 0 ? Math.round((progress.processed / progress.total) * 100) : 0
          setBackfillProgress(progress.phase === 'manager_salary' ? Math.max(pct, 95) : progress.phase === 'done' ? 100 : pct)
          if (progress.status === 'complete' || progress.status === 'error') {
            clearInterval(interval)
            setBackfillProgress(100)
            setBackfillResult({ message: 'Backfill complete', processed: progress.processed, errors: progress.errors, manager_salary_entries: progress.manager_salary_entries })
            setBackfillLoading(false)
            fetchBalances()
          }
        } catch { /* ignore polling errors */ }
      }, 2000)
    } catch (err) {
      setBackfillProgress(0)
      setBackfillLoading(false)
      alert(err.response?.data?.error || 'Backfill failed')
    }
  }

  const handleBackfillReset = async () => {
    if (!window.confirm('This will delete all existing ledger entries (except payouts) and re-create them. Continue?')) return
    setBackfillLoading(true)
    setBackfillProgress(0)
    setBackfillProcessed(0)
    setBackfillTotal(0)
    setBackfillPhase('jobs')
    setBackfillPreview(null)
    setBackfillResult(null)
    try {
      await ledgerAPI.backfill({ dryRun: false, resetExisting: true })
      const interval = setInterval(async () => {
        try {
          const progress = await ledgerAPI.getBackfillProgress()
          setBackfillProcessed(progress.processed || 0)
          setBackfillTotal(progress.total || 0)
          setBackfillPhase(progress.phase || 'jobs')
          const pct = progress.total > 0 ? Math.round((progress.processed / progress.total) * 100) : 0
          setBackfillProgress(progress.phase === 'manager_salary' ? Math.max(pct, 95) : progress.phase === 'done' ? 100 : pct)
          if (progress.status === 'complete' || progress.status === 'error') {
            clearInterval(interval)
            setBackfillProgress(100)
            setBackfillResult({ message: 'Backfill complete', processed: progress.processed, errors: progress.errors, manager_salary_entries: progress.manager_salary_entries })
            setBackfillLoading(false)
            fetchBalances()
          }
        } catch { /* ignore polling errors */ }
      }, 2000)
    } catch (err) {
      setBackfillProgress(0)
      setBackfillLoading(false)
      alert(err.response?.data?.error || 'Backfill reset failed')
    }
  }

  const handleExport = () => {
    if (!payrollData) return
    let csv = 'Team Member,Role,Job Count,Hours Worked,Job Revenue,Hourly Rate,Commission %,Commission Revenue Base,Hourly Salary,Commission,Tips,Incentives,Total Salary,Payment Method\n'
    filteredMembers.forEach(member => {
      const hourlyRate = member.teamMember.hourlyRate ? formatCurrency(member.teamMember.hourlyRate) : 'N/A'
      const commissionPct = member.teamMember.commissionPercentage ? `${member.teamMember.commissionPercentage}%` : 'N/A'
      csv += `"${member.teamMember.name}","${member.teamMember.role || 'Service Provider'}",${member.jobCount},${member.totalHours},${formatCurrency(member.totalJobRevenue || 0)},${hourlyRate},${commissionPct},${formatCurrency(member.commissionRevenueBase || 0)},${formatCurrency(member.hourlySalary || 0)},${formatCurrency(member.commissionSalary || 0)},${formatCurrency(member.totalTips || 0)},${formatCurrency(member.totalIncentives || 0)},${formatCurrency(member.totalSalary)},${member.paymentMethod || 'none'}\n`
    })
    csv += `\nSummary\n`
    csv += `Total Business Revenue,${formatCurrency(payrollData?.totalBusinessRevenue || 0)}\n`
    csv += `Total Team Members,${filteredSummary.totalTeamMembers}\n`
    csv += `Total Hours,${filteredSummary.totalHours}\n`
    csv += `Total Job Revenue,${formatCurrency(filteredSummary.totalJobRevenue || 0)}\n`
    csv += `Total Hourly Salary,${formatCurrency(filteredSummary.totalHourlySalary || 0)}\n`
    csv += `Total Commission,${formatCurrency(filteredSummary.totalCommission || 0)}\n`
    csv += `Total Tips,${formatCurrency(filteredSummary.totalTips || 0)}\n`
    csv += `Total Incentives,${formatCurrency(filteredSummary.totalIncentives || 0)}\n`
    csv += `Total Salary,${formatCurrency(filteredSummary.totalSalary)}\n`
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `payroll-${startDate}-to-${endDate}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  const toggleExpanded = (memberId) => {
    setExpandedMembers(prev => {
      const next = new Set(prev)
      if (next.has(memberId)) next.delete(memberId)
      else next.add(memberId)
      return next
    })
  }

  // ── Payroll computed values ──
  const filteredMembers = (payrollData?.teamMembers?.filter(
    m => selectedMemberId === 'all' || String(m.teamMember.id) === String(selectedMemberId)
  ) || []).filter(m => !payrollOnlyWithEarnings || (m.totalSalary || 0) > 0 || (m.jobCount || 0) > 0)

  const filteredSummary = payrollData ? (selectedMemberId === 'all' ? payrollData.summary : {
    totalTeamMembers: filteredMembers.length,
    totalHours: parseFloat(filteredMembers.reduce((s, m) => s + (m.totalHours || 0), 0).toFixed(2)),
    totalScheduledHours: parseFloat(filteredMembers.reduce((s, m) => s + (m.scheduledHours || 0), 0).toFixed(2)),
    totalScheduledHourlySalary: parseFloat(filteredMembers.reduce((s, m) => s + (m.scheduledHourlySalary || 0), 0).toFixed(2)),
    totalJobRevenue: parseFloat(filteredMembers.filter(m => !m.isManagerOrOwner).reduce((s, m) => s + (m.totalJobRevenue || 0), 0).toFixed(2)),
    totalHourlySalary: parseFloat(filteredMembers.reduce((s, m) => s + (m.hourlySalary || 0), 0).toFixed(2)),
    totalCommission: parseFloat(filteredMembers.reduce((s, m) => s + (m.commissionSalary || 0), 0).toFixed(2)),
    totalTips: parseFloat(filteredMembers.reduce((s, m) => s + (m.totalTips || 0), 0).toFixed(2)),
    totalIncentives: parseFloat(filteredMembers.reduce((s, m) => s + (m.totalIncentives || 0), 0).toFixed(2)),
    totalSalary: parseFloat(filteredMembers.reduce((s, m) => s + (m.totalSalary || 0), 0).toFixed(2)),
    totalJobCount: filteredMembers.reduce((s, m) => s + (m.jobCount || 0), 0),
  }) : null

  const totalUnpaidBalance = balances.reduce((sum, b) => sum + (b.current_balance || 0), 0)

  // ── Tabs ──
  const tabs = [
    { id: 'payroll', label: 'Payroll', icon: DollarSign },
    { id: 'balances', label: 'Balances', icon: Users },
    { id: 'payouts', label: 'Payouts', icon: Banknote },
    { id: 'ledger', label: 'Ledger', icon: BookOpen }
  ]

  if (loading) {
    return (
      <div className="flex h-screen bg-[var(--sf-bg-page)]">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-[var(--sf-text-secondary)]">Loading payroll data...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-[var(--sf-bg-page)] overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-auto">
        <MobileHeader pageTitle="Payroll" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <button onClick={() => navigate('/team')} className="p-2 hover:bg-[var(--sf-bg-hover)] rounded-lg transition-colors">
                  <ChevronLeft className="w-5 h-5 text-[var(--sf-text-secondary)]" />
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-[var(--sf-text-primary)]">Payroll</h1>
                  <p className="text-sm text-[var(--sf-text-muted)] mt-1">Calculate salaries, track balances, and manage payouts</p>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                {activeTab === 'payroll' && (
                  <button onClick={handleExport} disabled={!payrollData || filteredMembers.length === 0}
                    className="bg-white border border-[var(--sf-border-light)] rounded-lg px-4 py-2 text-sm font-medium text-[var(--sf-text-secondary)] hover:bg-[var(--sf-bg-hover)] disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center">
                    <Download className="w-4 h-4 mr-2" /> Export CSV
                  </button>
                )}
                {(activeTab === 'balances' || activeTab === 'ledger' || activeTab === 'payouts') && (
                  <>
                    <button onClick={() => { setShowCashModal(true); setModalError('') }}
                      className="px-3 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 flex items-center gap-1">
                      <Banknote size={16} /> Cash
                    </button>
                    <button onClick={() => { setShowAdjustmentModal(true); setModalError('') }}
                      className="px-3 py-2 text-sm bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 flex items-center gap-1">
                      <ArrowUpDown size={16} /> Adjust
                    </button>
                    <button onClick={() => { setShowPayoutModal(true); setModalError('') }}
                      className="px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-1">
                      <CreditCard size={16} /> Payout
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-[var(--sf-bg-page)] p-1 rounded-lg w-fit">
              {tabs.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === tab.id ? 'bg-white text-[var(--sf-text-primary)] shadow-sm' : 'text-[var(--sf-text-muted)] hover:text-[var(--sf-text-primary)]'
                  }`}>
                  <tab.icon size={16} /> {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Error Message */}
          {error && activeTab === 'payroll' && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4 rounded">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
            </div>
          )}

          {/* ═══════════════ PAYROLL TAB ═══════════════ */}
          {activeTab === 'payroll' && payrollData && (
            <div>
              {/* Filters */}
              <div className="bg-white rounded-xl border border-[var(--sf-border-light)] shadow-sm p-4 mb-6">
                <div className="flex flex-col space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Filter className="w-4 h-4 text-[var(--sf-text-muted)]" />
                      <span className="text-sm font-medium text-[var(--sf-text-primary)]">Filters:</span>
                    </div>
                    <button onClick={fetchPayrollData} disabled={refreshing}
                      className="sf-btn-primary px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2">
                      {refreshing && <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>}
                      Apply
                    </button>
                  </div>
                  <QuickTimeFilter
                    payoutFrequency={payoutFrequency} payoutStartDay={payoutStartDay}
                    activeRange={payrollQuickRange}
                    onSelect={(id) => { setPayrollQuickRange(id); setPayrollAllTime(id === 'all_time') }}
                    startDate={startDate}
                    endDate={endDate}
                    onStartChange={setStartDate}
                    onEndChange={setEndDate}
                    onApply={(s, e) => fetchPayrollData(s, e)}
                  />
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center space-x-2">
                      <label className="text-sm text-[var(--sf-text-secondary)]">Member:</label>
                      <select value={selectedMemberId} onChange={(e) => setSelectedMemberId(e.target.value)}
                        className="border border-[var(--sf-border-light)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--sf-blue-500)] bg-white">
                        <option value="all">All Members</option>
                        {(payrollData?.teamMembers || []).map(m => (
                          <option key={m.teamMember.id} value={m.teamMember.id}>{m.teamMember.name}</option>
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={() => setPayrollOnlyWithEarnings(!payrollOnlyWithEarnings)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer',
                        padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 500,
                        border: payrollOnlyWithEarnings ? '1.5px solid var(--sf-blue-500)' : '1.5px solid var(--sf-border-light)',
                        background: payrollOnlyWithEarnings ? 'var(--sf-blue-50)' : 'white',
                        color: payrollOnlyWithEarnings ? 'var(--sf-blue-500)' : 'var(--sf-text-secondary)',
                        boxShadow: 'none'
                      }}
                    >
                      {payrollOnlyWithEarnings && <Check size={12} />}
                      Only with earnings
                    </button>
                    <button
                      onClick={() => setPayrollJobFilter(payrollJobFilter === 'completed' ? 'all' : 'completed')}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer',
                        padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 500,
                        border: payrollJobFilter === 'all' ? '1.5px solid var(--sf-blue-500)' : '1.5px solid var(--sf-border-light)',
                        background: payrollJobFilter === 'all' ? 'var(--sf-blue-50)' : 'white',
                        color: payrollJobFilter === 'all' ? 'var(--sf-blue-500)' : 'var(--sf-text-secondary)',
                        boxShadow: 'none'
                      }}
                    >
                      {payrollJobFilter === 'all' && <Check size={12} />}
                      Incl. Scheduled
                    </button>
                  </div>
                </div>
              </div>

              <div className={`transition-opacity duration-200 ${refreshing ? 'opacity-50 pointer-events-none' : ''}`}>
                {/* Summary */}
                <div className="bg-white rounded-xl border border-[var(--sf-border-light)] shadow-sm p-6 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-[var(--sf-text-primary)]">Summary</h2>
                    <span className="text-sm text-[var(--sf-text-muted)]">
                      {payrollAllTime ? 'All Time' : `${new Date(startDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — ${new Date(endDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 md:grid-cols-5 xl:grid-cols-9 gap-2">
                    <div className="bg-[var(--sf-bg-page)] rounded-lg p-3">
                      <div className="flex items-center space-x-1.5 mb-1">
                        <Users className="w-3.5 h-3.5 text-[var(--sf-text-muted)] flex-shrink-0" />
                        <span className="text-xs text-[var(--sf-text-secondary)] truncate">Members</span>
                      </div>
                      <p className="text-lg font-bold text-[var(--sf-text-primary)]">{filteredSummary.totalTeamMembers}</p>
                    </div>
                    <div className="bg-[var(--sf-bg-page)] rounded-lg p-3">
                      <div className="flex items-center space-x-1.5 mb-1">
                        <Calendar className="w-3.5 h-3.5 text-[var(--sf-text-muted)] flex-shrink-0" />
                        <span className="text-xs text-[var(--sf-text-secondary)] truncate">Jobs</span>
                      </div>
                      <p className="text-lg font-bold text-[var(--sf-text-primary)]">{filteredSummary.totalJobCount || 0}</p>
                    </div>
                    <div className="bg-[var(--sf-bg-page)] rounded-lg p-3">
                      <div className="flex items-center space-x-1.5 mb-1">
                        <Clock className="w-3.5 h-3.5 text-[var(--sf-text-muted)] flex-shrink-0" />
                        <span className="text-xs text-[var(--sf-text-secondary)] truncate">Hours</span>
                      </div>
                      <p className="text-lg font-bold text-[var(--sf-text-primary)]">{filteredSummary.totalHours.toFixed(1)}</p>
                    </div>
                    <div className="bg-indigo-50 rounded-lg p-3">
                      <div className="flex items-center space-x-1.5 mb-1">
                        <DollarSign className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                        <span className="text-xs text-indigo-600 truncate">Revenue</span>
                      </div>
                      <p className="text-lg font-bold text-indigo-900">{formatCurrency(filteredSummary.totalJobRevenue || 0)}</p>
                    </div>
                    <div className="bg-[var(--sf-blue-50)] rounded-lg p-3">
                      <div className="flex items-center space-x-1.5 mb-1">
                        <DollarSign className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                        <span className="text-xs text-[var(--sf-blue-500)] truncate">Hourly</span>
                      </div>
                      <p className="text-lg font-bold text-blue-900">{formatCurrency(filteredSummary.totalHourlySalary || 0)}</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3">
                      <div className="flex items-center space-x-1.5 mb-1">
                        <DollarSign className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                        <span className="text-xs text-green-600 truncate">Commission</span>
                      </div>
                      <p className="text-lg font-bold text-green-900">{formatCurrency(filteredSummary.totalCommission || 0)}</p>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-3">
                      <div className="flex items-center space-x-1.5 mb-1">
                        <DollarSign className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
                        <span className="text-xs text-yellow-600 truncate">Tips</span>
                      </div>
                      <p className="text-lg font-bold text-yellow-900">{formatCurrency(filteredSummary.totalTips || 0)}</p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-3">
                      <div className="flex items-center space-x-1.5 mb-1">
                        <DollarSign className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                        <span className="text-xs text-purple-600 truncate">Incentives</span>
                      </div>
                      <p className="text-lg font-bold text-purple-900">{formatCurrency(filteredSummary.totalIncentives || 0)}</p>
                    </div>
                    <div className="bg-[var(--sf-bg-page)] rounded-lg p-3">
                      <div className="flex items-center space-x-1.5 mb-1">
                        <DollarSign className="w-3.5 h-3.5 text-[var(--sf-text-muted)] flex-shrink-0" />
                        <span className="text-xs text-[var(--sf-text-secondary)] truncate">Total Salary</span>
                      </div>
                      <p className="text-lg font-bold text-[var(--sf-text-primary)]">{formatCurrency(filteredSummary.totalSalary)}</p>
                    </div>
                  </div>
                </div>

                {/* Team Members Table */}
                {filteredMembers.length > 0 && (
                  <div className="flex justify-end mb-2">
                    <button onClick={copyPayrollTable}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--sf-text-secondary)] bg-white border border-[var(--sf-border-light)] rounded-lg hover:bg-[var(--sf-bg-hover)]">
                      <ClipboardCopy size={13} />
                      {copiedPayroll ? 'Copied!' : 'Copy Table'}
                    </button>
                  </div>
                )}
                {filteredMembers.length === 0 ? (
                  <div className="bg-white rounded-xl border border-[var(--sf-border-light)] shadow-sm p-12 text-center">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-[var(--sf-text-primary)] mb-2">No Team Members</h3>
                    <p className="text-sm text-[var(--sf-text-muted)] mb-4">No active team members found.</p>
                    <button onClick={() => navigate('/team')} className="sf-btn-primary px-4 py-2 rounded-lg text-sm font-medium">
                      Go to Team
                    </button>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-[var(--sf-border-light)] shadow-sm overflow-hidden">
                    <table className="w-full divide-y divide-[var(--sf-border-light)]" style={{ tableLayout: 'fixed' }}>
                      <colgroup>
                        <col className="w-[20%]" />
                        <col className="w-[12%]" />
                        <col className="w-[4%]" />
                        <col className="w-[7%]" />
                        <col className="w-[7%]" />
                        <col className="w-[9%]" />
                        <col className="w-[9%]" />
                        <col className="w-[8%]" />
                        <col className="w-[9%]" />
                        <col className="w-[11%]" />
                      </colgroup>
                      <thead className="bg-[var(--sf-bg-page)]">
                        <tr>
                          <th className="px-3 py-3 text-left text-xs font-semibold text-[var(--sf-text-muted)] uppercase tracking-wider">Team Member</th>
                          <th className="px-2 py-3 text-left text-xs font-semibold text-[var(--sf-text-muted)] uppercase tracking-wider">Pay Method</th>
                          <th className="px-2 py-3 text-center text-xs font-semibold text-[var(--sf-text-muted)] uppercase tracking-wider">Jobs</th>
                          <th className="px-2 py-3 text-right text-xs font-semibold text-[var(--sf-text-muted)] uppercase tracking-wider">Hours</th>
                          <th className="px-2 py-3 text-right text-xs font-semibold text-[var(--sf-text-muted)] uppercase tracking-wider">Total</th>
                          <th className="px-2 py-3 text-right text-xs font-semibold text-[var(--sf-text-muted)] uppercase tracking-wider">Hourly</th>
                          <th className="px-2 py-3 text-right text-xs font-semibold text-[var(--sf-text-muted)] uppercase tracking-wider">Comm</th>
                          <th className="px-2 py-3 text-right text-xs font-semibold text-[var(--sf-text-muted)] uppercase tracking-wider">Tips</th>
                          <th className="px-2 py-3 text-right text-xs font-semibold text-[var(--sf-text-muted)] uppercase tracking-wider">Incentives</th>
                          <th className="px-3 py-3 text-right text-xs font-semibold text-[var(--sf-text-muted)] uppercase tracking-wider">Total</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-[var(--sf-border-light)]">
                        {filteredMembers.map((member) => {
                          const isExpanded = expandedMembers.has(member.teamMember.id)
                          return (
                          <React.Fragment key={member.teamMember.id}>
                          <tr className="border-b border-[var(--sf-border-light)] hover:bg-[var(--sf-bg-hover)] cursor-pointer" onClick={() => toggleExpanded(member.teamMember.id)}>
                            <td className="px-3 py-3">
                              <div className="flex items-center min-w-0">
                                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                                  <span className="text-[var(--sf-blue-500)] font-semibold text-xs">
                                    {member.teamMember.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                                  </span>
                                </div>
                                <div className="ml-2 min-w-0">
                                  <div className="text-sm font-medium text-[var(--sf-text-primary)] flex items-center gap-1 truncate">
                                    {isExpanded ? <ChevronDown className="w-3 h-3 text-[var(--sf-text-muted)] flex-shrink-0" /> : <ChevronRight className="w-3 h-3 text-[var(--sf-text-muted)] flex-shrink-0" />}
                                    <span className="truncate">{member.teamMember.name}</span>
                                    {member.isManagerOrOwner && (
                                      <span className="text-[10px] px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded-full flex-shrink-0">
                                        {member.teamMember.role}
                                      </span>
                                    )}
                                  </div>
                                  <button onClick={(e) => { e.stopPropagation(); toggleExpanded(member.teamMember.id) }}
                                    className="text-xs text-[var(--sf-blue-500)] hover:text-[var(--sf-blue-500)]">
                                    {isExpanded ? 'Hide' : 'Details'}
                                  </button>
                                </div>
                              </div>
                            </td>
                            <td className="px-2 py-3 text-xs text-[var(--sf-text-primary)] truncate">
                              {member.teamMember.commissionPercentage ? `${member.teamMember.commissionPercentage}%` : ''}
                              {member.teamMember.hourlyRate && member.teamMember.commissionPercentage ? ' + ' : ''}
                              {member.teamMember.hourlyRate ? `$${member.teamMember.hourlyRate}/hr` : ''}
                              {!member.teamMember.hourlyRate && !member.teamMember.commissionPercentage && <span className="text-[var(--sf-text-muted)] italic">Not set</span>}
                            </td>
                            <td className="px-2 py-3 text-sm text-[var(--sf-text-primary)] text-center">{member.jobCount}</td>
                            <td className="px-2 py-3 text-sm text-[var(--sf-text-primary)] text-right">{member.totalHours.toFixed(1)}</td>
                            <td className="px-2 py-3 text-sm text-indigo-700 text-right">{formatCurrency(member.totalJobRevenue || 0)}</td>
                            <td className="px-2 py-3 text-sm text-[var(--sf-text-primary)] text-right">{formatCurrency(member.hourlySalary || 0)}</td>
                            <td className="px-2 py-3 text-sm text-[var(--sf-text-primary)] text-right" title={member.isManagerOrOwner && member.commissionRevenueBase ? `From total revenue: ${formatCurrency(member.commissionRevenueBase)}` : ''}>
                              {formatCurrency(member.commissionSalary || 0)}
                              {member.isManagerOrOwner && member.commissionSalary > 0 && (
                                <div className="text-[10px] text-purple-600">rev: {formatCurrency(member.commissionRevenueBase || 0)}</div>
                              )}
                            </td>
                            <td className="px-2 py-3 text-sm text-[var(--sf-text-primary)] text-right">{formatCurrency(member.totalTips || 0)}</td>
                            <td className="px-2 py-3 text-sm text-[var(--sf-text-primary)] text-right">{formatCurrency(member.totalIncentives || 0)}</td>
                            <td className="px-3 py-3 text-sm font-semibold text-[var(--sf-text-primary)] text-right">{formatCurrency(member.totalSalary)}</td>
                          </tr>
                          {/* Manager/Owner Pay Breakdown */}
                          {isExpanded && member.isManagerOrOwner && (
                            <tr>
                              <td colSpan="11" className="p-0">
                                <div className="bg-purple-50 border-t border-b border-purple-100 px-4 py-3">
                                  <p className="text-xs font-semibold text-purple-700 uppercase mb-2">Pay Breakdown</p>
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr className="text-xs text-purple-600 uppercase tracking-wider">
                                        <th className="text-left py-1.5 pr-4 font-medium">Component</th>
                                        <th className="text-right py-1.5 pr-4 font-medium">Base</th>
                                        <th className="text-right py-1.5 pr-4 font-medium">Rate</th>
                                        <th className="text-right py-1.5 font-medium">Amount</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-purple-100">
                                      {member.teamMember.commissionPercentage > 0 && (
                                        <tr>
                                          <td className="py-2 pr-4 text-[var(--sf-text-primary)]">Commission</td>
                                          <td className="py-2 pr-4 text-right text-[var(--sf-text-primary)]">Total revenue: {formatCurrency(payrollData?.totalBusinessRevenue || 0)}</td>
                                          <td className="py-2 pr-4 text-right text-[var(--sf-text-primary)]">{member.teamMember.commissionPercentage}%</td>
                                          <td className="py-2 text-right font-semibold text-purple-700">{formatCurrency(member.commissionSalary)}</td>
                                        </tr>
                                      )}
                                      {member.teamMember.hourlyRate > 0 && (
                                        <tr>
                                          <td className="py-2 pr-4 text-[var(--sf-text-primary)]">Hourly (Scheduled)</td>
                                          <td className="py-2 pr-4 text-right text-[var(--sf-text-primary)]">{(member.scheduledHours || 0).toFixed(1)} scheduled hrs</td>
                                          <td className="py-2 pr-4 text-right text-[var(--sf-text-primary)]">${member.teamMember.hourlyRate}/hr</td>
                                          <td className="py-2 text-right font-semibold text-purple-700">{formatCurrency(member.hourlySalary || 0)}</td>
                                        </tr>
                                      )}
                                      {(member.totalTips || 0) > 0 && (
                                        <tr>
                                          <td className="py-2 pr-4 text-[var(--sf-text-primary)]">Tips</td>
                                          <td className="py-2 pr-4 text-right text-[var(--sf-text-muted)]">—</td>
                                          <td className="py-2 pr-4 text-right text-[var(--sf-text-muted)]">—</td>
                                          <td className="py-2 text-right font-semibold text-purple-700">{formatCurrency(member.totalTips)}</td>
                                        </tr>
                                      )}
                                      {(member.totalIncentives || 0) > 0 && (
                                        <tr>
                                          <td className="py-2 pr-4 text-[var(--sf-text-primary)]">Incentives</td>
                                          <td className="py-2 pr-4 text-right text-[var(--sf-text-muted)]">—</td>
                                          <td className="py-2 pr-4 text-right text-[var(--sf-text-muted)]">—</td>
                                          <td className="py-2 text-right font-semibold text-purple-700">{formatCurrency(member.totalIncentives)}</td>
                                        </tr>
                                      )}
                                    </tbody>
                                    <tfoot>
                                      <tr className="border-t-2 border-purple-200">
                                        <td colSpan="3" className="py-2 pr-4 text-right font-semibold text-[var(--sf-text-primary)]">Total Pay</td>
                                        <td className="py-2 text-right font-bold text-purple-800 text-base">{formatCurrency(member.totalSalary)}</td>
                                      </tr>
                                    </tfoot>
                                  </table>
                                  {member.revenueJobs && member.revenueJobs.length > 0 && (
                                    <div className="mt-3 border-t border-purple-200 pt-3">
                                      <p className="text-xs font-semibold text-purple-600 uppercase mb-2">
                                        Revenue Jobs ({member.revenueJobs.length} jobs = {formatCurrency(payrollData?.totalBusinessRevenue || 0)})
                                      </p>
                                      <div className="max-h-64 overflow-y-auto">
                                        <table className="w-full text-xs">
                                          <thead className="sticky top-0 bg-purple-50">
                                            <tr className="text-purple-500 uppercase tracking-wider">
                                              <th className="text-left py-1.5 pr-3 font-medium">Date</th>
                                              <th className="text-left py-1.5 pr-3 font-medium">Service</th>
                                              <th className="text-left py-1.5 pr-3 font-medium">Customer</th>
                                              <th className="text-left py-1.5 pr-3 font-medium">Status</th>
                                              <th className="text-right py-1.5 pr-3 font-medium">Gross</th>
                                              <th className="text-right py-1.5 pr-3 font-medium">Tax</th>
                                              <th className="text-right py-1.5 font-medium">Revenue</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-purple-100">
                                            {member.revenueJobs.map(rj => (
                                              <tr key={rj.id} className="hover:bg-purple-100 cursor-pointer" onClick={(e) => { e.stopPropagation(); navigate(`/job/${rj.id}`) }}>
                                                <td className="py-1.5 pr-3 text-[var(--sf-text-primary)] whitespace-nowrap">{formatShortDate(rj.scheduledDate)}</td>
                                                <td className="py-1.5 pr-3 text-[var(--sf-text-primary)] font-medium truncate max-w-[150px]">{rj.serviceName}</td>
                                                <td className="py-1.5 pr-3 text-[var(--sf-text-primary)] truncate max-w-[120px]">{rj.customerName}</td>
                                                <td className="py-1.5 pr-3">
                                                  <span className={`inline-block px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                                                    rj.status === 'completed' ? 'bg-green-100 text-green-700' :
                                                    rj.status === 'in-progress' ? 'bg-blue-100 text-[var(--sf-blue-500)]' :
                                                    rj.status === 'scheduled' ? 'bg-yellow-100 text-yellow-700' :
                                                    'bg-[var(--sf-bg-page)] text-[var(--sf-text-secondary)]'
                                                  }`}>{rj.status}</span>
                                                </td>
                                                <td className="py-1.5 pr-3 text-right text-[var(--sf-text-muted)]">{formatCurrency(rj.grossPrice || 0)}</td>
                                                <td className="py-1.5 pr-3 text-right text-red-500">{rj.taxes > 0 ? `-${formatCurrency(rj.taxes)}` : '-'}</td>
                                                <td className="py-1.5 text-right text-[var(--sf-text-primary)] font-medium">{formatCurrency(rj.revenue)}</td>
                                              </tr>
                                            ))}
                                          </tbody>
                                          <tfoot>
                                            <tr className="border-t border-purple-200 bg-purple-50">
                                              <td colSpan="6" className="py-1.5 text-right font-semibold text-purple-700">Total Revenue</td>
                                              <td className="py-1.5 text-right font-bold text-purple-800">{formatCurrency(payrollData?.totalBusinessRevenue || 0)}</td>
                                            </tr>
                                          </tfoot>
                                        </table>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                          {/* Job Breakdown */}
                          {isExpanded && member.jobs && member.jobs.length > 0 && (
                            <tr>
                              <td colSpan="11" className="p-0">
                                <div className="bg-[var(--sf-bg-page)] border-t border-b border-[var(--sf-border-light)] px-3 py-2">
                                  <p className="text-xs font-semibold text-[var(--sf-text-muted)] uppercase mb-1">Job Breakdown</p>
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="text-[var(--sf-text-muted)] uppercase tracking-wider">
                                        <th className="text-left py-2 pr-4 font-medium">Date</th>
                                        <th className="text-left py-2 pr-4 font-medium">Name</th>
                                        <th className="text-left py-2 pr-4 font-medium">Status</th>
                                        <th className="text-right py-2 pr-4 font-medium">Est. Hours</th>
                                        <th className="text-right py-2 pr-4 font-medium">Real</th>
                                        <th className="text-right py-2 pr-4 font-medium">Price</th>
                                        <th className="text-right py-2 pr-4 font-medium">Hourly</th>
                                        <th className="text-right py-2 pr-4 font-medium">Commission</th>
                                        <th className="text-right py-2 pr-4 font-medium">Tips</th>
                                        <th className="text-right py-2 pr-4 font-medium">Incentives</th>
                                        <th className="text-right py-2 font-medium">Total</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {[...member.jobs].sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate)).map(job => (
                                        <tr key={job.id} className="border-t border-[var(--sf-border-light)]">
                                          <td className="py-2 pr-4 text-[var(--sf-text-primary)] whitespace-nowrap">{formatShortDate(job.scheduledDate)}</td>
                                          <td className="py-2 pr-4 font-medium"><span className="text-[var(--sf-text-active)] hover:underline cursor-pointer" onClick={(e) => { e.stopPropagation(); navigate(`/job/${job.id}`) }}>{job.customerName}</span></td>
                                          <td className="py-2 pr-4">
                                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                                              job.status === 'completed' ? 'bg-green-100 text-green-700' :
                                              job.status === 'in-progress' ? 'bg-blue-100 text-[var(--sf-blue-500)]' :
                                              job.status === 'scheduled' ? 'bg-yellow-100 text-yellow-700' :
                                              'bg-[var(--sf-bg-page)] text-[var(--sf-text-secondary)]'
                                            }`}>{job.status}</span>
                                          </td>
                                          <td className="py-2 pr-4 text-right text-[var(--sf-text-primary)]">
                                            <EditableCell value={job.hours} format="hours" onSave={async (val) => { await payrollAPI.updateJobPayroll(job.id, { hoursWorked: val }); fetchPayrollData(); }} />
                                            {job.hoursOverridden && <span className="text-[9px] text-orange-500 ml-0.5">*</span>}
                                          </td>
                                          <td className="py-2 pr-4 text-right text-xs">
                                            {job.realHours != null ? (
                                              <span className={job.realHours > job.hours * 1.1 ? 'text-red-600 font-medium' : job.realHours < job.hours * 0.9 ? 'text-green-600 font-medium' : 'text-[var(--sf-text-muted)]'}>
                                                {job.realHours.toFixed(1)}
                                              </span>
                                            ) : <span className="text-[var(--sf-text-muted)]">—</span>}
                                          </td>
                                          <td className="py-2 pr-4 text-right text-[var(--sf-text-primary)]">
                                            <EditableCell value={job.fullRevenue || job.revenue || 0} format="dollar" onSave={async (val) => { await payrollAPI.updateJobPayroll(job.id, { servicePrice: val }); fetchPayrollData(); }} />
                                            {job.memberCount > 1 && <span className="text-[var(--sf-text-muted)] text-xs ml-1">({formatCurrency(job.revenue)}/ea)</span>}
                                          </td>
                                          <td className="py-2 pr-4 text-right text-[var(--sf-text-primary)]">{formatCurrency(job.hourlySalary)}</td>
                                          <td className="py-2 pr-4 text-right text-[var(--sf-text-primary)]">{formatCurrency(job.commission)}</td>
                                          <td className="py-2 pr-4 text-right text-[var(--sf-text-primary)]">
                                            <EditableCell value={job.tip || 0} format="dollar" onSave={async (val) => { await payrollAPI.updateJobPayroll(job.id, { tipAmount: val * (job.memberCount || 1) }); fetchPayrollData(); }} />
                                          </td>
                                          <td className="py-2 pr-4 text-right text-[var(--sf-text-primary)]">
                                            <EditableCell value={job.incentive || 0} format="dollar" onSave={async (val) => { await payrollAPI.updateJobPayroll(job.id, { incentiveAmount: val * (job.memberCount || 1) }); fetchPayrollData(); }} />
                                          </td>
                                          <td className="py-2 text-right text-[var(--sf-text-primary)] font-medium">{formatCurrency((job.hourlySalary || 0) + (job.commission || 0) + (job.tip || 0) + (job.incentive || 0))}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </td>
                            </tr>
                          )}
                          </React.Fragment>
                          )
                        })}
                      </tbody>
                      <tfoot className="bg-[var(--sf-bg-page)]">
                        <tr>
                          <td colSpan="2" className="px-3 py-3 text-sm font-semibold text-[var(--sf-text-primary)] text-right">Totals:</td>
                          <td className="px-2 py-3 text-sm font-semibold text-[var(--sf-text-primary)] text-center">{filteredSummary.totalJobCount || 0}</td>
                          <td className="px-2 py-3 text-sm font-semibold text-[var(--sf-text-primary)] text-right">{filteredSummary.totalHours.toFixed(1)}</td>
                          <td className="px-2 py-3 text-sm font-semibold text-indigo-700 text-right">{formatCurrency(filteredSummary.totalJobRevenue || 0)}</td>
                          <td className="px-2 py-3 text-sm font-semibold text-[var(--sf-text-primary)] text-right">{formatCurrency(filteredSummary.totalHourlySalary || 0)}</td>
                          <td className="px-2 py-3 text-sm font-semibold text-[var(--sf-text-primary)] text-right">{formatCurrency(filteredSummary.totalCommission || 0)}</td>
                          <td className="px-2 py-3 text-sm font-semibold text-[var(--sf-text-primary)] text-right">{formatCurrency(filteredSummary.totalTips || 0)}</td>
                          <td className="px-2 py-3 text-sm font-semibold text-[var(--sf-text-primary)] text-right">{formatCurrency(filteredSummary.totalIncentives || 0)}</td>
                          <td className="px-3 py-3 text-sm font-semibold text-[var(--sf-text-primary)] text-right">{formatCurrency(filteredSummary.totalSalary)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══════════════ BALANCES TAB ═══════════════ */}
          {activeTab === 'balances' && (
            <div>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-xl border border-[var(--sf-border-light)] shadow-sm p-5">
                  <div className="text-sm text-[var(--sf-text-muted)] mb-1">Total Unpaid Balance</div>
                  <div className={`text-2xl font-bold ${totalUnpaidBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(totalUnpaidBalance)}
                  </div>
                  <div className="text-xs text-[var(--sf-text-muted)] mt-1">Owed to all cleaners</div>
                </div>
                <div className="bg-white rounded-xl border border-[var(--sf-border-light)] shadow-sm p-5">
                  <div className="text-sm text-[var(--sf-text-muted)] mb-1">Active Cleaners</div>
                  <div className="text-2xl font-bold text-[var(--sf-text-primary)]">{balances.length}</div>
                  <div className="text-xs text-[var(--sf-text-muted)] mt-1">With ledger activity</div>
                </div>
                <div className="bg-white rounded-xl border border-[var(--sf-border-light)] shadow-sm p-5">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="text-sm text-[var(--sf-text-muted)] mb-1">Backfill</div>
                      <div className="text-xs text-[var(--sf-text-muted)]">Create ledger for past completed jobs</div>
                    </div>
                    {!backfillPreview && !backfillResult && (
                      <button onClick={handleBackfillPreview} disabled={backfillLoading}
                        className="px-3 py-2 text-xs bg-gray-800 text-white rounded-lg hover:bg-gray-900 disabled:opacity-50">
                        {backfillLoading ? 'Checking...' : 'Check'}
                      </button>
                    )}
                  </div>

                  {/* Preview result */}
                  {backfillPreview && !backfillResult && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="text-sm text-[var(--sf-text-primary)] mb-2">
                        <span className="font-semibold">{backfillPreview.would_process}</span> jobs to process
                        <span className="text-[var(--sf-text-muted)] ml-2">({backfillPreview.already_have_entries} already have entries)</span>
                        {backfillPreview.managers_with_salary > 0 && (
                          <span className="text-purple-600 ml-2">+ {backfillPreview.managers_with_salary} manager(s) daily salary</span>
                        )}
                      </div>
                      {backfillPreview.would_process > 0 || backfillPreview.managers_with_salary > 0 ? (
                        <div className="flex gap-2 flex-wrap">
                          <button onClick={handleBackfillRun} disabled={backfillLoading}
                            className="px-3 py-2 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
                            {backfillLoading ? 'Processing...' : `Process ${backfillPreview.would_process} jobs`}
                          </button>
                          <button onClick={() => { setBackfillPreview(null); handleBackfillReset() }} disabled={backfillLoading}
                            className="px-3 py-2 text-xs bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50">
                            {backfillLoading ? 'Processing...' : 'Reset & Re-backfill All'}
                          </button>
                          <button onClick={() => setBackfillPreview(null)}
                            className="px-3 py-2 text-xs border border-[var(--sf-border-light)] rounded-lg hover:bg-[var(--sf-bg-hover)]">Cancel</button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 flex-wrap">
                          <Check size={14} className="text-green-600" />
                          <span className="text-sm text-green-700">All jobs already have ledger entries</span>
                          <button onClick={() => { setBackfillPreview(null); handleBackfillReset() }} disabled={backfillLoading}
                            className="px-3 py-2 text-xs bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50">
                            Reset & Re-backfill All
                          </button>
                          <button onClick={() => setBackfillPreview(null)}
                            className="ml-2 px-2 py-1 text-xs border border-[var(--sf-border-light)] rounded hover:bg-[var(--sf-bg-hover)]">Dismiss</button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Progress bar */}
                  {backfillLoading && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="flex items-center justify-between text-xs text-[var(--sf-text-muted)] mb-1">
                        <span>
                          {backfillPhase === 'manager_salary' ? 'Creating manager salary entries...' :
                           backfillTotal > 0 ? `Processing jobs: ${backfillProcessed} / ${backfillTotal}` : 'Starting...'}
                        </span>
                        <div className="flex items-center gap-2">
                          <span>{backfillProgress}%</span>
                          <button onClick={async () => { try { await ledgerAPI.cancelBackfill() } catch {} }}
                            className="px-2 py-0.5 text-xs text-red-600 border border-red-300 rounded hover:bg-red-50">
                            Cancel
                          </button>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div className="bg-[var(--sf-blue-500)] h-2.5 rounded-full transition-all duration-300"
                          style={{ width: `${Math.max(backfillProgress, 2)}%` }}></div>
                      </div>
                    </div>
                  )}

                  {/* Result */}
                  {backfillResult && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="flex items-center gap-2 mb-1">
                        <Check size={14} className="text-green-600" />
                        <span className="text-sm font-medium text-green-700">Backfill complete</span>
                      </div>
                      <div className="text-xs text-[var(--sf-text-secondary)]">
                        {backfillResult.processed} jobs processed, {backfillResult.already_had_entries || 0} already had entries{backfillResult.errors > 0 && `, ${backfillResult.errors} errors`}
                        {backfillResult.manager_salary_entries > 0 && `, ${backfillResult.manager_salary_entries} manager salary entries created`}
                      </div>
                      <button onClick={() => { setBackfillResult(null); setBackfillProgress(0) }}
                        className="mt-2 px-2 py-1 text-xs border border-[var(--sf-border-light)] rounded hover:bg-[var(--sf-bg-hover)]">Dismiss</button>
                    </div>
                  )}

                </div>
              </div>

              {/* Date Filter */}
              <div className="bg-white rounded-xl border border-[var(--sf-border-light)] shadow-sm p-4 mb-4">
                <div className="flex flex-wrap gap-3 items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Filter size={14} className="text-[var(--sf-text-muted)]" />
                    <QuickTimeFilter
                      payoutFrequency={payoutFrequency} payoutStartDay={payoutStartDay}
                      activeRange={balancesQuickRange}
                      onSelect={(id) => { setBalancesQuickRange(id); setBalancesAllTime(false) }}
                      startDate={balancesStartDate}
                      endDate={balancesEndDate}
                      onStartChange={setBalancesStartDate}
                      onEndChange={setBalancesEndDate}
                      onApply={(s, e) => fetchBalances(s, e)}
                    />
                  </div>
                  <button onClick={fetchBalances} disabled={balancesLoading}
                    className="sf-btn-primary px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                    Apply
                  </button>
                </div>
              </div>

              {/* Cleaner Balances Table */}
              <div className="bg-white rounded-xl border border-[var(--sf-border-light)] shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-[var(--sf-border-light)] flex items-center justify-between flex-wrap gap-2">
                  <h2 className="text-lg font-semibold text-[var(--sf-text-primary)]">Cleaner Balances</h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowOnlyWithEarnings(!showOnlyWithEarnings)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer',
                        padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 500,
                        border: showOnlyWithEarnings ? '1.5px solid var(--sf-blue-500)' : '1.5px solid var(--sf-border-light)',
                        background: showOnlyWithEarnings ? 'var(--sf-blue-50)' : 'white',
                        color: showOnlyWithEarnings ? 'var(--sf-blue-500)' : 'var(--sf-text-secondary)',
                        boxShadow: 'none'
                      }}
                    >
                      {showOnlyWithEarnings && <Check size={12} />}
                      Only with earnings
                    </button>
                    {balances.length > 0 && (
                      <button onClick={copyBalancesTable}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--sf-text-secondary)] bg-[var(--sf-bg-page)] border rounded-lg hover:bg-[var(--sf-bg-hover)]">
                        <ClipboardCopy size={13} />
                        {copiedBalances ? 'Copied!' : 'Copy Table'}
                      </button>
                    )}
                  </div>
                </div>
                {(() => {
                  const displayBalances = showOnlyWithEarnings
                    ? balances.filter(b => (parseFloat(b.unpaid_earnings) || 0) !== 0 || (parseFloat(b.unpaid_tips) || 0) !== 0 || (parseFloat(b.current_balance) || 0) !== 0)
                    : balances;
                  return balancesLoading ? (
                  <div className="p-8 text-center text-[var(--sf-text-muted)]">Loading...</div>
                ) : displayBalances.length === 0 ? (
                  <div className="p-8 text-center text-[var(--sf-text-muted)]">
                    <BookOpen size={40} className="mx-auto mb-3 text-gray-300" />
                    <p>No ledger data yet. Complete jobs or run a backfill to populate.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-[var(--sf-bg-page)] text-[var(--sf-text-muted)] text-xs font-semibold uppercase tracking-wider">
                        <tr>
                          <th className="px-4 py-3 text-left">Cleaner</th>
                          <th className="px-4 py-3 text-center">Jobs</th>
                          <th className="px-4 py-3 text-right">Balance</th>
                          <th className="px-4 py-3 text-right hidden sm:table-cell">Earnings</th>
                          <th className="px-4 py-3 text-right hidden sm:table-cell">Tips</th>
                          <th className="px-4 py-3 text-right hidden sm:table-cell">Incentives</th>
                          <th className="px-4 py-3 text-right hidden md:table-cell">Cash Offset</th>
                          <th className="px-4 py-3 text-right hidden md:table-cell">Adjustments</th>
                          <th className="px-4 py-3 text-center">Schedule</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--sf-border-light)]">
                        {displayBalances.map(b => (
                          <tr key={b.team_member_id} className="hover:bg-[var(--sf-bg-hover)]">
                            <td className="px-4 py-3 font-medium text-[var(--sf-text-primary)]">{b.name || `ID ${b.team_member_id}`}</td>
                            <td className="px-4 py-3 text-center text-[var(--sf-text-secondary)]">{b.job_count || 0}</td>
                            <td className={`px-4 py-3 text-right font-semibold ${b.current_balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrency(b.current_balance)}
                            </td>
                            <td className="px-4 py-3 text-right hidden sm:table-cell text-[var(--sf-text-secondary)]">{formatCurrency(b.unpaid_earnings)}</td>
                            <td className="px-4 py-3 text-right hidden sm:table-cell text-[var(--sf-text-secondary)]">{formatCurrency(b.unpaid_tips)}</td>
                            <td className="px-4 py-3 text-right hidden sm:table-cell text-[var(--sf-text-secondary)]">{formatCurrency(b.unpaid_incentives)}</td>
                            <td className="px-4 py-3 text-right hidden md:table-cell text-[var(--sf-text-secondary)]">{formatCurrency(b.unpaid_cash_offsets)}</td>
                            <td className="px-4 py-3 text-right hidden md:table-cell text-[var(--sf-text-secondary)]">{formatCurrency(b.unpaid_adjustments)}</td>
                            <td className="px-4 py-3 text-center">
                              <span className="text-xs px-2 py-1 bg-[var(--sf-bg-page)] rounded-full text-[var(--sf-text-secondary)] capitalize">
                                {b.payout_schedule || 'manual'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-[var(--sf-bg-page)] font-semibold text-sm">
                        <tr>
                          <td className="px-4 py-3 text-left">Totals</td>
                          <td className="px-4 py-3 text-center">{balancesTotalUniqueJobs || balances.reduce((s, b) => s + (b.job_count || 0), 0)}</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(balances.reduce((s, b) => s + (b.current_balance || 0), 0))}</td>
                          <td className="px-4 py-3 text-right hidden sm:table-cell">{formatCurrency(balances.reduce((s, b) => s + (b.unpaid_earnings || 0), 0))}</td>
                          <td className="px-4 py-3 text-right hidden sm:table-cell">{formatCurrency(balances.reduce((s, b) => s + (b.unpaid_tips || 0), 0))}</td>
                          <td className="px-4 py-3 text-right hidden sm:table-cell">{formatCurrency(balances.reduce((s, b) => s + (b.unpaid_incentives || 0), 0))}</td>
                          <td className="px-4 py-3 text-right hidden md:table-cell">{formatCurrency(balances.reduce((s, b) => s + (b.unpaid_cash_offsets || 0), 0))}</td>
                          <td className="px-4 py-3 text-right hidden md:table-cell">{formatCurrency(balances.reduce((s, b) => s + (b.unpaid_adjustments || 0), 0))}</td>
                          <td className="px-4 py-3"></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )
                })()}
              </div>
            </div>
          )}

          {/* ═══════════════ LEDGER TAB ═══════════════ */}
          {activeTab === 'ledger' && (
            <div>
              {/* Filters */}
              <div className="bg-white rounded-xl border border-[var(--sf-border-light)] shadow-sm p-4 mb-4 space-y-3">
                <QuickTimeFilter
                  payoutFrequency={payoutFrequency} payoutStartDay={payoutStartDay}
                  activeRange={ledgerQuickRange}
                  onSelect={(id) => { setLedgerQuickRange(id); setEntriesPage(1) }}
                  startDate={filterStartDate}
                  endDate={filterEndDate}
                  onStartChange={(v) => { setFilterStartDate(v); setEntriesPage(1) }}
                  onEndChange={(v) => { setFilterEndDate(v); setEntriesPage(1) }}
                />
                <div className="flex flex-wrap gap-3 items-end">
                  <div className="flex-1 min-w-[140px]">
                    <label className="text-xs text-[var(--sf-text-muted)] mb-1 block">Team Member</label>
                    <select value={filterMember} onChange={e => { setFilterMember(e.target.value); setEntriesPage(1) }}
                      className="w-full border border-[var(--sf-border-light)] rounded-lg px-3 py-2 text-sm bg-white">
                      <option value="">All</option>
                      {teamMembers.map(tm => (
                        <option key={tm.id} value={tm.id}>{tm.first_name} {tm.last_name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="min-w-[120px]">
                    <label className="text-xs text-[var(--sf-text-muted)] mb-1 block">Type</label>
                    <select value={filterType} onChange={e => { setFilterType(e.target.value); setEntriesPage(1) }}
                      className="w-full border border-[var(--sf-border-light)] rounded-lg px-3 py-2 text-sm bg-white">
                      <option value="">All</option>
                      {Object.entries(TYPE_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div className="min-w-[110px]">
                    <label className="text-xs text-[var(--sf-text-muted)] mb-1 block">Status</label>
                    <select value={filterPayoutStatus} onChange={e => { setFilterPayoutStatus(e.target.value); setEntriesPage(1) }}
                      className="w-full border border-[var(--sf-border-light)] rounded-lg px-3 py-2 text-sm bg-white">
                      <option value="">All</option>
                      <option value="unpaid">Unpaid</option>
                      <option value="paid">Paid</option>
                    </select>
                  </div>
                  <button onClick={() => fetchEntries()} className="sf-btn-primary px-4 py-2 rounded-lg text-sm font-medium">
                    <Filter size={14} className="inline mr-1" /> Apply
                  </button>
                </div>
              </div>

              {/* Entries Table */}
              <div className="bg-white rounded-xl border border-[var(--sf-border-light)] shadow-sm overflow-hidden">
                {entriesLoading ? (
                  <div className="p-8 text-center text-[var(--sf-text-muted)]">Loading...</div>
                ) : entries.length === 0 ? (
                  <div className="p-8 text-center text-[var(--sf-text-muted)]">No ledger entries found</div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-[var(--sf-bg-page)] text-[var(--sf-text-muted)] text-xs font-semibold uppercase tracking-wider">
                          <tr>
                            <th className="px-4 py-3 text-left">Date</th>
                            <th className="px-4 py-3 text-left">Cleaner</th>
                            <th className="px-4 py-3 text-left">Type</th>
                            <th className="px-4 py-3 text-right">Amount</th>
                            <th className="px-4 py-3 text-left hidden sm:table-cell">Job</th>
                            <th className="px-4 py-3 text-left hidden md:table-cell">Note</th>
                            <th className="px-4 py-3 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--sf-border-light)]">
                          {entries.map(e => (
                            <tr key={e.id} className="hover:bg-[var(--sf-bg-hover)]">
                              <td className="px-4 py-3 text-[var(--sf-text-secondary)]">{formatDate(e.effective_date)}</td>
                              <td className="px-4 py-3 font-medium text-[var(--sf-text-primary)]">
                                {e.team_members ? `${e.team_members.first_name || ''} ${e.team_members.last_name || ''}`.trim() : '-'}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${TYPE_COLORS[e.type] || 'bg-[var(--sf-bg-page)]'}`}>
                                  {TYPE_LABELS[e.type] || e.type}
                                </span>
                              </td>
                              <td className={`px-4 py-3 text-right font-semibold ${parseFloat(e.amount) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrency(e.amount)}
                              </td>
                              <td className="px-4 py-3 hidden sm:table-cell text-[var(--sf-text-muted)]">
                                {e.job_id ? (
                                  <button onClick={() => navigate(`/job/${e.job_id}`)} className="text-[var(--sf-blue-500)] hover:underline">#{e.job_id}</button>
                                ) : '-'}
                              </td>
                              <td className="px-4 py-3 hidden md:table-cell text-[var(--sf-text-muted)] max-w-[200px] truncate">{e.note || '-'}</td>
                              <td className="px-4 py-3 text-center">
                                {e.payout_batch_id ? (
                                  <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">Paid</span>
                                ) : (
                                  <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full">Unpaid</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="px-4 py-3 border-t border-[var(--sf-border-light)] flex items-center justify-between text-sm text-[var(--sf-text-muted)]">
                      <span>{entriesTotal} total entries</span>
                      <div className="flex gap-2">
                        <button disabled={entriesPage <= 1} onClick={() => setEntriesPage(p => p - 1)}
                          className="px-3 py-1 border border-[var(--sf-border-light)] rounded hover:bg-[var(--sf-bg-hover)] disabled:opacity-50">Prev</button>
                        <span className="px-3 py-1">Page {entriesPage}</span>
                        <button disabled={entries.length < 50} onClick={() => setEntriesPage(p => p + 1)}
                          className="px-3 py-1 border border-[var(--sf-border-light)] rounded hover:bg-[var(--sf-bg-hover)] disabled:opacity-50">Next</button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ═══════════════ PAYOUTS TAB ═══════════════ */}
          {activeTab === 'payouts' && (
            <div>
              <div className="bg-white rounded-xl border border-[var(--sf-border-light)] shadow-sm p-4 mb-4">
                <QuickTimeFilter
                  payoutFrequency={payoutFrequency} payoutStartDay={payoutStartDay}
                  activeRange={payoutsQuickRange}
                  onSelect={setPayoutsQuickRange}
                  startDate={payoutsStartDate}
                  endDate={payoutsEndDate}
                  onStartChange={setPayoutsStartDate}
                  onEndChange={setPayoutsEndDate}
                />
              </div>
              <div className="bg-white rounded-xl border border-[var(--sf-border-light)] shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-[var(--sf-border-light)] flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-[var(--sf-text-primary)]">Payout Batches</h2>
                  <button onClick={() => { setShowPayoutModal(true); setModalError('') }}
                    className="px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-1">
                    <Plus size={16} /> Create Payout
                  </button>
                </div>
                {batchesLoading ? (
                  <div className="p-8 text-center text-[var(--sf-text-muted)]">Loading...</div>
                ) : batches.length === 0 ? (
                  <div className="p-8 text-center text-[var(--sf-text-muted)]">
                    <Banknote size={40} className="mx-auto mb-3 text-gray-300" />
                    <p>No payout batches yet. Create one to settle cleaner balances.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-[var(--sf-border-light)]">
                    {batches.filter(batch => {
                      const batchDate = batch.period_end || batch.created_at?.split('T')[0]
                      if (!batchDate) return true
                      if (payoutsStartDate && batchDate < payoutsStartDate) return false
                      if (payoutsEndDate && batchDate > payoutsEndDate) return false
                      return true
                    }).map(batch => (
                      <div key={batch.id}>
                        <div className="px-5 py-4 flex items-center justify-between hover:bg-[var(--sf-bg-hover)] cursor-pointer"
                          onClick={() => handleViewBatch(batch.id)}>
                          <div className="flex items-center gap-4">
                            <button className="text-[var(--sf-text-muted)]">
                              {expandedBatch === batch.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </button>
                            <div>
                              <div className="font-medium text-[var(--sf-text-primary)]">
                                {batch.team_members ? `${batch.team_members.first_name} ${batch.team_members.last_name}` : `Batch #${batch.id}`}
                              </div>
                              <div className="text-xs text-[var(--sf-text-muted)]">
                                {formatDate(batch.period_start)} - {formatDate(batch.period_end)}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className={`text-lg font-bold ${parseFloat(batch.total_amount) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrency(batch.total_amount)}
                            </div>
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                              batch.status === 'paid' ? 'bg-green-100 text-green-700' :
                              batch.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>{batch.status}</span>
                            {batch.status === 'pending' && (
                              <div className="flex gap-1">
                                <button onClick={(e) => { e.stopPropagation(); handleMarkPaid(batch.id) }}
                                  className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700">
                                  <Check size={12} className="inline mr-1" />Pay
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); handleCancelBatch(batch.id) }}
                                  className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600">
                                  <X size={12} className="inline mr-1" />Cancel
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                        {expandedBatch === batch.id && batchDetail && (
                          <div className="px-5 pb-4 bg-[var(--sf-bg-page)] border-t border-[var(--sf-border-light)]">
                            <div className="mt-3">
                              {batch.paid_at && <p className="text-xs text-[var(--sf-text-muted)] mb-2">Paid on: {formatDate(batch.paid_at)}</p>}
                              {batch.note && <p className="text-xs text-[var(--sf-text-muted)] mb-2">Note: {batch.note}</p>}
                              <table className="w-full text-xs mt-2">
                                <thead className="text-[var(--sf-text-muted)] uppercase">
                                  <tr>
                                    <th className="py-1 text-left">Date</th>
                                    <th className="py-1 text-left">Type</th>
                                    <th className="py-1 text-right">Amount</th>
                                    <th className="py-1 text-left">Note</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--sf-border-light)]">
                                  {(batchDetail.entries || []).map(e => (
                                    <tr key={e.id}>
                                      <td className="py-1">{formatDate(e.effective_date)}</td>
                                      <td className="py-1">
                                        <span className={`px-1.5 py-0.5 rounded text-xs ${TYPE_COLORS[e.type]}`}>
                                          {TYPE_LABELS[e.type] || e.type}
                                        </span>
                                      </td>
                                      <td className={`py-1 text-right font-medium ${parseFloat(e.amount) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {formatCurrency(e.amount)}
                                      </td>
                                      <td className="py-1 text-[var(--sf-text-muted)] truncate max-w-[200px]">{e.note || '-'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ═══════════════ MODALS ═══════════════ */}

      {/* Adjustment Modal */}
      {showAdjustmentModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-[var(--sf-text-primary)] mb-4">Create Adjustment</h3>
            {modalError && <div className="text-sm text-red-600 bg-red-50 p-2 rounded mb-3">{modalError}</div>}
            <div className="space-y-3">
              <div>
                <label className="text-sm text-[var(--sf-text-secondary)] mb-1 block">Team Member *</label>
                <select value={adjTeamMember} onChange={e => setAdjTeamMember(e.target.value)}
                  className="w-full border border-[var(--sf-border-light)] rounded-lg px-3 py-2 text-sm bg-white">
                  <option value="">Select...</option>
                  {teamMembers.map(tm => (
                    <option key={tm.id} value={tm.id}>{tm.first_name} {tm.last_name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-sm text-[var(--sf-text-secondary)] mb-1 block">Amount *</label>
                  <input type="number" step="0.01" value={adjAmount} onChange={e => setAdjAmount(e.target.value)}
                    className="w-full border border-[var(--sf-border-light)] rounded-lg px-3 py-2 text-sm" placeholder="0.00" />
                </div>
                <div>
                  <label className="text-sm text-[var(--sf-text-secondary)] mb-1 block">Direction</label>
                  <select value={adjDirection} onChange={e => setAdjDirection(e.target.value)}
                    className="border border-[var(--sf-border-light)] rounded-lg px-3 py-2 text-sm bg-white">
                    <option value="positive">+ Credit</option>
                    <option value="negative">- Debit</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm text-[var(--sf-text-secondary)] mb-1 block">Job ID (optional)</label>
                <input type="text" value={adjJobId} onChange={e => setAdjJobId(e.target.value)}
                  className="w-full border border-[var(--sf-border-light)] rounded-lg px-3 py-2 text-sm" placeholder="Job ID" />
              </div>
              <div>
                <label className="text-sm text-[var(--sf-text-secondary)] mb-1 block">Reason / Note *</label>
                <textarea value={adjNote} onChange={e => setAdjNote(e.target.value)}
                  className="w-full border border-[var(--sf-border-light)] rounded-lg px-3 py-2 text-sm" rows={2} placeholder="Reason for adjustment..." />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setShowAdjustmentModal(false)} className="bg-white border border-[var(--sf-border-light)] rounded-lg px-4 py-2 text-sm font-medium text-[var(--sf-text-secondary)] hover:bg-[var(--sf-bg-hover)]">Cancel</button>
              <button onClick={handleCreateAdjustment} disabled={modalLoading}
                className="px-4 py-2 text-sm bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50">
                {modalLoading ? 'Creating...' : 'Create Adjustment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cash Collected Modal */}
      {showCashModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-[var(--sf-text-primary)] mb-4">Record Cash</h3>
            {modalError && <div className="text-sm text-red-600 bg-red-50 p-2 rounded mb-3">{modalError}</div>}
            <div className="space-y-3">
              <div>
                <label className="text-sm text-[var(--sf-text-secondary)] mb-1 block">Cash Type *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setCashType('paid_in_cash')}
                    className={`px-3 py-2.5 text-sm rounded-lg border-2 transition-colors ${
                      cashType === 'paid_in_cash'
                        ? 'border-orange-500 bg-orange-50 text-orange-700 font-medium'
                        : 'border-[var(--sf-border-light)] text-[var(--sf-text-secondary)] hover:bg-[var(--sf-bg-page)]'
                    }`}>
                    <div className="font-medium">Paid in Cash</div>
                    <div className="text-xs mt-0.5 opacity-75">Reduces salary owed</div>
                  </button>
                  <button onClick={() => setCashType('cash_to_company')}
                    className={`px-3 py-2.5 text-sm rounded-lg border-2 transition-colors ${
                      cashType === 'cash_to_company'
                        ? 'border-blue-500 bg-[var(--sf-blue-50)] text-[var(--sf-blue-500)] font-medium'
                        : 'border-[var(--sf-border-light)] text-[var(--sf-text-secondary)] hover:bg-[var(--sf-bg-page)]'
                    }`}>
                    <div className="font-medium">Cash to Company</div>
                    <div className="text-xs mt-0.5 opacity-75">Cashflow record only</div>
                  </button>
                </div>
              </div>
              <div>
                <label className="text-sm text-[var(--sf-text-secondary)] mb-1 block">Team Member *</label>
                <select value={cashTeamMember} onChange={e => setCashTeamMember(e.target.value)}
                  className="w-full border border-[var(--sf-border-light)] rounded-lg px-3 py-2 text-sm bg-white">
                  <option value="">Select...</option>
                  {teamMembers.map(tm => (
                    <option key={tm.id} value={tm.id}>{tm.first_name} {tm.last_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-[var(--sf-text-secondary)] mb-1 block">Amount *</label>
                <input type="number" step="0.01" value={cashAmount} onChange={e => setCashAmount(e.target.value)}
                  className="w-full border border-[var(--sf-border-light)] rounded-lg px-3 py-2 text-sm" placeholder="0.00" />
              </div>
              <div>
                <label className="text-sm text-[var(--sf-text-secondary)] mb-1 block">Job ID (optional)</label>
                <input type="text" value={cashJobId} onChange={e => setCashJobId(e.target.value)}
                  className="w-full border border-[var(--sf-border-light)] rounded-lg px-3 py-2 text-sm" placeholder="Job ID" />
              </div>
              <div>
                <label className="text-sm text-[var(--sf-text-secondary)] mb-1 block">Note</label>
                <input type="text" value={cashNote} onChange={e => setCashNote(e.target.value)}
                  className="w-full border border-[var(--sf-border-light)] rounded-lg px-3 py-2 text-sm" placeholder="Optional note" />
              </div>
              {cashType === 'paid_in_cash' && (
                <div className="bg-orange-50 rounded-lg p-3 text-xs text-orange-700">
                  This will reduce the cleaner's payout balance by the entered amount.
                </div>
              )}
              {cashType === 'cash_to_company' && (
                <div className="bg-[var(--sf-blue-50)] rounded-lg p-3 text-xs text-[var(--sf-blue-500)]">
                  This records cash delivered to the company. It does not affect the cleaner's salary balance.
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => { setShowCashModal(false); setCashType('paid_in_cash') }} className="bg-white border border-[var(--sf-border-light)] rounded-lg px-4 py-2 text-sm font-medium text-[var(--sf-text-secondary)] hover:bg-[var(--sf-bg-hover)]">Cancel</button>
              <button onClick={handleRecordCash} disabled={modalLoading}
                className={`px-4 py-2 text-sm text-white rounded-lg disabled:opacity-50 ${
                  cashType === 'cash_to_company' ? 'bg-[var(--sf-blue-500)] hover:bg-[var(--sf-blue-600)]' : 'bg-orange-500 hover:bg-orange-600'
                }`}>
                {modalLoading ? 'Recording...' : 'Record Cash'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payout Batch Modal */}
      {showPayoutModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-[var(--sf-text-primary)] mb-4">Create Payout Batch</h3>
            <p className="text-xs text-[var(--sf-text-muted)] mb-3">Groups all unpaid ledger entries in the selected period into a payout batch.</p>
            {modalError && <div className="text-sm text-red-600 bg-red-50 p-2 rounded mb-3">{modalError}</div>}
            <div className="space-y-3">
              <div>
                <label className="text-sm text-[var(--sf-text-secondary)] mb-1 block">Team Member *</label>
                <select value={payTeamMember} onChange={e => setPayTeamMember(e.target.value)}
                  className="w-full border border-[var(--sf-border-light)] rounded-lg px-3 py-2 text-sm bg-white">
                  <option value="">Select...</option>
                  {teamMembers.map(tm => (
                    <option key={tm.id} value={tm.id}>{tm.first_name} {tm.last_name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-sm text-[var(--sf-text-secondary)] mb-1 block">Period Start *</label>
                  <input type="date" value={payPeriodStart} onChange={e => setPayPeriodStart(e.target.value)}
                    className="w-full border border-[var(--sf-border-light)] rounded-lg px-3 py-2 text-sm" />
                </div>
                <div className="flex-1">
                  <label className="text-sm text-[var(--sf-text-secondary)] mb-1 block">Period End *</label>
                  <input type="date" value={payPeriodEnd} onChange={e => setPayPeriodEnd(e.target.value)}
                    className="w-full border border-[var(--sf-border-light)] rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="text-sm text-[var(--sf-text-secondary)] mb-1 block">Note</label>
                <input type="text" value={payNote} onChange={e => setPayNote(e.target.value)}
                  className="w-full border border-[var(--sf-border-light)] rounded-lg px-3 py-2 text-sm" placeholder="Optional note" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setShowPayoutModal(false)} className="bg-white border border-[var(--sf-border-light)] rounded-lg px-4 py-2 text-sm font-medium text-[var(--sf-text-secondary)] hover:bg-[var(--sf-bg-hover)]">Cancel</button>
              <button onClick={handleCreatePayout} disabled={modalLoading}
                className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
                {modalLoading ? 'Creating...' : 'Create Payout Batch'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Payroll

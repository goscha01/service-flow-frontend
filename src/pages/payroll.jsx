"use client"

import React, { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import {
  ChevronLeft, Calendar, DollarSign, Clock, Users, Download, Filter,
  AlertCircle, ChevronDown, ChevronRight, Plus, Minus, CreditCard,
  Check, X, ArrowUpDown, BookOpen, Banknote, ClipboardCopy
} from "lucide-react"
import { payrollAPI, ledgerAPI, teamAPI } from "../services/api"
import { useAuth } from "../context/AuthContext"
import Sidebar from "../components/sidebar"
import MobileHeader from "../components/mobile-header"

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
  adjustment: 'Adjustment',
  payout: 'Payout'
}

const TYPE_COLORS = {
  earning: 'bg-green-100 text-green-800',
  tip: 'bg-blue-100 text-blue-800',
  incentive: 'bg-purple-100 text-purple-800',
  cash_collected: 'bg-orange-100 text-orange-800',
  adjustment: 'bg-yellow-100 text-yellow-800',
  payout: 'bg-gray-100 text-gray-800'
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
  const [startDate, setStartDate] = useState(() => {
    const date = new Date(); date.setDate(1); return toLocalDateString(date)
  })
  const [endDate, setEndDate] = useState(() => toLocalDateString(new Date()))
  const [selectedMemberId, setSelectedMemberId] = useState('all')
  const [expandedMembers, setExpandedMembers] = useState(new Set())

  // ── Balances tab state ──
  const [balances, setBalances] = useState([])
  const [balancesLoading, setBalancesLoading] = useState(false)
  const [balancesAllTime, setBalancesAllTime] = useState(true)
  const [balancesStartDate, setBalancesStartDate] = useState(() => {
    const d = new Date(); d.setDate(1); return toLocalDateString(d)
  })
  const [balancesEndDate, setBalancesEndDate] = useState(() => toLocalDateString(new Date()))
  const [backfillLoading, setBackfillLoading] = useState(false)
  const [backfillResult, setBackfillResult] = useState(null)
  const [backfillPreview, setBackfillPreview] = useState(null)
  const [backfillProgress, setBackfillProgress] = useState(0)

  // ── Ledger entries tab state ──
  const [entries, setEntries] = useState([])
  const [entriesTotal, setEntriesTotal] = useState(0)
  const [entriesPage, setEntriesPage] = useState(1)
  const [entriesLoading, setEntriesLoading] = useState(false)
  const [filterMember, setFilterMember] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterPayoutStatus, setFilterPayoutStatus] = useState('')
  const [filterStartDate, setFilterStartDate] = useState(() => {
    const d = new Date(); d.setDate(1); return toLocalDateString(d)
  })
  const [filterEndDate, setFilterEndDate] = useState(() => toLocalDateString(new Date()))

  // ── Payouts tab state ──
  const [batches, setBatches] = useState([])
  const [batchesLoading, setBatchesLoading] = useState(false)
  const [expandedBatch, setExpandedBatch] = useState(null)
  const [batchDetail, setBatchDetail] = useState(null)

  // ── Shared state ──
  const [teamMembers, setTeamMembers] = useState([])

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
    const header = ['Name', 'Role', 'Pay Method', 'Jobs', 'Hours', 'Sched Hours', 'Hourly Salary', 'Commission', 'Tips', 'Incentives', 'Total Salary'].join('\t')
    const rows = (payrollData.teamMembers || []).map(m => [
      m.teamMember.name,
      m.teamMember.role || '',
      [m.teamMember.commissionPercentage ? `${m.teamMember.commissionPercentage}%` : '', m.teamMember.hourlyRate ? `$${m.teamMember.hourlyRate}/hr` : ''].filter(Boolean).join(' + ') || 'Not set',
      m.jobCount,
      m.totalHours.toFixed(1),
      (m.scheduledHours || 0).toFixed(1),
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
    const header = ['Name', 'Role', 'Jobs', 'Balance', 'Earnings', 'Tips', 'Cash Offset', 'Adjustments', 'Schedule'].join('\t')
    const rows = balances.map(b => [
      b.name || `ID ${b.team_member_id}`,
      b.role || '',
      b.job_count || 0,
      (b.current_balance || 0).toFixed(2),
      (b.unpaid_earnings || 0).toFixed(2),
      (b.unpaid_tips || 0).toFixed(2),
      (b.unpaid_cash_offsets || 0).toFixed(2),
      (b.unpaid_adjustments || 0).toFixed(2),
      b.payout_schedule || 'manual'
    ].join('\t'))
    navigator.clipboard.writeText([header, ...rows].join('\n'))
    setCopiedBalances(true)
    setTimeout(() => setCopiedBalances(false), 2000)
  }

  // ── Data fetchers ──

  const fetchPayrollData = async () => {
    if (!user?.id) return
    try {
      if (!payrollData) setLoading(true)
      else setRefreshing(true)
      setError("")
      const data = payrollAllTime
        ? await payrollAPI.getPayroll('', '')
        : await payrollAPI.getPayroll(startDate, endDate)
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

  const fetchBalances = useCallback(async () => {
    try {
      setBalancesLoading(true)
      const params = {}
      if (!balancesAllTime) {
        if (balancesStartDate) params.startDate = balancesStartDate
        if (balancesEndDate) params.endDate = balancesEndDate
      }
      const data = await ledgerAPI.getBalances(params)
      setBalances(data || [])
    } catch (err) {
      console.error('Error fetching balances:', err)
    } finally {
      setBalancesLoading(false)
    }
  }, [balancesAllTime, balancesStartDate, balancesEndDate])

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

  // ── Initial load ──
  useEffect(() => {
    if (user?.id) {
      fetchPayrollData()
      fetchTeamMembers()
    }
  }, [user?.id])

  // ── Tab-driven fetches ──
  useEffect(() => {
    if (activeTab === 'balances' && user?.id) fetchBalances()
  }, [activeTab, user?.id, fetchBalances])

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
      await ledgerAPI.recordCashCollected({ teamMemberId: cashTeamMember, amount: parseFloat(cashAmount), note: cashNote || undefined, jobId: cashJobId || undefined })
      setShowCashModal(false)
      setCashTeamMember(''); setCashAmount(''); setCashNote(''); setCashJobId('')
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

  const handleBackfillRun = async () => {
    setBackfillLoading(true)
    setBackfillProgress(0)
    setBackfillPreview(null)
    const totalToProcess = backfillPreview?.would_process || 0
    // Simulate progress during processing
    const interval = setInterval(() => {
      setBackfillProgress(prev => {
        if (prev >= 90) { clearInterval(interval); return 90 }
        return prev + Math.max(1, Math.round(90 / Math.max(totalToProcess, 10)))
      })
    }, 500)
    try {
      const result = await ledgerAPI.backfill({ dryRun: false })
      clearInterval(interval)
      setBackfillProgress(100)
      setBackfillResult(result)
      fetchBalances()
    } catch (err) {
      clearInterval(interval)
      setBackfillProgress(0)
      alert(err.response?.data?.error || 'Backfill failed')
    } finally { setBackfillLoading(false) }
  }

  const handleExport = () => {
    if (!payrollData) return
    let csv = 'Team Member,Role,Job Count,Hours Worked,Sched Hours,Hourly Rate,Commission %,Commission Revenue Base,Hourly Salary,Sched Salary,Commission,Tips,Incentives,Total Salary,Payment Method\n'
    filteredMembers.forEach(member => {
      const hourlyRate = member.teamMember.hourlyRate ? formatCurrency(member.teamMember.hourlyRate) : 'N/A'
      const commissionPct = member.teamMember.commissionPercentage ? `${member.teamMember.commissionPercentage}%` : 'N/A'
      csv += `"${member.teamMember.name}","${member.teamMember.role || 'Service Provider'}",${member.jobCount},${member.totalHours},${member.scheduledHours || 0},${hourlyRate},${commissionPct},${formatCurrency(member.commissionRevenueBase || 0)},${formatCurrency(member.hourlySalary || 0)},${formatCurrency(member.scheduledHourlySalary || 0)},${formatCurrency(member.commissionSalary || 0)},${formatCurrency(member.totalTips || 0)},${formatCurrency(member.totalIncentives || 0)},${formatCurrency(member.totalSalary)},${member.paymentMethod || 'none'}\n`
    })
    csv += `\nSummary\n`
    csv += `Total Business Revenue,${formatCurrency(payrollData?.totalBusinessRevenue || 0)}\n`
    csv += `Total Team Members,${filteredSummary.totalTeamMembers}\n`
    csv += `Total Hours,${filteredSummary.totalHours}\n`
    csv += `Total Scheduled Hours,${filteredSummary.totalScheduledHours || 0}\n`
    csv += `Total Hourly Salary,${formatCurrency(filteredSummary.totalHourlySalary || 0)}\n`
    csv += `Total Scheduled Salary,${formatCurrency(filteredSummary.totalScheduledHourlySalary || 0)}\n`
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
  const filteredMembers = payrollData?.teamMembers?.filter(
    m => selectedMemberId === 'all' || String(m.teamMember.id) === String(selectedMemberId)
  ) || []

  const filteredSummary = payrollData ? (selectedMemberId === 'all' ? payrollData.summary : {
    totalTeamMembers: filteredMembers.length,
    totalHours: parseFloat(filteredMembers.reduce((s, m) => s + (m.totalHours || 0), 0).toFixed(2)),
    totalScheduledHours: parseFloat(filteredMembers.reduce((s, m) => s + (m.scheduledHours || 0), 0).toFixed(2)),
    totalScheduledHourlySalary: parseFloat(filteredMembers.reduce((s, m) => s + (m.scheduledHourlySalary || 0), 0).toFixed(2)),
    totalHourlySalary: parseFloat(filteredMembers.reduce((s, m) => s + (m.hourlySalary || 0), 0).toFixed(2)),
    totalCommission: parseFloat(filteredMembers.reduce((s, m) => s + (m.commissionSalary || 0), 0).toFixed(2)),
    totalTips: parseFloat(filteredMembers.reduce((s, m) => s + (m.totalTips || 0), 0).toFixed(2)),
    totalIncentives: parseFloat(filteredMembers.reduce((s, m) => s + (m.totalIncentives || 0), 0).toFixed(2)),
    totalSalary: parseFloat(filteredMembers.reduce((s, m) => s + (m.totalSalary || 0), 0).toFixed(2)),
  }) : null

  const totalUnpaidBalance = balances.reduce((sum, b) => sum + (b.current_balance || 0), 0)

  // ── Tabs ──
  const tabs = [
    { id: 'payroll', label: 'Payroll', icon: DollarSign },
    { id: 'balances', label: 'Balances', icon: Users },
    { id: 'ledger', label: 'Ledger', icon: BookOpen },
    { id: 'payouts', label: 'Payouts', icon: Banknote }
  ]

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading payroll data...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-auto">
        <MobileHeader pageTitle="Payroll" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <button onClick={() => navigate('/team')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Payroll</h1>
                  <p className="text-sm text-gray-500 mt-1">Calculate salaries, track balances, and manage payouts</p>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                {activeTab === 'payroll' && (
                  <button onClick={handleExport} disabled={!payrollData || filteredMembers.length === 0}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
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
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
              {tabs.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
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
              <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0 sm:space-x-4">
                  <div className="flex items-center space-x-2">
                    <Filter className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">Filters:</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
                      <input type="checkbox" checked={payrollAllTime} onChange={(e) => setPayrollAllTime(e.target.checked)}
                        className="rounded border-gray-300" />
                      All Time
                    </label>
                    {!payrollAllTime && (
                      <>
                        <div className="flex items-center space-x-2">
                          <label className="text-sm text-gray-600">From:</label>
                          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div className="flex items-center space-x-2">
                          <label className="text-sm text-gray-600">To:</label>
                          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                      </>
                    )}
                    <div className="flex items-center space-x-2">
                      <label className="text-sm text-gray-600">Member:</label>
                      <select value={selectedMemberId} onChange={(e) => setSelectedMemberId(e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                        <option value="all">All Members</option>
                        {(payrollData?.teamMembers || []).map(m => (
                          <option key={m.teamMember.id} value={m.teamMember.id}>{m.teamMember.name}</option>
                        ))}
                      </select>
                    </div>
                    <button onClick={fetchPayrollData} disabled={refreshing}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                      {refreshing && <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>}
                      Apply
                    </button>
                  </div>
                </div>
              </div>

              <div className={`transition-opacity duration-200 ${refreshing ? 'opacity-50 pointer-events-none' : ''}`}>
                {/* Summary */}
                <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Summary</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <Users className="w-5 h-5 text-gray-400" />
                        <span className="text-sm text-gray-600">Team Members</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{filteredSummary.totalTeamMembers}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <Clock className="w-5 h-5 text-gray-400" />
                        <span className="text-sm text-gray-600">Job Hours</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{filteredSummary.totalHours.toFixed(2)}</p>
                    </div>
                    <div className="bg-indigo-50 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <Calendar className="w-5 h-5 text-indigo-400" />
                        <span className="text-sm text-indigo-600">Sched Hours</span>
                      </div>
                      <p className="text-2xl font-bold text-indigo-900">{(filteredSummary.totalScheduledHours || 0).toFixed(2)}</p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <DollarSign className="w-5 h-5 text-blue-400" />
                        <span className="text-sm text-blue-600">Hourly Salary</span>
                      </div>
                      <p className="text-2xl font-bold text-blue-900">{formatCurrency(filteredSummary.totalHourlySalary || 0)}</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <DollarSign className="w-5 h-5 text-green-400" />
                        <span className="text-sm text-green-600">Commission</span>
                      </div>
                      <p className="text-2xl font-bold text-green-900">{formatCurrency(filteredSummary.totalCommission || 0)}</p>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <DollarSign className="w-5 h-5 text-yellow-400" />
                        <span className="text-sm text-yellow-600">Tips</span>
                      </div>
                      <p className="text-2xl font-bold text-yellow-900">{formatCurrency(filteredSummary.totalTips || 0)}</p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <DollarSign className="w-5 h-5 text-purple-400" />
                        <span className="text-sm text-purple-600">Incentives</span>
                      </div>
                      <p className="text-2xl font-bold text-purple-900">{formatCurrency(filteredSummary.totalIncentives || 0)}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <DollarSign className="w-5 h-5 text-gray-400" />
                        <span className="text-sm text-gray-600">Total Salary</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{formatCurrency(filteredSummary.totalSalary)}</p>
                    </div>
                  </div>
                </div>

                {/* Team Members Table */}
                {filteredMembers.length > 0 && (
                  <div className="flex justify-end mb-2">
                    <button onClick={copyPayrollTable}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border rounded-lg hover:bg-gray-50">
                      <ClipboardCopy size={13} />
                      {copiedPayroll ? 'Copied!' : 'Copy Table'}
                    </button>
                  </div>
                )}
                {filteredMembers.length === 0 ? (
                  <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Team Members</h3>
                    <p className="text-sm text-gray-500 mb-4">No active team members found.</p>
                    <button onClick={() => navigate('/team')} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                      Go to Team
                    </button>
                  </div>
                ) : (
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <table className="w-full divide-y divide-gray-200" style={{ tableLayout: 'fixed' }}>
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
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Team Member</th>
                          <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pay Method</th>
                          <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase">Jobs</th>
                          <th className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase">Hours</th>
                          <th className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase">Sched</th>
                          <th className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase">Hourly</th>
                          <th className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase">Comm</th>
                          <th className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase">Tips</th>
                          <th className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase">Incentives</th>
                          <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredMembers.map((member) => {
                          const isExpanded = expandedMembers.has(member.teamMember.id)
                          return (
                          <React.Fragment key={member.teamMember.id}>
                          <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => toggleExpanded(member.teamMember.id)}>
                            <td className="px-3 py-3">
                              <div className="flex items-center min-w-0">
                                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                                  <span className="text-blue-600 font-semibold text-xs">
                                    {member.teamMember.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                                  </span>
                                </div>
                                <div className="ml-2 min-w-0">
                                  <div className="text-sm font-medium text-gray-900 flex items-center gap-1 truncate">
                                    {isExpanded ? <ChevronDown className="w-3 h-3 text-gray-400 flex-shrink-0" /> : <ChevronRight className="w-3 h-3 text-gray-400 flex-shrink-0" />}
                                    <span className="truncate">{member.teamMember.name}</span>
                                    {member.isManagerOrOwner && (
                                      <span className="text-[10px] px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded-full flex-shrink-0">
                                        {member.teamMember.role}
                                      </span>
                                    )}
                                  </div>
                                  <button onClick={(e) => { e.stopPropagation(); toggleExpanded(member.teamMember.id) }}
                                    className="text-xs text-blue-600 hover:text-blue-700">
                                    {isExpanded ? 'Hide' : 'Details'}
                                  </button>
                                </div>
                              </div>
                            </td>
                            <td className="px-2 py-3 text-xs text-gray-700 truncate">
                              {member.teamMember.commissionPercentage ? `${member.teamMember.commissionPercentage}%` : ''}
                              {member.teamMember.hourlyRate && member.teamMember.commissionPercentage ? ' + ' : ''}
                              {member.teamMember.hourlyRate ? `$${member.teamMember.hourlyRate}/hr` : ''}
                              {!member.teamMember.hourlyRate && !member.teamMember.commissionPercentage && <span className="text-gray-400 italic">Not set</span>}
                            </td>
                            <td className="px-2 py-3 text-sm text-gray-900 text-center">{member.jobCount}</td>
                            <td className="px-2 py-3 text-sm text-gray-900 text-right">{member.totalHours.toFixed(1)}</td>
                            <td className="px-2 py-3 text-sm text-indigo-700 text-right">{(member.scheduledHours || 0).toFixed(1)}</td>
                            <td className="px-2 py-3 text-sm text-gray-900 text-right">{formatCurrency(member.hourlySalary || 0)}</td>
                            <td className="px-2 py-3 text-sm text-gray-900 text-right" title={member.isManagerOrOwner && member.commissionRevenueBase ? `From total revenue: ${formatCurrency(member.commissionRevenueBase)}` : ''}>
                              {formatCurrency(member.commissionSalary || 0)}
                              {member.isManagerOrOwner && member.commissionSalary > 0 && (
                                <div className="text-[10px] text-purple-600">rev: {formatCurrency(member.commissionRevenueBase || 0)}</div>
                              )}
                            </td>
                            <td className="px-2 py-3 text-sm text-gray-900 text-right">{formatCurrency(member.totalTips || 0)}</td>
                            <td className="px-2 py-3 text-sm text-gray-900 text-right">{formatCurrency(member.totalIncentives || 0)}</td>
                            <td className="px-3 py-3 text-sm font-semibold text-gray-900 text-right">{formatCurrency(member.totalSalary)}</td>
                          </tr>
                          {/* Manager/Owner Pay Breakdown */}
                          {isExpanded && member.isManagerOrOwner && (
                            <tr>
                              <td colSpan="10" className="p-0">
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
                                          <td className="py-2 pr-4 text-gray-700">Commission</td>
                                          <td className="py-2 pr-4 text-right text-gray-700">Total revenue: {formatCurrency(payrollData?.totalBusinessRevenue || 0)}</td>
                                          <td className="py-2 pr-4 text-right text-gray-700">{member.teamMember.commissionPercentage}%</td>
                                          <td className="py-2 text-right font-semibold text-purple-700">{formatCurrency(member.commissionSalary)}</td>
                                        </tr>
                                      )}
                                      {member.teamMember.hourlyRate > 0 && (
                                        <tr>
                                          <td className="py-2 pr-4 text-gray-700">Hourly (Scheduled)</td>
                                          <td className="py-2 pr-4 text-right text-gray-700">{(member.scheduledHours || 0).toFixed(1)} scheduled hrs</td>
                                          <td className="py-2 pr-4 text-right text-gray-700">${member.teamMember.hourlyRate}/hr</td>
                                          <td className="py-2 text-right font-semibold text-purple-700">{formatCurrency(member.hourlySalary || 0)}</td>
                                        </tr>
                                      )}
                                      {(member.totalTips || 0) > 0 && (
                                        <tr>
                                          <td className="py-2 pr-4 text-gray-700">Tips</td>
                                          <td className="py-2 pr-4 text-right text-gray-500">—</td>
                                          <td className="py-2 pr-4 text-right text-gray-500">—</td>
                                          <td className="py-2 text-right font-semibold text-purple-700">{formatCurrency(member.totalTips)}</td>
                                        </tr>
                                      )}
                                      {(member.totalIncentives || 0) > 0 && (
                                        <tr>
                                          <td className="py-2 pr-4 text-gray-700">Incentives</td>
                                          <td className="py-2 pr-4 text-right text-gray-500">—</td>
                                          <td className="py-2 pr-4 text-right text-gray-500">—</td>
                                          <td className="py-2 text-right font-semibold text-purple-700">{formatCurrency(member.totalIncentives)}</td>
                                        </tr>
                                      )}
                                    </tbody>
                                    <tfoot>
                                      <tr className="border-t-2 border-purple-200">
                                        <td colSpan="3" className="py-2 pr-4 text-right font-semibold text-gray-900">Total Pay</td>
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
                                                <td className="py-1.5 pr-3 text-gray-700 whitespace-nowrap">{formatShortDate(rj.scheduledDate)}</td>
                                                <td className="py-1.5 pr-3 text-gray-900 font-medium truncate max-w-[150px]">{rj.serviceName}</td>
                                                <td className="py-1.5 pr-3 text-gray-700 truncate max-w-[120px]">{rj.customerName}</td>
                                                <td className="py-1.5 pr-3">
                                                  <span className={`inline-block px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                                                    rj.status === 'completed' ? 'bg-green-100 text-green-700' :
                                                    rj.status === 'in-progress' ? 'bg-blue-100 text-blue-700' :
                                                    rj.status === 'scheduled' ? 'bg-yellow-100 text-yellow-700' :
                                                    'bg-gray-100 text-gray-600'
                                                  }`}>{rj.status}</span>
                                                </td>
                                                <td className="py-1.5 pr-3 text-right text-gray-500">{formatCurrency(rj.grossPrice || 0)}</td>
                                                <td className="py-1.5 pr-3 text-right text-red-500">{rj.taxes > 0 ? `-${formatCurrency(rj.taxes)}` : '-'}</td>
                                                <td className="py-1.5 text-right text-gray-900 font-medium">{formatCurrency(rj.revenue)}</td>
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
                              <td colSpan="10" className="p-0">
                                <div className="bg-gray-50 border-t border-b border-gray-100 px-3 py-2">
                                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Job Breakdown</p>
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="text-gray-500 uppercase tracking-wider">
                                        <th className="text-left py-2 pr-4 font-medium">Date</th>
                                        <th className="text-left py-2 pr-4 font-medium">Name</th>
                                        <th className="text-left py-2 pr-4 font-medium">Status</th>
                                        <th className="text-right py-2 pr-4 font-medium">Hours</th>
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
                                        <tr key={job.id} className="border-t border-gray-200 hover:bg-gray-100 cursor-pointer" onClick={(e) => { e.stopPropagation(); navigate(`/job/${job.id}`) }}>
                                          <td className="py-2 pr-4 text-gray-700 whitespace-nowrap">{formatShortDate(job.scheduledDate)}</td>
                                          <td className="py-2 pr-4 text-gray-900 font-medium">{job.customerName}</td>
                                          <td className="py-2 pr-4">
                                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                                              job.status === 'completed' ? 'bg-green-100 text-green-700' :
                                              job.status === 'in-progress' ? 'bg-blue-100 text-blue-700' :
                                              job.status === 'scheduled' ? 'bg-yellow-100 text-yellow-700' :
                                              'bg-gray-100 text-gray-600'
                                            }`}>{job.status}</span>
                                          </td>
                                          <td className="py-2 pr-4 text-right text-gray-700">{job.hours.toFixed(2)}</td>
                                          <td className="py-2 pr-4 text-right text-gray-700">
                                            {job.memberCount > 1 && job.fullRevenue
                                              ? <span>{formatCurrency(job.revenue)} <span className="text-gray-400 text-xs">({formatCurrency(job.fullRevenue)})</span></span>
                                              : formatCurrency(job.revenue)}
                                          </td>
                                          <td className="py-2 pr-4 text-right text-gray-700">{formatCurrency(job.hourlySalary)}</td>
                                          <td className="py-2 pr-4 text-right text-gray-700">{formatCurrency(job.commission)}</td>
                                          <td className="py-2 pr-4 text-right text-gray-700">{job.tip > 0 ? formatCurrency(job.tip) : '-'}</td>
                                          <td className="py-2 pr-4 text-right text-gray-700">{job.incentive > 0 ? formatCurrency(job.incentive) : '-'}</td>
                                          <td className="py-2 text-right text-gray-900 font-medium">{formatCurrency((job.hourlySalary || 0) + (job.commission || 0) + (job.tip || 0) + (job.incentive || 0))}</td>
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
                      <tfoot className="bg-gray-50">
                        <tr>
                          <td colSpan="3" className="px-3 py-3 text-sm font-semibold text-gray-900 text-right">Totals:</td>
                          <td className="px-2 py-3 text-sm font-semibold text-gray-900 text-right">{filteredSummary.totalHours.toFixed(1)}</td>
                          <td className="px-2 py-3 text-sm font-semibold text-indigo-700 text-right">{(filteredSummary.totalScheduledHours || 0).toFixed(1)}</td>
                          <td className="px-2 py-3 text-sm font-semibold text-gray-900 text-right">{formatCurrency(filteredSummary.totalHourlySalary || 0)}</td>
                          <td className="px-2 py-3 text-sm font-semibold text-gray-900 text-right">{formatCurrency(filteredSummary.totalCommission || 0)}</td>
                          <td className="px-2 py-3 text-sm font-semibold text-gray-900 text-right">{formatCurrency(filteredSummary.totalTips || 0)}</td>
                          <td className="px-2 py-3 text-sm font-semibold text-gray-900 text-right">{formatCurrency(filteredSummary.totalIncentives || 0)}</td>
                          <td className="px-3 py-3 text-sm font-semibold text-gray-900 text-right">{formatCurrency(filteredSummary.totalSalary)}</td>
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
                <div className="bg-white rounded-xl p-5 border shadow-sm">
                  <div className="text-sm text-gray-500 mb-1">Total Unpaid Balance</div>
                  <div className={`text-2xl font-bold ${totalUnpaidBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(totalUnpaidBalance)}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">Owed to all cleaners</div>
                </div>
                <div className="bg-white rounded-xl p-5 border shadow-sm">
                  <div className="text-sm text-gray-500 mb-1">Active Cleaners</div>
                  <div className="text-2xl font-bold text-gray-900">{balances.length}</div>
                  <div className="text-xs text-gray-400 mt-1">With ledger activity</div>
                </div>
                <div className="bg-white rounded-xl p-5 border shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="text-sm text-gray-500 mb-1">Backfill</div>
                      <div className="text-xs text-gray-400">Create ledger for past completed jobs</div>
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
                      <div className="text-sm text-gray-700 mb-2">
                        <span className="font-semibold">{backfillPreview.would_process}</span> jobs to process
                        <span className="text-gray-400 ml-2">({backfillPreview.already_have_entries} already have entries)</span>
                      </div>
                      {backfillPreview.would_process > 0 ? (
                        <div className="flex gap-2">
                          <button onClick={handleBackfillRun} disabled={backfillLoading}
                            className="px-3 py-2 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
                            {backfillLoading ? 'Processing...' : `Process ${backfillPreview.would_process} jobs`}
                          </button>
                          <button onClick={() => setBackfillPreview(null)}
                            className="px-3 py-2 text-xs border rounded-lg hover:bg-gray-50">Cancel</button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Check size={14} className="text-green-600" />
                          <span className="text-sm text-green-700">All jobs already have ledger entries</span>
                          <button onClick={() => setBackfillPreview(null)}
                            className="ml-2 px-2 py-1 text-xs border rounded hover:bg-gray-50">Dismiss</button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Progress bar */}
                  {backfillLoading && backfillProgress > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                        <span>Processing jobs...</span>
                        <span>{backfillProgress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                          style={{ width: `${backfillProgress}%` }}></div>
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
                      <div className="text-xs text-gray-600">
                        {backfillResult.processed} processed, {backfillResult.already_had_entries} already had entries{backfillResult.errors > 0 && `, ${backfillResult.errors} errors`}
                      </div>
                      <button onClick={() => { setBackfillResult(null); setBackfillProgress(0) }}
                        className="mt-2 px-2 py-1 text-xs border rounded hover:bg-gray-50">Dismiss</button>
                    </div>
                  )}
                </div>
              </div>

              {/* Date Filter */}
              <div className="bg-white rounded-xl border shadow-sm p-4 mb-4">
                <div className="flex flex-wrap gap-3 items-center">
                  <Filter size={14} className="text-gray-400" />
                  <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
                    <input type="checkbox" checked={balancesAllTime} onChange={(e) => setBalancesAllTime(e.target.checked)}
                      className="rounded border-gray-300" />
                    All Time
                  </label>
                  {!balancesAllTime && (
                    <>
                      <div className="flex items-center space-x-2">
                        <label className="text-sm text-gray-600">From:</label>
                        <input type="date" value={balancesStartDate} onChange={(e) => setBalancesStartDate(e.target.value)}
                          className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                      </div>
                      <div className="flex items-center space-x-2">
                        <label className="text-sm text-gray-600">To:</label>
                        <input type="date" value={balancesEndDate} onChange={(e) => setBalancesEndDate(e.target.value)}
                          className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                      </div>
                    </>
                  )}
                  <button onClick={fetchBalances} disabled={balancesLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                    Apply
                  </button>
                </div>
              </div>

              {/* Cleaner Balances Table */}
              <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Cleaner Balances</h2>
                  {balances.length > 0 && (
                    <button onClick={copyBalancesTable}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 border rounded-lg hover:bg-gray-100">
                      <ClipboardCopy size={13} />
                      {copiedBalances ? 'Copied!' : 'Copy Table'}
                    </button>
                  )}
                </div>
                {balancesLoading ? (
                  <div className="p-8 text-center text-gray-400">Loading...</div>
                ) : balances.length === 0 ? (
                  <div className="p-8 text-center text-gray-400">
                    <BookOpen size={40} className="mx-auto mb-3 text-gray-300" />
                    <p>No ledger data yet. Complete jobs or run a backfill to populate.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                        <tr>
                          <th className="px-4 py-3 text-left">Cleaner</th>
                          <th className="px-4 py-3 text-center">Jobs</th>
                          <th className="px-4 py-3 text-right">Balance</th>
                          <th className="px-4 py-3 text-right hidden sm:table-cell">Earnings</th>
                          <th className="px-4 py-3 text-right hidden sm:table-cell">Tips</th>
                          <th className="px-4 py-3 text-right hidden md:table-cell">Cash Offset</th>
                          <th className="px-4 py-3 text-right hidden md:table-cell">Adjustments</th>
                          <th className="px-4 py-3 text-center">Schedule</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {balances.map(b => (
                          <tr key={b.team_member_id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium text-gray-900">{b.name || `ID ${b.team_member_id}`}</td>
                            <td className="px-4 py-3 text-center text-gray-600">{b.job_count || 0}</td>
                            <td className={`px-4 py-3 text-right font-semibold ${b.current_balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrency(b.current_balance)}
                            </td>
                            <td className="px-4 py-3 text-right hidden sm:table-cell text-gray-600">{formatCurrency(b.unpaid_earnings)}</td>
                            <td className="px-4 py-3 text-right hidden sm:table-cell text-gray-600">{formatCurrency(b.unpaid_tips)}</td>
                            <td className="px-4 py-3 text-right hidden md:table-cell text-gray-600">{formatCurrency(b.unpaid_cash_offsets)}</td>
                            <td className="px-4 py-3 text-right hidden md:table-cell text-gray-600">{formatCurrency(b.unpaid_adjustments)}</td>
                            <td className="px-4 py-3 text-center">
                              <span className="text-xs px-2 py-1 bg-gray-100 rounded-full text-gray-600 capitalize">
                                {b.payout_schedule || 'manual'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-100 font-semibold text-sm">
                        <tr>
                          <td className="px-4 py-3 text-left">Totals</td>
                          <td className="px-4 py-3 text-center">{balances.reduce((s, b) => s + (b.job_count || 0), 0)}</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(balances.reduce((s, b) => s + (b.current_balance || 0), 0))}</td>
                          <td className="px-4 py-3 text-right hidden sm:table-cell">{formatCurrency(balances.reduce((s, b) => s + (b.unpaid_earnings || 0), 0))}</td>
                          <td className="px-4 py-3 text-right hidden sm:table-cell">{formatCurrency(balances.reduce((s, b) => s + (b.unpaid_tips || 0), 0))}</td>
                          <td className="px-4 py-3 text-right hidden md:table-cell">{formatCurrency(balances.reduce((s, b) => s + (b.unpaid_cash_offsets || 0), 0))}</td>
                          <td className="px-4 py-3 text-right hidden md:table-cell">{formatCurrency(balances.reduce((s, b) => s + (b.unpaid_adjustments || 0), 0))}</td>
                          <td className="px-4 py-3"></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══════════════ LEDGER TAB ═══════════════ */}
          {activeTab === 'ledger' && (
            <div>
              {/* Filters */}
              <div className="bg-white rounded-xl border shadow-sm p-4 mb-4">
                <div className="flex flex-wrap gap-3 items-end">
                  <div className="flex-1 min-w-[140px]">
                    <label className="text-xs text-gray-500 mb-1 block">Team Member</label>
                    <select value={filterMember} onChange={e => { setFilterMember(e.target.value); setEntriesPage(1) }}
                      className="w-full border rounded-lg px-3 py-2 text-sm">
                      <option value="">All</option>
                      {teamMembers.map(tm => (
                        <option key={tm.id} value={tm.id}>{tm.first_name} {tm.last_name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="min-w-[120px]">
                    <label className="text-xs text-gray-500 mb-1 block">Type</label>
                    <select value={filterType} onChange={e => { setFilterType(e.target.value); setEntriesPage(1) }}
                      className="w-full border rounded-lg px-3 py-2 text-sm">
                      <option value="">All</option>
                      {Object.entries(TYPE_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div className="min-w-[110px]">
                    <label className="text-xs text-gray-500 mb-1 block">Status</label>
                    <select value={filterPayoutStatus} onChange={e => { setFilterPayoutStatus(e.target.value); setEntriesPage(1) }}
                      className="w-full border rounded-lg px-3 py-2 text-sm">
                      <option value="">All</option>
                      <option value="unpaid">Unpaid</option>
                      <option value="paid">Paid</option>
                    </select>
                  </div>
                  <div className="min-w-[130px]">
                    <label className="text-xs text-gray-500 mb-1 block">From</label>
                    <input type="date" value={filterStartDate} onChange={e => { setFilterStartDate(e.target.value); setEntriesPage(1) }}
                      className="w-full border rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div className="min-w-[130px]">
                    <label className="text-xs text-gray-500 mb-1 block">To</label>
                    <input type="date" value={filterEndDate} onChange={e => { setFilterEndDate(e.target.value); setEntriesPage(1) }}
                      className="w-full border rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <button onClick={() => fetchEntries()} className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm hover:bg-gray-900">
                    <Filter size={14} className="inline mr-1" /> Apply
                  </button>
                </div>
              </div>

              {/* Entries Table */}
              <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                {entriesLoading ? (
                  <div className="p-8 text-center text-gray-400">Loading...</div>
                ) : entries.length === 0 ? (
                  <div className="p-8 text-center text-gray-400">No ledger entries found</div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
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
                        <tbody className="divide-y">
                          {entries.map(e => (
                            <tr key={e.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-gray-600">{formatDate(e.effective_date)}</td>
                              <td className="px-4 py-3 font-medium text-gray-900">
                                {e.team_members ? `${e.team_members.first_name || ''} ${e.team_members.last_name || ''}`.trim() : '-'}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${TYPE_COLORS[e.type] || 'bg-gray-100'}`}>
                                  {TYPE_LABELS[e.type] || e.type}
                                </span>
                              </td>
                              <td className={`px-4 py-3 text-right font-semibold ${parseFloat(e.amount) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrency(e.amount)}
                              </td>
                              <td className="px-4 py-3 hidden sm:table-cell text-gray-500">
                                {e.job_id ? (
                                  <button onClick={() => navigate(`/job/${e.job_id}`)} className="text-blue-600 hover:underline">#{e.job_id}</button>
                                ) : '-'}
                              </td>
                              <td className="px-4 py-3 hidden md:table-cell text-gray-500 max-w-[200px] truncate">{e.note || '-'}</td>
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
                    <div className="px-4 py-3 border-t flex items-center justify-between text-sm text-gray-500">
                      <span>{entriesTotal} total entries</span>
                      <div className="flex gap-2">
                        <button disabled={entriesPage <= 1} onClick={() => setEntriesPage(p => p - 1)}
                          className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50">Prev</button>
                        <span className="px-3 py-1">Page {entriesPage}</span>
                        <button disabled={entries.length < 50} onClick={() => setEntriesPage(p => p + 1)}
                          className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50">Next</button>
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
              <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b">
                  <h2 className="text-lg font-semibold text-gray-900">Payout Batches</h2>
                </div>
                {batchesLoading ? (
                  <div className="p-8 text-center text-gray-400">Loading...</div>
                ) : batches.length === 0 ? (
                  <div className="p-8 text-center text-gray-400">
                    <Banknote size={40} className="mx-auto mb-3 text-gray-300" />
                    <p>No payout batches yet. Create one to settle cleaner balances.</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {batches.map(batch => (
                      <div key={batch.id}>
                        <div className="px-5 py-4 flex items-center justify-between hover:bg-gray-50 cursor-pointer"
                          onClick={() => handleViewBatch(batch.id)}>
                          <div className="flex items-center gap-4">
                            <button className="text-gray-400">
                              {expandedBatch === batch.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </button>
                            <div>
                              <div className="font-medium text-gray-900">
                                {batch.team_members ? `${batch.team_members.first_name} ${batch.team_members.last_name}` : `Batch #${batch.id}`}
                              </div>
                              <div className="text-xs text-gray-500">
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
                          <div className="px-5 pb-4 bg-gray-50 border-t">
                            <div className="mt-3">
                              {batch.paid_at && <p className="text-xs text-gray-500 mb-2">Paid on: {formatDate(batch.paid_at)}</p>}
                              {batch.note && <p className="text-xs text-gray-500 mb-2">Note: {batch.note}</p>}
                              <table className="w-full text-xs mt-2">
                                <thead className="text-gray-500 uppercase">
                                  <tr>
                                    <th className="py-1 text-left">Date</th>
                                    <th className="py-1 text-left">Type</th>
                                    <th className="py-1 text-right">Amount</th>
                                    <th className="py-1 text-left">Note</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
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
                                      <td className="py-1 text-gray-500 truncate max-w-[200px]">{e.note || '-'}</td>
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
            <h3 className="text-lg font-bold text-gray-900 mb-4">Create Adjustment</h3>
            {modalError && <div className="text-sm text-red-600 bg-red-50 p-2 rounded mb-3">{modalError}</div>}
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Team Member *</label>
                <select value={adjTeamMember} onChange={e => setAdjTeamMember(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="">Select...</option>
                  {teamMembers.map(tm => (
                    <option key={tm.id} value={tm.id}>{tm.first_name} {tm.last_name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-sm text-gray-600 mb-1 block">Amount *</label>
                  <input type="number" step="0.01" value={adjAmount} onChange={e => setAdjAmount(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="0.00" />
                </div>
                <div>
                  <label className="text-sm text-gray-600 mb-1 block">Direction</label>
                  <select value={adjDirection} onChange={e => setAdjDirection(e.target.value)}
                    className="border rounded-lg px-3 py-2 text-sm">
                    <option value="positive">+ Credit</option>
                    <option value="negative">- Debit</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Job ID (optional)</label>
                <input type="text" value={adjJobId} onChange={e => setAdjJobId(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Job ID" />
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Reason / Note *</label>
                <textarea value={adjNote} onChange={e => setAdjNote(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} placeholder="Reason for adjustment..." />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setShowAdjustmentModal(false)} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancel</button>
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
            <h3 className="text-lg font-bold text-gray-900 mb-4">Record Cash Collected</h3>
            <p className="text-xs text-gray-500 mb-3">Record cash the cleaner collected directly from the customer. This reduces their payout balance.</p>
            {modalError && <div className="text-sm text-red-600 bg-red-50 p-2 rounded mb-3">{modalError}</div>}
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Team Member *</label>
                <select value={cashTeamMember} onChange={e => setCashTeamMember(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="">Select...</option>
                  {teamMembers.map(tm => (
                    <option key={tm.id} value={tm.id}>{tm.first_name} {tm.last_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Amount Collected *</label>
                <input type="number" step="0.01" value={cashAmount} onChange={e => setCashAmount(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="0.00" />
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Job ID (optional)</label>
                <input type="text" value={cashJobId} onChange={e => setCashJobId(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Job ID" />
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Note</label>
                <input type="text" value={cashNote} onChange={e => setCashNote(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Optional note" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setShowCashModal(false)} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleRecordCash} disabled={modalLoading}
                className="px-4 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50">
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
            <h3 className="text-lg font-bold text-gray-900 mb-4">Create Payout Batch</h3>
            <p className="text-xs text-gray-500 mb-3">Groups all unpaid ledger entries in the selected period into a payout batch.</p>
            {modalError && <div className="text-sm text-red-600 bg-red-50 p-2 rounded mb-3">{modalError}</div>}
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Team Member *</label>
                <select value={payTeamMember} onChange={e => setPayTeamMember(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="">Select...</option>
                  {teamMembers.map(tm => (
                    <option key={tm.id} value={tm.id}>{tm.first_name} {tm.last_name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-sm text-gray-600 mb-1 block">Period Start *</label>
                  <input type="date" value={payPeriodStart} onChange={e => setPayPeriodStart(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div className="flex-1">
                  <label className="text-sm text-gray-600 mb-1 block">Period End *</label>
                  <input type="date" value={payPeriodEnd} onChange={e => setPayPeriodEnd(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Note</label>
                <input type="text" value={payNote} onChange={e => setPayNote(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Optional note" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setShowPayoutModal(false)} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancel</button>
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

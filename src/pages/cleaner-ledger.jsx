"use client"

import React, { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import {
  ChevronLeft, DollarSign, Calendar, Users, Filter, Download,
  Plus, Minus, CreditCard, ChevronDown, ChevronRight, Check,
  X, AlertCircle, Clock, ArrowUpDown, BookOpen, Banknote
} from "lucide-react"
import { ledgerAPI, teamAPI } from "../services/api"
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

const CleanerLedger = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  // Overview state
  const [balances, setBalances] = useState([])
  const [balancesLoading, setBalancesLoading] = useState(true)

  // Entries state
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

  // Payout batches state
  const [batches, setBatches] = useState([])
  const [batchesLoading, setBatchesLoading] = useState(false)
  const [expandedBatch, setExpandedBatch] = useState(null)
  const [batchDetail, setBatchDetail] = useState(null)

  // Team members for dropdowns
  const [teamMembers, setTeamMembers] = useState([])

  // Modals
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

  // Backfill state
  const [backfillLoading, setBackfillLoading] = useState(false)
  const [backfillResult, setBackfillResult] = useState(null)

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
      const data = await ledgerAPI.getBalances()
      setBalances(data || [])
    } catch (err) {
      console.error('Error fetching balances:', err)
    } finally {
      setBalancesLoading(false)
    }
  }, [])

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

  useEffect(() => {
    if (user?.id) {
      fetchTeamMembers()
      fetchBalances()
    }
  }, [user?.id, fetchTeamMembers, fetchBalances])

  useEffect(() => {
    if (activeTab === 'entries') fetchEntries()
  }, [activeTab, fetchEntries])

  useEffect(() => {
    if (activeTab === 'payouts') fetchBatches()
  }, [activeTab, fetchBatches])

  // Handlers
  const handleCreateAdjustment = async () => {
    if (!adjTeamMember || !adjAmount || !adjNote.trim()) {
      setModalError('Team member, amount, and note are required')
      return
    }
    setModalLoading(true)
    setModalError('')
    try {
      const amount = adjDirection === 'negative' ? -Math.abs(parseFloat(adjAmount)) : Math.abs(parseFloat(adjAmount))
      await ledgerAPI.createAdjustment({
        teamMemberId: adjTeamMember,
        amount,
        note: adjNote,
        jobId: adjJobId || undefined
      })
      setShowAdjustmentModal(false)
      setAdjTeamMember(''); setAdjAmount(''); setAdjNote(''); setAdjJobId('')
      fetchBalances()
      if (activeTab === 'entries') fetchEntries()
    } catch (err) {
      setModalError(err.response?.data?.error || 'Failed to create adjustment')
    } finally {
      setModalLoading(false)
    }
  }

  const handleRecordCash = async () => {
    if (!cashTeamMember || !cashAmount) {
      setModalError('Team member and amount are required')
      return
    }
    setModalLoading(true)
    setModalError('')
    try {
      await ledgerAPI.recordCashCollected({
        teamMemberId: cashTeamMember,
        amount: parseFloat(cashAmount),
        note: cashNote || undefined,
        jobId: cashJobId || undefined
      })
      setShowCashModal(false)
      setCashTeamMember(''); setCashAmount(''); setCashNote(''); setCashJobId('')
      fetchBalances()
      if (activeTab === 'entries') fetchEntries()
    } catch (err) {
      setModalError(err.response?.data?.error || 'Failed to record cash')
    } finally {
      setModalLoading(false)
    }
  }

  const handleCreatePayout = async () => {
    if (!payTeamMember || !payPeriodStart || !payPeriodEnd) {
      setModalError('Team member and period dates are required')
      return
    }
    setModalLoading(true)
    setModalError('')
    try {
      await ledgerAPI.createPayoutBatch({
        teamMemberId: payTeamMember,
        periodStart: payPeriodStart,
        periodEnd: payPeriodEnd,
        note: payNote || undefined
      })
      setShowPayoutModal(false)
      setPayTeamMember(''); setPayPeriodStart(''); setPayPeriodEnd(''); setPayNote('')
      fetchBatches()
      fetchBalances()
    } catch (err) {
      setModalError(err.response?.data?.error || 'Failed to create payout batch')
    } finally {
      setModalLoading(false)
    }
  }

  const handleMarkPaid = async (batchId) => {
    if (!window.confirm('Mark this payout batch as paid? This will create a payout ledger entry.')) return
    try {
      await ledgerAPI.markBatchPaid(batchId)
      fetchBatches()
      fetchBalances()
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to mark batch as paid')
    }
  }

  const handleCancelBatch = async (batchId) => {
    if (!window.confirm('Cancel this payout batch? Ledger entries will be detached and become unpaid again.')) return
    try {
      await ledgerAPI.cancelBatch(batchId)
      fetchBatches()
      fetchBalances()
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to cancel batch')
    }
  }

  const handleViewBatch = async (batchId) => {
    if (expandedBatch === batchId) {
      setExpandedBatch(null)
      setBatchDetail(null)
      return
    }
    try {
      const data = await ledgerAPI.getPayoutBatch(batchId)
      setBatchDetail(data)
      setExpandedBatch(batchId)
    } catch (err) {
      console.error('Error fetching batch detail:', err)
    }
  }

  const handleBackfill = async () => {
    if (!window.confirm('This will create ledger entries for all existing completed jobs that don\'t have them yet. Continue?')) return
    setBackfillLoading(true)
    try {
      const result = await ledgerAPI.backfill({ dryRun: false })
      setBackfillResult(result)
      fetchBalances()
    } catch (err) {
      alert(err.response?.data?.error || 'Backfill failed')
    } finally {
      setBackfillLoading(false)
    }
  }

  const formatCurrency = (amount) => {
    const num = parseFloat(amount) || 0
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num)
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const totalUnpaidBalance = balances.reduce((sum, b) => sum + (b.current_balance || 0), 0)

  // Tabs
  const tabs = [
    { id: 'overview', label: 'Overview', icon: Users },
    { id: 'entries', label: 'Ledger', icon: BookOpen },
    { id: 'payouts', label: 'Payouts', icon: Banknote }
  ]

  return (
    <div className="flex min-h-screen bg-gray-50" style={{ fontFamily: 'Montserrat' }}>
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <MobileHeader onMenuClick={() => setSidebarOpen(true)} />
      <div className="flex-1 md:ml-56 pt-16 md:pt-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg">
                <ChevronLeft size={20} />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Cleaner Ledger</h1>
                <p className="text-sm text-gray-500">Financial tracking and payout management</p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => { setShowCashModal(true); setModalError('') }}
                className="px-3 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 flex items-center gap-1"
              >
                <Banknote size={16} /> Cash Collected
              </button>
              <button
                onClick={() => { setShowAdjustmentModal(true); setModalError('') }}
                className="px-3 py-2 text-sm bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 flex items-center gap-1"
              >
                <ArrowUpDown size={16} /> Adjustment
              </button>
              <button
                onClick={() => { setShowPayoutModal(true); setModalError('') }}
                className="px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-1"
              >
                <CreditCard size={16} /> Create Payout
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* ===== OVERVIEW TAB ===== */}
          {activeTab === 'overview' && (
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
                <div className="bg-white rounded-xl p-5 border shadow-sm flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Backfill</div>
                    <div className="text-xs text-gray-400">Create ledger for past jobs</div>
                  </div>
                  <button
                    onClick={handleBackfill}
                    disabled={backfillLoading}
                    className="px-3 py-2 text-xs bg-gray-800 text-white rounded-lg hover:bg-gray-900 disabled:opacity-50"
                  >
                    {backfillLoading ? 'Processing...' : 'Run Backfill'}
                  </button>
                </div>
              </div>

              {backfillResult && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-sm">
                  Backfill complete: {backfillResult.processed} jobs processed, {backfillResult.already_had_entries} already had entries, {backfillResult.errors || 0} errors
                </div>
              )}

              {/* Cleaner Balances Table */}
              <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b">
                  <h2 className="text-lg font-semibold text-gray-900">Cleaner Balances</h2>
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
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ===== ENTRIES TAB ===== */}
          {activeTab === 'entries' && (
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
                                  <button onClick={() => navigate(`/job/${e.job_id}`)} className="text-blue-600 hover:underline">
                                    #{e.job_id}
                                  </button>
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
                    {/* Pagination */}
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

          {/* ===== PAYOUTS TAB ===== */}
          {activeTab === 'payouts' && (
            <div>
              <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b flex items-center justify-between">
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
                            }`}>
                              {batch.status}
                            </span>
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
                        {/* Expanded detail */}
                        {expandedBatch === batch.id && batchDetail && (
                          <div className="px-5 pb-4 bg-gray-50 border-t">
                            <div className="mt-3">
                              {batch.paid_at && (
                                <p className="text-xs text-gray-500 mb-2">Paid on: {formatDate(batch.paid_at)}</p>
                              )}
                              {batch.note && (
                                <p className="text-xs text-gray-500 mb-2">Note: {batch.note}</p>
                              )}
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

      {/* ===== ADJUSTMENT MODAL ===== */}
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

      {/* ===== CASH COLLECTED MODAL ===== */}
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

      {/* ===== PAYOUT BATCH MODAL ===== */}
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

export default CleanerLedger

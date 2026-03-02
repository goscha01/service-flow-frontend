"use client"

import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { ChevronLeft, Calendar, DollarSign, Clock, Users, Download, Filter, AlertCircle, CheckCircle, ChevronDown, ChevronRight } from "lucide-react"
import { payrollAPI, teamAPI } from "../services/api"
import { useAuth } from "../context/AuthContext"
import Sidebar from "../components/sidebar"
import MobileHeader from "../components/mobile-header"

const Payroll = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)  // initial full-page load
  const [refreshing, setRefreshing] = useState(false)  // subsequent fetches
  const [payrollData, setPayrollData] = useState(null)
  const [error, setError] = useState("")
  // Use local date strings (YYYY-MM-DD) so date range isn't off by one due to UTC
  const toLocalDateString = (d) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }
  const [startDate, setStartDate] = useState(() => {
    const date = new Date()
    date.setDate(1)
    return toLocalDateString(date)
  })
  const [endDate, setEndDate] = useState(() => {
    return toLocalDateString(new Date())
  })
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [selectedMemberId, setSelectedMemberId] = useState('all')
  const [expandedMembers, setExpandedMembers] = useState(new Set())

  useEffect(() => {
    if (user?.id) {
      fetchPayrollData()
    }
  }, [user?.id])

  const fetchPayrollData = async () => {
    if (!user?.id) return

    try {
      // Use full-page loading only on first load, subtle indicator for subsequent
      if (!payrollData) {
        setLoading(true)
      } else {
        setRefreshing(true)
      }
      setError("")
      const data = await payrollAPI.getPayroll(startDate, endDate)
      setPayrollData(data)
    } catch (error) {
      console.error('Error fetching payroll data:', error)
      setError(error.response?.data?.error || 'Failed to load payroll data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0)
  }

  const formatDate = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    })
  }

  // Filter team members and recalculate summary
  const filteredMembers = payrollData?.teamMembers?.filter(
    m => selectedMemberId === 'all' || String(m.teamMember.id) === String(selectedMemberId)
  ) || []

  const filteredSummary = payrollData ? (selectedMemberId === 'all' ? payrollData.summary : {
    totalTeamMembers: filteredMembers.length,
    totalHours: parseFloat(filteredMembers.reduce((s, m) => s + (m.totalHours || 0), 0).toFixed(2)),
    totalHourlySalary: parseFloat(filteredMembers.reduce((s, m) => s + (m.hourlySalary || 0), 0).toFixed(2)),
    totalCommission: parseFloat(filteredMembers.reduce((s, m) => s + (m.commissionSalary || 0), 0).toFixed(2)),
    totalTips: parseFloat(filteredMembers.reduce((s, m) => s + (m.totalTips || 0), 0).toFixed(2)),
    totalIncentives: parseFloat(filteredMembers.reduce((s, m) => s + (m.totalIncentives || 0), 0).toFixed(2)),
    totalSalary: parseFloat(filteredMembers.reduce((s, m) => s + (m.totalSalary || 0), 0).toFixed(2)),
  }) : null

  const toggleExpanded = (memberId) => {
    setExpandedMembers(prev => {
      const next = new Set(prev)
      if (next.has(memberId)) {
        next.delete(memberId)
      } else {
        next.add(memberId)
      }
      return next
    })
  }

  const handleExport = () => {
    if (!payrollData) return

    // Create CSV content
    let csv = 'Team Member,Job Count,Hours Worked,Hourly Rate,Commission %,Hourly Salary,Commission,Tips,Incentives,Total Salary,Payment Method\n'

    filteredMembers.forEach(member => {
      const hourlyRate = member.teamMember.hourlyRate ? formatCurrency(member.teamMember.hourlyRate) : 'N/A'
      const commissionPct = member.teamMember.commissionPercentage ? `${member.teamMember.commissionPercentage}%` : 'N/A'
      const paymentMethod = member.paymentMethod || 'none'
      csv += `"${member.teamMember.name}",${member.jobCount},${member.totalHours},${hourlyRate},${commissionPct},${formatCurrency(member.hourlySalary || 0)},${formatCurrency(member.commissionSalary || 0)},${formatCurrency(member.totalTips || 0)},${formatCurrency(member.totalIncentives || 0)},${formatCurrency(member.totalSalary)},${paymentMethod}\n`
    })

    csv += `\nSummary\n`
    csv += `Total Team Members,${filteredSummary.totalTeamMembers}\n`
    csv += `Total Hours,${filteredSummary.totalHours}\n`
    csv += `Total Hourly Salary,${formatCurrency(filteredSummary.totalHourlySalary || 0)}\n`
    csv += `Total Commission,${formatCurrency(filteredSummary.totalCommission || 0)}\n`
    csv += `Total Tips,${formatCurrency(filteredSummary.totalTips || 0)}\n`
    csv += `Total Incentives,${formatCurrency(filteredSummary.totalIncentives || 0)}\n`
    csv += `Total Salary,${formatCurrency(filteredSummary.totalSalary)}\n`

    // Download CSV
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
        {/* Mobile Header */}
        <MobileHeader pageTitle="Payroll" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => navigate('/team')}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Payroll</h1>
                  <p className="text-sm text-gray-500 mt-1">Calculate and manage team member salaries</p>
                </div>
              </div>
              <button
                onClick={handleExport}
                disabled={!payrollData || filteredMembers.length === 0}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </button>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0 sm:space-x-4">
                <div className="flex items-center space-x-2">
                  <Filter className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-700">Filters:</span>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center space-x-2">
                    <label className="text-sm text-gray-600">From:</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <label className="text-sm text-gray-600">To:</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <label className="text-sm text-gray-600">Member:</label>
                    <select
                      value={selectedMemberId}
                      onChange={(e) => setSelectedMemberId(e.target.value)}
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="all">All Members</option>
                      {(payrollData?.teamMembers || []).map(m => (
                        <option key={m.teamMember.id} value={m.teamMember.id}>
                          {m.teamMember.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={fetchPayrollData}
                    disabled={refreshing}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {refreshing && <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>}
                    Apply
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4 rounded">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
            </div>
          )}

          {/* Summary Card */}
          {payrollData && (
            <div className={`transition-opacity duration-200 ${refreshing ? 'opacity-50 pointer-events-none' : ''}`}>
              <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Summary</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
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
                      <span className="text-sm text-gray-600">Total Hours</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{filteredSummary.totalHours.toFixed(2)}</p>
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

              {/* Team Members List */}
              {filteredMembers.length === 0 ? (
                <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Team Members</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    No active team members found. Add team members to start tracking payroll.
                  </p>
                  <button
                    onClick={() => navigate('/team')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                  >
                    Go to Team
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Team Member
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Payment Method
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Jobs
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Hours Worked
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Hourly Salary
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Commission
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Tips
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Incentives
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Total Salary
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredMembers.map((member) => {
                          const isExpanded = expandedMembers.has(member.teamMember.id)
                          return (
                          <React.Fragment key={member.teamMember.id}>
                          <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => toggleExpanded(member.teamMember.id)}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                  <span className="text-blue-600 font-semibold text-sm">
                                    {member.teamMember.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                                  </span>
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900 flex items-center gap-1">
                                    {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                                    {member.teamMember.name}
                                  </div>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); toggleExpanded(member.teamMember.id) }}
                                    className="text-xs text-blue-600 hover:text-blue-700"
                                  >
                                    {isExpanded ? 'Hide Details' : 'View Details'}
                                  </button>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <div className="space-y-1">
                                {member.teamMember.hourlyRate && (
                                  <div className="text-xs">
                                    <span className="text-gray-500">Hourly:</span> {formatCurrency(member.teamMember.hourlyRate)}/hr
                                  </div>
                                )}
                                {member.teamMember.commissionPercentage && (
                                  <div className="text-xs">
                                    <span className="text-gray-500">Commission:</span> {member.teamMember.commissionPercentage}%
                                  </div>
                                )}
                                {!member.teamMember.hourlyRate && !member.teamMember.commissionPercentage && (
                                  <div className="space-y-1">
                                    <span className="text-gray-400 italic text-xs">Not set</span>
                                    <div className="text-xs text-orange-600">
                                      Set rate in team settings
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {member.jobCount}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {member.totalHours.toFixed(2)} hrs
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatCurrency(member.hourlySalary || 0)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatCurrency(member.commissionSalary || 0)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatCurrency(member.totalTips || 0)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatCurrency(member.totalIncentives || 0)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 text-right">
                              {formatCurrency(member.totalSalary)}
                            </td>
                          </tr>
                          {isExpanded && member.jobs && member.jobs.length > 0 && (
                            <tr>
                              <td colSpan="9" className="px-0 py-0">
                                <div className="bg-gray-50 border-t border-b border-gray-200 px-6 py-3">
                                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Job Breakdown</h4>
                                  <div className="overflow-x-auto">
                                    <table className="min-w-full text-xs">
                                      <thead>
                                        <tr className="text-gray-500 uppercase">
                                          <th className="text-left py-1 pr-4 font-medium">Date</th>
                                          <th className="text-left py-1 pr-4 font-medium">Service</th>
                                          <th className="text-left py-1 pr-4 font-medium">Status</th>
                                          <th className="text-right py-1 pr-4 font-medium">Hours</th>
                                          <th className="text-right py-1 pr-4 font-medium">Revenue</th>
                                          <th className="text-right py-1 pr-4 font-medium">Hourly</th>
                                          <th className="text-right py-1 pr-4 font-medium">Commission</th>
                                          <th className="text-right py-1 pr-4 font-medium">Tip</th>
                                          <th className="text-right py-1 font-medium">Incentive</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {member.jobs.map(job => (
                                          <tr key={job.id} className="border-t border-gray-200 hover:bg-gray-100 cursor-pointer" onClick={(e) => { e.stopPropagation(); navigate(`/job/${job.id}`) }}>
                                            <td className="py-2 pr-4 text-gray-700">{formatDate(job.scheduledDate)}</td>
                                            <td className="py-2 pr-4 text-gray-900 font-medium">{job.serviceName}</td>
                                            <td className="py-2 pr-4">
                                              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                                                job.status === 'completed' ? 'bg-green-100 text-green-700' :
                                                job.status === 'in-progress' ? 'bg-blue-100 text-blue-700' :
                                                job.status === 'scheduled' ? 'bg-yellow-100 text-yellow-700' :
                                                'bg-gray-100 text-gray-600'
                                              }`}>
                                                {job.status}
                                              </span>
                                            </td>
                                            <td className="py-2 pr-4 text-right text-gray-700">{job.hours.toFixed(2)}</td>
                                            <td className="py-2 pr-4 text-right text-gray-700">{formatCurrency(job.revenue)}</td>
                                            <td className="py-2 pr-4 text-right text-gray-700">{formatCurrency(job.hourlySalary)}</td>
                                            <td className="py-2 pr-4 text-right text-gray-700">{formatCurrency(job.commission)}</td>
                                            <td className="py-2 pr-4 text-right text-gray-700">{job.tip > 0 ? formatCurrency(job.tip) : '-'}</td>
                                            <td className="py-2 text-right text-gray-700">{job.incentive > 0 ? formatCurrency(job.incentive) : '-'}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
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
                          <td colSpan="3" className="px-6 py-4 text-sm font-semibold text-gray-900 text-right">
                            Totals:
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                            {filteredSummary.totalHours.toFixed(2)} hrs
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                            {formatCurrency(filteredSummary.totalHourlySalary || 0)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                            {formatCurrency(filteredSummary.totalCommission || 0)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                            {formatCurrency(filteredSummary.totalTips || 0)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                            {formatCurrency(filteredSummary.totalIncentives || 0)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 text-right">
                            {formatCurrency(filteredSummary.totalSalary)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Payroll


"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { ChevronLeft, Calendar, DollarSign, Clock, Users, Download, Filter, AlertCircle, CheckCircle } from "lucide-react"
import { payrollAPI, teamAPI } from "../services/api"
import { useAuth } from "../context/AuthContext"
import Sidebar from "../components/sidebar"
import MobileHeader from "../components/mobile-header"

const Payroll = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [payrollData, setPayrollData] = useState(null)
  const [error, setError] = useState("")
  const [startDate, setStartDate] = useState(() => {
    const date = new Date()
    date.setDate(1) // First day of current month
    return date.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => {
    const date = new Date()
    return date.toISOString().split('T')[0]
  })
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (user?.id) {
      fetchPayrollData()
    }
  }, [user?.id, startDate, endDate])

  const fetchPayrollData = async () => {
    if (!user?.id) return

    try {
      setLoading(true)
      setError("")
      const data = await payrollAPI.getPayroll(startDate, endDate)
      setPayrollData(data)
    } catch (error) {
      console.error('Error fetching payroll data:', error)
      setError(error.response?.data?.error || 'Failed to load payroll data')
    } finally {
      setLoading(false)
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

  const handleExport = () => {
    if (!payrollData) return

    // Create CSV content
    let csv = 'Team Member,Job Count,Hours Worked,Hourly Rate,Commission %,Hourly Salary,Commission,Total Salary,Payment Method\n'
    
    payrollData.teamMembers.forEach(member => {
      const hourlyRate = member.teamMember.hourlyRate ? formatCurrency(member.teamMember.hourlyRate) : 'N/A'
      const commissionPct = member.teamMember.commissionPercentage ? `${member.teamMember.commissionPercentage}%` : 'N/A'
      const paymentMethod = member.paymentMethod || 'none'
      csv += `"${member.teamMember.name}",${member.jobCount},${member.totalHours},${hourlyRate},${commissionPct},${formatCurrency(member.hourlySalary || 0)},${formatCurrency(member.commissionSalary || 0)},${formatCurrency(member.totalSalary)},${paymentMethod}\n`
    })
    
    csv += `\nSummary\n`
    csv += `Total Team Members,${payrollData.summary.totalTeamMembers}\n`
    csv += `Total Hours,${payrollData.summary.totalHours}\n`
    csv += `Total Hourly Salary,${formatCurrency(payrollData.summary.totalHourlySalary || 0)}\n`
    csv += `Total Commission,${formatCurrency(payrollData.summary.totalCommission || 0)}\n`
    csv += `Total Salary,${formatCurrency(payrollData.summary.totalSalary)}\n`

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
                disabled={!payrollData || payrollData.teamMembers.length === 0}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </button>
            </div>

            {/* Date Range Filter */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0 sm:space-x-4">
                <div className="flex items-center space-x-2">
                  <Filter className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-700">Date Range:</span>
                </div>
                <div className="flex items-center space-x-3">
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
                  <button
                    onClick={fetchPayrollData}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                  >
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
            <>
              <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Summary</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Users className="w-5 h-5 text-gray-400" />
                      <span className="text-sm text-gray-600">Team Members</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{payrollData.summary.totalTeamMembers}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Clock className="w-5 h-5 text-gray-400" />
                      <span className="text-sm text-gray-600">Total Hours</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{payrollData.summary.totalHours.toFixed(2)}</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <DollarSign className="w-5 h-5 text-blue-400" />
                      <span className="text-sm text-blue-600">Hourly Salary</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-900">{formatCurrency(payrollData.summary.totalHourlySalary || 0)}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <DollarSign className="w-5 h-5 text-green-400" />
                      <span className="text-sm text-green-600">Commission</span>
                    </div>
                    <p className="text-2xl font-bold text-green-900">{formatCurrency(payrollData.summary.totalCommission || 0)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <DollarSign className="w-5 h-5 text-gray-400" />
                      <span className="text-sm text-gray-600">Total Salary</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(payrollData.summary.totalSalary)}</p>
                  </div>
                </div>
              </div>

              {/* Team Members List */}
              {payrollData.teamMembers.length === 0 ? (
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
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Total Salary
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {payrollData.teamMembers.map((member) => (
                          <tr key={member.teamMember.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                  <span className="text-blue-600 font-semibold text-sm">
                                    {member.teamMember.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                                  </span>
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">
                                    {member.teamMember.name}
                                  </div>
                                  <button
                                    onClick={() => navigate(`/team/${member.teamMember.id}`)}
                                    className="text-xs text-blue-600 hover:text-blue-700"
                                  >
                                    View Details
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
                                      ⚠️ Set hourly rate or commission in team member settings
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
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 text-right">
                              {formatCurrency(member.totalSalary)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50">
                        <tr>
                          <td colSpan="3" className="px-6 py-4 text-sm font-semibold text-gray-900 text-right">
                            Totals:
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                            {payrollData.summary.totalHours.toFixed(2)} hrs
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                            {formatCurrency(payrollData.summary.totalHourlySalary || 0)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                            {formatCurrency(payrollData.summary.totalCommission || 0)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 text-right">
                            {formatCurrency(payrollData.summary.totalSalary)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default Payroll


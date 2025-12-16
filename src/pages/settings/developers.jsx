"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import Sidebar from "../../components/sidebar"
import { ChevronLeft, Link2, Trash2, AlertTriangle, Calendar } from "lucide-react"
import { jobsAPI } from "../../services/api"
import { useAuth } from "../../context/AuthContext"
import Notification, { useNotification } from "../../components/notification"

const Developers = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navigate = useNavigate()
  const { user } = useAuth()
  const { notification, showNotification, hideNotification } = useNotification()
  const [importedJobsCount, setImportedJobsCount] = useState(0)
  const [loadingCount, setLoadingCount] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [deleteProgress, setDeleteProgress] = useState({ deleted: 0, total: 0 })
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [useDateRange, setUseDateRange] = useState(false)
  
  useEffect(() => {
    loadImportedJobsCount()
  }, [startDate, endDate, useDateRange])
  
  const loadImportedJobsCount = async () => {
    try {
      setLoadingCount(true)
      const params = {}
      if (useDateRange && startDate) params.startDate = startDate
      if (useDateRange && endDate) params.endDate = endDate
      const response = await jobsAPI.getImportedJobsCount(params)
      setImportedJobsCount(response.count || 0)
    } catch (error) {
      console.error('Error loading imported jobs count:', error)
    } finally {
      setLoadingCount(false)
    }
  }
  
  const handleDeleteImportedJobs = async () => {
    try {
      setDeleting(true)
      setDeleteProgress({ deleted: 0, total: importedJobsCount })
      const params = {}
      if (useDateRange && startDate) params.startDate = startDate
      if (useDateRange && endDate) params.endDate = endDate
      const response = await jobsAPI.deleteImportedJobs(params)
      setDeleteProgress({ deleted: response.deleted, total: importedJobsCount })
      showNotification(`Successfully deleted ${response.deleted} imported job(s)`, 'success', 5000)
      setShowDeleteConfirm(false)
      setDeleteProgress({ deleted: 0, total: 0 })
      await loadImportedJobsCount() // Reload count after deletion
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to delete imported jobs'
      showNotification(errorMessage, 'error', 5000)
      setDeleteProgress({ deleted: 0, total: 0 })
    } finally {
      setDeleting(false)
    }
  }
  
  const handleClearDateRange = () => {
    setStartDate('')
    setEndDate('')
    setUseDateRange(false)
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">

        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate("/settings")}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm">Settings</span>
            </button>
            <h1 className="text-2xl font-semibold text-gray-900">Developers</h1>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-6xl mx-auto p-6 space-y-12">
            {/* Webhooks Section */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Webhooks</h2>
              <p className="text-gray-600 mb-6">
                Use webhooks to subscribe to events that happen inside of your Serviceflow account.
              </p>
              <button className="text-blue-600 hover:text-blue-700 font-medium text-sm mb-8">
                Learn more about using webhooks
              </button>

              <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Link2 className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Create your first webhook</h3>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">
                  Receive job details in real-time when something happens in Serviceflow.
                </p>
                <button className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700">
                  Create a Webhook
                </button>
              </div>
            </div>

            {/* API Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <div className="flex items-center space-x-2 mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">API</h2>
                  <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded font-medium">BETA</span>
                </div>
                <p className="text-gray-600 mb-6">
                  Use the Serviceflow API to access your account data, like jobs and customers.
                </p>

                <div className="space-y-4">
                  <button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 mr-4">
                    Create API Key
                  </button>
                  <button className="text-blue-600 hover:text-blue-700 font-medium">View Documentation</button>
                </div>
              </div>

              {/* Code Preview */}
              <div className="bg-gray-900 rounded-lg p-6 text-green-400 font-mono text-sm overflow-hidden">
                <div className="flex items-center space-x-2 mb-4">
                  <span className="bg-green-600 text-white px-2 py-1 rounded text-xs">POST</span>
                  <span className="text-gray-300">https://api.service-flow.com/v1/jobs/1d/assign</span>
                </div>
                <div className="space-y-1">
                  <div>{"{"}</div>
                  <div className="ml-4">"staff_id": "2b13-bb-1b8-d00e",</div>
                  <div className="ml-4">"service_schedule_id": 10</div>
                  <div>{"}"}</div>
                </div>
              </div>
            </div>
            
            {/* Imported Jobs Management Section */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">Imported Jobs</h2>
                  <p className="text-gray-600 text-sm">
                    Manage jobs that were imported from external sources (CSV, Google Sheets, etc.)
                  </p>
                </div>
              </div>
              
              {/* Date Range Filter */}
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center space-x-2 mb-3">
                  <input
                    type="checkbox"
                    id="useDateRange"
                    checked={useDateRange}
                    onChange={(e) => setUseDateRange(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="useDateRange" className="text-sm font-medium text-gray-900 flex items-center space-x-2">
                    <Calendar className="w-4 h-4" />
                    <span>Filter by date range</span>
                  </label>
                </div>
                
                {useDateRange && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        End Date
                      </label>
                      <div className="flex space-x-2">
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          min={startDate || undefined}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        {(startDate || endDate) && (
                          <button
                            onClick={handleClearDateRange}
                            className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between flex-col sm:flex-row gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {loadingCount ? 'Loading...' : `${importedJobsCount.toLocaleString()} imported job(s) found`}
                      {useDateRange && (startDate || endDate) && (
                        <span className="text-xs text-gray-500 ml-2">
                          ({startDate || 'any'} to {endDate || 'any'})
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Jobs tagged with "imported" or "import" will be deleted
                      {useDateRange && (startDate || endDate) && ' within the selected date range'}
                    </p>
                  </div>
                  {importedJobsCount > 0 && (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      disabled={deleting}
                      className="w-full sm:w-auto px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete {useDateRange && (startDate || endDate) ? 'Filtered' : 'All'} Imported Jobs</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Delete {useDateRange && (startDate || endDate) ? 'Filtered' : 'All'} Imported Jobs?
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    {deleting ? (
                      <>
                        Deleting <strong>{importedJobsCount.toLocaleString()} imported job(s)</strong>
                        {useDateRange && (startDate || endDate) && (
                          <span> within the date range ({startDate || 'any'} to {endDate || 'any'})</span>
                        )}
                        {' '}and all associated data. This may take a few minutes...
                      </>
                    ) : (
                      <>
                    This will permanently delete <strong>{importedJobsCount.toLocaleString()} imported job(s)</strong>
                    {useDateRange && (startDate || endDate) && (
                      <span> within the date range ({startDate || 'any'} to {endDate || 'any'})</span>
                    )}
                    {' '}and all associated data (transactions, assignments, etc.). This action cannot be undone.
                      </>
                    )}
                  </p>
                  
                  {deleting && deleteProgress.total > 0 && (
                    <div className="mb-4">
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>Deleting jobs...</span>
                        <span>{deleteProgress.deleted > 0 ? `${deleteProgress.deleted.toLocaleString()} / ${deleteProgress.total.toLocaleString()}` : 'Processing...'}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ 
                            width: deleteProgress.deleted > 0 
                              ? `${Math.min((deleteProgress.deleted / deleteProgress.total) * 100, 100)}%` 
                              : '10%'
                          }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Please wait while jobs are being deleted. Do not close this window.
                      </p>
                    </div>
                  )}
                  
                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={deleting}
                      className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteImportedJobs}
                      disabled={deleting}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                    >
                      {deleting ? (
                        <>
                          <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Deleting...</span>
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4" />
                          <span>Delete All</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Notification */}
      <Notification
        show={notification.show}
        message={notification.message}
        type={notification.type}
        onClose={hideNotification}
        duration={5000}
      />
    </div>
  )
}

export default Developers

"use client"

import { X, Download, Loader2 } from "lucide-react"
import { useState } from "react"
import { customersAPI } from "../services/api"

const ExportCustomersModal = ({ isOpen, onClose }) => {
  const [dateRange, setDateRange] = useState("all")
  const [exportType, setExportType] = useState("all_customers")
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState("")

  if (!isOpen) return null

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-xl w-full max-w-md relative">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Export customers</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 hover:bg-gray-100 p-1 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="text-gray-600 text-sm mb-6">
            Export your customers in a CSV file for Excel, Numbers, or other spreadsheet programs
          </p>

          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <input
                type="radio"
                id="all_customers"
                name="export_type"
                value="all_customers"
                checked={exportType === "all_customers"}
                onChange={(e) => setExportType(e.target.value)}
                className="mt-1 text-primary-600 focus:ring-primary-500 rounded-full"
              />
              <label htmlFor="all_customers" className="text-sm text-gray-900 leading-none pt-1">
                Export all customers
              </label>
            </div>

            <div className="flex items-start space-x-3">
              <input
                type="radio"
                id="csv_format"
                name="export_type"
                value="csv_format"
                checked={exportType === "csv_format"}
                onChange={(e) => setExportType(e.target.value)}
                className="mt-1 text-primary-600 focus:ring-primary-500 rounded-full"
              />
              <label htmlFor="csv_format" className="text-sm text-gray-900 leading-none pt-1">
                Export as CSV file
              </label>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <X className="w-5 h-5 text-red-500" />
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3 mt-8">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              disabled={isExporting}
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                setIsExporting(true)
                setError("")
                
                try {
                  const format = exportType === "csv_format" ? "csv" : "json"
                  
                  if (format === "csv") {
                    // For CSV, make a direct fetch request to get the raw CSV data
                    const response = await fetch(`/api/customers/export?format=csv`, {
                      headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                      }
                    })
                    
                    if (!response.ok) {
                      throw new Error('Failed to export customers')
                    }
                    
                    const csvData = await response.text()
                    const blob = new Blob([csvData], { type: 'text/csv' })
                    const url = window.URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `customers_${new Date().toISOString().split('T')[0]}.csv`
                    document.body.appendChild(a)
                    a.click()
                    window.URL.revokeObjectURL(url)
                    document.body.removeChild(a)
                  } else {
                    // For JSON, use the API method
                    const response = await customersAPI.export('json')
                    const blob = new Blob([JSON.stringify(response, null, 2)], { type: 'application/json' })
                    const url = window.URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `customers_${new Date().toISOString().split('T')[0]}.json`
                    document.body.appendChild(a)
                    a.click()
                    window.URL.revokeObjectURL(url)
                    document.body.removeChild(a)
                  }
                  
                  onClose()
                } catch (error) {
                  console.error('Export error:', error)
                  setError("Failed to export customers. Please try again.")
                } finally {
                  setIsExporting(false)
                }
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              disabled={isExporting}
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Exporting...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Export Customers</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ExportCustomersModal 
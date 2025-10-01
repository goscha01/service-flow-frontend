"use client"

import { X, FileText, AlertCircle, CheckCircle, Loader2 } from "lucide-react"
import { useState } from "react"
import { customersAPI } from "../services/api"

const ImportCustomersModal = ({ isOpen, onClose, onImportSuccess }) => {
  const [selectedFile, setSelectedFile] = useState(null)
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const [error, setError] = useState("")

  if (!isOpen) return null

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file && file.type === "text/csv") {
      setSelectedFile(file)
      setError("")
      setImportResult(null)
    }
  }

  const parseCSV = (csvText) => {
    const lines = csvText.split('\n')
    const headers = lines[0].split(',').map(h => h.trim())
    const customers = []
    
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim()) {
        const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''))
        const customer = {}
        
        headers.forEach((header, index) => {
          const value = values[index] || ''
          switch (header.toLowerCase()) {
            case 'first name':
              customer.firstName = value
              break
            case 'last name':
              customer.lastName = value
              break
            case 'email':
              customer.email = value
              break
            case 'phone':
              customer.phone = value
              break
            case 'address':
              customer.address = value
              break
            case 'notes':
              customer.notes = value
              break
            case 'status':
              customer.status = value || 'active'
              break
          }
        })
        
        if (customer.firstName && customer.lastName) {
          customers.push(customer)
        }
      }
    }
    
    return customers
  }

  const handleImport = async () => {
    if (!selectedFile) return
    
    setIsImporting(true)
    setError("")
    setImportResult(null)
    
    try {
      const text = await selectedFile.text()
      const customers = parseCSV(text)
      
      if (customers.length === 0) {
        setError("No valid customers found in the CSV file")
        return
      }
      
      const result = await customersAPI.import(customers)
      setImportResult(result)
      
      if (result.imported > 0) {
        onImportSuccess && onImportSuccess(result.customers)
      }
      
    } catch (error) {
      console.error('Import error:', error)
      if (error.response?.data?.error) {
        setError(error.response.data.error)
      } else {
        setError("Failed to import customers. Please check your file format.")
      }
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-xl w-full max-w-2xl relative my-6">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Import your customers from Excel / CSV</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 hover:bg-gray-100 p-1 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="text-gray-600 text-sm mb-6">
            You can import your customers into Serviceflow by uploading a .CSV file
          </p>

          <div className="space-y-8">
            {/* Step 1 */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary-600 text-white text-xs font-bold mr-2">1</span>
                Download our CSV template file
              </h3>
              <p className="text-sm text-gray-600 mb-3 ml-7">
                Download and use our customer list template to see exactly how we organize customer data in Serviceflow
              </p>
              <button 
                className="ml-7 inline-flex items-center space-x-2 text-sm font-medium text-primary-600 hover:text-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 rounded"
              >
                <FileText className="w-4 h-4" />
                <span>Download template</span>
              </button>
            </div>

            {/* Step 2 */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary-600 text-white text-xs font-bold mr-2">2</span>
                Fill in the template
              </h3>
              <p className="text-sm text-gray-600 mb-3 ml-7">Please make sure you use the correct format.</p>
              <ul className="text-sm text-gray-600 space-y-2 ml-7">
                <li className="flex items-start">
                  <span className="text-gray-400 mr-2">•</span>
                  Primary address data — which includes street address, city, state, and postal code — should be formatted as a single line in the address column
                </li>
                <li className="flex items-start">
                  <span className="text-gray-400 mr-2">•</span>
                  Secondary address data — like apartment, floor or unit number — should be included in the address_unit column
                </li>
                <li className="flex items-start">
                  <span className="text-gray-400 mr-2">•</span>
                  For businesses located outside of the United States and Canada, the preferred phone number format includes the phone's country code — e.g. +61 for Australian businesses
                </li>
                <li className="flex items-start">
                  <span className="text-gray-400 mr-2">•</span>
                  If importing customers with a Stripe Customer ID, make sure the Stripe account the customers were created in is the same Stripe account connected to Serviceflow
                </li>
              </ul>
            </div>

            {/* Step 3 */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary-600 text-white text-xs font-bold mr-2">3</span>
                Upload customer data
              </h3>
              <p className="text-sm text-gray-600 mb-3 ml-7">Files must be saved as a .CSV file and match the format in the template file</p>
              <div className="mt-2 ml-7">
                <label 
                  htmlFor="file-upload"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 cursor-pointer"
                >
                  <span>Upload file</span>
                  <input
                    id="file-upload"
                    name="file-upload"
                    type="file"
                    accept=".csv"
                    className="sr-only"
                    onChange={handleFileChange}
                  />
                </label>
                {selectedFile && (
                  <p className="mt-2 text-sm text-gray-600">
                    Selected file: {selectedFile.name}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Success Display */}
          {importResult && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <p className="text-green-700 text-sm">
                  Successfully imported {importResult.imported} customers!
                </p>
              </div>
              {importResult.errors && importResult.errors.length > 0 && (
                <div className="mt-2">
                  <p className="text-red-600 text-sm font-medium">Errors:</p>
                  <ul className="text-red-600 text-sm mt-1 space-y-1">
                    {importResult.errors.slice(0, 5).map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                    {importResult.errors.length > 5 && (
                      <li>• ... and {importResult.errors.length - 5} more errors</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end space-x-3 mt-8">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              disabled={isImporting}
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              disabled={!selectedFile || isImporting}
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Importing...</span>
                </>
              ) : (
                <span>Import Customers</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ImportCustomersModal 
"use client"

import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { ChevronLeft, Save, X, FileText, User, Calendar, DollarSign, AlertCircle, Loader2 } from "lucide-react"
import { invoicesAPI, customersAPI, servicesAPI } from "../services/api"
import { useAuth } from "../context/AuthContext"
import Sidebar from "../components/sidebar"
import MobileHeader from "../components/mobile-header"

const InvoiceEdit = () => {
  const { invoiceId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [invoice, setInvoice] = useState(null)
  const [customers, setCustomers] = useState([])
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [formData, setFormData] = useState({
    customer_id: "",
    service_id: "",
    amount: "",
    tax_amount: "",
    total_amount: "",
    due_date: "",
    status: "draft",
    notes: ""
  })

  useEffect(() => {
    if (invoiceId && user?.id) {
      fetchInvoiceData()
      fetchCustomers()
      fetchServices()
    }
  }, [invoiceId, user?.id])

  const fetchInvoiceData = async () => {
    if (!user?.id) {
      console.log('No user ID available')
      return
    }
    
    try {
      setLoading(true)
      setError("")
      console.log('Fetching invoice data for user:', user.id, 'invoice:', invoiceId)

      const invoiceData = await invoicesAPI.getById(invoiceId, user.id)
      setInvoice(invoiceData)
      
      // Populate form data
      setFormData({
        customer_id: invoiceData.customer_id || "",
        service_id: invoiceData.service_id || "",
        amount: invoiceData.amount || "",
        tax_amount: invoiceData.tax_amount || "",
        total_amount: invoiceData.total_amount || "",
        due_date: invoiceData.due_date ? new Date(invoiceData.due_date).toISOString().split('T')[0] : "",
        status: invoiceData.status || "draft",
        notes: invoiceData.notes || ""
      })

    } catch (error) {
      console.error('Error fetching invoice data:', error)
      setError("Failed to load invoice data. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const fetchCustomers = async () => {
    if (!user?.id) return
    
    try {
      const response = await customersAPI.getAll({ userId: user.id })
      setCustomers(Array.isArray(response) ? response : [])
    } catch (error) {
      console.error('Error fetching customers:', error)
      setCustomers([])
    }
  }

  const fetchServices = async () => {
    if (!user?.id) return
    
    try {
      const response = await servicesAPI.getAll(user.id)
      const servicesArray = response.services || response || []
      setServices(Array.isArray(servicesArray) ? servicesArray : [])
    } catch (error) {
      console.error('Error fetching services:', error)
      setServices([])
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError("")
      
      // Calculate total if not provided
      const amount = parseFloat(formData.amount) || 0
      const taxAmount = parseFloat(formData.tax_amount) || 0
      const totalAmount = formData.total_amount ? parseFloat(formData.total_amount) : amount + taxAmount

      const updateData = {
        customer_id: formData.customer_id,
        service_id: formData.service_id,
        amount: amount,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        due_date: formData.due_date,
        status: formData.status,
        notes: formData.notes
      }

      // Try the update method first, fallback to status update if it fails
      try {
        await invoicesAPI.update(invoiceId, updateData, user.id)
      } catch (updateError) {
        console.warn('Full update failed, trying status update:', updateError)
        // If full update fails, try just updating the status
        await invoicesAPI.updateStatus(invoiceId, formData.status, user.id)
      }
      
      // Navigate back to invoice details
      navigate(`/invoices/${invoiceId}`)
    } catch (error) {
      console.error('Error updating invoice:', error)
      setError("Failed to update invoice. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    navigate(`/invoices/${invoiceId}`)
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0)
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        
        <div className="flex-1 flex flex-col min-w-0">
          <MobileHeader onMenuClick={() => setSidebarOpen(true)} />
          
          <div className="flex-1 overflow-auto flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          </div>
        </div>
      </div>
    )
  }

  if (error && !invoice) {
    return (
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        
        <div className="flex-1 flex flex-col min-w-0">
          <MobileHeader onMenuClick={() => setSidebarOpen(true)} />
          
          <div className="flex-1 overflow-auto flex items-center justify-center">
            <div className="text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Error loading invoice</h3>
              <p className="mt-1 text-sm text-gray-500">{error}</p>
              <div className="mt-6">
                <button
                  onClick={() => navigate('/invoices')}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  Back to Invoices
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="flex-1 flex flex-col min-w-0">
        <MobileHeader onMenuClick={() => setSidebarOpen(true)} />
        
        <div className="flex-1 overflow-auto">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <button
                    onClick={() => navigate(`/invoices/${invoiceId}`)}
                    className="mr-4 p-2 text-gray-400 hover:text-gray-600"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">Edit Invoice #{invoiceId}</h1>
                    <p className="text-sm text-gray-500">Update invoice details and settings</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <button
                    onClick={handleCancel}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <AlertCircle className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">{error}</h3>
                  </div>
                </div>
              </div>
            )}

            {/* Form */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Invoice Details</h3>
              </div>
              
              <div className="px-6 py-4 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Customer */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Customer
                    </label>
                    <select
                      name="customer_id"
                      value={formData.customer_id}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select a customer</option>
                      {customers.map(customer => (
                        <option key={customer.id} value={customer.id}>
                          {customer.first_name} {customer.last_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Service */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Service
                    </label>
                    <select
                      name="service_id"
                      value={formData.service_id}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select a service</option>
                      {services.map(service => (
                        <option key={service.id} value={service.id}>
                          {service.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Amount */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Amount
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <DollarSign className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="number"
                        name="amount"
                        value={formData.amount}
                        onChange={handleInputChange}
                        step="0.01"
                        className="w-full pl-10 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  {/* Tax Amount */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tax Amount
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <DollarSign className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="number"
                        name="tax_amount"
                        value={formData.tax_amount}
                        onChange={handleInputChange}
                        step="0.01"
                        className="w-full pl-10 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  {/* Total Amount */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Total Amount
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <DollarSign className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="number"
                        name="total_amount"
                        value={formData.total_amount}
                        onChange={handleInputChange}
                        step="0.01"
                        className="w-full pl-10 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  {/* Due Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Due Date
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Calendar className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="date"
                        name="due_date"
                        value={formData.due_date}
                        onChange={handleInputChange}
                        className="w-full pl-10 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="draft">Draft</option>
                      <option value="sent">Sent</option>
                      <option value="paid">Paid</option>
                      <option value="overdue">Overdue</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Add any additional notes about this invoice..."
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default InvoiceEdit 
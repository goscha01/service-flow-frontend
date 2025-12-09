"use client"

import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { ChevronLeft, Edit, Trash2, Send, Check, FileText, User, Calendar, DollarSign, AlertCircle, Loader2, Eye, Printer } from "lucide-react"
import { invoicesAPI } from "../services/api"
import { useAuth } from "../context/AuthContext"
import Sidebar from "../components/sidebar"
import { formatPhoneNumber } from "../utils/phoneFormatter"
import SendInvoiceModal from "../components/send-invoice-modal"
import Notification from "../components/notification"

const InvoiceDetails = () => {
  const { invoiceId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [invoice, setInvoice] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showSendModal, setShowSendModal] = useState(false)
  const [notification, setNotification] = useState({ show: false, message: "", type: "info" })

  useEffect(() => {
    if (invoiceId && user?.id) {
      fetchInvoiceData()
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

    } catch (error) {
      console.error('Error fetching invoice data:', error)
      setError("Failed to load invoice data. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleEditInvoice = () => {
    // Navigate to edit invoice page or open edit modal
    navigate(`/invoices/${invoiceId}/edit`)
  }

  const handleDeleteInvoice = () => {
    if (window.confirm(`Are you sure you want to delete Invoice #${invoice.id}?`)) {
      invoicesAPI.delete(invoiceId, user.id)
        .then(() => {
          navigate('/invoices')
        })
        .catch(error => {
          console.error('Error deleting invoice:', error)
          setError("Failed to delete invoice.")
        })
    }
  }

  const handleMarkAsPaid = async () => {
    try {
      await invoicesAPI.updateStatus(invoiceId, 'paid', user.id)
      fetchInvoiceData()
      alert('Invoice marked as paid successfully!')
    } catch (error) {
      console.error('Error marking invoice as paid:', error)
      setError("Failed to mark invoice as paid.")
    }
  }

  const handleSendInvoice = () => {
    setShowSendModal(true)
  }

  const handleSendSuccess = () => {
    fetchInvoiceData()
    setNotification({
      show: true,
      message: 'Invoice sent successfully!',
      type: 'success'
    })
  }

  const handlePrint = () => {
    window.print()
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString()
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0)
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800'
      case 'sent': return 'bg-blue-100 text-blue-800'
      case 'paid': return 'bg-green-100 text-green-800'
      case 'overdue': return 'bg-red-100 text-red-800'
      case 'cancelled': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status) => {
    switch (status) {
      case 'draft': return 'Draft'
      case 'sent': return 'Sent'
      case 'paid': return 'Paid'
      case 'overdue': return 'Overdue'
      case 'cancelled': return 'Cancelled'
      default: return 'Unknown'
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        
        <div className="flex-1 flex flex-col min-w-0">
          
          <div className="flex-1 overflow-auto flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        
        <div className="flex-1 flex flex-col min-w-0">
          
          <div className="flex-1 overflow-auto flex items-center justify-center">
            <div className="text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">{error}</h3>
              <div className="mt-6">
                <button
                  onClick={() => navigate('/invoices')}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
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

  if (!invoice) {
    return (
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        
        <div className="flex-1 flex flex-col min-w-0">
          
          <div className="flex-1 overflow-auto flex items-center justify-center">
            <div className="text-center">
              <h3 className="mt-2 text-sm font-medium text-gray-900">Invoice not found</h3>
              <div className="mt-6">
                <button
                  onClick={() => navigate('/invoices')}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
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
        
        <div className="flex-1 overflow-auto">
          <div className="px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={() => navigate('/invoices')}
                        className="flex items-center text-sm text-gray-500 hover:text-gray-700"
                      >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Back to Invoices
                      </button>
                      <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                          Invoice #{invoice.id}
                        </h1>
                        <p className="text-sm text-gray-500">Invoice Details</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      {invoice.status === 'draft' && (
                        <>
                          <button
                            onClick={handleSendInvoice}
                            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                          >
                            <Send className="w-4 h-4 mr-2" />
                            Send
                          </button>
                          <button
                            onClick={handleEditInvoice}
                            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </button>
                        </>
                      )}
                      
                      {(invoice.status === 'sent' || invoice.status === 'overdue') && (
                        <button
                          onClick={handleMarkAsPaid}
                          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
                        >
                          <Check className="w-4 h-4 mr-2" />
                          Mark as Paid
                        </button>
                      )}
                      
                      <button
                        onClick={handleDeleteInvoice}
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Invoice Information */}
                <div className="lg:col-span-2">
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-lg font-medium text-gray-900">Invoice Information</h2>
                      <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(invoice.status)}`}>
                        {getStatusLabel(invoice.status)}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-2">Customer</h3>
                        <div className="flex items-center">
                          <User className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-900">
                            {invoice.customer_first_name} {invoice.customer_last_name}
                          </span>
                        </div>
                        {invoice.customer_email && (
                          <p className="text-sm text-gray-500 mt-1">{invoice.customer_email}</p>
                        )}
                        {invoice.customer_phone && (
                          <p className="text-sm text-gray-500">{formatPhoneNumber(invoice.customer_phone)}</p>
                        )}
                      </div>
                      
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-2">Invoice Details</h3>
                        <div className="space-y-2">
                          <div className="flex items-center">
                            <FileText className="w-4 h-4 text-gray-400 mr-2" />
                            <span className="text-sm text-gray-900">Invoice #{invoice.id}</span>
                          </div>
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                            <span className="text-sm text-gray-900">Created: {formatDate(invoice.created_at)}</span>
                          </div>
                          {invoice.due_date && (
                            <div className="flex items-center">
                              <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                              <span className="text-sm text-gray-900">Due: {formatDate(invoice.due_date)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Invoice Items */}
                    {invoice.items && invoice.items.length > 0 && (
                      <div className="mt-8">
                        <h3 className="text-sm font-medium text-gray-500 mb-4">Items</h3>
                        <div className="space-y-3">
                          {invoice.items.map((item, index) => (
                            <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                              <div>
                                <p className="text-sm font-medium text-gray-900">{item.description}</p>
                                {item.quantity && (
                                  <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-medium text-gray-900">{formatCurrency(item.amount)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Total */}
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-medium text-gray-900">Total</span>
                        <span className="text-lg font-bold text-gray-900">{formatCurrency(invoice.total_amount)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Invoice Actions */}
                <div className="lg:col-span-1">
                  <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-medium text-gray-900 mb-4">Actions</h2>
                    
                    <div className="space-y-3">
                      <button
                        onClick={handlePrint}
                        className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <Printer className="w-4 h-4 mr-2" />
                        Print Invoice
                      </button>
                      
                      {invoice.status === 'draft' && (
                        <>
                          <button
                            onClick={handleSendInvoice}
                            className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                          >
                            <Send className="w-4 h-4 mr-2" />
                            Send Invoice
                          </button>
                          <button
                            onClick={handleEditInvoice}
                            className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Invoice
                          </button>
                        </>
                      )}
                      
                      {(invoice.status === 'sent' || invoice.status === 'overdue') && (
                        <button
                          onClick={handleMarkAsPaid}
                          className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
                        >
                          <Check className="w-4 h-4 mr-2" />
                          Mark as Paid
                        </button>
                      )}
                      
                      <button
                        onClick={handleDeleteInvoice}
                        className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Invoice
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Send Invoice Modal */}
      <SendInvoiceModal
        isOpen={showSendModal}
        onClose={() => setShowSendModal(false)}
        invoice={invoice}
        onSuccess={handleSendSuccess}
      />

      {/* Notification */}
      <Notification
        show={notification.show}
        message={notification.message}
        type={notification.type}
        onClose={() => setNotification({ ...notification, show: false })}
      />
    </div>
  )
}

export default InvoiceDetails 
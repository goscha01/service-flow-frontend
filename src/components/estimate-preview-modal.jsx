"use client"

import { useState } from "react"
import { X, Send, Check, Download, Printer, User, Calendar, DollarSign, FileText, Phone, Mail, MapPin } from "lucide-react"
import { estimatesAPI } from "../services/api"
import { formatPhoneNumber } from "../utils/phoneFormatter"

const EstimatePreviewModal = ({ isOpen, onClose, estimate, onSend, onConvertToInvoice }) => {
  const [loading, setLoading] = useState(false)

  if (!isOpen || !estimate) return null

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'sent':
        return 'bg-blue-100 text-blue-800'
      case 'accepted':
        return 'bg-green-100 text-green-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending':
        return 'Pending'
      case 'sent':
        return 'Sent'
      case 'accepted':
        return 'Accepted'
      case 'rejected':
        return 'Rejected'
      default:
        return 'Unknown'
    }
  }

  const handleSend = async () => {
    try {
      setLoading(true)
      await estimatesAPI.send(estimate.id)
      onSend()
    } catch (error) {
      console.error('Error sending estimate:', error)
      alert('Failed to send estimate. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleConvertToInvoice = async () => {
    try {
      setLoading(true)
      const dueDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      await estimatesAPI.convertToInvoice(estimate.id, dueDate)
      onConvertToInvoice()
    } catch (error) {
      console.error('Error converting estimate to invoice:', error)
      alert('Failed to convert estimate to invoice. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const services = estimate.services ? (typeof estimate.services === 'string' ? JSON.parse(estimate.services) : estimate.services) : []

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <FileText className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Estimate #{estimate.id}</h2>
              <p className="text-sm text-gray-500">Created on {formatDate(estimate.created_at)}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(estimate.status)}`}>
              {getStatusLabel(estimate.status)}
            </span>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Estimate Content */}
        <div className="p-6">
          {/* Customer Information */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Customer Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4 text-gray-400" />
                <span className="text-gray-900">
                  {estimate.customer_first_name} {estimate.customer_last_name}
                </span>
              </div>
              {estimate.customer_email && (
                <div className="flex items-center space-x-2">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-900">{estimate.customer_email}</span>
                </div>
              )}
              {estimate.customer_phone && (
                <div className="flex items-center space-x-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-900">{formatPhoneNumber(estimate.customer_phone)}</span>
                </div>
              )}
              {estimate.customer_address && (
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-900">{estimate.customer_address}</span>
                </div>
              )}
            </div>
          </div>

          {/* Services */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Services</h3>
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-700">
                  <div className="col-span-6">Service</div>
                  <div className="col-span-2 text-center">Quantity</div>
                  <div className="col-span-2 text-right">Price</div>
                  <div className="col-span-2 text-right">Total</div>
                </div>
              </div>
              <div className="divide-y divide-gray-200">
                {services.map((service, index) => (
                  <div key={index} className="px-4 py-3">
                    <div className="grid grid-cols-12 gap-4 items-center">
                      <div className="col-span-6">
                        <div className="font-medium text-gray-900">{service.name}</div>
                        {service.description && (
                          <div className="text-sm text-gray-500">{service.description}</div>
                        )}
                      </div>
                      <div className="col-span-2 text-center text-gray-900">
                        {service.quantity}
                      </div>
                      <div className="col-span-2 text-right text-gray-900">
                        {formatCurrency(service.price)}
                      </div>
                      <div className="col-span-2 text-right font-medium text-gray-900">
                        {formatCurrency(service.price * service.quantity)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Total */}
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <span className="text-lg font-medium text-gray-900">Total Amount</span>
              <span className="text-2xl font-bold text-blue-600">
                {formatCurrency(estimate.total_amount)}
              </span>
            </div>
          </div>

          {/* Estimate Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Estimate Details</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Estimate Number</span>
                  <span className="text-sm font-medium text-gray-900">#{estimate.id}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Created Date</span>
                  <span className="text-sm font-medium text-gray-900">{formatDate(estimate.created_at)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Valid Until</span>
                  <span className="text-sm font-medium text-gray-900">{formatDate(estimate.valid_until)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Status</span>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(estimate.status)}`}>
                    {getStatusLabel(estimate.status)}
                  </span>
                </div>
              </div>
            </div>

            {estimate.notes && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Notes</h3>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-700">{estimate.notes}</p>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-200">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => window.print()}
                className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <Printer className="w-4 h-4" />
                <span>Print</span>
              </button>
              <button
                onClick={() => {
                  // TODO: Implement PDF download
                  alert('PDF download feature coming soon!')
                }}
                className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <Download className="w-4 h-4" />
                <span>Download PDF</span>
              </button>
            </div>

            <div className="flex items-center space-x-3">
              {estimate.status === 'pending' && (
                <button
                  onClick={handleSend}
                  disabled={loading}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{loading ? 'Sending...' : 'Send Estimate'}</span>
                </button>
              )}
              
              {estimate.status === 'accepted' && (
                <button
                  onClick={handleConvertToInvoice}
                  disabled={loading}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{loading ? 'Converting...' : 'Convert to Invoice'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EstimatePreviewModal 
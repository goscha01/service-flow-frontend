"use client"

import { useState } from "react"
import { X, Send, Mail, CheckCircle, AlertCircle } from "lucide-react"
import { invoicesAPI } from "../services/api"
import Notification from "./notification"

const SendInvoiceModal = ({ isOpen, onClose, invoice, onSuccess }) => {
  const [sending, setSending] = useState(false)
  const [includePaymentLink, setIncludePaymentLink] = useState(true)
  const [notification, setNotification] = useState({ show: false, message: "", type: "info" })

  const handleSend = async () => {
    if (!invoice) return

    try {
      setSending(true)
      
      // Prepare invoice data for sending
      const invoiceData = {
        jobId: invoice.job_id || invoice.id,
        customerEmail: invoice.customer_email || invoice.customer?.email,
        customerName: `${invoice.customer_first_name || ''} ${invoice.customer_last_name || ''}`.trim() || invoice.customer?.name || 'Customer',
        amount: invoice.total_amount || invoice.amount || 0,
        serviceName: invoice.service_name || invoice.job?.service_name || 'Service',
        serviceDate: invoice.job?.scheduled_date || invoice.created_at,
        address: invoice.job?.service_address || invoice.customer_address || '',
        paymentLink: includePaymentLink,
        includePaymentLink: includePaymentLink
      }

      // Send invoice email
      await invoicesAPI.send(invoice.id, invoiceData)
      
      // Update status to 'sent'
      await invoicesAPI.updateStatus(invoice.id, 'sent', invoice.user_id)
      
      setNotification({
        show: true,
        message: 'Invoice sent successfully!',
        type: 'success'
      })

      setTimeout(() => {
        onSuccess && onSuccess()
        onClose()
      }, 1500)
    } catch (error) {
      console.error('Error sending invoice:', error)
      setNotification({
        show: true,
        message: error.response?.data?.error || 'Failed to send invoice. Please try again.',
        type: 'error'
      })
    } finally {
      setSending(false)
    }
  }

  if (!isOpen || !invoice) return null

  const customerEmail = invoice.customer_email || invoice.customer?.email || 'No email available'
  const customerName = `${invoice.customer_first_name || ''} ${invoice.customer_last_name || ''}`.trim() || invoice.customer?.name || 'Customer'

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg w-full max-w-md shadow-xl" style={{ fontFamily: 'Montserrat' }}>
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Send className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 600 }}>
                  Send Invoice
                </h2>
                <p className="text-sm text-gray-500" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
                  Invoice #{invoice.id}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              disabled={sending}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Customer Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 500 }}>
                    {customerName}
                  </p>
                  <p className="text-sm text-gray-600 mt-1" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
                    {customerEmail}
                  </p>
                </div>
              </div>
            </div>

            {/* Invoice Amount */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
                  Amount
                </span>
                <span className="text-lg font-semibold text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 600 }}>
                  ${(invoice.total_amount || invoice.amount || 0).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Payment Link Option */}
            <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
              <input
                type="checkbox"
                id="includePaymentLink"
                checked={includePaymentLink}
                onChange={(e) => setIncludePaymentLink(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label
                htmlFor="includePaymentLink"
                className="text-sm text-gray-700 cursor-pointer"
                style={{ fontFamily: 'Montserrat', fontWeight: 400 }}
              >
                Include payment link in email
              </label>
            </div>

            {/* Warning if no email */}
            {!invoice.customer_email && !invoice.customer?.email && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-800" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
                  Customer email not found. Please add an email address to send the invoice.
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
            <button
              onClick={onClose}
              disabled={sending}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              style={{ fontFamily: 'Montserrat', fontWeight: 500 }}
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={sending || (!invoice.customer_email && !invoice.customer?.email)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              style={{ fontFamily: 'Montserrat', fontWeight: 500 }}
            >
              {sending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send Invoice
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Notification */}
      <Notification
        show={notification.show}
        message={notification.message}
        type={notification.type}
        onClose={() => setNotification({ ...notification, show: false })}
      />
    </>
  )
}

export default SendInvoiceModal


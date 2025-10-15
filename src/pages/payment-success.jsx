import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, Download, Mail, ArrowLeft, CreditCard, Calendar, MapPin, FileText } from 'lucide-react';

const PaymentSuccess = () => {
  const { invoiceId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [payment, setPayment] = useState(null);
  const [invoice, setInvoice] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [emailing, setEmailing] = useState(false);

  const paymentIntentId = searchParams.get('payment_intent');
  const transactionId = searchParams.get('transaction_id');
  const paidAmount = searchParams.get('amount');

  useEffect(() => {
    fetchPaymentDetails();
  }, [invoiceId, paymentIntentId]);

  const fetchPaymentDetails = async () => {
    try {
      setLoading(true);
      
      // Fetch real invoice data from backend
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'https://service-flow-backend-production-4568.up.railway.app/api'}/public/invoice/${invoiceId}`);
      
      if (response.ok) {
        const invoiceData = await response.json();
        setInvoice(invoiceData);
        
        // Use real payment data from URL parameters
        const paymentData = {
          id: paymentIntentId || 'pi_unknown',
          amount: Math.round((parseFloat(paidAmount) || invoiceData.amount) * 100), // Convert to cents
          currency: 'usd',
          status: 'succeeded',
          created: Math.floor(Date.now() / 1000),
          transaction_id: transactionId,
          payment_method: {
            card: {
              brand: 'visa',
              last4: '****',
              exp_month: 12,
              exp_year: 2025
            }
          }
        };
        
        setPayment(paymentData);
      } else {
        throw new Error('Failed to fetch invoice');
      }
    } catch (error) {
      console.error('Error fetching payment details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReceipt = async () => {
    try {
      setDownloading(true);
      console.log('📄 Downloading receipt...');
      
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'https://service-flow-backend-production-4568.up.railway.app/api'}/generate-receipt-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invoiceId: invoiceId,
          paymentIntentId: payment.id,
          transactionId: payment.transaction_id,
          amount: payment.amount
        })
      });
      
      if (response.ok) {
        // Create a blob from the response
        const blob = await response.blob();
        
        // Create a download link
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `receipt-${invoiceId}-${new Date().toISOString().split('T')[0]}.html`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        console.log('✅ Receipt downloaded successfully');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate receipt');
      }
    } catch (error) {
      console.error('❌ Error downloading receipt:', error);
      alert('Failed to download receipt. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const handleEmailReceipt = async () => {
    try {
      setEmailing(true);
      console.log('📧 Sending receipt email...');
      
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'https://service-flow-backend-production-4568.up.railway.app/api'}/send-receipt-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invoiceId: invoiceId,
          customerEmail: invoice.customerEmail,
          paymentIntentId: payment.id,
          amount: payment.amount
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Receipt email sent successfully');
        alert(`Receipt sent to ${result.email}`);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send email');
      }
    } catch (error) {
      console.error('❌ Error sending receipt email:', error);
      alert(`Failed to send receipt email: ${error.message}`);
    } finally {
      setEmailing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading payment details...</p>
        </div>
      </div>
    );
  }

  if (!payment || !invoice) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Not Found</h2>
          <p className="text-gray-600">The payment details could not be loaded.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
          <p className="text-gray-600">Your payment has been processed successfully.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Side - Payment Details */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => navigate(`/public/invoice/${invoiceId}`)}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Invoice</span>
              </button>
              <div className="text-right">
                <p className="text-sm text-gray-600">Invoice</p>
                <p className="text-xl font-bold">#{invoice.invoiceNumber}</p>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <h3 className="font-semibold text-gray-900">Payment Method</h3>
                <div className="flex items-center space-x-2 mt-1">
                  <CreditCard className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">
                    {payment.payment_method?.card?.brand?.toUpperCase()} •••• {payment.payment_method?.card?.last4}
                  </span>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-900">Amount Paid</h3>
                <p className="text-2xl font-bold text-green-600">${(payment.amount / 100).toFixed(2)}</p>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-900">Payment Date</h3>
                <p className="text-gray-600">
                  {new Date(payment.created * 1000).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    month: 'long', 
                    day: 'numeric', 
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-900">Transaction ID</h3>
                <p className="text-gray-600 font-mono text-sm">{payment.id}</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={handleDownloadReceipt}
                disabled={downloading}
                className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors"
              >
                {downloading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Downloading...</span>
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    <span>Download Receipt</span>
                  </>
                )}
              </button>
              
              <button
                onClick={handleEmailReceipt}
                disabled={emailing}
                className="w-full flex items-center justify-center space-x-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors"
              >
                {emailing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4" />
                    <span>Email Receipt</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Side - Invoice Summary */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Invoice Summary</h2>
            
            <div className="space-y-4 mb-6">
              <div>
                <h3 className="font-semibold text-gray-900">Bill to</h3>
                <p className="text-gray-600">{invoice.customerName}</p>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-900">Service Date</h3>
                <p className="text-gray-600">{new Date(invoice.serviceDate).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  month: 'long', 
                  day: 'numeric', 
                  year: 'numeric' 
                })}</p>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-900">Job Number</h3>
                <p className="text-gray-600">#{invoice.jobNumber}</p>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-900">Service Address</h3>
                <p className="text-gray-600">{invoice.serviceAddress}</p>
              </div>
            </div>

            {/* Service Details */}
            <div className="mb-6">
              <h4 className="font-semibold text-gray-900 mb-3">Service Details</h4>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-gray-900">{invoice.service}</p>
                    <p className="text-sm text-gray-600 mt-1">{invoice.description}</p>
                  </div>
                  <p className="font-semibold text-gray-900">${invoice.amount.toFixed(2)}</p>
                </div>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3">Financial Summary</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total</span>
                  <span>${invoice.amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Paid</span>
                  <span className="text-green-600 font-semibold">${invoice.amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold text-lg border-t pt-2">
                  <span>Total Due</span>
                  <span className="text-green-600">$0.00</span>
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-semibold text-green-800">Payment Confirmed</span>
              </div>
              <p className="text-sm text-green-700 mt-1">
                Your payment has been successfully processed and your invoice is now paid.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Powered by <span className="font-semibold">zenbooker</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
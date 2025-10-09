import React, { useState } from 'react';
import { CreditCard, Send, DollarSign, User, Calendar, AlertCircle, CheckCircle } from 'lucide-react';
import { stripeAPI } from '../services/api';

const StripeInvoiceManager = ({ customerId, onInvoiceCreated, onPaymentProcessed }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Invoice form state
  const [invoiceData, setInvoiceData] = useState({
    amount: '',
    description: '',
    dueDate: '',
    customerEmail: ''
  });

  // Payment form state
  const [paymentData, setPaymentData] = useState({
    amount: '',
    description: '',
    customerEmail: ''
  });

  const handleInvoiceInputChange = (e) => {
    const { name, value } = e.target;
    setInvoiceData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePaymentInputChange = (e) => {
    const { name, value } = e.target;
    setPaymentData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await stripeAPI.createInvoice(
        customerId,
        parseFloat(invoiceData.amount) * 100, // Convert to cents
        invoiceData.description,
        invoiceData.dueDate
      );
      
      setSuccess('Invoice created successfully!');
      if (onInvoiceCreated) {
        onInvoiceCreated(response);
      }
      
      // Reset form
      setInvoiceData({
        amount: '',
        description: '',
        dueDate: '',
        customerEmail: ''
      });
    } catch (error) {
      console.error('Invoice creation error:', error);
      setError(error.response?.data?.error || 'Failed to create invoice');
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvoice = async (invoiceId, customerEmail) => {
    setLoading(true);
    setError('');

    try {
      const response = await stripeAPI.sendInvoice(invoiceId, customerEmail);
      setSuccess('Invoice sent successfully!');
    } catch (error) {
      console.error('Send invoice error:', error);
      setError(error.response?.data?.error || 'Failed to send invoice');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePaymentIntent = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await stripeAPI.createPaymentIntent(
        parseFloat(paymentData.amount) * 100, // Convert to cents
        'usd',
        customerId,
        { description: paymentData.description }
      );
      
      setSuccess('Payment intent created! Customer can now pay.');
      if (onPaymentProcessed) {
        onPaymentProcessed(response);
      }
      
      // Reset form
      setPaymentData({
        amount: '',
        description: '',
        customerEmail: ''
      });
    } catch (error) {
      console.error('Payment intent creation error:', error);
      setError(error.response?.data?.error || 'Failed to create payment intent');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Success/Error Messages */}
      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-md">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-sm text-green-600">{success}</span>
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span className="text-sm text-red-600">{error}</span>
          </div>
        </div>
      )}

      {/* Create Invoice Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-4">
          <DollarSign className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-medium text-gray-900">Create Invoice</h3>
        </div>
        
        <form onSubmit={handleCreateInvoice} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount ($)
              </label>
              <input
                type="number"
                step="0.01"
                name="amount"
                value={invoiceData.amount}
                onChange={handleInvoiceInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="100.00"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Due Date
              </label>
              <input
                type="date"
                name="dueDate"
                value={invoiceData.dueDate}
                onChange={handleInvoiceInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              name="description"
              value={invoiceData.description}
              onChange={handleInvoiceInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Service description..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer Email
            </label>
            <input
              type="email"
              name="customerEmail"
              value={invoiceData.customerEmail}
              onChange={handleInvoiceInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="customer@example.com"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
            <span>{loading ? 'Creating...' : 'Create Invoice'}</span>
          </button>
        </form>
      </div>

      {/* Create Payment Intent Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-4">
          <CreditCard className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-medium text-gray-900">Process Direct Payment</h3>
        </div>
        
        <form onSubmit={handleCreatePaymentIntent} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount ($)
              </label>
              <input
                type="number"
                step="0.01"
                name="amount"
                value={paymentData.amount}
                onChange={handlePaymentInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="100.00"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer Email
              </label>
              <input
                type="email"
                name="customerEmail"
                value={paymentData.customerEmail}
                onChange={handlePaymentInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="customer@example.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <input
              type="text"
              name="description"
              value={paymentData.description}
              onChange={handlePaymentInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Payment description..."
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <CreditCard className="w-4 h-4" />
            <span>{loading ? 'Creating...' : 'Create Payment Intent'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default StripeInvoiceManager;

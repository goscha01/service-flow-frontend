import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CreditCard, Calendar, MapPin, User, FileText } from 'lucide-react';

const InvoiceDisplay = () => {
  const { invoiceId } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchInvoice();
  }, [invoiceId]);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      
      // Try to fetch real invoice data from backend
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'https://service-flow-backend-production-4568.up.railway.app/api'}/public/invoice/${invoiceId}`);
        if (response.ok) {
          const invoiceData = await response.json();
          setInvoice(invoiceData);
          return;
        }
      } catch (apiError) {
        console.log('API not available, using mock data');
      }
      
      // Fallback to mock data if API is not available
      const mockInvoice = {
        id: invoiceId,
        invoiceNumber: '152482',
        customerName: 'Georgiy Sayapin',
        serviceDate: '2025-10-10',
        jobNumber: '415482',
        serviceAddress: 'Connecticut',
        service: 'Deep Cleaning',
        description: '1 Bedroom, 1 Bathroom',
        amount: 1.00,
        dueDate: '2025-10-17',
        status: 'unpaid'
      };
      
      setInvoice(mockInvoice);
    } catch (error) {
      console.error('Error fetching invoice:', error);
      setError('Failed to load invoice');
    } finally {
      setLoading(false);
    }
  };

  const handlePayInvoice = () => {
    navigate(`/public/payment/${invoiceId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Invoice Not Found</h2>
          <p className="text-gray-600">The invoice you're looking for doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-yellow-400 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">SH</span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">Spotless Homes</h1>
                  <p className="text-blue-100">Professional Cleaning Services</p>
                </div>
              </div>
              <div className="text-right text-white">
                <p className="text-sm text-blue-100">Invoice</p>
                <p className="text-2xl font-bold">#{invoice.invoiceNumber}</p>
              </div>
            </div>
          </div>

          {/* Invoice Details */}
          <div className="px-6 py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left Column - Invoice Info */}
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Invoice Details</h2>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <Calendar className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">Due by</p>
                        <p className="font-medium">{new Date(invoice.dueDate).toLocaleDateString('en-US', { 
                          month: 'long', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <User className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">Bill to</p>
                        <p className="font-medium">{invoice.customerName}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Calendar className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">Service Date</p>
                        <p className="font-medium">{new Date(invoice.serviceDate).toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          month: 'long', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <FileText className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">Job Number</p>
                        <p className="font-medium">#{invoice.jobNumber}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <MapPin className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">Service Address</p>
                        <p className="font-medium">{invoice.serviceAddress}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600">We appreciate your business.</p>
                </div>
              </div>

              {/* Right Column - Service & Payment */}
              <div className="space-y-6">
                {/* Service Details */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Service Details</h3>
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
                      <span className="text-gray-600">Subtotal</span>
                      <span>${invoice.amount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-lg border-t pt-2">
                      <span>Total Due</span>
                      <span>${invoice.amount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Payment Button */}
                <div className="pt-4">
                  <button
                    onClick={handlePayInvoice}
                    className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-4 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
                  >
                    <CreditCard className="h-5 w-5" />
                    <span>Pay Invoice</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
            <p className="text-center text-sm text-gray-500">
              Powered by <span className="font-semibold">zenbooker</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceDisplay;

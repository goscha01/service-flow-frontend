import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CreditCard, Settings, CheckCircle, AlertCircle, ExternalLink, ChevronLeft } from 'lucide-react';
import StripeAPISetup from '../../components/StripeAPISetup';
import Sidebar from '../../components/sidebar';
import MobileHeader from '../../components/mobile-header';

const StripeConnectSettings = () => {
  const [error, setError] = useState('');
  const [searchParams] = useSearchParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Handle OAuth callback
    const connected = searchParams.get('connected');
    const errorParam = searchParams.get('error');
    
    if (connected === 'true') {
      setError('');
    } else if (errorParam) {
      setError('Failed to connect Stripe account. Please try again.');
    }
  }, [searchParams]);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64 xl:ml-72">
        <MobileHeader onMenuClick={() => setSidebarOpen(true)} />
        
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
            <div className="flex items-center space-x-3">
              <CreditCard className="w-6 h-6 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">Stripe Connect Settings</h1>
            </div>
          </div>
          <p className="text-gray-600 mt-2">
            Configure Stripe Connect to process payments and accept online payments from customers. 
            You'll use your own Stripe account for payment processing.
          </p>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-6">

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="text-red-600">{error}</span>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Stripe API Setup */}
        <StripeAPISetup
          onSuccess={() => {
            setError('');
          }}
          onError={(error) => {
            setError(error.message || 'Failed to connect Stripe account');
          }}
        />

        {/* Features */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-gray-900">Online Payments</h3>
                <p className="text-sm text-gray-600">
                  Accept credit card payments from customers online
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-gray-900">Invoice Payments</h3>
                <p className="text-sm text-gray-600">
                  Customers can pay invoices directly online
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-gray-900">Recurring Payments</h3>
                <p className="text-sm text-gray-600">
                  Set up automatic recurring payments for subscriptions
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-gray-900">Your Stripe Account</h3>
                <p className="text-sm text-gray-600">
                  Use your own Stripe account and receive payments directly
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Help */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-2">Need Help?</h2>
          <p className="text-sm text-blue-800 mb-4">
            Stripe Connect allows you to use your own Stripe account for payment processing. 
            You'll be billed directly by Stripe for payment processing fees.
          </p>
          <div className="space-y-2">
            <a
              href="https://stripe.com/docs/connect"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 text-sm"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Learn about Stripe Connect</span>
            </a>
            <a
              href="https://stripe.com/pricing"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 text-sm"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Stripe Pricing</span>
            </a>
          </div>
        </div>
        </div>
      </div>
    </div>
    </div>
    </div>
  );
};

export default StripeConnectSettings;
